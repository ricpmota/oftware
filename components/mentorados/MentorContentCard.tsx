'use client';

import { Play } from 'lucide-react';
import Link from 'next/link';
import MentorContentTypeBadge from '@/components/mentorados/MentorContentTypeBadge';
import MentorStatusBadge from '@/components/mentorados/MentorStatusBadge';
import { MENTOR_CATEGORY_META } from '@/lib/mentorados/categories';
import { formatDuration } from '@/utils/formatDuration';
import type { MentorContentDto } from '@/types/mentorContent';
import type { MentorLessonPlacement } from '@/types/mentorTrail';

export default function MentorContentCard({
  content,
  placement,
}: {
  content: MentorContentDto;
  placement?: MentorLessonPlacement;
}) {
  const category = MENTOR_CATEGORY_META[content.category];
  const duration =
    typeof content.durationSeconds === 'number' && content.durationSeconds > 0
      ? formatDuration(content.durationSeconds)
      : null;
  const href = placement
    ? `/videosmentorados/trilhas/${encodeURIComponent(placement.trailSlug)}/aulas/${encodeURIComponent(content.slug)}`
    : `/videosmentorados/${encodeURIComponent(content.slug)}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] transition-shadow duration-150 hover:shadow-sm"
    >
      <div className="relative aspect-video overflow-hidden bg-[var(--surface-background)]">
        {content.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <span className="text-3xl" aria-hidden>
              {category?.emoji || '▶'}
            </span>
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white">
            <Play className="ml-0.5 h-5 w-5 fill-white" />
          </span>
        </span>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <MentorContentTypeBadge type={content.type} />
          <MentorStatusBadge status={content.status} isNew={content.isNew} isUpdated={content.isUpdated} />
        </div>
        {duration ? (
          <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {duration}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          {category?.shortName || category?.name || content.category}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] sm:text-[15px]">
          {content.title}
        </h3>
        {placement ? (
          <p className="mt-1 line-clamp-1 text-xs text-[var(--text-secondary)]">
            {placement.trailTitle} • {placement.moduleTitle}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
