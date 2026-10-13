import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import {
  MAX_NUTRI_BULK_DATES,
  MAX_NUTRI_BULK_SLOTS,
  deleteNutriAvailabilitySlotsForDates,
  replaceNutriAvailabilityForDates,
} from '@/lib/nutri/agenda/availabilityService';
import { generateSlotsInRange } from '@/lib/whiteLabel/availabilitySlotUtils';
import { isValidAvailabilityDate } from '@/lib/whiteLabel/availabilityFirestore';

function parseDates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter((d) => isValidAvailabilityDate(d)))];
}

export async function POST(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      dates?: unknown;
      periodStart?: string;
      periodEnd?: string;
      durationMinutes?: number;
    };

    const dates = parseDates(body.dates);
    if (dates.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos uma data.' }, { status: 400 });
    }
    if (dates.length > MAX_NUTRI_BULK_DATES) {
      return NextResponse.json(
        { error: `Selecione no máximo ${MAX_NUTRI_BULK_DATES} datas.` },
        { status: 400 }
      );
    }

    const action = body.action === 'replace' ? 'replace' : body.action === 'delete' ? 'delete' : null;
    if (!action) {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    if (action === 'delete') {
      const result = await deleteNutriAvailabilitySlotsForDates(auth.uid, dates, {
        blockGenerated: true,
        exceptionReason: 'Dia removido em massa no resumo',
      });
      const parts = [
        `${result.datesProcessed} data(s) processada(s).`,
        `${result.deleted} horário(s) removido(s).`,
      ];
      if (result.keptReserved > 0) {
        parts.push(`${result.keptReserved} consulta(s) já agendada(s) foram mantida(s).`);
      }
      return NextResponse.json({ success: true, ...result, message: parts.join(' ') });
    }

    const periodStart = typeof body.periodStart === 'string' ? body.periodStart.trim() : '';
    const periodEnd = typeof body.periodEnd === 'string' ? body.periodEnd.trim() : '';
    const durationMinutes = Number(body.durationMinutes);
    const slots = generateSlotsInRange(periodStart, periodEnd, durationMinutes);
    if (slots.length === 0) {
      return NextResponse.json(
        { error: 'Informe um período e uma duração válidos para os novos horários.' },
        { status: 400 }
      );
    }
    if (dates.length * slots.length > MAX_NUTRI_BULK_SLOTS) {
      return NextResponse.json(
        {
          error: `Essa edição geraria ${dates.length * slots.length} horários. O máximo é ${MAX_NUTRI_BULK_SLOTS}.`,
        },
        { status: 400 }
      );
    }

    const result = await replaceNutriAvailabilityForDates(auth.uid, dates, slots);
    const parts = [
      `${result.datesProcessed} data(s) atualizada(s).`,
      `${result.created} horário(s) criado(s).`,
    ];
    if (result.deleted > 0) parts.push(`${result.deleted} horário(s) anterior(es) removido(s).`);
    if (result.keptReserved > 0) {
      parts.push(`${result.keptReserved} consulta(s) já agendada(s) foram mantida(s).`);
    }
    return NextResponse.json({ success: true, ...result, message: parts.join(' ') });
  } catch (error) {
    console.error('[metanutri/agenda/availability/bulk]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao editar horários em massa.' },
      { status: 400 }
    );
  }
}
