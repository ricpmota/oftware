import { getExpectedLabExamKeys } from '@/lib/labExames/validateLabOrderBySection';

function validateAgeBand(key: string, prefix: string, ar: unknown, errors: string[]): void {
  if (!ar || typeof ar !== 'object' || Array.isArray(ar)) {
    errors.push(`${prefix}: faixa etária inválida em "${key}".`);
    return;
  }
  const r = ar as Record<string, unknown>;
  const min_age = r.min_age;
  const max_age = r.max_age;
  if (typeof min_age !== 'number' || !Number.isFinite(min_age)) {
    errors.push(`${prefix}: min_age inválido em "${key}".`);
    return;
  }
  if (max_age !== null && max_age !== undefined && (typeof max_age !== 'number' || !Number.isFinite(max_age))) {
    errors.push(`${prefix}: max_age inválido em "${key}".`);
  }
  const min = r.min;
  const max = r.max;
  if (min !== undefined && min !== null && (typeof min !== 'number' || !Number.isFinite(min))) {
    errors.push(`${prefix}: min inválido na faixa em "${key}".`);
  }
  if (max !== undefined && max !== null && (typeof max !== 'number' || !Number.isFinite(max))) {
    errors.push(`${prefix}: max inválido na faixa em "${key}".`);
  }
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push(`${prefix}: min > max na faixa em "${key}".`);
  }
  if (r.label !== undefined && r.label !== null && typeof r.label !== 'string') {
    errors.push(`${prefix}: label inválida na faixa em "${key}".`);
  }
  if (r.unit !== undefined && r.unit !== null && typeof r.unit !== 'string') {
    errors.push(`${prefix}: unit inválida na faixa em "${key}".`);
  }
}

function validateSexBranch(key: string, sex: string, branch: unknown, errors: string[]): void {
  if (!branch || typeof branch !== 'object' || Array.isArray(branch)) {
    errors.push(`Ramo ${sex} inválido em "${key}".`);
    return;
  }
  const b = branch as Record<string, unknown>;
  const min = b.min;
  const max = b.max;
  if (min !== undefined && min !== null && (typeof min !== 'number' || !Number.isFinite(min))) {
    errors.push(`min inválido (${sex}) em "${key}".`);
  }
  if (max !== undefined && max !== null && (typeof max !== 'number' || !Number.isFinite(max))) {
    errors.push(`max inválido (${sex}) em "${key}".`);
  }
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push(`min > max (${sex}) em "${key}".`);
  }
  if (b.label !== undefined && b.label !== null && typeof b.label !== 'string') {
    errors.push(`label inválida (${sex}) em "${key}".`);
  }
  if (b.unit !== undefined && b.unit !== null && typeof b.unit !== 'string') {
    errors.push(`unit inválida (${sex}) em "${key}".`);
  }
  const ars = b.age_ranges;
  if (ars !== undefined && ars !== null) {
    if (!Array.isArray(ars)) {
      errors.push(`age_ranges deve ser array em "${key}" (${sex}).`);
    } else {
      ars.forEach((ar, i) => {
        validateAgeBand(key, `${sex}[${i}]`, ar, errors);
      });
    }
  }
}

/**
 * Valida `labLimitOverrides` no Firestore: chaves conhecidas; legado simples ou M/F com faixas etárias.
 */
export function validateLabLimitOverrides(overrides: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (overrides === undefined) {
    return { ok: true, errors: [] };
  }
  if (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return { ok: false, errors: ['labLimitOverrides deve ser um objeto.'] };
  }
  const allowed = new Set(getExpectedLabExamKeys());
  const o = overrides as Record<string, unknown>;
  for (const [key, val] of Object.entries(o)) {
    if (!allowed.has(key)) {
      errors.push(`Chave desconhecida em labLimitOverrides: "${key}"`);
      continue;
    }
    if (!val || typeof val !== 'object' || Array.isArray(val)) {
      errors.push(`Valor inválido para "${key}".`);
      continue;
    }
    const v = val as Record<string, unknown>;
    const hasM = v.M != null && typeof v.M === 'object' && !Array.isArray(v.M);
    const hasF = v.F != null && typeof v.F === 'object' && !Array.isArray(v.F);

    if (hasM) validateSexBranch(key, 'M', v.M, errors);
    if (hasF) validateSexBranch(key, 'F', v.F, errors);

    if (hasM || hasF) {
      for (const rk of ['min', 'max', 'label', 'unit'] as const) {
        if (v[rk] !== undefined && v[rk] !== null) {
          errors.push(`Com M/F definidos, não use "${rk}" na raiz em "${key}".`);
          break;
        }
      }
      continue;
    }

    const min = v.min;
    const max = v.max;
    if (min !== undefined && min !== null && (typeof min !== 'number' || !Number.isFinite(min))) {
      errors.push(`min inválido para "${key}".`);
    }
    if (max !== undefined && max !== null && (typeof max !== 'number' || !Number.isFinite(max))) {
      errors.push(`max inválido para "${key}".`);
    }
    if (typeof min === 'number' && typeof max === 'number' && min > max) {
      errors.push(`min > max para "${key}".`);
    }
    if (v.label !== undefined && v.label !== null && typeof v.label !== 'string') {
      errors.push(`label inválida para "${key}".`);
    }
    if (v.unit !== undefined && v.unit !== null && typeof v.unit !== 'string') {
      errors.push(`unit inválida para "${key}".`);
    }
  }
  return { ok: errors.length === 0, errors };
}
