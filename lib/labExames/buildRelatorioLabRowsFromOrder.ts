import type { Sex } from '@/types/labRanges';
import { LAB_SECTION_LABELS_PT } from '@/lib/labExames/labSectionLabels';
import { getLabRange, type LabLimitOverrides } from '@/utils/labRangesFromJson';

export type RelatorioLabRow = {
  labKey: string;
  /** Campo no documento `examesLaboratoriais` (ex.: glicemiaJejum, hemoglobina). */
  field: string;
  /** Rótulo de agrupamento (sistema) — igual ao Admin Geral / paciente. */
  group: string;
};

/**
 * Linhas de exame para PDF e relatório público, na mesma ordem de `labOrderBySection`
 * (MetaAdmin Geral). Só inclui chaves com mapeamento `labKey → field`.
 */
export function buildRelatorioLabRowsFromOrder(
  labOrderBySection: Record<string, string[]>,
  keyToField: Record<string, string>
): RelatorioLabRow[] {
  const out: RelatorioLabRow[] = [];
  for (const [sectionId, keys] of Object.entries(labOrderBySection)) {
    if (!Array.isArray(keys)) continue;
    const group = LAB_SECTION_LABELS_PT[sectionId] || sectionId;
    for (const labKey of keys) {
      const field = keyToField[labKey];
      if (!field) continue;
      out.push({ labKey, field, group });
    }
  }
  return out;
}

/** Ordem única de grupos conforme a primeira aparição em `rows`. */
export function groupOrderFromRelatorioRows(rows: RelatorioLabRow[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of rows) {
    if (!seen.has(r.group)) {
      seen.add(r.group);
      order.push(r.group);
    }
  }
  return order;
}

/** Label de exibição (referência laboratorial). */
export function relatorioLabRowLabel(
  row: RelatorioLabRow,
  sex: Sex | null | undefined,
  dataNascimento: Date | string | { toDate?: () => Date } | null | undefined,
  limitOverrides?: LabLimitOverrides | null
): string {
  const range = getLabRange(row.labKey, sex ?? null, dataNascimento, limitOverrides ?? null);
  return range?.label ?? row.labKey;
}
