'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import MetaPacienteConsultaScheduler from '@/components/meta/MetaPacienteConsultaScheduler';
import MetaPacienteConsultaReview from '@/components/meta/MetaPacienteConsultaReview';
import { metaPacienteAuthFetch } from '@/lib/meta/metaPacienteAuthFetch';
import { buildGoogleCalendarAddUrl } from '@/lib/whiteLabel/clientTrackingEvents';
import type { MedicoAvailabilityApiRow } from '@/types/medicoAgenda';

export type MedicoConsultaBookingPhase = 'loading' | 'off' | 'agenda' | 'review' | 'done' | 'error';

type Meeting = { date: string; startTime: string; endTime: string };

type Props = {
  pacienteId: string;
  medicoId: string;
  onPhaseChange: (phase: MedicoConsultaBookingPhase) => void;
};

export default function MetaPacienteConsultaBookingPanel({
  pacienteId,
  medicoId,
  onPhaseChange,
}: Props) {
  const [phase, setPhase] = useState<MedicoConsultaBookingPhase>('loading');
  const [slots, setSlots] = useState<MedicoAvailabilityApiRow[]>([]);
  const [medicoNome, setMedicoNome] = useState('');
  const [medicoEmail, setMedicoEmail] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');
  const [pacienteEmail, setPacienteEmail] = useState('');
  const [pacientePhone, setPacientePhone] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<MedicoAvailabilityApiRow | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setPhaseSynced = useCallback(
    (next: MedicoConsultaBookingPhase) => {
      setPhase(next);
      onPhaseChange(next);
    },
    [onPhaseChange]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setPhaseSynced('loading');
      setError('');
      try {
        const qs = new URLSearchParams({ pacienteId, medicoId });
        const res = await metaPacienteAuthFetch(`/api/meta/agenda/availability?${qs.toString()}`);
        const data = (await res.json()) as {
          enabled?: boolean;
          medicoNome?: string;
          medicoEmail?: string;
          pacienteNome?: string;
          pacienteEmail?: string;
          pacientePhone?: string;
          slots?: MedicoAvailabilityApiRow[];
          meeting?: Meeting | null;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar horários.');
        setMedicoNome(data.medicoNome || '');
        setMedicoEmail(data.medicoEmail || '');
        setPacienteNome(data.pacienteNome || '');
        setPacienteEmail(data.pacienteEmail || '');
        setPacientePhone(data.pacientePhone || '');
        if (!data.enabled) {
          setPhaseSynced('off');
          return;
        }
        if (data.meeting?.date) {
          setMeeting(data.meeting);
          setPhaseSynced('done');
          return;
        }
        setSlots(data.slots || []);
        setPhaseSynced('agenda');
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
        setPhaseSynced('error');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [medicoId, pacienteId, setPhaseSynced]);

  const submitAgenda = useCallback(async () => {
    if (!selectedSlot || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await metaPacienteAuthFetch('/api/meta/agenda/agendar', {
        method: 'POST',
        body: JSON.stringify({
          pacienteId,
          medicoId,
          availabilityId: selectedSlot.id,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        meeting?: Meeting;
        medicoNome?: string;
        medicoEmail?: string;
        pacienteNome?: string;
        pacienteEmail?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || 'Erro ao agendar.');
      if (json?.medicoNome) setMedicoNome(json.medicoNome);
      if (json?.medicoEmail) setMedicoEmail(json.medicoEmail);
      if (json?.pacienteNome) setPacienteNome(json.pacienteNome);
      if (json?.pacienteEmail) setPacienteEmail(json.pacienteEmail);
      setMeeting(json?.meeting || selectedSlot);
      setPhaseSynced('done');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [medicoId, pacienteId, saving, selectedSlot, setPhaseSynced]);

  if (phase === 'off') return null;

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-600">Carregando horários...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">
        {error || 'Não foi possível carregar os horários.'}
      </p>
    );
  }

  if (phase === 'done' && meeting) {
    const calendarUrl = buildGoogleCalendarAddUrl({
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      title: medicoNome ? `Consulta com ${medicoNome}` : 'Consulta médica',
      details: [
        medicoNome ? `Médico: ${medicoNome}` : null,
        pacienteNome ? `Paciente: ${pacienteNome}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      guests: [pacienteEmail, medicoEmail],
    });

    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full border border-slate-100 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-1">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Consulta agendada</h2>
        <p className="text-sm text-slate-600">
          {new Date(`${meeting.date}T12:00:00`).toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}{' '}
          · {meeting.startTime} – {meeting.endTime}
        </p>
        <p className="text-xs text-slate-500">
          {medicoNome
            ? `Você vai receber uma mensagem de ${medicoNome} com este horário.`
            : 'Você vai receber uma mensagem do médico com este horário.'}
        </p>
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-medium text-sm text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          Adicionar ao Google Agenda
        </a>
      </div>
    );
  }

  if (phase === 'review' && selectedSlot) {
    return (
      <div className="space-y-4">
        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">
            {error}
          </p>
        ) : null}
        <MetaPacienteConsultaReview
          slot={selectedSlot}
          pacienteNome={pacienteNome}
          pacienteEmail={pacienteEmail}
          pacientePhone={pacientePhone}
          medicoNome={medicoNome}
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setError('');
              setPhaseSynced('agenda');
            }}
            disabled={saving}
            className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            type="button"
            onClick={() => void submitAgenda()}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Concluir o Agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">
          {error}
        </p>
      ) : null}
      <MetaPacienteConsultaScheduler
        slots={slots}
        loading={false}
        error=""
        selectedId={selectedSlot?.id || null}
        onSelect={setSelectedSlot}
      />
      <button
        type="button"
        onClick={() => {
          if (!selectedSlot) {
            setError('Selecione um horário.');
            return;
          }
          setError('');
          setPhaseSynced('review');
        }}
        disabled={!selectedSlot}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 disabled:opacity-50"
      >
        Revisar agendamento
      </button>
    </div>
  );
}
