import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import { resolverProximoRegistroSeguimento } from '@/lib/metaadmin/proximoRegistroSeguimento';

function pacienteBase(evolucao: PacienteCompleto['evolucaoSeguimento'] = []): PacienteCompleto {
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
      semanasCanceladas: [],
    },
  } as PacienteCompleto;
}

describe('resolverProximoRegistroSeguimento', () => {
  it('retorna semana 4 quando 3 doses já aplicadas', () => {
    const evolucao = [1, 2, 3].map((w) => ({
      id: `s${w}`,
      weekIndex: w,
      numeroSemana: w,
      dataRegistro: new Date(2025, 0, 5 + w * 7),
      doseAplicada: { quantidade: 2.5, data: new Date(), horario: '10:00' },
      adherence: 'ON_TIME' as const,
    }));
    const ctx = resolverProximoRegistroSeguimento(pacienteBase(evolucao));
    expect(ctx?.tipo).toBe('dose');
    if (ctx?.tipo === 'dose') expect(ctx.semana).toBe(4);
  });

  it('pula semana cancelada e abre a 5', () => {
    const evolucao = [1, 2, 3].map((w) => ({
      id: `s${w}`,
      weekIndex: w,
      numeroSemana: w,
      dataRegistro: new Date(),
      doseAplicada: { quantidade: 2.5, data: new Date(), horario: '10:00' },
      adherence: 'ON_TIME' as const,
    }));
    const p = pacienteBase(evolucao);
    p.planoTerapeutico!.semanasCanceladas = [4];
    const ctx = resolverProximoRegistroSeguimento(p);
    expect(ctx?.tipo).toBe('conclusao');
  });

  it('após todas as doses, retorna conclusão', () => {
    const evolucao = [1, 2, 3, 4].map((w) => ({
      id: `s${w}`,
      weekIndex: w,
      numeroSemana: w,
      dataRegistro: new Date(),
      doseAplicada: { quantidade: 2.5, data: new Date(), horario: '10:00' },
      adherence: 'ON_TIME' as const,
    }));
    const ctx = resolverProximoRegistroSeguimento(pacienteBase(evolucao));
    expect(ctx?.tipo).toBe('conclusao');
    if (ctx?.tipo === 'conclusao') expect(ctx.semana).toBe(5);
  });
});
