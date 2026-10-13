import type { Metadata } from 'next';
import CinquentaKgDepoisResponsesPageClient from '@/components/50kgdepois/CinquentaKgDepoisResponsesPageClient';
import { buildCinquentaKgDepoisMetadata } from '@/lib/50kgdepois/siteMetadata';

export const metadata: Metadata = {
  ...buildCinquentaKgDepoisMetadata('/50kgdepois/respostas'),
  title: 'Respostas da entrevista',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CinquentaKgDepoisResponsesPage() {
  return <CinquentaKgDepoisResponsesPageClient />;
}
