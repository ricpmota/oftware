/**
 * GET /api/oftpay/questoes/catalog
 * Catálogo leve de questões publicadas (sem enunciado/explicação).
 * Usado pelo aluno para montar simulados e ver cobertura.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadPublishedQuestoesCatalogAdmin } from '@/lib/oftpay/publishedQuestoesCatalog.server';
import { verifyOftpayQuestoesStudent } from '@/lib/oftpay/verifyOftpayQuestoesStudent';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyOftpayQuestoesStudent(request);
    if (authResult instanceof NextResponse) return authResult;

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';
    const items = await loadPublishedQuestoesCatalogAdmin({ forceRefresh });

    return NextResponse.json(
      {
        ok: true,
        count: items.length,
        items,
      },
      {
        headers: {
          // Browser pode reusar por pouco tempo; servidor já tem TTL próprio
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[questoes/catalog] error:', msg, err);
    return NextResponse.json({ error: 'Erro ao carregar catálogo de questões.' }, { status: 500 });
  }
}
