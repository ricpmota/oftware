/**
 * Assuntos planejados por tópico — cobertura por assunto × dificuldade (Fácil / Médio / Difícil).
 */

import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';
import {
  clampTopicCapacity,
  TOPIC_CAPACITY_MAX,
  TOPIC_CAPACITY_MIN,
} from '@/types/oftreviewApostilaTopic';

export const PLANNED_SUBJECT_DIFFICULTIES = ['facil', 'medio', 'dificil'] as const;
export type PlannedSubjectDifficulty = (typeof PLANNED_SUBJECT_DIFFICULTIES)[number];

export const DEFAULT_NUMERO_ALTERNATIVAS = 5;

export const PLANNED_DIFFICULTY_LABEL: Record<PlannedSubjectDifficulty, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

export interface PlannedSubjectDifficultySlot {
  covered: boolean;
  questaoId?: string;
  coveredAt?: number;
  cancelled?: boolean;
  cancelledReason?: string;
  cancelledAt?: number;
}

export interface PlannedQuestionSubject {
  id: string;
  title: string;
  hint?: string;
  /** @deprecated use byDifficulty */
  covered?: boolean;
  questaoId?: string;
  coveredAt?: number;
  byDifficulty: Record<PlannedSubjectDifficulty, PlannedSubjectDifficultySlot>;
}

function slugId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

export function createEmptyDifficultySlots(): Record<
  PlannedSubjectDifficulty,
  PlannedSubjectDifficultySlot
> {
  return {
    facil: { covered: false },
    medio: { covered: false },
    dificil: { covered: false },
  };
}

function parseDifficultySlot(raw: unknown): PlannedSubjectDifficultySlot {
  if (!raw || typeof raw !== 'object') return { covered: false };
  const row = raw as Record<string, unknown>;
  return {
    covered: Boolean(row.covered),
    ...(typeof row.questaoId === 'string' && row.questaoId.trim()
      ? { questaoId: row.questaoId.trim() }
      : {}),
    ...(typeof row.coveredAt === 'number' && Number.isFinite(row.coveredAt)
      ? { coveredAt: row.coveredAt }
      : {}),
    ...(typeof row.cancelled === 'boolean' ? { cancelled: row.cancelled } : {}),
    ...(typeof row.cancelledReason === 'string' && row.cancelledReason.trim()
      ? { cancelledReason: row.cancelledReason.trim() }
      : {}),
    ...(typeof row.cancelledAt === 'number' && Number.isFinite(row.cancelledAt)
      ? { cancelledAt: row.cancelledAt }
      : {}),
  };
}

function migrateLegacySubject(row: Record<string, unknown>, base: PlannedQuestionSubject): PlannedQuestionSubject {
  if (Boolean(row.covered) || base.byDifficulty.medio.covered) {
    const questaoId =
      (typeof row.questaoId === 'string' ? row.questaoId : undefined) ??
      base.byDifficulty.medio.questaoId;
    const coveredAt =
      (typeof row.coveredAt === 'number' ? row.coveredAt : undefined) ??
      base.byDifficulty.medio.coveredAt;
    if (questaoId && !base.byDifficulty.facil.covered && !base.byDifficulty.dificil.covered) {
      return {
        ...base,
        byDifficulty: {
          ...base.byDifficulty,
          medio: { covered: true, questaoId, coveredAt: coveredAt ?? Date.now() },
        },
      };
    }
  }
  return base;
}

export function buildPlannedSubjectsFromTitles(
  titles: string[],
  capacity: number,
  idPrefix = 'subj',
  options?: { topicTitle?: string; keywords?: string[] }
): PlannedQuestionSubject[] {
  const topicTitle = options?.topicTitle?.trim();
  const keywords = (options?.keywords ?? []).map((k) => k.trim()).filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of titles) {
    const title = raw.trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(title);
    if (unique.length >= capacity) break;
  }

  while (unique.length < capacity) {
    unique.push(
      placeholderSubjectTitle(unique.length, topicTitle, keywords, seen)
    );
  }

  return unique.slice(0, capacity).map((title, index) => ({
    id: slugId(idPrefix, index),
    title,
    byDifficulty: createEmptyDifficultySlots(),
  }));
}

function placeholderSubjectTitle(
  index: number,
  topicTitle: string | undefined,
  keywords: string[],
  seen: Set<string>
): string {
  const n = index + 1;
  const candidates: string[] = [];

  const kw = keywords[index];
  if (kw) {
    candidates.push(topicTitle ? `${topicTitle} — ${kw}` : kw);
  }
  if (topicTitle) {
    candidates.push(`${topicTitle} — ângulo ${n}`);
    candidates.push(`${topicTitle} — conceito ${n}`);
  }
  candidates.push(`Aspecto ${n} do tópico`);

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      return candidate;
    }
  }

  const fallback = topicTitle
    ? `${topicTitle} — ângulo ${n}`
    : `Aspecto ${n} do tópico`;
  seen.add(fallback.toLowerCase());
  return fallback;
}

export function normalizePlannedSubjects(raw: unknown): PlannedQuestionSubject[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (typeof item === 'string') {
        const title = item.trim();
        if (!title) return null;
        return {
          id: slugId('subj', index),
          title,
          byDifficulty: createEmptyDifficultySlots(),
        } satisfies PlannedQuestionSubject;
      }
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const title = String(row.title ?? row.subject ?? row.assunto ?? '').trim();
      if (!title) return null;
      const id = String(row.id ?? slugId('subj', index)).trim() || slugId('subj', index);

      const byRaw = row.byDifficulty as Record<string, unknown> | undefined;
      const byDifficulty = createEmptyDifficultySlots();
      if (byRaw && typeof byRaw === 'object') {
        for (const diff of PLANNED_SUBJECT_DIFFICULTIES) {
          byDifficulty[diff] = parseDifficultySlot(byRaw[diff]);
        }
      }

      const base: PlannedQuestionSubject = {
        id,
        title,
        ...(row.hint != null && String(row.hint).trim()
          ? { hint: String(row.hint).trim() }
          : {}),
        byDifficulty,
      };

      return migrateLegacySubject(row, base);
    })
    .filter((s): s is PlannedQuestionSubject => s != null);
}

export function getTotalSubjectSlots(subjects: PlannedQuestionSubject[]): number {
  return subjects.length * PLANNED_SUBJECT_DIFFICULTIES.length;
}

export function countCoveredSubjectSlots(subjects: PlannedQuestionSubject[]): number {
  let n = 0;
  for (const subject of subjects) {
    for (const diff of PLANNED_SUBJECT_DIFFICULTIES) {
      if (subject.byDifficulty[diff].covered) n += 1;
    }
  }
  return n;
}

/** @deprecated use countCoveredSubjectSlots */
export function countCoveredSubjects(subjects: PlannedQuestionSubject[]): number {
  return countCoveredSubjectSlots(subjects);
}

export function isSubjectDifficultyCovered(
  subject: PlannedQuestionSubject,
  dificuldade: PlannedSubjectDifficulty
): boolean {
  return Boolean(subject.byDifficulty[dificuldade]?.covered);
}

export function getSubjectById(
  subjects: PlannedQuestionSubject[],
  subjectId: string
): PlannedQuestionSubject | undefined {
  return subjects.find((s) => s.id === subjectId);
}

export function getCoveredCombinationsForPrompt(subjects: PlannedQuestionSubject[]): string[] {
  const lines: string[] = [];
  for (const subject of subjects) {
    for (const diff of PLANNED_SUBJECT_DIFFICULTIES) {
      const slot = subject.byDifficulty[diff];
      if (slot.covered) {
        lines.push(`${subject.title} (${PLANNED_DIFFICULTY_LABEL[diff]})`);
      }
    }
  }
  return lines;
}

export function markSubjectDifficultyCovered(
  subjects: PlannedQuestionSubject[],
  subjectId: string,
  dificuldade: PlannedSubjectDifficulty,
  questaoId: string
): PlannedQuestionSubject[] {
  const now = Date.now();
  return subjects.map((s) => {
    if (s.id !== subjectId) return s;
    return {
      ...s,
      byDifficulty: {
        ...s.byDifficulty,
        [dificuldade]: { covered: true, questaoId, coveredAt: now, cancelled: false },
      },
    };
  });
}

export function markSubjectDifficultyCancelled(
  subjects: PlannedQuestionSubject[],
  subjectId: string,
  dificuldade: PlannedSubjectDifficulty,
  reason: string
): PlannedQuestionSubject[] {
  const now = Date.now();
  return subjects.map((s) => {
    if (s.id !== subjectId) return s;
    return {
      ...s,
      byDifficulty: {
        ...s.byDifficulty,
        [dificuldade]: {
          covered: true,
          cancelled: true,
          cancelledAt: now,
          cancelledReason: reason,
        },
      },
    };
  });
}

/** Reabre célula assunto×dificuldade ao excluir questão vinculada. */
export function reopenSubjectForQuestao(
  subjects: PlannedQuestionSubject[],
  questao: {
    id: string;
    plannedSubjectId?: string;
    plannedSubjectTitle?: string;
    subtema?: string;
    dificuldade?: QuestaoDificuldade;
  }
): { subjects: PlannedQuestionSubject[]; changed: boolean } {
  if (subjects.length === 0) return { subjects, changed: false };

  const subjectId = questao.plannedSubjectId?.trim();
  const diffRaw = questao.dificuldade;
  const dificuldade =
    diffRaw === 'facil' || diffRaw === 'medio' || diffRaw === 'dificil' ? diffRaw : null;

  if (subjectId && dificuldade) {
    let changed = false;
    const next = subjects.map((s) => {
      if (s.id !== subjectId) return s;
      const slot = s.byDifficulty[dificuldade];
      if (!slot.covered) return s;
      if (slot.questaoId && slot.questaoId !== questao.id) return s;
      changed = true;
      return {
        ...s,
        byDifficulty: {
          ...s.byDifficulty,
          [dificuldade]: { covered: false },
        },
      };
    });
    return { subjects: next, changed };
  }

  if (subjectId) {
    let changed = false;
    const next = subjects.map((s) => {
      if (s.id !== subjectId) return s;
      const updated = { ...s.byDifficulty };
      for (const diff of PLANNED_SUBJECT_DIFFICULTIES) {
        const slot = updated[diff];
        if (slot.covered && (!slot.questaoId || slot.questaoId === questao.id)) {
          updated[diff] = { covered: false };
          changed = true;
        }
      }
      return changed ? { ...s, byDifficulty: updated } : s;
    });
    return { subjects: next, changed };
  }

  const title = (questao.plannedSubjectTitle ?? questao.subtema ?? '').trim().toLowerCase();
  if (!title) return { subjects, changed: false };

  let changed = false;
  const next = subjects.map((s) => {
    if (s.title.trim().toLowerCase() !== title) return s;
    const updated = { ...s.byDifficulty };
    for (const diff of PLANNED_SUBJECT_DIFFICULTIES) {
      const slot = updated[diff];
      if (slot.covered && (!slot.questaoId || slot.questaoId === questao.id)) {
        if (!dificuldade || diff === dificuldade) {
          updated[diff] = { covered: false };
          changed = true;
        }
      }
    }
    return changed ? { ...s, byDifficulty: updated } : s;
  });
  return { subjects: next, changed };
}

export function syncPlannedSubjectsWithQuestoes(
  subjects: PlannedQuestionSubject[],
  questoes: Array<{
    id?: string;
    plannedSubjectId?: string;
    plannedSubjectTitle?: string;
    subtema?: string;
    dificuldade?: QuestaoDificuldade;
  }>
): PlannedQuestionSubject[] {
  if (subjects.length === 0 || questoes.length === 0) return subjects;

  return subjects.map((subject) => {
    let next = subject;
    for (const q of questoes) {
      if (!q.id) continue;
      if (q.plannedSubjectId !== subject.id) {
        const titleMatch =
          (q.plannedSubjectTitle ?? q.subtema ?? '').trim().toLowerCase() ===
          subject.title.trim().toLowerCase();
        if (!titleMatch) continue;
      }
      const diff =
        q.dificuldade === 'facil' || q.dificuldade === 'medio' || q.dificuldade === 'dificil'
          ? q.dificuldade
          : 'medio';
      const slot = next.byDifficulty[diff];
      if (slot.covered) continue;
      next = {
        ...next,
        byDifficulty: {
          ...next.byDifficulty,
          [diff]: {
            covered: true,
            questaoId: q.id,
            coveredAt: slot.coveredAt ?? Date.now(),
          },
        },
      };
    }
    return next;
  });
}

export function getEffectiveTopicCapacity(
  subjects: PlannedQuestionSubject[],
  storedCapacity?: number
): number {
  if (subjects.length > 0) {
    return clampTopicCapacity(subjects.length * PLANNED_SUBJECT_DIFFICULTIES.length);
  }
  if (storedCapacity != null && Number.isFinite(storedCapacity)) {
    return clampTopicCapacity(storedCapacity);
  }
  return TOPIC_CAPACITY_MIN;
}
