import type { Metadata } from 'next';
import { buildCinquentaKgDepoisMetadata } from '@/lib/50kgdepois/siteMetadata';

export const metadata: Metadata = {
  ...buildCinquentaKgDepoisMetadata('/50kgdepois'),
  robots: {
    index: false,
    follow: false,
  },
};

export default function CinquentaKgDepoisLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
