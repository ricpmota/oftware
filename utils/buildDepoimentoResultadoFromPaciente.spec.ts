import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import { buildDepoimentoResultadoFromPaciente } from '@/utils/buildDepoimentoResultadoFromPaciente';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Semanas 9 e 10 sem dose customizada. Uma aplicação atrasada (>= 4 dias)
 * faz a titulação do plano ficar em 5 mg. O gráfico antigo ignorava esse atraso
 * e subia para 7,5 mg. A semana 3 foi aplicada com 2,5 mg, mas o plano está em 5 mg.
 */
function pacienteComAtrasoEEsquema(): PacienteCompleto {
  const start = new Date(2026, 0, 5);
  const aplicacao = (weekIndex: number, dose: number, atrasoDias = 0) => {
    const data = addDays(start, (weekIndex - 1) * 7 + atrasoDias);
    return {
      weekIndex,
      peso: 90 - weekIndex,
      adherence: 'ON_TIME' as const,
      dataRegistro: data,
      doseAplicada: { quantidade: dose, data, horario: '08:00' },
    };
  };

  return {
    id: 'p-dose-plano',
    nome: 'Paciente',
    email: 'p@test.com',
    statusTratamento: 'em_tratamento',
    planoTerapeutico: {
      metas: {},
      startDate: start,
      numeroSemanasTratamento: 15,
      currentDoseMg: 2.5,
      injectionDayOfWeek: 'seg',
      esquemaDosesCustomizado: {
        1: 2.5,
        2: 2.5,
        3: 5,
        4: 5,
        5: 5,
        6: 5,
        7: 5,
        8: 5,
        11: 5,
        12: 2.5,
        13: 2.5,
        14: 2.5,
        15: 2.5,
      },
    },
    evolucaoSeguimento: [
      aplicacao(1, 2.5),
      aplicacao(2, 2.5, 10),
      aplicacao(3, 2.5),
    ],
  } as PacienteCompleto;
}

describe('buildDepoimentoResultadoFromPaciente doses do plano', () => {
  it('usa a mesma mg do esquema terapêutico, inclusive semanas sem aplicação', () => {
    const paciente = pacienteComAtrasoEEsquema();
    const plano = buildSemanasEsquemaDoses(paciente);
    const grafico = buildDepoimentoResultadoFromPaciente(paciente, 0, '');

    expect(plano).toBeTruthy();
    const dosePlano = (semana: number) =>
      plano!.semanas.find((s) => s.semana === semana && !s.isConclusao)!.doseAtual;

    expect(dosePlano(9)).toBe(5);
    expect(dosePlano(10)).toBe(5);
    expect(dosePlano(3)).toBe(5);

    for (const semana of [3, 4, 9, 10, 11, 12]) {
      expect(grafico.evolucao[semana - 1]?.doseMg).toBe(dosePlano(semana));
    }
    expect(grafico.evolucao[8]?.doseMg).not.toBe(7.5);
    expect(grafico.evolucao[9]?.doseMg).not.toBe(7.5);
  });

  it('acrescenta a conclusão como último ponto, sem dose', () => {
    const paciente = pacienteComAtrasoEEsquema();
    paciente.planoTerapeutico = {
      ...paciente.planoTerapeutico!,
      conclusaoTratamento: { pesoFinalKg: 80 },
    };
    const grafico = buildDepoimentoResultadoFromPaciente(paciente, 0, '');
    const conclusao = grafico.evolucao[grafico.evolucao.length - 1];

    expect(conclusao?.isConclusao).toBe(true);
    expect(conclusao?.peso).toBe(80);
    expect(conclusao?.doseMg).toBe(0);
    expect(grafico.evolucao[14]?.isConclusao).toBeUndefined();
  });
});
