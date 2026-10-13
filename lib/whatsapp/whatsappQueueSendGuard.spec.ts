import { describe, expect, it } from 'vitest';
import {
  isWhatsappQueueSendWindowExpired,
  whatsappSameDayDedupDocId,
  whatsappSameDaySendKey,
} from '@/lib/whatsapp/whatsappQueueSendGuard';

describe('isWhatsappQueueSendWindowExpired', () => {
  it('não expira no próprio dia', () => {
    expect(isWhatsappQueueSendWindowExpired('2026-08-23', '2026-08-23')).toBe(false);
  });

  it('expira itens de dias anteriores', () => {
    expect(isWhatsappQueueSendWindowExpired('2026-08-21', '2026-08-23')).toBe(true);
    expect(isWhatsappQueueSendWindowExpired('2026-08-22', '2026-08-23')).toBe(true);
  });

  it('não expira o futuro', () => {
    expect(isWhatsappQueueSendWindowExpired('2026-08-24', '2026-08-23')).toBe(false);
  });
});

describe('whatsappSameDaySendKey', () => {
  it('colapsa a mesma automação/paciente/dia', () => {
    const a = whatsappSameDaySendKey({
      automationId: 'aplicacao_dia_whatsapp',
      patientId: 'p1',
      scheduledDateKey: '2026-08-23',
    });
    const b = whatsappSameDaySendKey({
      automationId: 'aplicacao_dia_whatsapp',
      patientId: 'p1',
      scheduledDateKey: '2026-08-23',
    });
    expect(a).toBe(b);
  });

  it('separa protocolos injetáveis no mesmo dia', () => {
    const a = whatsappSameDaySendKey({
      automationId: 'injetavel_dia_whatsapp',
      patientId: 'p1',
      scheduledDateKey: '2026-08-23',
      scopeKey: 'prot-a',
    });
    const b = whatsappSameDaySendKey({
      automationId: 'injetavel_dia_whatsapp',
      patientId: 'p1',
      scheduledDateKey: '2026-08-23',
      scopeKey: 'prot-b',
    });
    expect(a).not.toBe(b);
  });
});

describe('whatsappSameDayDedupDocId', () => {
  it('não inclui semana — um doc por paciente/dia', () => {
    expect(
      whatsappSameDayDedupDocId({
        doctorId: 'm1',
        patientId: 'p1',
        automationId: 'aplicacao_dia_whatsapp',
        scheduledDateKey: '2026-08-23',
        milestone: 'd0',
      }),
    ).toBe('m1_p1_aplicacao_dia_whatsapp_2026-08-23_d0');
  });
});
