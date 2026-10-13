import type { CheckInSemanalNutriFirestoreDoc } from '@/lib/nutri/checkInSemanalNutriPersist';

const OPERATIONAL_KEYS = new Set([
  'scheduledDate',
  'nutritionistId',
  'createdAt',
]);

function isEmptyOperational(value: unknown): boolean {
  return value == null || value === '';
}

/**
 * Junta o payload clínico com o documento existente para não apagar
 * campos operacionais (scheduledDate, nutritionistId, metadados futuros).
 */
export function mergeCheckInSemanalNutriWrite(
  serialized: CheckInSemanalNutriFirestoreDoc,
  existingRaw?: CheckInSemanalNutriFirestoreDoc | null
): CheckInSemanalNutriFirestoreDoc {
  if (!existingRaw) return { ...serialized };

  const merged: CheckInSemanalNutriFirestoreDoc = { ...serialized };

  if (existingRaw.createdAt != null) {
    merged.createdAt = existingRaw.createdAt;
  }

  for (const key of OPERATIONAL_KEYS) {
    if (key === 'createdAt') continue;
    if (isEmptyOperational(merged[key]) && !isEmptyOperational(existingRaw[key])) {
      merged[key] = existingRaw[key];
    }
  }

  for (const [key, value] of Object.entries(existingRaw)) {
    if (!(key in merged)) {
      merged[key] = value;
    }
  }

  return merged;
}

export function sortCheckInsSemanaisNewestFirst<T extends { weekKey: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.weekKey < b.weekKey ? 1 : a.weekKey > b.weekKey ? -1 : 0));
}

export function weeklyScoreDelta(
  current?: number | null,
  previous?: number | null
): number | null {
  if (current == null || previous == null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return Math.round((current - previous) * 10) / 10;
}
