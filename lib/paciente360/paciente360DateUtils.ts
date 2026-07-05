export function toDateValue(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v);
  const td = (v as { toDate?: () => Date })?.toDate?.();
  if (td && !isNaN(td.getTime())) return new Date(td);
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ymdFromUnknown(v: unknown): string | undefined {
  const d = toDateValue(v);
  return d ? formatYmd(d) : undefined;
}
