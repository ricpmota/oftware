import { describe, expect, it } from 'vitest';
import { getPaciente360CardHighlight } from '@/lib/paciente360/paciente360Labels';
import type { Paciente360Summary } from '@/types/paciente360';

function summaryBase(overrides: Partial<Paciente360Summary> = {}): Paciente360Summary {
  return {
    pacienteId: 'p1',
    nome: 'Maria',
    statusComposto: 'em_tratamento',
    statusTratamento: 'em_tratamento',
    alertas: [],
    risco: { nivel: 'baixo', motivos: [] },
    tagsAutomaticas: [],
    proximaAcao: { tipo: 'acompanhar', label: 'Acompanhar evolução', prioridade: 10 },
    ...overrides,
  };
}

describe('getPaciente360CardHighlight', () => {
  it('retorna pendente com iniciar acompanhamento', () => {
    const h = getPaciente360CardHighlight(
      summaryBase({ statusComposto: 'pendente', statusTratamento: 'pendente' })
    );
    expect(h.title).toBe('Pendente');
    expect(h.subtitle).toBe('Iniciar acompanhamento');
    expect(h.tone).toBe('neutral');
  });

  it('prioriza risco alto', () => {
    const h = getPaciente360CardHighlight(
      summaryBase({
        risco: { nivel: 'alto', motivos: ['Pagamento atrasado'] },
        proximaAcao: { tipo: 'avaliar_aplicacao', label: 'Avaliar aplicação', prioridade: 80 },
      })
    );
    expect(h.title).toBe('⚠️ Risco alto');
    expect(h.subtitle).toBe('Avaliar aplicação');
    expect(h.tone).toBe('danger');
  });

  it('destaca pagamento pendente', () => {
    const h = getPaciente360CardHighlight(
      summaryBase({
        financeiro: { statusPagamento: 'em_aberto', valorPendente: 500 },
        proximaAcao: { tipo: 'cobrar_pagamento', label: 'Cobrar pagamento', prioridade: 70 },
      })
    );
    expect(h.title).toBe('⚠️ Pagamento pendente');
    expect(h.subtitle).toBe('Cobrar pagamento');
    expect(h.tone).toBe('warning');
  });

  it('destaca dose atrasada', () => {
    const h = getPaciente360CardHighlight(
      summaryBase({
        statusComposto: 'dose_atrasada',
        proximaAcao: { tipo: 'avaliar_aplicacao', label: 'Avaliar aplicação', prioridade: 80 },
      })
    );
    expect(h.title).toBe('⚠️ Dose atrasada');
    expect(h.tone).toBe('warning');
  });

  it('retorna em tratamento neutro por padrão', () => {
    const h = getPaciente360CardHighlight(summaryBase());
    expect(h.title).toBe('Em tratamento');
    expect(h.subtitle).toBe('Acompanhar evolução');
    expect(h.tone).toBe('neutral');
  });
});
