import { hasFirestoreOrganizationBranding } from './organizationBrandingDefaults';
import { readOrganizationBrandingFromFirestore } from './organizationBrandingFirestore.server';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';

let cached: { value: OrganizationBrandingStored | null; expiresAt: number } | undefined;
const CACHE_MS = 60_000;

/**
 * Lê apenas `organizations/metodo.branding` (sem mesclar fallbacks legados).
 * Usado pelo dual read — camadas inferiores continuam no resolver white label.
 */
export async function getMetodoOrganizationBrandingForDualRead(): Promise<OrganizationBrandingStored | null> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const raw = await readOrganizationBrandingFromFirestore(METODO_ORGANIZATION_ID);
    const value = hasFirestoreOrganizationBranding(raw) ? raw : null;
    cached = { value, expiresAt: now + CACHE_MS };
    return value;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[dual-read] Falha ao ler organizations/metodo.branding — fallback legado', error);
    }
    return null;
  }
}
