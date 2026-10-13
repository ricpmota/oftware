'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import HydrationCalendar from '@/components/nutri/hidratacao/HydrationCalendar';
import HydrationDayDetails from '@/components/nutri/hidratacao/HydrationDayDetails';
import HydrationGoalCelebration from '@/components/nutri/hidratacao/HydrationGoalCelebration';
import HydrationTodayCard from '@/components/nutri/hidratacao/HydrationTodayCard';
import HydrationWeeklySummary from '@/components/nutri/hidratacao/HydrationWeeklySummary';
import {
  applyHydrationWrite,
  assertDailyTotalAllowed,
  buildHydrationWeeklySummary,
  datesInHydrationMonth,
  hydrationAmountErrorMessage,
  hydrationMonthKeyFromYmd,
  hydrationTodayYmd,
  isPortalHydrationDateAllowed,
  last7HydrationDates,
  shiftHydrationMonth,
} from '@/lib/nutri/hidratacao/hydrationMath';
import {
  addHydrationConsumption,
  loadHydrationRecordsByDates,
  setHydrationConsumption,
} from '@/lib/nutri/hidratacao/hydrationStore';
import type { HydrationDayView, HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';

type HydrationDailyTrackerProps = {
  pacienteId: string;
  pacienteUserId: string;
  currentGoalMl: number;
  canEdit: boolean;
};

function celebrationStorageKey(pacienteId: string, date: string) {
  return `oftware:hydration:celebrated:${pacienteId}:${date}`;
}

export default function HydrationDailyTracker({
  pacienteId,
  pacienteUserId,
  currentGoalMl,
  canEdit,
}: HydrationDailyTrackerProps) {
  const today = useMemo(() => hydrationTodayYmd(), []);
  const summaryDates = useMemo(() => last7HydrationDates(today), [today]);
  const [monthKey, setMonthKey] = useState(() => hydrationMonthKeyFromYmd(today));
  const monthDates = useMemo(() => datesInHydrationMonth(monthKey), [monthKey]);
  const loadDates = useMemo(
    () => Array.from(new Set([...summaryDates, ...monthDates])),
    [summaryDates, monthDates]
  );
  const [records, setRecords] = useState<Map<string, HydrationRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const closeCelebration = useCallback(() => setCelebrationOpen(false), []);

  const load = useCallback(async () => {
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
      console.error('Erro ao carregar hidratação:', err);
      setError('Não foi possível carregar o histórico de hidratação.');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, loadDates]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayRecord = records.get(today) ?? null;
  const consumedMl = todayRecord?.consumedMl ?? 0;
  const displayGoalMl = todayRecord?.goalMl && todayRecord.goalMl > 0 ? todayRecord.goalMl : currentGoalMl;

  const days: HydrationDayView[] = summaryDates.map((date) => ({
    date,
    record: records.get(date) ?? null,
  }));
  const summary = buildHydrationWeeklySummary(days);

  const maybeCelebrate = (justReachedGoal: boolean, date: string) => {
    if (!justReachedGoal || date !== today || typeof window === 'undefined') return;
    const key = celebrationStorageKey(pacienteId, today);
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    setCelebrationOpen(true);
  };

  const runWrite = async (
    date: string,
    intent: { kind: 'add'; addMl: number } | { kind: 'set'; consumedMl: number }
  ) => {
    if (!canEdit || !isPortalHydrationDateAllowed(date)) return;
    const existing = records.get(date) ?? null;
    const applied = applyHydrationWrite(
      existing,
      intent.kind === 'add'
        ? { kind: 'add', addMl: intent.addMl, currentGoalMl }
        : { kind: 'set', consumedMl: intent.consumedMl, currentGoalMl }
    );
    const dailyError = assertDailyTotalAllowed(applied.consumedMl);
    if (dailyError) {
      setError(hydrationAmountErrorMessage(dailyError));
      return;
    }

    const optimistic: HydrationRecord = {
      date,
      goalMl: applied.goalMl,
      consumedMl: applied.consumedMl,
      percentage: applied.percentage,
      goalReached: applied.goalReached,
      source: existing?.source ?? 'patient_portal',
      patientId: pacienteId,
      userId: pacienteUserId,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
      lastSource: 'patient_portal',
    };
    const previous = new Map(records);
    setRecords((curr) => {
      const next = new Map(curr);
      next.set(date, optimistic);
      return next;
    });
    setBusy(true);
    setError(null);

    try {
      const saved =
        intent.kind === 'add'
          ? await addHydrationConsumption({ date, addMl: intent.addMl })
          : await setHydrationConsumption({ date, consumedMl: intent.consumedMl });
      setRecords((curr) => {
        const next = new Map(curr);
        next.set(date, saved.record);
        return next;
      });
      if (saved.justReachedGoal) {
        maybeCelebrate(true, date);
      }
    } catch (err) {
      console.error('Erro ao salvar hidratação:', err);
      setRecords(previous);
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o registro.');
      if (typeof window !== 'undefined' && date === today) {
        sessionStorage.removeItem(celebrationStorageKey(pacienteId, today));
      }
      setCelebrationOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!currentGoalMl && !todayRecord) {
    return null;
  }

  const selectedRecord = selectedDate ? records.get(selectedDate) ?? null : null;
  const canWriteSelected = Boolean(
    selectedDate && canEdit && currentGoalMl > 0 && isPortalHydrationDateAllowed(selectedDate)
  );

  return (
    <div className="space-y-4">
      <HydrationGoalCelebration open={celebrationOpen} onClose={closeCelebration} />

      {loading && records.size === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 bg-white/70 p-5 text-sm text-[#0A1F44]/70 dark:border-white/10 dark:bg-[#0A1F44]/40 dark:text-[#E8EDED]/70">
          Carregando hidratação de hoje...
        </div>
      ) : (
        <HydrationTodayCard
          goalMl={displayGoalMl}
          consumedMl={consumedMl}
          hasRecord={todayRecord != null}
          canEdit={canEdit && currentGoalMl > 0}
          busy={busy}
          onAdd={(ml) => void runWrite(today, { kind: 'add', addMl: ml })}
          onSetTotal={(ml) => void runWrite(today, { kind: 'set', consumedMl: ml })}
        />
      )}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <HydrationWeeklySummary summary={summary} />

      <HydrationCalendar
        monthKey={monthKey}
        todayYmd={today}
        records={records}
        shiftMonth={(delta) => setMonthKey((curr) => shiftHydrationMonth(curr, delta))}
        onSelectDate={setSelectedDate}
      />

      {selectedDate ? (
        <HydrationDayDetails
          date={selectedDate}
          todayYmd={today}
          record={selectedRecord}
          currentGoalMl={currentGoalMl}
          canWrite={canWriteSelected}
          busy={busy}
          onClose={() => setSelectedDate(null)}
          onAdd={(ml) => void runWrite(selectedDate, { kind: 'add', addMl: ml })}
          onSetTotal={(ml) => void runWrite(selectedDate, { kind: 'set', consumedMl: ml })}
        />
      ) : null}
    </div>
  );
}
