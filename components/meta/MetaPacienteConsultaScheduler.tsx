'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  addMonths,
  getBrazilDateKey,
  getMonthCalendarGrid,
  parseDateKey,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import type { MedicoAvailabilityApiRow } from '@/types/medicoAgenda';

type Props = {
  slots: MedicoAvailabilityApiRow[];
  loading: boolean;
  error: string;
  selectedId: string | null;
  onSelect: (slot: MedicoAvailabilityApiRow | null) => void;
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
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

function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

function formatDateLong(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function MetaPacienteConsultaScheduler({
  slots,
  loading,
  error,
  selectedId,
  onSelect,
}: Props) {
  const today = useMemo(() => getBrazilDateKey(), []);
  const todayParsed = parseDateKey(today);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => todayParsed?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => todayParsed?.month ?? new Date().getMonth());

  const availableDates = useMemo(() => new Set(slots.map((slot) => slot.date)), [slots]);
  const sortedDates = useMemo(() => [...availableDates].sort(), [availableDates]);

  useEffect(() => {
    if (sortedDates.length === 0) return;
    const todayPrefix = today.slice(0, 7);
    const currentHasSlots = sortedDates.some((date) => date.startsWith(todayPrefix));
    const target = parseDateKey(currentHasSlots ? today : sortedDates[0]);
    if (!target) return;
    setViewYear(target.year);
    setViewMonth(target.month);
  }, [sortedDates, today]);

  const bounds = useMemo(() => {
    const first = parseDateKey(sortedDates[0] || '');
    const last = parseDateKey(sortedDates[sortedDates.length - 1] || '');
    if (!first || !last) return null;
    return { min: monthIndex(first.year, first.month), max: monthIndex(last.year, last.month) };
  }, [sortedDates]);

  const calendarCells = useMemo(
    () => getMonthCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const daySlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots, selectedDate]
  );

  const handlePickDate = useCallback(
    (date: string) => {
      if (!availableDates.has(date)) return;
      setSelectedDate(date);
      onSelect(null);
    },
    [availableDates, onSelect]
  );

  const handleBackToCalendar = useCallback(() => {
    setSelectedDate(null);
    onSelect(null);
  }, [onSelect]);

  const goMonth = (delta: number) => {
    const next = addMonths(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-4" role="alert">
        {error}
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-2xl px-4 py-6 text-center">
        Nenhum horário disponível no momento. Fale com seu médico pelo WhatsApp.
      </p>
    );
  }

  if (selectedDate) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-4">
        <button
          type="button"
          onClick={handleBackToCalendar}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          <ChevronLeft className="w-4 h-4" />
          Outro dia
        </button>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Horários em</p>
          <h2 className="text-lg font-bold text-slate-900 capitalize">{formatDateLong(selectedDate)}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {daySlots.map((slot) => {
            const active = selectedId === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => onSelect(slot)}
                className={`px-3 py-3 rounded-xl text-sm font-semibold border transition-all ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {slot.startTime} – {slot.endTime}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const currentMonth = monthIndex(viewYear, viewMonth);
  const canPrev = bounds ? currentMonth > bounds.min : false;
  const canNext = bounds ? currentMonth < bounds.max : false;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          disabled={!canPrev}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-slate-900">
          {MONTHS[viewMonth]} {viewYear}
        </h2>
        <button
          type="button"
          onClick={() => goMonth(1)}
          disabled={!canNext}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1">
            {day}
          </div>
        ))}
        {calendarCells.map((dateKey, idx) => {
          if (!dateKey) return <div key={`empty-${idx}`} className="aspect-square" />;
          const available = availableDates.has(dateKey);
          const isToday = dateKey === today;
          const dayNumber = parseDateKey(dateKey)?.day;
          return (
            <button
              key={dateKey}
              type="button"
              disabled={!available}
              onClick={() => handlePickDate(dateKey)}
              aria-label={
                available
                  ? `${formatDateLong(dateKey)}, com horário disponível`
                  : `${formatDateLong(dateKey)}, sem horário`
              }
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-all ${
                available
                  ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400'
                  : 'text-slate-300 cursor-not-allowed'
              } ${isToday && available ? 'ring-1 ring-emerald-500/50' : ''} ${
                isToday && !available ? 'ring-1 ring-slate-200' : ''
              }`}
            >
              <span>{dayNumber}</span>
              {available ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : null}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 pt-1">
        Toque num dia destacado para ver os horários. Depois você pode voltar e escolher outra data.
      </p>
    </div>
  );
}
