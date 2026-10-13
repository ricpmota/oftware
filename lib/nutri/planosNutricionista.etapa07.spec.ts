import { describe, expect, it } from 'vitest';
import {
  aplicarPorcaoItem,
  calcularCoberturaNutricionalPlano,
  calcularTotaisNutricionaisPlano,
  clonarItensComNovosIds,
  criarItemComPorcao,
  criarRefeicaoPlanoVazia,
  criarRefeicoesPlanoVazias,
  normalizarItemComPorcao,
  recalcularMacrosRefeicaoPlano,
  type ItemPlanoRefeicao,
  type NutriPlanoCardapioTemplate,
} from '@/lib/nutri/planosNutricionista';
import { mapMetaNutriFoodToItemPlano } from '@/lib/metanutri/alimentosGlobais/mapMetaNutriFoodToItemPlano';
import type { MetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/types';

const metaFood: MetaNutriFoodSearchResult = {
  id: 'abc',
  nome: 'Banana, prata, madura',
  segmento: 'FRUTAS_E_DERIVADOS',
  energiaKcal: 128,
  proteinasG: 2.5,
  carboidratosG: 28,
  gordurasTotaisG: 0.3,
  fibrasG: 1.6,
  baseQuantidade: 100,
  baseUnidade: 'g',
  porcoes: [],
};

describe('ETAPA 07 — METANUTRI porção', () => {
  it('100g → 150g escala P/C/G/F/kcal', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 150,
    });
    expect(item.pesoBase_g).toBe(100);
    expect(item.peso_g).toBe(150);
    expect(item.proteinaBase_g).toBe(2.5);
    expect(item.carboidratoBase_g).toBe(28);
    expect(item.gorduraBase_g).toBe(0.3);
    expect(item.fibraBase_g).toBe(1.6);
    expect(item.proteina_g).toBe(3.8); // 2.5 * 1.5 = 3.75 → 3.8
    expect(item.carboidrato_g).toBe(42);
    expect(item.gordura_g).toBe(0.5); // 0.45 → 0.5
    expect(item.fibra_g).toBe(2.4);
    expect(item.calorias_kcal).toBe(192);
    expect(item.origemAlimento).toBe('metanutri');
    expect(item.alimentoGlobalId).toBe('abc');
  });

  it('null da fonte → undefined (não vira 0)', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: { ...metaFood, fibrasG: null, gordurasTotaisG: null },
      categoria: 'carboidrato',
      quantidadeG: 100,
    });
    expect(item.fibra_g).toBeUndefined();
    expect(item.fibraBase_g).toBeUndefined();
    expect(item.gordura_g).toBeUndefined();
    expect(item.carboidrato_g).toBe(28);
  });

  it('zero da fonte permanece zero', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: { ...metaFood, fibrasG: 0 },
      categoria: 'carboidrato',
      quantidadeG: 100,
    });
    expect(item.fibraBase_g).toBe(0);
    expect(item.fibra_g).toBe(0);
  });
});

describe('ETAPA 07 — TACO / Manual / legado', () => {
  it('TACO grava C/G; fibra undefined', () => {
    const item = criarItemComPorcao({
      id: 't1',
      nome: 'Arroz',
      categoria: 'carboidrato',
      proteinaBase_g: 2.5,
      caloriasBase_kcal: 130,
      carboidratoBase_g: 28,
      gorduraBase_g: 0.3,
      pesoBase_g: 100,
      peso_g: 100,
      origemAlimento: 'taco',
    });
    expect(item.carboidrato_g).toBe(28);
    expect(item.gordura_g).toBe(0.3);
    expect(item.fibra_g).toBeUndefined();
  });

  it('Manual legado só P/kcal funciona', () => {
    const item = criarItemComPorcao({
      id: 'm1',
      nome: 'Panqueca',
      categoria: 'proteina',
      proteinaBase_g: 20,
      caloriasBase_kcal: 200,
      pesoBase_g: 120,
      peso_g: 120,
      origemAlimento: 'manual',
    });
    expect(item.proteina_g).toBe(20);
    expect(item.calorias_kcal).toBe(200);
    expect(item.carboidrato_g).toBeUndefined();
  });

  it('plano antigo sem C/G/F normaliza e edita porção', () => {
    const legacy: ItemPlanoRefeicao = {
      id: 'old',
      nome: 'Frango',
      categoria: 'proteina',
      proteina_g: 30,
      calorias_kcal: 160,
      peso_g: 100,
    };
    const n = normalizarItemComPorcao(legacy);
    expect(n.proteina_g).toBe(30);
    expect(n.carboidrato_g).toBeUndefined();
    const edited = normalizarItemComPorcao({ ...n, peso_g: 150 });
    expect(edited.proteina_g).toBe(45);
    expect(edited.calorias_kcal).toBe(240);
    expect(edited.carboidrato_g).toBeUndefined();
  });
});

describe('ETAPA 07 — totais e cobertura', () => {
  it('refeição e dia somam nutrientes conhecidos', () => {
    const a = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 100,
      refeicaoKey: 'cafe',
    });
    const b = criarItemComPorcao({
      id: 'legacy',
      nome: 'Ovo',
      categoria: 'proteina',
      proteinaBase_g: 6,
      caloriasBase_kcal: 70,
      pesoBase_g: 50,
      peso_g: 50,
      origemAlimento: 'legacy',
    });
    const refeicao = recalcularMacrosRefeicaoPlano({
      ...criarRefeicaoPlanoVazia(),
      itens: [a, b],
      itensSelecionados: [a.id, b.id],
    });
    expect(refeicao.proteina_g).toBe(8.5);
    expect(refeicao.calorias_kcal).toBe(198);
    expect(refeicao.carboidrato_g).toBe(28);
    expect(refeicao.gordura_g).toBe(0.3);
    expect(refeicao.fibra_g).toBe(1.6);

    const refs = criarRefeicoesPlanoVazias();
    refs.cafe = refeicao;
    const totais = calcularTotaisNutricionaisPlano(refs);
    expect(totais.calorias_kcal).toBe(198);
    expect(totais.carboidrato_g).toBe(28);

    const cob = calcularCoberturaNutricionalPlano(refs);
    expect(cob.proteina).toEqual({ conhecidos: 2, total: 2 });
    expect(cob.carboidrato).toEqual({ conhecidos: 1, total: 2 });
    expect(cob.fibra).toEqual({ conhecidos: 1, total: 2 });
  });

  it('clonar template preserva C/G/F e rastreabilidade', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 80,
    });
    const cloned = clonarItensComNovosIds(
      {
        ...criarRefeicaoPlanoVazia(),
        itens: [item],
        itensSelecionados: [item.id],
      },
      'imp_cafe'
    );
    const c = cloned.itens[0];
    expect(c.id).not.toBe(item.id);
    expect(c.carboidrato_g).toBe(item.carboidrato_g);
    expect(c.alimentoGlobalId).toBe('abc');
    expect(c.origemAlimento).toBe('metanutri');
  });
});

describe('ETAPA 07 — fixtures regressão', () => {
  it('A legado B TACO C Manual D METANUTRI E misto', () => {
    const legado = normalizarItemComPorcao({
      id: 'a',
      nome: 'Legado',
      categoria: 'proteina',
      proteina_g: 10,
      calorias_kcal: 50,
    });
    const taco = criarItemComPorcao({
      id: 'b',
      nome: 'TACO',
      categoria: 'carboidrato',
      proteinaBase_g: 2,
      caloriasBase_kcal: 100,
      carboidratoBase_g: 20,
      gorduraBase_g: 1,
      origemAlimento: 'taco',
    });
    const manual = criarItemComPorcao({
      id: 'c',
      nome: 'Manual',
      categoria: 'proteina',
      proteinaBase_g: 15,
      caloriasBase_kcal: 120,
      pesoBase_g: 100,
      peso_g: 100,
      origemAlimento: 'manual',
    });
    const metanutri = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 100,
    });

    for (const item of [legado, taco, manual, metanutri]) {
      const n = normalizarItemComPorcao(item);
      expect(n.proteina_g).toBeGreaterThanOrEqual(0);
      expect(n.calorias_kcal).toBeGreaterThanOrEqual(0);
      const scaled = aplicarPorcaoItem({ ...n, peso_g: (n.peso_g || 100) * 2 });
      expect(scaled.proteina_g).toBeCloseTo((n.proteinaBase_g || n.proteina_g) * 2 * ((n.quantidade || 1)), 0);
    }

    const misto = recalcularMacrosRefeicaoPlano({
      ...criarRefeicaoPlanoVazia(),
      itens: [legado, taco, manual, metanutri],
      itensSelecionados: [legado.id, taco.id, manual.id, metanutri.id],
    });
    expect(misto.itens).toHaveLength(4);
    expect(misto.carboidrato_g).toBeDefined();
  });
});
