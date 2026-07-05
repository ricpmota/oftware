import { NextRequest, NextResponse } from 'next/server';
import { getCadastroMedicoDraft } from '@/lib/whiteLabel/cadastroMedicoService';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim() || '';
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }
    const draft = await getCadastroMedicoDraft(id);
    if (!draft) {
      return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ draft });
  } catch (error) {
    console.error('[API whitelabel/cadastromedico/draft] GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar rascunho.' },
      { status: 500 }
    );
  }
}
