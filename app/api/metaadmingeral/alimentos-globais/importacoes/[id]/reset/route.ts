import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';

export const runtime = 'nodejs';
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/metaadmingeral/alimentos-globais/importacoes/[id]/reset
 * Zera ponteiro/lotes/itens para reprocessar do início (ex.: done com 0 alimentos).
 */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const importacao = await GlobalFoodsImportService.resetarParaReprocessamento(id);
    const lotes = await GlobalFoodsImportService.listarLotes(id);
    return NextResponse.json({
      importacao: GlobalFoodsImportService.toJsonImport(importacao),
      lotes,
      message:
        'Importação resetada. Clique em Mapear páginas para classificar o documento de novo.',
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes/[id]/reset]', error);
    const message = error instanceof Error ? error.message : 'Falha ao resetar.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
