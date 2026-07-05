import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import {
  deleteCadastroMedico,
  listCadastroMedicoForAdmin,
} from '@/lib/whiteLabel/cadastroMedicoService';

async function requireAdmin(request: NextRequest): Promise<{ email: string } | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Token de autenticação obrigatório.' }, { status: 401 });
  }
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    const email = (decoded.email || '').trim().toLowerCase();
    if (email !== METAADMIN_GERAL_EMAIL.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    return { email: decoded.email! };
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const cadastros = await listCadastroMedicoForAdmin();
    const rascunhos = cadastros.filter((c) => c.status === 'rascunho').length;
    const concluidos = cadastros.filter((c) => c.status === 'concluido').length;

    return NextResponse.json({
      cadastros,
      kpis: {
        total: cadastros.length,
        rascunhos,
        concluidos,
      },
    });
  } catch (error) {
    console.error('[API metaadmingeral/cadastro-medico-whitelabel] GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar cadastros.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const id = request.nextUrl.searchParams.get('id')?.trim() || '';
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }
    await deleteCadastroMedico(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API metaadmingeral/cadastro-medico-whitelabel] DELETE:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir cadastro.' },
      { status: 400 }
    );
  }
}
