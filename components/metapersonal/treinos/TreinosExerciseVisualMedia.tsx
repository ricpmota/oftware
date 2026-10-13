'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dumbbell, ImagePlus, Play, Plus } from 'lucide-react';
import { GymMediaLoopVideo } from '@/components/personal/run/GymMediaLoopVideo';
import { WorkoutRunGymMediaSheet } from '@/components/personal/run/WorkoutRunGymMediaSheet';
import {
  exerciseDemoGifUrl,
  exerciseLookupKeyFromDraft,
  gymMediaListPresentation,
  gymMediaUploadTarget,
  summarizeExerciseGymMedia,
  type GymMediaOverrides,
  type GymMediaPatientRow,
} from '@/lib/metapersonal/editWorkoutGymMedia';
import type { PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import type { ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';

export type TreinosGymSheetTarget = {
  pacienteId: string;
  patientUserId: string;
  name: string;
  exerciseId: string;
  exerciseName: string;
};

type VisualExercise = {
  editorKey: string;
  exerciseId: string;
  name: string;
  gifUrl?: string;
};

function DemoGif({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100" aria-hidden>
        <Dumbbell className="h-5 w-5 text-gray-300" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Demonstração de ${label}`}
      className="h-20 w-20 rounded-lg bg-gray-100 object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function GymThumb({
  media,
  onOpen,
}: {
  media: ExerciseGymMedia;
  onOpen: () => void;
}) {
  const presentation = gymMediaListPresentation(media.kind);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative h-20 w-20 overflow-hidden rounded-lg bg-gray-900"
      title={media.kind === 'video' ? 'Reproduzir vídeo' : 'Ampliar foto'}
    >
      {presentation === 'lazy-image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-slate-800">
          <Play className="h-6 w-6 fill-white text-white" />
        </span>
      )}
    </button>
  );
}

export function TreinosGymMediaLightbox({
  preview,
  onClose,
}: {
  preview: ExerciseGymMedia | null;
  onClose: () => void;
}) {
  if (!preview) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={preview.kind === 'video' ? 'Vídeo do aparelho' : 'Foto do aparelho'}
    >
      <div className="max-h-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
        {preview.kind === 'video' ? (
          <GymMediaLoopVideo src={preview.url} className="max-h-[80vh] w-full rounded-xl" playing />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt="Aparelho na academia" className="max-h-[80vh] rounded-xl object-contain" />
        )}
      </div>
    </div>,
    document.body
  );
}

export function TreinosGymMediaSheetHost({
  target,
  media,
  uploading,
  error,
  onClose,
  onPickFile,
  onRemove,
}: {
  target: TreinosGymSheetTarget | null;
  media: ExerciseGymMedia | null;
  uploading: boolean;
  error: string | null;
  onClose: () => void;
  onPickFile: (file: File) => void;
  onRemove: () => void;
}) {
  if (!target) return null;
  return createPortal(
    <div className="fixed inset-0 z-[110]">
      <WorkoutRunGymMediaSheet
        open
        exerciseName={`${target.exerciseName} · ${target.name}`}
        media={media}
        canEdit
        uploading={uploading}
        error={error}
        onClose={onClose}
        onPickFile={onPickFile}
        onRemove={onRemove}
      />
    </div>,
    document.body
  );
}

function PatientMediaRow({
  row,
  onPreview,
  onManage,
}: {
  row: GymMediaPatientRow;
  onPreview: (media: ExerciseGymMedia) => void;
  onManage: (row: GymMediaPatientRow) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{row.name}</p>
        {row.media ? (
          <p className="text-[11px] text-gray-500">{row.media.kind === 'video' ? 'Vídeo' : 'Foto'}</p>
        ) : (
          <p className="text-[11px] text-gray-500">Sem mídia</p>
        )}
      </div>
      {row.media ? <GymThumb media={row.media} onOpen={() => onPreview(row.media!)} /> : null}
      <button
        type="button"
        onClick={() => onManage(row)}
        className="shrink-0 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
      >
        {row.media ? 'Alterar' : 'Adicionar mídia'}
      </button>
    </li>
  );
}

export function TreinosExerciseVisualMedia({
  exercise,
  patients,
  overrides,
  onPreview,
  onManage,
}: {
  exercise: VisualExercise;
  patients: PlannerCardPatient[];
  overrides: GymMediaOverrides;
  onPreview: (media: ExerciseGymMedia) => void;
  onManage: (target: TreinosGymSheetTarget) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const key = useMemo(() => exerciseLookupKeyFromDraft(exercise), [exercise]);
  const gifSrc = exerciseDemoGifUrl(exercise);
  const summary = useMemo(
    () => summarizeExerciseGymMedia(patients, key, overrides),
    [patients, key, overrides]
  );
  const single = summary.total === 1;
  const singleRow = single ? summary.rows[0] : null;

  const openManage = (row: GymMediaPatientRow) => {
    const target = gymMediaUploadTarget(row);
    if (!target.pacienteId || !target.exerciseId) return;
    onManage({
      pacienteId: target.pacienteId,
      patientUserId: row.patientUserId,
      name: row.name,
      exerciseId: target.exerciseId,
      exerciseName: exercise.name,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Demonstração</p>
        <div className="mt-1.5">
          <DemoGif src={gifSrc} label={exercise.name} />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Aparelho na academia
        </p>
        {single && singleRow ? (
          <div className="mt-1.5 space-y-1.5">
            {singleRow.media ? (
              <>
                <GymThumb media={singleRow.media} onOpen={() => onPreview(singleRow.media!)} />
                <button
                  type="button"
                  onClick={() => openManage(singleRow)}
                  className="block text-[11px] font-semibold text-emerald-700 hover:underline"
                >
                  Alterar
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500">Nenhuma foto ou vídeo cadastrado</p>
                <button
                  type="button"
                  onClick={() => openManage(singleRow)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar mídia
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-1.5 space-y-1.5">
            <p className="text-xs text-gray-600">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
              {summary.withMedia}/{summary.total} pacientes possuem mídia
            </p>
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {expanded ? 'Ocultar mídias' : 'Ver mídias'}
            </button>
          </div>
        )}
      </div>
      {!single && expanded ? (
        <ul className="col-span-2 space-y-2">
          {summary.rows.map((row) => (
            <PatientMediaRow
              key={row.pacienteId}
              row={row}
              onPreview={onPreview}
              onManage={openManage}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
