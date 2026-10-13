import { NextRequest, NextResponse } from 'next/server';
import { requireAgendaMedico } from '@/lib/metaadmin/agenda/requireAgendaMedico';
import {
  createMedicoCalendarException,
  deleteMedicoCalendarException,
  listMedicoCalendarExceptions,
} from '@/lib/metaadmin/agenda/calendarExceptionsService';

export async function GET(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const exceptions = await listMedicoCalendarExceptions(auth.medicoDocId, fromDate);
    return NextResponse.json({ exceptions });
  } catch (error) {
    console.error('[metaadmin/agenda/exceptions GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar exceções.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      date?: string;
      type?: 'blocked' | 'extra';
      reason?: string;
      startTime?: string;
      endTime?: string;
    };
    const exception = await createMedicoCalendarException(auth.medicoDocId, {
      date: body.date || '',
      type: body.type || 'blocked',
      reason: body.reason,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    return NextResponse.json({ success: true, exception });
  } catch (error) {
    console.error('[metaadmin/agenda/exceptions POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar exceção.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    await deleteMedicoCalendarException(auth.medicoDocId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[metaadmin/agenda/exceptions DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao remover exceção.' },
      { status: 400 }
    );
  }
}
