import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { resolveConclusaoFotoContext } from '@/lib/conclusao/resolveConclusaoFotoContext';
import { BODYSCAN_SUBCOLLECTION } from '@/lib/bodyscan/bodyScanTypes';
import { serializeBodyScanDoc, sortBodyScansByWeekAsc } from '@/lib/bodyscan/bodyScanSerialize';
import {
  BODYSCAN_CONSENT_DOC_ID,
  BODYSCAN_CONSENT_SUBCOLLECTION,
  BODYSCAN_CONSENT_VERSION,
} from '@/lib/bodyscan/bodyScanConsent';

/** GET /api/conclusao/[token]/bodyscan — lista BodyScans do paciente do link. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ctx = await resolveConclusaoFotoContext((await params).token);
    if (!ctx) return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });

    const db = getFirestoreAdmin();
    const consentSnap = await db
      .collection('pacientes_completos')
      .doc(ctx.pacienteId)
      .collection(BODYSCAN_CONSENT_SUBCOLLECTION)
      .doc(BODYSCAN_CONSENT_DOC_ID)
      .get();
    const consentAccepted =
      consentSnap.data()?.accepted === true &&
      consentSnap.data()?.version === BODYSCAN_CONSENT_VERSION;

    const snap = await db
      .collection('pacientes_completos')
      .doc(ctx.pacienteId)
      .collection(BODYSCAN_SUBCOLLECTION)
      .get();

    const scans = sortBodyScansByWeekAsc(
      snap.docs
        .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is NonNullable<typeof x> => x != null)
    );

    const currentWeekScan =
      ctx.semana != null ? scans.find((s) => s.week === ctx.semana) ?? null : null;

    return NextResponse.json({
      consentAccepted,
      week: ctx.semana,
      current: currentWeekScan,
      scans,
    });
  } catch (error) {
    console.error('[BodyScan] list via conclusao token', error);
    return NextResponse.json({ error: 'Erro ao carregar BodyScan' }, { status: 500 });
  }
}
