'use client';

import MentorModuleAccordion from '@/components/mentorados/MentorModuleAccordion';
import MentorProgressBar from '@/components/mentorados/MentorProgressBar';
import type { MentorModuleDto, MentorTrailCardDto } from '@/types/mentorTrail';

export default function MentorLessonSidebar({
  trail,
  modules,
  currentLessonId,
}: {
  trail: MentorTrailCardDto;
  modules: MentorModuleDto[];
  currentLessonId?: string;
}) {
  const currentModule = modules.find((m) => m.lessons.some((l) => l.id === currentLessonId));
  return (
    <aside className="hidden h-full min-h-0 flex-col border-l border-[var(--border-default)] bg-[var(--surface-card)] lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:w-[300px] xl:w-[320px]">
      <div className="border-b border-[var(--border-default)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Conteúdo da trilha</p>
        <div className="mt-2">
          <MentorProgressBar
            percent={trail.progressPercent}
            label={`${trail.progressPercent}% concluído`}
            size="sm"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <MentorModuleAccordion
          modules={modules}
          trailSlug={trail.slug}
          currentLessonId={currentLessonId}
          defaultOpenIds={currentModule ? [currentModule.id] : undefined}
        />
      </div>
    </aside>
  );
}
