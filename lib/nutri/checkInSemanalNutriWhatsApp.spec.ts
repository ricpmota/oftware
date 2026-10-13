import { describe, expect, it } from 'vitest';
import { NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID, pickNutriCheckInEnvioInfo } from './checkInSemanalNutriWhatsApp';

describe('pickNutriCheckInEnvioInfo', () => {
  it('ignores other automations', () => {
    expect(
      pickNutriCheckInEnvioInfo([
        {
          automationId: 'aplicacao_dia',
          patientId: 'p1',
          dateKey: '2026-W36',
          status: 'sent',
          sentAt: new Date('2026-08-31T11:00:00.000Z'),
        },
      ])
    ).toEqual({});
  });

  it('prefers sent over failed and keeps the send time', () => {
    const info = pickNutriCheckInEnvioInfo([
      {
        automationId: NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
        patientId: 'p1',
        dateKey: '2026-W36',
        status: 'failed',
      },
      {
        automationId: NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
        patientId: 'p1',
        dateKey: '2026-W36',
        status: 'sent',
        sentAt: new Date('2026-08-31T11:32:00.000Z'),
      },
    ]);
    expect(info['p1::2026-W36']).toEqual({
      status: 'sent',
      sentAt: '2026-08-31T11:32:00.000Z',
    });
  });

  it('keeps the latest sentAt when status ties', () => {
    const info = pickNutriCheckInEnvioInfo([
      {
        automationId: NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
        patientId: 'p1',
        dateKey: '2026-W36',
        status: 'sent',
        sentAt: new Date('2026-08-31T10:00:00.000Z'),
      },
      {
        automationId: NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
        patientId: 'p1',
        dateKey: '2026-W36',
        status: 'sent',
        sentAt: new Date('2026-08-31T12:00:00.000Z'),
      },
    ]);
    expect(info['p1::2026-W36']?.sentAt).toBe('2026-08-31T12:00:00.000Z');
  });
});
