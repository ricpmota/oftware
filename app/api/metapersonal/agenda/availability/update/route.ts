import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import { updatePersonalAvailabilitySlot } from '@/lib/personal/agenda/availabilityService';
import type { PersonalAvailabilityStatus } from '@/types/personalAgenda';

const VALID_STATUS: PersonalAvailabilityStatus[] = ['available', 'blocked'];

export async function POST(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
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
      const result = await updatePersonalAvailabilitySlot({
        personalTrainerId: auth.uid,
        id,
        delete: true,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (!body.status || !VALID_STATUS.includes(body.status as PersonalAvailabilityStatus)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const slot = await updatePersonalAvailabilitySlot({
      personalTrainerId: auth.uid,
      id,
      status: body.status as PersonalAvailabilityStatus,
    });
    return NextResponse.json({ success: true, slot });
  } catch (error) {
    console.error('[metapersonal/agenda/availability/update]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar horário.' },
      { status: 400 }
    );
  }
}
