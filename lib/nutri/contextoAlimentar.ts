/**
 * Contexto alimentar e adequação por refeição (ETAPA 10.5).
 * Puro, determinístico, sem Firestore/React/IA.
 */

export type RefeicaoContextoKey =
  | 'cafe'
  | 'lanche1'
  | 'almoco'
  | 'lanche2'
  | 'jantar';

export type NivelAdequacaoRefeicao = 0 | 1 | 2 | 3 | 4 | 5;

export interface ContextoAlimentarItem {
  itemId: string;
  adequacaoPorRefeicao: Record<RefeicaoContextoKey, NivelAdequacaoRefeicao>;
  gruposCulinarios: string[];
  tagsContextuais: string[];
  ultraprocessado?: boolean;
}

export const VERSAO_CONTEXTO_ALIMENTAR = 1 as const;

export type AlertaContextoAlimentar = 'ITEM_SEM_CONTEXTO_ALIMENTAR';

type Adeq = Record<RefeicaoContextoKey, NivelAdequacaoRefeicao>;

function adeq(
  cafe: NivelAdequacaoRefeicao,
  lanche1: NivelAdequacaoRefeicao,
  almoco: NivelAdequacaoRefeicao,
  lanche2: NivelAdequacaoRefeicao,
  jantar: NivelAdequacaoRefeicao
): Adeq {
  return { cafe, lanche1, almoco, lanche2, jantar };
}

function ctx(
  itemId: string,
  a: Adeq,
  grupos: string[],
  tags: string[] = [],
  ultraprocessado?: boolean
): ContextoAlimentarItem {
  return {
    itemId,
    adequacaoPorRefeicao: a,
    gruposCulinarios: grupos,
    tagsContextuais: tags,
    ...(ultraprocessado ? { ultraprocessado: true } : {}),
  };
}

/** Adequação V1 + itens do lote 01 já presentes no catálogo (sem novos IDs). */
export const CONTEXTO_ALIMENTAR_CATALOGO_V1: Record<string, ContextoAlimentarItem> = {
  // Proteínas V1
  prot_ovos_2un: ctx('prot_ovos_2un', adeq(5, 4, 3, 4, 4), ['ovos'], ['cafe', 'pratico']),
  prot_ovos_3un: ctx('prot_ovos_3un', adeq(5, 4, 3, 4, 4), ['ovos'], ['cafe', 'pratico']),
  prot_claras_4un: ctx('prot_claras_4un', adeq(5, 4, 3, 4, 4), ['ovos', 'claras'], ['complemento']),
  prot_whey_1dose: ctx('prot_whey_1dose', adeq(5, 5, 0, 5, 0), ['whey', 'po'], ['lanche', 'pratico']),
  prot_iogurte_proteico: ctx(
    'prot_iogurte_proteico',
    adeq(5, 5, 0, 5, 1),
    ['iogurte', 'laticinios'],
    ['lanche', 'pratico']
  ),
  prot_queijo_cottage: ctx(
    'prot_queijo_cottage',
    adeq(5, 4, 2, 4, 3),
    ['cottage', 'laticinios'],
    ['cafe', 'pratico']
  ),
  prot_frango_100g: ctx('prot_frango_100g', adeq(0, 1, 5, 1, 4), ['frango', 'carne_branca'], ['almoco']),
  prot_frango_150g: ctx('prot_frango_150g', adeq(0, 1, 5, 1, 4), ['frango', 'carne_branca'], ['almoco']),
  prot_carne_magra_100g: ctx('prot_carne_magra_100g', adeq(0, 0, 5, 0, 4), ['carne'], ['almoco']),
  prot_peixe_100g: ctx('prot_peixe_100g', adeq(0, 0, 4, 0, 5), ['peixe'], ['jantar', 'digestivo']),
  prot_tofu_100g: ctx('prot_tofu_100g', adeq(2, 2, 5, 2, 5), ['tofu', 'vegetal'], ['plant_based']),
  prot_peito_peru: ctx(
    'prot_peito_peru',
    adeq(2, 3, 1, 3, 1),
    ['peru', 'processado'],
    ['ultimo_recurso'],
    true
  ),

  // Carboidratos V1
  carb_pao_integral_1fat: ctx(
    'carb_pao_integral_1fat',
    adeq(5, 4, 0, 4, 1),
    ['pao', 'carbo_matin'],
    ['cafe']
  ),
  carb_arroz_branco_3col: ctx(
    'carb_arroz_branco_3col',
    adeq(0, 0, 5, 0, 4),
    ['arroz', 'arroz_branco'],
    ['almoco']
  ),
  carb_arroz_integral_3col: ctx(
    'carb_arroz_integral_3col',
    adeq(0, 0, 5, 0, 4),
    ['arroz', 'arroz_integral'],
    ['almoco']
  ),
  carb_batata_doce_1un: ctx(
    'carb_batata_doce_1un',
    adeq(2, 1, 5, 1, 5),
    ['batata_doce'],
    ['almoco']
  ),
  carb_mandioca_100g: ctx(
    'carb_mandioca_100g',
    adeq(3, 1, 5, 1, 5),
    ['mandioca', 'carbo_matin'],
    ['cultural_br']
  ),
  carb_quinoa_3col: ctx('carb_quinoa_3col', adeq(1, 0, 5, 0, 5), ['quinoa'], ['plant_based']),

  // Vegetais / gorduras / extras V1
  leg_salada_grande: ctx('leg_salada_grande', adeq(0, 0, 5, 0, 5), ['salada', 'vegetal'], ['almoco']),
  leg_salada_media: ctx('leg_salada_media', adeq(0, 0, 5, 0, 5), ['salada', 'vegetal'], ['almoco']),
  leg_legumes_cozidos: ctx(
    'leg_legumes_cozidos',
    adeq(0, 0, 5, 0, 5),
    ['legumes_cozidos', 'vegetal'],
    ['digestivo']
  ),
  extra_fruta_pequena: ctx(
    'extra_fruta_pequena',
    adeq(5, 5, 1, 5, 2),
    ['fruta'],
    ['cafe', 'lanche']
  ),
  gord_castanhas_porcao: ctx(
    'gord_castanhas_porcao',
    adeq(4, 5, 1, 5, 1),
    ['castanhas', 'gordura'],
    ['lanche']
  ),
  gord_azeite_1col: ctx('gord_azeite_1col', adeq(0, 0, 5, 0, 5), ['azeite', 'gordura'], ['almoco']),
  extra_iogurte_extra: ctx(
    'extra_iogurte_extra',
    adeq(4, 4, 0, 4, 1),
    ['iogurte', 'extra'],
    ['lanche']
  ),

  // Lote 01 (já no catálogo — mapeados, sem novos IDs)
  prot_tofu_150g: ctx('prot_tofu_150g', adeq(2, 2, 5, 2, 5), ['tofu', 'vegetal'], ['plant_based']),
  prot_tofu_200g: ctx('prot_tofu_200g', adeq(2, 2, 5, 2, 5), ['tofu', 'vegetal'], ['plant_based']),
  prot_proteina_vegetal: ctx(
    'prot_proteina_vegetal',
    adeq(5, 5, 0, 5, 0),
    ['proteina_vegetal', 'po'],
    ['lanche', 'pratico', 'vegano']
  ),
  prot_feijao_1concha: ctx(
    'prot_feijao_1concha',
    adeq(0, 0, 5, 0, 3),
    ['feijao', 'leguminosa'],
    ['almoco']
  ),
  prot_lentilha_1concha: ctx(
    'prot_lentilha_1concha',
    adeq(0, 0, 5, 0, 4),
    ['lentilha', 'leguminosa'],
    ['almoco']
  ),
  prot_grao_bico_1concha: ctx(
    'prot_grao_bico_1concha',
    adeq(0, 0, 5, 0, 4),
    ['grao_bico', 'leguminosa'],
    ['mediterranea']
  ),
  prot_iogurte_sem_lactose: ctx(
    'prot_iogurte_sem_lactose',
    adeq(5, 5, 0, 5, 1),
    ['iogurte', 'laticinios'],
    ['lanche', 'sem_lactose']
  ),
  prot_whey_isolado_sl: ctx(
    'prot_whey_isolado_sl',
    adeq(5, 5, 0, 5, 0),
    ['whey', 'po'],
    ['lanche', 'sem_lactose']
  ),
  prot_frango_120g: ctx('prot_frango_120g', adeq(0, 1, 5, 1, 4), ['frango', 'carne_branca'], ['almoco']),
  prot_peixe_150g: ctx('prot_peixe_150g', adeq(0, 0, 4, 0, 5), ['peixe'], ['jantar']),
  prot_ovos_1un: ctx('prot_ovos_1un', adeq(5, 4, 3, 4, 4), ['ovos'], ['cafe', 'pratico']),
  prot_claras_2un: ctx('prot_claras_2un', adeq(5, 4, 3, 4, 4), ['ovos', 'claras'], ['complemento']),
  carb_arroz_branco_2col: ctx(
    'carb_arroz_branco_2col',
    adeq(0, 0, 5, 0, 4),
    ['arroz', 'arroz_branco'],
    ['almoco']
  ),
  carb_arroz_branco_4col: ctx(
    'carb_arroz_branco_4col',
    adeq(0, 0, 5, 0, 4),
    ['arroz', 'arroz_branco'],
    ['almoco']
  ),
  carb_arroz_integral_2col: ctx(
    'carb_arroz_integral_2col',
    adeq(0, 0, 5, 0, 4),
    ['arroz', 'arroz_integral'],
    ['almoco']
  ),
  carb_arroz_integral_4col: ctx(
    'carb_arroz_integral_4col',
    adeq(0, 0, 5, 0, 4),
    ['arroz', 'arroz_integral'],
    ['almoco']
  ),
  carb_batata_doce_meia: ctx(
    'carb_batata_doce_meia',
    adeq(2, 1, 5, 1, 5),
    ['batata_doce'],
    ['almoco']
  ),
};

export function obterContextoItem(itemId: string): ContextoAlimentarItem | null {
  return CONTEXTO_ALIMENTAR_CATALOGO_V1[itemId] ?? null;
}

export function obterAdequacaoItemParaRefeicao(
  itemId: string,
  refeicao: RefeicaoContextoKey
): NivelAdequacaoRefeicao {
  const c = obterContextoItem(itemId);
  if (!c) return 0;
  return c.adequacaoPorRefeicao[refeicao];
}

/**
 * Adequação ≥ 3 para Opção 01 automática V1.
 * Preferências do paciente não liberam adequação 0–2.
 */
export function itemPermitidoNaRefeicaoAutomatica(
  itemId: string,
  refeicao: RefeicaoContextoKey
): boolean {
  return obterAdequacaoItemParaRefeicao(itemId, refeicao) >= 3;
}

export function itemEhUltraprocessado(itemId: string): boolean {
  return Boolean(obterContextoItem(itemId)?.ultraprocessado);
}

export function itemTemGrupoCulinario(itemId: string, grupo: string): boolean {
  return Boolean(obterContextoItem(itemId)?.gruposCulinarios.includes(grupo));
}

export function filtrarItensComContexto(
  ids: string[]
): { validos: string[]; semContexto: string[] } {
  const validos: string[] = [];
  const semContexto: string[] = [];
  for (const id of ids) {
    if (obterContextoItem(id)) validos.push(id);
    else semContexto.push(id);
  }
  return { validos, semContexto };
}
