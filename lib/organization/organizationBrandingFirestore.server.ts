import type { MedicoWhiteLabelStored } from '@/types/medico';
import { METODO_IMAGENS_SOURCE_EMAIL } from '@/lib/metodo/metodoImagens';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { ORGANIZATION_BRANDING_SEED_VERSION } from './organizationBrandingDefaults';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';
const ORGANIZATIONS_COLLECTION = 'organizations';

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

function parsePublicPages(raw: unknown): OrganizationBrandingStored['publicPages'] | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const parsePage = (key: 'dr' | 'aplicacao' | 'conclusao') => {
    const page = o[key];
    if (!page || typeof page !== 'object') return null;
    const p = page as Record<string, unknown>;
    return {
      backgroundColor: typeof p.backgroundColor === 'string' ? p.backgroundColor : '',
      textColor: typeof p.textColor === 'string' ? p.textColor : '',
      logoUrl:
        typeof p.logoUrl === 'string' ? p.logoUrl.trim() || null : p.logoUrl === null ? null : null,
    };
  };
  const dr = parsePage('dr');
  const aplicacao = parsePage('aplicacao');
  const conclusao = parsePage('conclusao');
  if (!dr || !aplicacao || !conclusao) return null;
  return { dr, aplicacao, conclusao };
}

function parseInstagramBioDefaults(
  raw: unknown,
): OrganizationBrandingStored['instagramBioDefaults'] | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const str = (key: string) => (typeof o[key] === 'string' ? (o[key] as string) : '');
  return {
    headline: str('headline'),
    subtitle: str('subtitle'),
    contactButtonLabel: str('contactButtonLabel'),
    contactModalText: str('contactModalText'),
    profilePrompt: str('profilePrompt'),
    emagrecerCtaLabel: str('emagrecerCtaLabel'),
    emagrecimentoUrl: str('emagrecimentoUrl'),
  };
}

export function parseOrganizationBrandingStored(raw: unknown): OrganizationBrandingStored | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const publicName = typeof o.publicName === 'string' ? o.publicName.trim() : '';
  const siteUrl = typeof o.siteUrl === 'string' ? o.siteUrl.trim() : '';
  const publicPages = parsePublicPages(o.publicPages);
  const instagramBioDefaults = parseInstagramBioDefaults(o.instagramBioDefaults);
  if (!publicName || !siteUrl || !publicPages || !instagramBioDefaults) return null;

  const optionalUrl = (key: string): string | null | undefined => {
    if (typeof o[key] === 'string') return (o[key] as string).trim() || null;
    if (o[key] === null) return null;
    return undefined;
  };

  return {
    publicName,
    legalName: optionalUrl('legalName') ?? null,
    slogan: typeof o.slogan === 'string' ? o.slogan : null,
    defaultDescription:
      typeof o.defaultDescription === 'string'
        ? o.defaultDescription
        : 'Acompanhamento médico personalizado com equipe multidisciplinar integrada.',
    logoMainUrl: optionalUrl('logoMainUrl') ?? null,
    logoDarkUrl: optionalUrl('logoDarkUrl') ?? null,
    logoLightUrl: optionalUrl('logoLightUrl') ?? null,
    iconUrl: optionalUrl('iconUrl') ?? null,
    faviconUrl: optionalUrl('faviconUrl') ?? null,
    ogImageUrl: optionalUrl('ogImageUrl') ?? null,
    pdfLogoUrl: optionalUrl('pdfLogoUrl') ?? null,
    watermarkUrl: optionalUrl('watermarkUrl') ?? null,
    primaryColor: typeof o.primaryColor === 'string' ? o.primaryColor : '#4CCB7A',
    secondaryColor: typeof o.secondaryColor === 'string' ? o.secondaryColor : '#0A1F44',
    accentColor: optionalUrl('accentColor') ?? null,
    backgroundColor: optionalUrl('backgroundColor') ?? null,
    surfaceColor: optionalUrl('surfaceColor') ?? null,
    textColor: optionalUrl('textColor') ?? null,
    mutedTextColor: optionalUrl('mutedTextColor') ?? null,
    borderColor: optionalUrl('borderColor') ?? null,
    successColor: optionalUrl('successColor') ?? null,
    warningColor: optionalUrl('warningColor') ?? null,
    errorColor: optionalUrl('errorColor') ?? null,
    publicPages,
    instagramBioDefaults,
    instagramUrl: optionalUrl('instagramUrl') ?? null,
    siteUrl,
    showPoweredByOftware: o.showPoweredByOftware !== false,
    seedVersion: typeof o.seedVersion === 'string' ? o.seedVersion : undefined,
    seededAt:
      typeof o.seededAt === 'string'
        ? o.seededAt
        : o.seededAt && typeof o.seededAt === 'object' && 'toDate' in (o.seededAt as object)
          ? ((o.seededAt as { toDate: () => Date }).toDate().toISOString?.() ?? null)
          : null,
    updatedAt:
      typeof o.updatedAt === 'string'
        ? o.updatedAt
        : o.updatedAt && typeof o.updatedAt === 'object' && 'toDate' in (o.updatedAt as object)
          ? ((o.updatedAt as { toDate: () => Date }).toDate().toISOString?.() ?? null)
          : null,
  };
}

export async function readOrganizationBrandingFromFirestore(
  organizationId: string,
): Promise<OrganizationBrandingStored | null> {
  const db = getFirestoreAdmin();
  const snap = await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  return parseOrganizationBrandingStored(data?.branding);
}

export async function readOrganizationDocumentExists(organizationId: string): Promise<boolean> {
  const db = getFirestoreAdmin();
  const snap = await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).get();
  return snap.exists;
}

/** Atualiza apenas `branding` (edição MAG — Etapa 11.1). */
export async function writeOrganizationBrandingUpdate(
  organizationId: string,
  organizationMeta: {
    name: string;
    kind: string;
    primaryOrigin: string;
    hosts: readonly string[];
  },
  branding: OrganizationBrandingStored,
): Promise<void> {
  const db = getFirestoreAdmin();
  const now = new Date();
  await db
    .collection(ORGANIZATIONS_COLLECTION)
    .doc(organizationId)
    .set(
      {
        id: organizationId,
        name: organizationMeta.name,
        kind: organizationMeta.kind,
        primaryOrigin: organizationMeta.primaryOrigin,
        hosts: [...organizationMeta.hosts],
        branding: {
          ...branding,
          seedVersion: branding.seedVersion ?? ORGANIZATION_BRANDING_SEED_VERSION,
          updatedAt: now.toISOString(),
        },
        brandingSeedVersion: branding.seedVersion ?? ORGANIZATION_BRANDING_SEED_VERSION,
      },
      { merge: true },
    );
}

export async function writeOrganizationBrandingSeed(
  organizationId: string,
  organizationMeta: {
    name: string;
    kind: string;
    primaryOrigin: string;
    hosts: readonly string[];
  },
  branding: OrganizationBrandingStored,
): Promise<void> {
  const db = getFirestoreAdmin();
  const now = new Date();
  await db
    .collection(ORGANIZATIONS_COLLECTION)
    .doc(organizationId)
    .set(
      {
        id: organizationId,
        name: organizationMeta.name,
        kind: organizationMeta.kind,
        primaryOrigin: organizationMeta.primaryOrigin,
        hosts: [...organizationMeta.hosts],
        branding: {
          ...branding,
          seededAt: branding.seededAt ?? now.toISOString(),
          updatedAt: now.toISOString(),
        },
        brandingSeededAt: now,
        brandingSeedVersion: branding.seedVersion ?? null,
      },
      { merge: true },
    );
}

/** White label da conta fonte Método (ricpmota). */
export async function readSourceMedicoWhiteLabel(): Promise<MedicoWhiteLabelStored | null> {
  const db = getFirestoreAdmin();
  const normalized = normalizeEmail(METODO_IMAGENS_SOURCE_EMAIL);
  const exact = await db.collection('medicos').where('email', '==', normalized).limit(1).get();
  if (!exact.empty) {
    const data = exact.docs[0].data();
    return (data.whiteLabel as MedicoWhiteLabelStored | undefined) ?? null;
  }
  const all = await db.collection('medicos').get();
  const match = all.docs.find(
    (d) => normalizeEmail((d.data() as { email?: string }).email) === normalized,
  );
  if (!match) return null;
  return (match.data().whiteLabel as MedicoWhiteLabelStored | undefined) ?? null;
}

export { METODO_IMAGENS_SOURCE_EMAIL };
