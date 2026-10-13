import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import type { DisparoColumnMapping, ImportSummary } from '@/lib/disparos/types';
import { createDisparoImport, listDisparoImports } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const imports = await listDisparoImports();
    return NextResponse.json({ ok: true, imports });
  } catch (error) {
    console.error('[disparos/importacoes]', error);
    const message = error instanceof Error ? error.message : 'Não foi possível carregar as bases.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: 'Dados inválidos.' }, { status: 400 });
  try {
    const created = await createDisparoImport({
      nome: String(body.nome || ''),
      nomeArquivo: String(body.nomeArquivo || 'contatos.csv'),
      createdBy: auth.email,
      dddPadrao: String(body.dddPadrao || ''),
      mapping: body.mapping as DisparoColumnMapping,
      summary: body.summary as ImportSummary,
    });
    return NextResponse.json({ ok: true, importacao: created });
  } catch (error) {
    console.error('[disparos/importacoes]', error);
    const message = error instanceof Error ? error.message : 'Não foi possível salvar a base.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
