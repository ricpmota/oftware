import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import {
  buildWhiteLabelMetadata,
  buildWhiteLabelViewport,
} from '@/lib/whiteLabel/buildWhiteLabelMetadata';
import { getMedicoWhiteLabelByConclusaoToken } from '@/lib/server/medicoWhiteLabelLookup.server';
import { normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const token = normalizePublicLinkToken((await params).token);
  const resolved = await getMedicoWhiteLabelByConclusaoToken(token);
  if (!resolved) {
    return { title: 'Conclusão do tratamento' };
  }

  return buildWhiteLabelMetadata(resolved, { canonicalPath: `/conclusao/${token}` });
}

export async function generateViewport({ params }: LayoutProps): Promise<Viewport> {
  const token = normalizePublicLinkToken((await params).token);
  const resolved = await getMedicoWhiteLabelByConclusaoToken(token);
  if (!resolved) {
    return {};
  }

  return buildWhiteLabelViewport(resolved);
}

export default function ConclusaoPublicLayout({ children }: { children: ReactNode }) {
  return children;
}
