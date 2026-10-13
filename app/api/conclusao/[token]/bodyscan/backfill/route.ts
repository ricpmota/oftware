import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { resolveConclusaoFotoContext } from '@/lib/conclusao/resolveConclusaoFotoContext';
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

/** POST /api/conclusao/[token]/bodyscan/backfill */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ctx = await resolveConclusaoFotoContext((await params).token);
    if (!ctx) return NextResponse.json({ error: 'Link inválido' }, { status: 404 });

    const db = getFirestoreAdmin();
    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);
    const acceptConsent = body.acceptConsent === true;

    if (acceptConsent) {
      await db
        .collection('pacientes_completos')
        .doc(ctx.pacienteId)
        .collection(BODYSCAN_CONSENT_SUBCOLLECTION)
        .doc(BODYSCAN_CONSENT_DOC_ID)
        .set(
          {
            accepted: true,
            version: BODYSCAN_CONSENT_VERSION,
            acceptedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            patientId: ctx.pacienteId,
          },
          { merge: true }
        );
    }

    if (dryRun) {
      const discovery = await discoverHistoricalBodyScansForPatient(ctx.pacienteId);
      return NextResponse.json({
        dryRun: true,
        ...discovery,
        generated: 0,
        skipped: discovery.alreadyCompleted,
        failed: 0,
      });
    }

    const result = await generateMissingHistoricalBodyScans({
      patientId: ctx.pacienteId,
      concurrency: 2,
    });

    const scansSnap = await db
      .collection('pacientes_completos')
      .doc(ctx.pacienteId)
      .collection(BODYSCAN_SUBCOLLECTION)
      .get();
    const scans = sortBodyScansByWeekAsc(
      scansSnap.docs
        .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is NonNullable<typeof x> => x != null)
    );

    return NextResponse.json({ ...result, scans });
  } catch (error) {
    console.error(
      '[BodyScan Backfill] conclusao token error',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: 'Erro ao preparar histórico BodyScan' }, { status: 500 });
  }
}
