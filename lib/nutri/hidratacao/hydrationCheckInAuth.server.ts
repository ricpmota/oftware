import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { doctorOwnsPatient, nutritionistHasActivePatientLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import { COL_NUTRICIONISTAS, COL_PACIENTE_NUTRICIONISTA } from '@/features/metaNutri/metaNutri.constants';
import type { HydrationCheckInCreatedByType } from '@/lib/nutri/hidratacao/hydrationCheckInLink';

export type HydrationCheckInLinkActor = {
  uid: string;
  createdByType: HydrationCheckInCreatedByType;
};

export async function authorizeHydrationCheckInLinkActor(
  request: NextRequest,
  patientId: string
): Promise<HydrationCheckInLinkActor | NextResponse> {
  const bearer = getBearerToken(request);
  if (!bearer) {
    return NextResponse.json({ error: 'Não autenticado. Faça login novamente.' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(bearer);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
  }

  const id = patientId.trim();
  if (!id) {
    return NextResponse.json({ error: 'Informe o paciente.' }, { status: 400 });
  }

  const db = getFirestoreAdmin();
  if (await doctorOwnsPatient(db, uid, id)) {
    return { uid, createdByType: 'doctor' };
  }

  const nutriSnap = await db.collection(COL_NUTRICIONISTAS).doc(uid).get();
  if (nutriSnap.exists && (await nutritionistHasActivePatientLink(db, uid, id))) {
    return { uid, createdByType: 'nutritionist' };
  }

  return NextResponse.json(
    { error: 'Você não tem permissão para este acompanhamento.' },
    { status: 403 }
  );
}

export async function authorizeHydrationProfessionalActor(
  request: NextRequest
): Promise<HydrationCheckInLinkActor | NextResponse> {
  const bearer = getBearerToken(request);
  if (!bearer) {
    return NextResponse.json({ error: 'Não autenticado. Faça login novamente.' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(bearer);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
  }

  const db = getFirestoreAdmin();
  const medicoById = await db.collection('medicos').doc(uid).get();
  if (medicoById.exists) return { uid, createdByType: 'doctor' };
  const medicoByUser = await db.collection('medicos').where('userId', '==', uid).limit(1).get();
  if (!medicoByUser.empty) return { uid, createdByType: 'doctor' };

  const nutriSnap = await db.collection(COL_NUTRICIONISTAS).doc(uid).get();
  if (nutriSnap.exists) return { uid, createdByType: 'nutritionist' };

  return NextResponse.json(
    { error: 'Você não tem permissão para este acompanhamento.' },
    { status: 403 }
  );
}

export async function listHydrationAudiencePatientIds(
  db: ReturnType<typeof getFirestoreAdmin>,
  actor: HydrationCheckInLinkActor
): Promise<string[]> {
  if (actor.createdByType === 'nutritionist') {
    const snap = await db
      .collection(COL_PACIENTE_NUTRICIONISTA)
      .where('nutricionistaId', '==', actor.uid)
      .where('status', '==', 'ativo')
      .get();
    return snap.docs.map((d) => String(d.data()?.pacienteId || '').trim()).filter(Boolean);
  }

  const ids = new Set<string>();
  const byUid = await db.collection('pacientes_completos').where('medicoResponsavelId', '==', actor.uid).get();
  for (const d of byUid.docs) ids.add(d.id);

  const medicoSnap = await db.collection('medicos').where('userId', '==', actor.uid).limit(1).get();
  const medicoId = medicoSnap.empty ? actor.uid : medicoSnap.docs[0]!.id;
  if (medicoId !== actor.uid) {
    const byMedico = await db
      .collection('pacientes_completos')
      .where('medicoResponsavelId', '==', medicoId)
      .get();
    for (const d of byMedico.docs) ids.add(d.id);
  }
  return [...ids];
}
