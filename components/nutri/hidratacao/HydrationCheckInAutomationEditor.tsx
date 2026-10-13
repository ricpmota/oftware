'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import {
  HYDRATION_CHECKIN_SEND_HHMM,
  type HydrationNextSendPreview,
} from '@/lib/nutri/hidratacao/hydrationCheckInSettings';
import { formatHydrationHistoryDate } from '@/lib/nutri/hidratacao/hydrationMath';

type SettingsPayload = {
  ok: true;
  enabled: boolean;
  time: string;
  nextSend?: HydrationNextSendPreview;
};

type Props = {
  patientId: string;
};

async function settingsFetch(url: string, init?: RequestInit) {
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

export function HydrationCheckInAutomationEditor({ patientId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(HYDRATION_CHECKIN_SEND_HHMM);
  const [nextSend, setNextSend] = useState<HydrationNextSendPreview | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeq = useRef(0);

  const applyPayload = (payload: SettingsPayload) => {
    setEnabled(payload.enabled);
    setTime(payload.time);
    setNextSend(payload.nextSend ?? null);
  };

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await settingsFetch(
        `/api/hidratacao/automation-settings?patientId=${encodeURIComponent(patientId)}`
      );
      const payload = (await res.json().catch(() => null)) as SettingsPayload | { error?: string } | null;
      if (!res.ok || !payload || !('ok' in payload) || !payload.ok) {
        throw new Error((payload as { error?: string } | null)?.error || 'Não foi possível carregar.');
      }
      applyPayload(payload);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  const save = async (nextEnabled: boolean, nextTime: string) => {
    const parsedTime = parseHorarioBrasil(nextTime);
    if (!parsedTime) {
      setErro('Horário inválido.');
      return;
    }
    const seq = ++saveSeq.current;
    setSaving(true);
    setErro(null);
    try {
      const res = await settingsFetch('/api/hidratacao/automation-settings', {
        method: 'POST',
        body: JSON.stringify({ patientId, enabled: nextEnabled, time: parsedTime }),
      });
      const payload = (await res.json().catch(() => null)) as SettingsPayload | { error?: string } | null;
      if (!res.ok || !payload || !('ok' in payload) || !payload.ok) {
        throw new Error((payload as { error?: string } | null)?.error || 'Não foi possível salvar.');
      }
      if (seq !== saveSeq.current) return;
      applyPayload(payload);
    } catch (err) {
      if (seq !== saveSeq.current) return;
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      if (seq === saveSeq.current) setSaving(false);
    }
  };

  const handleToggle = () => {
    if (loading || saving) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const next = !enabled;
    setEnabled(next);
    void save(next, time);
  };

  const handleTimeChange = (value: string) => {
    setTime(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void save(enabled, value);
    }, 400);
  };

  const nextSendLine =
    nextSend?.kind === 'scheduled'
      ? `${formatHydrationHistoryDate(nextSend.dateYmd)} · ${nextSend.time}`
      : nextSend && nextSend.kind !== 'disabled'
        ? nextSend.label
        : null;

  return (
    <section className="rounded-2xl border border-teal-100/80 bg-white px-4 py-3 dark:border-[#4CCB7A]/20 dark:bg-[#0A1F44]/50">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Lembrete automático</p>
          {enabled ? (
            <>
              <p className="mt-0.5 text-xs text-[#0A1F44]/65 dark:text-[#E8EDED]/60">
                A cada 2 dias às {time}
              </p>
              {nextSendLine ? (
                <p className="mt-1 text-[11px] text-[#2F8FA3] dark:text-[#4CCB7A]">
                  Próximo envio previsto
                  <span className="mt-0.5 block font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
                    {nextSendLine}
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs font-medium text-[#0A1F44]/55 dark:text-[#E8EDED]/50">Desativado</p>
              <p className="mt-1 text-[11px] leading-snug text-[#0A1F44]/50 dark:text-[#E8EDED]/45">
                O paciente não receberá lembretes automáticos.
              </p>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {loading || saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-700 dark:text-[#4CCB7A]" aria-hidden />
          ) : null}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Lembrete automático"
            disabled={loading}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-60 ${
              enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          {enabled ? (
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#0A1F44]/45 dark:text-[#E8EDED]/45">
              Horário
              <input
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                disabled={loading}
                aria-label="Alterar horário"
                className="mt-0.5 block h-8 w-[6.75rem] rounded-lg border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-900 disabled:opacity-60 dark:border-white/15 dark:bg-[#0A1F44] dark:text-[#E8EDED]"
              />
            </label>
          ) : null}
        </div>
      </div>
      {erro ? (
        <p className="mt-2 text-[11px] text-red-600" role="alert">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
