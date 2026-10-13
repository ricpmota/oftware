'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import {
  DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME,
  DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY,
  NUTRI_WEEKDAY_LABELS,
  type NutriWeeklyCheckInSchedule,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import {
  loadNutriWeeklyCheckInSchedule,
  saveNutriWeeklyCheckInSchedule,
} from '@/lib/nutri/checkInSemanalNutriScheduleStore';
import { parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import { auth } from '@/lib/firebase';

type Props = {
  patientId: string;
  nutritionistId: string;
  canConfigure: boolean;
};

const SEND_WEEKDAY = DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY;
const SEND_WEEKDAY_LABEL = NUTRI_WEEKDAY_LABELS[SEND_WEEKDAY];

export function CheckInSemanalNutriScheduleEditor({ patientId, nutritionistId, canConfigure }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [schedule, setSchedule] = useState<NutriWeeklyCheckInSchedule | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFeedback(null);
    setErro(null);
    loadNutriWeeklyCheckInSchedule(nutritionistId, patientId)
      .then((loaded) => {
        if (cancelled) return;
        setSchedule(loaded);
        setEnabled(Boolean(loaded?.enabled));
        setTime(loaded?.time ?? DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME);
        setEditing(!loaded);
      })
      .catch((err) => {
        if (!cancelled) setErro(err instanceof Error ? err.message : 'Não foi possível carregar o cronograma.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nutritionistId, patientId]);

  if (!canConfigure) return null;

  const handleSave = async () => {
    const parsedTime = parseHorarioBrasil(time);
    if (!parsedTime) {
      setErro('Informe um horário válido.');
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      const saved = await saveNutriWeeklyCheckInSchedule({
        nutritionistId,
        patientId,
        enabled,
        weekday: SEND_WEEKDAY,
        time: parsedTime,
        createdBy: nutritionistId,
      });
      setSchedule(saved);
      setEditing(false);
      setFeedback(
        saved.enabled
          ? `Cronograma salvo. O Check-in Semanal deste paciente será enviado toda segunda-feira às ${saved.time}.`
          : 'Cronograma salvo. O Check-in Semanal deste paciente está inativo.'
      );
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        await fetch('/api/metanutri/automacoes/whatsapp-queue/rebuild-patient', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pacienteId: patientId }),
        }).catch(() => undefined);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o cronograma.');
    } finally {
      setSaving(false);
    }
  };

  const showFullHeader = loading || editing || !schedule;

  return (
    <section
      className={`border border-teal-100 bg-white shadow-sm ${
        showFullHeader ? 'rounded-2xl p-4' : 'rounded-xl px-3 py-2 sm:rounded-2xl sm:px-4 sm:py-2.5'
      }`}
    >
      {showFullHeader ? (
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Cronograma</p>
            <h3 className="text-sm font-semibold text-slate-900">Check-in Semanal</h3>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : !schedule && !editing ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-slate-600">Não configurado</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
          >
            Configurar
          </button>
        </div>
      ) : !editing && schedule ? (
        <div className="flex min-w-0 items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-xs leading-tight text-slate-700 sm:text-sm">
            <span className="text-slate-500">Check-in</span>
            <span className="text-slate-400"> · </span>
            <span className={schedule.enabled ? 'font-medium text-emerald-700' : 'text-slate-500'}>
              {schedule.enabled ? 'Ativo' : 'Inativo'}
            </span>
            <span className="text-slate-400"> · </span>
            <span className="sm:hidden">Seg {schedule.time}</span>
            <span className="hidden sm:inline">
              Toda {SEND_WEEKDAY_LABEL.toLowerCase()} · {schedule.time}
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setFeedback(null);
            }}
            className="shrink-0 text-xs font-semibold text-teal-800 hover:underline sm:text-sm"
          >
            Editar
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-800">
            <span>Ativo</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                enabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dia de envio</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">Toda {SEND_WEEKDAY_LABEL.toLowerCase()}</p>
          </div>
          <label className="block text-sm font-medium text-slate-800">
            Horário
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <p className="text-xs text-slate-500">
            O paciente recebe o convite toda segunda-feira. Você só ajusta o horário.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            {schedule ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEnabled(schedule.enabled);
                  setTime(schedule.time);
                  setErro(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      )}

      {feedback ? <p className="mt-3 text-sm text-emerald-800">{feedback}</p> : null}
      {erro ? <p className="mt-3 text-sm text-red-600">{erro}</p> : null}
    </section>
  );
}
