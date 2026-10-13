import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';

export const runtime = 'nodejs';
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/metaadmingeral/alimentos-globais/importacoes/[id]/map
 * Fase 1 — classifica páginas (sem Gemini). Body: { pageBatchSize?, restart? }
 */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      pageBatchSize?: number;
      restart?: boolean;
    };

    const result = await GlobalFoodsImportService.mapearPaginas(id, {
      pageBatchSize: body.pageBatchSize,
      restart: Boolean(body.restart),
    });

    return NextResponse.json({
      importacao: GlobalFoodsImportService.toJsonImport(result.importacao),
      done: result.done,
      pagesMapped: result.pagesMapped,
      totalPages: result.totalPages,
      summary: result.summary,
      message: result.message,
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes/[id]/map]', error);
    const message = error instanceof Error ? error.message : 'Falha ao mapear.';
    const status = /não está em cache|Reenvie o arquivo/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
