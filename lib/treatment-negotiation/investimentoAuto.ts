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

/** Estimativa comercial única da mesa e da página do paciente. */
export function montarEstimativaNegociada(
  parametros: ParametrosPlanoPersonalizadoEditavel
): EstimativaPlanoInicialV1 {
  const semanas = Math.max(1, parametros.semanasPrazo);
  return {
    duracaoMeses: Math.max(1, parametros.mesesPrazo > 0 ? parametros.mesesPrazo : Math.ceil(semanas / 4)),
    duracaoSemanas: semanas,
    numeroAplicacoes: Math.max(0, parametros.aplicacoesTotal),
    quantidadeMedicacaoMg: totalMgDoses(parametros),
    consultasIncluidas: Math.max(0, parametros.consultas),
    bioimpedanciasIncluidas: Math.max(0, parametros.bioimpedancias),
    examesIncluidos: Math.max(0, parametros.exames),
    nomePlanoSugerido: parametros.nomePlano || 'Plano personalizado',
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

function sincronizarParametrosParaCalculo(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): ParametrosPlanoPersonalizadoEditavel {
  return sincronizarInvestimentoNegociado(
    sincronizarQuantidadesPorFrequencia(parametros),
    config
  );
}

function valorTotalDeParametros(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  const estimativa = montarEstimativaNegociada(parametros);
  const { valorTotal } = montarComposicaoNegociada({
    estimativa,
    config,
    parametros,
    modoRecalculo: 'manter_manuais',
  });
  return valorTotal;
}

export function prepararParametrosNegociado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): ParametrosPlanoPersonalizadoEditavel {
  const sincronizado = sincronizarParametrosParaCalculo(
    {
      ...parametros,
      protocolosInjetaveis: parametros.protocolosInjetaveis ?? [],
    },
    config
  );

  const locked = sincronizado.investimento.valorFinalManual;
  if (locked == null) return sincronizado;

  const baseSemOverride: ParametrosPlanoPersonalizadoEditavel = {
    ...sincronizado,
    descontoManual: 0,
    investimento: {
      ...sincronizado.investimento,
      valorFinalManual: null,
      descontoReais: 0,
      descontoPercentual: 0,
    },
  };
  const baseSemOverrideValor = valorTotalDeParametros(baseSemOverride, config);
  const medOnly = sincronizado.investimento.valorMedicacao ?? 0;

  // Override antigo travado só na medicação (ex.: blur no campo) — libera para somar o restante.
  if (Math.abs(locked - medOnly) < 0.5 && baseSemOverrideValor > medOnly + 0.5) {
    return {
      ...sincronizado,
      descontoManual: 0,
      investimento: {
        ...sincronizado.investimento,
        valorFinalManual: null,
        descontoReais: 0,
      },
    };
  }

  return sincronizado;
}

export function calcularValorFinalNegociado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  return valorTotalDeParametros(prepararParametrosNegociado(parametros, config), config);
}

/** Valor final calculado sem override manual nem desconto (base para desconto). */
export function calcularValorFinalBaseNegociado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  config: OrcamentoTerapeuticoConfig
): number {
  const sincronizado = sincronizarParametrosParaCalculo(parametros, config);
  const semDesconto: ParametrosPlanoPersonalizadoEditavel = {
    ...sincronizado,
    descontoManual: 0,
    investimento: {
      ...sincronizado.investimento,
      valorFinalManual: null,
      descontoReais: 0,
      descontoPercentual: 0,
    },
  };
  return valorTotalDeParametros(semDesconto, config);
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
