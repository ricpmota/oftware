import { describe, expect, it } from 'vitest';
import { investimentoVazio } from '@/lib/treatment-negotiation/parametrosDefaults';
import { normalizarParametrosNegociacaoSalvos } from '@/lib/treatment-negotiation/normalizarParametrosNegociacao';
import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';

function parcial(
  patch: Partial<ParametrosPlanoPersonalizadoEditavel>
): ParametrosPlanoPersonalizadoEditavel {
  return {
    modalidadeBase: 'mensal',
    modoEditor: 'editar_tudo',
    modoRecalculo: 'manter_manuais',
    nomePlano: 'Personalizado',
    descricaoCurta: '',
    observacoesMedico: '',
    pesoAtualKg: 90,
    metaKg: 10,
    pesoAlvoKg: 80,
    percentualEstimado: null,
    semanasPrazo: 4,
    mesesPrazo: 1,
    dataInicioEstimada: null,
    dataTerminoEstimada: null,
    doseMensalMg: 2.5,
    ritmoEscalonamento: 'lento',
    dosesSemanais: [
      { semana: 1, doseMg: 2.5, observacao: '' },
      { semana: 2, doseMg: 0, observacao: '' },
      { semana: 3, doseMg: 5, observacao: '' },
      { semana: 4, doseMg: 0, observacao: '' },
    ],
    aplicacoesTotal: 0,
    aplicacoesFrequencia: 'Semanal',
    custoPorKit: 20,
    consultas: 0,
    consultasFrequencia: 'Conforme plano',
    consultasValorUnitario: 300,
    consultasValorTotalManual: null,
    bioimpedancias: 0,
    bioFrequencia: 'Quinzenal',
    bioValorUnitario: 150,
    bioValorTotalManual: null,
    exames: 0,
    examesDescricao: '',
    examesValorUnitario: 300,
    examesValorTotalManual: null,
    protocolosInjetaveis: [],
    consolidacaoHabilitada: false,
    consolidacaoSemanas: 0,
    estrategiaPosMeta: 'nao_definido',
    consolidacaoObservacao: '',
    investimento: investimentoVazio(0, 48),
    observacoes: '',
    descontoManual: 0,
    parcelamento: null,
    ...patch,
  };
}

describe('normalizarParametrosNegociacaoSalvos', () => {
  it('preserva dose 0 e quantidades zeradas em vez de preencher com o padrão', () => {
    const n = normalizarParametrosNegociacaoSalvos(parcial({}));
    expect(n?.dosesSemanais.map((d) => d.doseMg)).toEqual([2.5, 0, 5, 0]);
    expect(n?.aplicacoesTotal).toBe(0);
    expect(n?.bioimpedancias).toBe(0);
    expect(n?.consultas).toBe(0);
    expect(n?.exames).toBe(0);
  });

  it('reconstrói doses só quando a lista veio vazia', () => {
    const n = normalizarParametrosNegociacaoSalvos(
      parcial({ dosesSemanais: [], semanasPrazo: 3, doseMensalMg: 2.5 })
    );
    expect(n?.dosesSemanais).toHaveLength(3);
    expect(n?.dosesSemanais.every((d) => d.doseMg === 2.5)).toBe(true);
  });
});
