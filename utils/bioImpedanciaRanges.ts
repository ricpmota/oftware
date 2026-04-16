/**
 * Resolve faixas de referência para Bio Impedância
 * Usa limites_bioimpedancia.json com suporte a sexo e peso
 * Composição corporal usa percentualPeso para calcular min/max ideais pelo peso
 */

import limitesBio from '@/data/limites_bioimpedancia.json';

export type Sex = 'M' | 'F';

export interface BioRange {
  label: string;
  unit: string;
  min: number;
  max: number;
  /** Escala total da barra - valor mínimo (zona Abaixo) */
  barMin?: number;
  /** Escala total da barra - valor máximo (zona Acima) */
  barMax?: number;
}

const flatMap: Record<string, unknown> = {};
for (const section of Object.values(limitesBio as Record<string, Record<string, unknown>>)) {
  if (typeof section !== 'object' || section === null) continue;
  for (const [key, def] of Object.entries(section)) {
    if (def && typeof def === 'object') flatMap[key] = def as Record<string, unknown>;
  }
}

/**
 * Retorna o range de referência para um campo de bio impedância.
 * @param key Chave do campo (ex: aguaTotalLitros, percentualGordura)
 * @param sex Sexo biológico (M/F) - usado em PGC
 * @param peso Peso do paciente (kg) - usado em Composição Corporal para fórmulas percentualPeso
 */
export function getBioRange(
  key: string,
  sex?: Sex | 'Outro' | null,
  peso?: number | null
): BioRange | null {
  const entry = flatMap[key] as Record<string, unknown> | undefined;
  if (!entry) return null;

  const absMin = typeof entry.min === 'number' ? entry.min : 0;
  const absMax = typeof entry.max === 'number' ? entry.max : 100;

  // Composição Corporal / Músculo-Gordura: usa percentualPeso se disponível (peso informado ou fallback 70kg)
  const percentualPeso = entry.percentualPeso as { min?: number; max?: number; M?: { min: number; max: number }; F?: { min: number; max: number } } | undefined;
  const pesoParaCalc = peso != null && peso > 0 ? peso : 70;

  // percentualPeso com M/F (ex: massaGorduraKg = PGC ideal) - fallback F se sexo não M/F
  const pctSex = percentualPeso && sex === 'M' ? (percentualPeso as { M?: { min: number; max: number } }).M
    : percentualPeso ? (percentualPeso as { F?: { min: number; max: number } }).F : undefined;
  if (pctSex && typeof pctSex.min === 'number' && typeof pctSex.max === 'number') {
    const minCalc = (pesoParaCalc * pctSex.min) / 100;
    const maxCalc = (pesoParaCalc * pctSex.max) / 100;
    return {
      label: (entry.label as string) || key,
      unit: (entry.unit as string) || '',
      min: minCalc,
      max: maxCalc,
      barMin: absMin,
      barMax: absMax,
    };
  }

  // percentualPeso simples (ex: aguaTotalLitros 45-65%, massaMuscularKg 35-45%)
  if (percentualPeso && typeof percentualPeso.min === 'number' && typeof percentualPeso.max === 'number') {
    const minCalc = (pesoParaCalc * percentualPeso.min) / 100;
    const maxCalc = (pesoParaCalc * percentualPeso.max) / 100;
    return {
      label: (entry.label as string) || key,
      unit: (entry.unit as string) || '',
      min: minCalc,
      max: maxCalc,
      barMin: absMin,
      barMax: absMax,
    };
  }

  // Campos com min/max direto (sem percentualPeso)
  if (typeof entry.min === 'number' && typeof entry.max === 'number') {
    return {
      label: (entry.label as string) || key,
      unit: (entry.unit as string) || '',
      min: entry.min,
      max: entry.max,
      barMin: absMin,
      barMax: absMax,
    };
  }

  // PGC: sexo específico (M/F)
  if ('M' in entry || 'F' in entry) {
    const sub = sex === 'M' || sex === 'F' ? (entry[sex] as { min?: number; max?: number }) : (entry.default as { min?: number; max?: number });
    if (!sub || typeof sub.min !== 'number' || typeof sub.max !== 'number') return null;
    const def = entry.default as { min?: number; max?: number } | undefined;
    const barMin = def && typeof def.min === 'number' ? def.min : 0;
    const barMax = def && typeof def.max === 'number' ? def.max : 50;
    return {
      label: (entry.label as string) || key,
      unit: (entry.unit as string) || '%',
      min: sub.min,
      max: sub.max,
      barMin,
      barMax,
    };
  }

  return null;
}
