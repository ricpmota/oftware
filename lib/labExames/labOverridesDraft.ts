import type {
  LabLimitAgeBandOverride,
  LabLimitOverrideEntry,
  LabLimitOverrides,
  LabLimitSexBranchOverride,
} from '@/utils/labRangesFromJson';
import {
  labReferenceRowId,
  parseAgeBandKey,
  type LabReferenceDisplayRow,
} from '@/lib/labExames/buildLabReferenceRows';

export function emptyCellDraft(rows: LabReferenceDisplayRow[]): Record<string, { min: string; max: string }> {
  const d: Record<string, { min: string; max: string }> = {};
  for (const r of rows) {
    d[labReferenceRowId(r)] = { min: '', max: '' };
  }
  return d;
}

export function mergeServerOverridesIntoDraft(
  rows: LabReferenceDisplayRow[],
  server: LabLimitOverrides | undefined
): Record<string, { min: string; max: string }> {
  const d = emptyCellDraft(rows);
  if (!server || typeof server !== 'object') return d;

  for (const [examKey, raw] of Object.entries(server)) {
    if (!raw || typeof raw !== 'object') continue;
    const v = raw as LabLimitOverrideEntry;
    const hasSexBranch =
      (v.M != null && typeof v.M === 'object') || (v.F != null && typeof v.F === 'object');

    if (hasSexBranch) {
      for (const sex of ['M', 'F'] as const) {
        const br = v[sex];
        if (!br || typeof br !== 'object') continue;
        if (br.age_ranges?.length) {
          for (const ar of br.age_ranges) {
            const bk = `${ar.min_age}_${ar.max_age === null ? 'null' : ar.max_age}`;
            const id = `${examKey}@${sex}@${bk}`;
            if (d[id]) {
              d[id] = {
                min: ar.min != null && Number.isFinite(ar.min) ? String(ar.min) : '',
                max: ar.max != null && Number.isFinite(ar.max) ? String(ar.max) : '',
              };
            }
          }
        }
        const idFlat = `${examKey}@${sex}@flat`;
        if (d[idFlat] && (br.min != null || br.max != null)) {
          d[idFlat] = {
            min: br.min != null && Number.isFinite(br.min) ? String(br.min) : '',
            max: br.max != null && Number.isFinite(br.max) ? String(br.max) : '',
          };
        }
      }
    } else {
      const idAll = `${examKey}@—@all`;
      if (d[idAll]) {
        d[idAll] = {
          min: v.min != null && Number.isFinite(v.min) ? String(v.min) : '',
          max: v.max != null && Number.isFinite(v.max) ? String(v.max) : '',
        };
      }
    }
  }
  return d;
}

function parseCell(
  examKey: string,
  ctx: string,
  minTrim: string,
  maxTrim: string
): { min?: number; max?: number } {
  if (minTrim === '' && maxTrim === '') return {};
  const min = minTrim === '' ? undefined : Number(minTrim);
  const max = maxTrim === '' ? undefined : Number(maxTrim);
  if (minTrim !== '' && (min === undefined || !Number.isFinite(min))) {
    throw new Error(`Min inválido (${examKey} ${ctx}).`);
  }
  if (maxTrim !== '' && (max === undefined || !Number.isFinite(max))) {
    throw new Error(`Max inválido (${examKey} ${ctx}).`);
  }
  if (min !== undefined && max !== undefined && min > max) {
    throw new Error(`Min maior que max (${examKey} ${ctx}).`);
  }
  const o: { min?: number; max?: number } = {};
  if (min !== undefined) o.min = min;
  if (max !== undefined) o.max = max;
  return o;
}

export function buildLabLimitOverridesFromDraft(
  rows: LabReferenceDisplayRow[],
  draft: Record<string, { min: string; max: string }>
): LabLimitOverrides {
  const out: LabLimitOverrides = {};

  const byKey = new Map<string, LabReferenceDisplayRow[]>();
  for (const r of rows) {
    const arr = byKey.get(r.examKey) ?? [];
    arr.push(r);
    byKey.set(r.examKey, arr);
  }

  for (const [examKey, list] of byKey.entries()) {
    const simpleRow = list.find((x) => x.sex === '—');
    if (simpleRow) {
      const id = labReferenceRowId(simpleRow);
      const c = draft[id];
      if (!c) continue;
      const parsed = parseCell(examKey, 'simples', c.min.trim(), c.max.trim());
      if (parsed.min === undefined && parsed.max === undefined) continue;
      out[examKey] = parsed;
      continue;
    }

    const entry: LabLimitOverrideEntry = {};

    for (const sex of ['M', 'F'] as const) {
      const sexRows = list.filter((x) => x.sex === sex);
      if (sexRows.length === 0) continue;

      const branch: LabLimitSexBranchOverride = {};
      const flatRow = sexRows.find((x) => x.ageBandKey === 'flat');
      if (flatRow) {
        const id = labReferenceRowId(flatRow);
        const c = draft[id];
        if (c) {
          const parsed = parseCell(examKey, sex + ' todas idades', c.min.trim(), c.max.trim());
          if (parsed.min !== undefined) branch.min = parsed.min;
          if (parsed.max !== undefined) branch.max = parsed.max;
        }
      }

      const ars: LabLimitAgeBandOverride[] = [];
      for (const r of sexRows) {
        if (r.ageBandKey === 'flat') continue;
        const parsedBand = parseAgeBandKey(r.ageBandKey);
        if (!parsedBand) continue;
        const id = labReferenceRowId(r);
        const c = draft[id];
        if (!c) continue;
        const parsed = parseCell(
          examKey,
          `${sex} ${r.ageBandLabel}`,
          c.min.trim(),
          c.max.trim()
        );
        if (parsed.min === undefined && parsed.max === undefined) continue;
        ars.push({
          min_age: parsedBand.min_age,
          max_age: parsedBand.max_age,
          ...parsed,
        });
      }
      if (ars.length) branch.age_ranges = ars;

      if (
        branch.min !== undefined ||
        branch.max !== undefined ||
        (branch.age_ranges && branch.age_ranges.length > 0)
      ) {
        if (sex === 'M') entry.M = branch;
        else entry.F = branch;
      }
    }

    if (entry.M || entry.F) out[examKey] = entry;
  }

  return out;
}
