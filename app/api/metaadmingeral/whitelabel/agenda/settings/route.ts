import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getAgendaSettings, updateAgendaSettings } from '@/lib/whiteLabel/agendaSettingsService';

export async function GET(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const settings = await getAgendaSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[API agenda/settings GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar configurações.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const settings = await updateAgendaSettings(body);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[API agenda/settings PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar configurações.' },
      { status: 400 }
    );
  }
}
