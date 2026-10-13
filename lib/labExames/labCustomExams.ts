import { getExpectedLabExamKeys } from '@/lib/labExames/validateLabOrderBySection';
import { LAB_SECTION_LABELS_PT } from '@/lib/labExames/labSectionLabels';
import type { LabLimitOverrides } from '@/utils/labRangesFromJson';

export const LAB_CUSTOM_EXAM_KEY_PREFIX = 'cx_';
export const LAB_CUSTOM_SECTION_PREFIX = 'sec_';
export const LAB_NEW_SECTION_SENTINEL = '__new__';

/** Exame criado por médico no patrimônio global (platformSettings/labExames.labCustomExams). */
export type LabCustomExam = {
  id: string;
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  sectionId: string;
  sectionLabel: string;
  /** Padrão true: aparece para todos. Admin Geral pode desligar. */
  enabled: boolean;
  createdByMedicoId: string;
  createdByMedicoNome?: string;
  createdAt: string;
};

function slugifyFragment(raw: string, maxLen: number): string {
  const s = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen);
  return s;
}

export function slugifyCustomExamKey(label: string): string {
  const s = slugifyFragment(label, 40);
  return s ? `${LAB_CUSTOM_EXAM_KEY_PREFIX}${s}` : `${LAB_CUSTOM_EXAM_KEY_PREFIX}${Date.now().toString(36)}`;
}

export function slugifyCustomSectionId(label: string): string {
  const s = slugifyFragment(label, 40);
  return s ? `${LAB_CUSTOM_SECTION_PREFIX}${s}` : `${LAB_CUSTOM_SECTION_PREFIX}${Date.now().toString(36)}`;
}

export function isCustomExamKey(key: string): boolean {
  return key.startsWith(LAB_CUSTOM_EXAM_KEY_PREFIX);
}

export function normalizeLabCustomExams(raw: unknown): LabCustomExam[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const label = String(o.label ?? '').trim();
      const unit = String(o.unit ?? '').trim();
      const sectionId = String(o.sectionId ?? '').trim();
      const min = Number(o.min);
      const max = Number(o.max);
      if (!label || !unit || !sectionId || !Number.isFinite(min) || !Number.isFinite(max) || min > max) {
        return null;
      }
      const keyRaw = String(o.key ?? '').trim();
      const key = keyRaw || slugifyCustomExamKey(label);
      const sectionLabel =
        String(o.sectionLabel ?? '').trim() || LAB_SECTION_LABELS_PT[sectionId] || sectionId;
      const id = String(o.id ?? '').trim() || `custom-${i + 1}`;
      return {
        id,
        key,
        label: label.slice(0, 80),
        unit: unit.slice(0, 24),
        min,
        max,
        sectionId,
        sectionLabel: sectionLabel.slice(0, 80),
        enabled: o.enabled !== false,
        createdByMedicoId: String(o.createdByMedicoId ?? '').trim(),
        createdByMedicoNome: String(o.createdByMedicoNome ?? '').trim() || undefined,
        createdAt: String(o.createdAt ?? '').trim() || new Date().toISOString(),
      } satisfies LabCustomExam;
    })
    .filter((item): item is LabCustomExam => item !== null);
}

export function cloneLabOrder(order: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(order)) {
    out[k] = Array.isArray(v) ? [...v] : [];
  }
  return out;
}

export function mergeEnabledCustomExamsIntoOrder(
  order: Record<string, string[]>,
  customs: LabCustomExam[]
): Record<string, string[]> {
  const out = cloneLabOrder(order);
  for (const ex of customs) {
    if (!ex.enabled) continue;
    if (!out[ex.sectionId]) out[ex.sectionId] = [];
    if (!out[ex.sectionId].includes(ex.key)) out[ex.sectionId].push(ex.key);
  }
  return out;
}

export function customExamsToLimitOverrides(customs: LabCustomExam[]): LabLimitOverrides {
  const o: LabLimitOverrides = {};
  for (const ex of customs) {
    if (!ex.enabled) continue;
    o[ex.key] = { label: ex.label, unit: ex.unit, min: ex.min, max: ex.max };
  }
  return o;
}

export function extraSectionLabelsFromCustomExams(customs: LabCustomExam[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const ex of customs) {
    if (!ex.enabled) continue;
    if (LAB_SECTION_LABELS_PT[ex.sectionId]) continue;
    if (ex.sectionLabel) o[ex.sectionId] = ex.sectionLabel;
  }
  return o;
}

export function extraSectionLabelsFromAllCustomExams(customs: LabCustomExam[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const ex of customs) {
    if (LAB_SECTION_LABELS_PT[ex.sectionId]) continue;
    if (ex.sectionLabel) o[ex.sectionId] = ex.sectionLabel;
  }
  return o;
}

export function catalogLimitOverridesFromDoc(rawOv: unknown): LabLimitOverrides {
  if (rawOv && typeof rawOv === 'object' && !Array.isArray(rawOv)) {
    return rawOv as LabLimitOverrides;
  }
  return {};
}

export function uniqueCustomExamKey(label: string, existingKeys: Set<string>): string {
  const base = slugifyCustomExamKey(label);
  if (!existingKeys.has(base)) return base;
  let i = 2;
  while (existingKeys.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

export function findSectionIdByLabel(
  label: string,
  extraLabels?: Record<string, string> | null
): string | null {
  const target = label.trim().toLowerCase();
  if (!target) return null;
  for (const [id, nome] of Object.entries(LAB_SECTION_LABELS_PT)) {
    if (nome.trim().toLowerCase() === target) return id;
  }
  if (extraLabels) {
    for (const [id, nome] of Object.entries(extraLabels)) {
      if (nome.trim().toLowerCase() === target) return id;
    }
  }
  return null;
}

export function reservedExamKeys(): Set<string> {
  return new Set(getExpectedLabExamKeys());
}

export function allLabSectionOptions(
  extraLabels?: Record<string, string> | null
): { id: string; label: string }[] {
  const seen = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const [id, label] of Object.entries(LAB_SECTION_LABELS_PT)) {
    seen.add(id);
    out.push({ id, label });
  }
  if (extraLabels) {
    for (const [id, label] of Object.entries(extraLabels)) {
      if (seen.has(id) || !label.trim()) continue;
      seen.add(id);
      out.push({ id, label });
    }
  }
  return out;
}
