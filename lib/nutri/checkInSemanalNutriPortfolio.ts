import type { WeeklyNutritionAnalytics, WeeklyNutritionTrend } from '@/lib/nutri/checkInSemanalNutriAnalytics';
import {
  getWeeklyNutritionCheckInFlags,
  type WeeklyNutritionCheckInFlagId,
} from '@/lib/nutri/checkInSemanalNutriFlags';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';

export type WeeklyNutritionPortfolioClassification =
  | 'attention'
  | 'improving'
  | 'stable'
  | 'insufficient_data';

export type WeeklyNutritionPortfolioReason = {
  id: string;
  label: string;
};

export type WeeklyNutritionPortfolioPatient = {
  patientId: string;
  patientName: string;
  classification: WeeklyNutritionPortfolioClassification;
  reasons: WeeklyNutritionPortfolioReason[];
  priorityScore: number;
  latestScore: number | null;
  scoreDelta: number | null;
  trend: WeeklyNutritionTrend;
  latestWeekKey: string | null;
};

export type WeeklyNutritionPortfolioSummary = {
  total: number;
  improving: number;
  stable: number;
  attention: number;
  insufficientData: number;
  priorityPatients: WeeklyNutritionPortfolioPatient[];
  positiveHighlights: WeeklyNutritionPortfolioPatient[];
};

const SEVERE_FLAGS = new Set<WeeklyNutritionCheckInFlagId>([
  'severe_nausea',
  'severe_constipation',
  'severe_diarrhea',
]);

const ATTENTION_FLAGS = new Set<WeeklyNutritionCheckInFlagId>([
  'low_adherence',
  'low_protein',
  'low_hydration',
  'moderate_nausea',
  'moderate_constipation',
  'moderate_diarrhea',
  'low_energy',
]);

const SCORE_ATTENTION_MAX = 60;
const PRIORITY_LIST_LIMIT = 6;
const POSITIVE_HIGHLIGHT_LIMIT = 3;

function currentFlags(latest: CheckInSemanalNutri | null) {
  return latest ? getWeeklyNutritionCheckInFlags(latest) : [];
}

function isSevere(flag: string): boolean {
  return SEVERE_FLAGS.has(flag as WeeklyNutritionCheckInFlagId);
}

function isAttentionFlag(flag: string): boolean {
  return ATTENTION_FLAGS.has(flag as WeeklyNutritionCheckInFlagId) || isSevere(flag);
}

function formatScoreDelta(delta: number | null): string | null {
  if (delta == null || !Number.isFinite(delta) || delta === 0) return null;
  const rounded = Math.round(Math.abs(delta));
  return delta > 0 ? `Score ↑${rounded}` : `Score ↓${rounded}`;
}

export function computeWeeklyNutritionPriorityScore(input: {
  currentFlagIds: string[];
  recurringFlagIds: string[];
  trend: WeeklyNutritionTrend;
  latestScore: number | null;
}): number {
  let score = 0;
  const current = new Set(input.currentFlagIds);
  const recurring = new Set(input.recurringFlagIds);
  for (const flag of current) {
    if (isSevere(flag)) score += 5;
    else if (flag === 'low_adherence') score += 2;
    else if (flag === 'low_hydration' || flag === 'low_protein' || flag === 'low_energy') score += 1;
    else if (flag.startsWith('moderate_')) score += 1;
  }
  for (const flag of recurring) {
    if (isSevere(flag)) score += 5;
    else if (flag.startsWith('moderate_')) score += 3;
    else if (flag === 'low_adherence') score += 2;
    else if (isAttentionFlag(flag)) score += 1;
  }
  if (input.trend === 'declining') score += 3;
  if (input.latestScore != null && input.latestScore < SCORE_ATTENTION_MAX) score += 2;
  return score;
}

function buildReasons(analytics: WeeklyNutritionAnalytics): WeeklyNutritionPortfolioReason[] {
  const reasons: WeeklyNutritionPortfolioReason[] = [];
  const seen = new Set<string>();
  const push = (id: string, label: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    reasons.push({ id, label });
  };

  const recurring = [...analytics.attentionFlags].filter((flag) => flag.recurring);
  recurring
    .sort((a, b) => Number(isSevere(b.flag)) - Number(isSevere(a.flag)) || b.occurrences - a.occurrences)
    .forEach((flag) => {
      push(
        `recurring:${flag.flag}`,
        `${flag.label} recorrente · ${flag.occurrences}/${flag.evaluatedWeeks}`
      );
    });

  currentFlags(analytics.latest)
    .filter((flag) => isSevere(flag.id))
    .forEach((flag) => push(`current:${flag.id}`, flag.label));

  if (analytics.trend === 'declining') {
    push('trend:declining', 'Tendência de piora');
    const deltaLabel = formatScoreDelta(analytics.deltas.score.delta);
    if (deltaLabel) push('score:delta', deltaLabel);
  }

  currentFlags(analytics.latest)
    .filter((flag) => ATTENTION_FLAGS.has(flag.id))
    .forEach((flag) => {
      if (flag.id === 'low_adherence') push('current:low_adherence', 'Aderência baixa');
      else if (flag.id === 'low_protein') push('current:low_protein', 'Proteína baixa');
      else if (flag.id === 'low_hydration') push('current:low_hydration', 'Hidratação baixa');
      else if (flag.id === 'low_energy') push('current:low_energy', 'Energia baixa');
      else push(`current:${flag.id}`, flag.label);
    });

  const latestScore = analytics.portfolioSignals.latestScore;
  if (latestScore != null && latestScore < SCORE_ATTENTION_MAX) {
    push('score:low', 'Score baixo');
  }

  return reasons.slice(0, 3);
}

function hasAttentionCondition(analytics: WeeklyNutritionAnalytics): boolean {
  const current = currentFlags(analytics.latest);
  if (current.some((flag) => isAttentionFlag(flag.id))) return true;
  if (analytics.attentionFlags.some((flag) => flag.recurring && isAttentionFlag(flag.flag))) return true;
  if (analytics.trend === 'declining') return true;
  const latestScore = analytics.portfolioSignals.latestScore;
  if (latestScore != null && latestScore < SCORE_ATTENTION_MAX) return true;
  return false;
}

export function classifyWeeklyNutritionPortfolioPatient(
  analytics: WeeklyNutritionAnalytics
): Pick<WeeklyNutritionPortfolioPatient, 'classification' | 'reasons' | 'priorityScore'> {
  const currentFlagIds = currentFlags(analytics.latest).map((flag) => flag.id);
  const recurringFlagIds = analytics.attentionFlags.filter((flag) => flag.recurring).map((flag) => flag.flag);
  const priorityScore = computeWeeklyNutritionPriorityScore({
    currentFlagIds,
    recurringFlagIds,
    trend: analytics.trend,
    latestScore: analytics.portfolioSignals.latestScore,
  });
  const reasons = buildReasons(analytics);

  if (hasAttentionCondition(analytics)) {
    return { classification: 'attention', reasons, priorityScore };
  }
  if (analytics.trend === 'improving') {
    const deltaLabel = formatScoreDelta(analytics.deltas.score.delta);
    return {
      classification: 'improving',
      reasons: deltaLabel ? [{ id: 'score:delta', label: deltaLabel }] : [{ id: 'trend:improving', label: 'Tendência positiva' }],
      priorityScore: 0,
    };
  }
  if (analytics.trend === 'stable') {
    return { classification: 'stable', reasons: [], priorityScore: 0 };
  }
  return { classification: 'insufficient_data', reasons: [], priorityScore: 0 };
}

export function sortWeeklyNutritionPortfolioPatients(
  patients: WeeklyNutritionPortfolioPatient[]
): WeeklyNutritionPortfolioPatient[] {
  return [...patients].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    const severeA = a.reasons.some((reason) => reason.id.includes('severe') || reason.label.toLowerCase().includes('grave'));
    const severeB = b.reasons.some((reason) => reason.id.includes('severe') || reason.label.toLowerCase().includes('grave'));
    if (severeA !== severeB) return Number(severeB) - Number(severeA);
    return a.patientName.localeCompare(b.patientName, 'pt-BR');
  });
}

export function buildWeeklyNutritionPortfolioSummary(
  patients: WeeklyNutritionPortfolioPatient[]
): WeeklyNutritionPortfolioSummary {
  const attention = patients.filter((p) => p.classification === 'attention');
  const improving = patients.filter((p) => p.classification === 'improving');
  const stable = patients.filter((p) => p.classification === 'stable');
  const insufficientData = patients.filter((p) => p.classification === 'insufficient_data');
  return {
    total: patients.length,
    improving: improving.length,
    stable: stable.length,
    attention: attention.length,
    insufficientData: insufficientData.length,
    priorityPatients: sortWeeklyNutritionPortfolioPatients(attention).slice(0, PRIORITY_LIST_LIMIT),
    positiveHighlights: [...improving]
      .sort((a, b) => (b.scoreDelta ?? 0) - (a.scoreDelta ?? 0) || a.patientName.localeCompare(b.patientName, 'pt-BR'))
      .slice(0, POSITIVE_HIGHLIGHT_LIMIT),
  };
}

export function toWeeklyNutritionPortfolioPatient(input: {
  patientId: string;
  patientName: string;
  analytics: WeeklyNutritionAnalytics;
}): WeeklyNutritionPortfolioPatient {
  const classified = classifyWeeklyNutritionPortfolioPatient(input.analytics);
  return {
    patientId: input.patientId,
    patientName: input.patientName,
    ...classified,
    latestScore: input.analytics.portfolioSignals.latestScore,
    scoreDelta: input.analytics.deltas.score.delta,
    trend: input.analytics.trend,
    latestWeekKey: input.analytics.latest?.weekKey ?? null,
  };
}

export function isActiveWeeklyNutritionPortfolioStatus(
  statusTratamento?: string | null
): boolean {
  return statusTratamento === 'em_tratamento';
}

export function insufficientWeeklyNutritionPortfolioPatient(
  patientId: string,
  patientName: string
): WeeklyNutritionPortfolioPatient {
  return {
    patientId,
    patientName,
    classification: 'insufficient_data',
    reasons: [],
    priorityScore: 0,
    latestScore: null,
    scoreDelta: null,
    trend: 'insufficient_data',
    latestWeekKey: null,
  };
}

export function mergeEligiblePatientsWithPortfolioRows(input: {
  eligiblePatients: Array<{ patientId: string; patientName: string }>;
  rows: WeeklyNutritionPortfolioPatient[];
}): WeeklyNutritionPortfolioPatient[] {
  const byId = new Map(input.rows.map((row) => [row.patientId, row]));
  return input.eligiblePatients.map((patient) => {
    const row = byId.get(patient.patientId);
    if (!row) return insufficientWeeklyNutritionPortfolioPatient(patient.patientId, patient.patientName);
    return { ...row, patientName: patient.patientName };
  });
}
