import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import { cancelNutriConsultaMeeting, markNutriConsultaRealizada, updateNutriConsultaMeeting } from '@/lib/nutri/agenda/meetingService';

export async function POST(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
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
      const result = await cancelNutriConsultaMeeting({
        nutricionistaId: auth.uid,
        availabilityId: id,
      });
      return NextResponse.json({ success: true, ...result });
    }
    if (typeof body.realizada === 'boolean' && !body.date) {
      const meeting = await markNutriConsultaRealizada({
        nutricionistaId: auth.uid,
        availabilityId: id,
        realizada: body.realizada,
      });
      return NextResponse.json({ success: true, meeting });
    }
    const meeting = await updateNutriConsultaMeeting({
      nutricionistaId: auth.uid,
      availabilityId: id,
      date: typeof body.date === 'string' ? body.date : '',
      startTime: typeof body.startTime === 'string' ? body.startTime : '',
      endTime: typeof body.endTime === 'string' ? body.endTime : '',
      observacoes: typeof body.observacoes === 'string' ? body.observacoes : '',
    });

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('[metanutri/agenda/meetings/update]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar consulta.' },
      { status: 400 }
    );
  }
}
