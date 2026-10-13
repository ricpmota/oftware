'use client';

import { Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import { translateExerciseName } from '@/data/exerciseTranslations';
import {
  formatWorkoutDraftSummary,
  getWorkoutDraftSummary,
} from '@/lib/personal/workoutDraft';
import type { PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';

function formatUpdatedAt(value?: Date): string {
  if (!value) return '';
  return value.toLocaleDateString('pt-BR');
}

export function PersonalWorkoutTemplateCard({
  template,
  readOnly = false,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: PersonalWorkoutTemplate;
  readOnly?: boolean;
  onEdit: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const summary = getWorkoutDraftSummary(template.exercicios);
  const preview = template.exercicios.slice(0, 3);
  const extra = Math.max(0, template.exercicios.length - preview.length);

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[#E8EDED] truncate">{template.nome}</h3>
        {template.descricao ? (
          <p className="text-[11px] text-[#E8EDED]/55 line-clamp-2 mt-0.5">{template.descricao}</p>
        ) : null}
        <p className="text-[11px] text-[#4CCB7A] mt-1">{formatWorkoutDraftSummary(summary)}</p>
        {template.atualizadoEm ? (
          <p className="text-[10px] text-[#E8EDED]/40 mt-0.5">
            Atualizado em {formatUpdatedAt(template.atualizadoEm)}
          </p>
        ) : null}
      </div>

      {preview.length > 0 ? (
        <ul className="text-[11px] text-[#E8EDED]/65 space-y-0.5">
          {preview.map((exercise) => (
            <li key={exercise.id} className="truncate">
              {translateExerciseName(exercise.name)}
            </li>
          ))}
          {extra > 0 ? (
            <li className="text-[#E8EDED]/40">+{extra} exercício{extra === 1 ? '' : 's'}</li>
          ) : null}
        </ul>
      ) : null}

      {readOnly ? (
        <button
          type="button"
          onClick={onEdit}
          className="w-full h-9 rounded-lg border border-[#4CCB7A]/35 bg-[#4CCB7A]/10 text-[#4CCB7A] text-[11px] font-semibold hover:bg-[#4CCB7A]/15 inline-flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          Ver treino
        </button>
      ) : (
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="h-9 rounded-lg border border-[#4CCB7A]/35 bg-[#4CCB7A]/10 text-[#4CCB7A] text-[11px] font-semibold hover:bg-[#4CCB7A]/15 inline-flex items-center justify-center gap-1"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDuplicate?.()}
          className="h-9 rounded-lg border border-white/15 bg-white/10 text-[#E8EDED]/85 text-[11px] font-semibold hover:bg-white/15 inline-flex items-center justify-center gap-1"
        >
          <Copy className="w-3.5 h-3.5" />
          Duplicar
        </button>
        <button
          type="button"
          onClick={() => onDelete?.()}
          className="h-9 rounded-lg border border-red-500/35 bg-red-500/10 text-red-300 text-[11px] font-semibold hover:bg-red-500/15 inline-flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Excluir
        </button>
      </div>
      )}
    </article>
  );
}

export default PersonalWorkoutTemplateCard;
