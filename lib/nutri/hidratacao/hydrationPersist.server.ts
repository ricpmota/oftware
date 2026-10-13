import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
  applyHydrationWrite,
  assertDailyTotalAllowed,
  calcHydrationPercentage,
  isHydrationGoalReached,
  isHydrationYmd,
} from '@/lib/nutri/hidratacao/hydrationMath';
import { deserializeHydrationRecord } from '@/lib/nutri/hidratacao/hydrationCodec';
import { HYDRATION_CLIENT_SOURCE, hydrationWriteDateDenied } from '@/lib/nutri/hidratacao/hydrationPolicy';
import {
  hydrationDocSegments,
  type HydrationRecord,
  type HydrationSource,
} from '@/lib/nutri/hidratacao/hydrationTypes';

export type HydrationTrustedActor =
  | { kind: 'patient_portal'; authUid: string }
  | { kind: 'whatsapp_checkin'; patientId: string; allowedDates: string[] };

export type HydrationWriteIntent =
  | { kind: 'add'; addMl: number }
  | { kind: 'set'; consumedMl: number };

type PersistResult = {
  record: HydrationRecord;
  justReachedGoal: boolean;
};

function hydrationAdminRef(db: Firestore, pacienteId: string, date: string) {
  const [root, id, col1, doc1, col2, dateId] = hydrationDocSegments(pacienteId, date);
  return db.collection(root).doc(id).collection(col1).doc(doc1).collection(col2).doc(dateId);
}

async function loadPacienteByAuthUid(
  db: Firestore,
  uid: string
): Promise<{ id: string; userId: string } | null> {
  const snap = await db.collection('pacientes_completos').where('userId', '==', uid).limit(1).get();
  if (snap.empty) return null;
  const docSnap = snap.docs[0]!;
  const userId = String(docSnap.data()?.userId || '').trim();
  if (!userId || userId !== uid) return null;
  return { id: docSnap.id, userId };
}

async function loadPacienteById(
  db: Firestore,
  pacienteId: string
): Promise<{ id: string; userId: string } | null> {
  const snap = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (!snap.exists) return null;
  const userId = String(snap.data()?.userId || '').trim();
  return { id: snap.id, userId };
}

export async function loadHydrationPlanGoalMl(db: Firestore, pacienteId: string): Promise<number> {
  const snap = await db
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection('nutricao')
    .doc('plano')
    .get();
  const raw = Number(snap.data()?.aguaDia_ml);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.round(raw);
}

async function loadPlanGoalMl(db: Firestore, pacienteId: string): Promise<number> {
  return loadHydrationPlanGoalMl(db, pacienteId);
}

export async function loadHydrationRecordAdmin(
  db: Firestore,
  pacienteId: string,
  date: string
): Promise<HydrationRecord | null> {
  if (!isHydrationYmd(date)) return null;
  const snap = await hydrationAdminRef(db, pacienteId, date).get();
  if (!snap.exists) return null;
  return deserializeHydrationRecord((snap.data() || {}) as Record<string, unknown>, date);
}

/**
 * Grava hidratação com Admin SDK.
 * Identidade do paciente NÃO vem do body: portal resolve por auth.uid; WhatsApp resolve pelo token.
 */
export async function persistHydrationAdmin(params: {
  db: Firestore;
  actor: HydrationTrustedActor;
  date: string;
  intent: HydrationWriteIntent;
}): Promise<PersistResult> {
  if (!isHydrationYmd(params.date)) {
    throw new Error('Data inválida para o registro de hidratação.');
  }
  const dateDenied = hydrationWriteDateDenied({
    actor: params.actor.kind,
    date: params.date,
    allowedDates: params.actor.kind === 'whatsapp_checkin' ? params.actor.allowedDates : undefined,
  });
  if (dateDenied) {
    throw new Error(dateDenied);
  }

  let pacienteId: string;
  let userId: string;
  let source: HydrationSource;

  if (params.actor.kind === 'patient_portal') {
    const paciente = await loadPacienteByAuthUid(params.db, params.actor.authUid);
    if (!paciente) {
      throw new Error('Paciente não encontrado para esta conta.');
    }
    pacienteId = paciente.id;
    userId = paciente.userId;
    source = HYDRATION_CLIENT_SOURCE;
  } else {
    const paciente = await loadPacienteById(params.db, params.actor.patientId);
    if (!paciente) {
      throw new Error('Paciente não encontrado.');
    }
    pacienteId = paciente.id;
    userId = paciente.userId;
    source = 'whatsapp_checkin';
  }

  const currentGoalMl = await loadPlanGoalMl(params.db, pacienteId);
  const ref = hydrationAdminRef(params.db, pacienteId, params.date);

  return params.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists
      ? deserializeHydrationRecord((snap.data() || {}) as Record<string, unknown>, params.date)
      : null;
    const applied = applyHydrationWrite(existing, {
      ...params.intent,
      currentGoalMl,
    });
    const dailyError = assertDailyTotalAllowed(applied.consumedMl);
    if (dailyError) {
      throw new Error(
        dailyError === 'too_large_day'
          ? 'O total do dia ultrapassa o limite permitido. Confira se não foi um lançamento duplicado.'
          : 'Quantidade inválida.'
      );
    }
    if (!(applied.goalMl > 0)) {
      throw new Error('Defina a meta diária de água no plano antes de registrar o consumo.');
    }

    const now = FieldValue.serverTimestamp();
    const payload: Record<string, unknown> = {
      consumedMl: applied.consumedMl,
      percentage: calcHydrationPercentage(applied.consumedMl, applied.goalMl),
      goalReached: isHydrationGoalReached(applied.consumedMl, applied.goalMl),
      lastSource: source,
      updatedAt: now,
    };

    if (!existing) {
      payload.date = params.date;
      payload.goalMl = applied.goalMl;
      payload.patientId = pacienteId;
      payload.userId = userId;
      payload.source = source;
      payload.createdAt = now;
    }

    if (applied.goalReached && !existing?.goalReachedAt) {
      payload.goalReachedAt = now;
    } else if (!applied.goalReached && existing?.goalReachedAt) {
      payload.goalReachedAt = FieldValue.delete();
    }

    tx.set(ref, payload, { merge: true });

    const nowDate = new Date();
    return {
      justReachedGoal: applied.justReachedGoal,
      record: {
        date: params.date,
        goalMl: applied.goalMl,
        consumedMl: applied.consumedMl,
        percentage: applied.percentage,
        goalReached: applied.goalReached,
        source: existing?.source ?? source,
        patientId: existing?.patientId || pacienteId,
        userId: existing?.userId || userId,
        createdAt: existing?.createdAt ?? nowDate,
        updatedAt: nowDate,
        goalReachedAt: applied.goalReached ? existing?.goalReachedAt ?? nowDate : undefined,
        lastSource: source,
      },
    };
  });
}
