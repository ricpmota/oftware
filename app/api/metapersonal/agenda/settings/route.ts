import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import {
  getPersonalAgendaSettings,
  updatePersonalAgendaSettings,
} from '@/lib/personal/agenda/agendaSettingsService';
import type { PersonalAgendaSettings } from '@/types/personalAgenda';

export async function GET(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await getPersonalAgendaSettings(auth.uid);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[metapersonal/agenda/settings GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar configurações.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<PersonalAgendaSettings>;
    const settings = await updatePersonalAgendaSettings(auth.uid, body);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[metapersonal/agenda/settings PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar configurações.' },
      { status: 400 }
    );
  }
}
