import { describe, expect, it } from 'vitest';
import { buildNutriCheckInWhatsAppMessage } from '@/lib/nutri/buildNutriCheckInWhatsAppMessage';
import { planNutriCheckInWhatsAppQueueItems } from '@/lib/nutri/planNutriCheckInWhatsAppQueue';
import { BRASIL_TIMEZONE } from '@/lib/time/brasilTimezone';

const schedule = {
  patientId: 'pac-1',
  nutritionistId: 'nutri-1',
  enabled: true,
  weekday: 1 as const,
  time: '18:00',
  timezone: BRASIL_TIMEZONE,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'nutri-1',
};

const window = { start: '2026-08-01', end: '2026-08-31', sources: ['tirzepatida'] as const };

describe('ETAPA 06 — mensagem WhatsApp', () => {
  it('monta o texto D0 com o link público', () => {
    const msg = buildNutriCheckInWhatsAppMessage({
      pacienteNome: 'Ricardo Mota',
      url: 'https://oftware.com.br/checkin-nutri/ABC23456',
    });
    expect(msg).toContain('Olá, Ricardo!');
    expect(msg).toContain('Check-in Semanal de alimentação');
    expect(msg).toContain('https://oftware.com.br/checkin-nutri/ABC23456');
    expect(msg).not.toMatch(/tirzepatida|aplicação/i);
  });
});

describe('ETAPA 06 — fila D0 e atraso', () => {
  it('D0 na segunda 18:00 e atraso 24h', () => {
    const items = planNutriCheckInWhatsAppQueueItems({
      schedule,
      statusTratamento: 'em_tratamento',
      window,
      todayKey: '2026-08-17',
      horizonKey: '2026-08-31',
    });
    const week = items.filter((i) => i.weekKey === '2026-08-17');
    expect(week.some((i) => i.milestone === 'd0' && i.scheduledDateKey === '2026-08-24' && i.scheduledTime === '18:00')).toBe(true);
    expect(week.some((i) => i.milestone === 'dplus1' && i.scheduledDateKey === '2026-08-25')).toBe(true);
  });

  it('não enfileira se já existe check-in da semana', () => {
    const items = planNutriCheckInWhatsAppQueueItems({
      schedule,
      statusTratamento: 'em_tratamento',
      window,
      existingWeekKeys: ['2026-08-17'],
      todayKey: '2026-08-17',
      horizonKey: '2026-08-31',
    });
    expect(items.some((i) => i.weekKey === '2026-08-17')).toBe(false);
  });

  it('automação/schedule off ou fora do tratamento não enfileira', () => {
    expect(
      planNutriCheckInWhatsAppQueueItems({
        schedule: { ...schedule, enabled: false },
        statusTratamento: 'em_tratamento',
        window,
        todayKey: '2026-08-17',
        horizonKey: '2026-08-31',
      })
    ).toEqual([]);
    expect(
      planNutriCheckInWhatsAppQueueItems({
        schedule,
        statusTratamento: 'concluido',
        window,
        todayKey: '2026-08-17',
        horizonKey: '2026-08-31',
      })
    ).toEqual([]);
  });
});
