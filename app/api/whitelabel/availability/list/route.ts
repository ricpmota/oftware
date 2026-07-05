import { NextRequest, NextResponse } from 'next/server';
import { listAvailableSlots } from '@/lib/whiteLabel/availabilityService';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { fromDate?: string };
    const fromDate = typeof body.fromDate === 'string' ? body.fromDate.trim() : undefined;
    const today = new Date().toISOString().slice(0, 10);
    const slots = await listAvailableSlots(fromDate || today);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('[API whitelabel/availability/list] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar horários.' },
      { status: 500 }
    );
  }
}
