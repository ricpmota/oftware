import {
  calcularComposicaoPlanoInterativo,
  calcularValorTotalPlanoInterativo,
} from '@/lib/metaadmin/planoTerapeuticoComercial';
import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import type { ComposicaoPlanoComercial } from '@/types/planoTerapeuticoInterativo';
import type {
  ModoRecalculoNegociacao,
  ParametrosPlanoPersonalizadoEditavel,
} from '@/lib/treatment-negotiation/types';

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function valorOuCalculado(manual: number | null, calculado: number): number {
  return manual != null && manual >= 0 ? manual : calculado;
}

export function montarComposicaoNegociada(args: {
  estimativa: EstimativaPlanoInicialV1;
  config: OrcamentoTerapeuticoConfig;
  parametros: ParametrosPlanoPersonalizadoEditavel;
  modoRecalculo: ModoRecalculoNegociacao;
}): { composicao: ComposicaoPlanoComercial; valorTotal: number } {
  const { estimativa, config, parametros, modoRecalculo } = args;
  const inv = parametros.investimento;
  const descontoReais =
    inv.descontoReais > 0 ? inv.descontoReais : parametros.descontoManual;

  const auto = calcularComposicaoPlanoInterativo(
    estimativa,
    config,
    descontoReais
  );

  const usarManuais =
    modoRecalculo === 'manter_manuais' ||
    inv.valorPorMg != null ||
    inv.valorMedicacao != null ||
    inv.valorConsultas != null ||
    inv.valorBioimpedancias != null ||
    inv.valorExames != null ||
    inv.outrosCustos != null ||
    inv.margem != null ||
    parametros.consultasValorTotalManual != null ||
    parametros.bioValorTotalManual != null ||
    parametros.examesValorTotalManual != null;

  let composicao = auto;

  if (usarManuais) {
    const consultasCalc = estimativa.consultasIncluidas * config.valorPorConsulta;
    const bioCalc = estimativa.bioimpedanciasIncluidas * config.valorPorBioimpedancia;
    const examesCalc = estimativa.examesIncluidos * config.valorPorExame;

    const consultasAcompanhamento = arredondarMoeda(
      valorOuCalculado(
        parametros.consultasValorTotalManual ?? inv.valorConsultas,
        consultasCalc
      )
    );
    const bioimpedancia = arredondarMoeda(
      valorOuCalculado(parametros.bioValorTotalManual ?? inv.valorBioimpedancias, bioCalc)
    );
    const exames = arredondarMoeda(
      valorOuCalculado(parametros.examesValorTotalManual ?? inv.valorExames, examesCalc)
    );

    const custoMedicacaoLiquido = arredondarMoeda(
      valorOuCalculado(inv.valorMedicacao, auto.custoMedicacaoLiquido)
    );
    const custoKits = arredondarMoeda(
      estimativa.numeroAplicacoes *
        (parametros.custoPorKit ?? config.valorPorKitAplicacao)
    );
    const outrosCustos = arredondarMoeda(
      valorOuCalculado(inv.outrosCustos, auto.outrosCustos)
    );

    const subtotal = arredondarMoeda(
      custoMedicacaoLiquido + custoKits + consultasAcompanhamento + bioimpedancia + exames + outrosCustos
    );
    const margem = arredondarMoeda(
      valorOuCalculado(
        inv.margem,
        auto.margem
      )
    );

    let descontoManual = descontoReais;
    if (inv.descontoPercentual > 0) {
      descontoManual = arredondarMoeda(
        descontoManual + (subtotal + margem) * (inv.descontoPercentual / 100)
      );
    }

    composicao = {
      ...auto,
      custoMedicacaoLiquido,
      custoKits,
      consultasAcompanhamento,
      bioimpedancia,
      exames,
      outrosCustos,
      subtotal,
      margem,
      descontoManual,
    };
  }

  let valorTotal = calcularValorTotalPlanoInterativo(composicao);

  if (inv.valorFinalManual != null && inv.valorFinalManual >= 0) {
    valorTotal = arredondarMoeda(inv.valorFinalManual);
  }

  return { composicao, valorTotal };
}
