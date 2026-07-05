import { montarComposicaoNegociada } from '@/lib/treatment-negotiation/composicaoManual';
import { dosesSemanaisParaNumeros } from '@/lib/treatment-negotiation/parametrosDefaults';
import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';
import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function totalMgDoses(parametros: ParametrosPlanoPersonalizadoEditavel): number {
  return Math.round(
    dosesSemanaisParaNumeros(parametros.dosesSemanais).reduce((s, d) => s + d, 0) * 10
  ) / 10;
}

export function custoKitsNegociado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  const unit = parametros.custoPorKit ?? config.valorPorKitAplicacao;
  return arredondarMoeda(Math.max(0, parametros.aplicacoesTotal) * unit);
}

export function calcularTotalBio(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  const unit = parametros.bioValorUnitario ?? config.valorPorBioimpedancia;
  return arredondarMoeda(Math.max(0, parametros.bioimpedancias) * unit);
}

export function calcularTotalExames(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  const unit = parametros.examesValorUnitario ?? config.valorPorExame;
  return arredondarMoeda(Math.max(0, parametros.exames) * unit);
}

export function calcularTotalConsultas(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  const unit = parametros.consultasValorUnitario ?? config.valorPorConsulta;
  return arredondarMoeda(Math.max(0, parametros.consultas) * unit);
}

function montarEstimativaInvestimento(
  parametros: ParametrosPlanoPersonalizadoEditavel
): EstimativaPlanoInicialV1 {
  const semanas = Math.max(1, parametros.semanasPrazo);
  return {
    duracaoMeses: Math.max(1, parametros.mesesPrazo),
    duracaoSemanas: semanas,
    numeroAplicacoes: Math.max(0, parametros.aplicacoesTotal),
    quantidadeMedicacaoMg: totalMgDoses(parametros),
    consultasIncluidas: Math.max(0, parametros.consultas),
    bioimpedanciasIncluidas: Math.max(0, parametros.bioimpedancias),
    examesIncluidos: Math.max(0, parametros.exames),
    nomePlanoSugerido: parametros.nomePlano,
    origemEstimativa: 'v2_deterministica',
  };
}

function frequenciaSemanal(frequencia: string): boolean {
  return /seman/i.test(frequencia);
}

/** Bio semanal acompanha o número de semanas do plano. */
export function sincronizarQuantidadesPorFrequencia(
  parametros: ParametrosPlanoPersonalizadoEditavel
): ParametrosPlanoPersonalizadoEditavel {
  const semanas = Math.max(1, parametros.semanasPrazo);
  if (!frequenciaSemanal(parametros.bioFrequencia)) return parametros;
  return {
    ...parametros,
    bioimpedancias: semanas,
  };
}

/** Atualiza linhas de investimento conforme itens do plano (R$/mg, quantidades, etc.). */
export function sincronizarInvestimentoNegociado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): ParametrosPlanoPersonalizadoEditavel {
  const inv = { ...parametros.investimento };
  const mgTotal = totalMgDoses(parametros);

  const valorPorMg = inv.valorPorMg ?? config.valorPorMg;
  inv.valorPorMg = valorPorMg;
  inv.valorMedicacao = arredondarMoeda(valorPorMg * mgTotal);

  inv.valorConsultas = arredondarMoeda(
    parametros.consultasValorTotalManual ?? calcularTotalConsultas(parametros, config)
  );
  inv.valorBioimpedancias = arredondarMoeda(
    parametros.bioValorTotalManual ?? calcularTotalBio(parametros, config)
  );
  inv.valorExames = arredondarMoeda(
    parametros.examesValorTotalManual ?? calcularTotalExames(parametros, config)
  );

  if (inv.outrosCustos == null) {
    inv.outrosCustos = config.outrosCustosPadrao;
  }

  return {
    ...parametros,
    investimento: inv,
  };
}

export function prepararParametrosNegociado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): ParametrosPlanoPersonalizadoEditavel {
  return sincronizarInvestimentoNegociado(sincronizarQuantidadesPorFrequencia(parametros), config);
}

export function calcularValorFinalNegociado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  const sincronizado = prepararParametrosNegociado(parametros, config);
  const estimativa = montarEstimativaInvestimento(sincronizado);
  const { valorTotal } = montarComposicaoNegociada({
    estimativa,
    config,
    parametros: sincronizado,
    modoRecalculo: 'manter_manuais',
  });
  return valorTotal;
}

/** Valor final calculado sem override manual nem desconto (base para desconto). */
export function calcularValorFinalBaseNegociado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  const base = prepararParametrosNegociado(parametros, config);
  const semDesconto: ParametrosPlanoPersonalizadoEditavel = {
    ...base,
    descontoManual: 0,
    investimento: {
      ...base.investimento,
      valorFinalManual: null,
      descontoReais: 0,
      descontoPercentual: 0,
    },
  };
  return calcularValorFinalNegociado(semDesconto, config);
}

export function descontoPorValorFinalManual(
  valorFinalManual: number,
  valorBase: number
): number {
  if (valorFinalManual < valorBase - 0.009) {
    return arredondarMoeda(valorBase - valorFinalManual);
  }
  return 0;
}
