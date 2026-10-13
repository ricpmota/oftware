import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  buildWeightEvolutionAnalysis,
  detectInconsistentDelta,
} from '@/lib/metaadmin/dashboard/weightEvolutionAnalysis';

function dateForWeek(week: number): Date {
  const d = new Date(2026, 0, 1);
  d.setDate(d.getDate() + (week - 1) * 7);
  return d;
}

function paciente(id: string, pesos: Array<{ week: number; peso: number; daysOffset?: number }>): PacienteCompleto {
  return {
    id,
    userId: id,
    dadosIdentificacao: { nomeCompleto: `Paciente ${id}`, sexoBiologico: 'F' },
    evolucaoSeguimento: pesos.map((p) => {
      const data = dateForWeek(p.week);
      if (p.daysOffset) data.setDate(data.getDate() + p.daysOffset);
      return {
        id: `${id}-w${p.week}`,
        weekIndex: p.week,
        dataRegistro: data,
        peso: p.peso,
      };
    }),
  } as PacienteCompleto;
}

const filters = {
  ownPatientIds: new Set(['a']),
  filtroSexo: 'todos' as const,
  filtroFaixaEtaria: 'todas' as const,
  filtroDose: 'todas',
};

describe('detectInconsistentDelta', () => {
  it('marca aumento acima de 2 kg', () => {
    expect(detectInconsistentDelta(90, 92.1)).toEqual(['Aumento de peso superior a 2 kg.']);
  });

  it('aceita aumento de até 2 kg', () => {
    expect(detectInconsistentDelta(90, 92)).toEqual([]);
  });

  it('marca perda acima de 6 kg', () => {
    expect(detectInconsistentDelta(90, 83)).toEqual(['Perda semanal superior a 6 kg.']);
  });

  it('aceita perda de 6 kg', () => {
    expect(detectInconsistentDelta(90, 84)).toEqual([]);
  });
});

describe('buildWeightEvolutionAnalysis', () => {
  it('mantém perda consistente na curva da Home', () => {
    const result = buildWeightEvolutionAnalysis({
      ...filters,
      pacientes: [paciente('a', [
        { week: 1, peso: 90 },
        { week: 2, peso: 89 },
        { week: 3, peso: 88 },
      ])],
    });
    expect(result.points.map((p) => p.semana)).toEqual([2, 3]);
    expect(result.points[0].media).toBeCloseTo(1);
    expect(result.points[1].media).toBeCloseTo(2);
    expect(result.mediaSemanalKg).toBeCloseTo(1);
  });

  it('retira da curva aumento maior que 2 kg', () => {
    const result = buildWeightEvolutionAnalysis({
      ...filters,
      pacientes: [paciente('a', [
        { week: 1, peso: 90 },
        { week: 2, peso: 93 },
        { week: 3, peso: 89 },
      ])],
    });
    expect(result.points.find((p) => p.semana === 2)).toBeUndefined();
    expect(result.points.find((p) => p.semana === 3)?.media).toBeCloseTo(1);
  });

  it('retira da curva perda maior que 6 kg', () => {
    const result = buildWeightEvolutionAnalysis({
      ...filters,
      pacientes: [paciente('a', [
        { week: 1, peso: 90 },
        { week: 2, peso: 80 },
        { week: 3, peso: 89 },
      ])],
    });
    expect(result.points.find((p) => p.semana === 2)).toBeUndefined();
    expect(result.points.find((p) => p.semana === 3)?.media).toBeCloseTo(1);
  });

  it('retira salto grande mesmo com semanas puladas (typo tardio)', () => {
    const result = buildWeightEvolutionAnalysis({
      ...filters,
      pacientes: [paciente('a', [
        { week: 1, peso: 90 },
        { week: 12, peso: 20 },
      ])],
    });
    expect(result.points).toHaveLength(0);
  });

  it('não deixa um outlier poluir a média da organização', () => {
    const result = buildWeightEvolutionAnalysis({
      ...filters,
      ownPatientIds: new Set(['a']),
      pacientes: [
        paciente('a', [
          { week: 1, peso: 90 },
          { week: 2, peso: 89 },
        ]),
        paciente('org', [
          { week: 1, peso: 100 },
          { week: 2, peso: 70 },
        ]),
      ],
    });
    const week2 = result.points.find((p) => p.semana === 2);
    expect(week2?.quantidade).toBe(1);
    expect(week2?.media).toBeCloseTo(1);
  });

  it('suaviza pico de uma semana na curva agregada', () => {
    const estaveis = ['a', 'b', 'c'].map((id) =>
      paciente(id, [
        { week: 1, peso: 90 },
        { week: 2, peso: 89 },
        { week: 3, peso: 88 },
        { week: 4, peso: 87 },
      ])
    );
    const pico = paciente('pico', [
      { week: 1, peso: 90 },
      { week: 2, peso: 89 },
      { week: 3, peso: 84 },
      { week: 4, peso: 87 },
    ]);
    const result = buildWeightEvolutionAnalysis({
      ...filters,
      pacientes: [...estaveis, pico],
    });
    const week3 = result.points.find((p) => p.semana === 3);
    expect(week3).toBeDefined();
    expect(week3!.media).toBeLessThan(4);
  });
});
