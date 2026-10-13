/**
 * Mapeamento de chaves Gemini → campos AlimentoGlobal / extras.
 */

export const NUTRIENTE_CAMPO_MAP: Record<string, string> = {
  energiaKcal: 'energiaKcal',
  energia_kcal: 'energiaKcal',
  kcal: 'energiaKcal',
  calorias: 'energiaKcal',
  energiaKj: 'energiaKj',
  energia_kj: 'energiaKj',
  kj: 'energiaKj',
  proteinasG: 'proteinasG',
  proteinaG: 'proteinasG',
  protein_g: 'proteinasG',
  proteinas: 'proteinasG',
  carboidratosG: 'carboidratosG',
  carboidratoG: 'carboidratosG',
  carbohydrate_g: 'carboidratosG',
  carboidratos: 'carboidratosG',
  gordurasTotaisG: 'gordurasTotaisG',
  gorduraG: 'gordurasTotaisG',
  lipidiosG: 'gordurasTotaisG',
  lipid_g: 'gordurasTotaisG',
  gorduras: 'gordurasTotaisG',
  fibrasG: 'fibrasG',
  fibraG: 'fibrasG',
  fiber_g: 'fibrasG',
  fibras: 'fibrasG',
  glicoseG: 'glicoseG',
  frutoseG: 'frutoseG',
  lactoseG: 'lactoseG',
  sacaroseG: 'sacaroseG',
  acucaresTotaisG: 'acucaresTotaisG',
  amidoTotalG: 'amidoTotalG',
  amidoDisponivelG: 'amidoDisponivelG',
  amidoResistenteG: 'amidoResistenteG',
  gordurasSaturadasG: 'gordurasSaturadasG',
  gordurasMonoinsaturadasG: 'gordurasMonoinsaturadasG',
  gordurasPoliinsaturadasG: 'gordurasPoliinsaturadasG',
  gordurasTransG: 'gordurasTransG',
  calcioMg: 'calcioMg',
  ferroMg: 'ferroMg',
  magnesioMg: 'magnesioMg',
  fosforoMg: 'fosforoMg',
  potassioMg: 'potassioMg',
  sodioMg: 'sodioMg',
  zincoMg: 'zincoMg',
  vitaminaAMcg: 'vitaminaAMcg',
  vitaminaCMg: 'vitaminaCMg',
  vitaminaDMcg: 'vitaminaDMcg',
  vitaminaEMg: 'vitaminaEMg',
  vitaminaB1Mg: 'vitaminaB1Mg',
  vitaminaB2Mg: 'vitaminaB2Mg',
  vitaminaB3Mg: 'vitaminaB3Mg',
  vitaminaB6Mg: 'vitaminaB6Mg',
  vitaminaB12Mcg: 'vitaminaB12Mcg',
  folatoMcg: 'folatoMcg',
};

/** Chaves que NÃO têm campo dedicado → nutrientesExtras. */
export const NUTRIENTE_EXTRA_KNOWN_NAMES: Record<string, string> = {
  umidadeG: 'Umidade',
  umidade: 'Umidade',
  cinzasG: 'Cinzas',
  cinzas: 'Cinzas',
  alcoolG: 'Álcool',
  colesterolMg: 'Colesterol',
  acucaresRedutoresG: 'Açúcares redutores',
};

export const CAMPOS_NUTRIENTE_DEDICADOS = new Set(Object.values(NUTRIENTE_CAMPO_MAP));

export function resolveNutrientFieldKey(rawKey: string): string | null {
  const k = rawKey.trim();
  if (NUTRIENTE_CAMPO_MAP[k]) return NUTRIENTE_CAMPO_MAP[k];
  const lower = k.toLowerCase();
  for (const [alias, field] of Object.entries(NUTRIENTE_CAMPO_MAP)) {
    if (alias.toLowerCase() === lower) return field;
  }
  return null;
}
