import { describe, expect, it } from 'vitest';
import {
  coalesceNutrientValue,
  parseBrazilianDecimal,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/parseBrazilianDecimal';
import { selectNextFoodImportChunk } from '@/lib/metaadmingeral/alimentosGlobais/importacao/chunking';
import { parseGeminiExtractionPayload, normalizeExtractionItem } from '@/lib/metaadmingeral/alimentosGlobais/importacao/normalizeExtraction';
import { validateImportedFoodDraft } from '@/lib/metaadmingeral/alimentosGlobais/importacao/validateExtraction';
import { findDuplicateMatches } from '@/lib/metaadmingeral/alimentosGlobais/importacao/detectDuplicates';
import { extractJsonFromGeminiText } from '@/lib/oftpay/extractGeminiJson';

describe('parseBrazilianDecimal', () => {
  it('null tokens → null', () => {
    expect(parseBrazilianDecimal('-')).toBeNull();
    expect(parseBrazilianDecimal('—')).toBeNull();
    expect(parseBrazilianDecimal('N/D')).toBeNull();
    expect(parseBrazilianDecimal('')).toBeNull();
    expect(parseBrazilianDecimal(null)).toBeNull();
  });

  it('zero permanece zero', () => {
    expect(parseBrazilianDecimal('0')).toBe(0);
    expect(parseBrazilianDecimal('0,00')).toBe(0);
    expect(parseBrazilianDecimal(0)).toBe(0);
  });

  it('decimal BR', () => {
    expect(parseBrazilianDecimal('31,85')).toBe(31.85);
    expect(parseBrazilianDecimal('0,56')).toBe(0.56);
    expect(parseBrazilianDecimal('1.234,56')).toBe(1234.56);
  });
});

describe('coalesceNutrientValue', () => {
  it('prioriza valorOriginal', () => {
    expect(coalesceNutrientValue(99, '0,56')).toEqual({ valor: 0.56, valorOriginal: '0,56' });
    expect(coalesceNutrientValue(0, '-')).toEqual({ valor: null, valorOriginal: '-' });
  });
});

describe('normalizeExtraction + validate', () => {
  it('mapeia nutrientes e extras; segmento inválido vira null', () => {
    const normalized = normalizeExtractionItem({
      raw: {
        nome: 'Pinhão cozido',
        segmentoSugerido: 'INVALIDO',
        nutrientes: {
          proteinasG: null,
          umidadeG: 50.35,
        },
        valoresOriginais: {
          proteinasG: '0,00',
          umidadeG: '50,35',
        },
        nutrientesExtras: [
          { nome: 'Açúcares redutores', valorOriginal: '0,80', unidade: 'g/100g' },
        ],
      },
      importId: 'imp1',
      loteId: 'p1_1',
      itemId: 'item1',
      documentBaseQty: 100,
      documentBaseUnit: 'g',
    });

    expect(normalized.proteinasG).toBe(0);
    expect(normalized.segmentoSugerido).toBeNull();
    expect(normalized.nutrientesExtras.some((e) => e.nome === 'Umidade')).toBe(true);
    expect(normalized.nutrientesExtras.some((e) => e.nome === 'Açúcares redutores')).toBe(true);
    expect(normalized.baseSeguraPara100g).toBe(true);

    const v = validateImportedFoodDraft({
      ...normalized,
      duplicateCandidate: false,
      duplicateMatches: [],
    });
    expect(v.qualityFlags).toContain('SEGMENTO_AUSENTE');
    expect(v.reviewStatus).toBe('ATTENTION');
  });

  it('base desconhecida marca REVIEW', () => {
    const normalized = normalizeExtractionItem({
      raw: { nome: 'X', baseQuantidade: null, baseUnidade: null },
      importId: 'i',
      loteId: 'l',
      itemId: 'x',
    });
    const v = validateImportedFoodDraft({
      ...normalized,
      duplicateCandidate: false,
      duplicateMatches: [],
    });
    expect(v.qualityFlags).toContain('BASE_DESCONHECIDA');
    expect(v.reviewStatus).toBe('REVIEW');
  });
});

describe('duplicidade', () => {
  it('detecta por codigo e nomeNormalizado sem mesclar', () => {
    const matches = findDuplicateMatches({
      item: {
        id: 'a',
        nome: 'Banana Prata',
        nomeNormalizado: 'banana prata',
        codigoOriginal: '1061B',
      },
      importPeers: [
        {
          id: 'b',
          nome: 'Banana, prata',
          nomeNormalizado: 'banana prata',
          codigoOriginal: '1061B',
        },
      ],
      globalPeers: [],
    });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].reason).toMatch(/codigoOriginal|nomeNormalizado/);
  });
});

describe('chunking + gemini json parse', () => {
  it('seleciona próximo lote sem repetir páginas', () => {
    const pages = [
      { page: 1, content: 'a' },
      { page: 2, content: 'b' },
      { page: 3, content: 'c' },
      { page: 4, content: 'd' },
    ];
    const chunk = selectNextFoodImportChunk(pages, 2);
    expect(chunk.map((p) => p.page)).toEqual([3, 4]);
  });

  it('parse resposta Gemini fenced', () => {
    const raw = '```json\n{"foods":[{"nome":"Arroz"}]}\n```';
    const parsed = extractJsonFromGeminiText(raw);
    const payload = parseGeminiExtractionPayload(parsed);
    expect(payload.foods?.[0]?.nome).toBe('Arroz');
  });
});
