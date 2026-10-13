import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { deleteDisparoImport, getDisparoImport } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const importacao = await getDisparoImport(id);
  if (!importacao) return NextResponse.json({ ok: false, error: 'Base não encontrada.' }, { status: 404 });
  return NextResponse.json({ ok: true, importacao });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const result = await deleteDisparoImport(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a base.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
