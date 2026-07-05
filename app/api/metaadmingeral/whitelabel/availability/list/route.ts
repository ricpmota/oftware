import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { listAllAvailabilitySlots } from '@/lib/whiteLabel/availabilityService';

export async function GET(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const toDate = request.nextUrl.searchParams.get('toDate') || undefined;
    const slots = await listAllAvailabilitySlots(fromDate, toDate);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('[API metaadmingeral/whitelabel/availability/list] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar horários.' },
      { status: 500 }
    );
  }
}
