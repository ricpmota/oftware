'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import type { WhiteLabelAvailabilityApiRow } from '@/types/whiteLabelAvailability';

async function authFetch(url: string, init?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

type Props = {
  leadId: string;
  onScheduled: (meeting: {
    availabilityId: string;
    date: string;
    startTime: string;
    endTime: string;
    googleMeetLink?: string;
    status: 'scheduled' | 'error';
  }) => void;
};

function formatDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export default function WhiteLabelManualMeetingPicker({ leadId, onScheduled }: Props) {
  const [slots, setSlots] = useState<WhiteLabelAvailabilityApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/availability/list');
      const data = (await res.json()) as { slots?: WhiteLabelAvailabilityApiRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar horários.');
      const available = (data.slots || []).filter((slot) => slot.status === 'available');
      const today = new Date().toISOString().slice(0, 10);
      setSlots(available.filter((slot) => slot.date >= today));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const dates = useMemo(() => [...new Set(slots.map((slot) => slot.date))].sort(), [slots]);

  useEffect(() => {
    if (!selectedDate && dates.length > 0) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  const slotsForDate = useMemo(
    () => slots.filter((slot) => slot.date === selectedDate),
    [slots, selectedDate]
  );

  const handleSchedule = useCallback(async () => {
    if (!selectedSlotId) {
      setError('Selecione um horário.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/schedule-meeting', {
        method: 'POST',
        body: JSON.stringify({ leadId, availabilityId: selectedSlotId }),
      });
      const data = (await res.json()) as {
        error?: string;
        meeting?: {
          availabilityId: string;
          date: string;
          startTime: string;
          endTime: string;
          googleMeetLink?: string;
          calendarCreated: boolean;
          calendarError?: string;
        };
      };

      if (!res.ok) throw new Error(data.error || 'Falha ao agendar reunião.');

      const meeting = data.meeting!;
      onScheduled({
        availabilityId: meeting.availabilityId,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        googleMeetLink: meeting.googleMeetLink,
        status: meeting.calendarCreated ? 'scheduled' : 'error',
      });

      if (!meeting.calendarCreated && meeting.calendarError) {
        setError(meeting.calendarError);
      }
    } catch (err) {
      setError((err as Error).message);
      if ((err as Error).message.includes('disponível')) {
        setSelectedSlotId(null);
        await loadSlots();
      }
    } finally {
      setSaving(false);
    }
  }, [leadId, selectedSlotId, onScheduled, loadSlots]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#E8EDED]/60 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#4CCB7A]" />
        Carregando horários...
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
        Nenhum horário disponível no momento. Cadastre horários na seção &quot;Disponibilidade para
        Reuniões&quot; acima.
      </p>
    );
  }

  return (
    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-violet-200">Agendar reunião manualmente</p>
        <p className="text-xs text-[#E8EDED]/60 mt-1">
          Este lead não escolheu horário no formulário. Selecione um horário disponível.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 text-[#E8EDED]/70 mb-2">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Dia</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {dates.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => {
                setSelectedDate(date);
                setSelectedSlotId(null);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                selectedDate === date
                  ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                  : 'border-white/15 bg-white/5 text-[#E8EDED]/80 hover:bg-white/10'
              }`}
            >
              {formatDateLabel(date)}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div>
          <div className="flex items-center gap-2 text-[#E8EDED]/70 mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Horário</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slotsForDate.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  selectedSlotId === slot.id
                    ? 'border-violet-400 bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/40'
                    : 'border-white/15 bg-white/5 text-[#E8EDED]/80 hover:bg-white/10'
                }`}
              >
                {slot.startTime} – {slot.endTime}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSchedule}
        disabled={saving || !selectedSlotId}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Confirmar agendamento
      </button>
    </div>
  );
}
