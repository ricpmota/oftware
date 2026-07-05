import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { ClinicalPriorityAssessment } from '@/lib/oftpay/clinicalPriorityAssessment';

export type ClinicalFollowUpActionContextTag =
  | 'priority'
  | 'quality'
  | 'temporal'
  | 'binocular'
  | 'modality'
  | 'clinical_answers';

export type ClinicalFollowUpAction = {
  text: string;
  contextTag?: ClinicalFollowUpActionContextTag;
  priorityLevelRelated?: ClinicalPriorityAssessment['level'];
};

export type ClinicalFollowUpActions = {
  actions: ClinicalFollowUpAction[];
};

function hasPattern(text: string, regex: RegExp): boolean {
  return regex.test(text);
}

function normalizeExamType(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return value || null;
}

export function hasMeaningfulClinicalFollowUpActions(
  value: ClinicalFollowUpActions | null | undefined
): boolean {
  return !!value && Array.isArray(value.actions) && value.actions.length > 0;
}

export function buildClinicalFollowUpActions(params: {
  clinicalPriorityAssessment?: ClinicalPriorityAssessment | null;
  qualityContext?: string;
  temporalContext?: string;
  binocularContext?: string;
  followUpAnswers?: ClinicalFollowUpAnswer[];
  extractions?: Array<{ examType?: unknown }>;
}): ClinicalFollowUpActions {
  const level = params.clinicalPriorityAssessment?.level ?? 'indeterminate';
  const quality = params.qualityContext ?? '';
  const temporal = params.temporalContext ?? '';
  const binocular = params.binocularContext ?? '';
  const examTypes = new Set(
    (params.extractions ?? [])
      .map((e) => normalizeExamType(e.examType))
      .filter((v): v is string => !!v)
  );
  const answeredCount = (params.followUpAnswers ?? []).filter((a) => a.answer?.trim()).length;

  const actions: ClinicalFollowUpAction[] = [];
  const seen = new Set<string>();
  const add = (action: ClinicalFollowUpAction) => {
    const key = action.text.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    actions.push(action);
  };

  if (level === 'routine') {
    add({
      text: 'Considerar manutenção do acompanhamento clínico conforme o contexto individual.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
    add({
      text: 'Revisar o exame em conjunto com a avaliação clínica oftalmológica.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
    add({
      text: 'Considerar comparação seriada com exames prévios quando disponíveis.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
  } else if (level === 'attention') {
    add({
      text: 'Considerar revisão clínica em intervalo mais próximo.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
    add({
      text: 'Correlacionar os achados com exame físico oftalmológico direcionado.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
    add({
      text: 'Avaliar necessidade de exames complementares conforme a hipótese predominante.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
  } else if (level === 'priority') {
    add({
      text: 'Considerar avaliação oftalmológica em curto prazo, conforme quadro clínico.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
    add({
      text: 'Direcionar a investigação para os achados que mais chamaram atenção no exame.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
    add({
      text: 'Correlacionar com dados clínicos relevantes, incluindo PIO, sintomas e histórico.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
  } else {
    add({
      text: 'Considerar repetição do exame para reduzir incertezas da interpretação.',
      contextTag: 'priority',
      priorityLevelRelated: level,
    });
    add({
      text: 'Buscar melhor qualidade de imagem/dados antes de conclusões mais firmes.',
      contextTag: 'quality',
      priorityLevelRelated: level,
    });
    add({
      text: 'Complementar informações clínicas essenciais antes de definir prioridade final.',
      contextTag: 'clinical_answers',
      priorityLevelRelated: level,
    });
  }

  if (examTypes.has('oct_disco') || examTypes.has('campimetria')) {
    add({
      text: 'Correlacionar achados com PIO, fundo de olho e exames prévios da mesma linha glaucomatosa.',
      contextTag: 'modality',
      priorityLevelRelated: level,
    });
  } else if (examTypes.has('oct_macula') || examTypes.has('retinografia')) {
    add({
      text: 'Correlacionar com sintomas visuais atuais e considerar revisão focada em retina.',
      contextTag: 'modality',
      priorityLevelRelated: level,
    });
  } else if (
    examTypes.has('topografia') ||
    examTypes.has('galilei') ||
    examTypes.has('paquimetria')
  ) {
    add({
      text: 'Avaliar tendência evolutiva corneana e revisar histórico refrativo no seguimento.',
      contextTag: 'modality',
      priorityLevelRelated: level,
    });
  } else if (examTypes.has('microscopia')) {
    add({
      text: 'Correlacionar com quadro corneano e considerar implicações no planejamento cirúrgico.',
      contextTag: 'modality',
      priorityLevelRelated: level,
    });
  }

  if (hasPattern(temporal, /possible_progression/i)) {
    add({
      text: 'Revisar possível progressão temporal com comparação estruturada de datas e parâmetros.',
      contextTag: 'temporal',
      priorityLevelRelated: level,
    });
  } else if (hasPattern(temporal, /status:\s*stable/i)) {
    add({
      text: 'Manter comparação temporal periódica para confirmar estabilidade ao longo do seguimento.',
      contextTag: 'temporal',
      priorityLevelRelated: level,
    });
  }

  if (hasPattern(binocular, /marked_asymmetry|mild_asymmetry/i)) {
    add({
      text: 'Correlacionar a assimetria binocular com exame clínico e histórico funcional.',
      contextTag: 'binocular',
      priorityLevelRelated: level,
    });
  }

  if (hasPattern(quality, /status_revisao:\s*review|checklist_status:\s*weak|possible_ocr_issue/i)) {
    add({
      text: 'Avaliar revisão técnica/manual dos dados extraídos para aumentar confiabilidade.',
      contextTag: 'quality',
      priorityLevelRelated: level,
    });
  }

  if (answeredCount > 0) {
    add({
      text: 'Reavaliar o plano de seguimento à luz das respostas clínicas adicionais registradas.',
      contextTag: 'clinical_answers',
      priorityLevelRelated: level,
    });
  }

  return { actions: actions.slice(0, 5) };
}
