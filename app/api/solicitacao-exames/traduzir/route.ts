import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  TraducaoSolicitacaoExamesError,
  validarEntradaTraducaoSolicitacaoExames,
  type SolicitacaoExamesTextoTraduzivel,
} from '@/lib/solicitacaoExames/traduzirSolicitacaoExames';
import { traduzirSolicitacaoExamesParaIngles } from '@/lib/solicitacaoExames/traduzirSolicitacaoExames.server';

export const runtime = 'nodejs';

type Body = {
  patientId?: string;
  exames?: unknown;
  hipoteseDiagnostica?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
    if (!patientId) {
      return NextResponse.json({ ok: false, error: 'Informe o paciente.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, patientId);
    if (!gate.ok) return gate.res;

    const texto: SolicitacaoExamesTextoTraduzivel = {
      exames: Array.isArray(body.exames) ? body.exames.filter((item): item is string => typeof item === 'string') : [],
      hipoteseDiagnostica: typeof body.hipoteseDiagnostica === 'string' ? body.hipoteseDiagnostica : '',
    };

    try {
      validarEntradaTraducaoSolicitacaoExames(texto);
    } catch (error) {
      const message =
        error instanceof TraducaoSolicitacaoExamesError ? error.message : 'Requisição inválida para tradução.';
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    const traduzido = await traduzirSolicitacaoExamesParaIngles(texto);
    return NextResponse.json({ ok: true, ...traduzido });
  } catch (error) {
    const message =
      error instanceof TraducaoSolicitacaoExamesError
        ? error.message
        : 'Não foi possível traduzir a requisição de exames para inglês. Tente novamente.';
    console.error('[solicitacao-exames/traduzir]', error instanceof Error ? error.message : 'erro');
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
