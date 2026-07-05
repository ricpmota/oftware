import { NextRequest, NextResponse } from 'next/server';
import {
  buscarPlanoPorIdComToken,
  prepararPlanoParaAssinaturaPaciente,
  sanitizarPlanoParaPublico,
} from '@/lib/server/planoTerapeuticoInterativoStore';
import { carregarPlanoTerapeuticoPdfContext } from '@/lib/server/planoTerapeuticoPdfContext.server';
import { uploadPlanoTerapeuticoPdf } from '@/lib/server/planoTerapeuticoPdfStorage.server';
import {
  contratoEasySignConfigDiagnostics,
  contratoEasySignNotConfiguredMessage,
  isContratoEasySignConfiguredServer,
} from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import { disponibilizarPlanoParaAssinaturaPaciente } from '@/lib/signature/bryEasySign/planoTerapeuticoEasySign.server';
import type { EscolhaPlanoPaciente } from '@/types/planoTerapeuticoInterativo';

export const runtime = 'nodejs';

const MAX_PDF_BYTES = 12 * 1024 * 1024;

type Body = {
  escolha?: EscolhaPlanoPaciente;
  pdfBase64?: string;
};

function reasonForEnsureSignLinkError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('token easysign') || m.includes('obter token easysign')) return 'easysign_auth_failed';
  if (m.includes('falha ao criar envelope easysign')) return 'easysign_envelope_failed';
  if (m.includes('plano terapêutico não encontrado') || m.includes('plano terapeutico nao encontrado')) {
    return 'plano_not_found';
  }
  if (m.includes('sem e-mail') || m.includes('sem email')) return 'paciente_sem_email';
  if (m.includes('pdf do plano')) return 'plano_sem_pdf';
  if (m.includes('telefone') && m.includes('inválido')) return 'signer_phone_invalid';
  return 'internal_error';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orcamentoId: string }> }
) {
  try {
    const { orcamentoId } = await context.params;
    const token = request.nextUrl.searchParams.get('t')?.trim();
    if (!orcamentoId || !token) {
      return NextResponse.json({ ok: false, error: 'Acesso inválido.' }, { status: 400 });
    }

    if (!isContratoEasySignConfiguredServer()) {
      console.warn('[plano-terapeutico/aceitar] easysign_not_configured', contratoEasySignConfigDiagnostics());
      return NextResponse.json(
        {
          ok: false,
          error: contratoEasySignNotConfiguredMessage(),
          reason: 'easysign_not_configured',
        },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    const escolha = body?.escolha;
    if (!escolha?.modalidade || typeof escolha.valorTotal !== 'number') {
      return NextResponse.json({ ok: false, error: 'Dados do plano inválidos.' }, { status: 400 });
    }

    const b64 = typeof body?.pdfBase64 === 'string' ? body.pdfBase64.trim() : '';
    if (!b64) {
      return NextResponse.json({ ok: false, error: 'PDF do plano é obrigatório.' }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(b64, 'base64');
    if (!pdfBuffer.length) {
      return NextResponse.json({ ok: false, error: 'PDF inválido.' }, { status: 400 });
    }
    if (pdfBuffer.length > MAX_PDF_BYTES) {
      return NextResponse.json({ ok: false, error: 'PDF muito grande (máx. 12 MB).' }, { status: 400 });
    }

    const doc = await buscarPlanoPorIdComToken(orcamentoId, token);
    if (!doc) {
      return NextResponse.json({ ok: false, error: 'Plano não encontrado.' }, { status: 404 });
    }

    if (doc.status === 'aceito' && doc.pdfFinalAssinadoUrl) {
      return NextResponse.json({
        ok: true,
        plano: sanitizarPlanoParaPublico(doc),
        pendingSignature: false,
        pacienteSignLinkUrl: null,
      });
    }

    const pdfUrl = await uploadPlanoTerapeuticoPdf({
      pacienteId: doc.pacienteId,
      orcamentoId,
      pdfBuffer,
    });

    const plano = await prepararPlanoParaAssinaturaPaciente(doc.pacienteId, orcamentoId, token, {
      escolha,
      pdfUrl,
    });
    if (!plano) {
      return NextResponse.json(
        { ok: false, error: 'Não foi possível preparar o plano para assinatura.' },
        { status: 400 }
      );
    }

    const medicoDocId = doc.medicoId?.trim();
    if (!medicoDocId) {
      return NextResponse.json(
        { ok: false, error: 'Plano sem médico responsável registrado.', reason: 'plano_sem_medico' },
        { status: 400 }
      );
    }

    try {
      const signResult = await disponibilizarPlanoParaAssinaturaPaciente({
        pacienteId: doc.pacienteId,
        orcamentoId,
        medicoDocId,
      });

      const docAtualizado = await buscarPlanoPorIdComToken(orcamentoId, token);

      return NextResponse.json({
        ok: true,
        plano: docAtualizado ? sanitizarPlanoParaPublico(docAtualizado) : plano,
        pdfUrl,
        pendingSignature: true,
        pacienteSignLinkUrl: signResult.pacienteSignLinkUrl,
        pacienteSignIframeUrl: signResult.pacienteSignIframeUrl ?? null,
      });
    } catch (signError: unknown) {
      const message =
        signError instanceof Error ? signError.message : 'Não foi possível preparar sua assinatura.';
      const reason = reasonForEnsureSignLinkError(message);
      console.error('[plano-terapeutico/aceitar] easysign_error', { reason, message });
      return NextResponse.json({ ok: false, error: message, reason }, { status: 500 });
    }
  } catch (error) {
    console.error('[plano-terapeutico/aceitar] Falha:', error);
    return NextResponse.json({ ok: false, error: 'Falha ao assinar plano.' }, { status: 500 });
  }
}
