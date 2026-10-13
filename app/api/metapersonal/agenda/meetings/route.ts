import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import { listPersonalReservedMeetings } from '@/lib/personal/agenda/availabilityService';

export async function GET(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const toDate = request.nextUrl.searchParams.get('toDate') || undefined;
    const meetings = await listPersonalReservedMeetings(auth.uid, fromDate, toDate);
    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('[metapersonal/agenda/meetings]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar reuniões.' },
      { status: 500 }
    );
  }
}
