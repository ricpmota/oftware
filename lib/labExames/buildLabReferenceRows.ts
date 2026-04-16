import { getLabRangeEntry } from '@/utils/labRangesFromJson';

type SexedDef = {
  label: string;
  unit: string;
  min?: number;
  max?: number;
  age_ranges?: Array<{ min_age: number; max_age: number | null; min?: number; max?: number; note?: string }>;
};

export type LabReferenceDisplayRow = {
  examKey: string;
  sex: '—' | 'M' | 'F';
  ageBandLabel: string;
  /** `all` simples; `flat` M/F sem idade; `${min_age}_${max}` com max `null` literal */
  ageBandKey: string;
  label: string;
  unit: string;
  baseMin: number;
  baseMax: number;
};

export function ageBandKeyFromJson(minAge: number, maxAge: number | null): string {
  return `${minAge}_${maxAge === null ? 'null' : maxAge}`;
}

export function formatAgeBandLabel(minAge: number, maxAge: number | null): string {
  if (maxAge == null) return `${minAge}+ anos`;
  return `${minAge}–${maxAge} anos`;
}

/** Uma linha por combinação sexo × faixa etária (ou única linha para exame simples). */
export function buildLabReferenceRows(examKey: string): LabReferenceDisplayRow[] {
  const entry = getLabRangeEntry(examKey);
  if (!entry) return [];

  if (!('M' in entry) && !('F' in entry)) {
    const label = entry.label as string | undefined;
    const unit = entry.unit as string | undefined;
    const min = entry.min as number | undefined;
    const max = entry.max as number | undefined;
    if (label != null && unit != null && min != null && max != null) {
      return [
        {
          examKey,
          sex: '—',
          ageBandLabel: 'Todas idades',
          ageBandKey: 'all',
          label,
          unit,
          baseMin: min,
          baseMax: max,
        },
      ];
    }
    return [];
  }

  const rows: LabReferenceDisplayRow[] = [];
  for (const sex of ['M', 'F'] as const) {
    const sub = entry[sex] as SexedDef | undefined;
    if (!sub) continue;
    if (sub.age_ranges?.length) {
      for (const ar of sub.age_ranges) {
        if (ar.max == null && ar.note) continue;
        const min = ar.min ?? 0;
        const max = ar.max;
        if (max == null) continue;
        rows.push({
          examKey,
          sex,
          ageBandLabel: formatAgeBandLabel(ar.min_age, ar.max_age),
          ageBandKey: ageBandKeyFromJson(ar.min_age, ar.max_age),
          label: sub.label,
          unit: sub.unit,
          baseMin: min,
          baseMax: max,
        });
      }
    } else if (sub.min != null && sub.max != null) {
      rows.push({
        examKey,
        sex,
        ageBandLabel: 'Todas idades',
        ageBandKey: 'flat',
        label: sub.label,
        unit: sub.unit,
        baseMin: sub.min,
        baseMax: sub.max,
      });
    }
  }
  return rows;
}

export function labReferenceRowId(r: Pick<LabReferenceDisplayRow, 'examKey' | 'sex' | 'ageBandKey'>): string {
  return `${r.examKey}@${r.sex}@${r.ageBandKey}`;
}

/** Todas as linhas de referência para a lista oficial de exames. */
export function buildAllLabReferenceRows(examKeys: string[]): LabReferenceDisplayRow[] {
  const out: LabReferenceDisplayRow[] = [];
  for (const k of examKeys) {
    out.push(...buildLabReferenceRows(k));
  }
  return out;
}

export function parseAgeBandKey(ageBandKey: string): { min_age: number; max_age: number | null } | null {
  if (ageBandKey === 'all' || ageBandKey === 'flat') return null;
  const parts = ageBandKey.split('_');
  if (parts.length < 2) return null;
  const min_age = Number(parts[0]);
  const maxRaw = parts.slice(1).join('_');
  if (!Number.isFinite(min_age)) return null;
  const max_age = maxRaw === 'null' ? null : Number(maxRaw);
  if (max_age !== null && !Number.isFinite(max_age)) return null;
  return { min_age, max_age };
}
