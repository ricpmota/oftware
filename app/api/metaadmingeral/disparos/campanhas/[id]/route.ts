import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { deleteDisparoCampaign, getDisparoCampaign } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const campaign = await getDisparoCampaign(id);
  if (!campaign) return NextResponse.json({ ok: false, error: 'Campanha não encontrada.' }, { status: 404 });
  return NextResponse.json({ ok: true, campaign });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    await deleteDisparoCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a campanha.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
