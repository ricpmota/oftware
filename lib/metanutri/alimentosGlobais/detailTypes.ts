import type { SegmentoAlimento } from '@/lib/metaadmingeral/alimentosGlobais/segmentos';
import type { MetaNutriFoodSearchResult } from './types';

/** Fonte pública (sem IDs de importação / Gemini). */
export interface MetaNutriFoodFontePublica {
  nome?: string | null;
  documento?: string | null;
  versao?: string | null;
  ano?: number | null;
}

/** Detalhe completo para modal — sem dados administrativos. */
export interface MetaNutriFoodDetailResult extends MetaNutriFoodSearchResult {
  descricao?: string | null;
  nomeCientifico?: string | null;
  estado?: string | null;
  processamento?: string | null;
  preparo?: string | null;

  energiaKj?: number | null;
  glicoseG?: number | null;
  frutoseG?: number | null;
  lactoseG?: number | null;
  sacaroseG?: number | null;
  acucaresTotaisG?: number | null;
  amidoTotalG?: number | null;
  amidoDisponivelG?: number | null;
  amidoResistenteG?: number | null;

  gordurasSaturadasG?: number | null;
  gordurasMonoinsaturadasG?: number | null;
  gordurasPoliinsaturadasG?: number | null;
  gordurasTransG?: number | null;

  calcioMg?: number | null;
  ferroMg?: number | null;
  magnesioMg?: number | null;
  fosforoMg?: number | null;
  potassioMg?: number | null;
  sodioMg?: number | null;
  zincoMg?: number | null;

  vitaminaAMcg?: number | null;
  vitaminaCMg?: number | null;
  vitaminaDMcg?: number | null;
  vitaminaEMg?: number | null;
  vitaminaB1Mg?: number | null;
  vitaminaB2Mg?: number | null;
  vitaminaB3Mg?: number | null;
  vitaminaB6Mg?: number | null;
  vitaminaB12Mcg?: number | null;
  folatoMcg?: number | null;

  nutrientesExtras: Array<{
    nome: string;
    valor: number | null;
    unidade: string;
  }>;

  fontesPublicas: MetaNutriFoodFontePublica[];
  totalFontes: number;
}
