/**
 * Recalcula o Plano Personalizado negociado usando o motor comercial e visual existente.
 * Não invoca OI nem motor-personalizado — depende apenas dos parâmetros editados pelo médico.
 */
import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { calcularHorizonteAtualFasePerda } from '@/lib/treatment-designer/horizontePlano';
import {
  calcularMarcosClinicosPorRitmo,
  semanaMetaAtingidaPorRitmo,
} from '@/lib/treatment-designer/marcosClinicosEsperados';
import { gerarMarcadoresTimeline } from '@/lib/treatment-designer/planoVisuais';
import type {
  FaseTratamentoSegmento,
  PlanoTratamentoUnificado,
} from '@/lib/treatment-designer/types';
import {
  calcularSemanaMetaComDose,
  gerarCurvaPesoComManutencao,
  montarFasesVisuaisPlano,
} from '@/lib/planoTerapeutico/curvaPesoPlano';
import { clampMetaPersonalizada, doseMensalInicial } from '@/lib/planoTerapeutico/modalidadesPlano';
import { PERDA_SEMANAL_MEDIA_KG } from '@/lib/planoTerapeutico/escadinhaDose';
import { resolverMetaPerdaComLimite } from '@/lib/planoTerapeutico/limitePerdaPonderal';
import { estimarPerdaPrevistaPacote } from '@/lib/planoTerapeutico/perdaPesoPacote';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import { montarComposicaoNegociada } from '@/lib/treatment-negotiation/composicaoManual';
import { dosesSemanaisParaNumeros } from '@/lib/treatment-negotiation/parametrosDefaults';
import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';

function somaDoses(doses: number[]): number {
  return Math.round(doses.reduce((s, d) => s + d, 0) * 10) / 10;
}

function montarFasesComConsolidacao(
  semanas: number,
  semanaMeta: number,
  parametros: ParametrosPlanoPersonalizadoEditavel
): FaseTratamentoSegmento[] {
  const totalComConsolidacao = parametros.consolidacaoHabilitada
    ? semanas + Math.max(0, parametros.consolidacaoSemanas)
    : semanas;

  const fases = montarFasesVisuaisPlano(totalComConsolidacao, semanaMeta);

  if (!parametros.consolidacaoHabilitada || parametros.consolidacaoSemanas <= 0) {
    return fases;
  }

  const rotuloPosMeta =
    parametros.estrategiaPosMeta === 'manutencao'
      ? 'Manutenção'
      : parametros.estrategiaPosMeta === 'reducao_gradual'
        ? 'Redução gradual'
        : parametros.estrategiaPosMeta === 'continuidade'
          ? 'Continuidade'
          : 'Pós-meta';

  const inicioConsolidacao = semanas;
  const fimConsolidacao = semanas + parametros.consolidacaoSemanas;

  const semConsolidacao = fases.filter((f) => f.id !== 'consolidacao' && f.id !== 'pos_meta');
  return [
    ...semConsolidacao,
    {
      id: 'consolidacao',
      rotulo: 'Consolidação',
      semanaInicio: inicioConsolidacao,
      semanaFim: fimConsolidacao,
      duracaoSemanas: parametros.consolidacaoSemanas,
    },
    {
      id: 'pos_meta',
      rotulo: rotuloPosMeta,
      semanaInicio: fimConsolidacao,
      semanaFim: fimConsolidacao,
      duracaoSemanas: 0,
    },
  ];
}

export type RecalcularPlanoNegociadoInput = {
  parametros: ParametrosPlanoPersonalizadoEditavel;
  configuracaoComercial: OrcamentoTerapeuticoConfig;
  pesoAtual: number | null;
  metaPercentual: number | null;
};

/**
 * Recalcula gráfico, cronograma, investimento, resumo e marcos a partir dos parâmetros editáveis.
 */
export function recalcularPlanoNegociado(
  input: RecalcularPlanoNegociadoInput
): PlanoTratamentoUnificado {
  const { parametros, configuracaoComercial, pesoAtual, metaPercentual } = input;

  const dosesNumeros = dosesSemanaisParaNumeros(parametros.dosesSemanais);
  const semanas = Math.max(1, parametros.semanasPrazo || dosesNumeros.length);
  const meses = Math.max(
    1,
    parametros.mesesPrazo > 0 ? parametros.mesesPrazo : Math.ceil(semanas / 4)
  );
  const metaPacienteSlider = clampMetaPersonalizada(parametros.metaKg);
  const dosesSemanais =
    dosesNumeros.length > 0
      ? dosesNumeros
      : Array.from({ length: semanas }, () => parametros.doseMensalMg);

  const mgTotal = somaDoses(dosesSemanais);
  const dose =
    parametros.doseMensalMg > 0
      ? parametros.doseMensalMg
      : doseMensalInicial(configuracaoComercial);

  const estimativa: EstimativaPlanoInicialV1 = {
    duracaoMeses: meses,
    duracaoSemanas: semanas,
    numeroAplicacoes: Math.max(0, parametros.aplicacoesTotal || semanas),
    quantidadeMedicacaoMg: mgTotal,
    consultasIncluidas: Math.max(0, parametros.consultas),
    bioimpedanciasIncluidas: Math.max(0, parametros.bioimpedancias),
    examesIncluidos: Math.max(0, parametros.exames),
    nomePlanoSugerido: parametros.nomePlano || 'Plano personalizado',
    origemEstimativa: 'v2_deterministica',
  };

  const pesoInicio = parametros.pesoAtualKg ?? pesoAtual ?? 80;
  const pct = parametros.percentualEstimado ?? metaPercentual;

  const metaResolvida = resolverMetaPerdaComLimite(pesoInicio, metaPacienteSlider, pct);

  const marcosInput = {
    pesoInicialKg: pesoInicio,
    metaKg: metaResolvida.perdaEfetivaKg,
    metaPercentual: metaResolvida.perdaEfetivaPercentual,
  };
  const marcosClinicos = calcularMarcosClinicosPorRitmo(marcosInput, parametros.ritmoEscalonamento);
  const semanaMetaBase = semanaMetaAtingidaPorRitmo(marcosInput, parametros.ritmoEscalonamento);
  const doseRef = doseMensalInicial(configuracaoComercial);
  const semanaMeta = calcularSemanaMetaComDose(
    metaResolvida.perdaEfetivaKg,
    semanaMetaBase,
    dose,
    doseRef,
    semanas
  );

  const curvaPeso = gerarCurvaPesoComManutencao(
    pesoInicio,
    metaResolvida.perdaEfetivaKg,
    semanas,
    semanaMeta
  );
  const horizonte = calcularHorizonteAtualFasePerda(
    parametros.consolidacaoHabilitada
      ? semanas + parametros.consolidacaoSemanas
      : semanas
  );

  const { composicao, valorTotal } = montarComposicaoNegociada({
    estimativa,
    config: configuracaoComercial,
    parametros,
    modoRecalculo: parametros.modoRecalculo,
  });

  const perda = estimarPerdaPrevistaPacote({
    modalidade: 'personalizado',
    duracaoSemanas: semanas,
    pesoAtualKg: pesoInicio,
    metaPacienteKg: metaPacienteSlider,
    metaPercentual: pct,
  });

  const fases = montarFasesComConsolidacao(semanas, semanaMeta, parametros);

  return {
    estimativa,
    perdaSemanalKg: PERDA_SEMANAL_MEDIA_KG,
    valorTotal,
    composicao,
    curvaPeso,
    dosesSemanais,
    marcadores: gerarMarcadoresTimeline(estimativa),
    guardrailAplicado: false,
    mensagemGuardrail: undefined,
    semanaMetaAtingida: semanaMeta,
    semanaFimHorizonteVisual: horizonte.semanaFimHorizonteVisual,
    marcosClinicos,
    fases,
    perdaPrevistaKg: metaResolvida.perdaEfetivaKg,
    metaPacienteKg: perda.metaPacienteKg,
    metaSuperiorAoPrevisto: perda.metaSuperiorAoPrevisto,
    usaMetaPacienteNaCurva: true,
  };
}
