import { NextRequest, NextResponse } from 'next/server';
import { requirePublicMedicoBooking } from '@/lib/metaadmin/agenda/publicBookingGate';
import { MedicoSlotUnavailableError } from '@/lib/metaadmin/agenda/availabilityService';
import { reserveMedicoConsultaSlot } from '@/lib/metaadmin/agenda/meetingService';
import {
  scheduleMedicoConsultaReminder,
  notifyPacienteConsultaMedicoAgendada,
} from '@/lib/metaadmin/agenda/consultaReminderService';
import { syncMedicoLeadOnConsultaAgendada } from '@/lib/metaadmin/agenda/syncMedicoLeadOnConsultaAgendada';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      pacienteId?: string;
      medicoId?: string;
      availabilityId?: string;
    } | null;

    const ctx = await requirePublicMedicoBooking(request, {
      pacienteId: body?.pacienteId || '',
      medicoId: body?.medicoId || '',
    });
    if (ctx instanceof NextResponse) return ctx;

    if (!ctx.publicBookingEnabled) {
      return NextResponse.json(
        { error: 'O agendamento online deste médico está desligado.', code: 'BOOKING_DISABLED' },
        { status: 403 }
      );
    }

    const availabilityId = typeof body?.availabilityId === 'string' ? body.availabilityId.trim() : '';
    if (!availabilityId) {
      return NextResponse.json({ error: 'Selecione um horário.' }, { status: 400 });
    }

    const meeting = await reserveMedicoConsultaSlot({
      medicoId: ctx.medicoId,
      pacienteId: ctx.pacienteId,
      pacienteNome: ctx.pacienteNome,
      pacienteEmail: ctx.pacienteEmail,
      pacientePhone: ctx.pacientePhone,
      availabilityId,
    });

    try {
      await scheduleMedicoConsultaReminder({
        medicoId: ctx.medicoId,
        pacienteId: ctx.pacienteId,
        pacienteNome: ctx.pacienteNome,
        availabilityId: meeting.availabilityId,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      });
    } catch (reminderError) {
      console.error('[meta/agenda/agendar] alerta Canal Chat', reminderError);
    }

    try {
      await notifyPacienteConsultaMedicoAgendada({
        medicoId: ctx.medicoId,
        pacienteId: ctx.pacienteId,
        pacienteNome: ctx.pacienteNome,
        pacientePhone: ctx.pacientePhone,
        availabilityId: meeting.availabilityId,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        sendConfirmacao: ctx.alreadyLinked,
      });
    } catch (pacienteNotifyError) {
      console.error('[meta/agenda/agendar] WhatsApp paciente', pacienteNotifyError);
    }

    try {
      await syncMedicoLeadOnConsultaAgendada({
        medicoId: ctx.medicoId,
        pacienteId: ctx.pacienteId,
        pacienteNome: ctx.pacienteNome,
        pacienteEmail: ctx.pacienteEmail,
        pacientePhone: ctx.pacientePhone,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        availabilityId: meeting.availabilityId,
      });
    } catch (leadError) {
      console.error('[meta/agenda/agendar] lead CRM', leadError);
    }

    return NextResponse.json({
      success: true,
      meeting,
      medicoNome: ctx.medicoNome,
      medicoEmail: ctx.medicoEmail,
      pacienteNome: ctx.pacienteNome,
      pacienteEmail: ctx.pacienteEmail,
    });
  } catch (error) {
    if (error instanceof MedicoSlotUnavailableError) {
      return NextResponse.json({ error: error.message, code: 'SLOT_UNAVAILABLE' }, { status: 409 });
    }
    console.error('[meta/agenda/agendar]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao agendar.' },
      { status: 400 }
    );
  }
}
