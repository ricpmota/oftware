'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import HydrationCalendar from '@/components/nutri/hidratacao/HydrationCalendar';
import HydrationDayDetails from '@/components/nutri/hidratacao/HydrationDayDetails';
import {
  buildHydrationWeeklySummary,
  datesInHydrationMonth,
  formatHydrationLiters,
  formatHydrationMl,
  hydrationMonthKeyFromYmd,
  hydrationTodayYmd,
  last7HydrationDates,
  shiftHydrationMonth,
} from '@/lib/nutri/hidratacao/hydrationMath';
import { loadHydrationRecordsByDates } from '@/lib/nutri/hidratacao/hydrationStore';
import type { HydrationDayView, HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';
import {
  classifyHydrationCheckInFulfillment,
  formatHydrationCheckInPeriod,
  formatHydrationLastRecordLine,
  formatHydrationProfessionalWhen,
  hydrationCheckInOperationalBody,
  hydrationCheckInOperationalTitle,
  hydrationProfessionalNarrative,
  hydrationProfessionalStatusHint,
  hydrationProfessionalStatusLabel,
  type HydrationCheckInFulfillment,
} from '@/lib/nutri/hidratacao/hydrationProfessional';
import {
  evaluateHydrationAdherence,
  hydrationLookbackDates,
  type HydrationAdherenceStatus,
} from '@/lib/nutri/hidratacao/hydrationAdherence';
import { hydrationCheckInDefaultAllowedDates } from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import { auth } from '@/lib/firebase';
import { HydrationCheckInAutomationEditor } from '@/components/nutri/hidratacao/HydrationCheckInAutomationEditor';

type LinkStatusPayload = {
  ok: true;
  allowedDates: string[];
  hasLink: boolean;
  fulfillment: HydrationCheckInFulfillment;
  lastOpenedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  registeredDates: string[];
};

const STATUS_MARK: Record<HydrationAdherenceStatus, string> = {
  good: '🟢',
  attention: '🟡',
  alert: '🔴',
  insufficient_data: '🔵',
};

const CHECKIN_MARK: Record<HydrationCheckInFulfillment, string> = {
  pendente: '🟡',
  parcial: '🟡',
  concluido: '✓',
  expirado: '⚪',
  nenhum: '⚪',
};

type HydrationProfessionalPanelProps = {
  pacienteId: string;
  currentGoalMl: number;
};

async function professionalAuthFetch(url: string, init?: RequestInit) {
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

export default function HydrationProfessionalPanel({
  pacienteId,
  currentGoalMl,
}: HydrationProfessionalPanelProps) {
  const today = useMemo(() => hydrationTodayYmd(), []);
  const summaryDates = useMemo(() => last7HydrationDates(today), [today]);
  const lookbackDates = useMemo(() => hydrationLookbackDates(today), [today]);
  const [monthKey, setMonthKey] = useState(() => hydrationMonthKeyFromYmd(today));
  const monthDates = useMemo(() => datesInHydrationMonth(monthKey), [monthKey]);
  const loadDates = useMemo(
    () => Array.from(new Set([...summaryDates, ...lookbackDates, ...monthDates])),
    [summaryDates, lookbackDates, monthDates]
  );
  const [records, setRecords] = useState<Map<string, HydrationRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<LinkStatusPayload | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [revealUrl, setRevealUrl] = useState<string | null>(null);
  const [busyLink, setBusyLink] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const loaded = await loadHydrationRecordsByDates(pacienteId, loadDates);
      setRecords((prev) => {
        const next = new Map(prev);
        for (const date of loadDates) {
          const rec = loaded.get(date);
          if (rec) next.set(date, rec);
          else next.delete(date);
        }
        return next;
      });
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar hidratação profissional:', err);
      setError('Não foi possível carregar a hidratação deste paciente.');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, loadDates]);

  const loadLinkStatus = useCallback(async () => {
    if (!pacienteId) return;
    try {
      const res = await professionalAuthFetch(
        `/api/hidratacao/checkin-link?patientId=${encodeURIComponent(pacienteId)}`
      );
      const payload = (await res.json().catch(() => null)) as LinkStatusPayload | { error?: string } | null;
      if (!res.ok || !payload || !('ok' in payload) || !payload.ok) return;
      setLinkStatus(payload);
    } catch {
      /* status do link é auxiliar */
    }
  }, [pacienteId]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    void loadLinkStatus();
  }, [loadLinkStatus]);

  const days: HydrationDayView[] = lookbackDates.map((date) => ({
    date,
    record: records.get(date) ?? null,
  }));
  const weekDays: HydrationDayView[] = summaryDates.map((date) => ({
    date,
    record: records.get(date) ?? null,
  }));
  const summary = buildHydrationWeeklySummary(weekDays);
  const adherence = evaluateHydrationAdherence({ days, todayYmd: today });
  const narrative = hydrationProfessionalNarrative({ evaluation: adherence, summary });
  const statusHint = hydrationProfessionalStatusHint(adherence.status);

  const lastRecord = useMemo(() => {
    const registered = lookbackDates
      .map((date) => records.get(date))
      .filter((r): r is HydrationRecord => r != null);
    return registered[0] ?? null;
  }, [lookbackDates, records]);

  const selectedRecord = selectedDate ? records.get(selectedDate) ?? null : null;

  const periodDates = linkStatus?.allowedDates?.length
    ? linkStatus.allowedDates
    : hydrationCheckInDefaultAllowedDates();
  const registeredInPeriod = (linkStatus?.registeredDates ?? []).filter((date) => periodDates.includes(date));
  const fulfillment = linkStatus
    ? linkStatus.fulfillment
    : classifyHydrationCheckInFulfillment({
        hasLink: false,
        allowedDates: periodDates,
        registeredDates: [],
      });
  const checkInBody = hydrationCheckInOperationalBody({
    fulfillment,
    lastOpenedAt: linkStatus?.lastOpenedAt ?? null,
    completedAt: linkStatus?.completedAt ?? null,
    todayYmd: today,
  });

  const requestLink = async (deliver: null | 'canal_chat') => {
    if (busyLink) return;
    setBusyLink(true);
    setSendMessage(null);
    setCopyMessage(null);
    try {
      const res = await professionalAuthFetch('/api/hidratacao/checkin-link', {
        method: 'POST',
        body: JSON.stringify({
          patientId: pacienteId,
          ...(deliver ? { deliver } : {}),
        }),
      });
      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean;
        url?: string;
        error?: string;
        sent?: { status?: string; reason?: string } | null;
      } | null;
      if (!res.ok || !payload?.ok || !payload.url) {
        throw new Error(payload?.error || 'Não foi possível gerar o link.');
      }
      if (deliver === 'canal_chat') {
        if (payload.sent?.status === 'sent') {
          setSendMessage('Check-in enviado pelo Canal Chat.');
        } else {
          setSendMessage(payload.sent?.reason || 'Não foi possível enviar pelo Canal Chat.');
        }
      } else {
        await navigator.clipboard.writeText(payload.url);
        setCopyState('copied');
        setCopyMessage('Link de check-in copiado.');
        setRevealUrl(payload.url);
        window.setTimeout(() => setCopyState('idle'), 2500);
      }
      await loadLinkStatus();
    } catch (err) {
      setCopyState('error');
      setCopyMessage(err instanceof Error ? err.message : 'Não foi possível gerar o link.');
    } finally {
      setBusyLink(false);
    }
  };

  const kpis = [
    { label: 'Registrados', value: String(summary.daysRegistered) },
    { label: 'Sem registro', value: String(summary.daysWithoutRecord) },
    {
      label: 'Meta atingida',
      value: summary.daysRegistered === 0 ? '—' : `${summary.daysGoalReached}/${summary.daysRegistered}`,
    },
    {
      label: 'Média',
      value: summary.averageConsumedMl == null ? '—' : formatHydrationLiters(summary.averageConsumedMl),
    },
    {
      label: 'Adesão',
      value: summary.averageAdherencePct == null ? '—' : `${summary.averageAdherencePct}%`,
    },
    {
      label: 'Último registro',
      value: lastRecord ? formatHydrationLastRecordLine(lastRecord, today) : '—',
    },
  ];

  return (
    <div className="space-y-4 overflow-x-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Hidratação</h3>
          {currentGoalMl > 0 ? (
            <p className="mt-1 text-xs text-[#0A1F44]/50 dark:text-[#E8EDED]/45">
              Meta diária
              <span className="ml-1.5 text-lg font-semibold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">
                {formatHydrationLiters(currentGoalMl)}
              </span>
              <span className="ml-1.5 text-[11px] tabular-nums text-[#0A1F44]/40">
                {formatHydrationMl(currentGoalMl)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Defina a meta de água no plano.</p>
          )}
        </div>
        <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
          {STATUS_MARK[adherence.status]} {hydrationProfessionalStatusLabel(adherence.status)}
        </p>
      </header>
      {statusHint ? (
        <p className="-mt-2 text-xs text-[#0A1F44]/50 dark:text-[#E8EDED]/45">{statusHint}</p>
      ) : null}

      {loading && records.size === 0 ? (
        <p className="text-sm text-[#0A1F44]/60 dark:text-[#E8EDED]/60">Carregando hidratação...</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-[#4CCB7A]/20 bg-white/90 p-4 dark:border-white/10 dark:bg-[#0A1F44]/45 lg:col-span-3">
          <h4 className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Adesão hídrica</h4>
          <p className="mt-2 text-base font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
            {STATUS_MARK[adherence.status]} {hydrationProfessionalStatusLabel(adherence.status)}
          </p>
          <p className="mt-1 text-sm text-[#0A1F44]/70 dark:text-[#E8EDED]/70">
            {summary.daysRegistered} de {summary.daysInPeriod}{' '}
            {summary.daysRegistered === 1 ? 'dia registrado' : 'dias registrados'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0A1F44]/75 dark:text-[#E8EDED]/75">{narrative}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {kpis.map((item) => (
              <div key={item.label} className="min-w-0 rounded-xl bg-[#E8F4F0]/70 px-3 py-2 dark:bg-white/5">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-[#0A1F44]/45 dark:text-[#E8EDED]/45">
                  {item.label}
                </dt>
                <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-3 lg:col-span-2">
          <HydrationCheckInAutomationEditor patientId={pacienteId} />

          <section className="rounded-2xl border border-gray-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-[#0A1F44]/45">
            <h4 className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Check-in de hidratação</h4>
            <p className="mt-2 text-base font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
              {CHECKIN_MARK[fulfillment]} {hydrationCheckInOperationalTitle(fulfillment)}
            </p>
            <p className="mt-1 text-sm text-[#0A1F44]/70 dark:text-[#E8EDED]/70">
              {formatHydrationCheckInPeriod(periodDates)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1" aria-hidden>
                {periodDates.map((date) => (
                  <span
                    key={date}
                    className={`h-2 w-2 rounded-full ${
                      registeredInPeriod.includes(date) ? 'bg-[#4CCB7A]' : 'bg-[#0A1F44]/15 dark:bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-medium tabular-nums text-[#0A1F44]/55 dark:text-[#E8EDED]/50">
                {registeredInPeriod.length} de {periodDates.length}{' '}
                {periodDates.length === 1 ? 'dia' : 'dias'}
              </p>
            </div>
            {checkInBody ? (
              <p className="mt-2 text-sm leading-relaxed text-[#0A1F44]/75 dark:text-[#E8EDED]/75">{checkInBody}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyLink}
                onClick={() => void requestLink('canal_chat')}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4CCB7A] px-3 text-sm font-semibold text-[#0A1F44] disabled:opacity-50 sm:flex-none"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar pelo Canal Chat
              </button>
              <button
                type="button"
                disabled={busyLink}
                onClick={() => void requestLink(null)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#2F8FA3]/35 bg-white px-3 text-sm font-semibold text-[#0A1F44] dark:border-[#4CCB7A]/30 dark:bg-[#0A1F44]/60 dark:text-[#E8EDED]"
              >
                {copyState === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {busyLink && copyState !== 'copied' ? 'Gerando...' : 'Copiar link'}
              </button>
            </div>
            {copyMessage ? (
              <p className="mt-2 text-sm text-[#2F8FA3] dark:text-[#4CCB7A]">{copyMessage}</p>
            ) : null}
            {sendMessage ? (
              <p className="mt-2 text-sm text-[#0A1F44]/75 dark:text-[#E8EDED]/75">{sendMessage}</p>
            ) : null}
            {revealUrl ? <RevealLink url={revealUrl} /> : null}

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-[#0A1F44]/40 dark:text-[#E8EDED]/40">
                  Última abertura
                </dt>
                <dd className="mt-0.5 text-[#0A1F44]/80 dark:text-[#E8EDED]/80">
                  {formatHydrationProfessionalWhen(linkStatus?.lastOpenedAt, today)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-[#0A1F44]/40 dark:text-[#E8EDED]/40">
                  Última conclusão
                </dt>
                <dd className="mt-0.5 text-[#0A1F44]/80 dark:text-[#E8EDED]/80">
                  {formatHydrationProfessionalWhen(linkStatus?.completedAt, today)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <HydrationCalendar
        monthKey={monthKey}
        todayYmd={today}
        records={records}
        variant="professional"
        shiftMonth={(delta) => setMonthKey((curr) => shiftHydrationMonth(curr, delta))}
        onSelectDate={setSelectedDate}
      />

      {selectedDate ? (
        <HydrationDayDetails
          date={selectedDate}
          todayYmd={today}
          record={selectedRecord}
          currentGoalMl={currentGoalMl}
          canWrite={false}
          showSource
          onClose={() => setSelectedDate(null)}
        />
      ) : null}
    </div>
  );
}

function RevealLink({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-xs text-[#2F8FA3] underline-offset-2 hover:underline dark:text-[#4CCB7A]"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Ocultar link' : 'Ver link'}
      </button>
      {open ? (
        <p className="mt-1 break-all text-xs text-[#0A1F44]/70 dark:text-[#E8EDED]/70">{url}</p>
      ) : null}
    </div>
  );
}
