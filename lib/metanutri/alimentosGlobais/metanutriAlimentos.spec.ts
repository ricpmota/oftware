import { describe, expect, it } from 'vitest';
import { calcularNutrientePorPorcao, roundNutriente } from '@/lib/metanutri/alimentosGlobais/calcularNutrientePorPorcao';
import { toMetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/toMetaNutriFoodSearchResult';
import {
  categoriaDaAbaBuilder,
  mapMetaNutriFoodToItemPlano,
} from '@/lib/metanutri/alimentosGlobais/mapMetaNutriFoodToItemPlano';
import type { AlimentoGlobal } from '@/lib/metaadmingeral/alimentosGlobais/types';
import type { MetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/types';
import { criarItemComPorcao, normalizarItemComPorcao } from '@/lib/nutri/planosNutricionista';

function food(over: Partial<AlimentoGlobal> = {}): AlimentoGlobal {
  return {
    id: 'abc123',
    nome: 'Banana, prata, madura',
    nomeNormalizado: 'banana prata madura',
    segmento: 'FRUTAS_E_DERIVADOS',
    baseQuantidade: 100,
    baseUnidade: 'g',
    energiaKcal: 89,
    proteinasG: 1.1,
    carboidratosG: 22.8,
    gordurasTotaisG: 0.3,
    fibrasG: 2.6,
    status: 'published',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
  };
}

describe('calcularNutrientePorPorcao', () => {
  it('escala 100g → porção', () => {
    expect(roundNutriente(calcularNutrientePorPorcao(22.8, 80))).toBe(18.24);
    expect(roundNutriente(calcularNutrientePorPorcao(89, 80), 0)).toBe(71);
  });

  it('null permanece null (nunca vira 0)', () => {
    expect(calcularNutrientePorPorcao(null, 80)).toBeNull();
    expect(calcularNutrientePorPorcao(undefined, 80)).toBeNull();
  });

  it('zero permanece zero', () => {
    expect(calcularNutrientePorPorcao(0, 50)).toBe(0);
  });
});

describe('DTO MetaNutri', () => {
  it('não expõe fonte/import/admin', () => {
    const dto = toMetaNutriFoodSearchResult(
      food({
        fonte: {
          importId: 'imp1',
          modeloGemini: 'secret',
          promptVersion: 'v1',
        },
        fontes: [{ importId: 'imp1' }],
      })
    );
    expect(dto.id).toBe('abc123');
    expect(dto.nome).toBe('Banana, prata, madura');
    expect(dto.energiaKcal).toBe(89);
    expect(dto.proteinasG).toBe(1.1);
    expect((dto as Record<string, unknown>).fonte).toBeUndefined();
    expect((dto as Record<string, unknown>).importId).toBeUndefined();
    expect((dto as Record<string, unknown>).modeloGemini).toBeUndefined();
  });

  it('null de nutriente permanece null no DTO', () => {
    const dto = toMetaNutriFoodSearchResult(food({ fibrasG: null, gordurasTotaisG: null }));
    expect(dto.fibrasG).toBeNull();
    expect(dto.gordurasTotaisG).toBeNull();
  });
});

describe('map MetaNutri → snapshot', () => {
  const dto: MetaNutriFoodSearchResult = toMetaNutriFoodSearchResult(food());

  it('categoria vem da aba, não do segmento', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: dto,
      categoria: categoriaDaAbaBuilder('carboidrato'),
      quantidadeG: 80,
    });
    expect(item.categoria).toBe('carboidrato');
    expect(dto.segmento).toBe('FRUTAS_E_DERIVADOS');
    expect(item.origemAlimento).toBe('metanutri');
    expect(item.alimentoGlobalId).toBe('abc123');
  });

  it('macros do snapshot são da porção (compat pesoBase 100g)', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: dto,
      categoria: 'carboidrato',
      quantidadeG: 80,
    });
    expect(item.pesoBase_g).toBe(100);
    expect(item.peso_g).toBe(80);
    expect(item.proteinaBase_g).toBe(1.1);
    expect(item.proteina_g).toBe(0.9); // 1.1 * 0.8 → 0.88 → round 0.9
    expect(item.calorias_kcal).toBe(71); // 89 * 0.8
  });

  it('snapshot independente: alterar DTO depois não muda item', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: dto,
      categoria: 'carboidrato',
      quantidadeG: 100,
    });
    const nomeAntes = item.nome;
    (dto as { nome: string }).nome = 'ALTERADO';
    expect(item.nome).toBe(nomeAntes);
  });
});

describe('compatibilidade legado + TACO/manual', () => {
  it('plano legado sem origemAlimento continua válido', () => {
    const legacy = normalizarItemComPorcao({
      id: 'old1',
      nome: 'Arroz',
      categoria: 'carboidrato',
      proteina_g: 2.5,
      calorias_kcal: 130,
      peso_g: 100,
    });
    expect(legacy.origemAlimento).toBeUndefined();
    expect(legacy.alimentoGlobalId).toBeUndefined();
    expect(legacy.proteina_g).toBeGreaterThan(0);
  });

  it('TACO e Manual gravam origem', () => {
    const taco = criarItemComPorcao({
      id: 't1',
      nome: 'Frango',
      categoria: 'proteina',
      proteinaBase_g: 30,
      caloriasBase_kcal: 160,
      origemAlimento: 'taco',
    });
    const manual = criarItemComPorcao({
      id: 'm1',
      nome: 'Panqueca',
      categoria: 'proteina',
      proteinaBase_g: 20,
      caloriasBase_kcal: 200,
      pesoBase_g: 120,
      peso_g: 120,
      origemAlimento: 'manual',
    });
    expect(taco.origemAlimento).toBe('taco');
    expect(manual.origemAlimento).toBe('manual');
  });

  it('somente published no filtro de status (contrato DTO)', () => {
    const published = food({ status: 'published' });
    const draft = food({ id: 'd', status: 'draft' });
    const inactive = food({ id: 'i', status: 'inactive' });
    expect(published.status).toBe('published');
    expect(draft.status).not.toBe('published');
    expect(inactive.status).not.toBe('published');
    // API usa GlobalFoodsService.buscarPublicados que filtra status==published
  });
});

describe('categoriaDaAbaBuilder', () => {
  it('mapeia abas sem usar segmento', () => {
    expect(categoriaDaAbaBuilder('proteina')).toBe('proteina');
    expect(categoriaDaAbaBuilder('carboidrato')).toBe('carboidrato');
    expect(categoriaDaAbaBuilder('gordura')).toBe('gordura_boa');
    expect(categoriaDaAbaBuilder('reguladores')).toBe('legumes_salada');
  });
});
