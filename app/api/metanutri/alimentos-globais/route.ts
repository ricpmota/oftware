import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import { isSegmentoAlimento } from '@/lib/metaadmingeral/alimentosGlobais/segmentos';
import { toMetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/toMetaNutriFoodSearchResult';
import { GlobalFoodsService } from '@/services/globalFoodsService.server';

export const runtime = 'nodejs';

/**
 * GET /api/metanutri/alimentos-globais?q=banana&segmento=FRUTAS_E_DERIVADOS&limit=30
 * GET /api/metanutri/alimentos-globais?segmento=...&limit=30  (browse published)
 * Read-only. Somente status=published. Auth: nutricionista.
 */
export async function GET(request: NextRequest) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    const segmentoRaw = request.nextUrl.searchParams.get('segmento');
    const segmento =
      segmentoRaw && isSegmentoAlimento(segmentoRaw) ? segmentoRaw : null;
    const cursor = (request.nextUrl.searchParams.get('cursor') || '').trim() || null;
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 30);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 30;

    let foods;
    if (q.length >= 2) {
      foods = await GlobalFoodsService.buscarPublicados({
        q,
        limit,
        segmento,
        startAfterNomeNormalizado: cursor,
      });
    } else if (q.length === 1) {
      return NextResponse.json({ alimentos: [], q, limit: 0, nextCursor: null });
    } else {
      // Busca vazia: listagem paginada (não carrega collection inteira)
      foods = await GlobalFoodsService.listarPublicados({
        limit,
        segmento,
        startAfterNomeNormalizado: cursor,
      });
    }

    const alimentos = foods.map(toMetaNutriFoodSearchResult);
    const last = foods[foods.length - 1];
    const nextCursor =
      foods.length >= Math.min(50, Math.max(1, limit)) && last
        ? last.nomeNormalizado
        : null;

    return NextResponse.json({
      alimentos,
      q,
      segmento,
      limit: alimentos.length,
      nextCursor,
    });
  } catch (error) {
    console.error('[metanutri/alimentos-globais GET]', error);
    const message = error instanceof Error ? error.message : 'Falha na busca.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
