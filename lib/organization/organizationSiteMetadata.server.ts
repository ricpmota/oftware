import type { Metadata } from 'next';
import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import {
  ORGANIZATION_METODO_FAVICON_SRC,
  ORGANIZATION_METODO_OG_FALLBACK_SRC,
} from '@/lib/organization/organizationBrandingDefaults';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';

export type MetodoOperationalRouteId = 'meta' | 'metaadmin' | 'metanutri' | 'metapersonal' | 'metapsi';

const METODO_OPERATIONAL_ROUTE_COPY: Record<
  MetodoOperationalRouteId,
  { titlePrefix: string; description: string }
> = {
  meta: {
    titlePrefix: 'Meta | Área do paciente',
    description:
      'Acompanhe seu tratamento, evolução, aplicações e comunicação com sua equipe multidisciplinar.',
  },
  metaadmin: {
    titlePrefix: 'MetaAdmin | Área do médico',
    description:
      'Gestão de pacientes, prontuário, prescrições, aplicações e acompanhamento clínico.',
  },
  metanutri: {
    titlePrefix: 'MetaNutri | Área do nutricionista',
    description:
      'Planos alimentares, prontuário nutricional e vínculo com médicos e pacientes.',
  },
  metapersonal: {
    titlePrefix: 'MetaPersonal | Área do personal trainer',
    description: 'Treinos, agenda, evolução e acompanhamento dos alunos.',
  },
  metapsi: {
    titlePrefix: 'MetaPsi | Área do psiquiatra',
    description: 'Acompanhamento psiquiátrico, prontuário e vínculo com médicos e pacientes.',
  },
};

/** Imagem OG: Logo principal da Marca, depois imagem de compartilhamento, depois fallback. */
export function resolveOrganizationShareImageUrl(
  branding: Pick<OrganizationBrandingStored, 'logoMainUrl' | 'ogImageUrl'>,
): string {
  return (
    branding.logoMainUrl?.trim() ||
    branding.ogImageUrl?.trim() ||
    ORGANIZATION_METODO_OG_FALLBACK_SRC
  );
}

/** Query `v=` para forçar recache de crawlers (WhatsApp/Facebook) quando a Marca muda. */
export function withShareImageCacheBust(
  imageUrl: string,
  updatedAt?: string | null,
  routeId?: string | null,
): string {
  const version = updatedAt?.trim();
  if (!version || !imageUrl.trim()) return imageUrl;
  const parts = [version];
  const route = routeId?.trim();
  if (route) parts.push(route);
  const token = encodeURIComponent(parts.join(':'));
  return imageUrl.includes('?') ? `${imageUrl}&v=${token}` : `${imageUrl}?v=${token}`;
}

type MetodoSiteMetadataOverrides = Partial<Pick<Metadata, 'title' | 'description'>> & {
  /** Monta `{prefix} | {publicName da organização}`. Tem prioridade sobre `title`. */
  titlePrefix?: string;
};

/** Metadados Open Graph / Twitter para www.ometodoemagrecer.com.br (dual read org branding). */
export async function buildMetodoEmagrecerSiteMetadata(
  overrides?: MetodoSiteMetadataOverrides,
): Promise<Metadata> {
  const branding = await getOrganizationBranding(METODO_ORGANIZATION_ID);
  const ogImage = withShareImageCacheBust(
    resolveOrganizationShareImageUrl(branding),
    branding.updatedAt,
  );
  const siteUrl = branding.siteUrl?.trim() || 'https://www.ometodoemagrecer.com.br';
  const titlePrefix = overrides?.titlePrefix?.trim();
  const title =
    (titlePrefix ? `${titlePrefix} | ${branding.publicName}` : null) ||
    (typeof overrides?.title === 'string' ? overrides.title : null) ||
    `${branding.publicName} | Acompanhamento estruturado com continuidade`;
  const description =
    (typeof overrides?.description === 'string' ? overrides.description : null) ||
    branding.defaultDescription;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    applicationName: branding.publicName,
    icons: {
      icon: [{ url: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC, type: 'image/png' }],
      shortcut: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC,
      apple: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC,
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: branding.publicName,
      locale: 'pt_BR',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: branding.publicName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

/** Metadados OG para rotas operacionais (/meta, /metaadmin, …) no domínio da organização Método. */
export async function buildMetodoEmagrecerOperationalRouteMetadata(
  routeId: MetodoOperationalRouteId,
): Promise<Metadata> {
  const branding = await getOrganizationBranding(METODO_ORGANIZATION_ID);
  const siteUrl = branding.siteUrl?.trim() || 'https://www.ometodoemagrecer.com.br';
  const routePath = `/${routeId}`;
  const routeCopy = METODO_OPERATIONAL_ROUTE_COPY[routeId];
  const title = `${routeCopy.titlePrefix} — ${branding.publicName}`;
  const description = routeCopy.description;
  const ogImage = withShareImageCacheBust(
    resolveOrganizationShareImageUrl(branding),
    branding.updatedAt,
    routeId,
  );

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    applicationName: branding.publicName,
    icons: {
      icon: [{ url: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC, type: 'image/png' }],
      shortcut: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC,
      apple: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${routePath}`,
      siteName: branding.publicName,
      locale: 'pt_BR',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: branding.publicName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
