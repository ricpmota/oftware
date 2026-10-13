import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { listDisparoCampaignItems } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const url = new URL(request.url);
  const result = await listDisparoCampaignItems({
    campaignId: id,
    status: url.searchParams.get('status') || 'todos',
    q: url.searchParams.get('q') || '',
    cursor: url.searchParams.get('cursor'),
  });
  return NextResponse.json({ ok: true, ...result });
}
