/**
 * Catálogo Opção 01 — fonte única (produção + auditoria).
 * V1 = legado pré-lote 01 · V2 = lote prioritário validado (ETAPA 11).
 */

import type { RefeicaoNutriKey } from '@/lib/nutri/distribuicaoMetasRefeicoes';
import type { ItemCatalogoMontagem } from '@/lib/nutri/montagemPratoPadrao';

export const CATALOGO_OPCAO_01_VERSAO = 2 as const;

export interface AtributosItemCatalogoNutri {
  vegetariano?: boolean;
  vegano?: boolean;
  semLactose?: boolean;
  semGluten?: boolean;
  ultraprocessado?: boolean;
  refeicoesPreferidas?: RefeicaoNutriKey[];
  refeicoesEvitar?: RefeicaoNutriKey[];
  /** Menor = mais prioritário no motor automático. */
  prioridadeBase?: number;
  grupoCompatibilidade?: string;
}

export type ItemCatalogoOpcao01 = ItemCatalogoMontagem & {
  atributos?: AtributosItemCatalogoNutri;
  carboidrato_g?: number;
  gordura_g?: number;
};

function item(
  partial: ItemCatalogoOpcao01
): ItemCatalogoOpcao01 {
  return partial;
}

/** Snapshot congelado V1 (auditoria / regressão). */
export const CATALOGO_OPCAO_01_V1: readonly ItemCatalogoOpcao01[] = [
  item({ id: 'prot_frango_100g', nome: 'Peito de frango grelhado (100g)', categoria: 'proteina', proteina_g: 31, calorias_kcal: 165, descricao: 'Peito de frango sem pele', atributos: { prioridadeBase: 10, grupoCompatibilidade: 'frango' } }),
  item({ id: 'prot_frango_150g', nome: 'Peito de frango grelhado (150g)', categoria: 'proteina', proteina_g: 46, calorias_kcal: 248, atributos: { prioridadeBase: 10, grupoCompatibilidade: 'frango' } }),
  item({ id: 'prot_carne_magra_100g', nome: 'Carne magra/patinho (100g)', categoria: 'proteina', proteina_g: 26, calorias_kcal: 200, atributos: { prioridadeBase: 20, grupoCompatibilidade: 'carne' } }),
  item({ id: 'prot_peixe_100g', nome: 'Peixe grelhado (100g)', categoria: 'proteina', proteina_g: 25, calorias_kcal: 150, atributos: { prioridadeBase: 10, grupoCompatibilidade: 'peixe' } }),
  item({ id: 'prot_ovos_2un', nome: '2 ovos inteiros', categoria: 'proteina', proteina_g: 12, calorias_kcal: 140, atributos: { vegetariano: true, prioridadeBase: 15, grupoCompatibilidade: 'ovos' } }),
  item({ id: 'prot_ovos_3un', nome: '3 ovos inteiros', categoria: 'proteina', proteina_g: 18, calorias_kcal: 210, atributos: { vegetariano: true, prioridadeBase: 15, grupoCompatibilidade: 'ovos' } }),
  item({ id: 'prot_claras_4un', nome: '4 claras de ovo', categoria: 'proteina', proteina_g: 14, calorias_kcal: 68, atributos: { vegetariano: true, prioridadeBase: 25, grupoCompatibilidade: 'ovos' } }),
  item({ id: 'prot_whey_1dose', nome: 'Whey protein (1 dose)', categoria: 'proteina', proteina_g: 25, calorias_kcal: 120, atributos: { vegetariano: true, prioridadeBase: 30, grupoCompatibilidade: 'whey', refeicoesPreferidas: ['cafe', 'lanche1', 'lanche2'], refeicoesEvitar: ['almoco', 'jantar'] } }),
  item({ id: 'prot_iogurte_proteico', nome: 'Iogurte proteico (170g)', categoria: 'proteina', proteina_g: 20, calorias_kcal: 150, atributos: { vegetariano: true, prioridadeBase: 20, grupoCompatibilidade: 'iogurte', refeicoesPreferidas: ['cafe', 'lanche1', 'lanche2'] } }),
  item({ id: 'prot_queijo_cottage', nome: 'Queijo cottage (100g)', categoria: 'proteina', proteina_g: 11, calorias_kcal: 98, atributos: { vegetariano: true, prioridadeBase: 25, grupoCompatibilidade: 'laticinios' } }),
  item({ id: 'prot_tofu_100g', nome: 'Tofu (100g)', categoria: 'proteina', proteina_g: 8, calorias_kcal: 76, atributos: { vegetariano: true, vegano: true, semLactose: true, prioridadeBase: 20, grupoCompatibilidade: 'tofu' } }),
  item({ id: 'prot_peito_peru', nome: 'Peito de peru (100g)', categoria: 'proteina', proteina_g: 30, calorias_kcal: 120, atributos: { ultraprocessado: true, prioridadeBase: 90, grupoCompatibilidade: 'peru' } }),
  item({ id: 'carb_arroz_integral_3col', nome: 'Arroz integral (3 colheres)', categoria: 'carboidrato', proteina_g: 3, calorias_kcal: 150, atributos: { vegetariano: true, vegano: true, semLactose: true } }),
  item({ id: 'carb_arroz_branco_3col', nome: 'Arroz branco (3 colheres)', categoria: 'carboidrato', proteina_g: 2, calorias_kcal: 140, atributos: { vegetariano: true, vegano: true, semLactose: true } }),
  item({ id: 'carb_batata_doce_1un', nome: 'Batata doce (1 unidade média)', categoria: 'carboidrato', proteina_g: 2, calorias_kcal: 180, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'carb_mandioca_100g', nome: 'Mandioca (100g)', categoria: 'carboidrato', proteina_g: 1, calorias_kcal: 160, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'carb_pao_integral_1fat', nome: 'Pão integral (1 fatia)', categoria: 'carboidrato', proteina_g: 3, calorias_kcal: 80, atributos: { vegetariano: true, vegano: true, semLactose: true } }),
  item({ id: 'carb_quinoa_3col', nome: 'Quinoa (3 colheres)', categoria: 'carboidrato', proteina_g: 4, calorias_kcal: 120, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'leg_salada_grande', nome: 'Prato cheio de salada e legumes', categoria: 'legumes_salada', proteina_g: 2, calorias_kcal: 50, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'leg_salada_media', nome: 'Meia porção de salada', categoria: 'legumes_salada', proteina_g: 1, calorias_kcal: 25, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'leg_legumes_cozidos', nome: 'Legumes cozidos variados', categoria: 'legumes_salada', proteina_g: 2, calorias_kcal: 60, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'gord_azeite_1col', nome: 'Azeite (1 colher de sopa)', categoria: 'gordura_boa', proteina_g: 0, calorias_kcal: 120, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'gord_castanhas_porcao', nome: 'Castanhas (porção pequena)', categoria: 'gordura_boa', proteina_g: 3, calorias_kcal: 100, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'extra_fruta_pequena', nome: 'Fruta pequena', categoria: 'extra', proteina_g: 0, calorias_kcal: 60, atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true } }),
  item({ id: 'extra_iogurte_extra', nome: 'Iogurte natural extra', categoria: 'extra', proteina_g: 5, calorias_kcal: 80, atributos: { vegetariano: true } }),
] as const;

/** Itens novos do Lote 01 (ETAPA 11). */
export const CATALOGO_OPCAO_01_LOTE_01: readonly ItemCatalogoOpcao01[] = [
  item({
    id: 'prot_tofu_150g',
    nome: 'Tofu (150g)',
    categoria: 'proteina',
    proteina_g: 9.8,
    calorias_kcal: 97,
    carboidrato_g: 3.2,
    gordura_g: 5.9,
    descricao: 'TACO Soja, queijo (tofu) ×1,5',
    atributos: { vegetariano: true, vegano: true, semLactose: true, prioridadeBase: 18, grupoCompatibilidade: 'tofu' },
  }),
  item({
    id: 'prot_tofu_200g',
    nome: 'Tofu (200g)',
    categoria: 'proteina',
    proteina_g: 13.1,
    calorias_kcal: 129,
    carboidrato_g: 4.3,
    gordura_g: 7.9,
    descricao: 'TACO Soja, queijo (tofu) ×2',
    atributos: { vegetariano: true, vegano: true, semLactose: true, prioridadeBase: 18, grupoCompatibilidade: 'tofu' },
  }),
  item({
    id: 'prot_proteina_vegetal',
    nome: 'Proteína vegetal em pó (1 dose)',
    categoria: 'proteina',
    proteina_g: 20,
    calorias_kcal: 110,
    carboidrato_g: 3,
    gordura_g: 2,
    descricao: 'Rótulo genérico · café/lanches',
    atributos: {
      vegetariano: true,
      vegano: true,
      semLactose: true,
      prioridadeBase: 28,
      grupoCompatibilidade: 'proteina_vegetal',
      refeicoesPreferidas: ['cafe', 'lanche1', 'lanche2'],
      refeicoesEvitar: ['almoco', 'jantar'],
    },
  }),
  item({
    id: 'prot_feijao_1concha',
    nome: 'Feijão carioca cozido (1 concha)',
    categoria: 'proteina',
    proteina_g: 4.8,
    calorias_kcal: 76,
    carboidrato_g: 13.6,
    gordura_g: 0.5,
    descricao: 'TACO Feijão carioca cozido · 100 g',
    atributos: {
      vegetariano: true,
      vegano: true,
      semLactose: true,
      semGluten: true,
      prioridadeBase: 35,
      grupoCompatibilidade: 'leguminosa',
      refeicoesPreferidas: ['almoco'],
      refeicoesEvitar: ['cafe', 'lanche1', 'lanche2'],
    },
  }),
  item({
    id: 'prot_lentilha_1concha',
    nome: 'Lentilha cozida (1 concha)',
    categoria: 'proteina',
    proteina_g: 6.3,
    calorias_kcal: 93,
    carboidrato_g: 16.3,
    gordura_g: 0.5,
    descricao: 'TACO Lentilha cozida · 100 g',
    atributos: {
      vegetariano: true,
      vegano: true,
      semLactose: true,
      semGluten: true,
      prioridadeBase: 35,
      grupoCompatibilidade: 'leguminosa',
      refeicoesPreferidas: ['almoco', 'jantar'],
      refeicoesEvitar: ['cafe', 'lanche1', 'lanche2'],
    },
  }),
  item({
    id: 'prot_grao_bico_1concha',
    nome: 'Grão-de-bico cozido (1 concha)',
    categoria: 'proteina',
    proteina_g: 8.5,
    calorias_kcal: 142,
    carboidrato_g: 23.2,
    gordura_g: 2.2,
    descricao: 'TACO Grão-de-bico cru ÷ rendimento 2,5',
    atributos: {
      vegetariano: true,
      vegano: true,
      semLactose: true,
      semGluten: true,
      prioridadeBase: 35,
      grupoCompatibilidade: 'leguminosa',
      refeicoesPreferidas: ['almoco', 'jantar'],
      refeicoesEvitar: ['cafe', 'lanche1', 'lanche2'],
    },
  }),
  item({
    id: 'prot_iogurte_sem_lactose',
    nome: 'Iogurte proteico sem lactose (170g)',
    categoria: 'proteina',
    proteina_g: 20,
    calorias_kcal: 150,
    carboidrato_g: 6,
    gordura_g: 2,
    descricao: 'Rótulo genérico · semLactose',
    atributos: {
      vegetariano: true,
      semLactose: true,
      prioridadeBase: 18,
      grupoCompatibilidade: 'iogurte',
      refeicoesPreferidas: ['cafe', 'lanche1', 'lanche2'],
      refeicoesEvitar: ['almoco', 'jantar'],
    },
  }),
  item({
    id: 'prot_whey_isolado_sl',
    nome: 'Whey isolado baixo lactose (1 dose)',
    categoria: 'proteina',
    proteina_g: 25,
    calorias_kcal: 110,
    carboidrato_g: 2,
    gordura_g: 1,
    descricao: 'Rótulo genérico · baixo lactose (não zero absoluto)',
    atributos: {
      vegetariano: true,
      semLactose: true,
      prioridadeBase: 32,
      grupoCompatibilidade: 'whey',
      refeicoesPreferidas: ['cafe', 'lanche1', 'lanche2'],
      refeicoesEvitar: ['almoco', 'jantar'],
    },
  }),
  item({
    id: 'prot_frango_120g',
    nome: 'Peito de frango grelhado (120g)',
    categoria: 'proteina',
    proteina_g: 38,
    calorias_kcal: 191,
    carboidrato_g: 0,
    gordura_g: 3,
    descricao: 'TACO peito sem pele grelhado ×1,2',
    atributos: { prioridadeBase: 8, grupoCompatibilidade: 'frango' },
  }),
  item({
    id: 'prot_peixe_150g',
    nome: 'Peixe grelhado (150g)',
    categoria: 'proteina',
    proteina_g: 38,
    calorias_kcal: 225,
    carboidrato_g: 0,
    gordura_g: 5,
    descricao: 'Proporção do peixe 100 g legado',
    atributos: { prioridadeBase: 8, grupoCompatibilidade: 'peixe' },
  }),
  item({
    id: 'prot_ovos_1un',
    nome: '1 ovo inteiro',
    categoria: 'proteina',
    proteina_g: 6,
    calorias_kcal: 70,
    carboidrato_g: 0,
    gordura_g: 5,
    descricao: 'Proporção ovos 2 un legado / TACO',
    atributos: { vegetariano: true, prioridadeBase: 16, grupoCompatibilidade: 'ovos' },
  }),
  item({
    id: 'prot_claras_2un',
    nome: '2 claras de ovo',
    categoria: 'proteina',
    proteina_g: 7,
    calorias_kcal: 34,
    carboidrato_g: 0,
    gordura_g: 0,
    descricao: 'Proporção claras 4 un legado / TACO',
    atributos: { vegetariano: true, prioridadeBase: 22, grupoCompatibilidade: 'ovos' },
  }),
  item({
    id: 'carb_arroz_branco_2col',
    nome: 'Arroz branco (2 colheres)',
    categoria: 'carboidrato',
    proteina_g: 1,
    calorias_kcal: 93,
    atributos: { vegetariano: true, vegano: true, semLactose: true },
  }),
  item({
    id: 'carb_arroz_branco_4col',
    nome: 'Arroz branco (4 colheres)',
    categoria: 'carboidrato',
    proteina_g: 3,
    calorias_kcal: 187,
    atributos: { vegetariano: true, vegano: true, semLactose: true },
  }),
  item({
    id: 'carb_arroz_integral_2col',
    nome: 'Arroz integral (2 colheres)',
    categoria: 'carboidrato',
    proteina_g: 2,
    calorias_kcal: 100,
    atributos: { vegetariano: true, vegano: true, semLactose: true },
  }),
  item({
    id: 'carb_arroz_integral_4col',
    nome: 'Arroz integral (4 colheres)',
    categoria: 'carboidrato',
    proteina_g: 4,
    calorias_kcal: 200,
    atributos: { vegetariano: true, vegano: true, semLactose: true },
  }),
  item({
    id: 'carb_batata_doce_meia',
    nome: 'Batata-doce (meia unidade)',
    categoria: 'carboidrato',
    proteina_g: 1,
    calorias_kcal: 90,
    atributos: { vegetariano: true, vegano: true, semLactose: true, semGluten: true },
  }),
] as const;

export const CATALOGO_OPCAO_01_V2: readonly ItemCatalogoOpcao01[] = [
  ...CATALOGO_OPCAO_01_V1,
  ...CATALOGO_OPCAO_01_LOTE_01,
];

/** Catálogo atual de produção. */
export const CATALOGO_OPCAO_01_ATUAL = CATALOGO_OPCAO_01_V2;

export const IDS_CATALOGO_OPCAO_01_V1: readonly string[] = CATALOGO_OPCAO_01_V1.map((i) => i.id);
export const IDS_CATALOGO_OPCAO_01_V2: readonly string[] = CATALOGO_OPCAO_01_V2.map((i) => i.id);
export const IDS_LOTE_01: readonly string[] = CATALOGO_OPCAO_01_LOTE_01.map((i) => i.id);

export function obterCatalogoPorVersao(versao: 1 | 2): readonly ItemCatalogoOpcao01[] {
  return versao === 1 ? CATALOGO_OPCAO_01_V1 : CATALOGO_OPCAO_01_V2;
}

/**
 * Filtro por restrições usando atributos quando disponíveis (fallback por nome).
 */
export function filtrarCatalogoOpcao01PorRestricoes(
  itens: readonly ItemCatalogoOpcao01[],
  restricoes: string[]
): ItemCatalogoOpcao01[] {
  return itens.filter((item) => {
    const a = item.atributos;
    const nomeLower = item.nome.toLowerCase();
    const id = item.id.toLowerCase();

    if (restricoes.includes('vegano')) {
      if (a?.vegano === true) return true;
      if (a?.vegano === false) return false;
      if (
        nomeLower.includes('frango') ||
        nomeLower.includes('carne') ||
        nomeLower.includes('peixe') ||
        nomeLower.includes('ovos') ||
        nomeLower.includes('ovo ') ||
        id.includes('ovos') ||
        id.includes('claras') ||
        nomeLower.includes('queijo') ||
        nomeLower.includes('iogurte') ||
        nomeLower.includes('whey') ||
        nomeLower.includes('peru') ||
        nomeLower.includes('clara')
      ) {
        return false;
      }
    } else if (restricoes.includes('vegetariano')) {
      if (a?.vegetariano === false) return false;
      if (
        nomeLower.includes('frango') ||
        nomeLower.includes('carne') ||
        nomeLower.includes('peixe') ||
        nomeLower.includes('peru')
      ) {
        return false;
      }
    }

    if (restricoes.includes('intolerância lactose')) {
      if (a?.semLactose === true) return true;
      if (id.includes('whey') && !id.includes('isolado_sl')) return false;
      if (nomeLower.includes('queijo') && !nomeLower.includes('sem lactose')) return false;
      if (nomeLower.includes('iogurte') && !nomeLower.includes('sem lactose')) return false;
    }

    if (restricoes.includes('sem glúten')) {
      if (a?.semGluten === true) return true;
      if (
        (nomeLower.includes('pão') || nomeLower.includes('trigo')) &&
        !nomeLower.includes('sem glúten') &&
        !nomeLower.includes('sem gluten')
      ) {
        return false;
      }
    }

    return true;
  });
}

/** Disponibilidade por refeição (espelha builder + lote 01). */
export function itensDisponiveisCatalogoPorRefeicao(
  refeicao: RefeicaoNutriKey,
  restricoes: string[],
  catalogo: readonly ItemCatalogoOpcao01[] = CATALOGO_OPCAO_01_ATUAL
): ItemCatalogoOpcao01[] {
  const filtrados = filtrarCatalogoOpcao01PorRestricoes(catalogo, restricoes);
  const proteinas = filtrados.filter((i) => i.categoria === 'proteina');
  const carbs = filtrados.filter((i) => i.categoria === 'carboidrato');
  const legumes = filtrados.filter((i) => i.categoria === 'legumes_salada');
  const gorduras = filtrados.filter((i) => i.categoria === 'gordura_boa');
  const extras = filtrados.filter((i) => i.categoria === 'extra');

  const proteinaLancheOk = (p: ItemCatalogoOpcao01) => {
    const id = p.id;
    const pref = p.atributos?.refeicoesPreferidas;
    if (pref && !pref.includes(refeicao) && p.atributos?.refeicoesEvitar?.includes(refeicao)) {
      return false;
    }
    return (
      id.includes('whey') ||
      id.includes('iogurte') ||
      id.includes('ovos') ||
      id.includes('claras') ||
      id.includes('proteina_vegetal') ||
      id.includes('cottage')
    );
  };

  if (refeicao === 'lanche1' || refeicao === 'lanche2') {
    return [...proteinas.filter(proteinaLancheOk), ...extras, ...gorduras.filter((g) => g.id.includes('castanhas'))];
  }

  const proteinasRefeicao = proteinas.filter((p) => {
    // Leguminosas fora do café (volume/naturalidade)
    if (refeicao === 'cafe' && p.atributos?.grupoCompatibilidade === 'leguminosa') {
      return false;
    }
    // whey/iogurte/proteína vegetal permanecem disponíveis em almoço/jantar
    // como último recurso (ordenação do motor via família/prioridade).
    return true;
  });

  if (refeicao === 'almoco' || refeicao === 'jantar') {
    return [...proteinasRefeicao, ...carbs, ...legumes, ...gorduras];
  }
  return [...proteinasRefeicao, ...carbs, ...legumes, ...gorduras, ...extras];
}
