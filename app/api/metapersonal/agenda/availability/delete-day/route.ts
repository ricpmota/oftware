import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import { deletePersonalAvailabilitySlotsForDay } from '@/lib/personal/agenda/availabilityService';

export async function POST(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as { date?: string; blockGenerated?: boolean };
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!date) {
      return NextResponse.json({ error: 'Data é obrigatória.' }, { status: 400 });
    }

    const result = await deletePersonalAvailabilitySlotsForDay(auth.uid, date, {
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
    console.error('[metapersonal/agenda/availability/delete-day]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao apagar horários do dia.' },
      { status: 400 }
    );
  }
}
