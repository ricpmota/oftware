import { normalizeNomeAlimento } from '../normalizeNomeAlimento';
import { isSegmentoAlimento, type SegmentoAlimento } from '../segmentos';
import type { NutrienteExtraAlimento } from '../types';
import { coalesceNutrientValue, parseBrazilianDecimal } from './parseBrazilianDecimal';
import {
  CAMPOS_NUTRIENTE_DEDICADOS,
  NUTRIENTE_EXTRA_KNOWN_NAMES,
  resolveNutrientFieldKey,
} from './nutrientFieldMap';
import type {
  GeminiFoodExtractionPayload,
  GeminiFoodItemRaw,
  ImportedFoodDraft,
} from './types';

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== 'string') return String(v).trim() || null;
  const t = v.trim();
  return t.length ? t : null;
}

function numConfidence(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseBrazilianDecimal(String(v ?? ''));
  if (n == null || !Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return n > 100 ? 1 : n / 100;
  return n;
}

export function parseGeminiExtractionPayload(raw: unknown): GeminiFoodExtractionPayload {
  if (!raw || typeof raw !== 'object') return { foods: [] };
  const r = raw as Record<string, unknown>;

  const foodsCandidate =
    r.foods ?? r.alimentos ?? r.items ?? r.foodItems ?? r.Foods ?? r.Alimentos;

  const foods = Array.isArray(foodsCandidate) ? (foodsCandidate as GeminiFoodItemRaw[]) : [];

  return {
    document:
      r.document && typeof r.document === 'object'
        ? (r.document as GeminiFoodExtractionPayload['document'])
        : null,
    foods,
  };
}

export function normalizeExtractionItem(opts: {
  raw: GeminiFoodItemRaw;
  importId: string;
  loteId: string;
  itemId: string;
  documentPage?: number | null;
  documentTable?: string | null;
  documentBaseQty?: number | null;
  documentBaseUnit?: string | null;
}): Omit<ImportedFoodDraft, 'qualityFlags' | 'reviewStatus' | 'duplicateCandidate' | 'duplicateMatches'> {
  const { raw, importId, loteId, itemId } = opts;
  const nome = strOrNull(raw.nome) || 'Sem nome';
  const valoresOriginais: Record<string, string | null> = {};
  if (raw.valoresOriginais && typeof raw.valoresOriginais === 'object') {
    for (const [k, v] of Object.entries(raw.valoresOriginais)) {
      valoresOriginais[k] = v == null ? null : String(v);
    }
  }

  const nutrients: Record<string, number | null> = {};
  const extras: NutrienteExtraAlimento[] = [];

  const nutriRaw = raw.nutrientes && typeof raw.nutrientes === 'object' ? raw.nutrientes : {};
  for (const [key, val] of Object.entries(nutriRaw)) {
    const original = valoresOriginais[key] ?? null;
    const coalesced = coalesceNutrientValue(val, original);
    if (original == null && coalesced.valorOriginal) {
      valoresOriginais[key] = coalesced.valorOriginal;
    }
    const field = resolveNutrientFieldKey(key);
    if (field && CAMPOS_NUTRIENTE_DEDICADOS.has(field)) {
      nutrients[field] = coalesced.valor;
    } else {
      const label = NUTRIENTE_EXTRA_KNOWN_NAMES[key] || key;
      extras.push({
        nome: label,
        valor: coalesced.valor,
        unidade: 'g/100g',
        valorOriginal: coalesced.valorOriginal,
        codigo: key,
      });
    }
  }

  if (Array.isArray(raw.nutrientesExtras)) {
    for (const ex of raw.nutrientesExtras) {
      if (!ex || typeof ex !== 'object') continue;
      const nomeEx = strOrNull(ex.nome);
      if (!nomeEx) continue;
      const coalesced = coalesceNutrientValue(ex.valor, ex.valorOriginal);
      extras.push({
        nome: nomeEx,
        valor: coalesced.valor,
        unidade: strOrNull(ex.unidade) || 'g/100g',
        valorOriginal: coalesced.valorOriginal,
        codigo: strOrNull(ex.codigo),
      });
    }
  }

  let segmentoSugerido: SegmentoAlimento | null = null;
  if (isSegmentoAlimento(raw.segmentoSugerido)) {
    segmentoSugerido = raw.segmentoSugerido;
  }

  const baseQuantidade =
    parseBrazilianDecimal(raw.baseQuantidade) ??
    (opts.documentBaseQty != null ? Number(opts.documentBaseQty) : null) ??
    null;
  const baseUnidade =
    strOrNull(raw.baseUnidade) ||
    strOrNull(opts.documentBaseUnit) ||
    null;

  const baseSeguraPara100g =
    baseQuantidade === 100 &&
    !!baseUnidade &&
    /^g(ramas?)?$/i.test(baseUnidade.trim());

  const sourcePage =
    typeof raw.source?.page === 'number'
      ? raw.source.page
      : opts.documentPage ?? null;
  const sourceTable = strOrNull(raw.source?.table) || strOrNull(opts.documentTable);

  const codigoOriginal = strOrNull(raw.codigoOriginal) || strOrNull(raw.source?.codigoOriginal);
  const codigoPreparacao =
    strOrNull(raw.codigoPreparacao) ||
    strOrNull(valoresOriginais.codigoPreparacao) ||
    null;
  const fonteIdentidade =
    codigoOriginal && codigoPreparacao
      ? `IBGE:${codigoOriginal}:${codigoPreparacao}`
      : null;

  const now = new Date();

  return {
    id: itemId,
    importId,
    loteId,
    codigoOriginal,
    codigoPreparacao,
    fonteIdentidade,
    nome,
    nomeNormalizado: normalizeNomeAlimento(nome),
    nomeCientifico: strOrNull(raw.nomeCientifico),
    marca: strOrNull(raw.marca),
    estado: strOrNull(raw.estado),
    processamento: strOrNull(raw.processamento),
    preparo: strOrNull(raw.preparo),
    descricao: null,
    segmentoSugerido,
    segmentoConfidence: numConfidence(raw.segmentoConfidence),
    segmento: segmentoSugerido,
    baseQuantidade,
    baseUnidade,
    baseSeguraPara100g,
    energiaKcal: nutrients.energiaKcal ?? null,
    energiaKj: nutrients.energiaKj ?? null,
    proteinasG: nutrients.proteinasG ?? null,
    carboidratosG: nutrients.carboidratosG ?? null,
    gordurasTotaisG: nutrients.gordurasTotaisG ?? null,
    fibrasG: nutrients.fibrasG ?? null,
    glicoseG: nutrients.glicoseG ?? null,
    frutoseG: nutrients.frutoseG ?? null,
    lactoseG: nutrients.lactoseG ?? null,
    sacaroseG: nutrients.sacaroseG ?? null,
    acucaresTotaisG: nutrients.acucaresTotaisG ?? null,
    amidoTotalG: nutrients.amidoTotalG ?? null,
    amidoDisponivelG: nutrients.amidoDisponivelG ?? null,
    amidoResistenteG: nutrients.amidoResistenteG ?? null,
    gordurasSaturadasG: nutrients.gordurasSaturadasG ?? null,
    gordurasMonoinsaturadasG: nutrients.gordurasMonoinsaturadasG ?? null,
    gordurasPoliinsaturadasG: nutrients.gordurasPoliinsaturadasG ?? null,
    gordurasTransG: nutrients.gordurasTransG ?? null,
    calcioMg: nutrients.calcioMg ?? null,
    ferroMg: nutrients.ferroMg ?? null,
    magnesioMg: nutrients.magnesioMg ?? null,
    fosforoMg: nutrients.fosforoMg ?? null,
    potassioMg: nutrients.potassioMg ?? null,
    sodioMg: nutrients.sodioMg ?? null,
    zincoMg: nutrients.zincoMg ?? null,
    vitaminaAMcg: nutrients.vitaminaAMcg ?? null,
    vitaminaCMg: nutrients.vitaminaCMg ?? null,
    vitaminaDMcg: nutrients.vitaminaDMcg ?? null,
    vitaminaEMg: nutrients.vitaminaEMg ?? null,
    vitaminaB1Mg: nutrients.vitaminaB1Mg ?? null,
    vitaminaB2Mg: nutrients.vitaminaB2Mg ?? null,
    vitaminaB3Mg: nutrients.vitaminaB3Mg ?? null,
    vitaminaB6Mg: nutrients.vitaminaB6Mg ?? null,
    vitaminaB12Mcg: nutrients.vitaminaB12Mcg ?? null,
    folatoMcg: nutrients.folatoMcg ?? null,
    nutrientesExtras: extras,
    valoresOriginais,
    sourcePage,
    sourceTable,
    extractionConfidence: numConfidence(raw.extractionConfidence),
    ignored: false,
    rawGemini: raw,
    criadoEm: now,
    atualizadoEm: now,
  };
}
