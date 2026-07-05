import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  CONSENTIMENTOS_RECOMENDACOES_SUBCOLLECTION,
  RECOMENDACOES_CONSENT_STEP_APLICACAO,
  RECOMENDACOES_TERM_VERSION,
} from '@/lib/meta/recomendacaoConsentConstants';

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? null;
}

function pacientePertenceAoUsuario(
  paciente: Record<string, unknown>,
  uid: string,
  email: string | undefined
): boolean {
  const emailNorm = email?.toLowerCase().trim();
  if (paciente.userId === uid) return true;
  if (emailNorm && String(paciente.email || '').toLowerCase().trim() === emailNorm) return true;
  const dadosId = paciente.dadosIdentificacao as { email?: string } | undefined;
  const idEmail = dadosId?.email;
  if (emailNorm && String(idEmail || '').toLowerCase().trim() === emailNorm) return true;
  return false;
}

/**
 * POST /api/meta/recomendacoes-consent
 * Registra aceite da etapa Aplicação (3ª página) + marca recomendações como lidas.
 * Body: { pacienteId: string, idToken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';

    if (!pacienteId || !idToken) {
      return NextResponse.json({ error: 'pacienteId e idToken são obrigatórios.' }, { status: 400 });
    }

    const decoded = await getAuthAdmin().verifyIdToken(idToken);
    const db = getFirestoreAdmin();
    const pacienteRef = db.collection('pacientes_completos').doc(pacienteId);
    const pacienteSnap = await pacienteRef.get();

    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
    }

    const pacienteData = pacienteSnap.data()!;
    if (!pacientePertenceAoUsuario(pacienteData, decoded.uid, decoded.email)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const acceptedAt = FieldValue.serverTimestamp();
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') ?? null;

    const consentPayload = {
      patientId: pacienteId,
      acceptedAt,
      termVersion: RECOMENDACOES_TERM_VERSION,
      step: RECOMENDACOES_CONSENT_STEP_APLICACAO,
      topicsCompleted: ['alimentacao', 'exercicios', 'aplicacao'],
      ip,
      userAgent,
    };

    const consentRef = await pacienteRef.collection(CONSENTIMENTOS_RECOMENDACOES_SUBCOLLECTION).add(consentPayload);

    await pacienteRef.update({
      recomendacoesLidas: true,
      dataLeituraRecomendacoes: acceptedAt,
      recomendacoesTermoVersao: RECOMENDACOES_TERM_VERSION,
    });

    return NextResponse.json({
      ok: true,
      consentId: consentRef.id,
      termVersion: RECOMENDACOES_TERM_VERSION,
      step: RECOMENDACOES_CONSENT_STEP_APLICACAO,
    });
  } catch (err) {
    console.error('Erro ao registrar consentimento de recomendações:', err);
    const message = err instanceof Error ? err.message : 'Erro ao registrar aceite.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
