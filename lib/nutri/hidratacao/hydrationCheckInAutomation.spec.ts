import { describe, expect, it, vi } from 'vitest';
import {
  evaluateHydrationCheckInAutomation,
  hydrationCheckInCyclePeriod,
  hydrationCheckInDeliveryDocId,
  isHydrationCheckInCycleSendDay,
  runHydrationCheckInPatient,
  type HydrationCheckInPatientActions,
  type HydrationDeliverySnapshot,
} from '@/lib/nutri/hidratacao/hydrationCheckInAutomation';
import {
  getHydrationCheckInCycleDates,
  hydrationCheckInDefaultAllowedDates,
} from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import { buildHydrationCheckInWhatsAppMessage } from '@/lib/nutri/hidratacao/hydrationCheckInMessage';
import {
  hydrationCheckInManualSendAllowed,
  isHydrationCheckInReminderEnabled,
  previewHydrationCheckInNextSend,
  resolveHydrationSettingsWriteAccess,
} from '@/lib/nutri/hidratacao/hydrationCheckInSettings';
import { horarioConfiguradoJaPassou } from '@/lib/time/brasilTimezone';

const IN_TREATMENT = 'em_tratamento';

function fakeActions(
  overrides: Partial<HydrationCheckInPatientActions> & {
    liveStatus?: unknown;
    livePending?: number;
    notifyOk?: boolean;
  } = {}
) {
  const { liveStatus, livePending, notifyOk, ...actionOverrides } = overrides;
  const recordDelivery = vi.fn(async () => undefined);
  const createLink = vi.fn(async () => ({ linkId: 'link-1', url: 'https://example.test/h/abc' }));
  const notify = vi.fn(async () =>
    notifyOk === false
      ? { ok: false as const, errorCode: 'canal_chat_error', errorMessage: 'Canal Chat desconectado.' }
      : { ok: true as const }
  );
  const revalidate = vi.fn(async () => ({
    statusTratamento: liveStatus ?? IN_TREATMENT,
    pendingCount: livePending ?? 2,
    reminderEnabled: true,
    scheduledTimeReached: true,
  }));
  const actions: HydrationCheckInPatientActions = {
    recordDelivery,
    createLink,
    notify,
    revalidate,
    ...actionOverrides,
  };
  return { actions, recordDelivery, createLink, notify, revalidate };
}

function baseInput(overrides: {
  statusTratamento?: unknown;
  reminderEnabled?: unknown;
  pendingCount?: number;
  delivery?: HydrationDeliverySnapshot | null;
  scheduledTimeReached?: boolean;
} = {}) {
  return {
    statusTratamento: overrides.statusTratamento ?? IN_TREATMENT,
    reminderEnabled: 'reminderEnabled' in overrides ? overrides.reminderEnabled : true,
    pendingCount: overrides.pendingCount ?? 2,
    delivery: overrides.delivery ?? null,
    scheduledTimeReached: overrides.scheduledTimeReached,
  };
}

describe('ciclos de 2 dias', () => {
  it('31/08 e 02/09 são dias de disparo com períodos sem overlap', () => {
    expect(isHydrationCheckInCycleSendDay('2026-08-31')).toBe(true);
    expect(isHydrationCheckInCycleSendDay('2026-09-01')).toBe(false);
    expect(isHydrationCheckInCycleSendDay('2026-09-02')).toBe(true);
    expect(isHydrationCheckInCycleSendDay('2026-09-04')).toBe(true);

    expect(hydrationCheckInCyclePeriod('2026-08-31')).toEqual({
      allowedDates: ['2026-08-29', '2026-08-30'],
      allowedDatesKey: '2026-08-29,2026-08-30',
      sendDay: true,
    });
    expect(hydrationCheckInCyclePeriod('2026-09-01').allowedDates).toEqual(['2026-08-29', '2026-08-30']);
    expect(hydrationCheckInCyclePeriod('2026-09-02')).toEqual({
      allowedDates: ['2026-08-31', '2026-09-01'],
      allowedDatesKey: '2026-08-31,2026-09-01',
      sendDay: true,
    });
    expect(hydrationCheckInCyclePeriod('2026-09-04').allowedDates).toEqual(['2026-09-02', '2026-09-03']);
  });

  it('id de delivery é estável por paciente + período', () => {
    expect(hydrationCheckInDeliveryDocId('p1', '2026-08-29,2026-08-30')).toBe(
      'p1_2026-08-29_2026-08-30'
    );
  });
});

describe('ETAPA 04 — automação de check-in', () => {
  it('A. Em Tratamento + 2 pendentes → envia', async () => {
    const { actions, notify, createLink } = fakeActions({ livePending: 2 });
    const result = await runHydrationCheckInPatient(baseInput({ pendingCount: 2 }), actions);
    expect(result.outcome).toBe('sent');
    expect(createLink).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledOnce();
  });

  it('B. Em Tratamento + 1 pendente → envia', async () => {
    const { actions, notify } = fakeActions({ livePending: 1 });
    const result = await runHydrationCheckInPatient(baseInput({ pendingCount: 1 }), actions);
    expect(result.outcome).toBe('sent');
    expect(notify).toHaveBeenCalledOnce();
  });

  it('C. Em Tratamento + 0 pendentes → skip period_completed', async () => {
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(baseInput({ pendingCount: 0 }), actions);
    expect(result).toEqual({ outcome: 'skipped', skipReason: 'period_completed' });
    expect(notify).not.toHaveBeenCalled();
  });

  it('D. paciente fora de tratamento → skip', async () => {
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(
      baseInput({ statusTratamento: 'concluido', pendingCount: 2 }),
      actions
    );
    expect(result.skipReason).toBe('not_in_treatment');
    expect(notify).not.toHaveBeenCalled();
  });

  it('E. já enviado automaticamente → skip', async () => {
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(
      baseInput({
        delivery: { status: 'sent', source: 'automatic', attemptCount: 1 },
      }),
      actions
    );
    expect(result.skipReason).toBe('already_sent_automatically');
    expect(notify).not.toHaveBeenCalled();
  });

  it('F. enviado manualmente no ciclo → skip', async () => {
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(
      baseInput({
        delivery: { status: 'sent', source: 'manual', attemptCount: 0 },
      }),
      actions
    );
    expect(result.skipReason).toBe('already_sent_manually');
    expect(notify).not.toHaveBeenCalled();
  });

  it('G. falha Canal Chat → registra failed', async () => {
    const { actions, recordDelivery } = fakeActions({ notifyOk: false, livePending: 2 });
    const result = await runHydrationCheckInPatient(baseInput(), actions);
    expect(result.outcome).toBe('failed');
    expect(result.errorCode).toBe('canal_chat_error');
    expect(recordDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', errorCode: 'canal_chat_error' })
    );
  });

  it('H. retry permitido uma vez; depois retry_exhausted', async () => {
    expect(
      evaluateHydrationCheckInAutomation(
        baseInput({
          delivery: { status: 'failed', source: 'automatic', attemptCount: 1 },
        })
      )
    ).toEqual({ action: 'retry' });

    const first = fakeActions({ notifyOk: true, livePending: 2 });
    const retried = await runHydrationCheckInPatient(
      baseInput({ delivery: { status: 'failed', source: 'automatic', attemptCount: 1 } }),
      first.actions
    );
    expect(retried.outcome).toBe('sent');
    expect(first.notify).toHaveBeenCalledOnce();

    const exhausted = fakeActions();
    const result = await runHydrationCheckInPatient(
      baseInput({ delivery: { status: 'failed', source: 'automatic', attemptCount: 2 } }),
      exhausted.actions
    );
    expect(result.skipReason).toBe('retry_exhausted');
    expect(exhausted.notify).not.toHaveBeenCalled();
  });

  it('I. link/período concluído antes do envio → skip', async () => {
    const { actions, notify } = fakeActions({ livePending: 0 });
    const result = await runHydrationCheckInPatient(baseInput({ pendingCount: 2 }), actions);
    expect(result.skipReason).toBe('period_completed');
    expect(notify).not.toHaveBeenCalled();
  });

  it('J. status mudou antes do envio → skip', async () => {
    const { actions, notify } = fakeActions({ liveStatus: 'concluido', livePending: 2 });
    const result = await runHydrationCheckInPatient(baseInput({ pendingCount: 2 }), actions);
    expect(result.skipReason).toBe('status_changed');
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('copy do check-in', () => {
  it('usa tom curto e inclui meta quando 2 dias pendentes', () => {
    const text = buildHydrationCheckInWhatsAppMessage({
      patientName: 'Maria Silva',
      url: 'https://example.test/h/token',
      goalMl: 2500,
      pendingCount: 2,
    });
    expect(text).toContain('Olá, Maria');
    expect(text).toContain('2.500 ml');
    expect(text).toContain('https://example.test/h/token');
    expect(text.toLowerCase()).not.toContain('não bateu');
  });

  it('adapta copy quando falta só 1 dia', () => {
    const text = buildHydrationCheckInWhatsAppMessage({
      patientName: 'João',
      url: 'https://example.test/h/token',
      pendingCount: 1,
    });
    expect(text).toContain('quase atualizado');
    expect(text).toContain('um registro');
  });
});

describe('ETAPA 04.1 — configuração individual', () => {
  it('A. enabled false → não envia', async () => {
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(baseInput({ reminderEnabled: false }), actions);
    expect(result.skipReason).toBe('automation_disabled');
    expect(notify).not.toHaveBeenCalled();
  });

  it('B. enabled ausente → não envia', async () => {
    expect(isHydrationCheckInReminderEnabled(undefined)).toBe(false);
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(baseInput({ reminderEnabled: undefined }), actions);
    expect(result.skipReason).toBe('automation_disabled');
    expect(notify).not.toHaveBeenCalled();
  });

  it('C. enabled true + antes do horário → não envia', async () => {
    expect(horarioConfiguradoJaPassou('09:15', '09:30')).toBe(false);
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(
      baseInput({ scheduledTimeReached: false }),
      actions
    );
    expect(result.skipReason).toBe('scheduled_time_not_reached');
    expect(notify).not.toHaveBeenCalled();
  });

  it('D. enabled true + chegou horário → envia', async () => {
    expect(horarioConfiguradoJaPassou('09:31', '09:30')).toBe(true);
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(
      baseInput({ scheduledTimeReached: true }),
      actions
    );
    expect(result.outcome).toBe('sent');
    expect(notify).toHaveBeenCalledOnce();
  });

  it('E. cron atrasado → envia uma vez', async () => {
    expect(horarioConfiguradoJaPassou('10:00', '09:30')).toBe(true);
    const { actions, notify } = fakeActions();
    const first = await runHydrationCheckInPatient(baseInput({ scheduledTimeReached: true }), actions);
    expect(first.outcome).toBe('sent');
    const again = fakeActions();
    const second = await runHydrationCheckInPatient(
      baseInput({
        scheduledTimeReached: true,
        delivery: { status: 'sent', source: 'automatic', attemptCount: 1 },
      }),
      again.actions
    );
    expect(second.skipReason).toBe('already_sent_automatically');
    expect(again.notify).not.toHaveBeenCalled();
  });

  it('F. já enviado no ciclo → não envia novamente', async () => {
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(
      baseInput({
        scheduledTimeReached: true,
        delivery: { status: 'sent', source: 'automatic', attemptCount: 1 },
      }),
      actions
    );
    expect(result.skipReason).toBe('already_sent_automatically');
    expect(notify).not.toHaveBeenCalled();
  });

  it('G. horário alterado antes do envio → respeita novo horário', async () => {
    const before = fakeActions();
    const skipped = await runHydrationCheckInPatient(
      baseInput({ scheduledTimeReached: false }),
      before.actions
    );
    expect(skipped.skipReason).toBe('scheduled_time_not_reached');
    expect(before.notify).not.toHaveBeenCalled();

    const after = fakeActions();
    const sent = await runHydrationCheckInPatient(
      baseInput({ scheduledTimeReached: true }),
      after.actions
    );
    expect(sent.outcome).toBe('sent');
  });

  it('H. horário alterado depois do envio → não duplica', async () => {
    const { actions, notify } = fakeActions();
    const result = await runHydrationCheckInPatient(
      baseInput({
        scheduledTimeReached: true,
        delivery: { status: 'sent', source: 'automatic', attemptCount: 1 },
      }),
      actions
    );
    expect(result.skipReason).toBe('already_sent_automatically');
    expect(notify).not.toHaveBeenCalled();
  });

  it('I. médico salva configuração → permitido', () => {
    expect(
      resolveHydrationSettingsWriteAccess({
        authenticated: true,
        doctorOwnsPatient: true,
        nutritionistHasActiveLink: false,
      })
    ).toEqual({ ok: true, updatedByType: 'doctor' });
  });

  it('J. nutri vinculada salva configuração → permitido', () => {
    expect(
      resolveHydrationSettingsWriteAccess({
        authenticated: true,
        doctorOwnsPatient: false,
        nutritionistHasActiveLink: true,
      })
    ).toEqual({ ok: true, updatedByType: 'nutritionist' });
  });

  it('K. nutri sem vínculo → negado', () => {
    expect(
      resolveHydrationSettingsWriteAccess({
        authenticated: true,
        doctorOwnsPatient: false,
        nutritionistHasActiveLink: false,
      })
    ).toEqual({ ok: false, status: 403 });
  });

  it('L. manual e automático no mesmo dia usam o mesmo allowedDatesKey', () => {
    const oddDay = new Date('2026-09-01T15:00:00.000Z');
    const cycle = getHydrationCheckInCycleDates(oddDay);
    expect(hydrationCheckInDefaultAllowedDates(oddDay)).toEqual(cycle.allowedDates);
    expect(cycle.allowedDates).toEqual(['2026-08-29', '2026-08-30']);
    expect(cycle.allowedDatesKey).toBe('2026-08-29,2026-08-30');
  });

  it('M. switch desligado não bloqueia envio manual', () => {
    expect(hydrationCheckInManualSendAllowed(false)).toBe(true);
    expect(hydrationCheckInManualSendAllowed(true)).toBe(true);
    expect(
      evaluateHydrationCheckInAutomation(baseInput({ reminderEnabled: false })).action
    ).toBe('skip');
  });

  it('preview: desligado / completo / próximo ciclo', () => {
    expect(
      previewHydrationCheckInNextSend({
        enabled: false,
        time: '09:30',
        todayYmd: '2026-08-31',
        pendingCount: 2,
        alreadySentThisCycle: false,
      }).label
    ).toBe('Envio automático desativado.');
    expect(
      previewHydrationCheckInNextSend({
        enabled: true,
        time: '09:30',
        todayYmd: '2026-08-31',
        pendingCount: 0,
        alreadySentThisCycle: false,
      }).label
    ).toBe('Sem envio necessário no momento.');
    expect(
      previewHydrationCheckInNextSend({
        enabled: true,
        time: '09:30',
        todayYmd: '2026-08-31',
        pendingCount: 2,
        alreadySentThisCycle: false,
      }).label
    ).toBe('Próximo check-in 31/08 às 09:30');
    expect(
      previewHydrationCheckInNextSend({
        enabled: true,
        time: '09:30',
        todayYmd: '2026-08-31',
        pendingCount: 1,
        alreadySentThisCycle: true,
      }).label
    ).toBe('Próximo check-in 02/09 às 09:30');
  });
});
