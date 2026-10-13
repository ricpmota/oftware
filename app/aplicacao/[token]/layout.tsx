import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import {
  buildWhiteLabelMetadata,
  buildWhiteLabelViewport,
} from '@/lib/whiteLabel/buildWhiteLabelMetadata';
import { getMedicoWhiteLabelByAplicacaoToken } from '@/lib/server/medicoWhiteLabelLookup.server';
import { normalizeAplicacaoPublicToken } from '@/lib/aplicacao/aplicacaoPublicToken';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const token = normalizeAplicacaoPublicToken((await params).token);
  const resolved = await getMedicoWhiteLabelByAplicacaoToken(token);
  if (!resolved) {
    return { title: 'Registro de aplicação' };
  }

  return buildWhiteLabelMetadata(resolved, { canonicalPath: `/aplicacao/${token}` });
}

export async function generateViewport({ params }: LayoutProps): Promise<Viewport> {
  const token = normalizeAplicacaoPublicToken((await params).token);
  const resolved = await getMedicoWhiteLabelByAplicacaoToken(token);
  if (!resolved) {
    return {};
  }

  return buildWhiteLabelViewport(resolved);
}

export default function AplicacaoPublicLayout({ children }: { children: ReactNode }) {
  return children;
}
