import { NextRequest, NextResponse } from 'next/server';
import { requireAgendaMedico } from '@/lib/metaadmin/agenda/requireAgendaMedico';
import {
  getMedicoAgendaSettings,
  updateMedicoAgendaSettings,
} from '@/lib/metaadmin/agenda/agendaSettingsService';
import type { MedicoAgendaSettings } from '@/types/medicoAgenda';

export async function GET(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await getMedicoAgendaSettings(auth.medicoDocId);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[metaadmin/agenda/settings GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar configurações.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<MedicoAgendaSettings>;
    const settings = await updateMedicoAgendaSettings(auth.medicoDocId, body);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[metaadmin/agenda/settings PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar configurações.' },
      { status: 400 }
    );
  }
}
