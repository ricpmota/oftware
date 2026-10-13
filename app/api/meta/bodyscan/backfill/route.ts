import { after, NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  BODYSCAN_CONSENT_DOC_ID,
  BODYSCAN_CONSENT_SUBCOLLECTION,
  BODYSCAN_CONSENT_VERSION,
} from '@/lib/bodyscan/bodyScanConsent';
import {
  discoverHistoricalBodyScansForPatient,
  generateMissingHistoricalBodyScans,
} from '@/lib/bodyscan/generateMissingHistoricalBodyScans';
import { BODYSCAN_SUBCOLLECTION } from '@/lib/bodyscan/bodyScanTypes';
import { serializeBodyScanDoc, sortBodyScansByWeekAsc } from '@/lib/bodyscan/bodyScanSerialize';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
 * POST /api/meta/bodyscan/backfill
 * Body: { pacienteId, idToken, dryRun?, acceptConsent? }
 *
 * Paciente autenticado — somente o próprio patientId.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    const dryRun = Boolean(body.dryRun);
    const acceptConsent = body.acceptConsent === true;

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

    if (acceptConsent) {
      await pacienteRef
        .collection(BODYSCAN_CONSENT_SUBCOLLECTION)
        .doc(BODYSCAN_CONSENT_DOC_ID)
        .set(
          {
            accepted: true,
            version: BODYSCAN_CONSENT_VERSION,
            acceptedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            patientId: pacienteId,
          },
          { merge: true }
        );
    }

    if (dryRun) {
      const discovery = await discoverHistoricalBodyScansForPatient(pacienteId);
      return NextResponse.json({
        dryRun: true,
        ...discovery,
        generated: 0,
        skipped: discovery.alreadyCompleted,
        failed: 0,
      });
    }

    // Processamento pode demorar: se acceptConsent acabou de ser dado, gera agora.
    // Para muitas semanas, ainda rodamos com concurrency=2 dentro do request (maxDuration 300).
    const result = await generateMissingHistoricalBodyScans({
      patientId: pacienteId,
      concurrency: 2,
    });

    const scansSnap = await pacienteRef.collection(BODYSCAN_SUBCOLLECTION).get();
    const scans = sortBodyScansByWeekAsc(
      scansSnap.docs
        .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is NonNullable<typeof x> => x != null)
    );

    // Se ainda restarem pendências (ex.: timeout parcial futuro), agenda o restante.
    if (result.pendingGeneration > result.generated + result.failed) {
      after(() => {
        void generateMissingHistoricalBodyScans({ patientId: pacienteId, concurrency: 2 });
      });
    }

    return NextResponse.json({
      ...result,
      scans,
    });
  } catch (error) {
    console.error('[BodyScan Backfill] meta error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Erro ao preparar histórico BodyScan' }, { status: 500 });
  }
}
