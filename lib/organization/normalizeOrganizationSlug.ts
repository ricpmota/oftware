/** Slug imutável de organizationId: minúsculas, hífens, sem acentos. */
export function normalizeOrganizationSlug(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64);
}

export function suggestOrganizationSlugFromName(name: string): string {
  return normalizeOrganizationSlug(name);
}

export function isValidOrganizationSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug) && !slug.includes('--');
}
