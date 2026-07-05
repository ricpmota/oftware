import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getWhiteLabelCalendarStatus } from '@/lib/google/calendarService';

export async function GET(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const status = await getWhiteLabelCalendarStatus();
    return NextResponse.json({ status });
  } catch (error) {
    console.error('[API metaadmingeral/whitelabel/calendar/status] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao verificar Google Calendar.' },
      { status: 500 }
    );
  }
}
