import { describe, expect, it } from 'vitest';
import { criarValoresPadraoConfigOrcamento } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { montarComposicaoNegociada } from '@/lib/treatment-negotiation/composicaoManual';
import { montarEstimativaNegociada } from '@/lib/treatment-negotiation/investimentoAuto';
import { investimentoVazio } from '@/lib/treatment-negotiation/parametrosDefaults';
import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';

function configBase(): OrcamentoTerapeuticoConfig {
  return {
    medicoId: 'med-1',
    ...criarValoresPadraoConfigOrcamento(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function parametrosBase(
  patch: Partial<ParametrosPlanoPersonalizadoEditavel> = {}
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
    semanasPrazo: 24,
    mesesPrazo: 6,
    dataInicioEstimada: null,
    dataTerminoEstimada: null,
    doseMensalMg: 2.5,
    ritmoEscalonamento: 'lento',
    dosesSemanais: Array.from({ length: 24 }, (_, i) => ({
      semana: i + 1,
      doseMg: 10,
      observacao: '',
    })),
    aplicacoesTotal: 24,
    aplicacoesFrequencia: 'Semanal',
    custoPorKit: 20,
    consultas: 6,
    consultasFrequencia: 'Conforme plano',
    consultasValorUnitario: 300,
    consultasValorTotalManual: null,
    bioimpedancias: 3,
    bioFrequencia: 'Semanal',
    bioValorUnitario: 150,
    bioValorTotalManual: null,
    exames: 2,
    examesDescricao: '',
    examesValorUnitario: 300,
    examesValorTotalManual: null,
    protocolosInjetaveis: [],
    consolidacaoHabilitada: false,
    consolidacaoSemanas: 0,
    estrategiaPosMeta: 'nao_definido',
    consolidacaoObservacao: '',
    investimento: {
      ...investimentoVazio(0, 48),
      valorPorMg: 48,
      valorMedicacao: 48 * 240,
    },
    observacoes: '',
    descontoManual: 0,
    parcelamento: null,
    ...patch,
  };
}

const estimativa: EstimativaPlanoInicialV1 = {
  duracaoMeses: 6,
  duracaoSemanas: 24,
  numeroAplicacoes: 24,
  quantidadeMedicacaoMg: 240,
  consultasIncluidas: 6,
  bioimpedanciasIncluidas: 3,
  examesIncluidos: 2,
  nomePlanoSugerido: 'Personalizado',
  origemEstimativa: 'v2_deterministica',
};

describe('montarComposicaoNegociada', () => {
  it('cobra medicação pelo R$/mg negociado, sem desconto por volume', () => {
    const config = configBase();
    const mg = 240;
    const valorPorMg = 48;
    const { composicao, valorTotal } = montarComposicaoNegociada({
      estimativa: { ...estimativa, quantidadeMedicacaoMg: mg },
      config,
      parametros: parametrosBase({
        investimento: {
          ...investimentoVazio(0, valorPorMg),
          valorPorMg,
          valorMedicacao: valorPorMg * mg,
        },
      }),
      modoRecalculo: 'manter_manuais',
    });

    expect(composicao.custoMedicacaoLiquido).toBe(valorPorMg * mg);
    expect(composicao.descontoMedicacaoVolume).toBe(0);
    expect(composicao.descontoMedicacaoVolumePercentual).toBe(0);
    expect(valorTotal).toBeGreaterThan(composicao.custoMedicacaoLiquido);
  });

  it('soma injetáveis no total sem alterar a linha de medicação', () => {
    const config = configBase();
    const valorMedicacao = 48 * 240;
    const { composicao } = montarComposicaoNegociada({
      estimativa,
      config,
      parametros: parametrosBase({
        protocolosInjetaveis: [
          {
            id: 'p1',
            protocoloId: 'nad',
            protocoloNome: 'NAD',
            itens: [],
            semanas: 4,
            semanasAplicacao: [1, 2, 3, 4],
            observacoesPorSemana: {},
            valorUnitario: 100,
            valorTotalManual: null,
          },
        ],
        investimento: {
          ...investimentoVazio(0, 48),
          valorPorMg: 48,
          valorMedicacao,
        },
      }),
      modoRecalculo: 'manter_manuais',
    });

    expect(composicao.custoMedicacaoLiquido).toBe(valorMedicacao);
    expect(composicao.custoInjetaveis).toBe(400);
  });

  it('não cobra kits quando o plano tem zero aplicações', () => {
    const config = configBase();
    const parametros = parametrosBase({ aplicacoesTotal: 0, semanasPrazo: 12 });
    const estimativa = montarEstimativaNegociada(parametros);
    expect(estimativa.numeroAplicacoes).toBe(0);
    const { composicao } = montarComposicaoNegociada({
      estimativa,
      config,
      parametros,
      modoRecalculo: 'manter_manuais',
    });
    expect(composicao.custoKits).toBe(0);
  });
});
