import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import { resolverDoseMgAplicacaoPublica } from '@/lib/aplicacao/resolverDoseMgAplicacaoPublica';

function paciente(esquema?: Record<number, number>): PacienteCompleto {
  return {
    id: 'p1',
    nome: 'Teste',
    email: 't@test.com',
    evolucaoSeguimento: [],
    planoTerapeutico: {
      metas: {},
      startDate: new Date(2025, 0, 6),
      numeroSemanasTratamento: 4,
      currentDoseMg: 2.5,
      esquemaDosesCustomizado: esquema,
    },
  } as PacienteCompleto;
}

describe('resolverDoseMgAplicacaoPublica', () => {
  it('prioriza a dose do esquema sobre o snapshot do link', () => {
    expect(
      resolverDoseMgAplicacaoPublica({
        paciente: paciente({ 2: 3.75 }),
        semana: 2,
        fallbackDose: 2.5,
      })
    ).toBe(3.75);
  });

  it('usa o fallback do link se o esquema não tiver dose', () => {
    expect(
      resolverDoseMgAplicacaoPublica({
        paciente: { id: 'p1', nome: 'X', email: 'x@x.com' } as PacienteCompleto,
        semana: 1,
        fallbackDose: 7.5,
      })
    ).toBe(7.5);
  });
});
