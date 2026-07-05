import type { LeadCrmTagSnapshot } from '@/types/crmTag';
import { CRM_TAG_PRESET_COLORS } from '@/lib/crm/crmTagPresets';

const LEGACY_GRAY = CRM_TAG_PRESET_COLORS.find((c) => c.id === 'gray')!;

export function normalizeLeadCrmTags(raw: unknown): LeadCrmTagSnapshot[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  if (typeof raw[0] === 'string') {
    return (raw as string[])
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label, index) => ({
        tagId: `legacy-${index}-${label.toLowerCase().replace(/\s+/g, '-')}`,
        label,
        color: LEGACY_GRAY.color,
        backgroundColor: LEGACY_GRAY.backgroundColor,
      }));
  }

  return (raw as LeadCrmTagSnapshot[])
    .filter((t) => t && typeof t.label === 'string' && t.label.trim())
    .map((t) => ({
      tagId: String(t.tagId || t.label),
      label: t.label.trim(),
      color: t.color || LEGACY_GRAY.color,
      backgroundColor: t.backgroundColor || LEGACY_GRAY.backgroundColor,
    }));
}

export function dedupeLeadCrmTags(tags: LeadCrmTagSnapshot[]): LeadCrmTagSnapshot[] {
  const seen = new Set<string>();
  const result: LeadCrmTagSnapshot[] = [];
  for (const tag of tags) {
    const key = tag.tagId || tag.label;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result.slice(0, 20);
}

export function leadCrmTagStyle(tag: LeadCrmTagSnapshot): Record<string, string> {
  return {
    color: tag.color,
    backgroundColor: tag.backgroundColor || `${tag.color}18`,
    borderColor: `${tag.color}33`,
  };
}
