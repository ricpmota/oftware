import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';
import { GlobalFoodsPublicationService } from '@/services/globalFoodsPublicationService.server';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST — publicar em lote itens seguros (CREATE + READY + sem duplicidade).
 * Body: { itemIds: string[], forceReviewAlerts?: boolean }
 */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      itemIds?: string[];
      forceReviewAlerts?: boolean;
    };
    const itemIds = Array.isArray(body.itemIds) ? body.itemIds.filter((x) => typeof x === 'string') : [];
    if (!itemIds.length) {
      return NextResponse.json({ error: 'Informe itemIds.' }, { status: 400 });
    }

    const { results, summary } = await GlobalFoodsPublicationService.publishBatchCreate(
      id,
      itemIds,
      { uid: auth.uid, email: auth.email },
      { forceReviewAlerts: Boolean(body.forceReviewAlerts) }
    );

    const importacao = await GlobalFoodsImportService.obterImportacao(id);
    const itens = await GlobalFoodsImportService.listarItens(id);

    return NextResponse.json({
      results,
      summary,
      importacao: importacao ? GlobalFoodsImportService.toJsonImport(importacao) : null,
      itens: itens.map((i) => GlobalFoodsImportService.toJsonItem(i)),
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes publish]', error);
    const message = error instanceof Error ? error.message : 'Falha na publicação em lote.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
