import { describe, expect, it } from 'vitest';
import { extractJsonFromGeminiText } from '@/lib/oftpay/extractGeminiJson';
import {
  normalizeExtractionItem,
  parseGeminiExtractionPayload,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/normalizeExtraction';
import { applyValidationAndDuplicates } from '@/lib/metaadmingeral/alimentosGlobais/importacao/validateExtraction';
import { findDuplicateMatches } from '@/lib/metaadmingeral/alimentosGlobais/importacao/detectDuplicates';
import {
  hasFoodTableSignals,
  parseIbgeTabela1FromText,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/parseIbgeTabela1';

const BATATA_LINE =
  '6400101 Batata-inglesa 2 Cozido(a) 86,00 1,71 0,10 20,01 2,05';

const PAGE_SNIPPET = `
Tabela 1 - Energia, macronutrientes e fibra na composição de alimentos por 100 gramas de parte comestível
Energia (kcal) Proteína (g) Lipídios totais (g) Carboidrato (g) Fibra alimentar total (g)
Código e descrição do alimento Código e descrição da preparação
6400101 Batata-inglesa 1 Cru(a) 86,00 1,71 0,10 20,01 2,05
6400101 Batata-inglesa 2 Cozido(a) 86,00 1,71 0,10 20,01 2,05
6400101 Batata-inglesa 5 Frito(a) 263,50 2,87 13,64 33,60 3,44
`;

describe('ETAPA 03.1 — fixture Batata-inglesa Cozido(a)', () => {
  it('parser IBGE extrai linha conhecida', () => {
    const foods = parseIbgeTabela1FromText(BATATA_LINE);
    expect(foods).toHaveLength(1);
    const f = foods[0];
    expect(f.codigoOriginal).toBe('6400101');
    expect(f.nome).toBe('Batata-inglesa');
    expect(f.preparo).toBe('Cozido(a)');
    expect(f.codigoPreparacao).toBe('2');
    expect(f.nutrientes?.energiaKcal).toBe(86);
    expect(f.nutrientes?.proteinasG).toBe(1.71);
    expect(f.nutrientes?.gordurasTotaisG).toBe(0.1);
    expect(f.nutrientes?.carboidratosG).toBe(20.01);
    expect(f.nutrientes?.fibrasG).toBe(2.05);
    expect(f.baseQuantidade).toBe(100);
    expect(f.baseUnidade).toBe('g');
  });

  it('normalize + validate → draft completo (não descarta)', () => {
    const raw = parseIbgeTabela1FromText(BATATA_LINE)[0];
    const normalized = normalizeExtractionItem({
      raw,
      importId: 'imp',
      loteId: 'p37_39',
      itemId: 'item1',
      documentBaseQty: 100,
      documentBaseUnit: 'g',
    });
    expect(normalized.codigoOriginal).toBe('6400101');
    expect(normalized.codigoPreparacao).toBe('2');
    expect(normalized.fonteIdentidade).toBe('IBGE:6400101:2');
    expect(normalized.nome).toBe('Batata-inglesa');
    expect(normalized.preparo).toBe('Cozido(a)');
    expect(normalized.energiaKcal).toBe(86);
    expect(normalized.proteinasG).toBe(1.71);
    expect(normalized.gordurasTotaisG).toBe(0.1);
    expect(normalized.carboidratosG).toBe(20.01);
    expect(normalized.fibrasG).toBe(2.05);
    expect(normalized.baseQuantidade).toBe(100);
    expect(normalized.baseUnidade).toBe('g');

    const draft = applyValidationAndDuplicates(normalized, []);
    // Sem segmento → ATTENTION, mas item permanece
    expect(draft.reviewStatus).not.toBe('IGNORE');
    expect(['OK', 'ATTENTION', 'REVIEW']).toContain(draft.reviewStatus);
  });
});

describe('ETAPA 03.1 — contrato Gemini foods vs alimentos', () => {
  it('aceita chave foods', () => {
    const payload = parseGeminiExtractionPayload({
      foods: [{ nome: 'Arroz', codigoOriginal: '1' }],
    });
    expect(payload.foods).toHaveLength(1);
  });

  it('aceita chave alimentos (resposta real divergente)', () => {
    const raw = extractJsonFromGeminiText(
      JSON.stringify({
        document: { page: 37, table: 'Tabela 1', baseQuantity: 100, baseUnit: 'g' },
        alimentos: [
          {
            codigoOriginal: '6400101',
            codigoPreparacao: '2',
            nome: 'Batata-inglesa',
            preparo: 'Cozido(a)',
            nutrientes: { energiaKcal: 86, proteinasG: 1.71 },
          },
        ],
      })
    );
    const payload = parseGeminiExtractionPayload(raw);
    expect(payload.foods).toHaveLength(1);
    expect(payload.foods?.[0]?.nome).toBe('Batata-inglesa');
  });

  it('recupera foods parciais de JSON truncado', () => {
    const truncated =
      '{"document":{"page":37},"foods":[{"nome":"A","codigoOriginal":"1"},{"nome":"B","codigoOriginal":"2"},{"nome":"CORTADO"';
    const parsed = extractJsonFromGeminiText(truncated);
    const payload = parseGeminiExtractionPayload(parsed);
    expect((payload.foods || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('ETAPA 03.1 — preparações distintas não deduplicam só por código', () => {
  it('Cru vs Cozido mesmo codigoOriginal = NÃO duplicata', () => {
    const foods = parseIbgeTabela1FromText(PAGE_SNIPPET);
    const cru = foods.find((f) => f.codigoPreparacao === '1')!;
    const cozido = foods.find((f) => f.codigoPreparacao === '2')!;
    const n1 = normalizeExtractionItem({
      raw: cru,
      importId: 'i',
      loteId: 'l',
      itemId: 'a',
    });
    const n2 = normalizeExtractionItem({
      raw: cozido,
      importId: 'i',
      loteId: 'l',
      itemId: 'b',
    });
    const matches = findDuplicateMatches({
      item: n2,
      importPeers: [
        {
          id: n1.id,
          nome: n1.nome,
          nomeNormalizado: n1.nomeNormalizado,
          codigoOriginal: n1.codigoOriginal,
          codigoPreparacao: n1.codigoPreparacao,
          preparo: n1.preparo,
        },
      ],
      globalPeers: [],
    });
    expect(matches).toHaveLength(0);
  });
});

describe('ETAPA 03.1 — sinais de tabela', () => {
  it('detecta sinais e extrai múltiplas linhas', () => {
    expect(hasFoodTableSignals(PAGE_SNIPPET)).toBe(true);
    const foods = parseIbgeTabela1FromText(PAGE_SNIPPET);
    expect(foods.length).toBe(3);
  });
});
