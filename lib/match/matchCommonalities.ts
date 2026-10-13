import { achievementById } from '@/lib/match/matchAchievements';
import type { MatchProfileDraft } from '@/lib/match/matchProfile';
import {
  MATCH_ACTIVITY_LEVELS,
  MATCH_DAYS,
  MATCH_INTERESTS,
  MATCH_PERIODS,
  activityById,
  connectionGoalById,
  interestById,
} from '@/lib/match/matchTaxonomy';

export type MatchCommonalityType =
  | 'interest'
  | 'activity'
  | 'connection_goal'
  | 'achievement'
  | 'goal'
  | 'availability_period'
  | 'availability_day'
  | 'lifestyle';

export type MatchCommonality = {
  type: MatchCommonalityType;
  id: string;
  label: string;
};

const LEVELS = new Map(MATCH_ACTIVITY_LEVELS.map((item) => [item.id, item.title]));

function intersect(left: readonly string[], right: readonly string[], order: readonly string[]): string[] {
  const allowed = new Set(right);
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of order) {
    if (left.includes(id) && allowed.has(id) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function publicIds(
  records: readonly { achievementId?: string; goalId?: string; visibility?: string; status?: string }[],
  key: 'achievementId' | 'goalId',
  activeOnly = false
): string[] {
  const ids: string[] = [];
  for (const record of records) {
    if (record.visibility !== 'public') continue;
    if (activeOnly && record.status && record.status !== 'active') continue;
    const id = record[key];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Compara IDs estáveis. Não usa rótulo parecido nem dado clínico. */
export function getMatchCommonalities(
  current: MatchProfileDraft,
  candidate: MatchProfileDraft
): { total: number; items: MatchCommonality[] } {
  const items: MatchCommonality[] = [];

  if (current.sharing.showInterests && candidate.sharing.showInterests) {
    for (const id of intersect(current.interests, candidate.interests, MATCH_INTERESTS.map((item) => item.id))) {
      const label = interestById(id)?.label;
      if (label) items.push({ type: 'interest', id, label });
    }
  }

  for (const id of intersect(
    current.activities,
    candidate.activities,
    current.activities
  )) {
    const label = activityById(id)?.label;
    if (label) items.push({ type: 'activity', id, label });
  }

  const achievementOrder = publicIds(current.achievements, 'achievementId');
  for (const id of intersect(achievementOrder, publicIds(candidate.achievements, 'achievementId'), achievementOrder)) {
    const label = achievementById(id)?.label;
    if (label) items.push({ type: 'achievement', id, label });
  }

  const goalOrder = publicIds(current.goals, 'goalId', true);
  for (const id of intersect(goalOrder, publicIds(candidate.goals, 'goalId', true), goalOrder)) {
    const label = achievementById(id)?.label;
    if (label) items.push({ type: 'goal', id, label });
  }

  for (const id of intersect(current.connectionGoals, candidate.connectionGoals, current.connectionGoals)) {
    const label = connectionGoalById(id)?.label;
    if (label) items.push({ type: 'connection_goal', id, label });
  }

  if (current.sharing.showAvailability && candidate.sharing.showAvailability) {
    for (const id of intersect(current.availability.periods, candidate.availability.periods, MATCH_PERIODS.map((item) => item.id))) {
      const label = MATCH_PERIODS.find((item) => item.id === id)?.label;
      if (label) items.push({ type: 'availability_period', id, label });
    }
    for (const id of intersect(current.availability.days, candidate.availability.days, MATCH_DAYS.map((item) => item.id))) {
      const label = MATCH_DAYS.find((item) => item.id === id)?.label;
      if (label) items.push({ type: 'availability_day', id, label });
    }
  }

  const level = current.lifestyle.activityLevel;
  if (level && level === candidate.lifestyle.activityLevel) {
    const label = LEVELS.get(level);
    if (label) items.push({ type: 'lifestyle', id: level, label });
  }

  return { total: items.length, items };
}

export function commonalityDetail(item: MatchCommonality): string {
  if (item.type === 'interest') return `${item.label} aparece entre os interesses de vocês.`;
  if (item.type === 'activity') return `Os dois querem viver isso: ${item.label}.`;
  if (item.type === 'achievement') return `Os dois já completaram ${item.label}.`;
  if (item.type === 'goal') return `Vocês possuem o objetivo de ${item.label}.`;
  if (item.type === 'connection_goal') return `Os dois buscam ${item.label}.`;
  if (item.type === 'availability_period') return `Vocês costumam estar disponíveis nesse período: ${item.label}.`;
  if (item.type === 'availability_day') return `Vocês costumam ter tempo neste dia: ${item.label}.`;
  return `Os dois estão neste momento: ${item.label}.`;
}
