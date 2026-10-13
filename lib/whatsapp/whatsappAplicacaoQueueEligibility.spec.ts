import { describe, expect, it } from 'vitest';
import { evaluateAplicacaoWhatsappQueueEligibility } from '@/lib/whatsapp/whatsappAplicacaoQueueEligibility';

describe('evaluateAplicacaoWhatsappQueueEligibility', () => {
  it('não envia aplicação se o status não é em tratamento', () => {
    const result = evaluateAplicacaoWhatsappQueueEligibility({
      kind: 'aplicacao',
      statusTratamento: 'pendente',
      dateKey: '2026-08-23',
      aplicacaoWeek: {
        isCancelada: false,
        temDoseAplicada: false,
        plannedDateKey: '2026-08-23',
      },
    });
    expect(result).toEqual({ send: false, reason: 'Paciente não está em tratamento.' });
  });

  it('não envia se a semana de aplicação sumiu do plano', () => {
    const result = evaluateAplicacaoWhatsappQueueEligibility({
      kind: 'aplicacao',
      statusTratamento: 'em_tratamento',
      dateKey: '2026-08-23',
      aplicacaoWeek: null,
    });
    expect(result).toEqual({ send: false, reason: 'Aplicação removida do plano terapêutico.' });
  });

  it('não envia injetável já marcado como realizado', () => {
    const result = evaluateAplicacaoWhatsappQueueEligibility({
      kind: 'injetavel',
      statusTratamento: 'em_tratamento',
      dateKey: '2026-08-23',
      injetavelWeek: { exists: true, realizado: true, plannedDateKey: '2026-08-23' },
    });
    expect(result).toEqual({
      send: false,
      reason: 'Injetável já marcado como aplicado pelo médico.',
    });
  });

  it('não envia injetável apagado do plano', () => {
    const result = evaluateAplicacaoWhatsappQueueEligibility({
      kind: 'injetavel',
      statusTratamento: 'em_tratamento',
      dateKey: '2026-08-23',
      injetavelWeek: { exists: false, realizado: false, plannedDateKey: '' },
    });
    expect(result).toEqual({ send: false, reason: 'Injetável removido do plano terapêutico.' });
  });

  it('não envia aplicação cancelada no plano', () => {
    const result = evaluateAplicacaoWhatsappQueueEligibility({
      kind: 'aplicacao',
      statusTratamento: 'em_tratamento',
      dateKey: '2026-08-23',
      aplicacaoWeek: {
        isCancelada: true,
        temDoseAplicada: false,
        plannedDateKey: '2026-08-23',
      },
    });
    expect(result).toEqual({ send: false, reason: 'Aplicação cancelada no plano terapêutico.' });
  });

  it('não envia se a data da aplicação mudou', () => {
    const result = evaluateAplicacaoWhatsappQueueEligibility({
      kind: 'aplicacao',
      statusTratamento: 'em_tratamento',
      dateKey: '2026-08-23',
      aplicacaoWeek: {
        isCancelada: false,
        temDoseAplicada: false,
        plannedDateKey: '2026-08-30',
      },
    });
    expect(result).toEqual({
      send: false,
      reason: 'Data de aplicação foi alterada no plano terapêutico.',
    });
  });

  it('envia aplicação válida em tratamento', () => {
    const result = evaluateAplicacaoWhatsappQueueEligibility({
      kind: 'aplicacao',
      statusTratamento: 'em_tratamento',
      dateKey: '2026-08-23',
      aplicacaoWeek: {
        isCancelada: false,
        temDoseAplicada: false,
        plannedDateKey: '2026-08-23',
      },
    });
    expect(result).toEqual({ send: true });
  });
});
