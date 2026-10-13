import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { resumeDisparoCampaignRecord } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { retryFailed?: boolean } | null;
  try {
    return NextResponse.json({
      ok: true,
      campaign: await resumeDisparoCampaignRecord(id, { retryFailed: body?.retryFailed === true }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível continuar.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
