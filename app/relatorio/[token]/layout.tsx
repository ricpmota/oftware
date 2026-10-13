import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildRelatorioShareCopy } from '@/lib/relatorio/relatorioShareCopy';
import { getRelatorioShareContext } from '@/lib/relatorio/relatorioShareContext.server';
import { buildWhiteLabelMetadata } from '@/lib/whiteLabel/buildWhiteLabelMetadata';
import { normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ token: string }>;
};

const PAGE_ROBOTS = { index: false, follow: false } as const;

function relatorioPageMetadata(
  copy: { title: string; description: string },
  base?: Metadata,
  canonicalPath?: string
): Metadata {
  const images = base?.openGraph && 'images' in base.openGraph ? base.openGraph.images : undefined;
  return {
    ...base,
    title: { absolute: copy.title },
    description: copy.description,
    applicationName: 'Relatório do paciente',
    robots: PAGE_ROBOTS,
    openGraph: {
      ...base?.openGraph,
      title: copy.title,
      description: copy.description,
      siteName: 'Relatório do paciente',
      locale: 'pt_BR',
      type: 'website',
      ...(canonicalPath ? { url: canonicalPath } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      ...base?.twitter,
      card: images ? 'summary_large_image' : 'summary',
      title: copy.title,
      description: copy.description,
    },
  };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const token = normalizePublicLinkToken((await params).token);
  const fallback = relatorioPageMetadata(buildRelatorioShareCopy({}));
  try {
    const ctx = await getRelatorioShareContext(token);
    const copy = buildRelatorioShareCopy({
      pacienteNome: ctx?.pacienteNome,
      medicoNome: ctx?.medicoNome,
      medicoGenero: ctx?.medicoGenero,
    });
    const base = ctx?.whiteLabel
      ? buildWhiteLabelMetadata(ctx.whiteLabel, { canonicalPath: `/relatorio/${token}` })
      : undefined;
    return relatorioPageMetadata(copy, base, `/relatorio/${token}`);
  } catch {
    return fallback;
  }
}

export default function RelatorioPublicLayout({ children }: { children: ReactNode }) {
  return children;
}
