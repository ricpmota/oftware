import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { BODYSCAN_SUBCOLLECTION } from '@/lib/bodyscan/bodyScanTypes';
import { serializeBodyScanDoc, sortBodyScansByWeekAsc } from '@/lib/bodyscan/bodyScanSerialize';
import {
  BODYSCAN_CONSENT_DESCRIPTION,
  BODYSCAN_CONSENT_DOC_ID,
  BODYSCAN_CONSENT_LABEL,
  BODYSCAN_CONSENT_SUBCOLLECTION,
  BODYSCAN_CONSENT_VERSION,
} from '@/lib/bodyscan/bodyScanConsent';

function pacientePertenceAoUsuario(
  paciente: Record<string, unknown>,
  uid: string,
  email: string | undefined
): boolean {
  const emailNorm = email?.toLowerCase().trim();
  if (paciente.userId === uid) return true;
  if (emailNorm && String(paciente.email || '').toLowerCase().trim() === emailNorm) return true;
  const dadosId = paciente.dadosIdentificacao as { email?: string } | undefined;
  if (emailNorm && String(dadosId?.email || '').toLowerCase().trim() === emailNorm) return true;
  return false;
}

/**
 * GET /api/meta/bodyscan?pacienteId=&idToken=
 * POST /api/meta/bodyscan  body: { pacienteId, idToken, accepted? }
 */
export async function GET(request: NextRequest) {
  try {
    const pacienteId = String(request.nextUrl.searchParams.get('pacienteId') || '').trim();
    const idToken = String(request.nextUrl.searchParams.get('idToken') || '').trim();
    if (!pacienteId || !idToken) {
      return NextResponse.json({ error: 'pacienteId e idToken são obrigatórios' }, { status: 400 });
    }

    const decoded = await getAuthAdmin().verifyIdToken(idToken);
    const db = getFirestoreAdmin();
    const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }
    if (!pacientePertenceAoUsuario(pacienteSnap.data() || {}, decoded.uid, decoded.email)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const consentSnap = await pacienteSnap.ref
      .collection(BODYSCAN_CONSENT_SUBCOLLECTION)
      .doc(BODYSCAN_CONSENT_DOC_ID)
      .get();
    const consentAccepted =
      consentSnap.data()?.accepted === true &&
      consentSnap.data()?.version === BODYSCAN_CONSENT_VERSION;

    const snap = await pacienteSnap.ref.collection(BODYSCAN_SUBCOLLECTION).get();
    const scans = sortBodyScansByWeekAsc(
      snap.docs
        .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is NonNullable<typeof x> => x != null)
    );

    return NextResponse.json({
      consentAccepted,
      consentLabel: BODYSCAN_CONSENT_LABEL,
      consentDescription: BODYSCAN_CONSENT_DESCRIPTION,
      consentVersion: BODYSCAN_CONSENT_VERSION,
      scans,
    });
  } catch (error) {
    console.error('[BodyScan] meta GET', error);
    return NextResponse.json({ error: 'Erro ao carregar BodyScan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    if (!pacienteId || !idToken) {
      return NextResponse.json({ error: 'pacienteId e idToken são obrigatórios' }, { status: 400 });
    }

    const decoded = await getAuthAdmin().verifyIdToken(idToken);
    const db = getFirestoreAdmin();
    const pacienteRef = db.collection('pacientes_completos').doc(pacienteId);
    const pacienteSnap = await pacienteRef.get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }
    if (!pacientePertenceAoUsuario(pacienteSnap.data() || {}, decoded.uid, decoded.email)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (typeof body.accepted === 'boolean') {
      const accepted = body.accepted;
      await pacienteRef
        .collection(BODYSCAN_CONSENT_SUBCOLLECTION)
        .doc(BODYSCAN_CONSENT_DOC_ID)
        .set(
          {
            accepted,
            version: BODYSCAN_CONSENT_VERSION,
            acceptedAt: accepted ? FieldValue.serverTimestamp() : null,
            updatedAt: FieldValue.serverTimestamp(),
            patientId: pacienteId,
          },
          { merge: true }
        );
      return NextResponse.json({ ok: true, accepted, version: BODYSCAN_CONSENT_VERSION });
    }

    // Sem accepted → apenas lista (compat)
    const snap = await pacienteRef.collection(BODYSCAN_SUBCOLLECTION).get();
    const scans = sortBodyScansByWeekAsc(
      snap.docs
        .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is NonNullable<typeof x> => x != null)
    );
    return NextResponse.json({ scans });
  } catch (error) {
    console.error('[BodyScan] meta POST', error);
    return NextResponse.json({ error: 'Erro BodyScan' }, { status: 500 });
  }
}
