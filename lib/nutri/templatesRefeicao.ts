/**
 * Templates de refeição natural (ETAPA 10.5).
 * Determinístico — seleciona padrão culinário antes dos macros.
 */

import type { RefeicaoContextoKey } from '@/lib/nutri/contextoAlimentar';
import {
  itemPermitidoNaRefeicaoAutomatica,
  itemTemGrupoCulinario,
  obterContextoItem,
} from '@/lib/nutri/contextoAlimentar';

export type CategoriaTemplateRefeicao =
  | 'proteina'
  | 'carboidrato'
  | 'fruta'
  | 'vegetal'
  | 'gordura'
  | 'extra';

export interface TemplateRefeicao {
  id: string;
  refeicoes: RefeicaoContextoKey[];
  categoriasObrigatorias: CategoriaTemplateRefeicao[];
  categoriasOpcionais: CategoriaTemplateRefeicao[];
  /** Grupos culinários permitidos por categoria (vazio = qualquer permitido na refeição). */
  gruposPorCategoria: Partial<Record<CategoriaTemplateRefeicao, string[]>>;
  /** Grupos explicitamente bloqueados neste template. */
  gruposBloqueados?: string[];
  tags: string[];
  prioridadeBase: number;
  estilosPreferidos?: string[];
}

export const VERSAO_TEMPLATES_REFEICAO = 1 as const;

export const TEMPLATES_REFEICAO_V1: readonly TemplateRefeicao[] = [
  // —— Café ——
  {
    id: 'cafe_ovos_pao',
    refeicoes: ['cafe'],
    categoriasObrigatorias: ['proteina', 'carboidrato'],
    categoriasOpcionais: ['fruta'],
    gruposPorCategoria: {
      proteina: ['ovos', 'claras', 'cottage'],
      carboidrato: ['pao'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'quinoa', 'batata_doce', 'frango', 'carne', 'peixe', 'whey', 'feijao'],
    tags: ['cafe', 'classico'],
    prioridadeBase: 100,
  },
  {
    id: 'cafe_ovos_carbo_matin',
    refeicoes: ['cafe'],
    categoriasObrigatorias: ['proteina', 'carboidrato'],
    categoriasOpcionais: ['fruta'],
    gruposPorCategoria: {
      proteina: ['ovos', 'claras', 'cottage'],
      carboidrato: ['mandioca', 'carbo_matin'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'quinoa', 'batata_doce', 'frango', 'carne', 'peixe', 'whey'],
    tags: ['cafe', 'cultural_br'],
    prioridadeBase: 80,
  },
  {
    id: 'cafe_iogurte_fruta',
    refeicoes: ['cafe'],
    categoriasObrigatorias: ['proteina', 'fruta'],
    categoriasOpcionais: ['carboidrato'],
    gruposPorCategoria: {
      proteina: ['iogurte'],
      fruta: ['fruta'],
      carboidrato: ['pao'],
    },
    gruposBloqueados: ['arroz', 'feijao', 'frango', 'carne', 'peixe'],
    tags: ['cafe', 'leve', 'reduzido'],
    prioridadeBase: 95,
  },
  {
    id: 'cafe_whey_fruta',
    refeicoes: ['cafe'],
    categoriasObrigatorias: ['proteina', 'fruta'],
    categoriasOpcionais: [],
    gruposPorCategoria: {
      proteina: ['whey', 'proteina_vegetal', 'po'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'frango', 'carne', 'peixe', 'feijao'],
    tags: ['cafe', 'pratico', 'reduzido'],
    prioridadeBase: 90,
  },
  {
    id: 'cafe_cottage_pao',
    refeicoes: ['cafe'],
    categoriasObrigatorias: ['proteina', 'carboidrato'],
    categoriasOpcionais: ['fruta'],
    gruposPorCategoria: {
      proteina: ['cottage'],
      carboidrato: ['pao'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'quinoa', 'frango', 'carne', 'peixe'],
    tags: ['cafe'],
    prioridadeBase: 85,
  },
  {
    id: 'cafe_proteina_fruta',
    refeicoes: ['cafe'],
    categoriasObrigatorias: ['proteina', 'fruta'],
    categoriasOpcionais: [],
    gruposPorCategoria: {
      proteina: ['ovos', 'claras', 'cottage', 'iogurte', 'whey', 'proteina_vegetal'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'frango', 'carne', 'peixe', 'feijao'],
    tags: ['cafe', 'simples'],
    prioridadeBase: 70,
  },

  // —— Lanches ——
  {
    id: 'lanche_iogurte_fruta',
    refeicoes: ['lanche1', 'lanche2'],
    categoriasObrigatorias: ['proteina', 'fruta'],
    categoriasOpcionais: [],
    gruposPorCategoria: {
      proteina: ['iogurte'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'feijao', 'peixe', 'carne', 'frango', 'azeite', 'salada', 'legumes_cozidos'],
    tags: ['lanche'],
    prioridadeBase: 100,
  },
  {
    id: 'lanche_whey_fruta',
    refeicoes: ['lanche1', 'lanche2'],
    categoriasObrigatorias: ['proteina', 'fruta'],
    categoriasOpcionais: [],
    gruposPorCategoria: {
      proteina: ['whey', 'proteina_vegetal', 'po'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'feijao', 'peixe', 'carne', 'frango', 'azeite', 'salada'],
    tags: ['lanche', 'pratico'],
    prioridadeBase: 95,
  },
  {
    id: 'lanche_ovos_fruta',
    refeicoes: ['lanche1', 'lanche2'],
    categoriasObrigatorias: ['proteina', 'fruta'],
    categoriasOpcionais: [],
    gruposPorCategoria: {
      proteina: ['ovos', 'claras'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'feijao', 'peixe', 'carne', 'frango', 'azeite', 'salada'],
    tags: ['lanche'],
    prioridadeBase: 90,
  },
  {
    id: 'lanche_cottage_fruta',
    refeicoes: ['lanche1', 'lanche2'],
    categoriasObrigatorias: ['proteina', 'fruta'],
    categoriasOpcionais: [],
    gruposPorCategoria: {
      proteina: ['cottage'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'feijao', 'peixe', 'carne', 'frango', 'azeite', 'salada'],
    tags: ['lanche'],
    prioridadeBase: 85,
  },
  {
    id: 'lanche_proteina_castanhas',
    refeicoes: ['lanche1', 'lanche2'],
    categoriasObrigatorias: ['proteina', 'gordura'],
    categoriasOpcionais: ['fruta'],
    gruposPorCategoria: {
      proteina: ['iogurte', 'whey', 'proteina_vegetal', 'ovos', 'cottage'],
      gordura: ['castanhas'],
      fruta: ['fruta'],
    },
    gruposBloqueados: ['arroz', 'feijao', 'peixe', 'carne', 'frango', 'azeite', 'salada'],
    tags: ['lanche'],
    prioridadeBase: 80,
  },

  // —— Almoço ——
  {
    id: 'almoco_proteina_carbo_vegetal',
    refeicoes: ['almoco'],
    categoriasObrigatorias: ['proteina', 'carboidrato', 'vegetal'],
    categoriasOpcionais: ['gordura'],
    gruposPorCategoria: {
      proteina: ['frango', 'peixe', 'carne', 'tofu', 'ovos', 'leguminosa'],
      carboidrato: ['arroz', 'batata_doce', 'mandioca', 'quinoa'],
      vegetal: ['salada', 'legumes_cozidos', 'vegetal'],
      gordura: ['azeite'],
    },
    gruposBloqueados: ['whey', 'po', 'iogurte', 'peru'],
    tags: ['almoco', 'completo'],
    prioridadeBase: 100,
  },
  {
    id: 'almoco_proteina_vegetal',
    refeicoes: ['almoco'],
    categoriasObrigatorias: ['proteina', 'vegetal'],
    categoriasOpcionais: ['gordura', 'carboidrato'],
    gruposPorCategoria: {
      proteina: ['frango', 'peixe', 'carne', 'tofu', 'ovos', 'leguminosa'],
      vegetal: ['salada', 'legumes_cozidos', 'vegetal'],
      gordura: ['azeite'],
      carboidrato: ['arroz', 'batata_doce', 'mandioca', 'quinoa'],
    },
    gruposBloqueados: ['whey', 'po', 'iogurte', 'peru'],
    tags: ['almoco', 'leve'],
    prioridadeBase: 75,
  },
  {
    id: 'almoco_plant_based',
    refeicoes: ['almoco'],
    categoriasObrigatorias: ['proteina', 'carboidrato', 'vegetal'],
    categoriasOpcionais: ['gordura'],
    gruposPorCategoria: {
      proteina: ['tofu', 'leguminosa'],
      carboidrato: ['quinoa', 'arroz', 'batata_doce', 'mandioca'],
      vegetal: ['salada', 'legumes_cozidos', 'vegetal'],
      gordura: ['azeite'],
    },
    gruposBloqueados: ['whey', 'iogurte', 'ovos', 'frango', 'carne', 'peixe', 'peru'],
    tags: ['almoco', 'plant_based'],
    prioridadeBase: 90,
    estilosPreferidos: ['plant_based'],
  },

  // —— Jantar ——
  {
    id: 'jantar_proteina_carbo_vegetal',
    refeicoes: ['jantar'],
    categoriasObrigatorias: ['proteina', 'carboidrato', 'vegetal'],
    categoriasOpcionais: ['gordura'],
    gruposPorCategoria: {
      proteina: ['peixe', 'frango', 'ovos', 'tofu', 'carne', 'leguminosa'],
      carboidrato: ['arroz', 'batata_doce', 'mandioca', 'quinoa'],
      vegetal: ['salada', 'legumes_cozidos', 'vegetal'],
      gordura: ['azeite'],
    },
    gruposBloqueados: ['whey', 'po', 'iogurte', 'peru'],
    tags: ['jantar'],
    prioridadeBase: 100,
  },
  {
    id: 'jantar_proteina_vegetal',
    refeicoes: ['jantar'],
    categoriasObrigatorias: ['proteina', 'vegetal'],
    categoriasOpcionais: ['gordura', 'carboidrato'],
    gruposPorCategoria: {
      proteina: ['peixe', 'frango', 'ovos', 'tofu', 'carne', 'leguminosa'],
      vegetal: ['salada', 'legumes_cozidos', 'vegetal'],
      gordura: ['azeite'],
      carboidrato: ['arroz', 'batata_doce', 'mandioca', 'quinoa'],
    },
    gruposBloqueados: ['whey', 'po', 'iogurte', 'peru'],
    tags: ['jantar', 'leve'],
    prioridadeBase: 80,
  },
  {
    id: 'jantar_ovos_vegetal',
    refeicoes: ['jantar'],
    categoriasObrigatorias: ['proteina', 'vegetal'],
    categoriasOpcionais: ['carboidrato'],
    gruposPorCategoria: {
      proteina: ['ovos', 'claras'],
      vegetal: ['salada', 'legumes_cozidos', 'vegetal'],
      carboidrato: ['arroz', 'mandioca', 'batata_doce'],
    },
    gruposBloqueados: ['whey', 'po', 'iogurte', 'peru'],
    tags: ['jantar'],
    prioridadeBase: 85,
  },
  {
    id: 'jantar_digestivo',
    refeicoes: ['jantar'],
    categoriasObrigatorias: ['proteina', 'carboidrato', 'vegetal'],
    categoriasOpcionais: [],
    gruposPorCategoria: {
      proteina: ['peixe', 'frango'],
      carboidrato: ['arroz_branco', 'arroz', 'mandioca'],
      vegetal: ['legumes_cozidos'],
    },
    gruposBloqueados: ['whey', 'po', 'iogurte', 'peru', 'castanhas', 'salada'],
    tags: ['jantar', 'digestivo'],
    prioridadeBase: 110,
    estilosPreferidos: ['digestiva'],
  },
];

export function listarTemplatesParaRefeicao(
  refeicao: RefeicaoContextoKey
): TemplateRefeicao[] {
  return TEMPLATES_REFEICAO_V1.filter((t) => t.refeicoes.includes(refeicao));
}

export function selecionarTemplatesValidos(opcoes: {
  refeicao: RefeicaoContextoKey;
  estilo?: string;
  cafeReduzido?: boolean;
  sintomasGI?: string;
}): TemplateRefeicao[] {
  let list = listarTemplatesParaRefeicao(opcoes.refeicao);

  if (opcoes.estilo === 'plant_based') {
    list = [
      ...list.filter((t) => t.tags.includes('plant_based') || t.id.includes('plant')),
      ...list.filter((t) => !t.tags.includes('plant_based') && !t.id.includes('plant')),
    ];
  }

  if (
    opcoes.estilo === 'digestiva' ||
    opcoes.sintomasGI === 'grave' ||
    opcoes.sintomasGI === 'moderado'
  ) {
    list = [
      ...list.filter((t) => t.tags.includes('digestivo')),
      ...list.filter((t) => !t.tags.includes('digestivo')),
    ];
  }

  if (opcoes.cafeReduzido && opcoes.refeicao === 'cafe') {
    const reduzidos = list.filter((t) => t.tags.includes('reduzido'));
    const demais = list.filter((t) => !t.tags.includes('reduzido'));
    return [
      ...reduzidos.sort((a, b) => b.prioridadeBase - a.prioridadeBase),
      ...demais.sort((a, b) => b.prioridadeBase - a.prioridadeBase),
    ];
  }

  return [...list].sort((a, b) => {
    const boostA =
      opcoes.estilo && a.estilosPreferidos?.includes(opcoes.estilo) ? 50 : 0;
    const boostB =
      opcoes.estilo && b.estilosPreferidos?.includes(opcoes.estilo) ? 50 : 0;
    return b.prioridadeBase + boostB - (a.prioridadeBase + boostA);
  });
}

function itemBateGrupos(itemId: string, grupos: string[] | undefined): boolean {
  if (!grupos || grupos.length === 0) return true;
  const c = obterContextoItem(itemId);
  if (!c) return false;
  return grupos.some((g) => c.gruposCulinarios.includes(g));
}

function itemBloqueadoNoTemplate(itemId: string, template: TemplateRefeicao): boolean {
  if (!template.gruposBloqueados?.length) return false;
  const c = obterContextoItem(itemId);
  if (!c) return true;
  return template.gruposBloqueados.some((g) => c.gruposCulinarios.includes(g));
}

export function itemCompativelComTemplateCategoria(
  itemId: string,
  categoria: CategoriaTemplateRefeicao,
  template: TemplateRefeicao,
  refeicao: RefeicaoContextoKey
): boolean {
  if (!itemPermitidoNaRefeicaoAutomatica(itemId, refeicao)) return false;
  if (itemBloqueadoNoTemplate(itemId, template)) return false;
  const grupos = template.gruposPorCategoria[categoria];
  return itemBateGrupos(itemId, grupos);
}

export function categoriaCatalogoParaTemplate(
  categoriaCatalogo: string
): CategoriaTemplateRefeicao | null {
  if (categoriaCatalogo === 'proteina') return 'proteina';
  if (categoriaCatalogo === 'carboidrato') return 'carboidrato';
  if (categoriaCatalogo === 'legumes_salada') return 'vegetal';
  if (categoriaCatalogo === 'gordura_boa') return 'gordura';
  if (categoriaCatalogo === 'extra') {
    return 'fruta'; // fruta é o extra principal; outros extras filtrados por grupo
  }
  return null;
}

export function itemEhDoGrupoFruta(itemId: string): boolean {
  return itemTemGrupoCulinario(itemId, 'fruta');
}
