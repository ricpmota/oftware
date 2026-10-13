'use client';

import Link from 'next/link';
import MentorProgressBar from '@/components/mentorados/MentorProgressBar';
import { formatMentorHoursMinutes } from '@/lib/mentorados/progressMath';
import type { MentorTrailCardDto } from '@/types/mentorTrail';

export default function MentorJourneyCard({
  trail,
  firstAccess,
}: {
  trail: MentorTrailCardDto;
  firstAccess: boolean;
}) {
  const href = trail.continueLessonSlug
    ? `/videosmentorados/trilhas/${encodeURIComponent(trail.slug)}/aulas/${encodeURIComponent(trail.continueLessonSlug)}`
    : `/videosmentorados/trilhas/${encodeURIComponent(trail.slug)}`;

  if (firstAccess) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Comece sua jornada</h2>
        <article className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Trilha
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{trail.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            {trail.shortDescription ||
              trail.description ||
              'Tudo o que você precisa para começar a utilizar o método e a plataforma Oftware.'}
          </p>
          <Link
            href={href}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)]"
          >
            Começar agora
          </Link>
        </article>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Sua jornada</h2>
      <article className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{trail.title}</h3>
        <div className="mt-4 max-w-xl">
          <MentorProgressBar
            percent={trail.progressPercent}
            label={`${trail.completedLessons} de ${trail.lessonCount} aulas concluídas`}
          />
        </div>
        {trail.continueLessonTitle ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Última atividade: {trail.continueLessonTitle}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {trail.moduleCount} {trail.moduleCount === 1 ? 'módulo' : 'módulos'} • {trail.lessonCount}{' '}
          {trail.lessonCount === 1 ? 'aula' : 'aulas'}
          {trail.durationSeconds ? ` • ${formatMentorHoursMinutes(trail.durationSeconds)}` : ''}
        </p>
        <Link
          href={href}
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)]"
        >
          {trail.completedLessons > 0 ? 'Continuar treinamento' : 'Começar treinamento'}
        </Link>
      </article>
    </section>
  );
}
