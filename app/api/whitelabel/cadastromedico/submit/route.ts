import { NextRequest, NextResponse } from 'next/server';
import { submitCadastroMedico } from '@/lib/whiteLabel/cadastroMedicoService';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      draftId?: string;
      form?: Record<string, unknown>;
    } | null;

    if (!body?.draftId || !body?.form || typeof body.form !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const result = await submitCadastroMedico({
      draftId: body.draftId,
      form: body.form,
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('[API whitelabel/cadastromedico/submit] POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao concluir cadastro.' },
      { status: 400 }
    );
  }
}
