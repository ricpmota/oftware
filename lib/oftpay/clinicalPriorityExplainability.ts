import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { ClinicalPriorityAssessment } from '@/lib/oftpay/clinicalPriorityAssessment';
import type { IntegratedCaseSummary } from '@/lib/oftpay/integratedCaseSummary';
import type { RefinementDelta } from '@/lib/oftpay/refinementDelta';

export type ClinicalPriorityImpactDirection =
  | 'raises_priority'
  | 'reduces_priority'
  | 'adds_uncertainty'
  | 'supports_stability';

export type ClinicalPriorityExplainabilityItem = {
  context: string;
  direction: ClinicalPriorityImpactDirection;
  message: string;
};

export type ClinicalPriorityExplainability = {
  topDrivers: ClinicalPriorityExplainabilityItem[];
  increasedPriorityFactors: string[];
  reducedPriorityFactors: string[];
  uncertaintyFactors: string[];
  dominantContexts: string[];
};

function hasPattern(text: string, regex: RegExp): boolean {
  return regex.test(text);
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

export function hasMeaningfulClinicalPriorityExplainability(
  explainability: ClinicalPriorityExplainability | null | undefined
): boolean {
  if (!explainability) return false;
  return (
    explainability.topDrivers.length > 0 ||
    explainability.increasedPriorityFactors.length > 0 ||
    explainability.reducedPriorityFactors.length > 0 ||
    explainability.uncertaintyFactors.length > 0
  );
}

export function buildClinicalPriorityExplainability(params: {
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  integratedCaseSummary?: IntegratedCaseSummary | null;
  refinementDelta?: RefinementDelta | null;
  followUpAnswers?: ClinicalFollowUpAnswer[];
  clinicalPriorityAssessment?: ClinicalPriorityAssessment | null;
}): ClinicalPriorityExplainability {
  const quality = params.qualityContext ?? '';
  const binocular = params.binocularContext ?? '';
  const temporal = params.temporalContext ?? '';
  const summary = params.integratedCaseSummary;
  const delta = params.refinementDelta;
  const assessment = params.clinicalPriorityAssessment;
  const answeredCount = (params.followUpAnswers ?? []).filter(
    (a) => typeof a.answer === 'string' && a.answer.trim()
  ).length;

  const topDrivers: ClinicalPriorityExplainabilityItem[] = [];
  const increasedPriorityFactors: string[] = [];
  const reducedPriorityFactors: string[] = [];
  const uncertaintyFactors: string[] = [];
  const dominantContexts: string[] = [];

  const addDriver = (
    context: string,
    direction: ClinicalPriorityImpactDirection,
    message: string
  ) => {
    topDrivers.push({ context, direction, message });
    pushUnique(dominantContexts, context);
    if (direction === 'raises_priority') pushUnique(increasedPriorityFactors, message);
    if (direction === 'reduces_priority' || direction === 'supports_stability') {
      pushUnique(reducedPriorityFactors, message);
    }
    if (direction === 'adds_uncertainty') pushUnique(uncertaintyFactors, message);
  };

  if (hasPattern(temporal, /possible_progression/i)) {
    addDriver(
      'temporal',
      'raises_priority',
      'Comparação temporal sugeriu possível progressão no mesmo olho/modalidade.'
    );
  } else if (hasPattern(temporal, /status:\s*stable/i)) {
    addDriver(
      'temporal',
      'supports_stability',
      'Comparação temporal sem mudança relevante sustentou estabilidade.'
    );
  } else if (hasPattern(temporal, /insufficient_data/i)) {
    addDriver(
      'temporal',
      'adds_uncertainty',
      'Temporalidade insuficiente para concluir tendência evolutiva.'
    );
  }

  if (hasPattern(binocular, /marked_asymmetry/i)) {
    addDriver(
      'binocular',
      'raises_priority',
      'Assimetria binocular marcada elevou cautela clínica.'
    );
  } else if (hasPattern(binocular, /mild_asymmetry/i)) {
    addDriver(
      'binocular',
      'raises_priority',
      'Assimetria binocular leve/moderada contribuiu para atenção adicional.'
    );
  } else if (hasPattern(binocular, /status:\s*(symmetric|compatible|no_relevant_asymmetry)/i)) {
    addDriver(
      'binocular',
      'reduces_priority',
      'Sem assimetria binocular relevante, reduzindo preocupação imediata.'
    );
  }

  if (hasPattern(quality, /status_revisao:\s*review|possible_ocr_issue|limited_interpretability/i)) {
    addDriver(
      'quality',
      'adds_uncertainty',
      'Limitações de qualidade/extração aumentaram a incerteza da priorização.'
    );
  } else if (hasPattern(quality, /checklist_status:\s*partial|status_revisao:\s*attention/i)) {
    addDriver(
      'quality',
      'adds_uncertainty',
      'Cobertura parcial ou revisão em atenção limitou confiança plena.'
    );
  } else if (hasPattern(quality, /checklist_status:\s*good|status_revisao:\s*ok/i)) {
    addDriver(
      'quality',
      'supports_stability',
      'Qualidade/cobertura adequada sustentou leitura mais estável.'
    );
  }

  if (delta?.keyChanges?.length) {
    addDriver(
      'refinement_delta',
      'raises_priority',
      'Refinamento com respostas clínicas reforçou fatores de maior atenção.'
    );
  } else if (delta?.reducedLikelihoods?.length) {
    addDriver(
      'refinement_delta',
      'reduces_priority',
      'Refinamento reduziu peso de hipóteses previamente mais preocupantes.'
    );
  }

  if (answeredCount > 0) {
    addDriver(
      'follow_up_answers',
      'raises_priority',
      `${answeredCount} resposta(s) clínica(s) adicional(is) influenciaram a priorização.`
    );
  }

  if (summary?.remainingUncertainties?.length) {
    addDriver(
      'integrated_summary',
      'adds_uncertainty',
      'Síntese integradora manteve incertezas clínicas relevantes.'
    );
  }

  if (
    topDrivers.length === 0 &&
    assessment?.level === 'routine'
  ) {
    addDriver(
      'overall_context',
      'supports_stability',
      'Ausência de sinais fortes de progressão/assimetria sustentou prioridade de rotina.'
    );
  }

  return {
    topDrivers: topDrivers.slice(0, 4),
    increasedPriorityFactors: increasedPriorityFactors.slice(0, 4),
    reducedPriorityFactors: reducedPriorityFactors.slice(0, 4),
    uncertaintyFactors: uncertaintyFactors.slice(0, 4),
    dominantContexts: dominantContexts.slice(0, 5),
  };
}
