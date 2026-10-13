import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';

export const runtime = 'nodejs';
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/** POST { loteId } — reprocessa lote falho/idempotente. */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { loteId?: string };
    const loteId = String(body.loteId || '').trim();
    if (!loteId) {
      return NextResponse.json({ error: 'loteId é obrigatório.' }, { status: 400 });
    }
    const result = await GlobalFoodsImportService.retryLote(id, loteId);
    const itens = await GlobalFoodsImportService.listarItens(id);
    return NextResponse.json({
      importacao: GlobalFoodsImportService.toJsonImport(result.importacao),
      done: result.done,
      message: result.message,
      itens: itens.map((x) => GlobalFoodsImportService.toJsonItem(x)),
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes/[id]/retry-lote]', error);
    const message = error instanceof Error ? error.message : 'Falha no retry.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
