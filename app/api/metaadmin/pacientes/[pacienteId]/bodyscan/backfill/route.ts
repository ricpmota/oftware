import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  discoverHistoricalBodyScansForPatient,
  generateMissingHistoricalBodyScans,
} from '@/lib/bodyscan/generateMissingHistoricalBodyScans';
import { BODYSCAN_SUBCOLLECTION } from '@/lib/bodyscan/bodyScanTypes';
import { serializeBodyScanDoc, sortBodyScansByWeekAsc } from '@/lib/bodyscan/bodyScanSerialize';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/metaadmin/pacientes/[pacienteId]/bodyscan/backfill
 * Authorization: Bearer idToken
 *
 * BodyScan é liberado com fotos existentes — sem gate de consentimento separado.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  try {
    const { pacienteId: rawId } = await params;
    const pacienteId = String(rawId || '').trim();
    if (!pacienteId) {
      return NextResponse.json({ error: 'pacienteId inválido' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const body = await request.json().catch(() => ({}));
    const idToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : typeof body.idToken === 'string'
        ? body.idToken
        : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    await getAuthAdmin().verifyIdToken(idToken);

    const db = getFirestoreAdmin();
    const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const dryRun = Boolean(body.dryRun);
    if (dryRun) {
      const discovery = await discoverHistoricalBodyScansForPatient(pacienteId);
      return NextResponse.json({ dryRun: true, ...discovery, generated: 0, skipped: 0, failed: 0 });
    }

    const result = await generateMissingHistoricalBodyScans({
      patientId: pacienteId,
      concurrency: 2,
    });

    const scansSnap = await pacienteSnap.ref.collection(BODYSCAN_SUBCOLLECTION).get();
    const scans = sortBodyScansByWeekAsc(
      scansSnap.docs
        .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is NonNullable<typeof x> => x != null)
    );

    return NextResponse.json({ ...result, scans });
  } catch (error) {
    console.error(
      '[BodyScan Backfill] metaadmin error',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: 'Erro ao preparar histórico BodyScan' }, { status: 500 });
  }
}
