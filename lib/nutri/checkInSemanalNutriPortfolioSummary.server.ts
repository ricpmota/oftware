import type { Firestore } from 'firebase-admin/firestore';
import { buildWeeklyNutritionAnalytics } from '@/lib/nutri/checkInSemanalNutriAnalytics';
import { deserializeCheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriPersist';
import {
  buildWeeklyNutritionPortfolioSummaryWrite,
  NUTRI_WEEKLY_PORTFOLIO_SUMMARIES_COLLECTION,
  nutriWeeklyPortfolioSummaryDocId,
  PORTFOLIO_SUMMARY_LOOKBACK,
} from '@/lib/nutri/checkInSemanalNutriPortfolioSummary';
import { CHECKIN_SEMANAL_NUTRI_COLLECTION } from '@/lib/nutri/checkInSemanalNutriTypes';

function checkInsCollection(db: Firestore, patientId: string) {
  return db
    .collection('pacientes_completos')
    .doc(patientId)
    .collection('nutricao')
    .doc('dados')
    .collection(CHECKIN_SEMANAL_NUTRI_COLLECTION);
}

export async function refreshWeeklyNutritionPortfolioSummaryAdmin(input: {
  db: Firestore;
  patientId: string;
  nutritionistId: string;
}): Promise<void> {
  const patientId = String(input.patientId || '').trim();
  const nutritionistId = String(input.nutritionistId || '').trim();
  if (!patientId || !nutritionistId) return;
  const snap = await checkInsCollection(input.db, patientId)
    .orderBy('weekKey', 'desc')
    .limit(PORTFOLIO_SUMMARY_LOOKBACK)
    .get();
  const items = snap.docs.map((d) =>
    deserializeCheckInSemanalNutri((d.data() || {}) as Record<string, unknown>, d.id)
  );
  const payload = {
    ...buildWeeklyNutritionPortfolioSummaryWrite({
      patientId,
      nutritionistId,
      analytics: buildWeeklyNutritionAnalytics(items),
    }),
    updatedAt: new Date(),
  };
  await input.db
    .collection(NUTRI_WEEKLY_PORTFOLIO_SUMMARIES_COLLECTION)
    .doc(nutriWeeklyPortfolioSummaryDocId(nutritionistId, patientId))
    .set(payload, { merge: true });
}
