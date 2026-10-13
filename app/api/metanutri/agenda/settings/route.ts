import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import {
  getNutriAgendaSettings,
  updateNutriAgendaSettings,
} from '@/lib/nutri/agenda/agendaSettingsService';
import type { NutriAgendaSettings } from '@/types/nutriAgenda';

export async function GET(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await getNutriAgendaSettings(auth.uid);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[metanutri/agenda/settings GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar configurações.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<NutriAgendaSettings>;
    const settings = await updateNutriAgendaSettings(auth.uid, body);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[metanutri/agenda/settings PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar configurações.' },
      { status: 400 }
    );
  }
}
