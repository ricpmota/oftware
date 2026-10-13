import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';

export const runtime = 'nodejs';
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/metaadmingeral/alimentos-globais/importacoes/[id]/process
 * Body opcional: { maxLotes?: number } — processa até N lotes nesta chamada (default 1).
 */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { maxLotes?: number };
    const maxLotes = Math.min(3, Math.max(1, Number(body.maxLotes) || 1));

    const messages: string[] = [];
    let done = false;
    let importacao = await GlobalFoodsImportService.obterImportacao(id);
    if (!importacao) {
      return NextResponse.json({ error: 'Importação não encontrada.' }, { status: 404 });
    }

    for (let i = 0; i < maxLotes; i++) {
      const result = await GlobalFoodsImportService.processarProximoLote(id);
      importacao = result.importacao;
      messages.push(result.message);
      done = result.done;
      if (done) break;
    }

    const itens = await GlobalFoodsImportService.listarItens(id);
    return NextResponse.json({
      importacao: GlobalFoodsImportService.toJsonImport(importacao),
      done,
      messages,
      itens: itens.map((x) => GlobalFoodsImportService.toJsonItem(x)),
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes/[id]/process]', error);
    const message = error instanceof Error ? error.message : 'Falha ao processar.';
    const status = /Mapeie o documento/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
