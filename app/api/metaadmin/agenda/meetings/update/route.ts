import { NextRequest, NextResponse } from 'next/server';
import { requireAgendaMedico } from '@/lib/metaadmin/agenda/requireAgendaMedico';
import {
  cancelMedicoConsultaMeeting,
  markMedicoConsultaRealizada,
  updateMedicoConsultaMeeting,
} from '@/lib/metaadmin/agenda/meetingService';

export async function POST(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      observacoes?: string;
      delete?: boolean;
      realizada?: boolean;
    };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'Consulta inválida.' }, { status: 400 });

    if (body.delete) {
      const result = await cancelMedicoConsultaMeeting({
        medicoId: auth.medicoDocId,
        availabilityId: id,
      });
      return NextResponse.json({ success: true, ...result });
    }
    if (typeof body.realizada === 'boolean' && !body.date) {
      const meeting = await markMedicoConsultaRealizada({
        medicoId: auth.medicoDocId,
        availabilityId: id,
        realizada: body.realizada,
      });
      return NextResponse.json({ success: true, meeting });
    }
    const meeting = await updateMedicoConsultaMeeting({
      medicoId: auth.medicoDocId,
      availabilityId: id,
      date: typeof body.date === 'string' ? body.date : '',
      startTime: typeof body.startTime === 'string' ? body.startTime : '',
      endTime: typeof body.endTime === 'string' ? body.endTime : '',
      observacoes: typeof body.observacoes === 'string' ? body.observacoes : '',
    });

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('[metaadmin/agenda/meetings/update]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar consulta.' },
      { status: 400 }
    );
  }
}
