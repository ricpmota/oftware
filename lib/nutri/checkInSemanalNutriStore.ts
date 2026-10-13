import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calcularScoreCheckInSemanalNutriForVersion } from '@/lib/nutri/calcularScoreCheckInSemanalNutri';
import { mergeCheckInSemanalNutriWrite } from '@/lib/nutri/checkInSemanalNutriMerge';
import { resolveWeeklyCheckInSaveAuthorship } from '@/lib/nutri/checkInSemanalNutriAuthorship';
import { loadCheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriMenuContextStore';
import {
  buildCheckInSemanalNutriRecord,
  deserializeCheckInSemanalNutri,
  serializeCheckInSemanalNutri,
} from '@/lib/nutri/checkInSemanalNutriPersist';
import {
  CHECKIN_SEMANAL_NUTRI_COLLECTION,
  CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION,
  checkInSemanalNutriDocSegments,
  isWeeklyNutritionQuestionnaireV3,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import { finalizeCheckInSemanalNutriV3Answers } from '@/lib/nutri/checkInSemanalNutriV3Finalize';
import type {
  CheckInSemanalNutri,
  CheckInSemanalNutriAnswers,
  CheckInSemanalNutriAnsweredBy,
  CheckInSemanalNutriSource,
  CheckInSemanalNutriSuplementosAplicaveis,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import type { NutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { getNutritionCheckInCalendarDate } from '@/lib/nutri/checkInSemanalNutriWeek';

const WEEKLY_PAGE_SIZE = 12;

export async function loadCheckInSemanalNutri(
  pacienteId: string,
  weekKey: string
): Promise<CheckInSemanalNutri | null> {
  const ref = doc(db, ...checkInSemanalNutriDocSegments(pacienteId, weekKey));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return deserializeCheckInSemanalNutri(snap.data() as Record<string, unknown>, weekKey);
}

export async function saveCheckInSemanalNutri(params: {
  pacienteId: string;
  week: NutritionWeek;
  answers: CheckInSemanalNutriAnswers;
  answeredBy: CheckInSemanalNutriAnsweredBy;
  source: CheckInSemanalNutriSource;
  answeredById?: string;
  nutritionistId?: string;
  scheduledDate?: string;
  suplementosAplicaveis?: CheckInSemanalNutriSuplementosAplicaveis;
}): Promise<CheckInSemanalNutri> {
  const ref = doc(db, ...checkInSemanalNutriDocSegments(params.pacienteId, params.week.weekKey));
  const snap = await getDoc(ref);
  const existingRaw = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  const existing = existingRaw
    ? deserializeCheckInSemanalNutri(existingRaw, params.week.weekKey)
    : null;

  const questionnaireVersion = existing?.questionnaireVersion ?? CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION;
  let answers = params.answers;
  if (isWeeklyNutritionQuestionnaireV3(questionnaireVersion)) {
    const liveMenu = await loadCheckInMenuContext(params.pacienteId);
    const menu = existing?.menuSnapshot ?? liveMenu;
    answers = finalizeCheckInSemanalNutriV3Answers(params.answers, menu);
  }
  const score = calcularScoreCheckInSemanalNutriForVersion(answers, questionnaireVersion).score;
  const authorship = resolveWeeklyCheckInSaveAuthorship({
    existing,
    actor: {
      answeredBy: params.answeredBy,
      answeredById: params.answeredById,
      source: params.source,
    },
  });
  let scheduledDate = existing?.scheduledDate ?? params.scheduledDate;
  if (!scheduledDate) {
    scheduledDate = getNutritionCheckInCalendarDate({
      weekStart: params.week.weekStart,
      weekEnd: params.week.weekEnd,
    });
  }
  const record = buildCheckInSemanalNutriRecord({
    pacienteId: params.pacienteId,
    week: params.week,
    answers,
    score,
    answeredBy: authorship.answeredBy,
    source: authorship.source,
    answeredById: authorship.answeredById,
    nutritionistId: params.nutritionistId ?? existing?.nutritionistId,
    scheduledDate,
    suplementosAplicaveis: existing?.suplementosAplicaveis,
    createdAt: existing?.createdAt,
    lastEditedBy: authorship.lastEditedBy,
    lastEditedById: authorship.lastEditedById,
    lastEditedAt: authorship.lastEditedBy ? new Date() : undefined,
    questionnaireVersion,
  });

  const merged = mergeCheckInSemanalNutriWrite(serializeCheckInSemanalNutri(record), existingRaw);
  await setDoc(ref, merged, { merge: true });
  const saved = deserializeCheckInSemanalNutri(merged, params.week.weekKey);
  schedulePortfolioSummaryRefresh(params.pacienteId, saved.nutritionistId || params.nutritionistId);
  return saved;
}

function schedulePortfolioSummaryRefresh(patientId: string, nutritionistId?: string | null) {
  const id = String(patientId || '').trim();
  if (!id) return;
  void import('@/lib/nutri/checkInSemanalNutriPortfolioSummaryStore')
    .then((mod) =>
      mod.refreshWeeklyNutritionPortfolioSummariesForPatient({
        patientId: id,
        nutritionistId,
      })
    )
    .catch((error) => {
      console.warn('[nutri-portfolio] falha ao atualizar summary', error);
    });
}

export async function deleteCheckInSemanalNutri(pacienteId: string, weekKey: string): Promise<void> {
  const key = String(weekKey || '').trim();
  if (!pacienteId || !key) {
    throw new Error('Não foi possível apagar o check-in.');
  }
  const ref = doc(db, ...checkInSemanalNutriDocSegments(pacienteId, key));
  const snap = await getDoc(ref);
  const nutritionistId = snap.exists()
    ? String((snap.data() as { nutritionistId?: string } | undefined)?.nutritionistId || '')
    : '';
  await deleteDoc(ref);
  schedulePortfolioSummaryRefresh(pacienteId, nutritionistId);
}

export type LoadWeeklyNutritionCheckInsResult = {
  items: CheckInSemanalNutri[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

export async function loadWeeklyNutritionCheckIns(
  pacienteId: string,
  options?: {
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
  }
): Promise<LoadWeeklyNutritionCheckInsResult> {
  const pageSize = options?.pageSize ?? WEEKLY_PAGE_SIZE;
  const col = collection(
    db,
    'pacientes_completos',
    pacienteId,
    'nutricao',
    'dados',
    CHECKIN_SEMANAL_NUTRI_COLLECTION
  );
  const base = query(col, orderBy('weekKey', 'desc'), limit(pageSize));
  const q = options?.cursor ? query(col, orderBy('weekKey', 'desc'), startAfter(options.cursor), limit(pageSize)) : base;
  const snap = await getDocs(q);
  const items = snap.docs.map((d) =>
    deserializeCheckInSemanalNutri(d.data() as Record<string, unknown>, d.id)
  );
  const last = snap.docs[snap.docs.length - 1] ?? null;
  return {
    items,
    cursor: last,
    hasMore: snap.docs.length === pageSize,
  };
}
