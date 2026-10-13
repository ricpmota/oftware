import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  isSegmentoAlimento,
  isStatusAlimentoGlobal,
  type AlimentoGlobalCreateInput,
  type AlimentoGlobalUpdateInput,
  type StatusAlimentoGlobal,
} from '@/lib/metaadmingeral/alimentosGlobais';
import { GlobalFoodsService } from '@/services/globalFoodsService.server';

/**
 * GET  /api/metaadmingeral/alimentos-globais?q=&segmento=&status=
 * POST /api/metaadmingeral/alimentos-globais  — criar
 * PUT  /api/metaadmingeral/alimentos-globais  — atualizar { id, ... }
 * PATCH /api/metaadmingeral/alimentos-globais — alterarStatus { id, status }
 */

export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();
    if (id) {
      const item = await GlobalFoodsService.obterPorId(id);
      if (!item) {
        return NextResponse.json({ error: 'Alimento não encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ alimento: GlobalFoodsService.toJsonList([item])[0] });
    }

    const q = searchParams.get('q') || undefined;
    const segmentoRaw = searchParams.get('segmento') || 'todos';
    const statusRaw = searchParams.get('status') || 'todos';
    const segmento =
      segmentoRaw === 'todos' || isSegmentoAlimento(segmentoRaw) ? segmentoRaw : 'todos';
    const status =
      statusRaw === 'todos' || isStatusAlimentoGlobal(statusRaw) ? statusRaw : 'todos';

    const alimentos = await GlobalFoodsService.listar({
      q,
      segmento: segmento as 'todos' | import('@/lib/metaadmingeral/alimentosGlobais').SegmentoAlimento,
      status: status as 'todos' | StatusAlimentoGlobal,
    });

    return NextResponse.json({
      alimentos: GlobalFoodsService.toJsonList(alimentos),
      total: alimentos.length,
    });
  } catch (error) {
    console.error('[metaadmingeral/alimentos-globais GET]', error);
    return NextResponse.json({ error: 'Falha ao listar alimentos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as AlimentoGlobalCreateInput;
    const created = await GlobalFoodsService.criar(body, { uid: auth.uid });
    return NextResponse.json({
      alimento: GlobalFoodsService.toJsonList([created])[0],
    });
  } catch (error) {
    console.error('[metaadmingeral/alimentos-globais POST]', error);
    const message = error instanceof Error ? error.message : 'Falha ao criar alimento.';
    const status = message.includes('obrigatório') || message.includes('inválido') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as AlimentoGlobalUpdateInput & { id?: string };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }
    const { id: _omit, ...rest } = body;
    const updated = await GlobalFoodsService.atualizar(id, rest, { uid: auth.uid });
    return NextResponse.json({
      alimento: GlobalFoodsService.toJsonList([updated])[0],
    });
  } catch (error) {
    console.error('[metaadmingeral/alimentos-globais PUT]', error);
    const message = error instanceof Error ? error.message : 'Falha ao atualizar alimento.';
    const status = message.includes('não encontrado')
      ? 404
      : message.includes('obrigatório') || message.includes('inválido')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as { id?: string; status?: string };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }
    if (!isStatusAlimentoGlobal(body.status)) {
      return NextResponse.json({ error: 'status inválido.' }, { status: 400 });
    }
    const updated = await GlobalFoodsService.alterarStatus(id, body.status, { uid: auth.uid });
    return NextResponse.json({
      alimento: GlobalFoodsService.toJsonList([updated])[0],
    });
  } catch (error) {
    console.error('[metaadmingeral/alimentos-globais PATCH]', error);
    const message = error instanceof Error ? error.message : 'Falha ao alterar status.';
    const status = message.includes('não encontrado') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
