import type { CorneaCorrelation } from '@/lib/oftpay/corneaCorrelation';
import type { DomainLongitudinalCorrelation } from '@/lib/oftpay/domainLongitudinalCorrelation';
import type { ClinicalFollowUpAnswer, ClinicalFollowUpQuestion } from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { ClinicalFollowUpActions } from '@/lib/oftpay/clinicalFollowUpActions';
import type { ClinicalPriorityAssessment } from '@/lib/oftpay/clinicalPriorityAssessment';
import type { ClinicalPriorityExplainability } from '@/lib/oftpay/clinicalPriorityExplainability';
import type { GlaucomaCorrelation } from '@/lib/oftpay/glaucomaCorrelation';
import type { IntegratedCaseSummary } from '@/lib/oftpay/integratedCaseSummary';
import type { MultiDomainCorrelation } from '@/lib/oftpay/multiDomainCorrelation';
import type { RefinementDelta } from '@/lib/oftpay/refinementDelta';
import type { RetinaCorrelation } from '@/lib/oftpay/retinaCorrelation';
import type { LearningInsight } from '@/lib/oftpay/learningInsights';
import { buildStableLearningInsightKey } from '@/lib/oftpay/learningInsightKeys';
import { buildLearningInsightPatternId } from '@/lib/oftpay/learningInsightPattern';

export type DoctorAgreement = 'agree' | 'partial' | 'disagree';

export type ArchivedLaudoCaseFile = {
  fileName: string;
  examType?: string;
  examTypeLabel?: string;
  eye?: string;
  eyeLabel?: string;
  dataExame?: string | null;
  camposEstruturados?: Record<string, unknown>;
  qualityFlags?: string[];
  qualitySummary?: string | null;
  reviewStatus?: 'ok' | 'attention' | 'review' | null;
  checklistCoverage?: number | null;
  checklistStatus?: 'good' | 'partial' | 'weak' | null;
};

export type ArchivedLaudoCaseAiOutput = {
  initialAnalysis: string;
  followUpQuestions: ClinicalFollowUpQuestion[];
  followUpAnswers: ClinicalFollowUpAnswer[];
  refinedAnalysis?: string;
  refinementDelta?: RefinementDelta;
  integratedCaseSummary?: IntegratedCaseSummary;
  clinicalPriorityAssessment?: ClinicalPriorityAssessment;
  clinicalPriorityExplainability?: ClinicalPriorityExplainability;
  clinicalFollowUpActions?: ClinicalFollowUpActions;
  glaucomaCorrelation?: GlaucomaCorrelation;
  retinaCorrelation?: RetinaCorrelation;
  corneaCorrelation?: CorneaCorrelation;
  multiDomainCorrelation?: MultiDomainCorrelation;
  domainLongitudinalCorrelation?: DomainLongitudinalCorrelation;
  learningInsightsApplied?: LearningInsight[];
};

export type ArchivedLaudoCaseFeedback = {
  doctorAgreement?: DoctorAgreement;
  doctorComment?: string;
  doctorFinalInterpretation?: string;
};

export type ArchivedLaudoCase = {
  caseId: string;
  userId: string;
  patientId?: string | null;
  createdAt: number;
  analysisVersion?: string | null;
  files: ArchivedLaudoCaseFile[];
  binocularContext?: unknown;
  temporalContext?: unknown;
  aiOutput: ArchivedLaudoCaseAiOutput;
  feedback?: ArchivedLaudoCaseFeedback;
};

export type LaudoLearningRecord = {
  createdAt: number;
  examTypes: string[];
  domainsActive: Array<'glaucoma' | 'retina' | 'cornea'>;
  primaryDomain: 'glaucoma' | 'retina' | 'cornea' | 'indeterminate' | null;
  clinicalPriorityLevel: string | null;
  doctorAgreement: DoctorAgreement | null;
  qualityFlags: string[];
  reviewStatus: 'ok' | 'attention' | 'review' | null;
  checklistStatus: 'good' | 'partial' | 'weak' | null;
  hasRefinement: boolean;
  hasDelta: boolean;
  hasAmbiguity: boolean;
  hasDomainConflict: boolean;
  longitudinalStatus: {
    glaucoma: string | null;
    retina: string | null;
    cornea: string | null;
  };
};

export type LearningImpactRecord = {
  createdAt: number;
  insightsUsed: Array<{
    type: LearningInsight['type'];
    relatedExamType?: string | null;
    relatedDomain?: 'glaucoma' | 'retina' | 'cornea' | null;
    /** Chave estável (ETAPA 27); registros antigos podem omitir. */
    stableKey?: string | null;
    /** Identidade lógica do padrão (ETAPA 28); registros antigos podem omitir. */
    patternId?: string | null;
  }>;
  doctorAgreement: DoctorAgreement;
  domainsActive: Array<'glaucoma' | 'retina' | 'cornea'>;
  examTypes: string[];
};

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => typeof v === 'string' && v.trim())));
}

function pickWorstReviewStatus(
  statuses: Array<'ok' | 'attention' | 'review' | null | undefined>
): 'ok' | 'attention' | 'review' | null {
  if (statuses.some((s) => s === 'review')) return 'review';
  if (statuses.some((s) => s === 'attention')) return 'attention';
  if (statuses.some((s) => s === 'ok')) return 'ok';
  return null;
}

function pickWorstChecklistStatus(
  statuses: Array<'good' | 'partial' | 'weak' | null | undefined>
): 'good' | 'partial' | 'weak' | null {
  if (statuses.some((s) => s === 'weak')) return 'weak';
  if (statuses.some((s) => s === 'partial')) return 'partial';
  if (statuses.some((s) => s === 'good')) return 'good';
  return null;
}

export function buildArchivedLaudoCaseSnapshot(params: {
  caseId: string;
  userId: string;
  patientId?: string | null;
  analysisVersion?: string | null;
  files: ArchivedLaudoCaseFile[];
  binocularContext?: unknown;
  temporalContext?: unknown;
  aiOutput: ArchivedLaudoCaseAiOutput;
  feedback?: ArchivedLaudoCaseFeedback;
  createdAt?: number;
}): ArchivedLaudoCase {
  return {
    caseId: params.caseId,
    userId: params.userId,
    patientId: params.patientId ?? null,
    createdAt: params.createdAt ?? Date.now(),
    analysisVersion: params.analysisVersion ?? null,
    files: params.files,
    binocularContext: params.binocularContext ?? null,
    temporalContext: params.temporalContext ?? null,
    aiOutput: params.aiOutput,
    feedback: params.feedback ?? {},
  };
}

export function buildLearningRecordFromCase(snapshot: ArchivedLaudoCase): LaudoLearningRecord {
  const examTypes = uniq(snapshot.files.map((f) => f.examType ?? '').filter(Boolean));
  const domainsActive: Array<'glaucoma' | 'retina' | 'cornea'> = [];
  if (snapshot.aiOutput.glaucomaCorrelation?.isApplicable) domainsActive.push('glaucoma');
  if (snapshot.aiOutput.retinaCorrelation?.isApplicable) domainsActive.push('retina');
  if (snapshot.aiOutput.corneaCorrelation?.isApplicable) domainsActive.push('cornea');

  const qualityFlags = uniq(
    snapshot.files.flatMap((f) => (Array.isArray(f.qualityFlags) ? f.qualityFlags : []))
  );
  const reviewStatus = pickWorstReviewStatus(snapshot.files.map((f) => f.reviewStatus));
  const checklistStatus = pickWorstChecklistStatus(snapshot.files.map((f) => f.checklistStatus));

  const md = snapshot.aiOutput.multiDomainCorrelation;
  const hasAmbiguity =
    (md?.remainingAmbiguities?.length ?? 0) > 0 || md?.primaryDomain === 'indeterminate';
  const hasDomainConflict = (md?.domainConflicts?.length ?? 0) > 0;

  return {
    createdAt: snapshot.createdAt,
    examTypes,
    domainsActive,
    primaryDomain: md?.primaryDomain ?? null,
    clinicalPriorityLevel: snapshot.aiOutput.clinicalPriorityAssessment?.level ?? null,
    doctorAgreement: snapshot.feedback?.doctorAgreement ?? null,
    qualityFlags,
    reviewStatus,
    checklistStatus,
    hasRefinement: Boolean(snapshot.aiOutput.refinedAnalysis && snapshot.aiOutput.refinedAnalysis.trim()),
    hasDelta: Boolean(snapshot.aiOutput.refinementDelta),
    hasAmbiguity,
    hasDomainConflict,
    longitudinalStatus: {
      glaucoma: snapshot.aiOutput.domainLongitudinalCorrelation?.glaucomaLongitudinal?.longitudinalConsistency ?? null,
      retina: snapshot.aiOutput.domainLongitudinalCorrelation?.retinaLongitudinal?.retinaTrend ?? null,
      cornea: snapshot.aiOutput.domainLongitudinalCorrelation?.corneaLongitudinal?.cornealTrend ?? null,
    },
  };
}

export function buildLearningImpactRecordFromCase(
  snapshot: ArchivedLaudoCase
): LearningImpactRecord | null {
  const agreement = snapshot.feedback?.doctorAgreement;
  if (!agreement) return null;

  const domainsActive: Array<'glaucoma' | 'retina' | 'cornea'> = [];
  if (snapshot.aiOutput.glaucomaCorrelation?.isApplicable) domainsActive.push('glaucoma');
  if (snapshot.aiOutput.retinaCorrelation?.isApplicable) domainsActive.push('retina');
  if (snapshot.aiOutput.corneaCorrelation?.isApplicable) domainsActive.push('cornea');

  const examTypes = uniq(snapshot.files.map((f) => f.examType ?? '').filter(Boolean));
  const insightsUsed = (snapshot.aiOutput.learningInsightsApplied ?? []).slice(0, 5).map((x) => ({
    type: x.type,
    relatedExamType: x.relatedExamType ?? null,
    relatedDomain: x.relatedDomain ?? null,
    stableKey:
      typeof x.stableKey === 'string' && x.stableKey.trim()
        ? x.stableKey.trim()
        : buildStableLearningInsightKey({
            type: x.type,
            relatedExamType: x.relatedExamType ?? null,
            relatedDomain: x.relatedDomain ?? null,
            condition: x.condition,
          }),
    patternId:
      typeof x.patternId === 'string' && x.patternId.trim()
        ? x.patternId.trim()
        : buildLearningInsightPatternId({
            type: x.type,
            relatedExamType: x.relatedExamType ?? null,
            relatedDomain: x.relatedDomain ?? null,
            condition: x.condition,
          }),
  }));

  return {
    createdAt: snapshot.createdAt,
    insightsUsed,
    doctorAgreement: agreement,
    domainsActive,
    examTypes,
  };
}
