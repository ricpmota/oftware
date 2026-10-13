import { describe, expect, it } from 'vitest';
import {
  atualizarNumeroSemanasDoPlano,
  normalizarDatasAplicacaoIndividuaisParaFirestore,
  reconstruirDatasAplicacaoIndividuaisDaGrade,
} from '@/utils/datasAplicacaoSemanaPlano';
import {
  buildSemanasEsquemaDoses,
  listarAplicacoesPlanejadasNoPeriodo,
  pacienteComNumeroSemanasAtualizado,
  sincronizarDatasAplicacaoIndividuaisComEvolucao,
} from '@/utils/esquemaDosesSemana';
import type { PacienteCompleto } from '@/types/obesidade';

const startDate = new Date(2026, 5, 1); // 2026-06-01

function planoBase() {
  return {
    startDate,
    numeroSemanasTratamento: 3,
    currentDoseMg: 2.5,
  };
}

describe('datasAplicacaoIndividuais após limpar evolucao', () => {
  it('reconstruir da grade ignora mapa antigo quando evolucao está vazia', () => {
    const plano = {
      ...planoBase(),
      datasAplicacaoIndividuais: {
        '1': '2024-01-01',
        '2': '2024-01-08',
        '3': '2024-01-15',
        '4': '2024-01-22',
      },
    };
    const out = reconstruirDatasAplicacaoIndividuaisDaGrade(plano, []);
    expect(out?.['1']).toBe('2026-06-01');
    expect(out?.['2']).toBe('2026-06-08');
    expect(out?.['3']).toBe('2026-06-15');
    expect(out?.['4']).toBe('2026-06-23');
  });

  it('buildSemanasEsquemaDoses usa grade após reconstruir mapa', () => {
    const paciente = {
      id: 'p1',
      nome: 'Teste',
      email: 't@test.com',
      evolucaoSeguimento: [],
      planoTerapeutico: {
        metas: {},
        ...planoBase(),
        datasAplicacaoIndividuais: { '1': '2024-01-01', '2': '2024-01-08' },
      },
    } as PacienteCompleto;

    const datas = reconstruirDatasAplicacaoIndividuaisDaGrade(paciente.planoTerapeutico!, []);
    const atualizado = {
      ...paciente,
      planoTerapeutico: { ...paciente.planoTerapeutico!, datasAplicacaoIndividuais: datas },
    };
    const built = buildSemanasEsquemaDoses(atualizado);
    const sem1 = built?.semanas.find((s) => s.semana === 1);
    expect(sem1?.dataExibicao.getFullYear()).toBe(2026);
    expect(sem1?.dataExibicao.getMonth()).toBe(5);
    expect(sem1?.dataExibicao.getDate()).toBe(1);
  });

  it('sincronizar não mantém chaves extras fora do plano atual', () => {
    const plano = {
      ...planoBase(),
      datasAplicacaoIndividuais: {
        '1': '2024-01-01',
        '99': '2099-01-01',
      },
    };
    const out = sincronizarDatasAplicacaoIndividuaisComEvolucao(plano as any, []);
    expect(out?.['99']).toBeUndefined();
    expect(Object.keys(out ?? {}).sort()).toEqual(['1', '2', '3', '4']);
  });

  it('normalizar preserva override manual quando ignorarMapaExistente é false', () => {
    const plano = {
      ...planoBase(),
      datasAplicacaoIndividuais: { '2': '2026-06-10' },
    };
    const out = normalizarDatasAplicacaoIndividuaisParaFirestore(plano, [], {
      ignorarMapaExistente: false,
    });
    expect(out?.['2']).toBe('2026-06-10');
  });
});

describe('atualizarNumeroSemanasDoPlano', () => {
  it('aumenta as semanas e gera novas datas na grade (sem reusar a data de conclusão antiga)', () => {
    const plano = {
      startDate,
      numeroSemanasTratamento: 3,
      datasAplicacaoIndividuais: {
        '1': '2026-06-01',
        '2': '2026-06-08',
        '3': '2026-06-15',
        '4': '2026-06-23',
        conclusao: '2026-06-23',
      },
    };
    const out = atualizarNumeroSemanasDoPlano(plano, 5, []);
    expect(out.numeroSemanasTratamento).toBe(5);
    expect(out.datasAplicacaoIndividuais?.['1']).toBe('2026-06-01');
    expect(out.datasAplicacaoIndividuais?.['3']).toBe('2026-06-15');
    expect(out.datasAplicacaoIndividuais?.['4']).toBe('2026-06-22');
    expect(out.datasAplicacaoIndividuais?.['5']).toBe('2026-06-29');
    expect(out.datasAplicacaoIndividuais?.['6']).toBe('2026-07-07');
    expect(out.datasAplicacaoIndividuais?.conclusao).toBeUndefined();
  });

  it('reduz as semanas e remove aplicações extras do mapa', () => {
    const plano = {
      startDate,
      numeroSemanasTratamento: 5,
      datasAplicacaoIndividuais: {
        '1': '2026-06-01',
        '2': '2026-06-08',
        '3': '2026-06-15',
        '4': '2026-06-22',
        '5': '2026-06-29',
        '6': '2026-07-07',
      },
    };
    const out = atualizarNumeroSemanasDoPlano(plano, 3, []);
    expect(out.numeroSemanasTratamento).toBe(3);
    expect(out.datasAplicacaoIndividuais?.['3']).toBe('2026-06-15');
    expect(out.datasAplicacaoIndividuais?.['4']).toBe('2026-06-23');
    expect(out.datasAplicacaoIndividuais?.['5']).toBeUndefined();
    expect(out.datasAplicacaoIndividuais?.['6']).toBeUndefined();
  });

  it('atualiza a quantidade de aplicações planejadas no mesmo critério do calendário', () => {
    const paciente = {
      id: 'p1',
      nome: 'Teste',
      email: 't@test.com',
      evolucaoSeguimento: [],
      planoTerapeutico: {
        metas: {},
        startDate,
        numeroSemanasTratamento: 3,
        currentDoseMg: 2.5,
        datasAplicacaoIndividuais: {
          '1': '2026-06-01',
          '2': '2026-06-08',
          '3': '2026-06-15',
          '4': '2026-06-23',
        },
      },
    } as PacienteCompleto;

    const inicio = new Date(2026, 4, 1);
    const fim = new Date(2026, 8, 1);
    expect(listarAplicacoesPlanejadasNoPeriodo(paciente, inicio, fim)).toHaveLength(3);

    const ampliado = pacienteComNumeroSemanasAtualizado(paciente, 6);
    expect(buildSemanasEsquemaDoses(ampliado)?.semanas.filter((s) => !s.isConclusao)).toHaveLength(6);
    expect(listarAplicacoesPlanejadasNoPeriodo(ampliado, inicio, fim)).toHaveLength(6);

    const reduzido = pacienteComNumeroSemanasAtualizado(ampliado, 2);
    expect(buildSemanasEsquemaDoses(reduzido)?.semanas.filter((s) => !s.isConclusao)).toHaveLength(2);
    expect(listarAplicacoesPlanejadasNoPeriodo(reduzido, inicio, fim)).toHaveLength(2);
  });
});
