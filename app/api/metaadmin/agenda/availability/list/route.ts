import { NextRequest, NextResponse } from 'next/server';
import { requireAgendaMedico } from '@/lib/metaadmin/agenda/requireAgendaMedico';
import { listAllMedicoAvailabilitySlots } from '@/lib/metaadmin/agenda/availabilityService';

export async function GET(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const toDate = request.nextUrl.searchParams.get('toDate') || undefined;
    const slots = await listAllMedicoAvailabilitySlots(auth.medicoDocId, fromDate, toDate);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('[metaadmin/agenda/availability/list]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar horários.' },
      { status: 500 }
    );
  }
}
