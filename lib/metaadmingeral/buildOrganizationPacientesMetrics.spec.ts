import { describe, expect, it } from 'vitest';
import {
  buildOrganizationPacientesMetrics,
  resolvePacienteMedicoId,
} from './buildOrganizationPacientesMetrics';
import type { Medico } from '@/types/medico';

const medicoA = { id: 'm1', nome: 'Ana', email: 'ana@test.com' } as Medico;
const medicoB = { id: 'm2', nome: 'Bruno', email: 'bruno@test.com' } as Medico;

describe('resolvePacienteMedicoId', () => {
  it('prioriza médico atual e cai no anterior em abandono', () => {
    expect(
      resolvePacienteMedicoId({ medicoResponsavelId: 'm1', medicoResponsavelAnteriorId: 'm2' }),
    ).toBe('m1');
    expect(
      resolvePacienteMedicoId({ medicoResponsavelId: null, medicoResponsavelAnteriorId: 'm2' }),
    ).toBe('m2');
    expect(
      resolvePacienteMedicoId({ medicoResponsavelId: null, medicoResponsavelAnteriorId: null }),
    ).toBeNull();
  });
});

describe('buildOrganizationPacientesMetrics', () => {
  it('agrega status atual e cadastros por mês', () => {
    const result = buildOrganizationPacientesMetrics({
      medicos: [medicoA, medicoB],
      pacientes: [
        {
          medicoResponsavelId: 'm1',
          statusTratamento: 'pendente',
          dataCadastro: new Date(2026, 0, 10),
        },
        {
          medicoResponsavelId: 'm1',
          statusTratamento: 'em_tratamento',
          dataCadastro: new Date(2026, 0, 20),
        },
        {
          medicoResponsavelId: 'm1',
          statusTratamento: 'concluido',
          dataCadastro: new Date(2026, 1, 5),
        },
        {
          medicoResponsavelId: null,
          medicoResponsavelAnteriorId: 'm2',
          statusTratamento: 'abandono',
          dataCadastro: new Date(2026, 1, 12),
        },
      ],
      monthsBack: 3,
      referenceDate: new Date(2026, 2, 15),
    });

    expect(result.months.map((m) => m.monthKey)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(result.totals).toEqual({
      pendente: 1,
      em_tratamento: 1,
      concluido: 1,
      abandono: 1,
      total: 4,
    });

    const jan = result.months.find((m) => m.monthKey === '2026-01');
    const fev = result.months.find((m) => m.monthKey === '2026-02');
    const mar = result.months.find((m) => m.monthKey === '2026-03');
    expect(jan).toMatchObject({ pendente: 1, em_tratamento: 1, concluido: 0, abandono: 0, total: 2 });
    expect(fev).toMatchObject({ pendente: 0, em_tratamento: 0, concluido: 1, abandono: 1, total: 2 });
    expect(mar).toMatchObject({ total: 0 });

    const ana = result.rows.find((r) => r.medicoId === 'm1');
    const bruno = result.rows.find((r) => r.medicoId === 'm2');
    expect(ana?.total).toBe(3);
    expect(bruno?.abandono).toBe(1);
  });

  it('filtra por um ou vários médicos', () => {
    const result = buildOrganizationPacientesMetrics({
      medicos: [medicoA, medicoB],
      pacientes: [
        {
          medicoResponsavelId: 'm1',
          statusTratamento: 'pendente',
          dataCadastro: new Date(2026, 0, 10),
        },
        {
          medicoResponsavelId: 'm2',
          statusTratamento: 'em_tratamento',
          dataCadastro: new Date(2026, 0, 11),
        },
      ],
      selectedMedicoIds: ['m2'],
      monthsBack: 1,
      referenceDate: new Date(2026, 0, 20),
    });

    expect(result.medicosFiltrados).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.medicoId).toBe('m2');
    expect(result.totals.total).toBe(1);
    expect(result.totals.em_tratamento).toBe(1);
  });

  it('lista vazia de médicos selecionados zera o resultado', () => {
    const result = buildOrganizationPacientesMetrics({
      medicos: [medicoA, medicoB],
      pacientes: [
        {
          medicoResponsavelId: 'm1',
          statusTratamento: 'pendente',
          dataCadastro: new Date(2026, 0, 10),
        },
      ],
      selectedMedicoIds: [],
      monthsBack: 1,
      referenceDate: new Date(2026, 0, 20),
    });

    expect(result.medicosFiltrados).toBe(0);
    expect(result.rows).toHaveLength(0);
    expect(result.totals.total).toBe(0);
  });
});
