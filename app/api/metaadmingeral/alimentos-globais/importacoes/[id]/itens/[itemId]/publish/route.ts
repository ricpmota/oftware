import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { isPublicationAction } from '@/lib/metaadmingeral/alimentosGlobais/importacao/constants';
import { isStatusAlimentoGlobal } from '@/lib/metaadmingeral/alimentosGlobais';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';
import { GlobalFoodsPublicationService } from '@/services/globalFoodsPublicationService.server';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/**
 * POST — publicar um item (CREATE ou SKIP).
 * Body: { action?: 'CREATE'|'SKIP', forceReviewAlerts?: boolean, status?: StatusAlimentoGlobal }
 * MERGE usa o endpoint /merge.
 */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, itemId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      forceReviewAlerts?: boolean;
      status?: string;
      mergeTargetFoodId?: string;
    };

    const action = isPublicationAction(body.action) ? body.action : 'CREATE';
    const actor = { uid: auth.uid, email: auth.email };

    if (action === 'SKIP') {
      const result = await GlobalFoodsPublicationService.publishSkip(id, itemId, actor);
      const item = (await GlobalFoodsImportService.listarItens(id)).find((i) => i.id === itemId);
      return NextResponse.json({
        result,
        item: item ? GlobalFoodsImportService.toJsonItem(item) : null,
      });
    }

    if (action === 'MERGE') {
      return NextResponse.json(
        { error: 'Use POST .../itens/[itemId]/merge para MERGE.' },
        { status: 400 }
      );
    }

    if (body.mergeTargetFoodId) {
      await GlobalFoodsPublicationService.setItemAction(id, itemId, 'CREATE');
    } else {
      await GlobalFoodsPublicationService.setItemAction(id, itemId, 'CREATE');
    }

    const result = await GlobalFoodsPublicationService.publishCreate(id, itemId, actor, {
      forceReviewAlerts: Boolean(body.forceReviewAlerts),
      status: isStatusAlimentoGlobal(body.status) ? body.status : undefined,
    });

    const item = (await GlobalFoodsImportService.listarItens(id)).find((i) => i.id === itemId);
    return NextResponse.json({
      result,
      item: item ? GlobalFoodsImportService.toJsonItem(item) : null,
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes item publish]', error);
    const message = error instanceof Error ? error.message : 'Falha ao publicar item.';
    const status = message.includes('não encontrado') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
