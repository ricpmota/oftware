import type { OrganizationDefinition } from './organizationTypes';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';
import { writeOrganizationBrandingUpdate } from './organizationBrandingFirestore.server';

/** Nome de exibição de médico (Dr./Dra.) — não deve ser publicName da Organização. */
export function isDoctorStylePublicName(value: string | null | undefined): boolean {
  const trimmed = (value || '').trim();
  if (!trimmed) return false;
  return /^dra?\.?\s/i.test(trimmed);
}

/**
 * Corrige publicName contaminado pelo brandName do médico fonte (ricpmota) na consolidação 11.1.
 * Idempotente — só reescreve quando parece nome de médico.
 */
export async function repairOrganizationPublicNameIfNeeded(
  organizationId: string,
  organization: OrganizationDefinition,
  existing: OrganizationBrandingStored | null | undefined,
): Promise<boolean> {
  if (!existing?.publicName?.trim()) return false;
  if (!isDoctorStylePublicName(existing.publicName)) return false;
  if (existing.publicName.trim() === organization.name.trim()) return false;

  await writeOrganizationBrandingUpdate(organizationId, organization, {
    ...existing,
    publicName: organization.name,
    updatedAt: new Date().toISOString(),
  });
  return true;
}
