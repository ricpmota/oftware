import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  limiteMinimoNumeroSemanasTratamento,
  maiorSemanaComRegistro,
} from '@/utils/numeroSemanasTratamento';
import { pacienteComNumeroSemanasAtualizado } from '@/utils/esquemaDosesSemana';

function pacienteComSemanas(
  n: number,
  evolucao: PacienteCompleto['evolucaoSeguimento'] = [],
  esquema?: Record<number, number>
): PacienteCompleto {
  return {
    id: 'p1',
    nome: 'Teste',
    email: 't@test.com',
    evolucaoSeguimento: evolucao,
    planoTerapeutico: {
      metas: {},
      startDate: new Date(2025, 0, 6),
      numeroSemanasTratamento: n,
      currentDoseMg: 2.5,
      esquemaDosesCustomizado: esquema,
    },
  } as PacienteCompleto;
}

function registro(semana: number, mg = 5) {
  return {
    id: `s${semana}`,
    weekIndex: semana,
    numeroSemana: semana,
    dataRegistro: new Date(2025, 0, 6 + (semana - 1) * 7),
    doseAplicada: { quantidade: mg, data: new Date(), horario: '10:00' },
    adherence: 'ON_TIME' as const,
  };
}

describe('limite de semanas por registros', () => {
  it('sem registros permite diminuir até 1', () => {
    const p = pacienteComSemanas(16, []);
    expect(maiorSemanaComRegistro(p)).toBe(0);
    expect(limiteMinimoNumeroSemanasTratamento(p)).toBe(1);
  });

  it('com 15 registros em 16 semanas, mínimo é 15', () => {
    const evolucao = Array.from({ length: 15 }, (_, i) => registro(i + 1));
    const p = pacienteComSemanas(16, evolucao);
    expect(limiteMinimoNumeroSemanasTratamento(p)).toBe(15);
  });

  it('com registro da última semana, não permite diminuir', () => {
    const evolucao = Array.from({ length: 16 }, (_, i) => registro(i + 1));
    const p = pacienteComSemanas(16, evolucao);
    expect(limiteMinimoNumeroSemanasTratamento(p)).toBe(16);
    const reduzido = pacienteComNumeroSemanasAtualizado(p, 12);
    expect(reduzido.planoTerapeutico?.numeroSemanasTratamento).toBe(16);
  });

  it('ignora registro de conclusão no mínimo', () => {
    const p = pacienteComSemanas(8, [
      registro(8),
      {
        id: 'seguimento-conclusao-1',
        weekIndex: 9,
        comentarioMedico: 'Semana de conclusão',
        dataRegistro: new Date(),
      },
    ]);
    expect(limiteMinimoNumeroSemanasTratamento(p)).toBe(8);
  });

  it('preserva mg de semanas já aplicadas ao ampliar', () => {
    const p = pacienteComSemanas(4, [registro(1, 7.5), registro(2, 7.5)], { 1: 7.5, 2: 7.5 });
    const ampliado = pacienteComNumeroSemanasAtualizado(p, 8);
    expect(ampliado.planoTerapeutico?.numeroSemanasTratamento).toBe(8);
    expect(ampliado.planoTerapeutico?.esquemaDosesCustomizado?.[1]).toBe(7.5);
    expect(ampliado.planoTerapeutico?.esquemaDosesCustomizado?.[2]).toBe(7.5);
  });
});
