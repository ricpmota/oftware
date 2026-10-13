'use client';

import Link from 'next/link';
import MentorProgressBar from '@/components/mentorados/MentorProgressBar';
import MentorStatusBadge from '@/components/mentorados/MentorStatusBadge';
import { formatMentorHoursMinutes } from '@/lib/mentorados/progressMath';
import type { MentorTrailCardDto } from '@/types/mentorTrail';

export default function MentorTrailCard({ trail }: { trail: MentorTrailCardDto }) {
  const href = `/videosmentorados/trilhas/${encodeURIComponent(trail.slug)}`;
  const started = trail.completedLessons > 0 || trail.progressPercent > 0;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
      <div className="aspect-[16/8] bg-slate-100">
        {trail.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trail.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-[var(--text-secondary)]">
            Trilha
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Trilha
          </p>
          <MentorStatusBadge status={trail.status} />
        </div>
        <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">{trail.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
          {trail.shortDescription || trail.description || 'Treinamento guiado da Oftware.'}
        </p>
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          {trail.moduleCount} {trail.moduleCount === 1 ? 'módulo' : 'módulos'} • {trail.lessonCount}{' '}
          {trail.lessonCount === 1 ? 'aula' : 'aulas'}
          {trail.durationSeconds ? ` • ${formatMentorHoursMinutes(trail.durationSeconds)}` : ''}
        </p>
        <div className="mt-3">
          {trail.isCompleted ? (
            <p className="text-sm font-medium text-[var(--state-success)]">✓ Concluída</p>
          ) : (
            <MentorProgressBar
              percent={trail.progressPercent}
              size="sm"
              label={
                trail.lessonCount
                  ? `${trail.completedLessons} de ${trail.lessonCount} aulas`
                  : undefined
              }
            />
          )}
        </div>
        <Link
          href={href}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] text-sm font-semibold text-[var(--text-primary)]"
        >
          {trail.isCompleted ? 'Rever trilha' : started ? 'Continuar' : 'Começar trilha'}
        </Link>
      </div>
    </article>
  );
}
