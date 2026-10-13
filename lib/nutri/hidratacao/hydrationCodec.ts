import {
  calcHydrationPercentage,
  isHydrationGoalReached,
  isHydrationYmd,
} from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationRecord, HydrationSource } from '@/lib/nutri/hidratacao/hydrationTypes';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseSource(value: unknown): HydrationSource {
  if (value === 'whatsapp_checkin' || value === 'professional' || value === 'patient_portal') {
    return value;
  }
  return 'patient_portal';
}

export function deserializeHydrationRecord(
  data: Record<string, unknown>,
  date: string
): HydrationRecord | null {
  const goalMl = Number(data.goalMl);
  const consumedMl = Number(data.consumedMl);
  if (!Number.isFinite(goalMl) || goalMl <= 0) return null;
  if (!Number.isFinite(consumedMl) || consumedMl < 0) return null;

  const percentage = calcHydrationPercentage(consumedMl, goalMl);
  const createdAt = toDate(data.createdAt) ?? new Date();
  const updatedAt = toDate(data.updatedAt) ?? createdAt;

  return {
    date: typeof data.date === 'string' && isHydrationYmd(data.date) ? data.date : date,
    goalMl: Math.round(goalMl),
    consumedMl: Math.round(consumedMl),
    percentage,
    goalReached: isHydrationGoalReached(consumedMl, goalMl),
    source: parseSource(data.source),
    patientId: typeof data.patientId === 'string' ? data.patientId : '',
    userId: typeof data.userId === 'string' ? data.userId : '',
    createdAt,
    updatedAt,
    goalReachedAt: toDate(data.goalReachedAt),
    lastSource: data.lastSource ? parseSource(data.lastSource) : undefined,
  };
}

export type HydrationWriteResult = {
  record: HydrationRecord;
  justReachedGoal: boolean;
};

export function serializeHydrationWriteResult(result: HydrationWriteResult) {
  return {
    justReachedGoal: result.justReachedGoal,
    record: {
      date: result.record.date,
      goalMl: result.record.goalMl,
      consumedMl: result.record.consumedMl,
      percentage: result.record.percentage,
      goalReached: result.record.goalReached,
      source: result.record.source,
      patientId: result.record.patientId,
      userId: result.record.userId,
      createdAt: result.record.createdAt.toISOString(),
      updatedAt: result.record.updatedAt.toISOString(),
      lastSource: result.record.lastSource ?? null,
      goalReachedAt: result.record.goalReachedAt ? result.record.goalReachedAt.toISOString() : null,
    },
  };
}

export function deserializeHydrationWriteResult(payload: {
  justReachedGoal?: boolean;
  record?: Record<string, unknown>;
}): HydrationWriteResult | null {
  if (!payload?.record || typeof payload.record.date !== 'string') return null;
  const record = deserializeHydrationRecord(payload.record, payload.record.date);
  if (!record) return null;
  return { justReachedGoal: Boolean(payload.justReachedGoal), record };
}
