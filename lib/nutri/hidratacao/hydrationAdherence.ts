/**
 * Motor de adesão à meta de hidratação (ETAPA 05).
 *
 * Avalia comportamento registrado — não estado clínico.
 * Ausência de registro NUNCA entra como consumo 0.
 */

import {
  addDaysToHydrationYmd,
  calcHydrationPercentage,
  isHydrationGoalReached,
  last7HydrationDates,
  lastNHydrationDates,
} from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationDayView, HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';

export const HYDRATION_ADHERENCE_WINDOW_DAYS = 7;
export const HYDRATION_ADHERENCE_MIN_REGISTERED_DAYS = 3;
export const HYDRATION_ADHERENCE_GOOD_REGISTERED_DAYS = 5;
export const HYDRATION_ADHERENCE_GOOD_AVG_PCT = 80;
export const HYDRATION_ADHERENCE_ATTENTION_PCT = 80;
export const HYDRATION_ADHERENCE_ALERT_PCT = 60;
export const HYDRATION_ADHERENCE_LAST_RECORDS = 5;
export const HYDRATION_ADHERENCE_LOOKBACK_DAYS = 21;

export const HYDRATION_ADHERENCE_ALERTS_COLLECTION = 'hydration_adherence_alerts';

export type HydrationAdherenceStatus = 'good' | 'attention' | 'alert' | 'insufficient_data';

export type HydrationAdherenceConcept = 'missing_registration' | 'low_recorded_adherence';

export type HydrationAdherenceReason =
  | 'no_registration_2_days'
  | 'no_registration_3_days'
  | 'below_80_two_consecutive'
  | 'below_60_three_of_five';

export type HydrationAdherenceEvaluation = {
  status: HydrationAdherenceStatus;
  reasons: HydrationAdherenceReason[];
  registeredDays: number;
  missingDays: number;
  averagePercentage: number | null;
  goalsReached: number;
  consecutiveMissingDays: number;
  recentLowAdherenceCount: number;
  evaluatedAt: Date;
  windowDates: string[];
};

export type HydrationAdherenceAlertType = HydrationAdherenceConcept;
export type HydrationAdherenceAlertSeverity = 'alert';
export type HydrationAdherenceAlertStatus = 'active' | 'resolved';

export type HydrationAdherenceAlert = {
  id: string;
  patientId: string;
  type: HydrationAdherenceAlertType;
  severity: HydrationAdherenceAlertSeverity;
  status: HydrationAdherenceAlertStatus;
  reasons: HydrationAdherenceReason[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  metrics: {
    registeredDays: number;
    missingDays: number;
    averagePercentage: number | null;
    consecutiveMissingDays: number;
    recentLowAdherenceCount: number;
  };
};

export function hydrationAdherenceAlertDocId(patientId: string, type: HydrationAdherenceAlertType): string {
  return `${patientId}_${type}`;
}

export function recordAdherencePct(record: HydrationRecord): number {
  return calcHydrationPercentage(record.consumedMl, record.goalMl);
}

export function consecutiveMissingHydrationDays(daysNewestFirst: HydrationDayView[]): number {
  let count = 0;
  for (const day of daysNewestFirst) {
    if (day.record) break;
    count += 1;
  }
  return count;
}

export function registeredHydrationNewestFirst(days: HydrationDayView[]): HydrationRecord[] {
  return days
    .filter((d) => d.record)
    .map((d) => d.record as HydrationRecord)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function evaluateHydrationAdherence(input: {
  days: HydrationDayView[];
  todayYmd: string;
  now?: Date;
}): HydrationAdherenceEvaluation {
  const todayYmd = input.todayYmd;
  const windowDates = last7HydrationDates(todayYmd);
  const byDate = new Map(input.days.map((d) => [d.date, d]));
  const windowDays: HydrationDayView[] = windowDates.map((date) => ({
    date,
    record: date > todayYmd ? null : byDate.get(date)?.record ?? null,
  }));

  const registeredInWindow = windowDays.filter((d) => d.record).map((d) => d.record as HydrationRecord);
  const registeredDays = registeredInWindow.length;
  const missingDays = windowDays.filter((d) => d.date <= todayYmd && !d.record).length;
  const consecutiveMissingDays = consecutiveMissingHydrationDays(windowDays);
  const goalsReached = registeredInWindow.filter((r) =>
    isHydrationGoalReached(r.consumedMl, r.goalMl)
  ).length;

  const averagePercentage =
    registeredDays === 0
      ? null
      : Math.round(
          registeredInWindow.reduce((acc, r) => acc + recordAdherencePct(r), 0) / registeredDays
        );

  const lookbackDates = lastNHydrationDates(todayYmd, HYDRATION_ADHERENCE_LOOKBACK_DAYS);
  const lookbackDays: HydrationDayView[] = lookbackDates.map((date) => ({
    date,
    record: date > todayYmd ? null : byDate.get(date)?.record ?? null,
  }));
  const lastRecords = registeredHydrationNewestFirst(lookbackDays).slice(0, HYDRATION_ADHERENCE_LAST_RECORDS);
  const recentLowAdherenceCount = lastRecords.filter((r) => recordAdherencePct(r) < HYDRATION_ADHERENCE_ALERT_PCT).length;

  const reasons: HydrationAdherenceReason[] = [];
  const twoConsecutiveBelow80 =
    lastRecords.length >= 2 &&
    recordAdherencePct(lastRecords[0]!) < HYDRATION_ADHERENCE_ATTENTION_PCT &&
    recordAdherencePct(lastRecords[1]!) < HYDRATION_ADHERENCE_ATTENTION_PCT;
  const threeOfFiveBelow60 =
    lastRecords.length >= HYDRATION_ADHERENCE_LAST_RECORDS && recentLowAdherenceCount >= 3;

  if (consecutiveMissingDays >= 3) reasons.push('no_registration_3_days');
  else if (consecutiveMissingDays >= 2) reasons.push('no_registration_2_days');

  if (registeredDays >= HYDRATION_ADHERENCE_MIN_REGISTERED_DAYS) {
    if (threeOfFiveBelow60) reasons.push('below_60_three_of_five');
    else if (twoConsecutiveBelow80) reasons.push('below_80_two_consecutive');
  }

  let status: HydrationAdherenceStatus;
  if (reasons.includes('no_registration_3_days') || reasons.includes('below_60_three_of_five')) {
    status = 'alert';
  } else if (reasons.includes('no_registration_2_days') || reasons.includes('below_80_two_consecutive')) {
    status = 'attention';
  } else if (registeredDays < HYDRATION_ADHERENCE_MIN_REGISTERED_DAYS) {
    status = 'insufficient_data';
  } else if (
    registeredDays >= HYDRATION_ADHERENCE_GOOD_REGISTERED_DAYS &&
    (averagePercentage ?? 0) >= HYDRATION_ADHERENCE_GOOD_AVG_PCT
  ) {
    status = 'good';
  } else {
    status = 'attention';
  }

  return {
    status,
    reasons,
    registeredDays,
    missingDays,
    averagePercentage,
    goalsReached,
    consecutiveMissingDays,
    recentLowAdherenceCount,
    evaluatedAt: input.now ?? new Date(),
    windowDates,
  };
}

export function hydrationAdherenceStatusLabel(status: HydrationAdherenceStatus): string {
  switch (status) {
    case 'good':
      return 'Boa adesão';
    case 'attention':
      return 'Atenção';
    case 'alert':
      return 'Precisa de acompanhamento';
    case 'insufficient_data':
      return 'Dados insuficientes';
  }
}

export function hydrationAdherenceReasonCopy(reason: HydrationAdherenceReason): string {
  switch (reason) {
    case 'no_registration_2_days':
      return 'O paciente está há 2 dias sem registrar sua hidratação.';
    case 'no_registration_3_days':
      return 'O paciente está há 3 dias sem registrar o consumo de água.';
    case 'below_80_two_consecutive':
      return '2 registros consecutivos ficaram abaixo de 80% da meta de hidratação.';
    case 'below_60_three_of_five':
      return '3 dos últimos 5 registros ficaram abaixo de 60% da meta.';
  }
}

export function hydrationAdherenceAlertCopy(type: HydrationAdherenceAlertType): {
  title: string;
  body: string;
} {
  if (type === 'missing_registration') {
    return {
      title: '💧 Hidratação sem atualização',
      body: 'Paciente está há 3 dias sem registrar o consumo de água.',
    };
  }
  return {
    title: '💧 Adesão à hidratação',
    body: '3 dos últimos 5 registros ficaram abaixo de 60% da meta diária.',
  };
}

export function alertTypesFromEvaluation(
  evaluation: HydrationAdherenceEvaluation
): HydrationAdherenceAlertType[] {
  const types: HydrationAdherenceAlertType[] = [];
  if (evaluation.reasons.includes('no_registration_3_days')) types.push('missing_registration');
  if (evaluation.reasons.includes('below_60_three_of_five')) types.push('low_recorded_adherence');
  return types;
}

export function daysFromRecords(
  dates: string[],
  records: Map<string, HydrationRecord> | Record<string, HydrationRecord | null>
): HydrationDayView[] {
  return dates.map((date) => ({
    date,
    record: records instanceof Map ? records.get(date) ?? null : records[date] ?? null,
  }));
}

export function hydrationLookbackDates(todayYmd: string): string[] {
  return lastNHydrationDates(todayYmd, HYDRATION_ADHERENCE_LOOKBACK_DAYS);
}
