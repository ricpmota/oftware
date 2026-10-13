import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import { personalTrainerHasActivePatientLink } from '@/lib/personal/personalTrainerHasActivePatientLink';

export type PacienteOrLinkedPersonalAuth = {
  uid: string;
  role: 'patient' | 'personal';
  pacienteDocId: string;
  patientUserId: string;
};

async function resolvePacienteDoc(pacienteId: string) {
  const db = getFirestoreAdmin();
  const byId = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (byId.exists) {
    const data = byId.data() as Record<string, unknown>;
    return {
      docId: byId.id,
      userId: String(data.userId || '').trim() || null,
    };
  }
  const byUser = await db
    .collection('pacientes_completos')
    .where('userId', '==', pacienteId)
    .limit(1)
    .get();
  if (byUser.empty) return null;
  const snap = byUser.docs[0];
  const data = snap.data() as Record<string, unknown>;
  return {
    docId: snap.id,
    userId: String(data.userId || '').trim() || pacienteId,
  };
}

/**
 * Paciente dono do treino ou personal com vínculo ativo.
 */
export async function requirePacienteOrLinkedPersonal(
  request: NextRequest,
  pacienteIdRaw: string
): Promise<PacienteOrLinkedPersonalAuth | NextResponse> {
  const pacienteId = pacienteIdRaw.trim();
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'Paciente inválido.' }, { status: 400 });
  }

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

  const paciente = await resolvePacienteDoc(pacienteId);
  if (!paciente) {
    return NextResponse.json({ ok: false, error: 'Paciente não encontrado.' }, { status: 404 });
  }

  const patientUserId = paciente.userId || pacienteId;
  if (uid === patientUserId || uid === paciente.docId) {
    return { uid, role: 'patient', pacienteDocId: paciente.docId, patientUserId };
  }

  const db = getFirestoreAdmin();
  const personalSnap = await db.collection(COL_PERSONAL_TRAINERS).doc(uid).get();
  if (!personalSnap.exists) {
    return NextResponse.json(
      { ok: false, error: 'Você não tem permissão para este treino.' },
      { status: 403 }
    );
  }

  const linked =
    (await personalTrainerHasActivePatientLink(db, uid, paciente.docId)) ||
    (await personalTrainerHasActivePatientLink(db, uid, patientUserId)) ||
    (pacienteId !== paciente.docId
      ? await personalTrainerHasActivePatientLink(db, uid, pacienteId)
      : false);
  if (!linked) {
    return NextResponse.json(
      { ok: false, error: 'Você não tem permissão para este treino.' },
      { status: 403 }
    );
  }

  return { uid, role: 'personal', pacienteDocId: paciente.docId, patientUserId };
}
