/**
 * POST /api/oftpay/questoes/by-ids
 * Carrega questões completas por ID (para rodar o simulado).
 * Body: { ids: string[] } — máx. 200 por request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadQuestoesByIdsAdmin } from '@/lib/oftpay/publishedQuestoesCatalog.server';
import { verifyOftpayQuestoesStudent } from '@/lib/oftpay/verifyOftpayQuestoesStudent';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IDS = 200;

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyOftpayQuestoesStudent(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
    const idsRaw = Array.isArray(body.ids) ? body.ids : [];
    const ids = idsRaw
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Envie ids: string[].' }, { status: 400 });
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_IDS} IDs por request.` },
        { status: 400 }
      );
    }

    const items = await loadQuestoesByIdsAdmin(ids);
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[questoes/by-ids] error:', msg, err);
    return NextResponse.json({ error: 'Erro ao carregar questões.' }, { status: 500 });
  }
}
