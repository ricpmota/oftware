import { criarItemComPorcao, type CategoriaItemPlano, type ItemPlanoRefeicao } from '@/lib/nutri/planosNutricionista';
import type { MetaNutriFoodSearchResult } from './types';

/** null da base global → undefined no snapshot (não inventar 0). */
function optionalMacro(v: number | null | undefined): number | undefined {
  if (v == null) return undefined;
  return v;
}

/**
 * Converte seleção METANUTRI → snapshot ItemPlanoRefeicao.
 * - categoria = aba ativa (NÃO o segmento)
 * - macros base = valores por baseQuantidade (tipicamente 100 g)
 * - kcal/proteína legados: number (null da fonte → 0 no contrato antigo)
 * - C/G/F: undefined se desconhecido; 0 se fonte informou zero
 */
export function mapMetaNutriFoodToItemPlano(opts: {
  food: MetaNutriFoodSearchResult;
  categoria: CategoriaItemPlano;
  quantidadeG: number;
  unidade?: string;
  refeicaoKey?: string;
}): ItemPlanoRefeicao {
  const baseQ = opts.food.baseQuantidade > 0 ? opts.food.baseQuantidade : 100;
  const peso = Math.max(1, opts.quantidadeG);
  const proteinaBase = opts.food.proteinasG ?? 0;
  const caloriasBase = opts.food.energiaKcal ?? 0;

  return criarItemComPorcao({
    id: `metanutri_${opts.refeicaoKey || 'item'}_${opts.food.id}_${Date.now()}`,
    nome: opts.food.nome,
    categoria: opts.categoria,
    proteinaBase_g: proteinaBase,
    caloriasBase_kcal: caloriasBase,
    carboidratoBase_g: optionalMacro(opts.food.carboidratosG),
    gorduraBase_g: optionalMacro(opts.food.gordurasTotaisG),
    fibraBase_g: optionalMacro(opts.food.fibrasG),
    pesoBase_g: baseQ,
    peso_g: Math.round(peso * 10) / 10,
    quantidade: 1,
    unidade: opts.unidade || '',
    descricao: `Base MetaNutri • ${Math.round(peso)}g`,
    origemAlimento: 'metanutri',
    alimentoGlobalId: opts.food.id,
  });
}

export function categoriaDaAbaBuilder(
  aba: 'proteina' | 'carboidrato' | 'gordura' | 'reguladores'
): CategoriaItemPlano {
  if (aba === 'proteina') return 'proteina';
  if (aba === 'carboidrato') return 'carboidrato';
  if (aba === 'gordura') return 'gordura_boa';
  return 'legumes_salada';
}
