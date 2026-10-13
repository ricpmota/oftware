/**
 * Segmentos nutricionais da Base Global de Alimentos (Patrimônio Global).
 * Conceito A — distinto de CategoriaItemPlano (papel no cardápio).
 */

export const SEGMENTOS_ALIMENTO = [
  'ACUCARES_E_DOCES',
  'ALIMENTOS_INDUSTRIALIZADOS',
  'ALIMENTOS_PARA_FINS_ESPECIAIS',
  'BEBIDAS',
  'CARNES_E_DERIVADOS',
  'CEREAIS_E_DERIVADOS',
  'FAST_FOOD',
  'FRUTAS_E_DERIVADOS',
  'GORDURAS_E_OLEOS',
  'LEGUMINOSAS_E_DERIVADOS',
  'LEITE_E_DERIVADOS',
  'MISCELANEAS',
  'NOZES_E_SEMENTES',
  'OVOS_E_DERIVADOS',
  'PESCADOS_E_FRUTOS_DO_MAR',
  'REFEICOES_COMPLETAS',
  'VEGETAIS_E_DERIVADOS',
] as const;

export type SegmentoAlimento = (typeof SEGMENTOS_ALIMENTO)[number];

export const ROTULO_SEGMENTO_ALIMENTO: Record<SegmentoAlimento, string> = {
  ACUCARES_E_DOCES: 'Açúcares e Doces',
  ALIMENTOS_INDUSTRIALIZADOS: 'Alimentos Industrializados',
  ALIMENTOS_PARA_FINS_ESPECIAIS: 'Alimentos para Fins Especiais',
  BEBIDAS: 'Bebidas',
  CARNES_E_DERIVADOS: 'Carnes e Derivados',
  CEREAIS_E_DERIVADOS: 'Cereais e Derivados',
  FAST_FOOD: 'Fast Food',
  FRUTAS_E_DERIVADOS: 'Frutas e Derivados',
  GORDURAS_E_OLEOS: 'Gorduras e Óleos',
  LEGUMINOSAS_E_DERIVADOS: 'Leguminosas e Derivados',
  LEITE_E_DERIVADOS: 'Leite e Derivados',
  MISCELANEAS: 'Miscelâneas',
  NOZES_E_SEMENTES: 'Nozes e Sementes',
  OVOS_E_DERIVADOS: 'Ovos e Derivados',
  PESCADOS_E_FRUTOS_DO_MAR: 'Pescados e Frutos do Mar',
  REFEICOES_COMPLETAS: 'Refeições Completas',
  VEGETAIS_E_DERIVADOS: 'Vegetais e Derivados',
};

export function isSegmentoAlimento(value: unknown): value is SegmentoAlimento {
  return typeof value === 'string' && (SEGMENTOS_ALIMENTO as readonly string[]).includes(value);
}

export function rotuloSegmentoAlimento(segmento: SegmentoAlimento | string): string {
  if (isSegmentoAlimento(segmento)) return ROTULO_SEGMENTO_ALIMENTO[segmento];
  return segmento;
}
