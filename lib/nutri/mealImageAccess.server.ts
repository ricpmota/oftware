/**
 * Autorização do endpoint de imagem do prato.
 * Usuário vem do token; patientId do body é só o documento a resolver.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import {
  doctorOwnsPatient,
  nutritionistHasActivePatientLink,
} from '@/lib/nutri/ensureNutriCheckInPublicLink';

export type MealImageActorRole = 'patient' | 'nutritionist' | 'doctor';

export type MealImageAccess = {
  uid: string;
  role: MealImageActorRole;
  pacienteDocId: string;
};

export type MealImageAccessDb = {
  getPaciente(pacienteId: string): Promise<{
    id: string;
    userId?: string | null;
    nutricionistaVinculadoIds?: string[] | null;
  } | null>;
  isDoctorOfPatient(uid: string, pacienteDocId: string): Promise<boolean>;
  isNutritionistOfPatient(uid: string, pacienteDocId: string): Promise<boolean>;
};

export async function resolveMealImageAccess(params: {
  uid: string;
  patientId: string;
  db: MealImageAccessDb;
}): Promise<
  | { ok: true; access: MealImageAccess }
  | { ok: false; status: 400 | 403 | 404; error: string }
> {
  const patientId = params.patientId.trim();
  if (!patientId) {
    return { ok: false, status: 400, error: 'Paciente inválido.' };
  }

  const paciente = await params.db.getPaciente(patientId);
  if (!paciente) {
    return { ok: false, status: 404, error: 'Paciente não encontrado.' };
  }

  const uid = params.uid;
  const patientUserId = String(paciente.userId || '').trim();
  if (uid === paciente.id || (patientUserId && uid === patientUserId)) {
    return { ok: true, access: { uid, role: 'patient', pacienteDocId: paciente.id } };
  }

  if (await params.db.isDoctorOfPatient(uid, paciente.id)) {
    return { ok: true, access: { uid, role: 'doctor', pacienteDocId: paciente.id } };
  }

  if (await params.db.isNutritionistOfPatient(uid, paciente.id)) {
    return { ok: true, access: { uid, role: 'nutritionist', pacienteDocId: paciente.id } };
  }

  return { ok: false, status: 403, error: 'Você não tem permissão para este paciente.' };
}

export function createFirestoreMealImageAccessDb(db: Firestore): MealImageAccessDb {
  return {
    async getPaciente(pacienteId) {
      const snap = await db.collection('pacientes_completos').doc(pacienteId).get();
      if (!snap.exists) return null;
      const data = snap.data() as {
        userId?: string | null;
        nutricionistaVinculadoIds?: string[] | null;
      };
      return {
        id: snap.id,
        userId: data.userId,
        nutricionistaVinculadoIds: data.nutricionistaVinculadoIds,
      };
    },
    async isDoctorOfPatient(uid, pacienteDocId) {
      return doctorOwnsPatient(db, uid, pacienteDocId);
    },
    async isNutritionistOfPatient(uid, pacienteDocId) {
      const nutriSnap = await db.collection(COL_NUTRICIONISTAS).doc(uid).get();
      if (!nutriSnap.exists) return false;
      return nutritionistHasActivePatientLink(db, uid, pacienteDocId);
    },
  };
}

export async function requireMealImageAccess(
  request: NextRequest,
  patientIdRaw: string
): Promise<MealImageAccess | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Não autenticado. Faça login novamente.' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ ok: false, error: 'Token inválido ou expirado.' }, { status: 401 });
  }

  const resolved = await resolveMealImageAccess({
    uid,
    patientId: patientIdRaw,
    db: createFirestoreMealImageAccessDb(getFirestoreAdmin()),
  });
  if (!resolved.ok) {
    return NextResponse.json({ ok: false, error: resolved.error }, { status: resolved.status });
  }
  return resolved.access;
}
