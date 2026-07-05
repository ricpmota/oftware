/**
 * Data de nascimento como dia civil (sem horário).
 *
 * - Strings só-data `YYYY-MM-DD` → meia-noite local nesse dia.
 * - Firestore Timestamp / Date vindos de `YYYY-MM-DD` em UTC (meia-noite Z) → dia civil
 *   pelo calendário UTC (10/03, não 09/03 no Brasil).
 * - Demais instantes → dia civil em America/Sao_Paulo (ex.: meia-noite em SP gravada como 03:00Z).
 *
 * Não usar prefixo YYYY-MM-DD em strings ISO com hora: o dia na string pode ser o dia UTC,
 * não o dia de aniversário no Brasil.
 */
export function parseDataNascimentoDiaMesLocal(v: unknown): Date | null {
  if (v == null) return null;

  const fromYmdNumbers = (y: number, mo: number, da: number): Date | null => {
    if (![y, mo, da].every((n) => Number.isFinite(n))) return null;
    if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
    return new Date(y, mo - 1, da);
  };

  if (typeof v === 'string') {
    const s = v.trim();
    const ymdOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (ymdOnly) {
      return fromYmdNumbers(Number(ymdOnly[1]), Number(ymdOnly[2]), Number(ymdOnly[3]));
    }
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (dmy) {
      return fromYmdNumbers(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
    }
  }

  let d: Date | null = null;
  if (v instanceof Date) {
    d = v;
  } else if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      d = (v as { toDate: () => Date }).toDate();
    } catch {
      d = null;
    }
  } else {
    const secRaw =
      typeof (v as { seconds?: unknown }).seconds === 'number'
        ? (v as { seconds: number }).seconds
        : typeof (v as { _seconds?: unknown })._seconds === 'number'
          ? (v as { _seconds: number })._seconds
          : null;
    if (secRaw !== null) {
      const ns = Number(
        (v as { nanoseconds?: unknown }).nanoseconds ??
          (v as { _nanoseconds?: unknown })._nanoseconds ??
          0
      );
      d = new Date(secRaw * 1000 + ns / 1e6);
    } else if (typeof v === 'string' || typeof v === 'number') {
      d = new Date(v as string | number);
    }
  }

  if (!d || Number.isNaN(d.getTime())) return null;

  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();
  const utcS = d.getUTCSeconds();
  const utcMs = d.getUTCMilliseconds();
  if (utcH === 0 && utcM === 0 && utcS === 0 && utcMs === 0) {
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = Number(parts.find((p) => p.type === 'year')?.value);
    const mo = Number(parts.find((p) => p.type === 'month')?.value);
    const da = Number(parts.find((p) => p.type === 'day')?.value);
    if (!Number.isNaN(y) && !Number.isNaN(mo) && !Number.isNaN(da)) {
      return new Date(y, mo - 1, da);
    }
  } catch {
    /* ignore */
  }

  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
