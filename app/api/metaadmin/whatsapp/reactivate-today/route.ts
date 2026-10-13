import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  countTodayUnsentWhatsappItemsForDoctor,
  reactivateTodayUnsentWhatsappForDoctor,
} from '@/services/whatsappTodayResendService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmin/whatsapp/reactivate-today — conta pendências de hoje.
 * POST /api/metaadmin/whatsapp/reactivate-today — reativa itens de hoje não enviados por queda.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const counts = await countTodayUnsentWhatsappItemsForDoctor(auth.medicoDocId);
    return NextResponse.json({ ok: true, ...counts });
  } catch (error) {
    console.error('[metaadmin/whatsapp/reactivate-today GET]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao consultar pendências.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const result = await reactivateTodayUnsentWhatsappForDoctor(auth.medicoDocId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metaadmin/whatsapp/reactivate-today POST]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao reativar envios de hoje.' },
      { status: 500 },
    );
  }
}
