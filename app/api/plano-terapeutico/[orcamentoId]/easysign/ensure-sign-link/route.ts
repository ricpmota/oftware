import { NextRequest, NextResponse } from 'next/server';
import { buscarPlanoPorIdComToken } from '@/lib/server/planoTerapeuticoInterativoStore';
import {
  contratoEasySignConfigDiagnostics,
  contratoEasySignNotConfiguredMessage,
  isContratoEasySignConfiguredServer,
} from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import { disponibilizarPlanoParaAssinaturaPaciente } from '@/lib/signature/bryEasySign/planoTerapeuticoEasySign.server';

export const runtime = 'nodejs';

function reasonForEnsureSignLinkError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('token easysign') || m.includes('obter token easysign')) return 'easysign_auth_failed';
  if (m.includes('falha ao criar envelope easysign')) return 'easysign_envelope_failed';
  if (m.includes('não encontrado') || m.includes('nao encontrado')) return 'plano_not_found';
  if (m.includes('sem e-mail') || m.includes('sem email')) return 'paciente_sem_email';
  if (m.includes('pdf do plano')) return 'plano_sem_pdf';
  return 'internal_error';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orcamentoId: string }> }
) {
  if (!isContratoEasySignConfiguredServer()) {
    console.warn('[plano-terapeutico/easysign/ensure-sign-link] not_configured', contratoEasySignConfigDiagnostics());
    return NextResponse.json(
      {
        ok: false,
        error: contratoEasySignNotConfiguredMessage(),
        reason: 'easysign_not_configured',
      },
      { status: 503 }
    );
  }

  try {
    const { orcamentoId } = await context.params;
    const token = request.nextUrl.searchParams.get('t')?.trim();
    if (!orcamentoId || !token) {
      return NextResponse.json({ ok: false, error: 'Acesso inválido.' }, { status: 400 });
    }

    const doc = await buscarPlanoPorIdComToken(orcamentoId, token);
    if (!doc) {
      return NextResponse.json({ ok: false, error: 'Plano não encontrado.' }, { status: 404 });
    }

    const medicoDocId = doc.medicoId?.trim();
    if (!medicoDocId) {
      return NextResponse.json(
        { ok: false, error: 'Plano sem médico responsável registrado.' },
        { status: 400 }
      );
    }

    const result = await disponibilizarPlanoParaAssinaturaPaciente({
      pacienteId: doc.pacienteId,
      orcamentoId,
      medicoDocId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível preparar sua assinatura.';
    const reason = reasonForEnsureSignLinkError(message);
    console.error('[plano-terapeutico/easysign/ensure-sign-link]', { reason, message });
    return NextResponse.json({ ok: false, error: message, reason }, { status: 500 });
  }
}
