/**
 * Afinidade culinária entre alimentos (ETAPA 10.5).
 * Matriz configurável — sem ifs espalhados pelo motor.
 */

import type { RefeicaoContextoKey } from '@/lib/nutri/contextoAlimentar';
import { obterContextoItem } from '@/lib/nutri/contextoAlimentar';

export type NivelAfinidadeAlimentar =
  | 'preferida'
  | 'adequada'
  | 'neutra'
  | 'inadequada'
  | 'proibida';

export const VERSAO_AFINIDADE_ALIMENTOS = 1 as const;

interface RegraAfinidade {
  /** Grupos do item A (qualquer match). */
  gruposA: string[];
  /** Grupos do item B (qualquer match). */
  gruposB: string[];
  nivel: NivelAfinidadeAlimentar;
  /** Se definido, só vale nessas refeições. */
  refeicoes?: RefeicaoContextoKey[];
}

const ORDEM_NIVEL: Record<NivelAfinidadeAlimentar, number> = {
  proibida: 0,
  inadequada: 1,
  neutra: 2,
  adequada: 3,
  preferida: 4,
};

/** Regras proibidas e preferidas (ordem: primeira match mais específica por severidade). */
const REGRAS_AFINIDADE_V1: readonly RegraAfinidade[] = [
  // —— Proibidas ——
  { gruposA: ['ovos'], gruposB: ['arroz'], nivel: 'proibida', refeicoes: ['cafe'] },
  { gruposA: ['arroz'], gruposB: ['ovos'], nivel: 'proibida', refeicoes: ['cafe'] },
  { gruposA: ['peixe'], gruposB: ['whey', 'po'], nivel: 'proibida' },
  { gruposA: ['whey', 'po'], gruposB: ['peixe'], nivel: 'proibida' },
  { gruposA: ['carne'], gruposB: ['whey', 'po'], nivel: 'proibida' },
  { gruposA: ['whey', 'po'], gruposB: ['carne'], nivel: 'proibida' },
  {
    gruposA: ['frango'],
    gruposB: ['whey', 'po'],
    nivel: 'proibida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['whey', 'po'],
    gruposB: ['frango'],
    nivel: 'proibida',
    refeicoes: ['almoco', 'jantar'],
  },
  { gruposA: ['iogurte'], gruposB: ['arroz'], nivel: 'proibida' },
  { gruposA: ['arroz'], gruposB: ['iogurte'], nivel: 'proibida' },
  { gruposA: ['iogurte'], gruposB: ['feijao'], nivel: 'proibida' },
  { gruposA: ['feijao'], gruposB: ['iogurte'], nivel: 'proibida' },
  { gruposA: ['fruta'], gruposB: ['carne'], nivel: 'proibida' },
  { gruposA: ['carne'], gruposB: ['fruta'], nivel: 'proibida' },
  { gruposA: ['azeite'], gruposB: ['castanhas'], nivel: 'proibida' },
  { gruposA: ['castanhas'], gruposB: ['azeite'], nivel: 'proibida' },
  { gruposA: ['whey', 'po'], gruposB: ['salada', 'legumes_cozidos', 'vegetal'], nivel: 'proibida' },
  { gruposA: ['salada', 'legumes_cozidos', 'vegetal'], gruposB: ['whey', 'po'], nivel: 'proibida' },
  { gruposA: ['frango'], gruposB: ['aveia'], nivel: 'proibida' },
  { gruposA: ['aveia'], gruposB: ['frango'], nivel: 'proibida' },

  // —— Preferidas ——
  {
    gruposA: ['ovos'],
    gruposB: ['pao'],
    nivel: 'preferida',
    refeicoes: ['cafe'],
  },
  {
    gruposA: ['pao'],
    gruposB: ['ovos'],
    nivel: 'preferida',
    refeicoes: ['cafe'],
  },
  {
    gruposA: ['ovos'],
    gruposB: ['mandioca'],
    nivel: 'preferida',
    refeicoes: ['cafe'],
  },
  {
    gruposA: ['mandioca'],
    gruposB: ['ovos'],
    nivel: 'preferida',
    refeicoes: ['cafe'],
  },
  {
    gruposA: ['iogurte'],
    gruposB: ['fruta'],
    nivel: 'preferida',
    refeicoes: ['cafe', 'lanche1', 'lanche2'],
  },
  {
    gruposA: ['fruta'],
    gruposB: ['iogurte'],
    nivel: 'preferida',
    refeicoes: ['cafe', 'lanche1', 'lanche2'],
  },
  {
    gruposA: ['whey', 'po', 'proteina_vegetal'],
    gruposB: ['fruta'],
    nivel: 'preferida',
    refeicoes: ['cafe', 'lanche1', 'lanche2'],
  },
  {
    gruposA: ['fruta'],
    gruposB: ['whey', 'po', 'proteina_vegetal'],
    nivel: 'preferida',
    refeicoes: ['cafe', 'lanche1', 'lanche2'],
  },
  {
    gruposA: ['cottage'],
    gruposB: ['pao'],
    nivel: 'preferida',
    refeicoes: ['cafe'],
  },
  {
    gruposA: ['pao'],
    gruposB: ['cottage'],
    nivel: 'preferida',
    refeicoes: ['cafe'],
  },
  {
    gruposA: ['ovos'],
    gruposB: ['fruta'],
    nivel: 'preferida',
    refeicoes: ['lanche1', 'lanche2'],
  },
  {
    gruposA: ['fruta'],
    gruposB: ['ovos'],
    nivel: 'preferida',
    refeicoes: ['lanche1', 'lanche2'],
  },
  {
    gruposA: ['cottage'],
    gruposB: ['fruta'],
    nivel: 'preferida',
    refeicoes: ['lanche1', 'lanche2'],
  },
  {
    gruposA: ['fruta'],
    gruposB: ['cottage'],
    nivel: 'preferida',
    refeicoes: ['lanche1', 'lanche2'],
  },
  {
    gruposA: ['iogurte', 'whey', 'ovos', 'cottage'],
    gruposB: ['castanhas'],
    nivel: 'preferida',
    refeicoes: ['lanche1', 'lanche2'],
  },
  {
    gruposA: ['castanhas'],
    gruposB: ['iogurte', 'whey', 'ovos', 'cottage'],
    nivel: 'preferida',
    refeicoes: ['lanche1', 'lanche2'],
  },
  {
    gruposA: ['frango'],
    gruposB: ['arroz'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['arroz'],
    gruposB: ['frango'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['frango'],
    gruposB: ['batata_doce'],
    nivel: 'preferida',
    refeicoes: ['almoco'],
  },
  {
    gruposA: ['batata_doce'],
    gruposB: ['frango'],
    nivel: 'preferida',
    refeicoes: ['almoco'],
  },
  {
    gruposA: ['frango'],
    gruposB: ['salada', 'vegetal'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['salada', 'vegetal'],
    gruposB: ['frango'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['peixe'],
    gruposB: ['arroz'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['arroz'],
    gruposB: ['peixe'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['peixe'],
    gruposB: ['legumes_cozidos', 'vegetal'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['legumes_cozidos', 'vegetal'],
    gruposB: ['peixe'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['carne'],
    gruposB: ['arroz', 'salada'],
    nivel: 'preferida',
    refeicoes: ['almoco'],
  },
  {
    gruposA: ['arroz', 'salada'],
    gruposB: ['carne'],
    nivel: 'preferida',
    refeicoes: ['almoco'],
  },
  {
    gruposA: ['tofu'],
    gruposB: ['quinoa', 'legumes_cozidos'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['quinoa', 'legumes_cozidos'],
    gruposB: ['tofu'],
    nivel: 'preferida',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['frango'],
    gruposB: ['mandioca'],
    nivel: 'preferida',
    refeicoes: ['jantar'],
  },
  {
    gruposA: ['mandioca'],
    gruposB: ['frango'],
    nivel: 'preferida',
    refeicoes: ['jantar'],
  },
  {
    gruposA: ['ovos'],
    gruposB: ['legumes_cozidos', 'vegetal'],
    nivel: 'preferida',
    refeicoes: ['jantar'],
  },
  {
    gruposA: ['legumes_cozidos', 'vegetal'],
    gruposB: ['ovos'],
    nivel: 'preferida',
    refeicoes: ['jantar'],
  },
  {
    gruposA: ['ovos'],
    gruposB: ['claras'],
    nivel: 'preferida',
  },
  {
    gruposA: ['claras'],
    gruposB: ['ovos'],
    nivel: 'preferida',
  },
  {
    gruposA: ['tofu'],
    gruposB: ['lentilha', 'grao_bico', 'leguminosa'],
    nivel: 'adequada',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['lentilha', 'grao_bico', 'leguminosa'],
    gruposB: ['tofu'],
    nivel: 'adequada',
    refeicoes: ['almoco', 'jantar'],
  },
  {
    gruposA: ['arroz'],
    gruposB: ['feijao'],
    nivel: 'preferida',
    refeicoes: ['almoco'],
  },
  {
    gruposA: ['feijao'],
    gruposB: ['arroz'],
    nivel: 'preferida',
    refeicoes: ['almoco'],
  },
];

function gruposDoItem(itemId: string): string[] {
  return obterContextoItem(itemId)?.gruposCulinarios ?? [];
}

function regraAplica(
  regra: RegraAfinidade,
  gruposA: string[],
  gruposB: string[],
  refeicao: RefeicaoContextoKey
): boolean {
  if (regra.refeicoes && !regra.refeicoes.includes(refeicao)) return false;
  const matchA = regra.gruposA.some((g) => gruposA.includes(g));
  const matchB = regra.gruposB.some((g) => gruposB.includes(g));
  return matchA && matchB;
}

export function avaliarAfinidadeEntreItens(
  itemA: string,
  itemB: string,
  refeicao: RefeicaoContextoKey
): NivelAfinidadeAlimentar {
  if (itemA === itemB) return 'neutra';
  const ga = gruposDoItem(itemA);
  const gb = gruposDoItem(itemB);
  if (ga.length === 0 || gb.length === 0) return 'neutra';

  let escolhido: NivelAfinidadeAlimentar = 'neutra';
  for (const regra of REGRAS_AFINIDADE_V1) {
    if (!regraAplica(regra, ga, gb, refeicao)) continue;
    if (regra.nivel === 'proibida') return 'proibida';
    // Preferida/adequada vencem neutra; inadequada só se ainda neutra
    if (ORDEM_NIVEL[regra.nivel] > ORDEM_NIVEL[escolhido]) {
      escolhido = regra.nivel;
    } else if (regra.nivel === 'inadequada' && escolhido === 'neutra') {
      escolhido = 'inadequada';
    }
  }
  return escolhido;
}

export function afinidadePratoEhProibida(
  itemIds: string[],
  refeicao: RefeicaoContextoKey
): boolean {
  for (let i = 0; i < itemIds.length; i++) {
    for (let j = i + 1; j < itemIds.length; j++) {
      if (avaliarAfinidadeEntreItens(itemIds[i], itemIds[j], refeicao) === 'proibida') {
        return true;
      }
    }
  }
  return false;
}

export function pontuarAfinidadePrato(
  itemIds: string[],
  refeicao: RefeicaoContextoKey
): number {
  if (itemIds.length < 2) return 0.7;
  let soma = 0;
  let n = 0;
  for (let i = 0; i < itemIds.length; i++) {
    for (let j = i + 1; j < itemIds.length; j++) {
      const nivel = avaliarAfinidadeEntreItens(itemIds[i], itemIds[j], refeicao);
      if (nivel === 'proibida') return 0;
      const mapa: Record<NivelAfinidadeAlimentar, number> = {
        preferida: 1,
        adequada: 0.8,
        neutra: 0.55,
        inadequada: 0.25,
        proibida: 0,
      };
      soma += mapa[nivel];
      n += 1;
    }
  }
  return n === 0 ? 0.7 : soma / n;
}
