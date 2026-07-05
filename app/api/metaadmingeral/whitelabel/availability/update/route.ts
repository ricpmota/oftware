import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { updateAvailabilitySlot } from '@/lib/whiteLabel/availabilityService';
import type { WhiteLabelAvailabilityStatus } from '@/types/whiteLabelAvailability';

const VALID_STATUS: WhiteLabelAvailabilityStatus[] = ['available', 'blocked'];

export async function POST(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      delete?: boolean;
    };

    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }

    if (body.delete) {
      const result = await updateAvailabilitySlot({ id, delete: true });
      return NextResponse.json({ success: true, ...result });
    }

    if (!body.status || !VALID_STATUS.includes(body.status as WhiteLabelAvailabilityStatus)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const slot = await updateAvailabilitySlot({
      id,
      status: body.status as WhiteLabelAvailabilityStatus,
    });

    return NextResponse.json({ success: true, slot });
  } catch (error) {
    console.error('[API metaadmingeral/whitelabel/availability/update] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar horário.' },
      { status: 400 }
    );
  }
}
