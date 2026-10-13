import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import { createPersonalAvailabilitySlotsForDates } from '@/lib/personal/agenda/availabilityService';
import {
  generateSlotsInRange,
  getBrazilDateKey,
  listDateKeysInRange,
  MAX_AVAILABILITY_RANGE_DAYS,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import { isValidAvailabilityDate } from '@/lib/whiteLabel/availabilityFirestore';

function parseWeekdays(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const days = value
    .map((item) => Number(item))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return [...new Set(days)];
}

export async function POST(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      date?: string;
      fromDate?: string;
      toDate?: string;
      weekdays?: unknown;
      startTime?: string;
      endTime?: string;
      slots?: { startTime: string; endTime: string }[];
      periodStart?: string;
      periodEnd?: string;
      durationMinutes?: number;
    };

    const singleDate = typeof body.date === 'string' ? body.date.trim() : '';
    const fromDate = typeof body.fromDate === 'string' ? body.fromDate.trim() : '';
    const toDate = typeof body.toDate === 'string' ? body.toDate.trim() : '';
    const weekdays = parseWeekdays(body.weekdays);

    let dates: string[] = [];
    if (fromDate && toDate) {
      if (!isValidAvailabilityDate(fromDate) || !isValidAvailabilityDate(toDate)) {
        return NextResponse.json({ error: 'Intervalo de datas inválido.' }, { status: 400 });
      }
      const start = fromDate <= toDate ? fromDate : toDate;
      const end = fromDate <= toDate ? toDate : fromDate;
      const span =
        Math.round(
          (new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000
        ) + 1;
      if (span > MAX_AVAILABILITY_RANGE_DAYS) {
        return NextResponse.json(
          { error: `O intervalo pode ter no máximo ${MAX_AVAILABILITY_RANGE_DAYS} dias.` },
          { status: 400 }
        );
      }
      if (weekdays && weekdays.length === 0) {
        return NextResponse.json({ error: 'Selecione pelo menos um dia da semana.' }, { status: 400 });
      }
      dates = listDateKeysInRange(fromDate, toDate, {
        weekdays,
        minDate: getBrazilDateKey(),
      });
    } else if (singleDate) {
      dates = [singleDate];
    }

    if (dates.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma data válida no intervalo. Verifique o período e os dias da semana.' },
        { status: 400 }
      );
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

    const result = await createPersonalAvailabilitySlotsForDates(auth.uid, dates, slotInputs);
    if (result.created.length === 0 && result.skipped.length > 0) {
      const allDuplicates = result.skipped.every((s) => s.reason === 'already_exists');
      return NextResponse.json({
        success: false,
        error: allDuplicates
          ? dates.length > 1
            ? 'Todos os horários selecionados já estão cadastrados neste intervalo.'
            : 'Todos os horários selecionados já estão cadastrados para esta data.'
          : 'Nenhum horário foi criado.',
        ...result,
      });
    }

    const dayLabel = result.dates && result.dates > 1 ? ` em ${result.dates} dias` : '';
    return NextResponse.json({
      success: true,
      ...result,
      message:
        result.skipped.length > 0
          ? `${result.created.length} horário(s) criado(s)${dayLabel}. ${result.skipped.length} já existia(m).`
          : `${result.created.length} horário(s) criado(s)${dayLabel}.`,
    });
  } catch (error) {
    console.error('[metapersonal/agenda/availability/create]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar horário.' },
      { status: 400 }
    );
  }
}
