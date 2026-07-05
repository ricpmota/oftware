import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  createCalendarException,
  deleteCalendarException,
  listCalendarExceptions,
} from '@/lib/whiteLabel/calendarExceptionsService';

export async function GET(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const exceptions = await listCalendarExceptions(fromDate);
    return NextResponse.json({ exceptions });
  } catch (error) {
    console.error('[API agenda/exceptions GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar exceções.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      date?: string;
      type?: 'blocked' | 'extra';
      reason?: string;
      startTime?: string;
      endTime?: string;
    };

    const exception = await createCalendarException({
      date: body.date || '',
      type: body.type || 'blocked',
      reason: body.reason,
      startTime: body.startTime,
      endTime: body.endTime,
    });

    return NextResponse.json({ success: true, exception });
  } catch (error) {
    console.error('[API agenda/exceptions POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar exceção.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }
    await deleteCalendarException(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API agenda/exceptions DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao remover exceção.' },
      { status: 400 }
    );
  }
}
