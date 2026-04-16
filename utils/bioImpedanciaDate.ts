/**
 * Normaliza `dataRegistro` vinda do Firestore (Timestamp, serializado, ISO, inválida).
 */

export function isBioDateValid(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

function isValidTime(d: Date): boolean {
  return isBioDateValid(d);
}

/**
 * Converte qualquer representação comum em `Date` válida; fallback = agora.
 */
export function parseBioDataRegistro(value: unknown): Date {
  if (value == null || value === '') return new Date();

  if (value instanceof Date) {
    return isValidTime(value) ? value : new Date();
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const fn = (value as { toDate?: () => unknown }).toDate;
    if (typeof fn === 'function') {
      try {
        const d = fn.call(value) as Date;
        if (d instanceof Date && isValidTime(d)) return d;
      } catch {
        /* ignore */
      }
    }
  }

  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const sec = Number((value as { seconds: unknown }).seconds);
    if (Number.isFinite(sec)) {
      const ns = Number((value as { nanoseconds?: unknown }).nanoseconds ?? 0);
      const d = new Date(sec * 1000 + (Number.isFinite(ns) ? ns / 1e6 : 0));
      if (isValidTime(d)) return d;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    if (isValidTime(d)) return d;
  }

  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return new Date();
    const d = new Date(t);
    if (isValidTime(d)) return d;
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const d2 = new Date(y, mo, day, 12, 0, 0, 0);
      if (isValidTime(d2)) return d2;
    }
  }

  return new Date();
}

/** Valor para `<input type="date">` em calendário local (evita Invalid + deslocamento UTC). */
export function formatBioDateInputLocal(d: Date): string {
  const x = isValidTime(d) ? d : new Date();
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse de `YYYY-MM-DD` do input para Date local meio-dia. */
export function dateFromBioDateInput(ymd: string): Date {
  const parts = ymd.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return new Date();
  const [y, mo, day] = parts;
  const d = new Date(y, mo - 1, day, 12, 0, 0, 0);
  return isValidTime(d) ? d : new Date();
}

export function formatBioRegistroPtBr(value: unknown): string {
  const d = parseBioDataRegistro(value);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatBioRegistroPtBrShort(value: unknown): string {
  const d = parseBioDataRegistro(value);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}
