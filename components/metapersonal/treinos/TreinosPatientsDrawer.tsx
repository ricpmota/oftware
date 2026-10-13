'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRange, MessageSquare, Pencil, Play, Power, StickyNote, Trash2, X } from 'lucide-react';
import { translateEquipment, translateExerciseName, translateTarget } from '@/data/exerciseTranslations';
import {
  formatTrainingSeriesSummary,
  getEffectiveRestSec,
} from '@/lib/personal/trainingExerciseSeries';
import {
  TREINOS_WEEKDAY_LABELS,
  pacienteDisplayName,
  type TreinosSelectedPatient,
} from './treinosCentral.types';
import { coverageLabel, type PlannerBoardCard, type PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import { formatPlannerDateLong } from '@/lib/metapersonal/treinosPlannerNav';
import { gymMediaBelongsToPatient, type ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';

type Props = {
  open: boolean;
  card: PlannerBoardCard | null;
  selectedPatients: TreinosSelectedPatient[];
  dateLabel?: string;
  onOpenInWeek?: () => void;
  onClose: () => void;
  onAddObservacao?: (pacienteId: string) => void;
  onEditWorkout?: (pacienteId: string) => void;
  onToggleActive?: (pacienteId: string) => void;
  onDeleteWorkout?: (pacienteId: string) => void;
};

function mediaForExercise(patient: PlannerCardPatient | undefined, exerciseId: string): ExerciseGymMedia[] {
  if (!patient) return [];
  const id = String(exerciseId || '').trim();
  return (patient.gymMedia || []).filter(
    (item) =>
      item.exerciseId === id &&
      gymMediaBelongsToPatient(item, { id: patient.pacienteId, userId: patient.patientUserId })
  );
}

export function TreinosPatientsDrawer({
  open,
  card,
  selectedPatients,
  dateLabel,
  onOpenInWeek,
  onClose,
  onAddObservacao,
  onEditWorkout,
  onToggleActive,
  onDeleteWorkout,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [activePacienteId, setActivePacienteId] = useState<string | null>(null);
  const [video, setVideo] = useState<ExerciseGymMedia | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open || !card) return;
    setVideo(null);
    setActivePacienteId(card.patients[0]?.pacienteId || selectedPatients[0]?.pacienteId || null);
  }, [open, card, selectedPatients]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (video) {
        setVideo(null);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, video]);

  if (!open || !portalReady || !card) return null;

  const weekday = TREINOS_WEEKDAY_LABELS[card.weekday].long;
  const existingById = new Map(card.patients.map((item) => [item.pacienteId, item]));
  const isDraft = card.source === 'draft';
  const activePatient =
    selectedPatients.find((item) => item.pacienteId === activePacienteId) || selectedPatients[0] || null;
  const match = activePatient ? existingById.get(activePatient.pacienteId) : card.patients[0];
  const name = match?.name || (activePatient ? pacienteDisplayName(activePatient) : 'Paciente');
  const severalPatients = selectedPatients.length > 1;
  const canAct = Boolean(match && (onAddObservacao || onEditWorkout || onToggleActive || onDeleteWorkout));

  return createPortal(
    <>
      <div className="fixed inset-0 z-[88] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Treino">
        <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
        <div className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gray-900">{card.title}</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {dateLabel ? formatPlannerDateLong(dateLabel) : weekday}
                {match?.active === false ? ' · Inativo' : isDraft ? ' · Não publicado' : ' · Programado'}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-800">{name}</p>
              {onOpenInWeek ? (
                <button
                  type="button"
                  onClick={onOpenInWeek}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  Ver nesta semana
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {severalPatients ? (
            <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-5 py-2">
              {selectedPatients.map((item) => {
                const covered = existingById.get(item.pacienteId);
                const active = item.pacienteId === (activePatient?.pacienteId || match?.pacienteId);
                return (
                  <button
                    key={item.pacienteId}
                    type="button"
                    onClick={() => setActivePacienteId(item.pacienteId)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                      active ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {covered?.name || pacienteDisplayName(item)}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {!match ? (
              <p className="text-sm text-gray-500">
                {isDraft
                  ? 'Publique o planejamento antes de ver o treino.'
                  : 'Este paciente não possui este treino nesta data.'}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Observação do treino</p>
                    <p className="mt-1 text-sm text-gray-800">
                      {match.sessionTrainerNotes?.trim() || <span className="text-gray-500">Sem orientação do personal</span>}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      <MessageSquare className="h-3 w-3" />
                      Feedback do paciente
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                      {match.patientNotes?.trim() || <span className="text-gray-500">Sem feedback do paciente</span>}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Exercícios
                    <span className="ml-2 text-xs font-medium text-gray-400">{coverageLabel(card)}</span>
                  </p>
                  <ul className="mt-2 space-y-3">
                    {(match.exercises || []).map((exercise, index) => {
                      const media = mediaForExercise(match, exercise.exerciseId);
                      const videoFile = media.find((file) => file.kind === 'video' && file.url);
                      const photos = media.filter((file) => file.kind !== 'video' && file.url);
                      const meta = [
                        exercise.target ? translateTarget(exercise.target) : '',
                        exercise.equipment && exercise.equipment !== 'body weight'
                          ? translateEquipment(exercise.equipment)
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <li key={`${match.pacienteId}-${exercise.id || exercise.exerciseId}-${exercise.order}`} className="rounded-xl border border-gray-200 p-3">
                          <div className="flex gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900">{translateExerciseName(exercise.name)}</p>
                              {meta ? <p className="mt-0.5 text-xs text-gray-500">{meta}</p> : null}
                              {exercise.prescription ? (
                                <p className="mt-1 text-sm text-gray-700">
                                  {formatTrainingSeriesSummary(exercise.prescription)}
                                  {` · ${getEffectiveRestSec(exercise.prescription)}s descanso`}
                                </p>
                              ) : null}
                              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                Orientação do personal
                              </p>
                              <p className="text-sm text-gray-800">
                                {exercise.trainerNote?.trim() || <span className="text-gray-500">Sem orientação</span>}
                              </p>
                            </div>
                            {exercise.gifUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={exercise.gifUrl}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-lg bg-gray-100 object-cover"
                              />
                            ) : null}
                          </div>

                          {videoFile ? (
                            <button
                              type="button"
                              onClick={() => setVideo(videoFile)}
                              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                            >
                              <Play className="h-4 w-4" />
                              Ver vídeo do exercício
                            </button>
                          ) : null}

                          {photos.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {photos.map((file) => (
                                <button
                                  key={file.id}
                                  type="button"
                                  onClick={() => setVideo(file)}
                                  className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100"
                                  title="Foto do exercício"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={file.url} alt="" className="h-full w-full object-cover" />
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {canAct && match ? (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 px-5 py-3">
              {onAddObservacao ? (
                <button
                  type="button"
                  onClick={() => onAddObservacao(match.pacienteId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  Observação
                </button>
              ) : null}
              {onEditWorkout ? (
                <button
                  type="button"
                  onClick={() => onEditWorkout(match.pacienteId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar treino
                </button>
              ) : null}
              {onToggleActive ? (
                <button
                  type="button"
                  onClick={() => onToggleActive(match.pacienteId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Power className="h-3.5 w-3.5" />
                  {match.active === false ? 'Ativar' : 'Desativar'}
                </button>
              ) : null}
              {onDeleteWorkout ? (
                <button
                  type="button"
                  onClick={() => onDeleteWorkout(match.pacienteId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Apagar
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {video ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-6"
          onClick={() => setVideo(null)}
          role="dialog"
          aria-modal="true"
          aria-label={video.kind === 'video' ? 'Vídeo do exercício' : 'Foto do exercício'}
        >
          <div className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            {video.kind === 'video' ? (
              <video src={video.url} controls autoPlay playsInline className="max-h-[80vh] w-full rounded-xl bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.url} alt="" className="max-h-[80vh] w-full rounded-xl object-contain" />
            )}
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
