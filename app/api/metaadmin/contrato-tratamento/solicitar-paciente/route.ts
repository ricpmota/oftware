import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { solicitarAssinaturaPacienteContratoAdmin } from '@/lib/documentos/contrato-tratamento/solicitarContratoAssinaturaPaciente.server';

export const runtime = 'nodejs';

type Body = {
  pacienteId?: string;
  medicoId?: string;
  hashDocumento?: string;
  documentoId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const medicoId = typeof body.medicoId === 'string' ? body.medicoId.trim() : '';
    const hashDocumento = typeof body.hashDocumento === 'string' ? body.hashDocumento.trim() : '';
    const documentoId = typeof body.documentoId === 'string' ? body.documentoId.trim() : undefined;

    if (!pacienteId || !medicoId || !hashDocumento) {
      return NextResponse.json(
        { ok: false, error: 'Informe pacienteId, medicoId e hashDocumento.' },
        { status: 400 }
      );
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const resolvedDocumentoId = await solicitarAssinaturaPacienteContratoAdmin({
      pacienteId,
      medicoId: gate.medicoDocId || medicoId,
      hashDocumento,
      documentoId,
    });

    return NextResponse.json({ ok: true, documentoId: resolvedDocumentoId });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível solicitar assinatura do paciente.';
    console.error('[contrato/solicitar-paciente]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
