import { labOrderBySection } from '@/types/labRanges';

/** Ordem padrão versionada no código (fallback se Firestore vazio). */
export function getDefaultLabOrderBySection(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(labOrderBySection)) {
    out[k] = [...v];
  }
  return out;
}

export function getExpectedLabExamKeys(): string[] {
  return Object.values(labOrderBySection).flat();
}

/**
 * Valida que a ordem salva tem exatamente os mesmos exames que o padrão,
 * cada um em uma única seção, e que só existem seções conhecidas.
 */
export function validateLabOrderBySection(order: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!order || typeof order !== 'object' || Array.isArray(order)) {
    return { ok: false, errors: ['labOrderBySection deve ser um objeto.'] };
  }
  const defaultSections = Object.keys(labOrderBySection);
  const defaultSet = new Set(defaultSections);
  const expectedKeys = new Set(getExpectedLabExamKeys());
  const o = order as Record<string, unknown>;
  const seen = new Set<string>();

  for (const sec of defaultSections) {
    if (!(sec in o)) {
      errors.push(`Sistema ausente: "${sec}"`);
      continue;
    }
    const arr = o[sec];
    if (!Array.isArray(arr)) {
      errors.push(`Sistema "${sec}" deve ser um array de chaves.`);
      continue;
    }
    for (const k of arr) {
      if (typeof k !== 'string' || !k.trim()) {
        errors.push(`Chave inválida em "${sec}".`);
        continue;
      }
      if (seen.has(k)) errors.push(`Exame "${k}" aparece em mais de um sistema.`);
      seen.add(k);
    }
  }

  for (const sec of Object.keys(o)) {
    if (!defaultSet.has(sec)) errors.push(`Sistema desconhecido: "${sec}"`);
  }

  for (const k of expectedKeys) {
    if (!seen.has(k)) errors.push(`Exame obrigatório ausente: "${k}"`);
  }
  for (const k of seen) {
    if (!expectedKeys.has(k)) errors.push(`Exame não reconhecido: "${k}"`);
  }

  return { ok: errors.length === 0, errors };
}
