import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { BODYSCAN_SUBCOLLECTION } from '@/lib/bodyscan/bodyScanTypes';
import { serializeBodyScanDoc, sortBodyScansByWeekAsc } from '@/lib/bodyscan/bodyScanSerialize';
import {
  BODYSCAN_CONSENT_DOC_ID,
  BODYSCAN_CONSENT_SUBCOLLECTION,
  BODYSCAN_CONSENT_VERSION,
} from '@/lib/bodyscan/bodyScanConsent';
import {
  isValidAplicacaoPublicToken,
  normalizeAplicacaoPublicToken,
} from '@/lib/aplicacao/aplicacaoPublicToken';
import {
  alinharSemanaFotosDaAplicacao,
  applicationIdDoLinkAplicacao,
  resolverSemanaAplicacaoDoLink,
} from '@/lib/aplicacao/semanaAplicacaoPublica';

/**
 * GET /api/aplicacao/[token]/bodyscan
 * Lista BodyScans do paciente do link (para UI /aplicacao se necessário).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizeAplicacaoPublicToken((await params).token);
    if (!isValidAplicacaoPublicToken(token)) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const linkRef = await db.collection('aplicacao_links').doc(token).get();
    if (!linkRef.exists) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }

    const linkData = (linkRef.data() || {}) as Record<string, unknown>;
    const pacienteId = String(linkData.pacienteId || '').trim();
    if (!pacienteId) {
      return NextResponse.json({ error: 'Dados do link inválidos' }, { status: 400 });
    }

    const semana = await resolverSemanaAplicacaoDoLink(linkData);
    if (semana != null && semana > 0) {
      const dataAplicacao = String(linkData.data || '').trim();
      await alinharSemanaFotosDaAplicacao(db, {
        pacienteId,
        applicationId: applicationIdDoLinkAplicacao(linkData, token, dataAplicacao),
        semana,
      });
    }

    const consentSnap = await db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection(BODYSCAN_CONSENT_SUBCOLLECTION)
      .doc(BODYSCAN_CONSENT_DOC_ID)
      .get();
    const consentAccepted =
      consentSnap.data()?.accepted === true &&
      consentSnap.data()?.version === BODYSCAN_CONSENT_VERSION;

    const snap = await db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection(BODYSCAN_SUBCOLLECTION)
      .get();

    const scans = sortBodyScansByWeekAsc(
      snap.docs
        .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
        .filter((x): x is NonNullable<typeof x> => x != null)
    );

    const currentWeekScan =
      semana != null ? scans.find((s) => s.week === semana) ?? null : null;

    return NextResponse.json({
      consentAccepted,
      week: semana,
      current: currentWeekScan,
      scans,
    });
  } catch (error) {
    console.error('[BodyScan] list via token', error);
    return NextResponse.json({ error: 'Erro ao carregar BodyScan' }, { status: 500 });
  }
}
