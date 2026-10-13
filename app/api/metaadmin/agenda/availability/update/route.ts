import { NextRequest, NextResponse } from 'next/server';
import { requireAgendaMedico } from '@/lib/metaadmin/agenda/requireAgendaMedico';
import { updateMedicoAvailabilitySlot } from '@/lib/metaadmin/agenda/availabilityService';
import type { MedicoAvailabilityStatus } from '@/types/medicoAgenda';

const VALID_STATUS: MedicoAvailabilityStatus[] = ['available', 'blocked'];

export async function POST(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
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
      const result = await updateMedicoAvailabilitySlot({
        medicoId: auth.medicoDocId,
        id,
        delete: true,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (!body.status || !VALID_STATUS.includes(body.status as MedicoAvailabilityStatus)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const slot = await updateMedicoAvailabilitySlot({
      medicoId: auth.medicoDocId,
      id,
      status: body.status as MedicoAvailabilityStatus,
    });
    return NextResponse.json({ success: true, slot });
  } catch (error) {
    console.error('[metaadmin/agenda/availability/update]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar horário.' },
      { status: 400 }
    );
  }
}
