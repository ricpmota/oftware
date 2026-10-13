import type { SegmentoAlimento } from '@/lib/metaadmingeral/alimentosGlobais/segmentos';

/** DTO público da busca MetaNutri — sem proveniência/admin. */
export interface MetaNutriFoodSearchResult {
  id: string;
  nome: string;
  segmento: SegmentoAlimento;
  marca?: string | null;

  energiaKcal: number | null;
  proteinasG: number | null;
  carboidratosG: number | null;
  gordurasTotaisG: number | null;
  fibrasG: number | null;

  baseQuantidade: number;
  baseUnidade: 'g';

  porcoes: Array<{
    id: string;
    nome: string;
    quantidadeG: number;
  }>;
}

export type OrigemAlimentoPlano = 'metanutri' | 'taco' | 'manual' | 'legacy';
