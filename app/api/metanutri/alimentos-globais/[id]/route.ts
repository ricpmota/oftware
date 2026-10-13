import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import { toMetaNutriFoodDetailResult } from '@/lib/metanutri/alimentosGlobais/toMetaNutriFoodDetailResult';
import { GlobalFoodsService } from '@/services/globalFoodsService.server';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/metanutri/alimentos-globais/[id]
 * Detalhe read-only. Somente published. Sem dados admin/import.
 */
export async function GET(_request: NextRequest, context: Ctx) {
  const auth = await requireNutricionistaMetaNutri(_request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });
    }

    const food = await GlobalFoodsService.obterPorId(id.trim());
    if (!food || food.status !== 'published') {
      return NextResponse.json({ error: 'Alimento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      alimento: toMetaNutriFoodDetailResult(food),
    });
  } catch (error) {
    console.error('[metanutri/alimentos-globais/[id] GET]', error);
    const message = error instanceof Error ? error.message : 'Falha ao carregar detalhe.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
