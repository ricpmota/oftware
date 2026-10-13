'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { translateExerciseName } from '@/data/exerciseTranslations';
import { coveredPatientsFromCard } from '@/lib/metapersonal/bulkWorkoutNotes';
import {
  applyGymMediaOverride,
  gymMediaForPatientExercise,
  gymMediaOverrideKey,
  type GymMediaOverrides,
} from '@/lib/metapersonal/editWorkoutGymMedia';
import {
  TreinosExerciseVisualMedia,
  TreinosGymMediaLightbox,
  TreinosGymMediaSheetHost,
  type TreinosGymSheetTarget,
} from '@/components/metapersonal/treinos/TreinosExerciseVisualMedia';
import {
  deleteExerciseGymMediaClient,
  uploadExerciseGymMediaClient,
} from '@/lib/personal/uploadExerciseGymMediaClient';
import type { ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';
import {
  MIXED_FIELD_LABEL,
  buildBulkEditViewModel,
  buildPatchFromDraft,
  createAddedDraftExercise,
  createBulkEditDraft,
  describeBulkEditChanges,
  hasBulkEditPatch,
  setDraftSeriesCount,
  somePatientsAreAvulsa,
  type BulkEditDraft,
  type BulkEditDraftExercise,
  type BulkEditTemporalScope,
  type DirtyMixed,
} from '@/lib/metapersonal/bulkWorkoutEdit';
import {
  SCHEDULE_DAY_OPTIONS,
  WEEK_PRESETS,
  endDateFromWeeks,
  formatScheduleSummary,
  normalizeScheduleConfig,
  weeksFromRange,
  type CombinedEditPreview,
  type WorkoutScheduleConfig,
} from '@/lib/metapersonal/bulkWorkoutSchedule';
import type { PlannerBoardCard } from '@/lib/metapersonal/treinosPlannerGroup';
import {
  TRAINING_RECURRENCE_MAX_WEEKS,
  TRAINING_RECURRENCE_MIN_WEEKS,
  clampTrainingWeeksCount,
  todayLocalYYYYMMDD,
} from '@/lib/personal/trainingRecurrence';
import { reorderSelectedExercises } from '@/lib/personal/workoutDraft';
import { inferCardSchedules, previewBulkWorkoutAndSchedule } from '@/services/bulkWorkoutScheduleService';
import type { Exercise } from '@/types/exercise';

type Props = {
  open: boolean;
  card: PlannerBoardCard | null;
  lockedPatientId?: string;
  saving: boolean;
  onClose: () => void;
  onGymMediaChanged?: () => void;
  onSave: (input: {
    patientIds: string[];
    temporalScope: BulkEditTemporalScope;
    patch: ReturnType<typeof buildPatchFromDraft>;
    scheduleDirty: boolean;
    schedule: WorkoutScheduleConfig | null;
  }) => void;
};

function formatFieldValue(value: number | null | undefined): string {
  if (value == null) return '';
  return String(value);
}

function MixedNumberInput({
  label,
  field,
  suffix,
  allowEmpty = false,
  onCommit,
}: {
  label: string;
  field: DirtyMixed<number | null> | DirtyMixed<number>;
  suffix?: string;
  allowEmpty?: boolean;
  onCommit: (next: DirtyMixed<number | null>) => void;
}) {
  const [text, setText] = useState(() =>
    field.dirty || field.mode === 'same' ? formatFieldValue(field.value) : ''
  );

  useEffect(() => {
    setText(field.dirty || field.mode === 'same' ? formatFieldValue(field.value) : '');
  }, [field.dirty, field.mode, field.value]);

  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input
          inputMode="decimal"
          value={text}
          placeholder={field.mode === 'mixed' && !field.dirty ? MIXED_FIELD_LABEL : undefined}
          onChange={(event) => {
            const raw = event.target.value;
            setText(raw);
            const trimmed = raw.trim();
            if (!trimmed) {
              if (allowEmpty) onCommit({ ...field, mode: 'same', value: null, dirty: true });
              return;
            }
            const n = Number(trimmed.replace(',', '.'));
            if (!Number.isFinite(n)) return;
            onCommit({ ...field, mode: 'same', value: n, dirty: true });
          }}
          onBlur={() => {
            const raw = text.trim();
            if (!raw) {
              if (allowEmpty) {
                onCommit({ ...field, mode: 'same', value: null, dirty: true });
              } else if (field.mode === 'same' || field.dirty) {
                setText(formatFieldValue(field.value));
              }
              return;
            }
            const n = Number(raw.replace(',', '.'));
            if (!Number.isFinite(n)) {
              setText(field.dirty || field.mode === 'same' ? formatFieldValue(field.value) : '');
              return;
            }
            onCommit({ ...field, mode: 'same', value: n, dirty: true });
          }}
          className={`w-full rounded-md border px-2 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${
            field.mode === 'mixed' && !field.dirty
              ? 'border-amber-200 bg-amber-50 text-amber-900 placeholder:text-amber-700/80'
              : 'border-gray-200 bg-white text-gray-900'
          }`}
        />
        {suffix ? <span className="shrink-0 text-[11px] text-gray-400">{suffix}</span> : null}
      </div>
    </label>
  );
}

export function TreinosEditWorkoutModal({
  open,
  card,
  lockedPatientId,
  saving,
  onClose,
  onGymMediaChanged,
  onSave,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [scope, setScope] = useState<'all' | 'some'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [temporalScope, setTemporalScope] = useState<BulkEditTemporalScope>('this');
  const [draft, setDraft] = useState<BulkEditDraft>({ exercises: [], orderDirty: false });
  const [gymOverrides, setGymOverrides] = useState<GymMediaOverrides>({});
  const [gymSheet, setGymSheet] = useState<TreinosGymSheetTarget | null>(null);
  const [gymPreview, setGymPreview] = useState<ExerciseGymMedia | null>(null);
  const [gymUploading, setGymUploading] = useState(false);
  const [gymError, setGymError] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'workout' | 'schedule'>('workout');
  const [schedule, setSchedule] = useState<WorkoutScheduleConfig>(() =>
    normalizeScheduleConfig({
      selectedDaysOfWeek: [],
      startDate: todayLocalYYYYMMDD(),
      endDate: endDateFromWeeks(todayLocalYYYYMMDD(), 4),
      weeksCount: 4,
    })
  );
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'same' | 'mixed' | 'none'>('none');
  const [currentScheduleLabel, setCurrentScheduleLabel] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<Exercise[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [preview, setPreview] = useState<CombinedEditPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const covered = useMemo(() => (card ? coveredPatientsFromCard(card) : []), [card]);
  const locked = covered.find((item) => item.pacienteId === lockedPatientId);

  const patientIds = locked
    ? [locked.pacienteId]
    : scope === 'all'
      ? covered.map((item) => item.pacienteId)
      : selectedIds;

  const selectedPatients = useMemo(
    () => covered.filter((item) => patientIds.includes(item.pacienteId)),
    [covered, patientIds]
  );

  const patientKey = `${card?.id || ''}|${locked?.pacienteId || ''}|${scope}|${selectedIds.join(',')}`;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open || !card) return;
    setScope('all');
    setSelectedIds(coveredPatientsFromCard(card).map((item) => item.pacienteId));
    setTemporalScope('this');
    setCatalogOpen(false);
    setCatalogQuery('');
    setPreview(null);
    setEditTab('workout');
    setScheduleDirty(false);
    setScheduleMode('none');
    setCurrentScheduleLabel('');
    setGymOverrides({});
    setGymSheet(null);
    setGymPreview(null);
    setGymError(null);
    setGymUploading(false);
  }, [open, card]);

  useEffect(() => {
    if (!open) return;
    setDraft(createBulkEditDraft(buildBulkEditViewModel(selectedPatients)));
    // Recria o draft só ao abrir ou ao mudar o escopo de pacientes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- patientKey captura o escopo
  }, [open, patientKey]);

  useEffect(() => {
    if (!open || !card) return;
    const today = todayLocalYYYYMMDD();
    const handle = window.setTimeout(async () => {
      try {
        const shared = await inferCardSchedules(selectedPatients, today);
        setScheduleMode(shared.mode);
        if (shared.mode === 'same' && shared.value) {
          setSchedule(shared.value);
          setCurrentScheduleLabel(formatScheduleSummary(shared.value));
          setScheduleDirty(false);
        } else if (shared.mode === 'mixed') {
          setCurrentScheduleLabel('Agendamentos diferentes');
          setScheduleDirty(false);
        } else {
          setCurrentScheduleLabel('');
        }
      } catch {
        setScheduleMode('none');
      }
    }, 80);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- patientKey captura o escopo
  }, [open, patientKey]);

  useEffect(() => {
    if (!open || !catalogOpen) return;
    const query = catalogQuery.trim();
    const handle = window.setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const url = query
          ? `/api/exercisedb/search?name=${encodeURIComponent(query)}&page=1&limit=24`
          : '/api/exercises?limit=24';
        const res = await fetch(url);
        if (!res.ok) {
          setCatalogResults([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setCatalogResults(
          list.map((item: Exercise) => ({
            ...item,
            gifUrl:
              item.gifUrl ||
              (item.id
                ? `/api/exercisedb/image?exerciseId=${encodeURIComponent(item.id)}&resolution=360`
                : undefined),
          }))
        );
      } catch {
        setCatalogResults([]);
      } finally {
        setCatalogLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [open, catalogOpen, catalogQuery]);

  useEffect(() => {
    if (!open || !card) return;
    const patch = buildPatchFromDraft(draft);
    const handle = window.setTimeout(async () => {
      setPreviewing(true);
      try {
        const next = await previewBulkWorkoutAndSchedule({
          source: card.source,
          availablePatients: covered,
          patientIds,
          lockedPatientId: locked?.pacienteId,
          temporalScope: scheduleDirty ? 'this-and-future' : temporalScope,
          patch,
          today: todayLocalYYYYMMDD(),
          allowEmptyPatch: true,
          scheduleDirty,
          schedule: scheduleDirty ? schedule : null,
        });
        setPreview(next);
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [open, card, covered, patientIds, locked, temporalScope, draft, schedule, scheduleDirty]);

  if (!open || !portalReady || !card) return null;

  const avulsa = somePatientsAreAvulsa(selectedPatients);
  const patch = buildPatchFromDraft(draft);
  const workoutDirty = hasBulkEditPatch(draft);
  const canSave =
    !saving &&
    (workoutDirty || scheduleDirty) &&
    (preview?.errors.length || 0) === 0;

  const commitSchedule = (next: Partial<WorkoutScheduleConfig>) => {
    const merged = { ...schedule, ...next };
    if (next.weeksCount != null && next.endDate == null) {
      merged.endDate = endDateFromWeeks(merged.startDate, next.weeksCount);
    }
    if (next.endDate && next.weeksCount == null) {
      merged.weeksCount = weeksFromRange(merged.startDate, next.endDate);
      merged.endDate = endDateFromWeeks(merged.startDate, merged.weeksCount);
    }
    if (next.startDate && next.endDate == null) {
      merged.endDate = endDateFromWeeks(next.startDate, merged.weeksCount);
    }
    setSchedule(normalizeScheduleConfig(merged));
    setScheduleDirty(true);
  };

  const updateExercise = (
    editorKey: string,
    updater: (exercise: BulkEditDraftExercise) => BulkEditDraftExercise
  ) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((item) => (item.editorKey === editorKey ? updater(item) : item)),
    }));
  };

  const gymSheetPatient = gymSheet
    ? selectedPatients.find((item) => item.pacienteId === gymSheet.pacienteId)
    : undefined;
  const gymSheetMedia = gymSheet
    ? applyGymMediaOverride(
        gymSheetPatient
          ? gymMediaForPatientExercise(gymSheetPatient, { exerciseId: gymSheet.exerciseId }).media
          : null,
        gymSheet.patientUserId,
        gymSheet.exerciseId,
        gymOverrides
      )
    : null;

  const handleGymMediaFile = async (file: File) => {
    if (!gymSheet) return;
    setGymUploading(true);
    setGymError(null);
    try {
      const media = await uploadExerciseGymMediaClient({
        file,
        pacienteId: gymSheet.pacienteId,
        exerciseId: gymSheet.exerciseId,
      });
      setGymOverrides((prev) => ({
        ...prev,
        [gymMediaOverrideKey(gymSheet.patientUserId, gymSheet.exerciseId)]: media,
      }));
      onGymMediaChanged?.();
    } catch (error) {
      setGymError(error instanceof Error ? error.message : 'Não foi possível salvar a mídia.');
    } finally {
      setGymUploading(false);
    }
  };

  const handleGymMediaRemove = async () => {
    if (!gymSheet) return;
    setGymError(null);
    try {
      await deleteExerciseGymMediaClient({
        pacienteId: gymSheet.pacienteId,
        exerciseId: gymSheet.exerciseId,
      });
      setGymOverrides((prev) => ({
        ...prev,
        [gymMediaOverrideKey(gymSheet.patientUserId, gymSheet.exerciseId)]: null,
      }));
      onGymMediaChanged?.();
    } catch (error) {
      setGymError(error instanceof Error ? error.message : 'Não foi possível remover a mídia.');
      throw error;
    }
  };

  return createPortal(
    <>
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[min(94vh,860px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Editar treino</h2>
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
          {locked ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-gray-700">
              Apenas <span className="font-semibold">{locked.name}</span>
            </p>
          ) : (
            <fieldset>
              <legend className="text-sm font-semibold text-gray-900">Pacientes</legend>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="edit-scope"
                    checked={scope === 'all'}
                    onChange={() => {
                      setScope('all');
                      setSelectedIds(covered.map((item) => item.pacienteId));
                    }}
                    disabled={saving}
                  />
                  Todos os {covered.length}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="edit-scope"
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
                </ul>
              ) : null}
            </fieldset>
          )}

          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
            <button
              type="button"
              onClick={() => setEditTab('workout')}
              className={`h-8 rounded-md px-3 text-xs font-semibold ${
                editTab === 'workout' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Treino
            </button>
            <button
              type="button"
              onClick={() => setEditTab('schedule')}
              className={`h-8 rounded-md px-3 text-xs font-semibold ${
                editTab === 'schedule' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Agendamento
            </button>
          </div>

          {editTab === 'workout' ? (
          <>
          <fieldset>
            <legend className="text-sm font-semibold text-gray-900">Aplicar alteração em</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="edit-temporal"
                  className="mt-0.5"
                  checked={scheduleDirty ? false : temporalScope === 'this'}
                  onChange={() => setTemporalScope('this')}
                  disabled={saving || scheduleDirty}
                />
                <span>
                  Somente esta ocorrência
                  <span className="block text-xs text-gray-500">Apenas a sessão desta data.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="edit-temporal"
                  className="mt-0.5"
                  checked={scheduleDirty || temporalScope === 'this-and-future'}
                  onChange={() => setTemporalScope('this-and-future')}
                  disabled={saving}
                />
                <span>
                  Esta e próximas ocorrências
                  <span className="block text-xs text-gray-500">
                    Sessão atual e futuras da mesma série. Passado e concluído não mudam.
                  </span>
                </span>
              </label>
            </div>
            {scheduleDirty ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-gray-600">
                A alteração de agendamento vale para o período futuro da série, não só esta ocorrência.
              </p>
            ) : null}
            {avulsa ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {selectedPatients.length === 1
                  ? 'Este treino não tem série recorrente. «Esta e próximas» altera só esta ocorrência.'
                  : 'Pacientes sem série recorrente recebem a alteração só nesta ocorrência.'}
              </p>
            ) : null}
          </fieldset>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Exercícios</h3>
              <button
                type="button"
                disabled={saving}
                onClick={() => setCatalogOpen((openCatalog) => !openCatalog)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar exercício
              </button>
            </div>

            {catalogOpen ? (
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    value={catalogQuery}
                    onChange={(event) => setCatalogQuery(event.target.value)}
                    placeholder="Buscar no catálogo ExerciseDB"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {catalogLoading ? (
                    <li className="py-3 text-center text-xs text-gray-500">Buscando…</li>
                  ) : catalogResults.length === 0 ? (
                    <li className="py-3 text-center text-xs text-gray-500">Nenhum exercício encontrado.</li>
                  ) : (
                    catalogResults.map((exercise) => (
                      <li key={exercise.id}>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setDraft((prev) => ({
                              ...prev,
                              exercises: [
                                ...prev.exercises,
                                createAddedDraftExercise({
                                  exerciseId: exercise.id,
                                  name: translateExerciseName(exercise.name) || exercise.name,
                                  bodyPart: exercise.bodyPart,
                                  target: exercise.target,
                                  equipment: exercise.equipment,
                                  gifUrl: exercise.gifUrl,
                                  totalPatients: selectedPatients.length,
                                }),
                              ],
                            }));
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                        >
                          <span className="truncate font-medium text-gray-800">
                            {translateExerciseName(exercise.name) || exercise.name}
                          </span>
                          <Plus className="h-3.5 w-3.5 text-emerald-600" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}

            {draft.exercises.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum exercício neste treino.</p>
            ) : (
              draft.exercises.map((exercise, index) => {
                if (exercise.removed && exercise.kind === 'added') return null;
                const presentLabel =
                  exercise.kind === 'existing' && exercise.presentCount < exercise.totalPatients
                    ? `Presente em ${exercise.presentCount} de ${exercise.totalPatients} pacientes`
                    : null;
                return (
                  <article
                    key={exercise.editorKey}
                    className={`rounded-xl border p-3 ${
                      exercise.removed ? 'border-red-200 bg-red-50/60' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">{exercise.name}</p>
                        {exercise.kind === 'added' ? (
                          <p className="text-[11px] font-medium text-emerald-700">Novo exercício</p>
                        ) : null}
                        {presentLabel ? (
                          <p className="text-[11px] font-medium text-amber-700">{presentLabel}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          disabled={saving || index === 0}
                          aria-label="Subir exercício"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              orderDirty: true,
                              exercises: reorderSelectedExercises(prev.exercises, index, index - 1),
                            }))
                          }
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={saving || index === draft.exercises.length - 1}
                          aria-label="Descer exercício"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              orderDirty: true,
                              exercises: reorderSelectedExercises(prev.exercises, index, index + 1),
                            }))
                          }
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          aria-label={exercise.removed ? 'Desfazer remoção' : 'Remover exercício'}
                          onClick={() =>
                            updateExercise(exercise.editorKey, (item) => ({
                              ...item,
                              removed: !item.removed,
                            }))
                          }
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {exercise.removed ? (
                      <p className="mt-2 text-xs text-red-700">
                        Será removido das sessões futuras/agendadas no escopo. Sessões concluídas e a mídia da
                        academia não são apagadas.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <TreinosExerciseVisualMedia
                          key={`${exercise.editorKey}:${selectedPatients.map((item) => item.pacienteId).join(',')}`}
                          exercise={exercise}
                          patients={selectedPatients}
                          overrides={gymOverrides}
                          onPreview={(media) => {
                            setGymSheet(null);
                            setGymPreview(media);
                          }}
                          onManage={(target) => {
                            setGymPreview(null);
                            setGymError(null);
                            setGymSheet(target);
                          }}
                        />

                        {exercise.seriesCount.mode === 'mixed' && !exercise.seriesCount.dirty ? (
                          <label className="block text-sm text-gray-800">
                            Séries: {MIXED_FIELD_LABEL}
                            <input
                              type="number"
                              min={1}
                              placeholder="Definir quantidade para todos"
                              className="mt-1 w-full rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm"
                              onBlur={(event) => {
                                const n = Number(event.target.value);
                                if (!Number.isFinite(n) || n < 1) return;
                                updateExercise(exercise.editorKey, (item) => setDraftSeriesCount(item, n));
                              }}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              Séries
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={exercise.seriesCount.value ?? ''}
                              onChange={(event) => {
                                const n = Number(event.target.value);
                                if (!Number.isFinite(n) || n < 1) return;
                                updateExercise(exercise.editorKey, (item) => setDraftSeriesCount(item, n));
                              }}
                              className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm"
                            />
                          </div>
                        )}

                        {exercise.series.map((row, seriesIndex) => (
                          <div key={`${exercise.editorKey}-${row.order}`} className="grid grid-cols-3 gap-2">
                            <MixedNumberInput
                              label={`Série ${seriesIndex + 1} · reps`}
                              field={row.reps}
                              onCommit={(next) =>
                                updateExercise(exercise.editorKey, (item) => ({
                                  ...item,
                                  series: item.series.map((seriesRow, idx) =>
                                    idx === seriesIndex
                                      ? {
                                          ...seriesRow,
                                          reps: {
                                            ...next,
                                            value: next.value ?? seriesRow.reps.value ?? 10,
                                          },
                                        }
                                      : seriesRow
                                  ),
                                }))
                              }
                            />
                            <MixedNumberInput
                              label="Carga"
                              suffix="kg"
                              allowEmpty
                              field={row.loadKg}
                              onCommit={(next) =>
                                updateExercise(exercise.editorKey, (item) => ({
                                  ...item,
                                  series: item.series.map((seriesRow, idx) =>
                                    idx === seriesIndex ? { ...seriesRow, loadKg: next } : seriesRow
                                  ),
                                }))
                              }
                            />
                            <MixedNumberInput
                              label="Descanso"
                              suffix="s"
                              field={row.restSec}
                              onCommit={(next) =>
                                updateExercise(exercise.editorKey, (item) => ({
                                  ...item,
                                  series: item.series.map((seriesRow, idx) =>
                                    idx === seriesIndex
                                      ? {
                                          ...seriesRow,
                                          restSec: {
                                            ...next,
                                            value: next.value ?? seriesRow.restSec.value ?? 60,
                                          },
                                        }
                                      : seriesRow
                                  ),
                                }))
                              }
                            />
                          </div>
                        ))}

                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Orientação do exercício
                          </span>
                          <textarea
                            rows={2}
                            value={
                              exercise.trainerNote.dirty || exercise.trainerNote.mode === 'same'
                                ? exercise.trainerNote.value || ''
                                : ''
                            }
                            placeholder={
                              exercise.trainerNote.mode === 'mixed' && !exercise.trainerNote.dirty
                                ? MIXED_FIELD_LABEL
                                : 'Sem alteração se deixar como está'
                            }
                            onChange={(event) =>
                              updateExercise(exercise.editorKey, (item) => ({
                                ...item,
                                trainerNote: {
                                  ...item.trainerNote,
                                  mode: 'same',
                                  value: event.target.value,
                                  dirty: true,
                                },
                              }))
                            }
                            className={`mt-1 w-full rounded-md border px-2.5 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${
                              exercise.trainerNote.mode === 'mixed' && !exercise.trainerNote.dirty
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-gray-200'
                            }`}
                          />
                        </label>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
          </>
          ) : (
            <section className="space-y-4">
              {scheduleMode === 'mixed' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <p className="font-semibold">Agendamentos diferentes</p>
                  <p className="mt-1 text-xs">
                    Os pacientes deste card não possuem exatamente o mesmo período/dias. Defina um novo
                    agendamento para aplicar, ou não toque nesta aba para preservar o de cada um.
                  </p>
                </div>
              ) : currentScheduleLabel ? (
                <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-gray-700">
                  {currentScheduleLabel}
                </p>
              ) : null}

              <fieldset>
                <legend className="text-sm font-semibold text-gray-900">Dias da semana</legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SCHEDULE_DAY_OPTIONS.map((day) => {
                    const checked = schedule.selectedDaysOfWeek.includes(day.jsDay);
                    return (
                      <label
                        key={day.jsDay}
                        className={`inline-flex cursor-pointer items-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                          checked
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          disabled={saving}
                          onChange={() => {
                            const next = checked
                              ? schedule.selectedDaysOfWeek.filter((item) => item !== day.jsDay)
                              : [...schedule.selectedDaysOfWeek, day.jsDay];
                            commitSchedule({ selectedDaysOfWeek: next });
                          }}
                        />
                        {day.short}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Início</span>
                  <input
                    type="date"
                    value={schedule.startDate}
                    min={todayLocalYYYYMMDD()}
                    disabled={saving}
                    onChange={(event) => commitSchedule({ startDate: event.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Final</span>
                  <input
                    type="date"
                    value={schedule.endDate}
                    min={schedule.startDate}
                    disabled={saving}
                    onChange={(event) => commitSchedule({ endDate: event.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>

              <fieldset>
                <legend className="text-sm font-semibold text-gray-900">
                  Duração · {schedule.weeksCount} {schedule.weeksCount === 1 ? 'semana' : 'semanas'}
                </legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {WEEK_PRESETS.map((weeks) => (
                    <button
                      key={weeks}
                      type="button"
                      disabled={saving}
                      onClick={() => commitSchedule({ weeksCount: weeks })}
                      className={`h-8 rounded-lg px-2.5 text-xs font-semibold ${
                        schedule.weeksCount === weeks
                          ? 'bg-emerald-500 text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {weeks}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={TRAINING_RECURRENCE_MIN_WEEKS}
                  max={TRAINING_RECURRENCE_MAX_WEEKS}
                  value={schedule.weeksCount}
                  disabled={saving}
                  onChange={(event) =>
                    commitSchedule({ weeksCount: clampTrainingWeeksCount(Number(event.target.value)) })
                  }
                  className="mt-3 w-full"
                />
              </fieldset>
            </section>
          )}

          <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-gray-600">
            <p className="text-sm font-semibold text-gray-900">
              {scheduleDirty ? 'Alteração do agendamento' : 'Resumo da edição'}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-gray-800">Pacientes: </span>
              {preview?.patientCount ?? selectedPatients.length}
            </p>
            {scheduleDirty ? (
              <>
                {currentScheduleLabel && scheduleMode === 'same' ? (
                  <p className="mt-2 whitespace-pre-line">
                    <span className="font-semibold text-gray-800">Atual: </span>
                    {currentScheduleLabel}
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-line">
                  <span className="font-semibold text-gray-800">Novo: </span>
                  {formatScheduleSummary(schedule)}
                </p>
                <p className="mt-2">
                  {previewing
                    ? '…'
                    : `${preview?.kept || 0} sessões permanecem · ${preview?.created || 0} novas · ${preview?.deactivated || 0} futuras serão desativadas`}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1">
                  <span className="font-semibold text-gray-800">Sessões afetadas: </span>
                  {previewing ? '…' : preview?.workoutSessionCount ?? '—'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-gray-800">Escopo: </span>
                  {temporalScope === 'this' ? 'Somente esta ocorrência' : 'Esta e próximas'}
                </p>
                <div className="mt-2">
                  <p className="font-semibold text-gray-800">Alterações:</p>
                  {describeBulkEditChanges(draft).length === 0 ? (
                    <p className="mt-1">
                      Nenhuma alteração explícita ainda. Campos não tocados preservam o valor de cada paciente.
                    </p>
                  ) : (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {describeBulkEditChanges(draft).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          {preview?.errors.length ? (
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
                patientIds,
                temporalScope: scheduleDirty ? 'this-and-future' : temporalScope,
                patch,
                scheduleDirty,
                schedule: scheduleDirty ? schedule : null,
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {scheduleDirty && !workoutDirty ? 'Aplicar novo agendamento' : 'Aplicar alterações'}
          </button>
        </div>
      </div>
    </div>
    <TreinosGymMediaLightbox preview={gymPreview} onClose={() => setGymPreview(null)} />
    <TreinosGymMediaSheetHost
      target={gymSheet}
      media={gymSheetMedia}
      uploading={gymUploading}
      error={gymError}
      onClose={() => {
        if (!gymUploading) setGymSheet(null);
      }}
      onPickFile={(file) => void handleGymMediaFile(file)}
      onRemove={handleGymMediaRemove}
    />
    </>,
    document.body
  );
}
