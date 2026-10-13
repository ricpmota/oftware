/**
 * Parser determinístico para linhas densas da Tabela 1 IBGE/POF
 * (Energia, macronutrientes e fibra por 100 g).
 *
 * Formato típico no texto extraído do PDF (espaços colapsados):
 * 6400101 Batata-inglesa 2 Cozido(a) 86,00 1,71 0,10 20,01 2,05
 */
import type { GeminiFoodItemRaw } from './types';
import { parseBrazilianDecimal } from './parseBrazilianDecimal';

/** Sinais de que o texto contém tabela alimentar (IBGE/TBCA/TACO-like). */
export function hasFoodTableSignals(text: string): boolean {
  const t = text.toLowerCase();
  const signals = [
    'energia',
    'proteína',
    'proteina',
    'carboidrato',
    'fibra',
    'código e descrição do alimento',
    'codigo e descricao do alimento',
    'lipídios',
    'lipidios',
    'tabela 1',
    'tabela 2',
    'tabela 3',
    'tabela 4',
    // TBCA / perfis
    'umidade',
    'glicose',
    'frutose',
    'lactose',
    'sacarose',
    'amido',
    'identificação',
    'identificacao',
    'quadro 1',
    'quadro 2',
    'quadro 3',
    'parte comestível',
    'parte comestivel',
  ];
  let hits = 0;
  for (const s of signals) {
    if (t.includes(s)) hits += 1;
  }
  return hits >= 3;
}

/** Página parece Quadro/tabela de composição (mesmo sem sinais IBGE clássicos). */
export function looksLikeCompositionDataTable(text: string): boolean {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return false;
  const headerHits = [
    'nome',
    'umidade',
    'glicose',
    'frutose',
    'lactose',
    'sacarose',
    'amido',
    'fibra',
    'energia',
    'proteína',
    'proteina',
    'carboidrato',
    'lipídio',
    'lipidio',
  ].filter((s) => t.includes(s)).length;
  const hasQuadro = /quadro\s*\d/i.test(text);
  const hasTbcaCode = /\b\d{2,4}[A-Za-z]\b/.test(text);
  const digitRatio = (text.match(/\d/g) || []).length / Math.max(1, text.length);
  if (hasQuadro && headerHits >= 2) return true;
  if (headerHits >= 4 && digitRatio > 0.05) return true;
  if (hasTbcaCode && headerHits >= 3 && digitRatio > 0.06) return true;
  return hasFoodTableSignals(text);
}

/** Bibliografia pura — não confundir com coluna "Referências" de quadro. */
export function looksLikeBibliographyOnly(text: string): boolean {
  const t = (text || '').toLowerCase();
  if (/refer[eê]ncias?\s+bibliogr|bibliografia/i.test(t)) {
    return !looksLikeCompositionDataTable(text);
  }
  // Muitas citações autor/ano e pouca densidade de nutrientes
  const citeHits = (t.match(/\bet\s+al\.|\bdoi\b|\bvol\.|\bp\.\s*\d+/g) || []).length;
  if (citeHits >= 5 && !looksLikeCompositionDataTable(text)) return true;
  return false;
}

export function detectIbgeTableKind(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('tabela 1') && (t.includes('energia') || t.includes('macronutriente'))) {
    return 'IBGE_TABELA_1_ENERGIA_MACROS_FIBRA';
  }
  if (t.includes('tabela 2') && (t.includes('gordura') || t.includes('açúcar') || t.includes('acucar'))) {
    return 'IBGE_TABELA_2_GORDURAS_ACUCAR';
  }
  if (t.includes('tabela 3') && t.includes('mineral')) {
    return 'IBGE_TABELA_3_MINERAIS';
  }
  if (t.includes('tabela 4') && t.includes('vitamina')) {
    return 'IBGE_TABELA_4_VITAMINAS';
  }
  if (t.includes('tabela 5')) {
    return 'IBGE_TABELA_5_REFERENCIAS';
  }
  return null;
}

export function buildFonteIdentidadeIbge(codigoAlimento: string, codigoPreparacao: string): string {
  return `IBGE:${codigoAlimento}:${codigoPreparacao}`;
}

/**
 * Extrai registros Tabela 1 a partir do texto de página(s).
 * Cada combinação codigoAlimento + codigoPreparacao = 1 item.
 */
export function parseIbgeTabela1FromText(text: string): GeminiFoodItemRaw[] {
  const foods: GeminiFoodItemRaw[] = [];
  const re =
    /(\d{6,8})\s+(.+?)\s+(\d{1,3})\s+([A-Za-zÀ-ÿ0-9/().\-\s]+?)\s+(\d{1,4},\d{2})\s+(\d{1,3},\d{2})\s+(\d{1,3},\d{2})\s+(\d{1,4},\d{2})\s+(\d{1,3},\d{2})/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const codigoOriginal = m[1];
    const nome = m[2].trim();
    const codigoPreparacao = m[3];
    const preparo = m[4].trim().replace(/\s+/g, ' ');
    if (!nome || /^\d+$/.test(nome)) continue;
    if (preparo.length > 80) continue;
    if (/energia|prote[ií]na|lip[ií]dio|carboi|fibra alimentar/i.test(preparo)) continue;

    const energiaOrig = m[5];
    const protOrig = m[6];
    const gordOrig = m[7];
    const carbOrig = m[8];
    const fibraOrig = m[9];

    foods.push({
      codigoOriginal,
      codigoPreparacao,
      nome,
      preparo,
      baseQuantidade: 100,
      baseUnidade: 'g',
      segmentoSugerido: null,
      segmentoConfidence: null,
      nutrientes: {
        energiaKcal: parseBrazilianDecimal(energiaOrig),
        proteinasG: parseBrazilianDecimal(protOrig),
        gordurasTotaisG: parseBrazilianDecimal(gordOrig),
        carboidratosG: parseBrazilianDecimal(carbOrig),
        fibrasG: parseBrazilianDecimal(fibraOrig),
      },
      valoresOriginais: {
        energiaKcal: energiaOrig,
        proteinasG: protOrig,
        gordurasTotaisG: gordOrig,
        carboidratosG: carbOrig,
        fibrasG: fibraOrig,
        codigoPreparacao,
      },
      nutrientesExtras: [
        {
          nome: 'codigoPreparacao',
          valor: Number(codigoPreparacao),
          unidade: 'codigo',
          valorOriginal: codigoPreparacao,
          codigo: 'codigoPreparacao',
        },
      ],
      source: {
        table: 'IBGE_TABELA_1_ENERGIA_MACROS_FIBRA',
        codigoOriginal,
      },
      extractionConfidence: 0.85,
    });
  }

  return foods;
}

export function countLikelyIbgeTabela1Rows(text: string): number {
  return parseIbgeTabela1FromText(text).length;
}
