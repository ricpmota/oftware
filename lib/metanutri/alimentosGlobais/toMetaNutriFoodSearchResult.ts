import type { AlimentoGlobal } from '@/lib/metaadmingeral/alimentosGlobais/types';
import type { MetaNutriFoodSearchResult } from './types';

/** AlimentoGlobal → DTO público (sem fonte/import/admin). */
export function toMetaNutriFoodSearchResult(food: AlimentoGlobal): MetaNutriFoodSearchResult {
  return {
    id: food.id,
    nome: food.nome,
    segmento: food.segmento,
    marca: food.marca ?? null,
    energiaKcal: food.energiaKcal ?? null,
    proteinasG: food.proteinasG ?? null,
    carboidratosG: food.carboidratosG ?? null,
    gordurasTotaisG: food.gordurasTotaisG ?? null,
    fibrasG: food.fibrasG ?? null,
    baseQuantidade: food.baseQuantidade || 100,
    baseUnidade: 'g',
    porcoes: (food.porcoes || [])
      .filter((p) => p.quantidadeG > 0 && p.nome)
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        quantidadeG: p.quantidadeG,
      })),
  };
}
