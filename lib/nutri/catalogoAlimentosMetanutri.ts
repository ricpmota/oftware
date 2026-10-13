/**
 * Catálogo curado da página Alimentos (MetaNutri).
 * Regra: 1 alimento = 1 porção-base (1 ovo, 1 colher, 100g, 1 dose…).
 * Multiplicação fica no campo Quantidade ao montar o plano/receita.
 */

import type { CategoriaItemPlano, RefeicaoPlanoKey } from '@/lib/nutri/planosNutricionista';

export type GrupoAlimentoRefeicao = RefeicaoPlanoKey;

export interface ItemCatalogoAlimentosMetanutri {
  id: string;
  nome: string;
  categoria: CategoriaItemPlano;
  /** Peso da porção-base em gramas. */
  peso_g: number;
  proteina_g: number;
  calorias_kcal: number;
  /** Rótulo da unidade da quantidade (Unidade, Colher, Dose…). */
  unidade: string;
  grupos: GrupoAlimentoRefeicao[];
  descricao?: string;
}

const TODOS: GrupoAlimentoRefeicao[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
const CAFE_LANCHES: GrupoAlimentoRefeicao[] = ['cafe', 'lanche1', 'lanche2'];
const ALMOCO_JANTAR: GrupoAlimentoRefeicao[] = ['almoco', 'jantar'];
const ALMOCO: GrupoAlimentoRefeicao[] = ['almoco'];

/**
 * IDs antigos/duplicados que devem sair da base do nutricionista na sincronização.
 * (Variantes de porção — agora resolvidas por quantidade/peso.)
 */
export const IDS_ALIMENTOS_DEPRECADOS: readonly string[] = [
  'prot_frango_120g',
  'prot_frango_150g',
  'prot_peixe_150g',
  'prot_ovos_2un',
  'prot_ovos_3un',
  'prot_claras_2un',
  'prot_claras_4un',
  'prot_tofu_150g',
  'prot_tofu_200g',
  'carb_arroz_branco_2col',
  'carb_arroz_branco_3col',
  'carb_arroz_branco_4col',
  'carb_arroz_integral_2col',
  'carb_arroz_integral_3col',
  'carb_arroz_integral_4col',
  'carb_quinoa_3col',
  'carb_batata_doce_meia',
] as const;

/**
 * Lista oficial da página Alimentos.
 * Macros referem-se exatamente ao peso_g / 1 unidade indicados.
 */
export const CATALOGO_ALIMENTOS_METANUTRI: readonly ItemCatalogoAlimentosMetanutri[] = [
  // —— Proteínas ——
  {
    id: 'prot_frango_100g',
    nome: 'Peito de frango grelhado',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 31,
    calorias_kcal: 165,
    unidade: 'g',
    grupos: TODOS,
    descricao: 'Porção-base 100g. Ajuste o peso na receita.',
  },
  {
    id: 'prot_carne_magra_100g',
    nome: 'Carne magra/patinho',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 26,
    calorias_kcal: 200,
    unidade: 'g',
    grupos: ALMOCO_JANTAR,
  },
  {
    id: 'prot_peixe_100g',
    nome: 'Peixe grelhado',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 25,
    calorias_kcal: 150,
    unidade: 'g',
    grupos: ALMOCO_JANTAR,
  },
  {
    id: 'prot_ovos_1un',
    nome: 'Ovo inteiro',
    categoria: 'proteina',
    peso_g: 50,
    proteina_g: 6,
    calorias_kcal: 70,
    unidade: 'Unidade',
    grupos: TODOS,
    descricao: '1 ovo (~50g). Use Quantidade para 2, 3… ovos.',
  },
  {
    id: 'prot_clara_1un',
    nome: 'Clara de ovo',
    categoria: 'proteina',
    peso_g: 33,
    proteina_g: 3.5,
    calorias_kcal: 17,
    unidade: 'Unidade',
    grupos: TODOS,
    descricao: '1 clara (~33g). Use Quantidade para várias claras.',
  },
  {
    id: 'prot_whey_1dose',
    nome: 'Whey protein',
    categoria: 'proteina',
    peso_g: 30,
    proteina_g: 25,
    calorias_kcal: 120,
    unidade: 'Dose',
    grupos: CAFE_LANCHES,
  },
  {
    id: 'prot_whey_isolado_sl',
    nome: 'Whey isolado baixo lactose',
    categoria: 'proteina',
    peso_g: 30,
    proteina_g: 25,
    calorias_kcal: 110,
    unidade: 'Dose',
    grupos: CAFE_LANCHES,
  },
  {
    id: 'prot_proteina_vegetal',
    nome: 'Proteína vegetal em pó',
    categoria: 'proteina',
    peso_g: 30,
    proteina_g: 20,
    calorias_kcal: 110,
    unidade: 'Dose',
    grupos: CAFE_LANCHES,
  },
  {
    id: 'prot_iogurte_proteico',
    nome: 'Iogurte proteico',
    categoria: 'proteina',
    peso_g: 170,
    proteina_g: 20,
    calorias_kcal: 150,
    unidade: 'Unidade',
    grupos: CAFE_LANCHES,
  },
  {
    id: 'prot_iogurte_sem_lactose',
    nome: 'Iogurte proteico sem lactose',
    categoria: 'proteina',
    peso_g: 170,
    proteina_g: 20,
    calorias_kcal: 150,
    unidade: 'Unidade',
    grupos: CAFE_LANCHES,
  },
  {
    id: 'prot_queijo_cottage',
    nome: 'Queijo cottage',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 11,
    calorias_kcal: 98,
    unidade: 'g',
    grupos: CAFE_LANCHES,
  },
  {
    id: 'prot_tofu_100g',
    nome: 'Tofu',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 8,
    calorias_kcal: 76,
    unidade: 'g',
    grupos: TODOS,
  },
  {
    id: 'prot_peito_peru',
    nome: 'Peito de peru',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 30,
    calorias_kcal: 120,
    unidade: 'g',
    grupos: CAFE_LANCHES,
  },
  {
    id: 'prot_feijao_1concha',
    nome: 'Feijão carioca cozido',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 4.8,
    calorias_kcal: 76,
    unidade: 'Concha',
    grupos: ALMOCO,
    descricao: '1 concha ≈ 100g cozido.',
  },
  {
    id: 'prot_lentilha_1concha',
    nome: 'Lentilha cozida',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 6.3,
    calorias_kcal: 93,
    unidade: 'Concha',
    grupos: ALMOCO_JANTAR,
  },
  {
    id: 'prot_grao_bico_1concha',
    nome: 'Grão-de-bico cozido',
    categoria: 'proteina',
    peso_g: 100,
    proteina_g: 8.5,
    calorias_kcal: 142,
    unidade: 'Concha',
    grupos: ALMOCO_JANTAR,
  },

  // —— Carboidratos ——
  {
    id: 'carb_arroz_branco_1col',
    nome: 'Arroz branco cozido',
    categoria: 'carboidrato',
    peso_g: 45,
    proteina_g: 0.7,
    calorias_kcal: 47,
    unidade: 'Colher',
    grupos: ALMOCO_JANTAR,
    descricao: '1 colher de sopa (~45g). Use Quantidade para 2, 3, 4 colheres.',
  },
  {
    id: 'carb_arroz_integral_1col',
    nome: 'Arroz integral cozido',
    categoria: 'carboidrato',
    peso_g: 45,
    proteina_g: 1,
    calorias_kcal: 50,
    unidade: 'Colher',
    grupos: ALMOCO_JANTAR,
    descricao: '1 colher de sopa (~45g). Use Quantidade para mais colheres.',
  },
  {
    id: 'carb_quinoa_1col',
    nome: 'Quinoa cozida',
    categoria: 'carboidrato',
    peso_g: 45,
    proteina_g: 1.3,
    calorias_kcal: 40,
    unidade: 'Colher',
    grupos: ALMOCO_JANTAR,
  },
  {
    id: 'carb_batata_doce_1un',
    nome: 'Batata-doce',
    categoria: 'carboidrato',
    peso_g: 160,
    proteina_g: 2,
    calorias_kcal: 180,
    unidade: 'Unidade',
    grupos: TODOS,
    descricao: '1 unidade média (~160g). Use Quantidade 0,5 para meia unidade.',
  },
  {
    id: 'carb_mandioca_100g',
    nome: 'Mandioca',
    categoria: 'carboidrato',
    peso_g: 100,
    proteina_g: 1,
    calorias_kcal: 160,
    unidade: 'g',
    grupos: ALMOCO_JANTAR,
  },
  {
    id: 'carb_pao_integral_1fat',
    nome: 'Pão integral',
    categoria: 'carboidrato',
    peso_g: 30,
    proteina_g: 3,
    calorias_kcal: 80,
    unidade: 'Fatia',
    grupos: CAFE_LANCHES,
  },

  // —— Gorduras ——
  {
    id: 'gord_azeite_1col',
    nome: 'Azeite',
    categoria: 'gordura_boa',
    peso_g: 13,
    proteina_g: 0,
    calorias_kcal: 120,
    unidade: 'Colher',
    grupos: TODOS,
    descricao: '1 colher de sopa (~13g).',
  },
  {
    id: 'gord_castanhas_porcao',
    nome: 'Castanhas',
    categoria: 'gordura_boa',
    peso_g: 15,
    proteina_g: 3,
    calorias_kcal: 100,
    unidade: 'Porção',
    grupos: CAFE_LANCHES,
    descricao: 'Porção pequena (~15g).',
  },

  // —— Legumes / salada ——
  {
    id: 'leg_salada_grande',
    nome: 'Salada e legumes (prato cheio)',
    categoria: 'legumes_salada',
    peso_g: 150,
    proteina_g: 2,
    calorias_kcal: 50,
    unidade: 'Porção',
    grupos: ALMOCO_JANTAR,
  },
  {
    id: 'leg_salada_media',
    nome: 'Salada (meia porção)',
    categoria: 'legumes_salada',
    peso_g: 75,
    proteina_g: 1,
    calorias_kcal: 25,
    unidade: 'Porção',
    grupos: ALMOCO_JANTAR,
  },
  {
    id: 'leg_legumes_cozidos',
    nome: 'Legumes cozidos variados',
    categoria: 'legumes_salada',
    peso_g: 100,
    proteina_g: 2,
    calorias_kcal: 60,
    unidade: 'Porção',
    grupos: ALMOCO_JANTAR,
  },

  // —— Extras ——
  {
    id: 'extra_fruta_pequena',
    nome: 'Fruta pequena',
    categoria: 'extra',
    peso_g: 80,
    proteina_g: 0,
    calorias_kcal: 60,
    unidade: 'Unidade',
    grupos: CAFE_LANCHES,
  },
  {
    id: 'extra_iogurte_extra',
    nome: 'Iogurte natural',
    categoria: 'extra',
    peso_g: 100,
    proteina_g: 5,
    calorias_kcal: 80,
    unidade: 'Unidade',
    grupos: CAFE_LANCHES,
  },
] as const;
