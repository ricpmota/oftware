import { describe, expect, it } from 'vitest';
import {
  buildWeeklyNutritionCheckInOperationalSummary,
  compactWeeklyNutritionAttentionFlags,
  filterWeeklyNutritionCheckInSlots,
  getWeeklyCheckInDelay,
  resolveWeeklyNutritionCheckInCardActions,
  resolveWeeklyNutritionCheckInOperationalStatus,
  shouldRunWeeklyNutritionCheckInPoll,
  sortWeeklyNutritionCheckInOperationalSlots,
  slotHasClinicalAttention,
  type WeeklyNutritionCheckInOperationalSlot,
} from '@/lib/nutri/checkInSemanalNutriOperational';
import { nutriCheckInWhatsAppHref } from '@/lib/nutri/buildNutriCheckInWhatsAppMessage';
import { buildNutriCheckInWhatsAppMessage } from '@/lib/nutri/buildNutriCheckInWhatsAppMessage';
import { CHECK_IN_DIARIO_NUTRI_ENABLED } from '@/lib/nutri/checkInSemanalNutriCapabilities';

function slot(partial: Partial<WeeklyNutritionCheckInOperationalSlot> & Pick<WeeklyNutritionCheckInOperationalSlot, 'patientId' | 'scheduledDate' | 'status'>): WeeklyNutritionCheckInOperationalSlot {
  return {
    patientName: partial.patientName || partial.patientId,
    weekKey: partial.weekKey || '2026-08-17',
    scheduledTime: partial.scheduledTime || '18:00',
    ...partial,
  };
}

describe('ETAPA 07 — substatus operacional', () => {
  it('completed / due_today / overdue / upcoming', () => {
    expect(resolveWeeklyNutritionCheckInOperationalStatus({ hasRecord: true, scheduledDate: '2026-08-10', todayYmd: '2026-08-17' })).toBe('completed');
    expect(resolveWeeklyNutritionCheckInOperationalStatus({ hasRecord: false, scheduledDate: '2026-08-17', todayYmd: '2026-08-17' })).toBe('due_today');
    expect(resolveWeeklyNutritionCheckInOperationalStatus({ hasRecord: false, scheduledDate: '2026-08-16', todayYmd: '2026-08-17' })).toBe('overdue');
    expect(resolveWeeklyNutritionCheckInOperationalStatus({ hasRecord: false, scheduledDate: '2026-08-23', todayYmd: '2026-08-17' })).toBe('upcoming');
  });
});

describe('ETAPA 07 — atraso', () => {
  it('formata horas e dias', () => {
    const scheduled = new Date('2026-08-16T21:00:00.000Z');
    expect(getWeeklyCheckInDelay(scheduled, new Date('2026-08-16T22:00:00.000Z'))).toBe('1 hora de atraso');
    expect(getWeeklyCheckInDelay(scheduled, new Date('2026-08-17T21:00:00.000Z'))).toBe('1 dia de atraso');
    expect(getWeeklyCheckInDelay(scheduled, new Date('2026-08-18T21:00:00.000Z'))).toBe('2 dias de atraso');
    expect(getWeeklyCheckInDelay(scheduled, new Date('2026-08-16T20:00:00.000Z'))).toBeNull();
  });
});

describe('ETAPA 07 — resumo', () => {
  const slots: WeeklyNutritionCheckInOperationalSlot[] = [
    slot({ patientId: 'a', scheduledDate: '2026-08-10', status: 'completed', record: { score: 80, aderenciaPlano: 80, diasProteinaMeta: 6, diasMetaAgua: 6, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-10' } }),
    slot({ patientId: 'b', scheduledDate: '2026-08-11', status: 'completed', record: { score: 40, aderenciaPlano: 30, diasProteinaMeta: 6, diasMetaAgua: 6, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-11' } }),
    slot({ patientId: 'c', scheduledDate: '2026-08-12', status: 'completed', record: { score: 88, aderenciaPlano: 90, diasProteinaMeta: 6, diasMetaAgua: 6, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-12' } }),
    slot({ patientId: 'd', scheduledDate: '2026-08-17', status: 'pending' }),
    slot({ patientId: 'e', scheduledDate: '2026-08-16', status: 'pending' }),
  ];

  it('conta 5 total, 3 completed, 1 pending hoje, 1 overdue', () => {
    const summary = buildWeeklyNutritionCheckInOperationalSummary(slots, { todayYmd: '2026-08-17' });
    expect(summary.total).toBe(5);
    expect(summary.completed).toBe(3);
    expect(summary.waiting).toBe(1);
    expect(summary.overdue).toBe(1);
    expect(summary.attention).toBe(1);
  });

  it('não inclui futuros na taxa de resposta', () => {
    const withFuture: WeeklyNutritionCheckInOperationalSlot[] = [
      ...slots,
      slot({ patientId: 'f', scheduledDate: '2026-08-23', status: 'upcoming' }),
      slot({ patientId: 'g', scheduledDate: '2026-08-24', status: 'upcoming' }),
      slot({ patientId: 'h', scheduledDate: '2026-08-25', status: 'upcoming' }),
      slot({ patientId: 'i', scheduledDate: '2026-08-26', status: 'upcoming' }),
      slot({ patientId: 'j', scheduledDate: '2026-08-27', status: 'upcoming' }),
    ];
    const summary = buildWeeklyNutritionCheckInOperationalSummary(withFuture, { todayYmd: '2026-08-17' });
    expect(summary.total).toBe(10);
    expect(summary.completed).toBe(3);
    expect(summary.upcoming).toBe(5);
    expect(summary.dueCount).toBe(5);
    expect(summary.responseRate).toBe(60);
  });

  it('exemplo 4/5 = 80% com 5 futuros', () => {
    const mixed: WeeklyNutritionCheckInOperationalSlot[] = [
      slot({ patientId: '1', scheduledDate: '2026-08-10', status: 'completed', record: { score: 80, aderenciaPlano: 80, diasProteinaMeta: 5, diasMetaAgua: 5, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-10' } }),
      slot({ patientId: '2', scheduledDate: '2026-08-11', status: 'completed', record: { score: 80, aderenciaPlano: 80, diasProteinaMeta: 5, diasMetaAgua: 5, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-11' } }),
      slot({ patientId: '3', scheduledDate: '2026-08-12', status: 'completed', record: { score: 80, aderenciaPlano: 80, diasProteinaMeta: 5, diasMetaAgua: 5, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-12' } }),
      slot({ patientId: '4', scheduledDate: '2026-08-13', status: 'completed', record: { score: 80, aderenciaPlano: 80, diasProteinaMeta: 5, diasMetaAgua: 5, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-13' } }),
      slot({ patientId: '5', scheduledDate: '2026-08-16', status: 'pending' }),
      slot({ patientId: '6', scheduledDate: '2026-08-23', status: 'upcoming' }),
      slot({ patientId: '7', scheduledDate: '2026-08-24', status: 'upcoming' }),
      slot({ patientId: '8', scheduledDate: '2026-08-25', status: 'upcoming' }),
      slot({ patientId: '9', scheduledDate: '2026-08-26', status: 'upcoming' }),
      slot({ patientId: '10', scheduledDate: '2026-08-27', status: 'upcoming' }),
    ];
    const summary = buildWeeklyNutritionCheckInOperationalSummary(mixed, { todayYmd: '2026-08-17' });
    expect(summary.responseRate).toBe(80);
    expect(summary.dueCount).toBe(5);
  });

  it('WhatsApp sent/failed não altera completed', () => {
    const withWa: WeeklyNutritionCheckInOperationalSlot[] = [
      slot({ patientId: 'd', scheduledDate: '2026-08-17', status: 'pending', whatsapp: 'sent' }),
      slot({ patientId: 'e', scheduledDate: '2026-08-16', status: 'pending', whatsapp: 'failed' }),
    ];
    const summary = buildWeeklyNutritionCheckInOperationalSummary(withWa, { todayYmd: '2026-08-17' });
    expect(summary.completed).toBe(0);
    expect(summary.whatsappSent).toBe(1);
    expect(summary.whatsappFailed).toBe(1);
  });
});

describe('ETAPA 07 — atenção', () => {
  it('completed com aderência 30% é attention; pending não é', () => {
    const completed = slot({
      patientId: 'b',
      scheduledDate: '2026-08-11',
      status: 'completed',
      record: { score: 40, aderenciaPlano: 30, diasProteinaMeta: 6, diasMetaAgua: 6, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-11' },
    });
    const pending = slot({ patientId: 'd', scheduledDate: '2026-08-17', status: 'pending' });
    expect(slotHasClinicalAttention(completed)).toBe(true);
    expect(slotHasClinicalAttention(pending)).toBe(false);
  });

  it('compacta flags em no máximo 3 + extra', () => {
    const compact = compactWeeklyNutritionAttentionFlags([
      { id: 'low_adherence', label: 'Aderência 30%' },
      { id: 'moderate_constipation', label: 'Constipação moderada' },
      { id: 'low_protein', label: 'Meta de proteína atingida em apenas 2 dia(s)' },
      { id: 'low_hydration', label: 'Meta de água atingida em apenas 1 dia(s)' },
    ]);
    expect(compact.shown).toHaveLength(3);
    expect(compact.extra).toBe(1);
    expect(compact.shown[2]?.label).toBe('Proteína 2/7');
  });
});

describe('ETAPA 07 — filtros e ordenação', () => {
  const slots: WeeklyNutritionCheckInOperationalSlot[] = [
    slot({ patientId: 'upcoming', patientName: 'Ana', scheduledDate: '2026-08-23', status: 'upcoming' }),
    slot({
      patientId: 'ok',
      patientName: 'Carlos',
      scheduledDate: '2026-08-10',
      status: 'completed',
      record: { score: 88, aderenciaPlano: 90, diasProteinaMeta: 6, diasMetaAgua: 6, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-10' },
    }),
    slot({
      patientId: 'attn',
      patientName: 'João',
      scheduledDate: '2026-08-11',
      status: 'completed',
      record: { score: 40, aderenciaPlano: 30, diasProteinaMeta: 2, diasMetaAgua: 6, nauseas: 'nenhum', constipacao: 'nenhum', diarreia: 'nenhum', weekKey: '2026-08-11' },
    }),
    slot({ patientId: 'today', patientName: 'Maria', scheduledDate: '2026-08-17', status: 'pending' }),
    slot({ patientId: 'late', patientName: 'Ricardo', scheduledDate: '2026-08-16', status: 'pending' }),
  ];

  it('ordena overdue → today → completed attention → completed → upcoming', () => {
    const ordered = sortWeeklyNutritionCheckInOperationalSlots(slots, { todayYmd: '2026-08-17' });
    expect(ordered.map((s) => s.patientId)).toEqual(['late', 'today', 'attn', 'ok', 'upcoming']);
  });

  it('filtra Todos / Respondidos / Aguardando / Atrasados / Com atenção', () => {
    const todayYmd = '2026-08-17';
    expect(filterWeeklyNutritionCheckInSlots(slots, { todayYmd, statusFilter: 'all' })).toHaveLength(5);
    expect(filterWeeklyNutritionCheckInSlots(slots, { todayYmd, statusFilter: 'completed' }).map((s) => s.patientId)).toEqual(['ok', 'attn']);
    expect(filterWeeklyNutritionCheckInSlots(slots, { todayYmd, statusFilter: 'waiting' }).map((s) => s.patientId)).toEqual(['today']);
    expect(filterWeeklyNutritionCheckInSlots(slots, { todayYmd, statusFilter: 'overdue' }).map((s) => s.patientId)).toEqual(['late']);
    expect(filterWeeklyNutritionCheckInSlots(slots, { todayYmd, statusFilter: 'attention' }).map((s) => s.patientId)).toEqual(['attn']);
  });

  it('filtra WhatsApp enviado / não enviado / falhou', () => {
    const withWa: WeeklyNutritionCheckInOperationalSlot[] = [
      slot({ patientId: 'sent', scheduledDate: '2026-08-17', status: 'pending', whatsapp: 'sent' }),
      slot({ patientId: 'fail', scheduledDate: '2026-08-16', status: 'pending', whatsapp: 'failed' }),
      slot({ patientId: 'none', scheduledDate: '2026-08-18', status: 'upcoming' }),
    ];
    const todayYmd = '2026-08-17';
    expect(
      filterWeeklyNutritionCheckInSlots(withWa, { todayYmd, statusFilter: 'all', whatsappFilter: 'sent' }).map((s) => s.patientId)
    ).toEqual(['sent']);
    expect(
      filterWeeklyNutritionCheckInSlots(withWa, { todayYmd, statusFilter: 'all', whatsappFilter: 'failed' }).map((s) => s.patientId)
    ).toEqual(['fail']);
    expect(
      filterWeeklyNutritionCheckInSlots(withWa, { todayYmd, statusFilter: 'all', whatsappFilter: 'unsent' }).map((s) => s.patientId)
    ).toEqual(['none']);
  });
});

describe('ETAPA 07 — polling e regressão', () => {
  it('só polla calendário visível e documento ativo', () => {
    expect(shouldRunWeeklyNutritionCheckInPoll({ calendarVisible: true, documentVisible: true })).toBe(true);
    expect(shouldRunWeeklyNutritionCheckInPoll({ calendarVisible: true, documentVisible: false })).toBe(false);
    expect(shouldRunWeeklyNutritionCheckInPoll({ calendarVisible: false, documentVisible: true })).toBe(false);
  });

  it('Check-in Diário permanece desativado', () => {
    expect(CHECK_IN_DIARIO_NUTRI_ENABLED).toBe(false);
  });
});

describe('ETAPA 07B — ações do card', () => {
  const todayYmd = '2026-08-17';

  it('pending: preencher, WhatsApp e histórico ativos', () => {
    const actions = resolveWeeklyNutritionCheckInCardActions({
      status: 'pending',
      scheduledDate: todayYmd,
      todayYmd,
      hasPhone: true,
    });
    expect(actions.canFill).toBe(true);
    expect(actions.canMessage).toBe(true);
    expect(actions.canViewHistory).toBe(true);
    expect(actions.fillTitle).toBe('Preencher Check-in');
    expect(actions.messageTitle).toContain('Enviar pelo WhatsApp');
    expect(actions.historyTitle).toBe('Evolução Nutricional');
  });

  it('overdue: mesmas ações do pending', () => {
    const actions = resolveWeeklyNutritionCheckInCardActions({
      status: 'pending',
      scheduledDate: '2026-08-16',
      todayYmd,
      hasPhone: true,
      envio: 'failed',
    });
    expect(actions.canFill).toBe(true);
    expect(actions.canMessage).toBe(true);
    expect(actions.messageTitle).toContain('Falha no envio');
  });

  it('upcoming da semana corrente: preencher continua; convite WhatsApp só no dia', () => {
    const actions = resolveWeeklyNutritionCheckInCardActions({
      status: 'upcoming',
      scheduledDate: '2026-08-23',
      weekKey: '2026-08-17',
      todayYmd,
      hasPhone: true,
    });
    expect(actions.canFill).toBe(true);
    expect(actions.canMessage).toBe(false);
    expect(actions.messageTitle).toBe('Disponível no dia do Check-in');
  });

  it('upcoming de semana futura: não preenche', () => {
    const actions = resolveWeeklyNutritionCheckInCardActions({
      status: 'upcoming',
      scheduledDate: '2026-08-30',
      weekKey: '2026-08-24',
      todayYmd,
      hasPhone: true,
    });
    expect(actions.canFill).toBe(false);
    expect(actions.fillTitle).toBe('Disponível na semana do Check-in');
    expect(actions.canMessage).toBe(false);
  });

  it('completed: não preenche de novo e não reenvia convite; histórico ativo', () => {
    const actions = resolveWeeklyNutritionCheckInCardActions({
      status: 'completed',
      scheduledDate: '2026-08-10',
      todayYmd,
      hasPhone: true,
    });
    expect(actions.canFill).toBe(false);
    expect(actions.canMessage).toBe(false);
    expect(actions.canViewHistory).toBe(true);
    expect(actions.fillTitle).toBe('Check-in já respondido');
    expect(actions.messageTitle).toBe('Check-in já respondido');
  });

  it('sem telefone desabilita mensagem com explicação; falha automática não desabilita', () => {
    expect(
      resolveWeeklyNutritionCheckInCardActions({
        status: 'pending',
        scheduledDate: todayYmd,
        todayYmd,
        hasPhone: false,
      }).messageTitle
    ).toBe('Paciente sem WhatsApp cadastrado');
    const failed = resolveWeeklyNutritionCheckInCardActions({
      status: 'pending',
      scheduledDate: todayYmd,
      todayYmd,
      hasPhone: true,
      autoEnabled: false,
      envio: 'failed',
    });
    expect(failed.canMessage).toBe(true);
  });

  it('automação off não desliga WhatsApp manual', () => {
    const actions = resolveWeeklyNutritionCheckInCardActions({
      status: 'pending',
      scheduledDate: todayYmd,
      todayYmd,
      hasPhone: true,
      autoEnabled: false,
    });
    expect(actions.canMessage).toBe(true);
  });

  it('fluxo manual continua ensure link → mensagem pronta → wa.me', () => {
    const message = buildNutriCheckInWhatsAppMessage({
      pacienteNome: 'Ricardo Mota',
      url: 'https://example.com/checkin-nutri/ABC23456',
    });
    expect(message).toContain('/checkin-nutri/ABC23456');
    expect(nutriCheckInWhatsAppHref('11999998888', message)).toMatch(
      /^https:\/\/wa\.me\/5511999998888\?text=/
    );
  });
});
