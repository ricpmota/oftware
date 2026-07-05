import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { IntegratedCaseSummary } from '@/lib/oftpay/integratedCaseSummary';
import type { RefinementDelta } from '@/lib/oftpay/refinementDelta';

export type ClinicalPriorityLevel = 'routine' | 'attention' | 'priority' | 'indeterminate';

export type ClinicalPriorityAssessment = {
  level: ClinicalPriorityLevel;
  label: string;
  summary: string;
  mainReasons: string[];
  recommendedAction: string;
  limitations: string[];
};

export function getClinicalPriorityLabel(level: ClinicalPriorityLevel): string {
  if (level === 'routine') return 'Rotina';
  if (level === 'attention') return 'Atenção';
  if (level === 'priority') return 'Prioritário';
  return 'Indeterminado';
}

export function hasMeaningfulClinicalPriority(
  assessment: ClinicalPriorityAssessment | null | undefined
): boolean {
  return !!assessment && !!assessment.level;
}

function hasPattern(text: string, regex: RegExp): boolean {
  return regex.test(text);
}

export function buildClinicalPriorityAssessment(params: {
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  integratedCaseSummary?: IntegratedCaseSummary | null;
  refinementDelta?: RefinementDelta | null;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): ClinicalPriorityAssessment {
  const quality = params.qualityContext ?? '';
  const binocular = params.binocularContext ?? '';
  const temporal = params.temporalContext ?? '';
  const summary = params.integratedCaseSummary;
  const delta = params.refinementDelta;
  const answeredCount = (params.followUpAnswers ?? []).filter(
    (a) => typeof a.answer === 'string' && a.answer.trim()
  ).length;

  const reasons: string[] = [];
  const limitations: string[] = [];

  const weakData =
    hasPattern(quality, /(status_revisao:\s*review|possible_ocr_issue|limited_interpretability)/i) ||
    hasPattern(quality, /checklist_status:\s*weak/i);
  const temporalProgression = hasPattern(temporal, /possible_progression/i);
  const markedAsymmetry = hasPattern(binocular, /marked_asymmetry/i);
  const mildAsymmetry = hasPattern(binocular, /mild_asymmetry/i);
  const partialCoverage = hasPattern(quality, /checklist_status:\s*partial/i);
  const attentionQuality = hasPattern(quality, /status_revisao:\s*attention/i);

  if (weakData) {
    reasons.push('Dados com limitação relevante de qualidade/cobertura.');
    limitations.push('Confiabilidade reduzida para estratificação clínica segura.');
  }

  if (temporalProgression) {
    reasons.push('Comparação temporal sugere possível progressão no mesmo olho/modalidade.');
  }
  if (markedAsymmetry) {
    reasons.push('Assimetria binocular marcada aumenta a preocupação clínica.');
  } else if (mildAsymmetry) {
    reasons.push('Assimetria binocular leve a moderada exige revisão mais próxima.');
  }
  if (partialCoverage) {
    reasons.push('Cobertura de campos-chave parcial no exame atual.');
  }
  if (attentionQuality) {
    reasons.push('Status de revisão em atenção no processamento da extração.');
  }
  if (delta?.keyChanges?.length) {
    reasons.push('Respostas clínicas adicionais alteraram fatores relevantes da interpretação.');
  }
  if (answeredCount > 0) {
    reasons.push(`${answeredCount} resposta(s) clínica(s) complementar(es) considerada(s).`);
  }
  if (summary?.remainingUncertainties?.length) {
    limitations.push(...summary.remainingUncertainties.slice(0, 2));
  }
  if (!binocular.trim()) {
    limitations.push('Correlação binocular ausente ou limitada nesta sessão.');
  }
  if (!temporal.trim()) {
    limitations.push('Comparação temporal ausente ou limitada nesta sessão.');
  }

  let level: ClinicalPriorityLevel = 'routine';
  if (weakData) {
    level = 'indeterminate';
  } else if (temporalProgression || markedAsymmetry) {
    level = 'priority';
  } else if (mildAsymmetry || partialCoverage || attentionQuality || delta?.keyChanges?.length) {
    level = 'attention';
  }

  const label = getClinicalPriorityLabel(level);
  const mainReasons = reasons.slice(0, 4);
  const finalLimitations = [...new Set(limitations)].slice(0, 3);

  const summaryText =
    level === 'priority'
      ? 'Sugestão de prioridade clínica elevada, com necessidade de avaliação mais célere.'
      : level === 'attention'
        ? 'Sugestão de atenção clínica, com revisão próxima e correlação dirigida.'
        : level === 'indeterminate'
          ? 'Prioridade indeterminada por limitações relevantes dos dados disponíveis.'
          : 'Sugestão de rotina, sem sinais fortes de urgência com os dados atuais.';

  const recommendedAction =
    level === 'priority'
      ? 'Priorizar revisão clínica oftalmológica e correlação imediata com exame presencial.'
      : level === 'attention'
        ? 'Programar revisão clínica próxima, correlacionando achados com contexto e exame ocular.'
        : level === 'indeterminate'
          ? 'Repetir/complementar exames e melhorar qualidade dos dados antes de estratificar prioridade.'
          : 'Seguir acompanhamento de rotina, mantendo vigilância e correlação clínica habitual.';

  return {
    level,
    label,
    summary: summaryText,
    mainReasons,
    recommendedAction,
    limitations: finalLimitations,
  };
}
