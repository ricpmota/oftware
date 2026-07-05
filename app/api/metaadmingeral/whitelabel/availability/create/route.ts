import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { createAvailabilitySlotsBulk } from '@/lib/whiteLabel/availabilityService';
import { generateSlotsInRange } from '@/lib/whiteLabel/availabilitySlotUtils';

export async function POST(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      date?: string;
      startTime?: string;
      endTime?: string;
      slots?: { startTime: string; endTime: string }[];
      periodStart?: string;
      periodEnd?: string;
      durationMinutes?: number;
    };

    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!date) {
      return NextResponse.json({ error: 'Data é obrigatória.' }, { status: 400 });
    }

    let slotInputs: { startTime: string; endTime: string }[] = [];

    if (Array.isArray(body.slots) && body.slots.length > 0) {
      slotInputs = body.slots.map((slot) => ({
        startTime: slot.startTime.trim(),
        endTime: slot.endTime.trim(),
      }));
    } else if (body.periodStart && body.periodEnd && body.durationMinutes) {
      slotInputs = generateSlotsInRange(
        body.periodStart.trim(),
        body.periodEnd.trim(),
        Number(body.durationMinutes)
      );
      if (slotInputs.length === 0) {
        return NextResponse.json(
          { error: 'Período ou duração inválidos. Nenhum horário foi gerado.' },
          { status: 400 }
        );
      }
    } else {
      slotInputs = [
        {
          startTime: typeof body.startTime === 'string' ? body.startTime.trim() : '',
          endTime: typeof body.endTime === 'string' ? body.endTime.trim() : '',
        },
      ];
    }

    const result = await createAvailabilitySlotsBulk(date, slotInputs);

    if (result.created.length === 0 && result.skipped.length > 0) {
      const allDuplicates = result.skipped.every((s) => s.reason === 'already_exists');
      return NextResponse.json({
        success: false,
        error: allDuplicates
          ? 'Todos os horários selecionados já estão cadastrados para esta data.'
          : 'Nenhum horário foi criado.',
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      message:
        result.skipped.length > 0
          ? `${result.created.length} horário(s) criado(s). ${result.skipped.length} já existia(m).`
          : `${result.created.length} horário(s) criado(s) com sucesso.`,
    });
  } catch (error) {
    console.error('[API metaadmingeral/whitelabel/availability/create] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar horário.' },
      { status: 400 }
    );
  }
}
