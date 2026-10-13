'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import MentorModuleAccordion from '@/components/mentorados/MentorModuleAccordion';
import MentorProgressBar from '@/components/mentorados/MentorProgressBar';
import type { MentorModuleDto, MentorTrailCardDto } from '@/types/mentorTrail';

export default function MentorTrailDrawer({
  open,
  onClose,
  trail,
  modules,
  currentLessonId,
}: {
  open: boolean;
  onClose: () => void;
  trail: MentorTrailCardDto;
  modules: MentorModuleDto[];
  currentLessonId?: string;
}) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    setMounted(open);
  }, [open]);
  if (!mounted && !open) return null;
  const currentModule = modules.find((m) => m.lessons.some((l) => l.id === currentLessonId));

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar conteúdo da trilha"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-2xl bg-[var(--surface-modal)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Conteúdo da trilha</p>
            <p className="text-xs text-[var(--text-secondary)]">{trail.progressPercent}% concluído</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2" aria-label="Fechar">
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div className="overflow-y-auto p-3" style={{ maxHeight: '70vh' }}>
          <div className="mb-3 px-1">
            <MentorProgressBar percent={trail.progressPercent} size="sm" />
          </div>
          <MentorModuleAccordion
            modules={modules}
            trailSlug={trail.slug}
            currentLessonId={currentLessonId}
            defaultOpenIds={currentModule ? [currentModule.id] : undefined}
          />
        </div>
      </div>
    </div>
  );
}
