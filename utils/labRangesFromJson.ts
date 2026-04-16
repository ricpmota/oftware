/**
 * Resolve faixas de referência laboratorial a partir do JSON com suporte a sexo e idade.
 * Usa dadosIdentificacao.dataNascimento e sexoBiologico do paciente.
 */

import labLimitesJson from '@/data/limites_exames_atual_v2_idade.json';

export type Sex = 'M' | 'F';

export interface LabRange {
  label: string;
  unit: string;
  min: number;
  max: number;
}

type AgeRange = { min_age: number; max_age: number | null; min?: number; max?: number; note?: string };
type SexedDef = { label: string; unit: string; min?: number; max?: number; age_ranges?: AgeRange[]; apply_from_age?: number; ideal?: { min?: number; max?: number }; notes?: string[] };

// Flatten JSON: todas as seções → mapa único por key
const flatMap: Record<string, Record<string, unknown> | { M?: SexedDef; F?: SexedDef }> = {};
for (const section of Object.values(labLimitesJson as Record<string, Record<string, unknown>>)) {
  if (typeof section !== 'object' || section === null) continue;
  for (const [key, def] of Object.entries(section)) {
    if (def && typeof def === 'object') (flatMap as Record<string, unknown>)[key] = def as Record<string, unknown>;
  }
}

/**
 * Calcula idade em anos a partir de dataNascimento (Date, Firestore Timestamp ou string).
 */
export function calcularIdade(dataNascimento: Date | { toDate?: () => Date } | string | null | undefined): number | null {
  if (dataNascimento == null || dataNascimento === '') return null;
  let d: Date;
  if (typeof dataNascimento === 'string') {
    d = new Date(dataNascimento);
  } else if (typeof (dataNascimento as { toDate?: () => Date }).toDate === 'function') {
    d = (dataNascimento as { toDate: () => Date }).toDate();
  } else {
    d = dataNascimento as Date;
  }
  if (isNaN(d.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  const dia = hoje.getDate() - d.getDate();
  if (m < 0 || (m === 0 && dia < 0)) idade--;
  return idade;
}

function resolveAgeRange(ageRanges: AgeRange[], age: number): { min: number; max: number } | null {
  for (const r of ageRanges) {
    if (age < r.min_age) continue;
    if (r.max_age != null && age > r.max_age) continue;
    const min = r.min ?? 0;
    const max = r.max;
    if (max != null) return { min, max };
    if (r.note) return null; // ex: 80+ sem max definido
  }
  return null;
}

/**
 * Resolve o range de referência para um exame, considerando sexo e idade.
 * @param key Chave do exame (ex: fastingGlucose, psa, igf1)
 * @param sex Sexo biológico do paciente ('M' | 'F')
 * @param dataNascimento Data de nascimento (Date, Timestamp ou string ISO)
 */
export function getLabRange(
  key: string,
  sex?: Sex | 'Outro' | null,
  dataNascimento?: Date | { toDate?: () => Date } | string | null
): LabRange | null {
  const entry = flatMap[key] as Record<string, unknown> | undefined;
  if (!entry) return null;

  const sexVal = sex === 'M' || sex === 'F' ? sex : undefined;
  const age = dataNascimento != null ? calcularIdade(dataNascimento) : null;

  // Sex-specific entry (M / F)
  if ('M' in entry || 'F' in entry) {
    const sub = sexVal ? (entry[sexVal] as SexedDef) : null;
    if (!sub) {
      // Fallback: sem sexo → faixa combinada. Exames só-M (PSA): se sex=F retorna null
      const mM = entry['M'] as SexedDef | undefined;
      const mF = entry['F'] as SexedDef | undefined;
      if (sexVal === 'F' && mM && !mF) return null; // PSA etc: não aplicável a mulheres
      if (mM?.age_ranges || mF?.age_ranges) {
        // PSA/IGF-1: sem sexo definido, usar primeira faixa para ainda aparecer na lista
        if (mM?.age_ranges && !mF) {
          const first = mM.age_ranges.find(r => r.max != null);
          if (first?.max != null)
            return { label: mM.label + ' (M; defina idade p/ ref. exata)', unit: mM.unit, min: first.min ?? 0, max: first.max };
        }
        return null;
      }
      const ranges: { min: number; max: number; label: string; unit: string }[] = [];
      if (mM?.min != null && mM?.max != null) ranges.push({ min: mM.min, max: mM.max, label: mM.label, unit: mM.unit });
      if (mF?.min != null && mF?.max != null) ranges.push({ min: mF.min, max: mF.max, label: mF.label, unit: mF.unit });
      if (ranges.length === 0) return null;
      const labelMap: Record<string, string> = { ferritin: 'Ferritina', iron: 'Ferro sérico', hgb: 'Hemoglobina', testosteronaTotal: 'Testosterona Total', testosteronaLivre: 'Testosterona Livre', shbg: 'SHBG', lh: 'LH', fsh: 'FSH', estradiol: 'Estradiol', dht: 'DHT', dheas: 'DHEA-S', prolactina: 'Prolactina', leptina: 'Leptina', creatinine: 'Creatinina', alt: 'ALT/TGP', ast: 'AST/TGO', ggt: 'GGT', hdl: 'HDL-c', calcitonin: 'Calcitonina' };
      const r0 = ranges[0];
      const combined = ranges.reduce((a, r) => ({ min: Math.min(a.min, r.min), max: Math.max(a.max, r.max) }), { min: r0.min, max: r0.max });
      return { label: labelMap[key] || r0.label, unit: r0.unit, min: combined.min, max: combined.max };
    }

    if (sub.age_ranges) {
      const resolved = age != null ? resolveAgeRange(sub.age_ranges, age) : null;
      if (resolved)
        return {
          label: sub.label,
          unit: sub.unit,
          min: resolved.min,
          max: resolved.max
        };
      // Fallback: usar primeira faixa com max (ex: PSA sem idade → 40-49 <2.5)
      const firstWithMax = sub.age_ranges.find(r => r.max != null);
      if (firstWithMax?.max != null)
        return {
          label: sub.label + (age == null ? ' (defina idade para referência exata)' : ''),
          unit: sub.unit,
          min: firstWithMax.min ?? 0,
          max: firstWithMax.max
        };
      return null;
    }

    if (sub.min != null && sub.max != null)
      return { label: sub.label, unit: sub.unit, min: sub.min, max: sub.max };
    return null;
  }

  // Simple entry (label, unit, min, max)
  const label = entry.label as string | undefined;
  const unit = entry.unit as string | undefined;
  const min = entry.min as number | undefined;
  const max = entry.max as number | undefined;
  if (label != null && unit != null && min != null && max != null)
    return { label, unit, min, max };

  return null;
}

/**
 * Verifica se o valor está dentro do intervalo de referência.
 */
export function isInRange(value: number | null | undefined, range: LabRange | null): boolean | null {
  if (value == null || range == null) return null;
  return value >= range.min && value <= range.max;
}

/**
 * Retorna a entrada bruta do exame (para compatibilidade com fallbacks que usam .M / .F).
 */
export function getLabRangeEntry(key: string): Record<string, unknown> | undefined {
  return flatMap[key] as Record<string, unknown> | undefined;
}
