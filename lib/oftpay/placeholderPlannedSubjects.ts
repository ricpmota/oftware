import type { PlannedQuestionSubject } from '@/lib/oftpay/plannedQuestionSubjects';
import {
  buildPlannedSubjectsFromTitles,
  createEmptyDifficultySlots,
} from '@/lib/oftpay/plannedQuestionSubjects';

const ASPECTO_PATTERN = /^aspecto \d+ do tópico$/i;
const ANGULO_SUFFIX_PATTERN = / — ângulo \d+$/i;
const CONCEITO_SUFFIX_PATTERN = / — conceito \d+$/i;

/** Assuntos planejados gerados automaticamente quando a IA não retornou títulos reais. */
export function isPlaceholderPlannedSubjectTitle(title: string): boolean {
  const normalized = title.trim();
  if (!normalized) return false;
  if (ASPECTO_PATTERN.test(normalized)) return true;
  if (ANGULO_SUFFIX_PATTERN.test(normalized)) return true;
  if (CONCEITO_SUFFIX_PATTERN.test(normalized)) return true;
  return false;
}

export function topicHasPlaceholderPlannedSubjects(
  subjects: Array<{ title: string }> | undefined | null
): boolean {
  return (subjects ?? []).some((subject) => isPlaceholderPlannedSubjectTitle(subject.title));
}

export function countPlaceholderPlannedSubjects(
  subjects: Array<{ title: string }> | undefined | null
): number {
  return (subjects ?? []).filter((subject) =>
    isPlaceholderPlannedSubjectTitle(subject.title)
  ).length;
}

export function getPlaceholderPlannedSubjectIds(
  subjects: PlannedQuestionSubject[]
): Set<string> {
  const ids = new Set<string>();
  for (const subject of subjects) {
    if (isPlaceholderPlannedSubjectTitle(subject.title)) {
      ids.add(subject.id);
    }
  }
  return ids;
}

export function summarizePlaceholderTopics(
  topics: Array<{ id: string; topicTitle: string; plannedSubjects?: Array<{ title: string }> }>
): {
  topicIds: string[];
  topicCount: number;
  placeholderSubjectCount: number;
  topicTitles: string[];
} {
  const affected = topics.filter((topic) =>
    topicHasPlaceholderPlannedSubjects(topic.plannedSubjects)
  );
  const placeholderSubjectCount = affected.reduce(
    (sum, topic) => sum + countPlaceholderPlannedSubjects(topic.plannedSubjects),
    0
  );
  return {
    topicIds: affected.map((topic) => topic.id),
    topicCount: affected.length,
    placeholderSubjectCount,
    topicTitles: affected.map((topic) => topic.topicTitle),
  };
}

export function splitPlannedSubjectsByPlaceholder(subjects: PlannedQuestionSubject[]): {
  real: PlannedQuestionSubject[];
  placeholders: PlannedQuestionSubject[];
} {
  const real: PlannedQuestionSubject[] = [];
  const placeholders: PlannedQuestionSubject[] = [];
  for (const subject of subjects) {
    if (isPlaceholderPlannedSubjectTitle(subject.title)) {
      placeholders.push(subject);
    } else {
      real.push(subject);
    }
  }
  return { real, placeholders };
}

function maxSubjectIdSuffix(subjects: PlannedQuestionSubject[], idPrefix: string): number {
  let max = 0;
  for (const subject of subjects) {
    if (!subject.id.startsWith(`${idPrefix}-`)) continue;
    const num = parseInt(subject.id.slice(idPrefix.length + 1), 10);
    if (Number.isFinite(num)) max = Math.max(max, num);
  }
  return max;
}

/**
 * Substitui apenas os assuntos genéricos, preservando IDs e cobertura dos assuntos reais.
 */
export function mergeRepairedPlannedSubjects(
  existing: PlannedQuestionSubject[],
  newTitlesFromGemini: string[],
  idPrefix: string,
  options?: { topicTitle?: string; keywords?: string[] }
): PlannedQuestionSubject[] {
  const { real, placeholders } = splitPlannedSubjectsByPlaceholder(existing);
  const slotsNeeded = placeholders.length;
  if (slotsNeeded === 0) return existing;

  const seen = new Set(real.map((subject) => subject.title.trim().toLowerCase()));
  const replacementTitles: string[] = [];

  for (const raw of newTitlesFromGemini) {
    const title = raw.trim();
    if (!title || isPlaceholderPlannedSubjectTitle(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    replacementTitles.push(title);
    if (replacementTitles.length >= slotsNeeded) break;
  }

  if (replacementTitles.length < slotsNeeded) {
    const fillers = buildPlannedSubjectsFromTitles(
      [],
      slotsNeeded - replacementTitles.length,
      idPrefix,
      { topicTitle: options?.topicTitle, keywords: options?.keywords }
    );
    for (const filler of fillers) {
      const title = filler.title.trim();
      if (!title || isPlaceholderPlannedSubjectTitle(title)) continue;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      replacementTitles.push(title);
      if (replacementTitles.length >= slotsNeeded) break;
    }
  }

  let idCounter = maxSubjectIdSuffix(existing, idPrefix);
  const newSubjects: PlannedQuestionSubject[] = replacementTitles
    .slice(0, slotsNeeded)
    .map((title) => {
      idCounter += 1;
      return {
        id: `${idPrefix}-${idCounter}`,
        title,
        byDifficulty: createEmptyDifficultySlots(),
      };
    });

  return [...real, ...newSubjects];
}
