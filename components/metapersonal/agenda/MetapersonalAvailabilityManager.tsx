'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Ban,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  PERIOD_PRESETS,
  SLOT_DURATION_OPTIONS,
  addMonths,
  generateSlotsInRange,
  getBrazilDateKey,
  getMonthCalendarGrid,
  lastDateKeyOfMonth,
  listDateKeysInRange,
  parseDateKey,
  toDateKey,
  type PeriodPresetId,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import { personalAgendaAuthFetch } from '@/lib/personal/agenda/personalAgendaAuthFetch';
import { weekdaysFromRecurringRules } from '@/lib/personal/agenda/recurringWeekdays';
import { WHITELABEL_WEEKDAYS, type WhiteLabelAvailabilityRule } from '@/types/whiteLabelAgenda';
import type { PersonalAvailabilityApiRow, PersonalAvailabilityStatus } from '@/types/personalAgenda';
import EditarConsultaCalendarioModal from '@/components/profissional/EditarConsultaCalendarioModal';
import { useConfirmarApagarConsulta } from '@/components/profissional/ConfirmarApagarConsultaModal';
import MetapersonalAgendaDayTimelineModal from '@/components/metapersonal/agenda/MetapersonalAgendaDayTimelineModal';
import { deletePersonalAgendaSlot } from '@/lib/personal/agenda/deletePersonalAgendaSlotClient';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const inputCls =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500';

type CreateMode = 'single' | 'period';
type DateScope = 'day' | 'range';

function formatDateLong(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR');
}

function monthInputValue(date: string): string {
  return date.slice(0, 7);
}

function StatusBadge({ status }: { status: PersonalAvailabilityStatus }) {
  const config = {
    available: { label: 'Disponível', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    reserved: { label: 'Reservado', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    blocked: { label: 'Bloqueado', className: 'bg-red-50 text-red-700 border-red-200' },
  }[status];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

function SlotIconButton({
  label,
  onClick,
  disabled,
  icon: Icon,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon: typeof Pencil;
  tone: 'edit' | 'block' | 'unlock' | 'delete';
}) {
  const tones = {
    edit: 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100',
    block: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    unlock: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    delete: 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200',
  }[tone];
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-50 ${tones}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

type DaySummary = { total: number; available: number; reserved: number; blocked: number };

type Props = {
  /** Substitui o painel da direita (desktop: calendário fica fixo). */
  sidePanel?: ReactNode;
  /** Força um novo carregamento dos horários (ex.: após edição em massa). */
  reloadKey?: number;
};

export default function MetapersonalAvailabilityManager({
  sidePanel,
  reloadKey = 0,
}: Props) {
  const today = useMemo(() => getBrazilDateKey(), []);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [slots, setSlots] = useState<PersonalAvailabilityApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>('period');
  const [dateScope, setDateScope] = useState<DateScope>('day');
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(() => lastDateKeyOfMonth(new Date().getFullYear(), new Date().getMonth()));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [periodPreset, setPeriodPreset] = useState<PeriodPresetId>('manha');
  const [periodStart, setPeriodStart] = useState(PERIOD_PRESETS.manha.startTime);
  const [periodEnd, setPeriodEnd] = useState(PERIOD_PRESETS.manha.endTime);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [singleStart, setSingleStart] = useState('09:00');
  const [singleEnd, setSingleEnd] = useState('10:00');
  const [confirmDeleteDay, setConfirmDeleteDay] = useState(false);
  const [editingSlot, setEditingSlot] = useState<PersonalAvailabilityApiRow | null>(null);
  const [savingConsulta, setSavingConsulta] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [dayTimelineOpen, setDayTimelineOpen] = useState(false);
  const { confirmarApagarConsulta, confirmarApagarConsultaModal } = useConfirmarApagarConsulta();

  const monthRange = useMemo(() => {
    const fromDate = toDateKey(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    return { fromDate, toDate: toDateKey(viewYear, viewMonth, lastDay) };
  }, [viewYear, viewMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ fromDate: monthRange.fromDate, toDate: monthRange.toDate });
      const res = await personalAgendaAuthFetch(`/api/metapersonal/agenda/availability/list?${params}`);
      const data = (await res.json()) as { slots?: PersonalAvailabilityApiRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar horários.');
      setSlots(data.slots || []);
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [monthRange.fromDate, monthRange.toDate]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/rules');
        const data = (await res.json()) as { rules?: WhiteLabelAvailabilityRule[] };
        if (!res.ok || cancelled) return;
        const fromRules = weekdaysFromRecurringRules(data.rules || []);
        if (fromRules.length > 0) setWeekdays(fromRules);
      } catch {
        /* mantém segunda a sexta */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const daySummaryMap = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const slot of slots) {
      const current = map.get(slot.date) || { total: 0, available: 0, reserved: 0, blocked: 0 };
      current.total += 1;
      current[slot.status] += 1;
      map.set(slot.date, current);
    }
    return map;
  }, [slots]);

  const calendarCells = useMemo(() => getMonthCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const selectedDaySlots = useMemo(
    () => slots.filter((slot) => slot.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots, selectedDate]
  );
  const previewSlots = useMemo(() => {
    if (createMode === 'single') return [{ startTime: singleStart, endTime: singleEnd }];
    return generateSlotsInRange(periodStart, periodEnd, durationMinutes);
  }, [createMode, singleStart, singleEnd, periodStart, periodEnd, durationMinutes]);

  const targetDates = useMemo(() => {
    if (dateScope !== 'range') return [selectedDate];
    if (!rangeFrom) return [];
    const end = rangeTo || rangeFrom;
    return listDateKeysInRange(rangeFrom, end, { weekdays, minDate: today });
  }, [dateScope, selectedDate, rangeFrom, rangeTo, weekdays, today]);

  const totalToCreate = previewSlots.length * targetDates.length;
  const deletableDayCount = selectedDaySlots.filter((slot) => slot.status !== 'reserved').length;
  const reservedDayCount = selectedDaySlots.filter((slot) => slot.status === 'reserved').length;

  const handleSelectDate = useCallback(
    (dateKey: string) => {
      setSelectedDate(dateKey);
      setConfirmDeleteDay(false);
      const pickingRange = !sidePanel && dateScope === 'range';
      if (pickingRange) {
        if (!rangeFrom || rangeTo) {
          setRangeFrom(dateKey);
          setRangeTo('');
          return;
        }
        if (dateKey < rangeFrom) {
          setRangeTo(rangeFrom);
          setRangeFrom(dateKey);
          return;
        }
        setRangeTo(dateKey);
        return;
      }
      setDayTimelineOpen(true);
    },
    [dateScope, rangeFrom, rangeTo, sidePanel]
  );

  const applyRangePreset = useCallback(
    (kind: 'month' | '3months' | 'year') => {
      setDateScope('range');
      const startMonth = selectedDate >= today ? selectedDate : today;
      const parsed = parseDateKey(startMonth);
      if (!parsed) return;
      setRangeFrom(startMonth);
      if (kind === 'month') {
        setRangeTo(lastDateKeyOfMonth(parsed.year, parsed.month));
        return;
      }
      if (kind === '3months') {
        const next = addMonths(parsed.year, parsed.month, 2);
        setRangeTo(lastDateKeyOfMonth(next.year, next.month));
        return;
      }
      setRangeTo(lastDateKeyOfMonth(parsed.year, 11));
    },
    [selectedDate, today]
  );

  const toggleWeekday = useCallback((day: number) => {
    setWeekdays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((item) => item !== day);
        return next.length === 0 ? prev : next;
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (dateScope === 'range') {
      if (!rangeFrom) {
        setMessage({ type: 'err', text: 'Escolha a data inicial do intervalo.' });
        return;
      }
      if (!rangeTo) {
        setMessage({ type: 'err', text: 'Escolha a data final do intervalo (ex.: dezembro).' });
        return;
      }
      if (targetDates.length === 0) {
        setMessage({ type: 'err', text: 'Nenhum dia válido no intervalo. Ajuste o período ou os dias da semana.' });
        return;
      }
    } else if (!selectedDate) {
      setMessage({ type: 'err', text: 'Selecione uma data no calendário.' });
      return;
    }
    if (previewSlots.length === 0) {
      setMessage({ type: 'err', text: 'Nenhum horário válido para criar.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const timePayload =
        createMode === 'single'
          ? { startTime: singleStart, endTime: singleEnd }
          : { periodStart, periodEnd, durationMinutes };
      const payload =
        dateScope === 'range'
          ? { fromDate: rangeFrom, toDate: rangeTo, weekdays, ...timePayload }
          : { date: selectedDate, ...timePayload };
      const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/availability/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        created?: unknown[];
        skipped?: unknown[];
        success?: boolean;
      };
      if (!res.ok && !data.created?.length) throw new Error(data.error || data.message || 'Falha ao criar horários.');
      setMessage({
        type: data.success === false && data.skipped?.length ? 'err' : 'ok',
        text: data.message || `${data.created?.length || 0} horário(s) criado(s).`,
      });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [
    dateScope,
    rangeFrom,
    rangeTo,
    targetDates.length,
    selectedDate,
    previewSlots.length,
    createMode,
    singleStart,
    singleEnd,
    periodStart,
    periodEnd,
    durationMinutes,
    weekdays,
    load,
  ]);

  const handleUpdate = useCallback(
    async (id: string, action: { status?: 'available' | 'blocked'; delete?: boolean }) => {
      setSaving(true);
      setMessage(null);
      try {
        const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/availability/update', {
          method: 'POST',
          body: JSON.stringify({ id, ...action }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Falha ao atualizar horário.');
        await load();
      } catch (err) {
        setMessage({ type: 'err', text: (err as Error).message });
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const handleSaveConsulta = useCallback(
    async (input: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      observacoes: string;
    }) => {
      setSavingConsulta(true);
      setConsultaError(null);
      try {
        const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/meetings/update', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Falha ao salvar consulta.');
        const parsed = parseDateKey(input.date);
        if (parsed) {
          setViewYear(parsed.year);
          setViewMonth(parsed.month);
        }
        setSelectedDate(input.date);
        setEditingSlot(null);
        await load();
      } catch (err) {
        setConsultaError((err as Error).message);
      } finally {
        setSavingConsulta(false);
      }
    },
    [load]
  );

  const handleDeleteSlot = useCallback(
    async (slot: PersonalAvailabilityApiRow) => {
      setSaving(true);
      setMessage(null);
      try {
        await deletePersonalAgendaSlot(slot);
        if (slot.status === 'reserved') {
          setEditingSlot((current) => (current?.id === slot.id ? null : current));
        }
        await load();
      } catch (err) {
        setMessage({ type: 'err', text: (err as Error).message });
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const handleDeleteDay = useCallback(async () => {
    if (!selectedDate || deletableDayCount === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/availability/delete-day', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          blockGenerated: selectedDaySlots.some(
            (slot) => slot.source === 'generated' || slot.source === 'extra'
          ),
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao apagar horários do dia.');
      setMessage({ type: 'ok', text: data.message || 'Horários do dia removidos.' });
      setConfirmDeleteDay(false);
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [selectedDate, deletableDayCount, selectedDaySlots, load]);

  const rangeActive = dateScope === 'range' && !!rangeFrom;
  const rangeEnd = rangeTo || rangeFrom;

  return (
    <>
    <div className="grid grid-cols-1 items-stretch gap-4 md:h-[calc(100vh-13rem)] md:min-h-[36rem] md:grid-cols-[minmax(17.5rem,5fr)_minmax(0,7fr)]">
      <div className="flex min-w-0 flex-col bg-white border border-gray-200 rounded-2xl p-4 md:p-5 md:h-full md:overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => { const n = addMonths(viewYear, viewMonth, -1); setViewYear(n.year); setViewMonth(n.month); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Mês anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h4 className="text-base font-semibold text-gray-900">{MONTHS[viewMonth]} {viewYear}</h4>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
              aria-label="Atualizar calendário"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => { const n = addMonths(viewYear, viewMonth, 1); setViewYear(n.year); setViewMonth(n.month); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Próximo mês">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((dateKey, idx) => {
              if (!dateKey) return <div key={`empty-${idx}`} className="aspect-square" />;
              const summary = daySummaryMap.get(dateKey);
              const isSelected = selectedDate === dateKey;
              const isToday = dateKey === today;
              const isPast = dateKey < today;
              const inRange =
                rangeActive && rangeEnd && dateKey >= rangeFrom && dateKey <= rangeEnd;
              const isRangeEdge = rangeActive && (dateKey === rangeFrom || (rangeTo && dateKey === rangeTo));
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleSelectDate(dateKey)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-all ${
                    isSelected || isRangeEdge
                      ? 'bg-green-600 text-white font-bold shadow-lg shadow-green-600/20 scale-105 z-10'
                      : inRange
                        ? 'bg-green-100 text-green-800 font-medium'
                        : isPast
                          ? 'text-gray-300 hover:bg-gray-50'
                          : 'text-gray-800 hover:bg-gray-100'
                  } ${isToday && !isSelected && !isRangeEdge ? 'ring-1 ring-green-500/50' : ''}`}
                >
                  <span>{parseDateKey(dateKey)?.day}</span>
                  {summary && summary.total > 0 && (
                    <div className="flex gap-0.5">
                      {summary.available > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected || isRangeEdge ? 'bg-white/70' : 'bg-emerald-500'}`} />}
                      {summary.reserved > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected || isRangeEdge ? 'bg-white/50' : 'bg-cyan-500'}`} />}
                      {summary.blocked > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected || isRangeEdge ? 'bg-white/40' : 'bg-red-500'}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-500">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponível</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Reservado</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Bloqueado</span>
          </div>
        </div>

        <div className="min-w-0 space-y-4 md:h-full md:overflow-y-auto md:pr-1">
          {message ? (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                message.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {message.text}
            </div>
          ) : null}
          {sidePanel ?? (
          <>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">
              {dateScope === 'range' ? 'Período selecionado' : 'Data selecionada'}
            </p>
            <h4 className="text-lg font-bold text-gray-900 capitalize">
              {dateScope === 'range' && rangeFrom
                ? rangeTo
                  ? `${formatDateShort(rangeFrom)} até ${formatDateShort(rangeTo)}`
                  : `${formatDateShort(rangeFrom)} — escolha a data final`
                : formatDateLong(selectedDate)}
            </h4>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-semibold text-gray-900">Adicionar horários</h4>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Em quais dias aplicar</p>
              <div className="flex gap-2">
                {([
                  { id: 'day' as const, label: 'Só este dia', icon: CalendarDays },
                  { id: 'range' as const, label: 'Intervalo de datas', icon: CalendarRange },
                ]).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setDateScope(option.id);
                      if (option.id === 'range') {
                        setRangeFrom(selectedDate >= today ? selectedDate : today);
                        if (!rangeTo || rangeTo < selectedDate) {
                          const parsed = parseDateKey(selectedDate);
                          setRangeTo(parsed ? lastDateKeyOfMonth(parsed.year, parsed.month) : selectedDate);
                        }
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      dateScope === option.id ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <option.icon className="w-3.5 h-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {dateScope === 'range' && (
              <div className="space-y-3 rounded-xl border border-green-100 bg-green-50/50 p-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => applyRangePreset('month')} className="px-2.5 py-1 rounded-md text-[11px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                    Este mês
                  </button>
                  <button type="button" onClick={() => applyRangePreset('3months')} className="px-2.5 py-1 rounded-md text-[11px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                    Próximos 3 meses
                  </button>
                  <button type="button" onClick={() => applyRangePreset('year')} className="px-2.5 py-1 rounded-md text-[11px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                    Até dezembro
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">De (mês)</label>
                    <input
                      type="month"
                      value={monthInputValue(rangeFrom || today)}
                      onChange={(e) => {
                        const [y, m] = e.target.value.split('-').map(Number);
                        if (!y || !m) return;
                        setRangeFrom(toDateKey(y, m - 1, 1));
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Até (mês)</label>
                    <input
                      type="month"
                      value={monthInputValue(rangeTo || rangeFrom || today)}
                      onChange={(e) => {
                        const [y, m] = e.target.value.split('-').map(Number);
                        if (!y || !m) return;
                        setRangeTo(lastDateKeyOfMonth(y, m - 1));
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data inicial</label>
                    <input type="date" value={rangeFrom} min={today} onChange={(e) => setRangeFrom(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data final</label>
                    <input type="date" value={rangeTo} min={rangeFrom || today} onChange={(e) => setRangeTo(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Dias da semana</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WHITELABEL_WEEKDAYS.map((day) => {
                      const active = weekdays.includes(day.weekday);
                      return (
                        <button
                          key={day.weekday}
                          type="button"
                          onClick={() => toggleWeekday(day.weekday)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                            active ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 bg-white text-gray-600'
                          }`}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  {targetDates.length} dia(s) no intervalo
                  {previewSlots.length > 0 ? ` · ${totalToCreate} horário(s) no total` : ''}.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {(['period', 'single'] as CreateMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCreateMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    createMode === mode ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'period' ? 'Faixa de horário' : 'Horário único'}
                </button>
              ))}
            </div>
            {createMode === 'period' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PERIOD_PRESETS) as Exclude<PeriodPresetId, 'custom'>[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setPeriodPreset(preset);
                        setPeriodStart(PERIOD_PRESETS[preset].startTime);
                        setPeriodEnd(PERIOD_PRESETS[preset].endTime);
                        setCreateMode('period');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs border ${
                        periodPreset === preset ? 'border-violet-400 bg-violet-50 text-violet-800' : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {PERIOD_PRESETS[preset].label} ({PERIOD_PRESETS[preset].startTime}–{PERIOD_PRESETS[preset].endTime})
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Início</label>
                    <input type="time" value={periodStart} onChange={(e) => { setPeriodPreset('custom'); setPeriodStart(e.target.value); }} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fim</label>
                    <input type="time" value={periodEnd} onChange={(e) => { setPeriodPreset('custom'); setPeriodEnd(e.target.value); }} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Duração</label>
                    <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={inputCls}>
                      {SLOT_DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {previewSlots.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Pré-visualização por dia — {previewSlots.length} horário(s)
                      {dateScope === 'range' && targetDates.length > 1 ? ` × ${targetDates.length} dias` : ''}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewSlots.map((slot) => (
                        <span key={`${slot.startTime}-${slot.endTime}`} className="text-[11px] px-2 py-1 rounded-md bg-white text-gray-700 border border-gray-200">
                          {slot.startTime}–{slot.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Início</label>
                  <input type="time" value={singleStart} onChange={(e) => setSingleStart(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Término</label>
                  <input type="time" value={singleEnd} onChange={(e) => setSingleEnd(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving || previewSlots.length === 0 || (dateScope === 'range' && targetDates.length === 0)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {dateScope === 'range' && targetDates.length > 1
                ? `Criar ${totalToCreate} horários em ${targetDates.length} dias`
                : previewSlots.length > 1
                  ? `Criar ${previewSlots.length} horários`
                  : 'Criar horário'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-900">Horários do dia ({selectedDaySlots.length})</h4>
              </div>
              {selectedDaySlots.length > 0 && deletableDayCount > 0 && !confirmDeleteDay && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmDeleteDay(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Apagar horários do dia
                </button>
              )}
            </div>
            {confirmDeleteDay && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-sm text-red-900 space-y-2">
                <p>
                  Remover {deletableDayCount} horário(s) livres deste dia?
                  {reservedDayCount > 0 ? ` ${reservedDayCount} consulta(s) já agendada(s) serão mantidas.` : ''}
                  {selectedDaySlots.some((slot) => slot.source === 'generated' || slot.source === 'extra')
                    ? ' Horários recorrentes deste dia também deixam de aparecer.'
                    : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleDeleteDay()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Confirmar exclusão
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setConfirmDeleteDay(false)}
                    className="px-3 py-1.5 rounded-lg bg-white text-gray-700 border border-gray-200 text-xs font-medium hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-green-600" /></div>
            ) : selectedDaySlots.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12 px-4">Nenhum horário neste dia. Use o formulário acima ou a aba Recorrente.</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                {selectedDaySlots.map((slot) => (
                  <div key={slot.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">{slot.startTime} – {slot.endTime}</span>
                        <StatusBadge status={slot.status} />
                      </div>
                      {slot.status === 'reserved' && (
                        <p className="text-xs text-gray-600 font-medium">{slot.pacienteNome}</p>
                      )}
                      {slot.status === 'reserved' && slot.observacoes ? (
                        <p className="text-xs text-gray-500 line-clamp-2">{slot.observacoes}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {slot.status === 'reserved' && (
                        <>
                          <SlotIconButton
                            label="Editar consulta"
                            icon={Pencil}
                            tone="edit"
                            disabled={saving || savingConsulta}
                            onClick={() => {
                              setConsultaError(null);
                              setEditingSlot(slot);
                            }}
                          />
                          <SlotIconButton
                            label="Apagar consulta"
                            icon={Trash2}
                            tone="delete"
                            disabled={saving || savingConsulta}
                            onClick={() => {
                              confirmarApagarConsulta(slot.pacienteNome || 'Paciente', () => {
                                void handleDeleteSlot(slot);
                              });
                            }}
                          />
                        </>
                      )}
                      {slot.status === 'available' && (
                        <>
                          <SlotIconButton
                            label="Bloquear horário"
                            icon={Ban}
                            tone="block"
                            disabled={saving}
                            onClick={() => void handleUpdate(slot.id, { status: 'blocked' })}
                          />
                          <SlotIconButton
                            label="Apagar horário"
                            icon={Trash2}
                            tone="delete"
                            disabled={saving}
                            onClick={() => void handleDeleteSlot(slot)}
                          />
                        </>
                      )}
                      {slot.status === 'blocked' && (
                        <>
                          <SlotIconButton
                            label="Liberar horário"
                            icon={Unlock}
                            tone="unlock"
                            disabled={saving}
                            onClick={() => void handleUpdate(slot.id, { status: 'available' })}
                          />
                          <SlotIconButton
                            label="Apagar horário"
                            icon={Trash2}
                            tone="delete"
                            disabled={saving}
                            onClick={() => void handleDeleteSlot(slot)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          )}
        </div>
    </div>
      {dayTimelineOpen ? (
        <MetapersonalAgendaDayTimelineModal
          open
          date={selectedDate}
          slots={selectedDaySlots}
          saving={saving || savingConsulta}
          onClose={() => setDayTimelineOpen(false)}
          onEdit={(slot) => {
            setConsultaError(null);
            setEditingSlot(slot);
          }}
          onDelete={(slot) => void handleDeleteSlot(slot)}
        />
      ) : null}
      {editingSlot ? (
        <EditarConsultaCalendarioModal
          consulta={{
            id: editingSlot.id,
            date: editingSlot.date,
            startTime: editingSlot.startTime,
            endTime: editingSlot.endTime,
            pacienteNome: editingSlot.pacienteNome || 'Paciente',
            pacienteId: editingSlot.pacienteId,
            observacoes: editingSlot.observacoes,
          }}
          saving={savingConsulta}
          error={consultaError}
          onClose={() => {
            if (savingConsulta) return;
            setEditingSlot(null);
            setConsultaError(null);
          }}
          onSave={handleSaveConsulta}
          onDelete={(id) => {
            const slot = editingSlot?.id === id ? editingSlot : selectedDaySlots.find((item) => item.id === id);
            if (slot) return handleDeleteSlot(slot);
            return Promise.resolve();
          }}
        />
      ) : null}
      {confirmarApagarConsultaModal}
    </>
  );
}
