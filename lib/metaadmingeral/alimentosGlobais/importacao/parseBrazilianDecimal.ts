/**
 * Conversão determinística de decimais brasileiros e null vs zero.
 * Não depende do Gemini para a conversão final.
 */

const NULL_TOKENS = new Set([
  '',
  '-',
  '—',
  '–',
  'n/d',
  'nd',
  'n.d.',
  'n.d',
  'na',
  'n/a',
  'nao informado',
  'não informado',
  'naoaplicavel',
  'não aplicável',
  'tr',
  'tr.',
  'traces',
]);

export function isNullToken(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return NULL_TOKENS.has(t);
}

/**
 * Parseia número no formato BR (vírgula decimal) ou EN.
 * "0" / "0,00" → 0
 * "-" / "—" / vazio / N/D → null
 * "1.234,56" → 1234.56
 * "31,85" → 31.85
 * "0.56" → 0.56 (EN)
 */
export function parseBrazilianDecimal(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t || isNullToken(t)) return null;

  let s = t.replace(/\s/g, '');
  // remove símbolos de unidade colados (g, mg, kcal…) — só se forem sufixo
  s = s.replace(/(kg|g|mg|µg|ug|mcg|kcal|kj|%|ml)$/i, '');
  if (!s || isNullToken(s)) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // Assume ponto = milhar, vírgula = decimal (BR)
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  // só ponto: deixa como está (EN ou inteiro com milhar ambíguo — 1.234 sem vírgula)
  // Se parece milhar BR sem decimal (ex.: 1.234) e tem exatamente 1 ponto com 3 dígitos após:
  if (!hasComma && hasDot) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1 && !parts[0].includes('.')) {
      // Ambíguo: 1.234 poderia ser 1.234 EN ou 1234 BR. Preferimos EN se parte inteira é 1 dígito e decimal 3
      // Heurística nutricional: valores tipicamente < 1000 com 1–2 casas. Se 3 dígitos após ponto e esquerda >= 2 → milhar BR
      if (parts[0].length >= 2) {
        s = parts[0] + parts[1];
      }
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Preferência: valorOriginal string → número; se Gemini já mandou number, usa (0 permanece 0). */
export function coalesceNutrientValue(
  valor: unknown,
  valorOriginal?: unknown
): { valor: number | null; valorOriginal: string | null } {
  const original =
    typeof valorOriginal === 'string'
      ? valorOriginal.trim() || null
      : valorOriginal == null
        ? null
        : String(valorOriginal);

  if (original != null) {
    return { valor: parseBrazilianDecimal(original), valorOriginal: original };
  }

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return { valor, valorOriginal: null };
  }
  if (typeof valor === 'string') {
    return { valor: parseBrazilianDecimal(valor), valorOriginal: valor.trim() || null };
  }
  return { valor: null, valorOriginal: null };
}
