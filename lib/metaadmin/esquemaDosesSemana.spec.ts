import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  buildSemanasEsquemaDoses,
  obterDoseMgSemanaPaciente,
  pacienteComDoseMgSemanaAtualizada,
} from '@/utils/esquemaDosesSemana';

function pacienteBase(
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
      numeroSemanasTratamento: 4,
      currentDoseMg: 2.5,
      esquemaDosesCustomizado: esquema,
    },
  } as PacienteCompleto;
}

describe('dose canônica do esquema', () => {
  it('exibe dose do esquema mesmo quando evolução tem mg diferente', () => {
    const evolucao = [
      {
        id: 's1',
        weekIndex: 1,
        numeroSemana: 1,
        dataRegistro: new Date(2025, 0, 6),
        doseAplicada: { quantidade: 10, data: new Date(), horario: '10:00' },
        adherence: 'ON_TIME' as const,
      },
    ];
    const p = pacienteBase(evolucao, { 1: 5 });
    const built = buildSemanasEsquemaDoses(p);
    const sem1 = built?.semanas.find((s) => s.semana === 1);
    expect(sem1?.doseAtual).toBe(5);
    expect(obterDoseMgSemanaPaciente(p, 1)).toBe(5);
  });

  it('editar dose na evolução atualiza esquemaDosesCustomizado', () => {
    const evolucao = [
      {
        id: 's2',
        weekIndex: 2,
        numeroSemana: 2,
        dataRegistro: new Date(2025, 0, 13),
        doseAplicada: { quantidade: 2.5, data: new Date(), horario: '10:00' },
        adherence: 'ON_TIME' as const,
      },
    ];
    const atualizado = pacienteComDoseMgSemanaAtualizada(pacienteBase(evolucao), 2, 7.5);
    expect(atualizado.planoTerapeutico?.esquemaDosesCustomizado?.[2]).toBe(7.5);
    expect(atualizado.evolucaoSeguimento?.[0].doseAplicada?.quantidade).toBe(7.5);
    expect(obterDoseMgSemanaPaciente(atualizado, 2)).toBe(7.5);
  });
});
