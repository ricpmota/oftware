import type { Sex } from '@/types/labRanges';
import { getLabRange } from '@/utils/labRangesFromJson';
import { EXAME_LABORATORIAL_KEY_TO_FIELD } from '@/lib/metaadmin/exameLaboratorialFormFields';
import {
  getLabOptimizationStatus,
  getLabExamMeta,
  type OptimizationStatus,
} from '@/lib/labExames/labOptimization';
import { getExameCampoNumerico } from '@/lib/labExames/exameCampoNumerico';

export type ScoreColor = 'green' | 'orange' | 'red' | 'gray';

export interface SectionScoreResult {
  sectionKey: string;
  score: number | null;
  totalEligible: number;
  totalEvaluated: number;
  color: ScoreColor;
  label: string;
}

const STATUS_POINTS: Record<OptimizationStatus, number | null> = {
  ideal: 100,
  normal_but_not_ideal: 70,
  below_ideal: 70,
  above_ideal: 70,
  below_reference: 30,
  above_reference: 30,
  not_applicable: null,
  unknown: null,
};

export function calculateExamOptimizationScore(status: OptimizationStatus): number | null {
  return STATUS_POINTS[status] ?? null;
}

export function scoreColor(score: number | null): ScoreColor {
  if (score === null) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 60) return 'orange';
  return 'red';
}

type DobInput = Date | { toDate?: () => Date } | string | null | undefined;

function dateOfBirthForAge(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

export function calculateSectionMetabolicScore(params: {
  sectionKey: string;
  examKeys: string[];
  labValues: Record<string, unknown>;
  sex?: Sex;
  dob?: Date | { toDate?: () => Date } | string | null;
  limitOverrides?: Record<string, unknown> | null;
  sectionLabel?: string;
}): SectionScoreResult {
  const { sectionKey, examKeys, labValues, sex, dob, sectionLabel } = params;

  let totalEligible = 0;
  let totalEvaluated = 0;
  let sumPoints = 0;

  for (const examKey of examKeys) {
    const meta = getLabExamMeta(examKey);
    if (!meta || meta.scoreEligible === false || meta.qualitative) continue;

    totalEligible++;

    const field = EXAME_LABORATORIAL_KEY_TO_FIELD[examKey];
    if (!field) continue;

    const value = getExameCampoNumerico(labValues as Record<string, unknown>, field);
    if (value == null) continue;

    const range = getLabRange(examKey, sex ?? 'M', (dob as DobInput) ?? dateOfBirthForAge(45));
    if (!range) continue;

    const result = getLabOptimizationStatus({ value, range, meta });
    const points = calculateExamOptimizationScore(result.optimizationStatus);
    if (points === null) continue;

    totalEvaluated++;
    sumPoints += points;
  }

  const score = totalEvaluated > 0 ? Math.round(sumPoints / totalEvaluated) : null;

  return {
    sectionKey,
    score,
    totalEligible,
    totalEvaluated,
    color: scoreColor(score),
    label: sectionLabel || sectionKey,
  };
}

/**
 * Calcula scores para todas as seções de uma vez.
 */
export function calculateAllSectionScores(params: {
  labOrderBySection: Record<string, string[]>;
  labValues: Record<string, unknown>;
  sex?: Sex;
  dob?: Date | { toDate?: () => Date } | string | null;
  limitOverrides?: Record<string, unknown> | null;
  sectionLabels?: Record<string, string>;
}): SectionScoreResult[] {
  const { labOrderBySection, labValues, sex, dob, limitOverrides, sectionLabels } = params;
  const results: SectionScoreResult[] = [];

  for (const [sectionKey, examKeys] of Object.entries(labOrderBySection)) {
    results.push(
      calculateSectionMetabolicScore({
        sectionKey,
        examKeys,
        labValues,
        sex,
        dob,
        limitOverrides,
        sectionLabel: sectionLabels?.[sectionKey] || sectionKey,
      })
    );
  }

  return results;
}
