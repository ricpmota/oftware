import { describe, expect, it } from 'vitest';
import {
  normalizarDatasAplicacaoIndividuaisParaFirestore,
  reconstruirDatasAplicacaoIndividuaisDaGrade,
} from '@/utils/datasAplicacaoSemanaPlano';
import { buildSemanasEsquemaDoses, sincronizarDatasAplicacaoIndividuaisComEvolucao } from '@/utils/esquemaDosesSemana';
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
    expect(out?.['4']).toBe('2026-06-22');
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
