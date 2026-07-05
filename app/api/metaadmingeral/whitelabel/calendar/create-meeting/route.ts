import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { createMeetingForWhiteLabelLead, markLeadMeetingError } from '@/lib/whiteLabel/meetingService';

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
    const meeting = await createMeetingForWhiteLabelLead(leadId, availabilityId);
    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    await markLeadMeetingError(leadId, availabilityId).catch(() => undefined);
    const message = error instanceof Error ? error.message : 'Erro ao criar reunião.';
    console.error('[API metaadmingeral/whitelabel/calendar/create-meeting] Erro:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
