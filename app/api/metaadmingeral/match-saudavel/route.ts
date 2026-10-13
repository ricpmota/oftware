import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { loadMatchMonitorSnapshot } from '@/lib/server/matchAdminMonitor';
import { saveMatchBroadcastDraft, saveMatchConnectionTemplate } from '@/lib/server/matchCanalChatSettings';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const snapshot = await loadMatchMonitorSnapshot(getFirestoreAdmin());
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error('[metaadmingeral/match-saudavel GET]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Não foi possível abrir o Match Saudável.' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as {
    connectionTemplate?: unknown;
    broadcastDraft?: unknown;
  } | null;
  if (!body) return NextResponse.json({ ok: false, error: 'Pedido inválido.' }, { status: 400 });
  try {
    const db = getFirestoreAdmin();
    const saved: { connectionTemplate?: string; broadcastDraft?: string } = {};
    if (typeof body.connectionTemplate === 'string') {
      saved.connectionTemplate = await saveMatchConnectionTemplate(db, body.connectionTemplate, auth.email);
    }
    if (typeof body.broadcastDraft === 'string') {
      saved.broadcastDraft = await saveMatchBroadcastDraft(db, body.broadcastDraft, auth.email);
    }
    if (!saved.connectionTemplate && saved.broadcastDraft === undefined) {
      return NextResponse.json({ ok: false, error: 'Nada para guardar.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível guardar.';
    const status = message.includes('Escreva a mensagem') ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
