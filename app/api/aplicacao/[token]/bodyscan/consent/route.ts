import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  BODYSCAN_CONSENT_DESCRIPTION,
  BODYSCAN_CONSENT_DOC_ID,
  BODYSCAN_CONSENT_LABEL,
  BODYSCAN_CONSENT_SUBCOLLECTION,
  BODYSCAN_CONSENT_VERSION,
} from '@/lib/bodyscan/bodyScanConsent';
import { scheduleBodyScanGeneration } from '@/lib/bodyscan/tryGenerateBodyScan';
import {
  isValidAplicacaoPublicToken,
  normalizeAplicacaoPublicToken,
} from '@/lib/aplicacao/aplicacaoPublicToken';

async function resolvePacienteFromToken(tokenRaw: string) {
  const token = normalizeAplicacaoPublicToken(tokenRaw);
  if (!isValidAplicacaoPublicToken(token)) return null;
  const db = getFirestoreAdmin();
  const linkRef = await db.collection('aplicacao_links').doc(token).get();
  if (!linkRef.exists) return null;
  const linkData = linkRef.data() || {};
  const pacienteId = String(linkData.pacienteId || '').trim();
  const semana = Number(linkData.semana);
  const data = String(linkData.data || '').trim();
  if (!pacienteId) return null;
  return {
    db,
    pacienteId,
    semana: Number.isFinite(semana) ? semana : null,
    data: data || undefined,
  };
}

/**
 * GET /api/aplicacao/[token]/bodyscan/consent
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ctx = await resolvePacienteFromToken(token);
    if (!ctx) {
      return NextResponse.json({ error: 'Link inválido' }, { status: 404 });
    }

    const snap = await ctx.db
      .collection('pacientes_completos')
      .doc(ctx.pacienteId)
      .collection(BODYSCAN_CONSENT_SUBCOLLECTION)
      .doc(BODYSCAN_CONSENT_DOC_ID)
      .get();

    const data = snap.data() || {};
    const accepted = data.accepted === true && data.version === BODYSCAN_CONSENT_VERSION;

    return NextResponse.json({
      accepted,
      version: BODYSCAN_CONSENT_VERSION,
      label: BODYSCAN_CONSENT_LABEL,
      description: BODYSCAN_CONSENT_DESCRIPTION,
      acceptedAt: data.acceptedAt ?? null,
    });
  } catch (error) {
    console.error('[BodyScan] consent GET', error);
    return NextResponse.json({ error: 'Erro ao carregar consentimento' }, { status: 500 });
  }
}

/**
 * POST /api/aplicacao/[token]/bodyscan/consent
 * Body: { accepted: boolean }
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
    const accepted = Boolean(body?.accepted);

    await ctx.db
      .collection('pacientes_completos')
      .doc(ctx.pacienteId)
      .collection(BODYSCAN_CONSENT_SUBCOLLECTION)
      .doc(BODYSCAN_CONSENT_DOC_ID)
      .set(
        {
          accepted,
          version: BODYSCAN_CONSENT_VERSION,
          acceptedAt: accepted ? FieldValue.serverTimestamp() : null,
          updatedAt: FieldValue.serverTimestamp(),
          patientId: ctx.pacienteId,
        },
        { merge: true }
      );

    if (accepted && ctx.semana != null) {
      scheduleBodyScanGeneration({
        patientId: ctx.pacienteId,
        week: ctx.semana,
        date: ctx.data,
      });
    }

    return NextResponse.json({
      ok: true,
      accepted,
      version: BODYSCAN_CONSENT_VERSION,
    });
  } catch (error) {
    console.error('[BodyScan] consent POST', error);
    return NextResponse.json({ error: 'Erro ao salvar consentimento' }, { status: 500 });
  }
}
