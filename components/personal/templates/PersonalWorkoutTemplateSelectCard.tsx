'use client';

import { translateExerciseName } from '@/data/exerciseTranslations';
import {
  formatWorkoutDraftSummary,
  getWorkoutDraftSummary,
} from '@/lib/personal/workoutDraft';
import type { PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';

export function PersonalWorkoutTemplateSelectCard({
  template,
  onUse,
}: {
  template: PersonalWorkoutTemplate;
  onUse: () => void;
}) {
  const summary = getWorkoutDraftSummary(template.exercicios);
  const preview = template.exercicios.slice(0, 3);
  const extra = Math.max(0, template.exercicios.length - preview.length);
  const previewNames = preview
    .map((exercise) => translateExerciseName(exercise.name))
    .join(' · ');

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[#E8EDED] truncate">{template.nome}</h3>
        {template.descricao ? (
          <p className="text-[11px] text-[#E8EDED]/55 line-clamp-2 mt-0.5">{template.descricao}</p>
        ) : null}
        <p className="text-[11px] text-[#4CCB7A] mt-1">{formatWorkoutDraftSummary(summary)}</p>
        {previewNames ? (
          <p className="text-[11px] text-[#E8EDED]/55 mt-0.5 line-clamp-2">
            {previewNames}
            {extra > 0 ? ` · +${extra}` : ''}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onUse}
        className="w-full h-9 rounded-lg bg-[#4CCB7A] text-[#0A1F44] text-xs font-semibold hover:bg-[#45b86d]"
      >
        Usar este treino
      </button>
    </article>
  );
}

export default PersonalWorkoutTemplateSelectCard;
