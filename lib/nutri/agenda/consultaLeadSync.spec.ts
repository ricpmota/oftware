import { describe, expect, it } from 'vitest';
import {
  formatConsultaAgendadaTimelineText,
  formatConsultaAlteradaTimelineText,
  shouldAdvanceNutriLeadToConsultasAgendadas,
} from '@/lib/nutri/agenda/consultaLeadSync';

describe('consulta lead sync', () => {
  it('formata dia e horário da consulta na timeline', () => {
    const text = formatConsultaAgendadaTimelineText({
      date: '2026-08-26',
      startTime: '16:00',
      endTime: '17:00',
    });
    expect(text).toContain('16:00');
    expect(text).toContain('17:00');
    expect(text.toLowerCase()).toContain('agosto');
  });

  it('formata alteração de consulta com observação', () => {
    const text = formatConsultaAlteradaTimelineText({
      date: '2026-08-27',
      startTime: '15:00',
      endTime: '16:00',
      observacoes: 'Paciente pediu para adiantar.',
    });
    expect(text).toContain('15:00');
    expect(text).toContain('Paciente pediu para adiantar.');
  });

  it('só tira o lead de Não atendido', () => {
    expect(shouldAdvanceNutriLeadToConsultasAgendadas('nao_atendido')).toBe(true);
    expect(shouldAdvanceNutriLeadToConsultasAgendadas('consultas_agendadas')).toBe(false);
    expect(shouldAdvanceNutriLeadToConsultasAgendadas('cardapio_em_execucao')).toBe(false);
    expect(shouldAdvanceNutriLeadToConsultasAgendadas('nao_atendido', 'qualificado')).toBe(false);
  });
});
