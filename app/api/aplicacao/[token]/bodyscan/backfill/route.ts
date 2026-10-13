import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
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
import {
  isValidAplicacaoPublicToken,
  normalizeAplicacaoPublicToken,
} from '@/lib/aplicacao/aplicacaoPublicToken';
import {
  alinharSemanaFotosDaAplicacao,
  applicationIdDoLinkAplicacao,
  resolverSemanaAplicacaoDoLink,
} from '@/lib/aplicacao/semanaAplicacaoPublica';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function resolvePacienteFromToken(tokenRaw: string) {
  const token = normalizeAplicacaoPublicToken(tokenRaw);
  if (!isValidAplicacaoPublicToken(token)) return null;
  const db = getFirestoreAdmin();
  const linkRef = await db.collection('aplicacao_links').doc(token).get();
  if (!linkRef.exists) return null;
  const linkData = (linkRef.data() || {}) as Record<string, unknown>;
  const pacienteId = String(linkData.pacienteId || '').trim();
  if (!pacienteId) return null;
  return { db, pacienteId, linkData, token };
}

/**
 * POST /api/aplicacao/[token]/bodyscan/backfill
 * Body: { dryRun?, acceptConsent? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ctx = await resolvePacienteFromToken(token);
    if (!ctx) {
      return NextResponse.json({ error: 'Link inválido' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);
    const acceptConsent = body.acceptConsent === true;

    if (acceptConsent) {
      await ctx.db
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

    const semana = await resolverSemanaAplicacaoDoLink(ctx.linkData);
    if (semana != null && semana > 0) {
      const dataAplicacao = String(ctx.linkData.data || '').trim();
      await alinharSemanaFotosDaAplicacao(ctx.db, {
        pacienteId: ctx.pacienteId,
        applicationId: applicationIdDoLinkAplicacao(ctx.linkData, ctx.token, dataAplicacao),
        semana,
      });
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

    const scansSnap = await ctx.db
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
      '[BodyScan Backfill] aplicacao token error',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: 'Erro ao preparar histórico BodyScan' }, { status: 500 });
  }
}
