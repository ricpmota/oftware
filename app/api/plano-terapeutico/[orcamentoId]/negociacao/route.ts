import { NextRequest, NextResponse } from 'next/server';
import {
  atualizarNegociacaoPacientePlano,
  buscarPlanoPorIdComToken,
} from '@/lib/server/planoTerapeuticoInterativoStore';
import type { VistaPropostaNegociacao } from '@/lib/treatment-negotiation/types';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orcamentoId: string }> }
) {
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

    const body = (await request.json().catch(() => null)) as {
      mensagemPaciente?: string;
      vistaProposta?: VistaPropostaNegociacao;
    } | null;

    const plano = await atualizarNegociacaoPacientePlano(doc.pacienteId, orcamentoId, token, {
      mensagemPaciente: body?.mensagemPaciente,
      vistaProposta: body?.vistaProposta,
    });

    if (!plano) {
      return NextResponse.json(
        { ok: false, error: 'Não foi possível atualizar a negociação.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, plano });
  } catch (error) {
    console.error('[plano-terapeutico/negociacao/PATCH]', error);
    return NextResponse.json({ ok: false, error: 'Falha ao atualizar.' }, { status: 500 });
  }
}
