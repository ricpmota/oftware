'use client';

import Link from 'next/link';
import { formatMentorHoursMinutes } from '@/lib/mentorados/progressMath';
import type { MentorLessonNavDto } from '@/types/mentorTrail';

export default function MentorLessonNavigation({
  previous,
  next,
  trailSlug,
  moduleJustCompleted,
  nextModuleTitle,
  trailJustCompleted,
  trailTitle,
}: {
  previous: MentorLessonNavDto | null;
  next: MentorLessonNavDto | null;
  trailSlug: string;
  moduleJustCompleted?: boolean;
  nextModuleTitle?: string;
  trailJustCompleted?: boolean;
  trailTitle?: string;
}) {
  const hrefFor = (lesson: MentorLessonNavDto) =>
    `/videosmentorados/trilhas/${encodeURIComponent(trailSlug)}/aulas/${encodeURIComponent(lesson.slug)}`;

  return (
    <div className="space-y-4">
      {trailJustCompleted ? (
        <div className="rounded-xl border border-[var(--border-default)] p-4">
          <p className="text-sm font-semibold text-[var(--state-success)]">✓ Trilha concluída</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Parabéns, você concluiu a {trailTitle || 'trilha'}.
          </p>
        </div>
      ) : moduleJustCompleted ? (
        <div className="rounded-xl border border-[var(--border-default)] p-4">
          <p className="text-sm font-semibold text-[var(--state-success)]">✓ Módulo concluído</p>
          {nextModuleTitle ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Próximo módulo: {nextModuleTitle}
            </p>
          ) : null}
        </div>
      ) : null}

      {next && !trailJustCompleted ? (
        <div className="rounded-xl border border-[var(--border-default)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Próxima aula
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{next.title}</p>
          {next.durationSeconds ? (
            <p className="text-xs text-[var(--text-secondary)]">
              {formatMentorHoursMinutes(next.durationSeconds)}
            </p>
          ) : null}
          <Link
            href={hrefFor(next)}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-primary)]"
          >
            Próxima aula →
          </Link>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {previous ? (
          <Link
            href={hrefFor(previous)}
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--text-secondary)]"
          >
            ← Aula anterior
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={hrefFor(next)}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--text-primary)]"
          >
            Próxima aula →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
