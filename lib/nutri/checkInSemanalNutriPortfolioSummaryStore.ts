import { collection, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildWeeklyNutritionAnalytics } from '@/lib/nutri/checkInSemanalNutriAnalytics';
import {
  buildWeeklyNutritionPortfolioSummaryWrite,
  deserializeWeeklyNutritionPortfolioSummary,
  NUTRI_WEEKLY_PORTFOLIO_SUMMARIES_COLLECTION,
  nutriWeeklyPortfolioSummaryDocId,
  PORTFOLIO_SUMMARY_BACKFILL_CHUNK,
  PORTFOLIO_SUMMARY_LOOKBACK,
  type WeeklyNutritionPortfolioSummaryDoc,
} from '@/lib/nutri/checkInSemanalNutriPortfolioSummary';
import { loadWeeklyNutritionCheckIns } from '@/lib/nutri/checkInSemanalNutriStore';

export { portfolioSummaryToPatient } from '@/lib/nutri/checkInSemanalNutriPortfolioSummary';

export async function listWeeklyNutritionPortfolioSummariesByNutritionist(
  nutritionistId: string
): Promise<WeeklyNutritionPortfolioSummaryDoc[]> {
  if (!nutritionistId) return [];
  const q = query(
    collection(db, NUTRI_WEEKLY_PORTFOLIO_SUMMARIES_COLLECTION),
    where('nutritionistId', '==', nutritionistId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => deserializeWeeklyNutritionPortfolioSummary(d.data() as Record<string, unknown>, d.id))
    .filter((s): s is WeeklyNutritionPortfolioSummaryDoc => Boolean(s));
}

export async function refreshWeeklyNutritionPortfolioSummary(input: {
  patientId: string;
  nutritionistId: string;
}): Promise<WeeklyNutritionPortfolioSummaryDoc | null> {
  const patientId = String(input.patientId || '').trim();
  const nutritionistId = String(input.nutritionistId || '').trim();
  if (!patientId || !nutritionistId) return null;
  const { items } = await loadWeeklyNutritionCheckIns(patientId, { pageSize: PORTFOLIO_SUMMARY_LOOKBACK });
  const payload = {
    ...buildWeeklyNutritionPortfolioSummaryWrite({
      patientId,
      nutritionistId,
      analytics: buildWeeklyNutritionAnalytics(items),
    }),
    updatedAt: Timestamp.now(),
  };
  await setDoc(
    doc(db, NUTRI_WEEKLY_PORTFOLIO_SUMMARIES_COLLECTION, nutriWeeklyPortfolioSummaryDocId(nutritionistId, patientId)),
    payload,
    { merge: true }
  );
  return deserializeWeeklyNutritionPortfolioSummary(payload, patientId);
}

export async function refreshWeeklyNutritionPortfolioSummariesForPatient(input: {
  patientId: string;
  nutritionistId?: string | null;
}): Promise<void> {
  const patientId = String(input.patientId || '').trim();
  if (!patientId) return;
  const knownId = String(input.nutritionistId || '').trim();
  if (knownId) {
    await refreshWeeklyNutritionPortfolioSummary({ patientId, nutritionistId: knownId });
    return;
  }
  const q = query(
    collection(db, NUTRI_WEEKLY_PORTFOLIO_SUMMARIES_COLLECTION),
    where('patientId', '==', patientId)
  );
  const snap = await getDocs(q);
  const nutritionistIds = [
    ...new Set(
      snap.docs
        .map((d) => String((d.data() as { nutritionistId?: string }).nutritionistId || '').trim())
        .filter(Boolean)
    ),
  ];
  await Promise.all(
    nutritionistIds.map((nutritionistId) =>
      refreshWeeklyNutritionPortfolioSummary({ patientId, nutritionistId }).catch(() => null)
    )
  );
}

export function scheduleWeeklyNutritionPortfolioSummaryRefresh(input: {
  patientId: string;
  nutritionistId?: string | null;
}): void {
  const patientId = String(input.patientId || '').trim();
  if (!patientId) return;
  void refreshWeeklyNutritionPortfolioSummariesForPatient(input).catch((error) => {
    console.warn('[nutri-portfolio] falha ao atualizar summary', error);
  });
}

export async function backfillWeeklyNutritionPortfolioSummaries(input: {
  nutritionistId: string;
  patients: Array<{ patientId: string }>;
  existing: WeeklyNutritionPortfolioSummaryDoc[];
}): Promise<WeeklyNutritionPortfolioSummaryDoc[]> {
  const existingIds = new Set(input.existing.map((s) => s.patientId));
  const missing = input.patients.filter((p) => p.patientId && !existingIds.has(p.patientId));
  const written: WeeklyNutritionPortfolioSummaryDoc[] = [];
  for (let i = 0; i < missing.length; i += PORTFOLIO_SUMMARY_BACKFILL_CHUNK) {
    const chunk = missing.slice(i, i + PORTFOLIO_SUMMARY_BACKFILL_CHUNK);
    const pages = await Promise.all(
      chunk.map((patient) =>
        refreshWeeklyNutritionPortfolioSummary({
          patientId: patient.patientId,
          nutritionistId: input.nutritionistId,
        }).catch(() => null)
      )
    );
    for (const row of pages) if (row) written.push(row);
  }
  return written;
}
