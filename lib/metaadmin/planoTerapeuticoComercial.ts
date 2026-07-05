import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type {
  DescontoVolumeMg,
  OrcamentoTerapeuticoConfig,
} from '@/types/orcamentoTerapeuticoConfig';
import type { ComposicaoPlanoComercial } from '@/types/planoTerapeuticoInterativo';

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export const DESCONTOS_VOLUME_MG_PADRAO: DescontoVolumeMg[] = [
  { minMg: 0, descontoPercentual: 0 },
  { minMg: 80, descontoPercentual: 5 },
  { minMg: 120, descontoPercentual: 8 },
  { minMg: 160, descontoPercentual: 10 },
];

export function resolverDescontoPercentualPorVolumeMg(
  mgEstimado: number,
  faixas: DescontoVolumeMg[]
): number {
  if (!Number.isFinite(mgEstimado) || mgEstimado <= 0) return 0;
  const ordenadas = [...faixas].sort((a, b) => b.minMg - a.minMg);
  const faixa = ordenadas.find((f) => mgEstimado >= f.minMg);
  return faixa?.descontoPercentual ?? 0;
}

/**
 * Cálculo comercial do plano interativo — inclui desconto por volume de mg.
 * Não altera `calcularComposicaoDesdeConfig` do orçamento interno.
 */
export function calcularComposicaoPlanoInterativo(
  estimativa: EstimativaPlanoInicialV1,
  config: Pick<
    OrcamentoTerapeuticoConfig,
    | 'valorPorMg'
    | 'valorPorKitAplicacao'
    | 'valorPorConsulta'
    | 'valorPorBioimpedancia'
    | 'valorPorExame'
    | 'outrosCustosPadrao'
    | 'margemPadraoPercentual'
    | 'descontosPorVolumeMg'
  >,
  descontoManual = 0
): ComposicaoPlanoComercial {
  const mg = Math.max(0, estimativa.quantidadeMedicacaoMg);
  const custoMedicacaoBruto = arredondarMoeda(mg * config.valorPorMg);
  const descontoMedicacaoVolumePercentual = resolverDescontoPercentualPorVolumeMg(
    mg,
    config.descontosPorVolumeMg
  );
  const descontoMedicacaoVolume = arredondarMoeda(
    custoMedicacaoBruto * (descontoMedicacaoVolumePercentual / 100)
  );
  const custoMedicacaoLiquido = arredondarMoeda(
    custoMedicacaoBruto - descontoMedicacaoVolume
  );

  const custoKits = arredondarMoeda(
    estimativa.numeroAplicacoes * config.valorPorKitAplicacao
  );
  const consultasAcompanhamento = arredondarMoeda(
    estimativa.consultasIncluidas * config.valorPorConsulta
  );
  const bioimpedancia = arredondarMoeda(
    estimativa.bioimpedanciasIncluidas * config.valorPorBioimpedancia
  );
  const exames = arredondarMoeda(estimativa.examesIncluidos * config.valorPorExame);
  const outrosCustos = arredondarMoeda(config.outrosCustosPadrao);

  const subtotal = arredondarMoeda(
    custoMedicacaoLiquido +
      custoKits +
      consultasAcompanhamento +
      bioimpedancia +
      exames +
      outrosCustos
  );
  // valorPorMg já reflete o preço final — sem margem adicional.
  const margem = 0;

  return {
    custoMedicacaoBruto,
    descontoMedicacaoVolume,
    descontoMedicacaoVolumePercentual,
    custoMedicacaoLiquido,
    custoKits,
    consultasAcompanhamento,
    bioimpedancia,
    exames,
    outrosCustos,
    subtotal,
    margem,
    descontoManual: arredondarMoeda(Math.max(0, descontoManual)),
  };
}

export function calcularValorTotalPlanoInterativo(
  composicao: ComposicaoPlanoComercial
): number {
  return arredondarMoeda(
    composicao.subtotal + composicao.margem - composicao.descontoManual
  );
}
