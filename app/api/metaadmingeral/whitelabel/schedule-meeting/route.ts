import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { SlotUnavailableError } from '@/lib/whiteLabel/availabilityService';
import { manualScheduleMeetingForLead } from '@/lib/whiteLabel/meetingService';

export async function POST(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  const body = (await request.json().catch(() => ({}))) as {
    leadId?: string;
    availabilityId?: string;
  };

  const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
  const availabilityId = typeof body.availabilityId === 'string' ? body.availabilityId.trim() : '';

  if (!leadId || !availabilityId) {
    return NextResponse.json({ error: 'leadId e availabilityId são obrigatórios.' }, { status: 400 });
  }

  try {
    const result = await manualScheduleMeetingForLead(leadId, availabilityId);
    return NextResponse.json({ success: true, meeting: result });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message, code: 'SLOT_UNAVAILABLE' }, { status: 409 });
    }

    console.error('[API metaadmingeral/whitelabel/schedule-meeting] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao agendar reunião.' },
      { status: 400 }
    );
  }
}
