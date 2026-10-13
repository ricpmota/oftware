import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_PDF_BYTES = 25 * 1024 * 1024;

/**
 * GET  /api/metaadmingeral/alimentos-globais/importacoes
 * POST /api/metaadmingeral/alimentos-globais/importacoes  (multipart PDF)
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const list = await GlobalFoodsImportService.listarImportacoes();
    return NextResponse.json({
      importacoes: list.map((i) => GlobalFoodsImportService.toJsonImport(i)),
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes GET]', error);
    return NextResponse.json({ error: 'Falha ao listar importações.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie o PDF no campo "file".' }, { status: 400 });
    }
    const fonteNome = String(form.get('fonteNome') || '').trim();
    if (!fonteNome) {
      return NextResponse.json({ error: 'fonteNome é obrigatório.' }, { status: 400 });
    }

    const nome = 'name' in file && typeof (file as File).name === 'string' ? (file as File).name : 'arquivo.pdf';
    if (!nome.toLowerCase().endsWith('.pdf') && !(file.type || '').includes('pdf')) {
      return NextResponse.json({ error: 'Apenas PDF é aceito.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF muito grande (máx. 25 MB).' }, { status: 400 });
    }

    const fonteVersao = String(form.get('fonteVersao') || '').trim() || null;
    const anoRaw = String(form.get('fonteAno') || '').trim();
    const fonteAno = anoRaw ? Number(anoRaw) : null;
    const licenca = String(form.get('licenca') || '').trim() || null;
    const observacao = String(form.get('observacao') || '').trim() || null;
    const tipoConteudoEsperado = String(form.get('tipoConteudoEsperado') || '').trim() || null;

    const created = await GlobalFoodsImportService.criarImportacao({
      buffer,
      arquivoNome: nome,
      fonteNome,
      fonteVersao,
      fonteAno: fonteAno != null && Number.isFinite(fonteAno) ? fonteAno : null,
      licenca,
      observacao,
      tipoConteudoEsperado,
      uid: auth.uid,
      email: auth.email,
    });

    return NextResponse.json({
      importacao: GlobalFoodsImportService.toJsonImport(created),
    });
  } catch (error) {
    console.error('[alimentos-globais/importacoes POST]', error);
    const message = error instanceof Error ? error.message : 'Falha no upload.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
