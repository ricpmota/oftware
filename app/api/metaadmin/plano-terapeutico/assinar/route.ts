import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { registrarAssinaturaMedicoPlanoTerapeutico } from '@/lib/server/planoTerapeuticoInterativoStore';

export const runtime = 'nodejs';

type Body = {
  pacienteId?: string;
  orcamentoId?: string;
  signedPdfUrl?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const pacienteId = body?.pacienteId?.trim() ?? '';
    const orcamentoId = body?.orcamentoId?.trim() ?? '';
    const signedPdfUrl = body?.signedPdfUrl?.trim() ?? '';

    if (!pacienteId || !orcamentoId || !signedPdfUrl) {
      return NextResponse.json(
        { ok: false, error: 'Informe pacienteId, orcamentoId e signedPdfUrl.' },
        { status: 400 }
      );
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const plano = await registrarAssinaturaMedicoPlanoTerapeutico(
      pacienteId,
      orcamentoId,
      signedPdfUrl
    );
    if (!plano) {
      return NextResponse.json(
        { ok: false, error: 'Plano não encontrado ou paciente ainda não aceitou.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, plano });
  } catch (error) {
    console.error('[metaadmin/plano-terapeutico/assinar]', error);
    return NextResponse.json({ ok: false, error: 'Falha ao registrar assinatura.' }, { status: 500 });
  }
}
