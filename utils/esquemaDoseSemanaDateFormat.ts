/** Formatação e parse de datas do esquema de doses — sempre calendário local (sem UTC). */

export function formatDateAsDDMMYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${yy}`;
}

export function formatWeekdayPt(d: Date): string {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return dias[d.getDay()] ?? '';
}

export function yyyyMmDdFromLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD sem UTC (evita deslocar um dia). */
export function parseYyyyMmDdToLocalDate(ymd: string): Date | null {
  const parts = ymd.trim().split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, mo, da] = parts;
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null;
  const d = new Date(y, mo - 1, da);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
  return d;
}

/** Aceita DD/MM/AA ou DD/MM/AAAA → YYYY-MM-DD (ano com 2 dígitos: 00–69 → 2000–2069, 70–99 → 1970–1999). */
export function parseDDMMYYToYyyyMmDd(s: string): string | null {
  const t = s.trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (m[3].length === 2) {
    year += year >= 70 ? 1900 : 2000;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return yyyyMmDdFromLocalDate(d);
}
