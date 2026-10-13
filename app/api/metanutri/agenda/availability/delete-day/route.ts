import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import { deleteNutriAvailabilitySlotsForDay } from '@/lib/nutri/agenda/availabilityService';

export async function POST(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as { date?: string; blockGenerated?: boolean };
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!date) {
      return NextResponse.json({ error: 'Data é obrigatória.' }, { status: 400 });
    }

    const result = await deleteNutriAvailabilitySlotsForDay(auth.uid, date, {
      blockGenerated: body.blockGenerated === true,
    });
    const parts = [`${result.deleted} horário(s) removido(s).`];
    if (result.keptReserved > 0) {
      parts.push(
        `${result.keptReserved} consulta(s) já agendada(s) foram mantida(s).`
      );
    }
    if (result.blockedRecurring) {
      parts.push('Os horários recorrentes deste dia também foram desativados.');
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: parts.join(' '),
    });
  } catch (error) {
    console.error('[metanutri/agenda/availability/delete-day]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao apagar horários do dia.' },
      { status: 400 }
    );
  }
}
