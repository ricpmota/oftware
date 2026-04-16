import type { BioLimitOverrides } from '@/types/bioImpedancia';
import { getExpectedBioKeys } from '@/lib/bioImpedancia/expectedBioKeys';

function isFiniteNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function validateBranch(prefix: string, b: unknown, errors: string[]): void {
  if (b === undefined || b === null) return;
  if (typeof b !== 'object' || Array.isArray(b)) {
    errors.push(`${prefix}: ramo inválido.`);
    return;
  }
  const o = b as Record<string, unknown>;
  for (const k of ['min', 'max', 'barMin', 'barMax'] as const) {
    const v = o[k];
    if (v !== undefined && v !== null && !isFiniteNum(v)) {
      errors.push(`${prefix}: ${k} inválido.`);
    }
  }
  if (isFiniteNum(o.min) && isFiniteNum(o.max) && o.min > o.max) {
    errors.push(`${prefix}: min > max.`);
  }
  if (isFiniteNum(o.barMin) && isFiniteNum(o.barMax) && o.barMin > o.barMax) {
    errors.push(`${prefix}: barMin > barMax.`);
  }
}

/**
 * Valida `bioLimitOverrides` antes de gravar no Firestore.
 */
export function validateBioLimitOverrides(raw: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (raw === undefined) return { ok: true, errors: [] };
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['bioLimitOverrides deve ser um objeto.'] };
  }
  const allowed = new Set(getExpectedBioKeys());
  const o = raw as Record<string, unknown>;

  for (const [key, val] of Object.entries(o)) {
    if (!allowed.has(key)) {
      errors.push(`Chave desconhecida: "${key}".`);
      continue;
    }
    if (val === undefined) continue;
    if (val === null || typeof val !== 'object' || Array.isArray(val)) {
      errors.push(`Valor inválido para "${key}".`);
      continue;
    }
    const rec = val as Record<string, unknown>;
    const hasM = Object.prototype.hasOwnProperty.call(rec, 'M');
    const hasF = Object.prototype.hasOwnProperty.call(rec, 'F');
    const hasFlatMinMax =
      Object.prototype.hasOwnProperty.call(rec, 'min') ||
      Object.prototype.hasOwnProperty.call(rec, 'max') ||
      Object.prototype.hasOwnProperty.call(rec, 'barMin') ||
      Object.prototype.hasOwnProperty.call(rec, 'barMax');

    if (key === 'percentualGordura') {
      if (hasFlatMinMax && (hasM || hasF)) {
        errors.push(`percentualGordura: use só ramos M/F ou só min/max, não ambos.`);
      }
      if (hasM) validateBranch(`percentualGordura.M`, rec.M, errors);
      if (hasF) validateBranch(`percentualGordura.F`, rec.F, errors);
      if (hasFlatMinMax && !hasM && !hasF) {
        validateBranch('percentualGordura', rec, errors);
      }
      continue;
    }

    if (hasM || hasF) {
      errors.push(`"${key}": ramos M/F só são permitidos em percentualGordura.`);
      continue;
    }
    validateBranch(key, rec, errors);
  }

  return { ok: errors.length === 0, errors };
}

export function sanitizeBioLimitOverrides(raw: BioLimitOverrides): BioLimitOverrides {
  const allowed = new Set(getExpectedBioKeys());
  const out: BioLimitOverrides = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!allowed.has(key) || !val || typeof val !== 'object' || Array.isArray(val)) continue;
    const rec = val as Record<string, unknown>;
    const stripBranch = (b: unknown): Record<string, number> | undefined => {
      if (!b || typeof b !== 'object' || Array.isArray(b)) return undefined;
      const br = b as Record<string, unknown>;
      const part: Record<string, number> = {};
      for (const k of ['min', 'max', 'barMin', 'barMax'] as const) {
        const n = br[k];
        if (typeof n === 'number' && Number.isFinite(n)) part[k] = n;
      }
      return Object.keys(part).length ? part : undefined;
    };

    if (key === 'percentualGordura') {
      const hasM = 'M' in rec;
      const hasF = 'F' in rec;
      const flat =
        'min' in rec || 'max' in rec || 'barMin' in rec || 'barMax' in rec
          ? stripBranch(rec)
          : undefined;
      const M = hasM ? stripBranch(rec.M) : undefined;
      const F = hasF ? stripBranch(rec.F) : undefined;
      const entry: Record<string, unknown> = {};
      if (M) entry.M = M;
      if (F) entry.F = F;
      if (flat && !M && !F) Object.assign(entry, flat);
      if (Object.keys(entry).length) out[key] = entry as BioLimitOverrides[string];
      continue;
    }

    const flat = stripBranch(rec);
    if (flat) out[key] = flat as BioLimitOverrides[string];
  }
  return out;
}
