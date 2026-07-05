import { NextRequest, NextResponse } from 'next/server';
import {
  buscarPlanoPorIdComToken,
  salvarEscolhaPacientePlano,
} from '@/lib/server/planoTerapeuticoInterativoStore';
import type { EscolhaPlanoPaciente } from '@/types/planoTerapeuticoInterativo';

export const runtime = 'nodejs';

type Body = {
  escolha?: EscolhaPlanoPaciente;
};

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

    const body = (await request.json().catch(() => null)) as Body | null;
    const escolha = body?.escolha;
    if (!escolha?.modalidade || typeof escolha.valorTotal !== 'number') {
      return NextResponse.json({ ok: false, error: 'Dados inválidos.' }, { status: 400 });
    }

    const doc = await buscarPlanoPorIdComToken(orcamentoId, token);
    if (!doc) {
      return NextResponse.json({ ok: false, error: 'Plano não encontrado.' }, { status: 404 });
    }

    const plano = await salvarEscolhaPacientePlano(doc.pacienteId, orcamentoId, token, escolha);
    if (!plano) {
      return NextResponse.json({ ok: false, error: 'Não foi possível salvar a escolha.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, plano });
  } catch (error) {
    console.error('[plano-terapeutico/escolha] Falha:', error);
    return NextResponse.json({ ok: false, error: 'Falha ao salvar escolha.' }, { status: 500 });
  }
}
