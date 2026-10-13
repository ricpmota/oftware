'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, Copy, GripVertical, Trash2 } from 'lucide-react';
import { ExerciseSeriesEditor } from '@/components/personal/ExerciseSeriesEditor';
import { ExerciseTrainerNoteField } from '@/components/personal/ExerciseTrainerNoteField';
import {
  translateEquipment,
  translateExerciseName,
  translateTarget,
} from '@/data/exerciseTranslations';
import { formatTrainingSeriesSummary } from '@/lib/personal/trainingExerciseSeries';
import type { SelectedExerciseDraft } from '@/lib/personal/workoutDraft';
import { LIGHT_EDITOR, type WorkoutEditorAppearance } from '@/components/personal/create/workoutEditorAppearance';

type WorkoutExerciseBuilderCardProps = {
  exercise: SelectedExerciseDraft;
  index: number;
  expanded: boolean;
  gifSrc: string;
  readOnly?: boolean;
  appearance?: WorkoutEditorAppearance;
  onToggleExpanded: (draftId: string) => void;
  onSeriesChange: (draftId: string, series: TrainingExerciseSeries[]) => void;
  onIntercalationsChange?: (draftId: string, intercalations: TrainingIntercalatedOccurrence[]) => void;
  onPickIntercalation?: (draftId: string, afterSeriesId: string) => void;
  onRepeatIntercalation?: (
    draftId: string,
    afterSeriesId: string,
    source: TrainingIntercalatedOccurrence
  ) => void;
  onTrainerNoteChange: (draftId: string, trainerNote: string) => void;
  onDuplicate: (draftId: string) => void;
  onRemove: (draftId: string) => void;
};

export function WorkoutExerciseBuilderCard({
  exercise,
  index,
  expanded,
  gifSrc,
  readOnly = false,
  appearance = 'dark',
  onToggleExpanded,
  onSeriesChange,
  onIntercalationsChange,
  onPickIntercalation,
  onRepeatIntercalation,
  onTrainerNoteChange,
  onDuplicate,
  onRemove,
}: WorkoutExerciseBuilderCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.draftId,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const name = translateExerciseName(exercise.name);
  const meta = [translateTarget(exercise.target), translateEquipment(exercise.equipment)]
    .filter(Boolean)
    .join(' · ');
  const light = appearance === 'light';

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border overflow-hidden ${
        light ? LIGHT_EDITOR.card : 'border-white/10 bg-white/[0.04]'
      } ${isDragging ? (light ? 'opacity-70 ring-1 ring-zinc-400' : 'opacity-70 ring-1 ring-[#4CCB7A]/40') : ''}`}
    >
      <div className={`flex items-start gap-1.5 px-2 pt-2 ${light ? 'bg-white' : ''}`}>
        {readOnly ? (
          <span className="mt-1 w-8 h-8 shrink-0" aria-hidden />
        ) : (
          <button
            type="button"
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md cursor-grab active:cursor-grabbing ${
              light
                ? LIGHT_EDITOR.btnGhost
                : 'text-[#E8EDED]/40 hover:bg-white/10 hover:text-[#E8EDED]'
            }`}
            aria-label={`Reordenar ${name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onToggleExpanded(exercise.draftId)}
          aria-expanded={expanded}
          aria-label={expanded ? `Recolher ${name}` : `Expandir ${name}`}
          className="flex-1 min-w-0 text-left py-0.5"
        >
          <p className={`text-sm font-semibold leading-snug ${light ? LIGHT_EDITOR.title : 'text-[#E8EDED]'}`}>
            <span className={`tabular-nums mr-1 ${light ? 'text-zinc-400' : 'text-[#4CCB7A]'}`}>{index + 1}.</span>
            {name}
          </p>
          {expanded ? (
            <p className={`text-[10px] truncate mt-0.5 ${light ? LIGHT_EDITOR.muted : 'text-[#E8EDED]/45'}`}>{meta}</p>
          ) : (
            <p className={`text-[11px] mt-0.5 line-clamp-2 ${light ? 'text-zinc-600' : 'text-[#E8EDED]/65'}`}>
              {formatTrainingSeriesSummary(exercise.prescription)}
              {exercise.trainerNote?.trim() ? ' · orientação' : ''}
            </p>
          )}
        </button>

        <button
          type="button"
          onClick={() => onToggleExpanded(exercise.draftId)}
          aria-expanded={expanded}
          aria-label={expanded ? `Recolher ${name}` : `Expandir ${name}`}
          className={`p-1.5 rounded-md shrink-0 ${
            light ? LIGHT_EDITOR.btnGhost : 'text-[#E8EDED]/50 hover:bg-white/10'
          }`}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {expanded ? (
        <div className={`px-3 pb-3 pt-2 space-y-3 ${light ? 'border-t border-zinc-100 bg-zinc-50' : ''}`}>
          <ExerciseSeriesEditor
            series={exercise.prescription.series}
            onChange={(series) => onSeriesChange(exercise.draftId, series)}
            intercalations={exercise.prescription.intercalations || []}
            onIntercalationsChange={(intercalations) =>
              onIntercalationsChange?.(exercise.draftId, intercalations)
            }
            onPickIntercalation={
              readOnly ? undefined : (afterSeriesId) => onPickIntercalation?.(exercise.draftId, afterSeriesId)
            }
            onRepeatIntercalation={
              readOnly
                ? undefined
                : (afterSeriesId, source) =>
                    onRepeatIntercalation?.(exercise.draftId, afterSeriesId, source)
            }
            hostGifSrc={gifSrc}
            readOnly={readOnly}
            variant="desktop"
            appearance={appearance}
          />

          <ExerciseTrainerNoteField
            value={exercise.trainerNote || ''}
            readOnly={readOnly}
            appearance={appearance}
            onChange={(note) => onTrainerNoteChange(exercise.draftId, note)}
          />

          {!readOnly ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => onDuplicate(exercise.draftId)}
                aria-label={`Duplicar ${name}`}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold ${
                  light
                    ? LIGHT_EDITOR.btnQuiet
                    : 'text-[#E8EDED]/80 bg-white/10 hover:bg-white/15'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicar
              </button>
              <button
                type="button"
                onClick={() => onRemove(exercise.draftId)}
                aria-label={`Remover ${name}`}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold ${
                  light ? LIGHT_EDITOR.btnDanger : 'text-red-300 bg-red-500/10 hover:bg-red-500/15'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remover
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default WorkoutExerciseBuilderCard;
