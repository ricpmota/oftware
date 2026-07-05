'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, Clock, Loader2 } from 'lucide-react';
import type { WhiteLabelAvailabilityApiRow } from '@/types/whiteLabelAvailability';

const SLOT_UNAVAILABLE_MSG =
  'Esse horário acabou de ser reservado por outro médico. Escolha outro horário disponível.';

type Props = {
  selectedId: string | null;
  onSelect: (slot: WhiteLabelAvailabilityApiRow) => void;
  onViewed?: () => void;
  slotConflictError?: string;
  reloadKey?: number;
};

function formatDateShort(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatDateLong(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} – ${endTime}`;
}

function countSlotsByDate(slots: WhiteLabelAvailabilityApiRow[]) {
  const map = new Map<string, number>();
  for (const slot of slots) {
    map.set(slot.date, (map.get(slot.date) || 0) + 1);
  }
  return map;
}

export default function WhiteLabelMeetingScheduler({
  selectedId,
  onSelect,
  onViewed,
  slotConflictError,
  reloadKey = 0,
}: Props) {
  const [slots, setSlots] = useState<WhiteLabelAvailabilityApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mobileShowTimes, setMobileShowTimes] = useState(false);
  const [viewedFired, setViewedFired] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/whitelabel/availability/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { slots?: WhiteLabelAvailabilityApiRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar horários.');
      setSlots(data.slots || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots, reloadKey]);

  const dates = useMemo(() => [...new Set(slots.map((slot) => slot.date))].sort(), [slots]);
  const slotsByDate = useMemo(() => countSlotsByDate(slots), [slots]);

  useEffect(() => {
    if (!selectedDate && dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    if (!loading && !error && slots.length > 0 && !viewedFired) {
      setViewedFired(true);
      onViewed?.();
    }
  }, [loading, error, slots.length, viewedFired, onViewed]);

  useEffect(() => {
    if (slotConflictError) {
      loadSlots();
    }
  }, [slotConflictError, loadSlots]);

  const slotsForDate = useMemo(
    () => slots.filter((slot) => slot.date === selectedDate),
    [slots, selectedDate]
  );

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setMobileShowTimes(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm font-medium">Carregando horários disponíveis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900 text-center">
        Sem horários disponíveis no momento. Nossa equipe entrará em contato para agendar sua reunião.
      </div>
    );
  }

  const conflictMsg = slotConflictError || undefined;

  return (
    <div className="space-y-4">
      {conflictMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {conflictMsg.includes('reservado') ? SLOT_UNAVAILABLE_MSG : conflictMsg}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 min-h-[320px]">
          {/* Dias */}
          <div
            className={`md:col-span-2 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/80 ${
              mobileShowTimes ? 'hidden md:block' : 'block'
            }`}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-800">Dias disponíveis</span>
            </div>
            <div className="p-2 space-y-1 max-h-[280px] overflow-y-auto">
              {dates.map((date) => {
                const active = selectedDate === date;
                const count = slotsByDate.get(date) || 0;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => handleSelectDate(date)}
                    className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/25'
                        : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-white'
                    }`}
                  >
                    <p className="text-sm font-semibold capitalize">{formatDateLong(date)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {count} horário{count !== 1 ? 's' : ''} disponível{count !== 1 ? 'is' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horários */}
          <div
            className={`md:col-span-3 ${!mobileShowTimes ? 'hidden md:block' : 'block'}`}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                className="md:hidden mr-1 p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileShowTimes(false)}
                aria-label="Voltar para dias"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-800">
                {selectedDate ? (
                  <span className="capitalize">{formatDateShort(selectedDate)}</span>
                ) : (
                  'Horários'
                )}
              </span>
            </div>

            <div className="p-3">
              {!selectedDate ? (
                <p className="text-sm text-slate-500 text-center py-12">Selecione um dia</p>
              ) : slotsForDate.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">
                  Nenhum horário disponível neste dia.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {slotsForDate.map((slot) => {
                    const selected = selectedId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => onSelect(slot)}
                        className={`px-3 py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/80'
                        }`}
                      >
                        {formatTimeRange(slot.startTime, slot.endTime)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedId && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          Horário selecionado. Clique em &quot;Revisar agendamento&quot; para continuar.
        </p>
      )}
    </div>
  );
}
