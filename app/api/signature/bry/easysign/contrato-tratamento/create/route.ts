import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  contratoEasySignNotConfiguredMessage,
  isContratoEasySignConfiguredServer,
} from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import { disponibilizarContratoParaAssinaturaPaciente } from '@/lib/signature/bryEasySign/contratoTratamentoEasySignPoc.server';

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

    const result = await disponibilizarContratoParaAssinaturaPaciente({
      pacienteId,
      documentoId,
      medicoDocId: gate.medicoDocId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    console.error('[easysign/contrato-tratamento/create]', {
      message: error instanceof Error ? error.message : String(error),
    });
    const message =
      error instanceof Error ? error.message : 'Erro ao criar link EasySign do paciente.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
