import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { listLeadTimeline } from '@/lib/whiteLabel/leadTimelineService';

export async function GET(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  const leadId = request.nextUrl.searchParams.get('leadId') || '';
  if (!leadId) {
    return NextResponse.json({ error: 'leadId é obrigatório.' }, { status: 400 });
  }

  try {
    const events = await listLeadTimeline(leadId);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('[API leads-whitelabel/timeline]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar timeline.' },
      { status: 500 }
    );
  }
}
