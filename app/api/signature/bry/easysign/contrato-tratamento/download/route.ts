import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  contratoEasySignNotConfiguredMessage,
  isContratoEasySignConfiguredServer,
} from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import { syncContratoEasySignPatientSignature } from '@/lib/signature/bryEasySign/syncContratoEasySignPatientSignature.server';

export const runtime = 'nodejs';

type Body = {
  pacienteId?: string;
  documentoId?: string;
};

export async function POST(request: NextRequest) {
  if (!isContratoEasySignConfiguredServer()) {
    return NextResponse.json(
      { ok: false, error: contratoEasySignNotConfiguredMessage() },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Body;
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const documentoId = typeof body.documentoId === 'string' ? body.documentoId.trim() : '';

    if (!pacienteId || !documentoId) {
      return NextResponse.json(
        { ok: false, error: 'Informe pacienteId e documentoId.' },
        { status: 400 }
      );
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const result = await syncContratoEasySignPatientSignature({
      pacienteId,
      documentoId,
      sendEmail: true,
    });

    if (result.pending) {
      return NextResponse.json(
        {
          ok: false,
          error: 'O paciente ainda não concluiu a assinatura no EasySign.',
          pending: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      pdfFinalAssinadoUrl: result.pdfFinalAssinadoUrl,
      pacienteAssinadoEm: result.pacienteAssinadoEm,
      statusAssinatura: result.statusAssinatura,
      emailSent: result.emailSent,
    });
  } catch (error: unknown) {
    console.error('[easysign/contrato-tratamento/download]', {
      message: error instanceof Error ? error.message : String(error),
    });
    const message =
      error instanceof Error ? error.message : 'Erro ao baixar PDF final do EasySign.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
