import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import {
  createNutriCalendarException,
  deleteNutriCalendarException,
  listNutriCalendarExceptions,
} from '@/lib/nutri/agenda/calendarExceptionsService';

export async function GET(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const fromDate = request.nextUrl.searchParams.get('fromDate') || undefined;
    const exceptions = await listNutriCalendarExceptions(auth.uid, fromDate);
    return NextResponse.json({ exceptions });
  } catch (error) {
    console.error('[metanutri/agenda/exceptions GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar exceções.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      date?: string;
      type?: 'blocked' | 'extra';
      reason?: string;
      startTime?: string;
      endTime?: string;
    };
    const exception = await createNutriCalendarException(auth.uid, {
      date: body.date || '',
      type: body.type || 'blocked',
      reason: body.reason,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    return NextResponse.json({ success: true, exception });
  } catch (error) {
    console.error('[metanutri/agenda/exceptions POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar exceção.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    await deleteNutriCalendarException(auth.uid, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[metanutri/agenda/exceptions DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao remover exceção.' },
      { status: 400 }
    );
  }
}
