import { describe, expect, it } from 'vitest';
import {
  clonarItensComNovosIds,
  criarItemComPorcao,
  criarRefeicaoPlanoVazia,
  normalizarItemComPorcao,
  type ItemPlanoRefeicao,
} from '@/lib/nutri/planosNutricionista';
import {
  itemPlanoParaItemRefeicaoSnapshot,
  itemRefeicaoSnapshotParaPlano,
} from '@/lib/nutri/itemRefeicaoSnapshot';
import { mapMetaNutriFoodToItemPlano } from '@/lib/metanutri/alimentosGlobais/mapMetaNutriFoodToItemPlano';
import type { MetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/types';
import {
  CATALOGO_OPCAO_01_ATUAL,
  IDS_CATALOGO_OPCAO_01_V2,
} from '@/lib/nutri/catalogoOpcao01';

const metaFood: MetaNutriFoodSearchResult = {
  id: 'banana-prata',
  nome: 'Banana, prata, madura',
  segmento: 'FRUTAS_E_DERIVADOS',
  energiaKcal: 89,
  proteinasG: 1.1,
  carboidratosG: 22.8,
  gordurasTotaisG: 0.3,
  fibrasG: 2.6,
  baseQuantidade: 100,
  baseUnidade: 'g',
  porcoes: [{ id: 'u1', nome: '1 unidade média', quantidadeG: 86 }],
};

function omitUndefinedDeep<T>(value: T): T {
  if (value === undefined) return value;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) continue;
    out[key] = omitUndefinedDeep(nested);
  }
  return out as T;
}

function roundTripCustom(itens: ItemPlanoRefeicao[]) {
  const payload = omitUndefinedDeep({
    itensCustomizadosPorRefeicao: { almoco: itens.map(itemPlanoParaItemRefeicaoSnapshot) },
  });
  const json = JSON.parse(JSON.stringify(payload));
  return (json.itensCustomizadosPorRefeicao.almoco as ReturnType<
    typeof itemPlanoParaItemRefeicaoSnapshot
  >[]).map((item) => itemRefeicaoSnapshotParaPlano(item));
}

describe('ETAPA 08 — METANUTRI → Cardápio', () => {
  it('categoria vem da aba, não do segmento', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 100,
      refeicaoKey: 'almoco',
    });
    expect(item.categoria).toBe('carboidrato');
    expect(item.origemAlimento).toBe('metanutri');
    expect(item.alimentoGlobalId).toBe('banana-prata');
    expect(item.proteina_g).toBe(1.1);
    expect(item.carboidrato_g).toBe(22.8);
    expect(item.gordura_g).toBe(0.3);
    expect(item.fibra_g).toBe(2.6);
    expect(item.calorias_kcal).toBe(89);
  });

  it('porção resolve peso_g e escala macros', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 86,
      unidade: '1 unidade média',
      refeicaoKey: 'almoco',
    });
    expect(item.peso_g).toBe(86);
    expect(item.unidade).toBe('1 unidade média');
    expect(item.proteina_g).toBe(0.9); // 1.1 * 0.86
    expect(item.carboidrato_g).toBe(19.6);
  });

  it('snapshot no cardápio persiste após serialização', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 150,
      refeicaoKey: 'almoco',
    });
    const [loaded] = roundTripCustom([item]);
    expect(loaded.alimentoGlobalId).toBe('banana-prata');
    expect(loaded.origemAlimento).toBe('metanutri');
    expect(loaded.carboidrato_g).toBe(item.carboidrato_g);
    expect(loaded.gordura_g).toBe(item.gordura_g);
    expect(loaded.fibra_g).toBe(item.fibra_g);
    expect(loaded.carboidratoBase_g).toBe(22.8);
    expect(loaded.pesoBase_g).toBe(100);
  });
});

describe('ETAPA 08 — TACO / Manual', () => {
  it('TACO preserva P/C/G/kcal; fibra undefined', () => {
    const item = criarItemComPorcao({
      id: 'taco_almoco_1',
      nome: 'Frango grelhado',
      categoria: 'proteina',
      proteinaBase_g: 32,
      caloriasBase_kcal: 165,
      carboidratoBase_g: 0,
      gorduraBase_g: 3.6,
      pesoBase_g: 100,
      peso_g: 120,
      origemAlimento: 'taco',
    });
    const [loaded] = roundTripCustom([item]);
    expect(loaded.origemAlimento).toBe('taco');
    expect(loaded.proteina_g).toBe(38.4);
    expect(loaded.carboidrato_g).toBe(0);
    expect(loaded.gordura_g).toBe(4.3);
    expect(loaded.fibra_g).toBeUndefined();
    expect(loaded.calorias_kcal).toBe(198);
  });

  it('Manual com opcionais e sem opcionais', () => {
    const comOpc = criarItemComPorcao({
      id: 'manual_1',
      nome: 'Panqueca',
      categoria: 'proteina',
      proteinaBase_g: 20,
      caloriasBase_kcal: 250,
      carboidratoBase_g: 15,
      gorduraBase_g: 8,
      fibraBase_g: 2,
      pesoBase_g: 100,
      peso_g: 100,
      origemAlimento: 'manual',
    });
    const semOpc = criarItemComPorcao({
      id: 'manual_2',
      nome: 'Shake',
      categoria: 'proteina',
      proteinaBase_g: 25,
      caloriasBase_kcal: 120,
      pesoBase_g: 30,
      peso_g: 30,
      origemAlimento: 'manual',
    });
    const [a, b] = roundTripCustom([comOpc, semOpc]);
    expect(a.origemAlimento).toBe('manual');
    expect(a.carboidrato_g).toBe(15);
    expect(a.fibra_g).toBe(2);
    expect(b.origemAlimento).toBe('manual');
    expect(b.carboidrato_g).toBeUndefined();
    expect(b.gordura_g).toBeUndefined();
    expect(b.fibra_g).toBeUndefined();
  });
});

describe('ETAPA 08 — Legado / Importar / Porção', () => {
  it('cardápio legado (só P/kcal) carrega e salva', () => {
    const legado: ItemPlanoRefeicao = {
      id: 'cat_arroz',
      nome: 'Arroz',
      categoria: 'carboidrato',
      proteina_g: 2.5,
      calorias_kcal: 130,
      peso_g: 100,
    };
    const [loaded] = roundTripCustom([legado]);
    expect(loaded.proteina_g).toBe(2.5);
    expect(loaded.calorias_kcal).toBe(130);
    expect(loaded.carboidrato_g).toBeUndefined();
    expect(loaded.origemAlimento).toBeUndefined();
  });

  it('Importar de Planos preserva snapshot completo', () => {
    const meta = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 100,
      refeicaoKey: 'cafe',
    });
    const refeicao = {
      ...criarRefeicaoPlanoVazia(),
      itens: [meta],
      itensSelecionados: [meta.id],
    };
    const clonada = clonarItensComNovosIds(refeicao, 'imp');
    const [item] = clonada.itens.map(itemPlanoParaItemRefeicaoSnapshot);
    expect(item.origemAlimento).toBe('metanutri');
    expect(item.alimentoGlobalId).toBe('banana-prata');
    expect(item.fibra_g).toBe(2.6);
    expect(item.carboidratoBase_g).toBe(22.8);
    expect(item.id).not.toBe(meta.id);
  });

  it('editar porção recalcula P/C/G/F/kcal', () => {
    const base = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 100,
    });
    const edited = normalizarItemComPorcao({ ...base, peso_g: 200, quantidade: 1 });
    expect(edited.proteina_g).toBe(2.2);
    expect(edited.carboidrato_g).toBe(45.6);
    expect(edited.gordura_g).toBe(0.6);
    expect(edited.fibra_g).toBe(5.2);
    expect(edited.calorias_kcal).toBe(178);
  });

  it('null/undefined não vira 0 nos novos campos', () => {
    const item = mapMetaNutriFoodToItemPlano({
      food: { ...metaFood, fibrasG: null, gordurasTotaisG: null },
      categoria: 'carboidrato',
      quantidadeG: 100,
    });
    const snap = itemPlanoParaItemRefeicaoSnapshot(item);
    const payload = omitUndefinedDeep(snap);
    expect('fibra_g' in (payload as object)).toBe(false);
    expect('gordura_g' in (payload as object)).toBe(false);
    const reloaded = itemRefeicaoSnapshotParaPlano(
      JSON.parse(JSON.stringify(payload))
    );
    expect(reloaded.fibra_g).toBeUndefined();
    expect(reloaded.gordura_g).toBeUndefined();
    expect(reloaded.carboidrato_g).toBe(22.8);
  });
});

describe('ETAPA 08 — fixtures mistas + Opção 01 intacta', () => {
  it('paciente misto: legado + TACO + METANUTRI roundtrip', () => {
    const legado = criarItemComPorcao({
      id: 'legado_1',
      nome: 'Ovo',
      categoria: 'proteina',
      proteinaBase_g: 13,
      caloriasBase_kcal: 155,
      pesoBase_g: 100,
      peso_g: 50,
    });
    // simula legado sem origem/C/G/F
    const legadoLimpo: ItemPlanoRefeicao = {
      id: legado.id,
      nome: legado.nome,
      categoria: legado.categoria,
      proteina_g: legado.proteina_g,
      calorias_kcal: legado.calorias_kcal,
      peso_g: legado.peso_g,
      proteinaBase_g: legado.proteinaBase_g,
      caloriasBase_kcal: legado.caloriasBase_kcal,
      pesoBase_g: legado.pesoBase_g,
      quantidade: 1,
    };
    const taco = criarItemComPorcao({
      id: 'taco_1',
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
    const meta = mapMetaNutriFoodToItemPlano({
      food: metaFood,
      categoria: 'carboidrato',
      quantidadeG: 100,
    });
    const loaded = roundTripCustom([legadoLimpo, taco, meta]);
    expect(loaded).toHaveLength(3);
    expect(loaded[0].origemAlimento).toBeUndefined();
    expect(loaded[0].carboidrato_g).toBeUndefined();
    expect(loaded[1].origemAlimento).toBe('taco');
    expect(loaded[1].carboidrato_g).toBe(28);
    expect(loaded[2].origemAlimento).toBe('metanutri');
    expect(loaded[2].alimentoGlobalId).toBe('banana-prata');
  });

  it('CATALOGO_OPCAO_01_ATUAL permanece a fonte da geração (fingerprint)', () => {
    expect(CATALOGO_OPCAO_01_ATUAL.length).toBe(IDS_CATALOGO_OPCAO_01_V2.length);
    expect(IDS_CATALOGO_OPCAO_01_V2[0]).toBe(CATALOGO_OPCAO_01_ATUAL[0].id);
    // Geração automática não passa por alimentos_globais — contrato desta etapa
    expect(CATALOGO_OPCAO_01_ATUAL.every((i) => !('alimentoGlobalId' in i))).toBe(true);
  });
});
