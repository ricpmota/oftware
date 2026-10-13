/**
 * Diagnóstico ETAPA 03.1 — pipeline PDF IBGE (páginas 37–39).
 * Uso: npx tsx scripts/diag-ibge-import-etapa03_1.ts
 */
import fs from 'fs';
import path from 'path';
import { extractPdfTextByPage } from '../lib/oftpay/extractPdfTextByPage';
import { buildChunkTextForGemini } from '../lib/metaadmingeral/alimentosGlobais/importacao/chunking';
import { buildFoodPdfExtractionPrompt } from '../lib/metaadmingeral/alimentosGlobais/prompts/foodPdfExtractionPrompt';
import { extractJsonFromGeminiText } from '../lib/oftpay/extractGeminiJson';
import {
  normalizeExtractionItem,
  parseGeminiExtractionPayload,
} from '../lib/metaadmingeral/alimentosGlobais/importacao/normalizeExtraction';
import { applyValidationAndDuplicates } from '../lib/metaadmingeral/alimentosGlobais/importacao/validateExtraction';

const OUT = path.join(process.cwd(), 'tmp', 'etapa03_1');
const PDF =
  process.env.IBGE_PDF_PATH ||
  'C:/Users/ricpm/Downloads/Tabela 01.pdf';

const PAGE_START = Number(process.env.PAGE_START || 37);
const PAGE_END = Number(process.env.PAGE_END || 39);
const CALL_GEMINI = process.env.CALL_GEMINI === '1';

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

import {
  hasFoodTableSignals,
  parseIbgeTabela1FromText,
} from '../lib/metaadmingeral/alimentosGlobais/importacao/parseIbgeTabela1';

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('PDF:', PDF);
  const buf = fs.readFileSync(PDF);
  const { pages, totalPages } = await extractPdfTextByPage(buf);
  console.log('totalPages', totalPages);

  const target = pages.filter((p) => p.page >= PAGE_START && p.page <= PAGE_END);
  console.log(
    'target pages',
    target.map((p) => ({ page: p.page, len: (p.content || '').length }))
  );

  // A) extractPdfTextByPage
  fs.writeFileSync(path.join(OUT, 'A_pages.json'), JSON.stringify(target, null, 2));
  for (const p of target) {
    fs.writeFileSync(path.join(OUT, `A_page_${p.page}.txt`), p.content || '');
  }

  const chunkText = buildChunkTextForGemini(target);
  fs.writeFileSync(path.join(OUT, 'A_chunkText.txt'), chunkText);
  console.log('A) chunkText chars', chunkText.length);
  console.log('A) food table signals?', hasFoodTableSignals(chunkText));
  const ibgeParsed = parseIbgeTabela1FromText(chunkText);
  console.log('A2) IBGE deterministic parser count', ibgeParsed.length);
  fs.writeFileSync(
    path.join(OUT, 'A2_ibge_parser.json'),
    JSON.stringify(ibgeParsed, null, 2)
  );
  console.log('A) sample:\n', chunkText.slice(0, 1500));

  // B) prompt
  const prompt = buildFoodPdfExtractionPrompt({
    pageStart: PAGE_START,
    pageEnd: PAGE_END,
    fonteNome: 'Pesquisa de Orçamento Familiar IBGE',
  });
  fs.writeFileSync(path.join(OUT, 'B_prompt.txt'), prompt);
  console.log('B) prompt chars', prompt.length);
  console.log('B) expects key "foods":', prompt.includes('"foods"'));

  let rawText = '';
  let parsed: unknown = null;

  if (CALL_GEMINI) {
    const { extrairAlimentosDePaginasComGemini } = await import(
      '../lib/metaadmingeral/alimentosGlobais/importacao/foodPdfGemini.server'
    );
    console.log('C) calling Gemini...');
    const gemini = await extrairAlimentosDePaginasComGemini({
      chunkText,
      pageStart: PAGE_START,
      pageEnd: PAGE_END,
      fonteNome: 'Pesquisa de Orçamento Familiar IBGE',
    });
    rawText = gemini.rawText;
    fs.writeFileSync(path.join(OUT, 'C_gemini_raw.txt'), rawText);
    console.log('C) rawText chars', rawText.length);
    console.log('C) raw sample:\n', rawText.slice(0, 2000));

    parsed = extractJsonFromGeminiText(rawText);
    fs.writeFileSync(path.join(OUT, 'D_extractGeminiJson.json'), JSON.stringify(parsed, null, 2));
    console.log('D) parsed type', parsed == null ? 'null' : typeof parsed);
    if (parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed as object);
      console.log('D) top-level keys', keys);
      const r = parsed as Record<string, unknown>;
      console.log(
        'D) foods?',
        Array.isArray(r.foods),
        'alimentos?',
        Array.isArray(r.alimentos),
        'items?',
        Array.isArray(r.items)
      );
      if (Array.isArray(r.foods)) console.log('D) foods.length', r.foods.length);
      if (Array.isArray(r.alimentos)) console.log('D) alimentos.length', r.alimentos.length);
    }

    const payload = parseGeminiExtractionPayload(parsed);
    fs.writeFileSync(path.join(OUT, 'E_parsePayload.json'), JSON.stringify(payload, null, 2));
    console.log('E) foods after parseGeminiExtractionPayload', payload.foods?.length ?? 0);

    const foods = payload.foods || [];
    const normalized = foods.map((raw, i) =>
      normalizeExtractionItem({
        raw: raw || {},
        importId: 'diag',
        loteId: `p${PAGE_START}_${PAGE_END}`,
        itemId: `diag_${i}`,
        documentPage: payload.document?.page ?? PAGE_START,
        documentTable: payload.document?.table ?? null,
        documentBaseQty: payload.document?.baseQuantity ?? null,
        documentBaseUnit: payload.document?.baseUnit ?? null,
      })
    );
    fs.writeFileSync(path.join(OUT, 'F_normalized.json'), JSON.stringify(normalized, null, 2));
    console.log('F) normalized count', normalized.length);

    const validated = normalized.map((n) => applyValidationAndDuplicates(n, []));
    fs.writeFileSync(path.join(OUT, 'G_validated.json'), JSON.stringify(validated, null, 2));
    console.log('G) validated count', validated.length);
    console.log(
      'G) statuses',
      validated.reduce(
        (acc, v) => {
          acc[v.reviewStatus] = (acc[v.reviewStatus] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    );

    // H) would-be saved = same as validated (service saves all)
    console.log('H) would save', validated.length);
    console.log(
      'H) sample names',
      validated.slice(0, 5).map((v) => ({
        nome: v.nome,
        codigo: v.codigoOriginal,
        preparo: v.preparo,
        kcal: v.energiaKcal,
        p: v.proteinasG,
        g: v.gordurasTotaisG,
        c: v.carboidratosG,
        f: v.fibrasG,
      }))
    );
  } else {
    console.log('CALL_GEMINI!=1 — apenas A/B salvos. Rode com CALL_GEMINI=1 para C–H.');
  }

  // Summary counts file
  const summary = {
    totalPages,
    pageStart: PAGE_START,
    pageEnd: PAGE_END,
    pageLens: target.map((p) => ({ page: p.page, len: (p.content || '').length })),
    chunkChars: chunkText.length,
    hasFoodTableSignals: hasFoodTableSignals(chunkText),
    calledGemini: CALL_GEMINI,
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
