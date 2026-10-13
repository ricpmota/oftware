'use client';

import type { ReactNode } from 'react';
import type { WorkoutEditorAppearance } from '@/components/personal/create/workoutEditorAppearance';
import { WorkoutBuilderPanel } from '@/components/personal/create/WorkoutBuilderPanel';
import type { SelectedExerciseDraft } from '@/lib/personal/workoutDraft';
import type { TrainingExerciseSeries, TrainingIntercalatedOccurrence } from '@/lib/personal/trainingExerciseSeries';

type PersonalCreateWorkoutDesktopProps = {
  catalog: ReactNode;
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
  responsive?: boolean;
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

export function PersonalCreateWorkoutDesktop({
  catalog,
  title,
  exercises,
  expandedIds,
  gifUrlFor,
  readOnly,
  dirty,
  saving,
  canSave,
  saveLabel,
  headerExtra,
  toolbar,
  emptyTitle,
  emptyHint,
  responsive = false,
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
}: PersonalCreateWorkoutDesktopProps) {
  const desktopCatalogHeight = fillViewport
    ? 'lg:h-full lg:min-h-0 lg:max-h-none'
    : 'lg:h-[min(72dvh,46rem)] lg:min-h-[32rem] lg:max-h-[min(72dvh,46rem)] lg:shrink-0';

  return (
    <div
      className={`${
        responsive
          ? `flex flex-col lg:grid ${fillViewport ? 'lg:flex-1 lg:min-h-0 lg:h-full lg:items-stretch' : 'lg:items-start'}`
          : 'hidden lg:grid lg:items-start'
      } gap-3`}
      style={{
        gridTemplateColumns: 'minmax(280px, 0.85fr) minmax(320px, 1.15fr)',
      }}
    >
      <div
        className={`min-w-0 flex flex-col ${
          fillViewport
            ? 'h-full min-h-0'
            : responsive
            ? `h-[min(80vh,44rem)] min-h-[28rem] ${desktopCatalogHeight}`
            : `h-[min(72dvh,46rem)] min-h-[32rem] max-h-[min(72dvh,46rem)] shrink-0`
        }`}
      >
        {catalog}
      </div>
      <div className={`min-w-0 ${fillViewport ? 'h-full min-h-0' : 'min-h-[28rem] lg:min-h-[min(72dvh,46rem)]'}`}>
        <WorkoutBuilderPanel
          title={title}
          exercises={exercises}
          expandedIds={expandedIds}
          gifUrlFor={gifUrlFor}
          readOnly={readOnly}
          dirty={dirty}
          saving={saving}
          canSave={canSave}
          saveLabel={saveLabel}
          headerExtra={headerExtra}
          toolbar={toolbar}
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
          fillViewport={fillViewport}
          appearance={appearance}
          onToggleExpanded={onToggleExpanded}
          onSeriesChange={onSeriesChange}
          onIntercalationsChange={onIntercalationsChange}
          onPickIntercalation={onPickIntercalation}
          onRepeatIntercalation={onRepeatIntercalation}
          onTrainerNoteChange={onTrainerNoteChange}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onReorder={onReorder}
          onSave={onSave}
        />
      </div>
    </div>
  );
}

export default PersonalCreateWorkoutDesktop;
