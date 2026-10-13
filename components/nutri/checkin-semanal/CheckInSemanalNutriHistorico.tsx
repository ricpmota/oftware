'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { CheckInSemanalNutriDetails } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriDetails';
import { calendarDayRatingClass } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriV3Summary';
import { canCreateWeeklyNutritionCheckIn } from '@/lib/nutri/canEditWeeklyNutritionCheckIn';
import {
  getCheckInSemanalNutriCapabilities,
  type CheckInSemanalNutriViewerRole,
} from '@/lib/nutri/checkInSemanalNutriCapabilities';
import {
  formatWeeklyNutritionCheckInFillWindowLabel,
  getWeeklyNutritionCheckInFillWindow,
  isWeeklyNutritionCheckInFillWindowOpen,
  type NutriWeeklyCheckInSchedule,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import {
  loadNutriWeeklyCheckInScheduleForPatient,
  loadWeeklyNutritionCheckInsForPatientsInWeekRange,
} from '@/lib/nutri/checkInSemanalNutriScheduleStore';
import { deleteCheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriStore';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  isDailyAdherenceRating,
  rotuloDailyAdherence,
  type DailyAdherenceRating,
} from '@/lib/nutri/checkInSemanalNutriV3';
import {
  NUTRITION_WEEKDAY_HEADERS_MONDAY_FIRST,
  NUTRITION_WEEKDAY_KEYS,
  buildNutritionMonthDaysMondayFirst,
  formatNutritionWeekLongLabel,
  getNutritionCheckInReferenceWeek,
  getNutritionWeek,
  getPreviousNutritionWeek,
  isNutritionCheckInFutureWeek,
  nutritionWeekdayMondayFirst,
  parseNutritionYmdLocal,
} from '@/lib/nutri/checkInSemanalNutriWeek';
import { ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';

type Props = {
  pacienteId: string;
  nutritionistId?: string | null;
  canFill: boolean;
  hasLegacyDaily: boolean;
  focusWeekKey?: string | null;
  viewerRole?: CheckInSemanalNutriViewerRole;
  title?: string;
  canDelete?: boolean;
  onStartCheckIn: () => void;
  onOpenWeek: (weekKey: string) => void;
  onDeleted?: (weekKey: string) => void;
};

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function ratingForCalendarDay(
  record: CheckInSemanalNutri | null,
  dia: Date
): DailyAdherenceRating | undefined {
  const daily = record?.dailyAdherence;
  if (!daily) return undefined;
  const key = NUTRITION_WEEKDAY_KEYS[nutritionWeekdayMondayFirst(dia)];
  const rating = daily[key];
  return isDailyAdherenceRating(rating) ? rating : undefined;
}

export function CheckInSemanalNutriHistorico({
  pacienteId,
  nutritionistId,
  canFill,
  hasLegacyDaily,
  focusWeekKey,
  viewerRole = 'patient',
  title = 'Check-ins Semanais',
  canDelete = false,
  onStartCheckIn,
  onOpenWeek,
  onDeleted,
}: Props) {
  const currentWeek = getNutritionWeek();
  const referenceWeek = getNutritionCheckInReferenceWeek();
  const [month, setMonth] = useState(() =>
    focusWeekKey ? parseNutritionYmdLocal(getNutritionWeek(focusWeekKey).weekStart) : new Date()
  );
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(focusWeekKey ?? currentWeek.weekKey);
  const [items, setItems] = useState<CheckInSemanalNutri[]>([]);
  const [schedule, setSchedule] = useState<NutriWeeklyCheckInSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!focusWeekKey) return;
    const week = getNutritionWeek(focusWeekKey);
    setMonth(parseNutritionYmdLocal(week.weekStart));
    setSelectedWeekKey(focusWeekKey);
  }, [focusWeekKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const minWeek = getPreviousNutritionWeek(getNutritionWeek(monthStart));
    const maxWeek = getNutritionWeek(monthEnd);
    Promise.all([
      loadWeeklyNutritionCheckInsForPatientsInWeekRange([pacienteId], minWeek.weekKey, maxWeek.weekKey),
      loadNutriWeeklyCheckInScheduleForPatient(pacienteId, nutritionistId),
    ])
      .then(([records, loadedSchedule]) => {
        if (cancelled) return;
        setItems(records);
        setSchedule(loadedSchedule);
      })
      .catch((err) => {
        if (!cancelled) setErro(err instanceof Error ? err.message : 'Erro ao carregar histórico.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, nutritionistId, pacienteId]);

  const byWeek = useMemo(() => new Map(items.map((item) => [item.weekKey, item] as const)), [items]);
  const days = useMemo(() => buildNutritionMonthDaysMondayFirst(month), [month]);
  const selectedWeek = selectedWeekKey ? getNutritionWeek(selectedWeekKey) : null;
  const selectedRecord = selectedWeekKey ? byWeek.get(selectedWeekKey) ?? null : null;
  const previousRecord = selectedWeek
    ? byWeek.get(getPreviousNutritionWeek(selectedWeek).weekKey) ?? null
    : null;
  const isReferenceWeekSelected = selectedWeekKey === referenceWeek.weekKey;
  const selectedIsFuture = selectedWeek ? isNutritionCheckInFutureWeek(selectedWeek.weekKey) : false;
  const fillCaps = getCheckInSemanalNutriCapabilities(viewerRole);
  const fillWindow = selectedWeek
    ? getWeeklyNutritionCheckInFillWindow({ week: selectedWeek, schedule })
    : null;
  const fillWindowOpen = selectedWeek
    ? isWeeklyNutritionCheckInFillWindowOpen({ week: selectedWeek, schedule })
    : false;
  const canFillThisWeek =
    canFill &&
    Boolean(selectedWeek) &&
    !selectedRecord &&
    canCreateWeeklyNutritionCheckIn({
      weekKey: selectedWeek?.weekKey || '',
      capabilities: fillCaps,
      schedule,
    });

  useEffect(() => {
    setConfirmDelete(false);
  }, [selectedWeekKey]);

  const handleDelete = useCallback(async () => {
    if (!selectedRecord || !canDelete) return;
    setDeleting(true);
    setErro(null);
    try {
      await deleteCheckInSemanalNutri(pacienteId, selectedRecord.weekKey);
      setItems((current) => current.filter((item) => item.weekKey !== selectedRecord.weekKey));
      setConfirmDelete(false);
      onDeleted?.(selectedRecord.weekKey);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível apagar o check-in.');
    } finally {
      setDeleting(false);
    }
  }, [canDelete, onDeleted, pacienteId, selectedRecord]);

  const mudarMes = useCallback((direcao: 'anterior' | 'proximo') => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + (direcao === 'anterior' ? -1 : 1), 1));
  }, []);

  return (
    <div className="min-w-0 space-y-3">
      {title ? (
        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">{title}</h2>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Carregando" />
        </div>
      ) : erro ? (
        <p className="text-sm text-red-600">{erro}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 lg:items-start min-w-0">
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-teal-50/70 via-white to-emerald-50/40 px-3 py-3">
              <button
                type="button"
                onClick={() => mudarMes('anterior')}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-900 flex-1 text-center min-w-0 truncate">
                {MESES[month.getMonth()]} {month.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => mudarMes('proximo')}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMonth(new Date());
                  setSelectedWeekKey(currentWeek.weekKey);
                }}
                className="px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shadow-sm"
              >
                Hoje
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-100/80">
              {NUTRITION_WEEKDAY_HEADERS_MONDAY_FIRST.map((label) => (
                <div key={label} className="p-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-600">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 bg-white">
              {days.map((dia, index) => {
                if (!dia) {
                  return <div key={`empty-${index}`} className="min-h-[52px] sm:min-h-[64px] bg-gray-50/60 border border-gray-100" />;
                }
                const ymd = ymdLocal(dia);
                const week = getNutritionWeek(ymd);
                const doneHere = byWeek.get(week.weekKey) ?? null;
                const rating = ratingForCalendarDay(doneHere, dia);
                const selected = selectedWeekKey === week.weekKey;
                const isToday = ymdLocal(new Date()) === ymd;
                const numberClass = rating
                  ? rating === 'regular'
                    ? 'text-amber-950'
                    : 'text-white'
                  : isToday
                    ? 'text-teal-700'
                    : 'text-gray-800';
                return (
                  <button
                    key={ymd}
                    type="button"
                    onClick={() => setSelectedWeekKey(week.weekKey)}
                    title={
                      rating
                        ? `${week.weekStart} a ${week.weekEnd} · ${rotuloDailyAdherence(rating)}`
                        : doneHere
                          ? `Semana ${doneHere.weekStart} a ${doneHere.weekEnd}`
                          : `Semana ${week.weekStart} a ${week.weekEnd} · sem check-in`
                    }
                    className={`min-h-[52px] sm:min-h-[64px] rounded-lg border border-gray-100 p-1 sm:p-1.5 text-left transition-colors ${calendarDayRatingClass(
                      rating
                    )} ${selected ? 'ring-2 ring-inset ring-teal-500 z-[1]' : ''}`}
                  >
                    <div className={`text-xs sm:text-sm font-semibold mb-0.5 ${numberClass}`}>
                      {dia.getDate()}
                    </div>
                    {rating ? (
                      <div
                        className={`inline-flex max-w-full items-center justify-center rounded-md px-1 py-0.5 text-[9px] sm:text-[10px] font-bold leading-tight ${
                          rating === 'regular' ? 'bg-black/10 text-amber-950' : 'bg-white/20 text-white'
                        }`}
                      >
                        {rotuloDailyAdherence(rating)}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 border-t border-gray-100 text-[11px] sm:text-xs text-gray-600 bg-gray-50/50">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Boa
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Regular
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Ruim
              </span>
              <span className="text-gray-500">Cada dia usa a cor da alimentação respondida naquela semana.</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm lg:min-h-[28rem] flex flex-col">
            <div className="shrink-0 border-b border-gray-200 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/40 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Detalhes da semana</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {selectedWeek ? formatNutritionWeekLongLabel(selectedWeek) : 'Selecione uma semana no calendário'}
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
              {!selectedWeek ? (
                <div className="h-full min-h-[12rem] flex items-center justify-center rounded-xl border border-dashed border-teal-200/80 bg-teal-50/40 p-6 text-center">
                  <p className="text-sm text-gray-700">Clique em qualquer dia da semana para ver o Check-in Semanal.</p>
                </div>
              ) : selectedRecord ? (
                <div className="space-y-4">
                  <CheckInSemanalNutriDetails
                    record={selectedRecord}
                    viewerRole={viewerRole}
                    previous={previousRecord}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => onOpenWeek(selectedRecord.weekKey)}
                      className="flex-1 rounded-xl border border-teal-200 bg-teal-50 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-100"
                    >
                      Abrir check-in
                    </button>
                    {canDelete ? (
                      confirmDelete ? (
                        <div className="flex flex-1 flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 sm:min-w-[12rem]">
                          <p className="text-xs font-medium text-rose-800">Apagar o check-in desta semana?</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(false)}
                              disabled={deleting}
                              className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete()}
                              disabled={deleting}
                              className="flex-1 rounded-lg bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            >
                              {deleting ? 'Apagando…' : 'Apagar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 sm:shrink-0"
                          aria-label="Apagar check-in"
                          title="Apagar check-in"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Apagar
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[12rem] flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-6 text-center">
                  <p className="font-medium text-gray-900">
                    {selectedIsFuture
                      ? 'Esta semana ainda não está disponível para preenchimento.'
                      : !fillWindowOpen
                        ? 'Check-in ainda não liberado.'
                        : isReferenceWeekSelected || fillCaps.edit
                          ? 'Check-in da semana ainda não respondido'
                          : 'Não há check-in nesta semana.'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{formatNutritionWeekLongLabel(selectedWeek)}</p>
                  {!selectedIsFuture && !fillWindowOpen && fillWindow ? (
                    <p className="mt-2 text-sm text-gray-600">
                      Disponível a partir de {formatWeeklyNutritionCheckInFillWindowLabel(fillWindow)}.
                    </p>
                  ) : null}
                  {canFillThisWeek ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isReferenceWeekSelected) onStartCheckIn();
                        else if (selectedWeek) onOpenWeek(selectedWeek.weekKey);
                      }}
                      className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Preencher Check-in
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CheckInSemanalNutriHistoricoLegadoSummary() {
  return (
    <summary className="cursor-pointer list-none flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100">
      <span>Histórico anterior</span>
      <span className="text-xs font-medium text-gray-500 inline-flex items-center gap-1">
        Check-ins diários anteriores
        <ChevronDown className="h-4 w-4" />
      </span>
    </summary>
  );
}
