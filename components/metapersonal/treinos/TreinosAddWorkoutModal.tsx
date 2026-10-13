'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Loader2, Plus, Search, X } from 'lucide-react';
import { PersonalWorkoutTemplateSelectCard } from '@/components/personal/templates/PersonalWorkoutTemplateSelectCard';
import type { PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';
import {
  SCHEDULE_DAY_OPTIONS,
  WEEK_PRESETS,
  endDateFromWeeks,
  normalizeScheduleConfig,
  weeksFromRange,
  type WorkoutScheduleConfig,
} from '@/lib/metapersonal/bulkWorkoutSchedule';
import {
  coincidingProgramDates,
  initialProgramSchedule,
  previewTemplateSchedulePublish,
  type ExistingProgramDate,
} from '@/lib/metapersonal/publishTemplateSchedule';
import {
  TRAINING_RECURRENCE_MAX_WEEKS,
  TRAINING_RECURRENCE_MIN_WEEKS,
  clampTrainingWeeksCount,
  todayLocalYYYYMMDD,
} from '@/lib/personal/trainingRecurrence';
import {
  TREINOS_WEEKDAY_LABELS,
  pacienteDisplayName,
  type TreinosSelectedPatient,
  type TreinosWeekday,
} from './treinosCentral.types';

type Props = {
  open: boolean;
  weekday: TreinosWeekday | null;
  weekdayDate?: string;
  templates: PersonalWorkoutTemplate[];
  loading: boolean;
  patients: TreinosSelectedPatient[];
  createdById: string;
  saving: boolean;
  initialTemplate?: PersonalWorkoutTemplate | null;
  existingProgramDates?: ExistingProgramDate[];
  onClose: () => void;
  onCreateNew: () => void;
  onRequestPatients: () => void;
  onConfirm: (input: {
    template: PersonalWorkoutTemplate;
    patients: TreinosSelectedPatient[];
    schedule: WorkoutScheduleConfig;
  }) => void;
};

export function TreinosAddWorkoutModal({
  open,
  weekday,
  weekdayDate,
  templates,
  loading,
  patients,
  createdById,
  saving,
  initialTemplate,
  existingProgramDates = [],
  onClose,
  onCreateNew,
  onRequestPatients,
  onConfirm,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [busca, setBusca] = useState('');
  const [step, setStep] = useState<'pick' | 'schedule'>('pick');
  const [template, setTemplate] = useState<PersonalWorkoutTemplate | null>(null);
  const [schedule, setSchedule] = useState<WorkoutScheduleConfig>(() =>
    normalizeScheduleConfig({
      selectedDaysOfWeek: [],
      startDate: todayLocalYYYYMMDD(),
      endDate: endDateFromWeeks(todayLocalYYYYMMDD(), 4),
      weeksCount: 4,
    })
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const knownPatientIdsRef = useRef<string[]>([]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open || !weekday) return;
    setBusca('');
    setSelectedIds(patients.map((item) => item.pacienteId));
    knownPatientIdsRef.current = patients.map((item) => item.pacienteId);
    setSchedule(initialProgramSchedule({ weekday, weekdayDate, today: todayLocalYYYYMMDD() }));
    if (initialTemplate) {
      setTemplate(initialTemplate);
      setStep('schedule');
    } else {
      setTemplate(null);
      setStep('pick');
    }
    // patients só inicializa a seleção ao abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, weekday, weekdayDate, initialTemplate]);

  useEffect(() => {
    if (!open || step !== 'schedule') return;
    const available = patients.map((item) => item.pacienteId);
    const previous = knownPatientIdsRef.current;
    knownPatientIdsRef.current = available;
    setSelectedIds((prev) => {
      const kept = prev.filter((id) => available.includes(id));
      const newcomers = available.filter((id) => !previous.includes(id));
      return Array.from(new Set([...kept, ...newcomers]));
    });
  }, [open, step, patients]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((item) => item.nome.toLowerCase().includes(q));
  }, [templates, busca]);

  const scopedPatients = useMemo(
    () => patients.filter((item) => selectedIds.includes(item.pacienteId)),
    [patients, selectedIds]
  );

  const preview = useMemo(() => {
    if (!template) {
      return { patientCount: 0, dayCount: 0, sessionCount: 0, dates: [], errors: [] as string[] };
    }
    return previewTemplateSchedulePublish({
      patients: scopedPatients,
      template,
      schedule,
      createdById,
      today: todayLocalYYYYMMDD(),
    });
  }, [template, scopedPatients, schedule, createdById]);

  const overlaps = useMemo(() => {
    if (!template || preview.dates.length === 0) return [];
    return coincidingProgramDates(
      scopedPatients.map((item) => ({ pacienteId: item.pacienteId, name: pacienteDisplayName(item) })),
      template.nome,
      preview.dates,
      existingProgramDates
    );
  }, [template, scopedPatients, preview.dates, existingProgramDates]);

  const confirmLockRef = useRef(false);
  useEffect(() => {
    if (!saving) confirmLockRef.current = false;
  }, [saving]);

  if (!open || !portalReady || !weekday) return null;

  const dayLabel = TREINOS_WEEKDAY_LABELS[weekday].long;
  const exerciseCount = template?.exercicios.length || 0;

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
  };

  const beginSchedule = (next: PersonalWorkoutTemplate) => {
    setTemplate(next);
    setSchedule(initialProgramSchedule({ weekday, weekdayDate, today: todayLocalYYYYMMDD() }));
    const ids = patients.map((item) => item.pacienteId);
    knownPatientIdsRef.current = ids;
    setSelectedIds(ids);
    setStep('schedule');
  };

  const canSubmit =
    !saving &&
    step === 'schedule' &&
    Boolean(template) &&
    preview.errors.length === 0 &&
    preview.sessionCount > 0;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[min(88vh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            {step === 'schedule' ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setStep('pick')}
                className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Trocar treino
              </button>
            ) : null}
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 'pick' ? 'Adicionar treino' : 'Programar treino'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {step === 'pick'
                ? `${dayLabel} — escolha um treino salvo para programar.`
                : `${template?.nome || 'Treino'} · ${exerciseCount} exercício${exerciseCount === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'pick' ? (
          <>
            <div className="border-b border-gray-100 px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar treino salvo..."
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Treinos salvos</h3>
                {loading ? (
                  <p className="py-6 text-center text-sm text-gray-400">Carregando biblioteca…</p>
                ) : filtrados.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    Nenhum treino na biblioteca.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {filtrados.map((item) => (
                      <div key={item.id || item.nome} className="rounded-xl bg-[#0A1F44] p-1">
                        <PersonalWorkoutTemplateSelectCard
                          template={item}
                          onUse={() => beginSchedule(item)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <Plus className="h-4 w-4" />
                Criar novo treino
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
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

              <div>
                <p className="text-sm font-semibold text-gray-900">Período</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Início
                    </span>
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
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Final
                    </span>
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

              <fieldset>
                <legend className="text-sm font-semibold text-gray-900">Pacientes</legend>
                {patients.length === 0 ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p>Selecione pelo menos um paciente para programar este treino.</p>
                    <button
                      type="button"
                      onClick={onRequestPatients}
                      className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Adicionar pacientes
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {patients.map((item) => {
                      const checked = selectedIds.includes(item.pacienteId);
                      return (
                        <label
                          key={item.pacienteId}
                          className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-gray-800"
                        >
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
                          <span className="min-w-0 flex-1 truncate">{pacienteDisplayName(item)}</span>
                          {checked ? <span className="text-xs font-semibold text-emerald-700">✓</span> : null}
                        </label>
                      );
                    })}
                    {scopedPatients.length === 0 ? (
                      <p className="text-xs text-amber-800">
                        Selecione pelo menos um paciente para programar este treino.
                      </p>
                    ) : null}
                  </div>
                )}
              </fieldset>

              {preview.sessionCount > 0 && preview.errors.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Serão criadas {preview.sessionCount}{' '}
                  {preview.sessionCount === 1 ? 'sessão' : 'sessões'} no calendário dos pacientes.
                </p>
              ) : null}

              {overlaps.length > 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Já existe “{template?.nome}” em algumas dessas datas para{' '}
                  {overlaps.map((item) => item.name).join(', ')}. Confirmar cria sessões adicionais.
                </p>
              ) : null}

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
                disabled={!canSubmit || !template}
                onClick={() => {
                  if (!template || saving || !canSubmit || confirmLockRef.current) return;
                  confirmLockRef.current = true;
                  onConfirm({ template, patients: scopedPatients, schedule });
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar programação
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
