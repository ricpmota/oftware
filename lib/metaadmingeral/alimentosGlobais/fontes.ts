import type { FonteAlimentoGlobal } from './types';

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const t = value.trim().replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length ? t : null;
}

function toIsoSafe(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (v && typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export function parseFonteAlimento(raw: unknown): FonteAlimentoGlobal | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const valoresOriginais =
    r.valoresOriginais && typeof r.valoresOriginais === 'object' && !Array.isArray(r.valoresOriginais)
      ? (r.valoresOriginais as Record<string, string | null>)
      : null;
  const fonte: FonteAlimentoGlobal = {
    nome: parseNullableString(r.nome),
    documento: parseNullableString(r.documento),
    versao: parseNullableString(r.versao),
    ano: parseNullableNumber(r.ano),
    codigoOriginal: parseNullableString(r.codigoOriginal),
    pagina: parseNullableNumber(r.pagina),
    tabela: parseNullableString(r.tabela),
    licenca: parseNullableString(r.licenca),
    usoPermitido: parseNullableString(r.usoPermitido),
    importId: parseNullableString(r.importId),
    itemImportId: parseNullableString(r.itemImportId),
    modeloGemini: parseNullableString(r.modeloGemini),
    promptVersion: parseNullableString(r.promptVersion),
    valoresOriginais,
    registradoEm: toIsoSafe(r.registradoEm),
  };
  const hasAny = Object.entries(fonte).some(([k, v]) => {
    if (k === 'valoresOriginais') return v != null && Object.keys(v as object).length > 0;
    return v != null && v !== '';
  });
  return hasAny ? fonte : null;
}

/**
 * Loader retrocompatível:
 * - registro antigo: só `fonte`
 * - registro novo: `fontes[]` (+ opcional `fonte` principal)
 */
export function resolveFontesAlimento(data: {
  fonte?: unknown;
  fontes?: unknown;
}): { fonte: FonteAlimentoGlobal | null; fontes: FonteAlimentoGlobal[] } {
  const fromArray: FonteAlimentoGlobal[] = [];
  if (Array.isArray(data.fontes)) {
    for (const item of data.fontes) {
      const parsed = parseFonteAlimento(item);
      if (parsed) fromArray.push(parsed);
    }
  }
  const single = parseFonteAlimento(data.fonte);
  if (fromArray.length === 0 && single) {
    return { fonte: single, fontes: [single] };
  }
  if (fromArray.length > 0) {
    const principal = single ?? fromArray[fromArray.length - 1] ?? null;
    return { fonte: principal, fontes: fromArray };
  }
  return { fonte: null, fontes: [] };
}

/** Anexa fonte sem substituir histórico. Dedup leve por importId+itemImportId. */
export function appendFonteHistorico(
  existentes: FonteAlimentoGlobal[],
  nova: FonteAlimentoGlobal
): FonteAlimentoGlobal[] {
  if (!nova.importId && !nova.itemImportId) {
    return [...existentes, nova];
  }
  const key = `${nova.importId ?? ''}|${nova.itemImportId ?? ''}`;
  const filtered = existentes.filter((f) => {
    const k = `${f.importId ?? ''}|${f.itemImportId ?? ''}`;
    return k !== key;
  });
  return [...filtered, nova];
}
