/**
 * Diagnóstico ETAPA 03.3 — tabela 02, página FOOD_TABLE text-only.
 * Uso: npx tsx scripts/diag-etapa03_3-tabela02.ts
 * CALL_GEMINI=1 para schema/extraction text-only.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const OUT = path.join(process.cwd(), 'tmp', 'etapa03_3');
const PDF =
  process.env.TABELA02_PDF_PATH || 'C:/Users/ricpm/Downloads/tabela 02.pdf';
const CALL_GEMINI = process.env.CALL_GEMINI === '1';
const FORCE_PAGE = process.env.PAGE ? Number(process.env.PAGE) : null;

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvLocal();

async function renderPagePng(pdfBuffer: Buffer, pageNumber: number, outPath: string) {
  const canvasMod = await import('@napi-rs/canvas');
  // Usar a mesma árvore do pdf-parse (5.x) para evitar mismatch com pdfjs-dist 6.x top-level
  const pdfjsPath = path.join(
    process.cwd(),
    'node_modules',
    'pdf-parse',
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.mjs'
  );
  const workerPath = path.join(
    process.cwd(),
    'node_modules',
    'pdf-parse',
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.mjs'
  );
  const pdfjs = await import(pathToFileURL(pdfjsPath).href);
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, 1400 / Math.max(base.width, 1));
  const viewport = page.getViewport({ scale });
  const canvas = canvasMod.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  await doc.destroy();
  return { width: canvas.width, height: canvas.height, scale };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { extractPdfTextByPage } = await import('../lib/oftpay/extractPdfTextByPage');
  const {
    classifyPdfPage,
    buildDocumentFoodMap,
    summarizeDocumentFoodMap,
  } = await import('../lib/metaadmingeral/alimentosGlobais/importacao/classifyPdfPage');
  const { buildChunkTextForGemini } = await import(
    '../lib/metaadmingeral/alimentosGlobais/importacao/chunking'
  );
  const { hasFoodTableSignals } = await import(
    '../lib/metaadmingeral/alimentosGlobais/importacao/parseIbgeTabela1'
  );

  console.log('PDF:', PDF);
  const buf = fs.readFileSync(PDF);
  const { pages, totalPages } = await extractPdfTextByPage(buf);
  console.log('totalPages', totalPages);

  const classified = pages.map((p) => {
    const c = classifyPdfPage(p);
    return {
      page: p.page,
      len: (p.content || '').length,
      classification: c.classification,
      textQuality: c.textQuality,
      preview: (p.content || '').slice(0, 240),
    };
  });
  fs.writeFileSync(
    path.join(OUT, 'tabela02_classified.json'),
    JSON.stringify(classified, null, 2)
  );
  const map = buildDocumentFoodMap(pages);
  fs.writeFileSync(path.join(OUT, 'tabela02_map.json'), JSON.stringify(map, null, 2));
  console.log('map summary', summarizeDocumentFoodMap(map));

  // Preferir página de Quadro (dados reais). Página 3 é intro narrativa mal classificada.
  const pickMeta =
    (FORCE_PAGE
      ? classified.find((c) => c.page === FORCE_PAGE)
      : null) ||
    classified.find(
      (c) =>
        /quadro\s*\d|conteúdo de carboidrato|identificação\s+nome/i.test(c.preview) &&
        c.len > 800
    ) ||
    classified.find((c) => c.classification === 'FOOD_TABLE' && c.len > 300) ||
    classified.find((c) => c.classification === 'FOOD_TABLE');

  if (!pickMeta) throw new Error('Nenhuma página candidata a tabela.');
  const page = pages.find((p) => p.page === pickMeta.page)!;
  const text = page.content || '';
  fs.writeFileSync(path.join(OUT, `A_page_${page.page}.txt`), text);

  console.log('\n=== PICK ===');
  console.log(JSON.stringify(pickMeta, null, 2));
  console.log('\n=== A) TEXTO (primeiros 2500 chars) ===');
  console.log(text.slice(0, 2500));
  console.log(`\n[chars=${text.length}] foodSignals=${hasFoodTableSignals(text)}`);

  let renderInfo: unknown = null;
  try {
    const pngPath = path.join(OUT, `B_page_${page.page}.png`);
    renderInfo = await renderPagePng(buf, page.page, pngPath);
    console.log('\n=== B) IMAGEM ===', pngPath, renderInfo);
  } catch (e) {
    console.error('Render falhou:', e);
    fs.writeFileSync(
      path.join(OUT, `B_page_${page.page}_render_error.txt`),
      e instanceof Error ? e.stack || e.message : String(e)
    );
  }

  const result: Record<string, unknown> = {
    pdf: PDF,
    page: page.page,
    classification: pickMeta.classification,
    textQuality: pickMeta.textQuality,
    textChars: text.length,
    foodSignals: hasFoodTableSignals(text),
    textPreview: text.slice(0, 1500),
    renderInfo,
  };

  if (CALL_GEMINI) {
    const { discoverFoodTableSchema } = await import(
      '../lib/metaadmingeral/alimentosGlobais/importacao/foodPdfSchemaDiscovery.server'
    );
    const { extrairLinhasComSchema } = await import(
      '../lib/metaadmingeral/alimentosGlobais/importacao/foodPdfRowExtraction.server'
    );
    const chunkText = buildChunkTextForGemini([page]);
    console.log('\n=== C) SCHEMA DISCOVERY (text-only) ===');
    const disc = await discoverFoodTableSchema({
      chunkText,
      pageStart: page.page,
      pageEnd: page.page,
      fonteNome: 'tabela 02 (perfil carboidratos)',
      schemaId: `diag_p${page.page}`,
    });
    fs.writeFileSync(path.join(OUT, `C_schema_raw_p${page.page}.txt`), disc.rawText);
    fs.writeFileSync(
      path.join(OUT, `C_schema_p${page.page}.json`),
      JSON.stringify(disc.schema, null, 2)
    );
    console.log('isFood', disc.isFoodCompositionTable);
    console.log('columns', disc.schema?.columns?.length ?? 0);
    console.log('schema sample', JSON.stringify(disc.schema, null, 2).slice(0, 2000));

    let foodsCount = 0;
    let extractRaw = '';
    if (disc.schema) {
      console.log('\n=== D) ROW EXTRACTION (text-only) ===');
      const ext = await extrairLinhasComSchema({
        chunkText,
        pageStart: page.page,
        pageEnd: page.page,
        fonteNome: 'tabela 02 (perfil carboidratos)',
        schema: disc.schema,
      });
      extractRaw = ext.rawText;
      foodsCount = ext.payload.foods?.length || 0;
      fs.writeFileSync(path.join(OUT, `D_extract_raw_p${page.page}.txt`), ext.rawText);
      fs.writeFileSync(
        path.join(OUT, `D_foods_p${page.page}.json`),
        JSON.stringify(ext.payload.foods || [], null, 2)
      );
      console.log('foods', foodsCount);
      console.log('finishReason', ext.finishReason);
      console.log(
        'first foods',
        JSON.stringify((ext.payload.foods || []).slice(0, 3), null, 2)
      );
    } else {
      console.log('Schema null — extração schema-oriented pulada.');
    }

    result.schema = disc.schema;
    result.schemaRawPreview = disc.rawText.slice(0, 2000);
    result.foodsCount = foodsCount;
    result.extractRawPreview = extractRaw.slice(0, 2000);
    result.whyZero =
      foodsCount === 0
        ? disc.schema
          ? 'Schema text-only obtido, mas row extraction retornou foods:[]. Texto provavelmente perdeu geometria de colunas/linhas.'
          : 'Schema Discovery text-only falhou/não reconheceu tabela de alimentos no texto linearizado.'
        : null;
  } else {
    console.log('\n(CALL_GEMINI=0 — pulando schema/extraction. Rode CALL_GEMINI=1 para C/D)');
  }

  fs.writeFileSync(path.join(OUT, 'diag_summary.json'), JSON.stringify(result, null, 2));
  console.log('\nWrote', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
