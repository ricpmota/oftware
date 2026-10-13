import { describe, expect, it } from 'vitest';
import {
  classifyPdfPage,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/classifyPdfPage';
import {
  looksLikeBibliographyOnly,
  looksLikeCompositionDataTable,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/parseIbgeTabela1';
import { isSchemaValidForExtraction } from '@/lib/metaadmingeral/alimentosGlobais/importacao/pageRepresentation';
import { parseFoodTableSchema } from '@/lib/metaadmingeral/alimentosGlobais/importacao/tableSchema';
import {
  classifyGeminiHttpError,
  GeminiImportError,
  withGeminiRetry,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/geminiRetry';

const TBCA_P7 =
  'Quadro 1 – Conteúdo de carboidrato disponível por 100g de alimento (parte comestível) Identificação NOME n UMIDADE média (g) UMIDADE desvio/ variação GLICOSE média (g) GLIC OSE desvio/ variação FRUTOSE média (g) FRUT OSE desvio/ variação LACTOSE média (g) Referências 646A Arroz, integral, Orysa sativa L., cozido/28 min 1 65,75 — 0,01 — 0,00 — 29,92 — 29,09 29,11 4';

describe('ETAPA 03.3 — classificação TBCA', () => {
  it('página Quadro 1 com coluna Referências → FOOD_TABLE (não bibliografia)', () => {
    expect(looksLikeCompositionDataTable(TBCA_P7)).toBe(true);
    expect(looksLikeBibliographyOnly(TBCA_P7)).toBe(false);
    const c = classifyPdfPage({ page: 7, content: TBCA_P7 });
    expect(c.classification).toBe('FOOD_TABLE');
  });

  it('bibliografia pura → REFERENCE_TABLE', () => {
    const bib =
      'Referências Bibliográficas Aune, D.; Keum, N.; Giovannucci, E.; et al. Nut consumption and risk of cardiovascular disease. Vol. 17. p. 94-97. DOI 10.1000/xyz. '.repeat(
        3
      );
    expect(looksLikeBibliographyOnly(bib)).toBe(true);
    expect(classifyPdfPage({ page: 5, content: bib }).classification).toBe('REFERENCE_TABLE');
  });

  it('text UNUSABLE → UNKNOWN (não descarta multimodal)', () => {
    expect(classifyPdfPage({ page: 6, content: '   ' }).classification).toBe('UNKNOWN');
  });
});

describe('ETAPA 03.3 — schema validity', () => {
  it('schema válido precisa food_name + nutrient', () => {
    const ok = parseFoodTableSchema(
      {
        tableType: 'CARBOHYDRATES',
        confidence: 0.9,
        estimatedDataRows: 28,
        columns: [
          { sourceHeader: 'NOME', semanticType: 'food_name' },
          {
            sourceHeader: 'Glicose (g)',
            semanticType: 'nutrient',
            targetField: null,
            nutrientName: 'Glicose',
            unit: 'g',
          },
        ],
      },
      's1'
    );
    expect(isSchemaValidForExtraction(ok)).toBe(true);
    expect(ok.estimatedDataRows).toBe(28);
  });

  it('schema só com outras colunas → inválido', () => {
    const bad = parseFoodTableSchema(
      {
        tableType: 'UNKNOWN',
        columns: [{ sourceHeader: 'n', semanticType: 'other' }],
      },
      's2'
    );
    expect(isSchemaValidForExtraction(bad)).toBe(false);
  });
});

describe('ETAPA 03.3 — partial / zero flags helpers', () => {
  it('cobertura baixa → partial', () => {
    const estimated = 28;
    const extracted = 3;
    const partial = estimated >= 8 && extracted > 0 && extracted < estimated * 0.4;
    expect(partial).toBe(true);
  });
});

describe('filtro alimento sem nutriente', () => {
  it('descarta só nome sem dados', async () => {
    const { foodDraftHasNutrientData } = await import(
      '@/lib/metaadmingeral/alimentosGlobais/importacao/validateExtraction'
    );
    expect(
      foodDraftHasNutrientData({
        nome: 'Arroz',
        nutrientesExtras: [],
      })
    ).toBe(false);
    expect(
      foodDraftHasNutrientData({
        nome: 'Arroz',
        energiaKcal: 0,
        nutrientesExtras: [],
      })
    ).toBe(true);
    expect(
      foodDraftHasNutrientData({
        nome: 'Arroz',
        nutrientesExtras: [{ nome: 'Umidade', valor: 65.7, unidade: 'g' }],
      })
    ).toBe(true);
  });
});

describe('ETAPA 03.3 — retry 429 multimodal (mesmo withGeminiRetry)', () => {
  it('429 → waiting → success', async () => {
    let n = 0;
    const result = await withGeminiRetry(
      async () => {
        n += 1;
        if (n < 2) {
          throw new GeminiImportError({
            message: 'Resource exhausted',
            code: 'GEMINI_RATE_LIMITED',
            httpStatus: 429,
            transient: true,
          });
        }
        return 'ok';
      },
      { maxAttempts: 4, baseDelayMs: 1, maxDelayMs: 5 }
    );
    expect(result).toBe('ok');
    expect(classifyGeminiHttpError(503, 'UNAVAILABLE', null).transient).toBe(true);
  });
});
