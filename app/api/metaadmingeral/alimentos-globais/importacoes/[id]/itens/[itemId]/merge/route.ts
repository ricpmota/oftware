import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  isMergeResolution,
  type MergeResolution,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/constants';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';
import { GlobalFoodsPublicationService } from '@/services/globalFoodsPublicationService.server';
import { GlobalFoodsService } from '@/services/globalFoodsService.server';
import { alimentoGlobalToJson } from '@/lib/metaadmingeral/alimentosGlobais';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/**
 * GET — preview de merge (comparação campo a campo).
 * Query: ?targetFoodId=
 *
 * POST — executar merge com resoluções humanas.
 * Body: { targetFoodId, resolutions: Record<field, MergeResolution> }
 */
export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, itemId } = await context.params;
    const targetFoodId = request.nextUrl.searchParams.get('targetFoodId');
    if (!targetFoodId) {
      return NextResponse.json({ error: 'Informe targetFoodId.' }, { status: 400 });
    }

    const itens = await GlobalFoodsImportService.listarItens(id);
    const item = itens.find((i) => i.id === itemId);
    if (!item) return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });

    const existing = await GlobalFoodsService.obterPorId(targetFoodId);
    if (!existing) {
      return NextResponse.json({ error: 'Alimento destino não encontrado.' }, { status: 404 });
    }

    const preview = GlobalFoodsPublicationService.prepareMergePreview(existing, item);
    return NextResponse.json({
      existing: alimentoGlobalToJson(existing),
      item: GlobalFoodsImportService.toJsonItem(item),
      ...preview,
    });
  } catch (error) {
    console.error('[alimentos-globais merge GET]', error);
    const message = error instanceof Error ? error.message : 'Falha no preview de merge.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, itemId } = await context.params;
    const body = (await request.json()) as {
      targetFoodId?: string;
      resolutions?: Record<string, string>;
    };

    if (!body.targetFoodId || typeof body.targetFoodId !== 'string') {
      return NextResponse.json({ error: 'Informe targetFoodId.' }, { status: 400 });
    }

    const resolutions: Record<string, MergeResolution> = {};
    for (const [k, v] of Object.entries(body.resolutions || {})) {
      if (isMergeResolution(v)) resolutions[k] = v;
    }

    await GlobalFoodsPublicationService.setItemAction(id, itemId, 'MERGE', {
      mergeTargetFoodId: body.targetFoodId,
    });

    const result = await GlobalFoodsPublicationService.publishMerge(id, itemId, {
      uid: auth.uid,
      email: auth.email,
    }, {
      targetFoodId: body.targetFoodId,
      resolutions,
    });

    const item = (await GlobalFoodsImportService.listarItens(id)).find((i) => i.id === itemId);
    const food = result.foodId ? await GlobalFoodsService.obterPorId(result.foodId) : null;

    return NextResponse.json({
      result,
      item: item ? GlobalFoodsImportService.toJsonItem(item) : null,
      food: food ? alimentoGlobalToJson(food) : null,
    });
  } catch (error) {
    console.error('[alimentos-globais merge POST]', error);
    const message = error instanceof Error ? error.message : 'Falha no merge.';
    const status = message.includes('não encontrado') ? 404 : 500;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
