import { describe, expect, it } from 'vitest';
import { shouldSendNutriCheckInWhatsApp } from '@/lib/nutri/shouldSendNutriCheckInWhatsApp';

const eligible = {
  globalAutomationEnabled: true,
  scheduleEnabled: true,
  hasActiveVinculo: true,
  statusTratamento: 'em_tratamento' as const,
  window: { start: '2026-08-01', end: '2026-08-31', sources: ['tirzepatida'] as const },
  scheduledDate: '2026-08-23',
  hasClinicalRecord: false,
  hasPhone: true,
};

describe('ETAPA 06 — revalidação do worker', () => {
  it('D0 envia quando elegível, automação ligada e sem resposta', () => {
    expect(shouldSendNutriCheckInWhatsApp(eligible)).toEqual({ send: true });
  });

  it('não envia de novo (dedup clínico: já respondeu)', () => {
    expect(shouldSendNutriCheckInWhatsApp({ ...eligible, hasClinicalRecord: true }).send).toBe(false);
  });

  it('automação global off impede envio', () => {
    expect(shouldSendNutriCheckInWhatsApp({ ...eligible, globalAutomationEnabled: false }).skipReason).toMatch(
      /global/i
    );
  });

  it('schedule desativado impede envio', () => {
    expect(shouldSendNutriCheckInWhatsApp({ ...eligible, scheduleEnabled: false }).send).toBe(false);
  });

  it('tratamento concluído impede envio mesmo com fila antiga', () => {
    expect(shouldSendNutriCheckInWhatsApp({ ...eligible, statusTratamento: 'concluido' }).send).toBe(false);
  });

  it('fora da vigência impede envio', () => {
    expect(shouldSendNutriCheckInWhatsApp({ ...eligible, scheduledDate: '2026-09-06' }).send).toBe(false);
  });

  it('vínculo removido impede envio', () => {
    expect(shouldSendNutriCheckInWhatsApp({ ...eligible, hasActiveVinculo: false }).send).toBe(false);
  });

  it('sem telefone faz skip sem quebrar', () => {
    const decision = shouldSendNutriCheckInWhatsApp({ ...eligible, hasPhone: false });
    expect(decision.send).toBe(false);
    expect(decision.skipReason).toMatch(/telefone/i);
  });
});
