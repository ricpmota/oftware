'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle, ChevronLeft, Droplet, Loader2, Plus, User } from 'lucide-react';
import {
  hydrationCheckInAmountClosestToGoal,
  hydrationCheckInQuickAmounts,
  hydrationCheckInStartStep,
} from '@/lib/nutri/hidratacao/hydrationCheckInAmounts';
import {
  buildHydrationCheckInSuccessCopy,
  HYDRATION_CHECKIN_EXPIRED_COPY,
  HYDRATION_CHECKIN_UNAVAILABLE_COPY,
} from '@/lib/nutri/hidratacao/hydrationCheckInCopy';
import {
  calcHydrationPercentage,
  formatHydrationCheckInDateTitle,
  formatHydrationLiters,
  formatHydrationLongDate,
  formatHydrationWeekday,
  hydrationAmountErrorMessage,
  isHydrationGoalReached,
  parseHydrationLitersInput,
} from '@/lib/nutri/hidratacao/hydrationMath';
import {
  fetchPublicPatientApi,
  formatPublicPatientFetchError,
} from '@/lib/public/fetchPublicPatientApi';
import type { MedicoWhiteLabelResolved } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import PublicPageTopLogo from '@/components/public/PublicPageTopLogo';
import PublicPageBrandFooter from '@/components/public/PublicPageBrandFooter';
import WhiteLabelFaviconEffect from '@/components/public/WhiteLabelFaviconEffect';
import HydrationProgressBar from '@/components/nutri/hidratacao/HydrationProgressBar';

type PublicDay = {
  date: string;
  weekdayLabel: string;
  historyLabel: string;
  goalMl: number;
  consumedMl: number | null;
  registered: boolean;
  percentage: number | null;
  goalReached: boolean;
  suggestions?: number[];
};

type SessionPayload = {
  valid: true;
  firstName: string | null;
  currentGoalMl: number;
  allRegistered: boolean;
  days: PublicDay[];
  whiteLabel?: MedicoWhiteLabelResolved;
};

type DenialPayload = {
  valid: false;
  error: 'expired' | 'unavailable';
  title?: string;
  message?: string;
};

type SuccessView = {
  title: string;
  paragraphs: string[];
  rows: Array<{ label: string; detail: string }>;
};

function dayConsumedPreview(day: PublicDay, selected: Record<string, number>): number | null {
  if (Number.isFinite(selected[day.date])) return selected[day.date];
  if (day.registered && day.consumedMl != null) return day.consumedMl;
  return null;
}

export default function HydrationCheckInPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || '').trim();
  const [loading, setLoading] = useState(true);
  const [denial, setDenial] = useState<DenialPayload | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessView | null>(null);
  const savingLock = useRef(false);

  const load = useCallback(async () => {
    if (!token) {
      setDenial({
        valid: false,
        error: 'unavailable',
        title: HYDRATION_CHECKIN_UNAVAILABLE_COPY.title,
        message: HYDRATION_CHECKIN_UNAVAILABLE_COPY.body,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchPublicPatientApi(`/api/hidratacao/checkin/${encodeURIComponent(token)}`);
      const payload = (await res.json().catch(() => null)) as SessionPayload | DenialPayload | null;
      if (!payload || payload.valid !== true) {
        const kind = payload && 'error' in payload && payload.error === 'expired' ? 'expired' : 'unavailable';
        const copy = kind === 'expired' ? HYDRATION_CHECKIN_EXPIRED_COPY : HYDRATION_CHECKIN_UNAVAILABLE_COPY;
        setDenial({
          valid: false,
          error: kind,
          title: (payload && 'title' in payload && payload.title) || copy.title,
          message: (payload && 'message' in payload && payload.message) || copy.body,
        });
        setSession(null);
        return;
      }
      setDenial(null);
      setSession(payload);
      setEditing({});
      setSelected({});
      setCustomOpen(false);
      setSuccess(null);
      const start = hydrationCheckInStartStep(payload.days);
      setStep(start === 'done' ? 0 : start);
    } catch (err) {
      setDenial({
        valid: false,
        error: 'unavailable',
        title: HYDRATION_CHECKIN_UNAVAILABLE_COPY.title,
        message: formatPublicPatientFetchError(err) || HYDRATION_CHECKIN_UNAVAILABLE_COPY.body,
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const days = session?.days ?? [];
  const current = days[step] ?? null;
  const isLastStep = Boolean(current) && step === days.length - 1;
  const currentNeedsValue = Boolean(current && (!current.registered || editing[current.date]));
  const currentHasValue = Boolean(
    current && Number.isFinite(selected[current.date]) && selected[current.date] >= 0
  );
  const canAdvance = !currentNeedsValue || currentHasValue;

  const pendingDates = useMemo(() => {
    if (!session) return [];
    return session.days.filter((day) => !day.registered || editing[day.date]).map((day) => day.date);
  }, [session, editing]);

  const readyToSave =
    pendingDates.length > 0 && pendingDates.every((date) => Number.isFinite(selected[date]) && selected[date] >= 0);

  const applyCustom = (date: string) => {
    const parsed = parseHydrationLitersInput(customValue);
    if (!parsed.ok) {
      setCustomError(hydrationAmountErrorMessage(parsed.error));
      return;
    }
    setSelected((curr) => ({ ...curr, [date]: parsed.ml }));
    setCustomError('');
    setCustomOpen(false);
  };

  const save = async () => {
    if (savingLock.current || busy || !readyToSave) return;
    savingLock.current = true;
    setBusy(true);
    setSaveError(null);
    try {
      const records = pendingDates.map((date) => ({ date, consumedMl: selected[date] }));
      const res = await fetchPublicPatientApi(`/api/hidratacao/checkin/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        saved?: Array<{
          date: string;
          weekdayLabel: string;
          percentage: number;
          goalReached: boolean;
          consumedMl?: number;
          goalMl?: number;
        }>;
        days?: PublicDay[];
        allRegistered?: boolean;
      } | null;
      if (!res.ok || !payload?.ok) {
        setSaveError(payload?.error || 'Não foi possível salvar este registro.');
        return;
      }
      if (payload.days && session) {
        setSession({ ...session, days: payload.days, allRegistered: Boolean(payload.allRegistered) });
      }
      setEditing({});
      setSelected({});
      const copy = buildHydrationCheckInSuccessCopy(
        (payload.saved || []).map((row) => ({
          date: row.date,
          weekdayLabel: row.weekdayLabel,
          goalReached: row.goalReached,
          percentage: row.percentage,
          consumedMl: row.consumedMl,
          goalMl: row.goalMl,
        }))
      );
      setSuccess(copy);
    } catch {
      setSaveError('Não foi possível salvar este registro.');
    } finally {
      setBusy(false);
      savingLock.current = false;
    }
  };

  const goToDay = (index: number) => {
    if (index < 0 || index >= days.length) return;
    setCustomOpen(false);
    setCustomError('');
    setStep(index);
  };

  const goNext = () => {
    if (!canAdvance || !current) return;
    if (readyToSave) {
      void save();
      return;
    }
    const nextEmpty = days.findIndex(
      (day, index) =>
        index !== step &&
        (!day.registered || editing[day.date]) &&
        !Number.isFinite(selected[day.date])
    );
    if (nextEmpty >= 0) {
      goToDay(nextEmpty);
      return;
    }
    if (!isLastStep) goToDay(step + 1);
  };

  const goBack = () => {
    goToDay(step - 1);
  };

  const whiteLabel = session?.whiteLabel ?? null;
  const aplicacaoPage = whiteLabel?.publicPages.aplicacao;
  const pageBg = aplicacaoPage?.backgroundColor ?? '#F8FAFC';
  const progress = days.length > 0 ? ((step + 1) / days.length) * 100 : 0;
  const stepLabel = days.length > 0 ? `${step + 1} de ${days.length}` : '';
  const allDoneOnLoad = Boolean(session?.allRegistered && pendingDates.length === 0 && !success);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (denial) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-lg font-semibold text-slate-900 mb-2">
            {denial.title || HYDRATION_CHECKIN_UNAVAILABLE_COPY.title}
          </p>
          <p className="text-sm text-slate-500">
            {denial.message || HYDRATION_CHECKIN_UNAVAILABLE_COPY.body}
          </p>
        </div>
      </div>
    );
  }

  const successView =
    success ||
    (allDoneOnLoad
      ? {
          title: 'Check-in de hidratação atualizado',
          paragraphs: [
            'Seus registros de hidratação estão em dia.',
            'Continue mantendo esse cuidado no seu dia a dia.',
          ],
          rows: days.map((day) => ({
            label: formatHydrationCheckInDateTitle(day.date),
            detail: day.goalReached
              ? `${formatHydrationLiters(day.consumedMl ?? 0)} · Meta atingida`
              : `${formatHydrationLiters(day.consumedMl ?? 0)} · ${day.percentage ?? 0}% da meta`,
          })),
        }
      : null);

  if (successView) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center px-4 pt-3 pb-10"
        style={{ backgroundColor: pageBg }}
      >
        <WhiteLabelFaviconEffect
          faviconUrl={whiteLabel?.faviconUrl}
          cacheKey={whiteLabel?.faviconUrl ?? undefined}
        />
        <div className="w-full max-w-lg mb-4">
          <PublicPageTopLogo theme={aplicacaoPage} brandName={whiteLabel?.brandName} priority />
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full border border-slate-100">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-1">{successView.title}</h1>
            {successView.paragraphs[0] ? (
              <p className="text-sm text-slate-500">{successView.paragraphs[0]}</p>
            ) : null}
          </div>
          {successView.rows.length > 0 ? (
            <ul className="space-y-2 mb-4">
              {successView.rows.map((row) => (
                <li key={row.label} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                  <p className="text-sm text-slate-600">{row.detail}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {successView.paragraphs.slice(1).map((p) => (
            <p key={p} className="text-sm text-slate-500 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <PublicPageBrandFooter
          theme={aplicacaoPage}
          brandName={whiteLabel?.brandName}
          showPoweredBy={whiteLabel?.showPoweredByOftware !== false}
          className="px-4 pb-6 mt-8"
        />
      </div>
    );
  }

  if (!session || !current) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{HYDRATION_CHECKIN_UNAVAILABLE_COPY.title}</p>
          <p className="text-sm text-slate-500">{HYDRATION_CHECKIN_UNAVAILABLE_COPY.body}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col"
      style={{ color: aplicacaoPage?.textColor }}
    >
      <WhiteLabelFaviconEffect
        faviconUrl={whiteLabel?.faviconUrl}
        cacheKey={whiteLabel?.faviconUrl ?? undefined}
      />

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <PublicPageTopLogo
              theme={aplicacaoPage}
              brandName={whiteLabel?.brandName}
              className="!pt-0 !pb-0"
            />
            <span className="text-xs font-medium text-slate-500">{stepLabel}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
          Hidratação
        </p>

        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/80 shadow-sm">
          <div className="flex items-center gap-2.5 bg-white px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Paciente</p>
              <p className="truncate text-sm font-semibold text-slate-900">
                {session.firstName || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800">
              <Droplet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Meta diária</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {session.currentGoalMl > 0 ? formatHydrationLiters(session.currentGoalMl) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className={`grid gap-2 mb-5 ${days.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {days.map((day, index) => {
            const preview = dayConsumedPreview(day, selected);
            const active = index === step;
            const pct = preview == null ? null : calcHydrationPercentage(preview, day.goalMl);
            const reached = preview != null && isHydrationGoalReached(preview, day.goalMl);
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => goToDay(index)}
                className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {formatHydrationWeekday(day.date)}
                </p>
                <p className="mt-0.5 text-sm font-semibold capitalize text-slate-900 leading-snug">
                  {formatHydrationLongDate(day.date, day.date)}
                </p>
                <p className="mt-2 text-sm font-semibold tabular-nums text-slate-800">
                  {preview == null ? '—' : formatHydrationLiters(preview)}
                  {pct != null ? (
                    <span className={`ml-1.5 text-xs font-semibold ${reached ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {pct}%{reached ? ' ✓' : ''}
                    </span>
                  ) : (
                    <span className="ml-1.5 text-xs font-medium text-slate-400">sem registro</span>
                  )}
                </p>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.date}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-sm text-slate-600 mb-3">Quanto você bebeu neste dia?</p>

            {current.registered && !editing[current.date] ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <HydrationProgressBar
                    variant="ring"
                    size={72}
                    percentage={current.percentage ?? 0}
                    goalReached={current.goalReached}
                  />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Já registrado</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                      {formatHydrationLiters(current.consumedMl ?? 0)}
                      <span className="text-sm font-medium text-slate-500">
                        {' '}
                        de {formatHydrationLiters(current.goalMl)}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline"
                  onClick={() => {
                    setEditing((curr) => ({ ...curr, [current.date]: true }));
                    setSelected((curr) => ({ ...curr, [current.date]: current.consumedMl ?? 0 }));
                  }}
                >
                  Corrigir
                </button>
              </div>
            ) : (
              <DayAmountStep
                day={current}
                chosen={selected[current.date]}
                customOpen={customOpen}
                customValue={customValue}
                customError={customError}
                onSelect={(ml) => {
                  setSelected((curr) => ({ ...curr, [current.date]: ml }));
                  setCustomOpen(false);
                  setCustomError('');
                }}
                onToggleCustom={() => {
                  setCustomOpen((open) => !open);
                  setCustomError('');
                }}
                onCustomValue={setCustomValue}
                onApplyCustom={() => applyCustom(current.date)}
              />
            )}

            {saveError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {saveError}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 pt-6 pb-4 mt-auto bg-gradient-to-t from-white via-white to-transparent">
          <div className="flex gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={busy}
                className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            ) : null}
            <button
              type="button"
              disabled={!canAdvance || busy}
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 disabled:opacity-70"
            >
              {busy ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
                </>
              ) : readyToSave ? (
                'Enviar check-in'
              ) : (
                'Continuar'
              )}
            </button>
          </div>
        </div>
      </div>

      <PublicPageBrandFooter
        theme={aplicacaoPage}
        brandName={whiteLabel?.brandName}
        showPoweredBy={whiteLabel?.showPoweredByOftware !== false}
        className="px-4 pb-6"
      />
    </div>
  );
}

function WaterCup({ percent, featured }: { percent: number; featured?: boolean }) {
  const fill = Math.min(100, Math.max(0, percent));
  const waterHeight = Math.max(fill > 0 ? 12 : 0, (fill / 100) * 78);
  return (
    <span
      className={`relative inline-flex h-9 w-7 items-end justify-center overflow-hidden rounded-b-xl rounded-t-md border-2 ${
        featured ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300 bg-white'
      }`}
      aria-hidden
    >
      <span
        className={`absolute bottom-0 left-0 right-0 ${
          featured
            ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
            : 'bg-gradient-to-t from-sky-600 to-emerald-400'
        }`}
        style={{ height: `${waterHeight}%` }}
      />
    </span>
  );
}

function DayAmountStep({
  day,
  chosen,
  customOpen,
  customValue,
  customError,
  onSelect,
  onToggleCustom,
  onCustomValue,
  onApplyCustom,
}: {
  day: PublicDay;
  chosen: number | undefined;
  customOpen: boolean;
  customValue: string;
  customError: string;
  onSelect: (ml: number) => void;
  onToggleCustom: () => void;
  onApplyCustom: () => void;
  onCustomValue: (value: string) => void;
}) {
  const suggestions = day.suggestions?.length ? day.suggestions : hydrationCheckInQuickAmounts(day.goalMl);
  const goalAmount = hydrationCheckInAmountClosestToGoal(suggestions, day.goalMl);
  const customSelected = Number.isFinite(chosen) && !suggestions.includes(chosen as number);
  const preview = Number.isFinite(chosen) ? (chosen as number) : 0;
  const percentage = calcHydrationPercentage(preview, day.goalMl);
  const goalReached = isHydrationGoalReached(preview, day.goalMl);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3">
        <HydrationProgressBar variant="ring" size={72} percentage={percentage} goalReached={goalReached} />
        <div className="min-w-0">
          <p className="text-xl font-bold tabular-nums text-slate-900">
            {Number.isFinite(chosen) ? formatHydrationLiters(preview) : '—'}
          </p>
          <p className="text-xs text-slate-500">de {formatHydrationLiters(day.goalMl)}</p>
          {Number.isFinite(chosen) ? (
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {percentage}%
              {goalReached ? <span className="ml-2 text-emerald-700">Meta atingida ✓</span> : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Escolha o total do dia.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {suggestions.map((ml) => {
          const active = chosen === ml;
          const isGoal = ml === goalAmount;
          const fill = calcHydrationPercentage(ml, day.goalMl);
          return (
            <button
              key={ml}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(ml)}
              className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-all ${
                isGoal
                  ? active
                    ? 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md ring-2 ring-emerald-500/40'
                    : 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-400/50'
                  : active
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isGoal ? (
                <span
                  className={`absolute -top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    active ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
                  }`}
                >
                  Sua meta
                </span>
              ) : null}
              <WaterCup percent={fill} featured={isGoal} />
              <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums">
                {active ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                {formatHydrationLiters(ml)}
              </span>
              <span className={`text-[10px] font-semibold tabular-nums ${isGoal && active ? 'text-white/80' : 'text-slate-500'}`}>
                {fill}%
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={customOpen || customSelected}
          onClick={onToggleCustom}
          className={`flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm font-semibold transition-all ${
            customOpen || customSelected
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Plus className="h-5 w-5" aria-hidden />
          Outro
        </button>
      </div>
      {customOpen ? (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="hydration-custom-liters">
            Quanto você bebeu?
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="hydration-custom-liters"
                inputMode="decimal"
                value={customValue}
                onChange={(e) => onCustomValue(e.target.value.replace(/[^\d.,]/g, ''))}
                className="w-full px-4 py-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="2,3"
                aria-invalid={Boolean(customError)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                L
              </span>
            </div>
            <button
              type="button"
              onClick={onApplyCustom}
              className="px-5 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              Usar
            </button>
          </div>
          {customError ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {customError}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Use vírgula para decimais, como 2,3.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
