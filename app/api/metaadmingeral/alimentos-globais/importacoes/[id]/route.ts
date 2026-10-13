import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';

export const runtime = 'nodejs';
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/metaadmingeral/alimentos-globais/importacoes/[id] */
export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const importacao = await GlobalFoodsImportService.obterImportacao(id);
    if (!importacao) {
      return NextResponse.json({ error: 'Importação não encontrada.' }, { status: 404 });
    }
    const [itens, lotes] = await Promise.all([
      GlobalFoodsImportService.listarItens(id),
      GlobalFoodsImportService.listarLotes(id),
    ]);
    return NextResponse.json({
      importacao: GlobalFoodsImportService.toJsonImport(importacao),
      itens: itens.map((i) => GlobalFoodsImportService.toJsonItem(i)),
      lotes,
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes/[id] GET]', error);
    return NextResponse.json({ error: 'Falha ao carregar importação.' }, { status: 500 });
  }
}

/**
 * POST /api/metaadmingeral/alimentos-globais/importacoes/[id]
 * Body: { action: 'reset' } — zera ponteiro/lotes/itens/mapa para reprocessar (Fase 1).
 */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = String(body.action || '').trim().toLowerCase();

    if (action === 'reset') {
      const importacao = await GlobalFoodsImportService.resetarParaReprocessamento(id);
      const lotes = await GlobalFoodsImportService.listarLotes(id);
      return NextResponse.json({
        importacao: GlobalFoodsImportService.toJsonImport(importacao),
        lotes,
        message:
          'Importação resetada. Clique em Mapear páginas para classificar o documento de novo.',
      });
    }

    return NextResponse.json(
      { error: 'Ação inválida. Use { "action": "reset" }.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[alimentos-globais/importacoes/[id] POST]', error);
    const message = error instanceof Error ? error.message : 'Falha na ação.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
