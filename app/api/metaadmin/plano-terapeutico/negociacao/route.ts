import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { salvarPropostaNegociacaoTerapeutica } from '@/lib/server/planoTerapeuticoInterativoStore';
import type { NegociacaoTerapeuticaSalva } from '@/types/planoTerapeuticoInterativo';

export const runtime = 'nodejs';

type Body = {
  pacienteId?: string;
  orcamentoId?: string;
  negociacao?: NegociacaoTerapeuticaSalva;
  valorTotal?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const pacienteId = body?.pacienteId?.trim() ?? '';
    const orcamentoId = body?.orcamentoId?.trim() ?? '';
    const negociacao = body?.negociacao;

    if (!pacienteId || !orcamentoId || !negociacao?.parametros) {
      return NextResponse.json(
        { ok: false, error: 'Informe pacienteId, orcamentoId e a proposta.' },
        { status: 400 }
      );
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const plano = await salvarPropostaNegociacaoTerapeutica(pacienteId, orcamentoId, negociacao, {
      valorTotal: Number(body?.valorTotal) || undefined,
    });
    if (!plano) {
      return NextResponse.json(
        { ok: false, error: 'Não foi possível salvar a proposta.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, plano });
  } catch (error) {
    console.error('[metaadmin/plano-terapeutico/negociacao]', error);
    return NextResponse.json({ ok: false, error: 'Falha ao salvar proposta.' }, { status: 500 });
  }
}
