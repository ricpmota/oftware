import { NextRequest, NextResponse } from 'next/server';
import {
  buscarPlanoPorIdComToken,
  sanitizarPlanoParaPublico,
} from '@/lib/server/planoTerapeuticoInterativoStore';
import { carregarPlanoTerapeuticoPdfContext } from '@/lib/server/planoTerapeuticoPdfContext.server';
import {
  contratoEasySignNotConfiguredMessage,
  isContratoEasySignConfiguredServer,
} from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import { syncPlanoEasySignPatientSignature } from '@/lib/signature/bryEasySign/syncPlanoEasySignPatientSignature.server';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orcamentoId: string }> }
) {
  if (!isContratoEasySignConfiguredServer()) {
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

    const pdfContext = await carregarPlanoTerapeuticoPdfContext({
      pacienteId: doc.pacienteId,
      medicoId: doc.medicoId,
      organizationId: doc.organizationId,
      metaDescricao: doc.contextoPaciente.metaDescricao,
    });

    const result = await syncPlanoEasySignPatientSignature({
      pacienteId: doc.pacienteId,
      orcamentoId,
      pacienteNome: pdfContext.pacienteNome,
    });

    if (result.pending) {
      return NextResponse.json({
        ok: true,
        pending: true,
        statusAssinatura: 'aguardando_paciente',
      });
    }

    const docAtualizado = await buscarPlanoPorIdComToken(orcamentoId, token);

    return NextResponse.json({
      ok: true,
      pending: false,
      statusAssinatura: 'aceito',
      pdfFinalAssinadoUrl: result.pdfFinalAssinadoUrl,
      pacienteAssinadoEm: result.pacienteAssinadoEm,
      newlySynced: result.newlySynced,
      plano: docAtualizado ? sanitizarPlanoParaPublico(docAtualizado) : undefined,
    });
  } catch (error) {
    console.error('[plano-terapeutico/easysign/sync]', error);
    return NextResponse.json(
      { ok: false, error: 'Não foi possível verificar sua assinatura.' },
      { status: 500 }
    );
  }
}
