import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import type { ImportedContactStatus } from '@/lib/disparos/types';
import { appendDisparoContacts, listDisparoContacts, type IncomingDisparoContact } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') as ImportedContactStatus | 'todos' | null;
  const result = await listDisparoContacts({
    importId: id,
    status: status || 'todos',
    q: url.searchParams.get('q') || '',
    cursor: url.searchParams.get('cursor'),
  });
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { contacts?: IncomingDisparoContact[] } | null;
  if (!body?.contacts) return NextResponse.json({ ok: false, error: 'Contatos ausentes.' }, { status: 400 });
  try {
    const result = await appendDisparoContacts(id, body.contacts);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível gravar os contatos.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
