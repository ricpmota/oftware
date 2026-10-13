'use client';

import type { ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Dumbbell, Save } from 'lucide-react';
import { LIGHT_EDITOR, type WorkoutEditorAppearance } from '@/components/personal/create/workoutEditorAppearance';
import { WorkoutExerciseBuilderCard } from '@/components/personal/create/WorkoutExerciseBuilderCard';
import {
  formatWorkoutDraftSummary,
  getWorkoutDraftSummary,
  type SelectedExerciseDraft,
} from '@/lib/personal/workoutDraft';
import type { TrainingExerciseSeries, TrainingIntercalatedOccurrence } from '@/lib/personal/trainingExerciseSeries';

type WorkoutBuilderPanelProps = {
  title: string;
  exercises: SelectedExerciseDraft[];
  expandedIds: string[];
  gifUrlFor: (exercise: SelectedExerciseDraft) => string;
  readOnly?: boolean;
  dirty?: boolean;
  saving?: boolean;
  canSave?: boolean;
  saveLabel: string;
  headerExtra?: ReactNode;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
  fillViewport?: boolean;
  appearance?: WorkoutEditorAppearance;
  onToggleExpanded: (draftId: string) => void;
  onSeriesChange: (draftId: string, series: TrainingExerciseSeries[]) => void;
  onIntercalationsChange?: (
    draftId: string,
    intercalations: TrainingIntercalatedOccurrence[]
  ) => void;
  onPickIntercalation?: (draftId: string, afterSeriesId: string) => void;
  onRepeatIntercalation?: (
    draftId: string,
    afterSeriesId: string,
    source: TrainingIntercalatedOccurrence
  ) => void;
  onTrainerNoteChange: (draftId: string, trainerNote: string) => void;
  onDuplicate: (draftId: string) => void;
  onRemove: (draftId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSave: () => void;
};

export function WorkoutBuilderPanel({
  title,
  exercises,
  expandedIds,
  gifUrlFor,
  readOnly = false,
  dirty = false,
  saving = false,
  canSave = false,
  saveLabel,
  headerExtra,
  toolbar,
  emptyTitle = 'Seu treino ainda está vazio.',
  emptyHint = 'Escolha exercícios no catálogo ao lado para começar.',
  fillViewport = false,
  appearance = 'dark',
  onToggleExpanded,
  onSeriesChange,
  onIntercalationsChange,
  onPickIntercalation,
  onRepeatIntercalation,
  onTrainerNoteChange,
  onDuplicate,
  onRemove,
  onReorder,
  onSave,
}: WorkoutBuilderPanelProps) {
  const summary = getWorkoutDraftSummary(exercises);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = exercises.findIndex((item) => item.draftId === String(active.id));
    const toIndex = exercises.findIndex((item) => item.draftId === String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(fromIndex, toIndex);
  };

  const light = appearance === 'light';

  return (
    <section
      className={`min-w-0 flex flex-col rounded-xl border ${
        light ? LIGHT_EDITOR.panel : 'border-white/10 bg-[#0A1F44]/70'
      } ${
        fillViewport ? 'h-full min-h-0 max-h-none' : 'min-h-[28rem] lg:min-h-[min(72dvh,46rem)]'
      }`}
    >
      <div
        className={`shrink-0 lg:sticky lg:top-0 lg:z-10 border-b px-3 py-2.5 ${
          light ? LIGHT_EDITOR.header : 'border-white/10 bg-[#0A1F44]/95'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={`text-sm font-semibold truncate ${light ? LIGHT_EDITOR.title : 'text-[#E8EDED]'}`}>
              {title.trim() || 'Treino sendo montado'}
            </h3>
            <p className={`text-[11px] mt-0.5 ${light ? LIGHT_EDITOR.muted : 'text-[#E8EDED]/60'}`}>
              {formatWorkoutDraftSummary(summary)}
            </p>
            {dirty && !readOnly ? (
              <p className={`text-[10px] mt-1 font-medium ${light ? 'text-zinc-600' : 'text-amber-300/90'}`}>
                ● Alterações não salvas
              </p>
            ) : null}
          </div>
          {!readOnly ? (
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || saving}
              className={`shrink-0 h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                light
                  ? LIGHT_EDITOR.btnPrimary
                  : 'bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#45b86d] disabled:opacity-45 disabled:cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Salvando...' : saveLabel}
            </button>
          ) : null}
        </div>
        {toolbar && !readOnly ? <div className="mt-2.5">{toolbar}</div> : null}
        {headerExtra ? <div className="mt-2.5 space-y-2">{headerExtra}</div> : null}
      </div>

      <div className={`p-2.5 space-y-2 ${light ? LIGHT_EDITOR.list : ''} ${fillViewport ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>
        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <Dumbbell className={`w-8 h-8 mb-3 ${light ? 'text-zinc-300' : 'text-[#E8EDED]/25'}`} />
            <p className={`text-sm font-medium ${light ? 'text-zinc-800' : 'text-[#E8EDED]/80'}`}>{emptyTitle}</p>
            <p className={`text-xs mt-1 max-w-[16rem] ${light ? LIGHT_EDITOR.muted : 'text-[#E8EDED]/50'}`}>
              {emptyHint}
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={exercises.map((item) => item.draftId)}
              strategy={verticalListSortingStrategy}
            >
              {exercises.map((exercise, index) => (
                <WorkoutExerciseBuilderCard
                  key={exercise.draftId}
                  exercise={exercise}
                  index={index}
                  expanded={expandedIds.includes(exercise.draftId)}
                  gifSrc={gifUrlFor(exercise)}
                  readOnly={readOnly}
                  appearance={appearance}
                  onToggleExpanded={onToggleExpanded}
                  onSeriesChange={onSeriesChange}
                  onIntercalationsChange={onIntercalationsChange}
                  onPickIntercalation={onPickIntercalation}
                  onRepeatIntercalation={onRepeatIntercalation}
                  onTrainerNoteChange={onTrainerNoteChange}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}

export default WorkoutBuilderPanel;
