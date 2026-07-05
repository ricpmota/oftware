import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { cancelarPlanoTerapeutico, cancelarTodosPlanosEdicaoPaciente } from '@/lib/server/planoTerapeuticoInterativoStore';

export const runtime = 'nodejs';

type Body = {
  pacienteId?: string;
  orcamentoId?: string;
  cancelarTodos?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const pacienteId = body?.pacienteId?.trim() ?? '';
    const orcamentoId = body?.orcamentoId?.trim() ?? '';

    if (!pacienteId) {
      return NextResponse.json({ ok: false, error: 'Informe pacienteId.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    if (body?.cancelarTodos) {
      const total = await cancelarTodosPlanosEdicaoPaciente(pacienteId);
      return NextResponse.json({ ok: true, cancelados: total });
    }

    if (!orcamentoId) {
      return NextResponse.json(
        { ok: false, error: 'Informe orcamentoId.' },
        { status: 400 }
      );
    }

    const plano = await cancelarPlanoTerapeutico(pacienteId, orcamentoId);
    if (!plano) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Não foi possível cancelar. O plano pode já estar assinado pelo médico.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, plano });
  } catch (error) {
    console.error('[metaadmin/plano-terapeutico/cancelar]', error);
    return NextResponse.json({ ok: false, error: 'Falha ao cancelar plano.' }, { status: 500 });
  }
}
