import { NextRequest, NextResponse } from 'next/server';
import { requirePublicMedicoBooking } from '@/lib/metaadmin/agenda/publicBookingGate';
import { listMedicoAvailableSlots } from '@/lib/metaadmin/agenda/availabilityService';
import { findUpcomingMedicoConsultaForPaciente } from '@/lib/metaadmin/agenda/meetingService';

export async function GET(request: NextRequest) {
  const medicoId = request.nextUrl.searchParams.get('medicoId') || '';
  const pacienteId = request.nextUrl.searchParams.get('pacienteId') || '';

  const ctx = await requirePublicMedicoBooking(request, { pacienteId, medicoId });
  if (ctx instanceof NextResponse) return ctx;

  try {
    if (!ctx.publicBookingEnabled) {
      return NextResponse.json({
        enabled: false,
        medicoNome: ctx.medicoNome,
        medicoEmail: ctx.medicoEmail,
        pacienteNome: ctx.pacienteNome,
        pacienteEmail: ctx.pacienteEmail,
        pacientePhone: ctx.pacientePhone,
        slots: [],
      });
    }

    const [slots, meeting] = await Promise.all([
      listMedicoAvailableSlots(ctx.medicoId),
      findUpcomingMedicoConsultaForPaciente(ctx.medicoId, ctx.pacienteId),
    ]);

    return NextResponse.json({
      enabled: true,
      medicoNome: ctx.medicoNome,
      medicoEmail: ctx.medicoEmail,
      pacienteNome: ctx.pacienteNome,
      pacienteEmail: ctx.pacienteEmail,
      pacientePhone: ctx.pacientePhone,
      slots,
      meeting,
    });
  } catch (error) {
    console.error('[meta/agenda/availability]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar horários.' },
      { status: 500 }
    );
  }
}
