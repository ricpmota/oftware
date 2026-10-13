import { CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS } from '@/lib/50kgdepois/interviewChapters';
import type { CinquentaKgDepoisStatus } from '@/types/cinquentaKgDepois';

export function countTotalInterviewQuestions(): number {
  return CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS.reduce((sum, ch) => sum + ch.questions.length, 0);
}

export function computeInterviewProgressPercent(
  answers: Record<string, { answer?: string; skipped?: boolean }>
): number {
  const total = countTotalInterviewQuestions();
  if (total === 0) return 0;

  let answered = 0;
  for (const chapter of CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS) {
    for (const question of chapter.questions) {
      const record = answers[question.id];
      const text = record?.answer?.trim() || '';
      if (text.length > 0 || record?.skipped) answered += 1;
    }
  }

  return Math.min(100, Math.round((answered / total) * 100));
}

export function computeChapterProgressPercent(
  chapterIndex: number,
  answers: Record<string, { answer?: string; skipped?: boolean }>
): number {
  const chapter = CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS[chapterIndex];
  if (!chapter || chapter.questions.length === 0) return 0;

  let answered = 0;
  for (const question of chapter.questions) {
    const record = answers[question.id];
    const text = record?.answer?.trim() || '';
    if (text.length > 0 || record?.skipped) answered += 1;
  }

  return Math.round((answered / chapter.questions.length) * 100);
}

export function deriveParticipantStatus(
  progressPercent: number,
  currentPhase: string,
  explicitStatus?: CinquentaKgDepoisStatus
): CinquentaKgDepoisStatus {
  if (explicitStatus === 'COMPLETED' || currentPhase === 'complete') return 'COMPLETED';
  if (progressPercent > 0 || currentPhase !== 'intro') return 'IN_PROGRESS';
  return 'NOT_STARTED';
}
