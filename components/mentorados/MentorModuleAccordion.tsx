'use client';

import { useState } from 'react';
import MentorLessonItem from '@/components/mentorados/MentorLessonItem';
import MentorProgressBar from '@/components/mentorados/MentorProgressBar';
import type { MentorModuleDto } from '@/types/mentorTrail';

export default function MentorModuleAccordion({
  modules,
  trailSlug,
  currentLessonId,
  defaultOpenIds,
}: {
  modules: MentorModuleDto[];
  trailSlug: string;
  currentLessonId?: string;
  defaultOpenIds?: string[];
}) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(defaultOpenIds || modules.map((m) => m.id))
  );

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {modules.map((mod) => {
        const expanded = open.has(mod.id);
        return (
          <div key={mod.id} className="rounded-xl border border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => toggle(mod.id)}
              aria-expanded={expanded}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--text-primary)]">
                  {expanded ? '⌄' : '›'} {mod.title}
                </span>
                <span className="block text-xs text-[var(--text-secondary)]">
                  {mod.isCompleted
                    ? '✓ Módulo concluído'
                    : `${mod.completedLessons} de ${mod.lessonCount} aulas`}
                </span>
              </span>
              <span className="w-16 shrink-0">
                <MentorProgressBar percent={mod.progressPercent} size="sm" />
              </span>
            </button>
            {expanded ? (
              <div className="border-t border-[var(--border-default)] px-2 py-2">
                {mod.lessons.map((lesson) => (
                  <MentorLessonItem
                    key={lesson.id}
                    lesson={lesson}
                    current={lesson.id === currentLessonId}
                    href={`/videosmentorados/trilhas/${encodeURIComponent(trailSlug)}/aulas/${encodeURIComponent(lesson.slug)}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
