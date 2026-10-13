import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { pauseDisparoCampaignRecord } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    return NextResponse.json({ ok: true, campaign: await pauseDisparoCampaignRecord(id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível pausar.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
