import type { Firestore } from 'firebase-admin/firestore';
import { calcularScoreCheckInSemanalNutriForVersion } from '@/lib/nutri/calcularScoreCheckInSemanalNutri';
import { mergeCheckInSemanalNutriWrite } from '@/lib/nutri/checkInSemanalNutriMerge';
import {
  buildCheckInSemanalNutriRecord,
  deserializeCheckInSemanalNutri,
  serializeCheckInSemanalNutri,
} from '@/lib/nutri/checkInSemanalNutriPersist';
import type { NutriCheckInPublicLink } from '@/lib/nutri/checkInSemanalNutriPublicLink';
import type { CheckInSemanalNutri, CheckInSemanalNutriAnswers } from '@/lib/nutri/checkInSemanalNutriTypes';
import { checkInSemanalNutriDocSegments } from '@/lib/nutri/checkInSemanalNutriTypes';
import { getNutritionCheckInCalendarDate, getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

function clinicalDocRef(db: Firestore, patientId: string, weekKey: string) {
  const [root, id, col1, doc1, col2, week] = checkInSemanalNutriDocSegments(patientId, weekKey);
  return db.collection(root).doc(id).collection(col1).doc(doc1).collection(col2).doc(week);
}

export async function loadCheckInSemanalNutriAdmin(
  db: Firestore,
  patientId: string,
  weekKey: string
): Promise<CheckInSemanalNutri | null> {
  const snap = await clinicalDocRef(db, patientId, weekKey).get();
  if (!snap.exists) return null;
  return deserializeCheckInSemanalNutri((snap.data() || {}) as Record<string, unknown>, weekKey);
}

function omitUndefinedDeep<T>(value: T): T {
  if (value === undefined) return value;
  if (value === null || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => omitUndefinedDeep(item)) as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = omitUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Grava o check-in semanal pelo link público.
 * Identidade (patientId, weekKey, nutritionistId) vem só do token.
 * Score é recalculado no backend.
 * Não atualiza se o documento clínico já existir (V1 somente leitura no link).
 */
export async function saveCheckInSemanalNutriFromPublicLink(params: {
  db: Firestore;
  link: NutriCheckInPublicLink;
  answers: CheckInSemanalNutriAnswers;
}): Promise<{ record: CheckInSemanalNutri; created: boolean }> {
  const week = getNutritionWeek(params.link.weekKey);
  const ref = clinicalDocRef(params.db, params.link.patientId, week.weekKey);
  const snap = await ref.get();
  if (snap.exists) {
    const existing = deserializeCheckInSemanalNutri(
      (snap.data() || {}) as Record<string, unknown>,
      week.weekKey
    );
    return { record: existing, created: false };
  }

  const score = calcularScoreCheckInSemanalNutriForVersion(params.answers, 'nutri_weekly_v3').score;
  const scheduledDate =
    params.link.scheduledDate ||
    getNutritionCheckInCalendarDate({
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    });
  const record = buildCheckInSemanalNutriRecord({
    pacienteId: params.link.patientId,
    week,
    answers: params.answers,
    score,
    answeredBy: 'patient',
    source: 'patient_public_link',
    nutritionistId: params.link.nutritionistId,
    scheduledDate,
    questionnaireVersion: 'nutri_weekly_v3',
  });

  const serialized = omitUndefinedDeep(
    mergeCheckInSemanalNutriWrite(serializeCheckInSemanalNutri(record), null)
  );
  await ref.set(serialized);

  void import('@/lib/nutri/checkInSemanalNutriPortfolioSummary.server')
    .then((mod) =>
      mod.refreshWeeklyNutritionPortfolioSummaryAdmin({
        db: params.db,
        patientId: params.link.patientId,
        nutritionistId: params.link.nutritionistId,
      })
    )
    .catch((error) => {
      console.warn('[nutri-portfolio] falha ao atualizar summary (link público)', error);
    });

  return { record, created: true };
}
