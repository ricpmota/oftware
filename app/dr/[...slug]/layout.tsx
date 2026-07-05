import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import {
  buildWhiteLabelMetadata,
  buildWhiteLabelViewport,
} from '@/lib/whiteLabel/buildWhiteLabelMetadata';
import { getMedicoWhiteLabelByDrSlug } from '@/lib/server/medicoWhiteLabelLookup.server';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const medicoSlug = slug?.[0];
  if (!medicoSlug) {
    return { title: 'Médico' };
  }

  const resolved = await getMedicoWhiteLabelByDrSlug(medicoSlug);
  if (!resolved) {
    return { title: 'Médico' };
  }

  return buildWhiteLabelMetadata(resolved, { canonicalPath: `/dr/${medicoSlug}` });
}

export async function generateViewport({ params }: LayoutProps): Promise<Viewport> {
  const { slug } = await params;
  const medicoSlug = slug?.[0];
  if (!medicoSlug) {
    return {};
  }

  const resolved = await getMedicoWhiteLabelByDrSlug(medicoSlug);
  if (!resolved) {
    return {};
  }

  return buildWhiteLabelViewport(resolved);
}

export default function DrPublicLayout({ children }: { children: ReactNode }) {
  return children;
}
