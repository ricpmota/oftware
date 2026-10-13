'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import {
  coveredPatientsFromCard,
  listCardExercises,
  previewBulkWorkoutNotes,
  type BulkNoteConflict,
  type BulkNoteTarget,
} from '@/lib/metapersonal/bulkWorkoutNotes';
import type { PlannerBoardCard } from '@/lib/metapersonal/treinosPlannerGroup';

type Props = {
  open: boolean;
  card: PlannerBoardCard | null;
  lockedPatientId?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: {
    target: BulkNoteTarget;
    text: string;
    conflict: BulkNoteConflict;
    patientIds: string[];
    exerciseKey?: { exerciseId: string; order?: number; name?: string };
  }) => void;
};

export function TreinosAddNoteModal({
  open,
  card,
  lockedPatientId,
  saving,
  onClose,
  onSave,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [target, setTarget] = useState<BulkNoteTarget>('session');
  const [exerciseId, setExerciseId] = useState('');
  const [text, setText] = useState('');
  const [scope, setScope] = useState<'all' | 'some'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [conflict, setConflict] = useState<BulkNoteConflict>('skip-filled');

  const covered = useMemo(() => (card ? coveredPatientsFromCard(card) : []), [card]);
  const exercises = useMemo(() => (card ? listCardExercises(card) : []), [card]);
  const locked = covered.find((item) => item.pacienteId === lockedPatientId);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open || !card) return;
    setTarget('session');
    setExerciseId('');
    setText('');
    setScope('all');
    setSelectedIds(coveredPatientsFromCard(card).map((item) => item.pacienteId));
    setConflict('skip-filled');
  }, [open, card]);

  const patientIds = locked
    ? [locked.pacienteId]
    : scope === 'all'
      ? covered.map((item) => item.pacienteId)
      : selectedIds;

  const selectedExercise =
    exercises.find((item) => `${item.order}:${item.exerciseId || item.name}` === exerciseId) || null;

  const preview = useMemo(() => {
    if (!card) {
      return {
        errors: [] as string[],
        writes: [],
        willChangeCount: 0,
        alreadyHasCount: 0,
        eligiblePatientCount: 0,
      };
    }
    return previewBulkWorkoutNotes({
      source: card.source,
      target,
      text,
      conflict,
      availablePatients: covered,
      patientIds,
      lockedPatientId: locked?.pacienteId,
      exerciseKey: selectedExercise
        ? {
            exerciseId: selectedExercise.exerciseId,
            order: selectedExercise.order,
            name: selectedExercise.name,
          }
        : undefined,
    });
  }, [card, target, text, conflict, covered, patientIds, locked, selectedExercise]);

  if (!open || !portalReady || !card) return null;

  const canSave = !saving && preview.errors.length === 0 && preview.willChangeCount > 0;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Adicionar observação</h2>
            <p className="mt-0.5 text-xs text-gray-500">{card.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <fieldset>
            <legend className="text-sm font-semibold text-gray-900">Onde aplicar a observação?</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="note-target"
                  checked={target === 'session'}
                  onChange={() => setTarget('session')}
                  disabled={saving}
                />
                Treino inteiro
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="note-target"
                  checked={target === 'exercise'}
                  onChange={() => setTarget('exercise')}
                  disabled={saving}
                />
                Exercício específico
              </label>
            </div>
            {target === 'exercise' ? (
              <div className="mt-3 space-y-1.5">
                {exercises.length === 0 ? (
                  <p className="text-xs text-gray-500">Nenhum exercício neste card.</p>
                ) : (
                  exercises.map((exercise) => {
                    const value = `${exercise.order}:${exercise.exerciseId || exercise.name}`;
                    const selected =
                      selectedExercise != null &&
                      selectedExercise.order === exercise.order &&
                      selectedExercise.exerciseId === exercise.exerciseId;
                    return (
                      <label key={value} className="flex items-center gap-2 text-sm text-gray-800">
                        <input
                          type="radio"
                          name="note-exercise"
                          checked={selected}
                          onChange={() => setExerciseId(value)}
                          disabled={saving}
                        />
                        {exercise.name}
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}
          </fieldset>

          <div>
            <label htmlFor="treinos-note-text" className="text-sm font-semibold text-gray-900">
              Observação
            </label>
            <textarea
              id="treinos-note-text"
              rows={4}
              value={text}
              disabled={saving}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ex.: reduzir amplitude, manter carga leve, priorizar execução controlada..."
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {locked ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-gray-700">
              Aplicar apenas para <span className="font-semibold">{locked.name}</span>
            </p>
          ) : (
            <fieldset>
              <legend className="text-sm font-semibold text-gray-900">Aplicar para</legend>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="note-scope"
                    checked={scope === 'all'}
                    onChange={() => {
                      setScope('all');
                      setSelectedIds(covered.map((item) => item.pacienteId));
                    }}
                    disabled={saving}
                  />
                  Todos os pacientes deste treino
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="note-scope"
                    checked={scope === 'some'}
                    onChange={() => setScope('some')}
                    disabled={saving}
                  />
                  Selecionar pacientes
                </label>
              </div>
              {scope === 'some' ? (
                <ul className="mt-3 space-y-1.5">
                  {covered.map((item) => {
                    const checked = selectedIds.includes(item.pacienteId);
                    return (
                      <li key={item.pacienteId}>
                        <label className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={saving}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== item.pacienteId)
                                  : [...prev, item.pacienteId]
                              )
                            }
                          />
                          {item.name}
                        </label>
                      </li>
                    );
                  })}
                  <p className="pt-1 text-xs text-gray-500">
                    {selectedIds.length} {selectedIds.length === 1 ? 'paciente selecionado' : 'pacientes selecionados'}
                  </p>
                </ul>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  {covered.length} {covered.length === 1 ? 'paciente' : 'pacientes'} neste treino
                </p>
              )}
            </fieldset>
          )}

          {preview.alreadyHasCount > 0 ? (
            <fieldset>
              <legend className="text-sm font-semibold text-gray-900">
                {preview.alreadyHasCount}{' '}
                {preview.alreadyHasCount === 1
                  ? 'paciente já possui observação neste local.'
                  : 'pacientes já possuem observação neste local.'}
              </legend>
              <div className="mt-2 space-y-2 text-sm text-gray-800">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="note-conflict"
                    checked={conflict === 'skip-filled'}
                    onChange={() => setConflict('skip-filled')}
                    disabled={saving}
                  />
                  Aplicar somente onde está vazio
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="note-conflict"
                    checked={conflict === 'append'}
                    onChange={() => setConflict('append')}
                    disabled={saving}
                  />
                  Acrescentar ao final
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="note-conflict"
                    checked={conflict === 'replace'}
                    onChange={() => setConflict('replace')}
                    disabled={saving}
                  />
                  Substituir observação existente
                </label>
              </div>
            </fieldset>
          ) : null}

          <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-gray-600">
            <p>
              <span className="font-semibold text-gray-800">Observação: </span>
              {text.trim() || '—'}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-gray-800">Aplicar em: </span>
              {target === 'session' ? 'Treino inteiro' : preview.exerciseLabel || 'Exercício'}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-gray-800">Pacientes: </span>
              {preview.eligiblePatientCount}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-gray-800">Já possuem observação: </span>
              {preview.alreadyHasCount}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-gray-800">Ação: </span>
              {conflict === 'skip-filled'
                ? 'Aplicar somente onde está vazio'
                : conflict === 'append'
                  ? 'Acrescentar ao final'
                  : 'Substituir observação existente'}
            </p>
          </div>

          {preview.errors.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {preview.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() =>
              onSave({
                target,
                text,
                conflict,
                patientIds,
                exerciseKey: selectedExercise
                  ? {
                      exerciseId: selectedExercise.exerciseId,
                      order: selectedExercise.order,
                      name: selectedExercise.name,
                    }
                  : undefined,
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar para {preview.willChangeCount}{' '}
            {preview.willChangeCount === 1 ? 'paciente' : 'pacientes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
