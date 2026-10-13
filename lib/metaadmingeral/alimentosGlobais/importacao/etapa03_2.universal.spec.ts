import { describe, expect, it } from 'vitest';
import {
  classifyGeminiHttpError,
  GeminiImportError,
  withGeminiRetry,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/geminiRetry';
import {
  buildDocumentFoodMap,
  buildDocumentFoodMapThrough,
  classifyPdfPage,
  isDocumentFoodMapComplete,
  summarizeDocumentFoodMap,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/classifyPdfPage';
import { estimateChunkComplexity, maxPagesForComplexity } from '@/lib/metaadmingeral/alimentosGlobais/importacao/estimateChunkComplexity';
import { parseFoodTableSchema } from '@/lib/metaadmingeral/alimentosGlobais/importacao/tableSchema';
import { parseGeminiExtractionPayload } from '@/lib/metaadmingeral/alimentosGlobais/importacao/normalizeExtraction';
import { extractJsonFromGeminiText } from '@/lib/oftpay/extractGeminiJson';
import { parseIbgeTabela1FromText } from '@/lib/metaadmingeral/alimentosGlobais/importacao/parseIbgeTabela1';

describe('ETAPA 03.2 — gemini retry', () => {
  it('429 → waiting → success na 3ª tentativa', async () => {
    let n = 0;
    const result = await withGeminiRetry(
      async () => {
        n += 1;
        if (n < 3) {
          throw new GeminiImportError({
            message: 'Resource exhausted',
            code: 'GEMINI_RATE_LIMITED',
            httpStatus: 429,
            transient: true,
          });
        }
        return 'ok';
      },
      { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 5 }
    );
    expect(result).toBe('ok');
    expect(n).toBe(3);
  });

  it('429 até o limite → propaga erro', async () => {
    await expect(
      withGeminiRetry(
        async () => {
          throw new GeminiImportError({
            message: 'Resource exhausted',
            code: 'GEMINI_RATE_LIMITED',
            httpStatus: 429,
            transient: true,
          });
        },
        { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 }
      )
    ).rejects.toMatchObject({ code: 'GEMINI_RATE_LIMITED' });
  });

  it('503 classificado como UNAVAILABLE transitório', () => {
    const err = classifyGeminiHttpError(503, 'UNAVAILABLE', null);
    expect(err.code).toBe('GEMINI_UNAVAILABLE');
    expect(err.transient).toBe(true);
  });
});

describe('ETAPA 03.2 — classificação / chunk', () => {
  it('página densa IBGE → FOOD_TABLE', () => {
    const page = {
      page: 37,
      content:
        'Tabela 1 Energia kcal Proteína Lipídios Carboidrato Fibra Código e descrição do alimento 6400101 Batata-inglesa 2 Cozido(a) 86,00 1,71 0,10 20,01 2,05',
    };
    expect(classifyPdfPage(page).classification).toBe('FOOD_TABLE');
  });

  it('introdução → NARRATIVE', () => {
    const page = {
      page: 1,
      content:
        'Apresentação. Este documento descreve a metodologia da pesquisa de orçamentos familiares realizada no Brasil com objetivos estatísticos e sociais de longo prazo.'.repeat(
          3
        ),
    };
    expect(classifyPdfPage(page).classification).toBe('NARRATIVE');
  });

  it('document map agrupa ranges', () => {
    const map = buildDocumentFoodMap([
      { page: 1, content: 'Apresentação da pesquisa e objetivos principais do estudo nacional.'.repeat(4) },
      {
        page: 2,
        content:
          'Tabela 1 Energia Proteína Carboidrato Fibra Código alimento 6400101 Batata 1 Cru(a) 86,00 1,71 0,10 20,01 2,05',
      },
    ]);
    expect(map.ranges.length).toBeGreaterThanOrEqual(1);
    expect(map.complete).toBe(true);
    expect(map.pagesMapped).toBe(2);
  });

  it('mapa parcial marca complete=false até a última página', () => {
    const pages = [
      { page: 1, content: 'Apresentação da pesquisa e objetivos principais do estudo nacional.'.repeat(4) },
      {
        page: 2,
        content:
          'Tabela 1 Energia Proteína Carboidrato Fibra Código alimento 6400101 Batata 1 Cru(a) 86,00 1,71 0,10 20,01 2,05',
      },
      { page: 3, content: 'Referências bibliográficas e notas explicativas da fonte oficial.'.repeat(4) },
    ];
    const partial = buildDocumentFoodMapThrough(pages, 2, 3);
    expect(partial.complete).toBe(false);
    expect(partial.pagesMapped).toBe(2);
    expect(isDocumentFoodMapComplete(partial, 3)).toBe(false);
    const full = buildDocumentFoodMapThrough(pages, 3, 3);
    expect(full.complete).toBe(true);
    expect(summarizeDocumentFoodMap(full).tablePages).toBeGreaterThan(0);
  });

  it('complexidade HIGH → 1 página', () => {
    const dense = {
      page: 1,
      content: Array.from({ length: 80 }, (_, i) => `6400${i} Item ${i} 2 Cozido 10,00 1,00 0,10 2,00 0,50`).join(' '),
    };
    expect(maxPagesForComplexity(estimateChunkComplexity([dense]))).toBe(1);
  });
});

describe('ETAPA 03.2 — schema + foods contract', () => {
  it('parseFoodTableSchema preserva nutriente desconhecido', () => {
    const schema = parseFoodTableSchema(
      {
        tableType: 'MIXED',
        confidence: 0.9,
        columns: [
          {
            sourceHeader: 'Antocianinas totais',
            semanticType: 'nutrient',
            targetField: null,
            nutrientName: 'Antocianinas totais',
            unit: 'mg',
          },
        ],
      },
      's1'
    );
    expect(schema.columns[0].targetField).toBeNull();
    expect(schema.columns[0].nutrientName).toBe('Antocianinas totais');
  });

  it('aceita alimentos e normaliza para foods', () => {
    const parsed = extractJsonFromGeminiText(
      JSON.stringify({ alimentos: [{ nome: 'X' }] })
    );
    const payload = parseGeminiExtractionPayload(parsed);
    expect(payload.foods?.[0]?.nome).toBe('X');
  });

  it('JSON truncado recupera foods parciais', () => {
    const truncated =
      '{"document":{"page":1},"foods":[{"nome":"A"},{"nome":"B"},{"nome":"CORTADO"';
    const payload = parseGeminiExtractionPayload(extractJsonFromGeminiText(truncated));
    expect((payload.foods || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('ETAPA 03.2 — tabela + zero / fallback denso', () => {
  it('fallback denso extrai batata quando Gemini vazio', () => {
    const text =
      'Energia Proteína Carboidrato Fibra Código 6400101 Batata-inglesa 2 Cozido(a) 86,00 1,71 0,10 20,01 2,05';
    const foods = parseIbgeTabela1FromText(text);
    expect(foods[0]?.nome).toBe('Batata-inglesa');
    expect(foods[0]?.nutrientes?.energiaKcal).toBe(86);
  });
});
