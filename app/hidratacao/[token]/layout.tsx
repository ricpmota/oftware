import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import {
  buildWhiteLabelMetadata,
  buildWhiteLabelViewport,
} from '@/lib/whiteLabel/buildWhiteLabelMetadata';
import { getMedicoWhiteLabelByHidratacaoToken } from '@/lib/server/medicoWhiteLabelLookup.server';
import { normalizeHydrationCheckInToken } from '@/lib/nutri/hidratacao/hydrationCheckInLink';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ token: string }>;
};

const PAGE_TITLE = 'Registro de água';
const PAGE_DESCRIPTION = 'Registre quanto você bebeu de água nos últimos dias.';

const PAGE_ROBOTS = { index: false, follow: false } as const;

function hydrationPageMetadata(base?: Metadata): Metadata {
  return {
    ...base,
    title: { absolute: PAGE_TITLE },
    description: PAGE_DESCRIPTION,
    applicationName: PAGE_TITLE,
    robots: PAGE_ROBOTS,
    referrer: 'no-referrer',
    openGraph: {
      ...base?.openGraph,
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
    },
    twitter: {
      ...base?.twitter,
      card: 'summary',
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
    },
  };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const token = normalizeHydrationCheckInToken((await params).token);
  try {
    const resolved = await getMedicoWhiteLabelByHidratacaoToken(token);
    if (!resolved) return hydrationPageMetadata();

    return hydrationPageMetadata(
      buildWhiteLabelMetadata(resolved, { canonicalPath: `/hidratacao/${token}` })
    );
  } catch {
    return hydrationPageMetadata();
  }
}

export async function generateViewport({ params }: LayoutProps): Promise<Viewport> {
  try {
    const token = normalizeHydrationCheckInToken((await params).token);
    const resolved = await getMedicoWhiteLabelByHidratacaoToken(token);
    if (!resolved) {
      return {
        width: 'device-width',
        initialScale: 1,
        viewportFit: 'cover',
      };
    }
    return buildWhiteLabelViewport(resolved);
  } catch {
    return {
      width: 'device-width',
      initialScale: 1,
      viewportFit: 'cover',
    };
  }
}

export default function HydrationCheckInLayout({ children }: { children: ReactNode }) {
  return children;
}
