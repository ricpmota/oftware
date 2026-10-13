import { NextRequest, NextResponse } from 'next/server';
import { saveCadastroMedicoDraft } from '@/lib/whiteLabel/cadastroMedicoService';
import { parseWhiteLabelProfissao } from '@/lib/whiteLabel/profissao';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      draftId?: string;
      form?: Record<string, unknown>;
      currentStep?: number;
      profissao?: string;
    } | null;

    if (!body?.form || typeof body.form !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const result = await saveCadastroMedicoDraft({
      draftId: body.draftId,
      form: body.form,
      currentStep: typeof body.currentStep === 'number' ? body.currentStep : 0,
      profissao: parseWhiteLabelProfissao(body.profissao ?? body.form.profissao, 'medico'),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API whitelabel/cadastromedico/save] POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar rascunho.' },
      { status: 400 }
    );
  }
}
