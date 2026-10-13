'use client';

import { sanitizeTrainerNote } from '@/lib/personal/workoutDraft';
import { WorkoutRunBottomSheet } from '@/components/personal/run/WorkoutRunBottomSheet';

export function WorkoutRunNotesSheet({
  open,
  exerciseName,
  note,
  onClose,
}: {
  open: boolean;
  exerciseName: string;
  note?: string | null;
  onClose: () => void;
}) {
  const text = sanitizeTrainerNote(note);
  return (
    <WorkoutRunBottomSheet
      open={open}
      title="Orientações"
      subtitle={exerciseName}
      labelledBy="run-notes-title"
      onClose={onClose}
    >
      {text ? (
        <p className="text-sm leading-relaxed text-[#E8EDED] whitespace-pre-wrap">{text}</p>
      ) : (
        <p className="text-sm text-[#E8EDED]/55 leading-relaxed">
          Nenhuma orientação salva pelo personal para este exercício.
        </p>
      )}
    </WorkoutRunBottomSheet>
  );
}
