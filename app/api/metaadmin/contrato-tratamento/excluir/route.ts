import { NextRequest, NextResponse } from 'next/server';
import { excluirContratosTratamentoPacienteAdmin } from '@/lib/documentos/contrato-tratamento/excluirContratosTratamentoPaciente.server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';

export const runtime = 'nodejs';

type Body = {
  pacienteId?: string;
  documentoId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const documentoId = typeof body.documentoId === 'string' ? body.documentoId.trim() : undefined;

    if (!pacienteId) {
      return NextResponse.json(
        { ok: false, error: 'Informe pacienteId.' },
        { status: 400 }
      );
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const result = await excluirContratosTratamentoPacienteAdmin({
      pacienteId,
      medicoDocId: gate.medicoDocId,
      documentoId,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error('[metaadmin/contrato-tratamento/excluir]', {
      message: error instanceof Error ? error.message : String(error),
    });
    const message =
      error instanceof Error ? error.message : 'Não foi possível excluir o contrato.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
