import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';

export const runtime = 'nodejs';
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/metaadmingeral/alimentos-globais/importacoes/[id]/inspect-page?page=7
 * Diagnóstico discreto: texto, classificação, schema, imagem.
 */
export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const page = Number(request.nextUrl.searchParams.get('page') || '0');
    if (!Number.isFinite(page) || page < 1) {
      return NextResponse.json({ error: 'Informe ?page=N (≥1).' }, { status: 400 });
    }
    const data = await GlobalFoodsImportService.inspecionarPagina(id, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[alimentos-globais/importacoes/[id]/inspect-page]', error);
    const message = error instanceof Error ? error.message : 'Falha ao inspecionar.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
