import { NextRequest, NextResponse } from 'next/server';
import { resolverMotorPersonalizadoPlano } from '@/lib/server/planoTerapeuticoMotorPersonalizado';

export const runtime = 'nodejs';

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

    const result = await resolverMotorPersonalizadoPlano(orcamentoId, token);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      cenarios: result.cenarios,
      origemEstimativaEquilibrada: result.origemEstimativaEquilibrada,
    });
  } catch (error) {
    console.error('[plano-terapeutico/motor-personalizado] Falha:', error);
    return NextResponse.json(
      { ok: false, error: 'Falha ao preparar plano personalizado.' },
      { status: 500 }
    );
  }
}
