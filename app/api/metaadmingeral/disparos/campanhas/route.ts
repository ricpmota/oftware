import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  DISPAROS_MAX_INTERVAL_MINUTES,
  DISPAROS_MESSAGE_MAX_LENGTH,
  DISPAROS_MIN_INTERVAL_MINUTES,
} from '@/lib/disparos/constants';
import type { AudienceChoice, PhoneChoice } from '@/lib/disparos/types';
import { createDisparoCampaignRecord, listDisparoCampaigns } from '@/lib/server/disparosStore.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const campaigns = await listDisparoCampaigns();
  return NextResponse.json({ ok: true, campaigns });
}

export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: 'Dados inválidos.' }, { status: 400 });
  const interval = Number(body.intervalMinutes);
  const message = String(body.messageTemplate || '').trim();
  const nome = String(body.nome || '').trim();
  if (!nome) return NextResponse.json({ ok: false, error: 'Informe o nome da campanha.' }, { status: 400 });
  if (!message || message.length > DISPAROS_MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ ok: false, error: 'A mensagem passa do limite aceito pelo envio.' }, { status: 400 });
  }
  if (!Number.isInteger(interval) || interval < DISPAROS_MIN_INTERVAL_MINUTES || interval > DISPAROS_MAX_INTERVAL_MINUTES) {
    return NextResponse.json({ ok: false, error: 'Intervalo inválido.' }, { status: 400 });
  }
  try {
    const campaign = await createDisparoCampaignRecord({
      nome,
      importacaoId: String(body.importacaoId || ''),
      messageTemplate: message,
      phoneChoice: body.phoneChoice as PhoneChoice,
      audience: body.audience as AudienceChoice,
      intervalMinutes: interval,
      selectedIds: Array.isArray(body.selectedIds) ? body.selectedIds.map(String) : [],
      createdBy: auth.email,
      senderPhone: typeof body.senderPhone === 'string' ? body.senderPhone : null,
      senderProfileName: typeof body.senderProfileName === 'string' ? body.senderProfileName : null,
    });
    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Não foi possível criar a campanha.';
    return NextResponse.json({ ok: false, error: messageText }, { status: 400 });
  }
}
