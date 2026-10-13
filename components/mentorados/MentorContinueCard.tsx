'use client';

import Link from 'next/link';
import MentorProgressBar from '@/components/mentorados/MentorProgressBar';
import { formatMentorHoursMinutes } from '@/lib/mentorados/progressMath';
import { formatDuration } from '@/utils/formatDuration';
import type { MentorContinueWatchingDto } from '@/types/mentorTrail';

function lessonHref(item: MentorContinueWatchingDto) {
  if (item.trailSlug) {
    return `/videosmentorados/trilhas/${encodeURIComponent(item.trailSlug)}/aulas/${encodeURIComponent(item.slug)}`;
  }
  return `/videosmentorados/${encodeURIComponent(item.slug)}`;
}

export default function MentorContinueCard({ item }: { item: MentorContinueWatchingDto }) {
  const stopped = formatDuration(item.lastPositionSeconds);
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Continue estudando</h2>
      <article className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] md:grid md:grid-cols-[minmax(0,280px)_1fr]">
        <div className="aspect-video bg-slate-100 md:aspect-auto md:min-h-[180px]">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center text-4xl">▶</div>
          )}
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-6">
          {item.trailTitle ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {item.trailTitle}
            </p>
          ) : null}
          <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{item.title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {item.moduleTitle ? `Módulo • ${item.moduleTitle}` : 'Aula'}
            {item.durationSeconds ? ` • ${formatMentorHoursMinutes(item.durationSeconds)}` : ''}
          </p>
          <div className="mt-4">
            <MentorProgressBar
              percent={item.watchedPercentage}
              label={`Você parou em ${stopped}`}
            />
          </div>
          <Link
            href={lessonHref(item)}
            className="mt-5 inline-flex min-h-11 w-fit items-center rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)]"
          >
            Continuar aula
          </Link>
        </div>
      </article>
    </section>
  );
}
