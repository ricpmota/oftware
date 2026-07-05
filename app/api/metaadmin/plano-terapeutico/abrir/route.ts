import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { garantirPublicUrlPlanoTerapeutico } from '@/lib/server/planoTerapeuticoInterativoStore';

export const runtime = 'nodejs';

type Body = {
  pacienteId?: string;
  orcamentoId?: string;
};

/** Garante URL pública do plano existente (sem criar documento novo). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const pacienteId = body?.pacienteId?.trim() ?? '';
    const orcamentoId = body?.orcamentoId?.trim() ?? '';

    if (!pacienteId || !orcamentoId) {
      return NextResponse.json(
        { ok: false, error: 'Informe pacienteId e orcamentoId.' },
        { status: 400 }
      );
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const publicUrl = await garantirPublicUrlPlanoTerapeutico(pacienteId, orcamentoId);
    if (!publicUrl) {
      return NextResponse.json(
        { ok: false, error: 'Plano não encontrado ou indisponível.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, publicUrl, orcamentoId });
  } catch (error) {
    console.error('[metaadmin/plano-terapeutico/abrir]', error);
    return NextResponse.json({ ok: false, error: 'Falha ao abrir plano.' }, { status: 500 });
  }
}
