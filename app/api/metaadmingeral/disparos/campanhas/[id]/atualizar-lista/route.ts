import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { keepSuccessfullySentContacts } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const result = await keepSuccessfullySentContacts(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar a lista.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
