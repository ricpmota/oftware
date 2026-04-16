import type { LabReferenceDisplayRow } from '@/lib/labExames/buildLabReferenceRows';

/** Uma linha de UI: mesma faixa etária com M e F (quando existirem no JSON). */
export type MergedLabAdminRow = {
  examKey: string;
  ageBandKey: string;
  ageBandLabel: string;
  /** Exame sem sexo no JSON (uma linha só). */
  simple: LabReferenceDisplayRow | null;
  m: LabReferenceDisplayRow | null;
  f: LabReferenceDisplayRow | null;
};

/**
 * Agrupa linhas de `buildLabReferenceRows(examKey)` por `ageBandKey`, juntando M e F na mesma linha.
 */
export function mergeLabReferenceRowsByAgeBand(rows: LabReferenceDisplayRow[]): MergedLabAdminRow[] {
  if (rows.length === 0) return [];
  const first = rows[0];
  if (rows.length === 1 && first.sex === '—') {
    return [
      {
        examKey: first.examKey,
        ageBandKey: first.ageBandKey,
        ageBandLabel: first.ageBandLabel,
        simple: first,
        m: null,
        f: null,
      },
    ];
  }

  const order: string[] = [];
  const map = new Map<string, { M?: LabReferenceDisplayRow; F?: LabReferenceDisplayRow }>();

  for (const r of rows) {
    const k = r.ageBandKey;
    if (!map.has(k)) {
      map.set(k, {});
      order.push(k);
    }
    const g = map.get(k)!;
    if (r.sex === 'M') g.M = r;
    if (r.sex === 'F') g.F = r;
  }

  return order.map((ageBandKey) => {
    const g = map.get(ageBandKey)!;
    return {
      examKey: first.examKey,
      ageBandKey,
      ageBandLabel: g.M?.ageBandLabel ?? g.F?.ageBandLabel ?? ageBandKey,
      simple: null,
      m: g.M ?? null,
      f: g.F ?? null,
    };
  });
}
