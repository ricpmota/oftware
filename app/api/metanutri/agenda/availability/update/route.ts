import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import { updateNutriAvailabilitySlot } from '@/lib/nutri/agenda/availabilityService';
import type { NutriAvailabilityStatus } from '@/types/nutriAgenda';

const VALID_STATUS: NutriAvailabilityStatus[] = ['available', 'blocked'];

export async function POST(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      delete?: boolean;
    };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });

    if (body.delete) {
      const result = await updateNutriAvailabilitySlot({
        nutricionistaId: auth.uid,
        id,
        delete: true,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (!body.status || !VALID_STATUS.includes(body.status as NutriAvailabilityStatus)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const slot = await updateNutriAvailabilitySlot({
      nutricionistaId: auth.uid,
      id,
      status: body.status as NutriAvailabilityStatus,
    });
    return NextResponse.json({ success: true, slot });
  } catch (error) {
    console.error('[metanutri/agenda/availability/update]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar horário.' },
      { status: 400 }
    );
  }
}
