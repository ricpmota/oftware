export type MentorSortable = {
  featured?: boolean | null;
  order?: number | null;
  createdAt?: Date | string | number | null;
};

function createdAtMs(value: MentorSortable['createdAt']): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 1. featured === true
 * 2. order crescente (ausente por último)
 * 3. createdAt decrescente
 */
export function compareMentorContents(a: MentorSortable, b: MentorSortable): number {
  const fa = a.featured === true ? 0 : 1;
  const fb = b.featured === true ? 0 : 1;
  if (fa !== fb) return fa - fb;

  const oa = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
  const ob = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
  if (oa !== ob) return oa - ob;

  return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
}

const NEW_CONTENT_DAYS = 15;

export function isMentorContentNew(createdAt?: Date | string | number | null, now = Date.now()): boolean {
  const ms = createdAtMs(createdAt);
  if (!ms) return false;
  return now - ms <= NEW_CONTENT_DAYS * 24 * 60 * 60 * 1000;
}

export function isMentorContentUpdated(
  createdAt?: Date | string | number | null,
  updatedAt?: Date | string | number | null,
  now = Date.now()
): boolean {
  const created = createdAtMs(createdAt);
  const updated = createdAtMs(updatedAt);
  if (!created || !updated) return false;
  if (updated - created < 24 * 60 * 60 * 1000) return false;
  return now - updated <= NEW_CONTENT_DAYS * 24 * 60 * 60 * 1000;
}
