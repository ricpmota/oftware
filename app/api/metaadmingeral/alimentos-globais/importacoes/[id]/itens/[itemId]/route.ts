import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { isSegmentoAlimento } from '@/lib/metaadmingeral/alimentosGlobais';
import {
  isPublicationAction,
  isReviewStatusItem,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/constants';
import { computePublicationReadiness } from '@/lib/metaadmingeral/alimentosGlobais/importacao/publicationReadiness';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';
import { GlobalFoodsPublicationService } from '@/services/globalFoodsPublicationService.server';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/** PATCH — editar draft / ação de publicação (CREATE|MERGE|SKIP). NÃO publica sozinho. */
export async function PATCH(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, itemId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    if (isPublicationAction(body.publicationAction)) {
      const updated = await GlobalFoodsPublicationService.setItemAction(
        id,
        itemId,
        body.publicationAction,
        {
          mergeTargetFoodId:
            typeof body.mergeTargetFoodId === 'string' ? body.mergeTargetFoodId : null,
        }
      );
      return NextResponse.json({
        item: GlobalFoodsImportService.toJsonItem(updated),
      });
    }

    const patch: Record<string, unknown> = {};

    if (typeof body.nome === 'string') patch.nome = body.nome.trim();
    if (body.segmento === null) patch.segmento = null;
    else if (isSegmentoAlimento(body.segmento)) patch.segmento = body.segmento;
    if (typeof body.ignored === 'boolean') patch.ignored = body.ignored;
    if (isReviewStatusItem(body.reviewStatus)) patch.reviewStatus = body.reviewStatus;
    if (body.codigoOriginal !== undefined) {
      patch.codigoOriginal =
        body.codigoOriginal == null ? null : String(body.codigoOriginal).trim() || null;
    }

    let updated = await GlobalFoodsImportService.atualizarItem(id, itemId, patch);
    const readiness = computePublicationReadiness(updated);
    if (updated.publicationReadiness !== readiness) {
      updated = await GlobalFoodsImportService.atualizarItem(id, itemId, {
        publicationReadiness: readiness,
      });
    }
    return NextResponse.json({
      item: GlobalFoodsImportService.toJsonItem(updated),
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes itens PATCH]', error);
    const message = error instanceof Error ? error.message : 'Falha ao atualizar item.';
    const status = message.includes('não encontrado') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
