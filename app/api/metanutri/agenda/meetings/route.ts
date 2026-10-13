import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import { listNutriReservedMeetings } from '@/lib/nutri/agenda/availabilityService';

export async function GET(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const toDate = request.nextUrl.searchParams.get('toDate') || undefined;
    const meetings = await listNutriReservedMeetings(auth.uid, fromDate, toDate);
    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('[metanutri/agenda/meetings]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar reuniões.' },
      { status: 500 }
    );
  }
}
