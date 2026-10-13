import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import { listAllPersonalAvailabilitySlots } from '@/lib/personal/agenda/availabilityService';

export async function GET(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const toDate = request.nextUrl.searchParams.get('toDate') || undefined;
    const slots = await listAllPersonalAvailabilitySlots(auth.uid, fromDate, toDate);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('[metapersonal/agenda/availability/list]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar horários.' },
      { status: 500 }
    );
  }
}
