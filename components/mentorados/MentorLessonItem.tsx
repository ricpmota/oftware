'use client';

import Link from 'next/link';
import type { LessonProgressStatus, MentorLessonNavDto } from '@/types/mentorTrail';

function statusIcon(status: LessonProgressStatus, current: boolean) {
  if (current) return '▶';
  if (status === 'completed') return '✓';
  if (status === 'in_progress') return '▶';
  return '○';
}

export default function MentorLessonItem({
  lesson,
  href,
  current,
}: {
  lesson: MentorLessonNavDto;
  href: string;
  current?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={`flex min-h-11 items-start gap-2 rounded-lg px-2 py-2 text-sm transition-colors duration-150 ${
        current
          ? 'bg-[var(--brand-primary)]/8 font-semibold text-[var(--text-primary)]'
          : 'text-[var(--text-primary)] hover:bg-slate-50'
      }`}
    >
      <span
        className={`mt-0.5 w-4 shrink-0 text-center text-xs ${
          lesson.status === 'completed' ? 'text-[var(--state-success)]' : 'text-[var(--text-secondary)]'
        }`}
        aria-hidden
      >
        {statusIcon(lesson.status, !!current)}
      </span>
      <span className="min-w-0 flex-1 leading-snug">{lesson.title}</span>
    </Link>
  );
}
