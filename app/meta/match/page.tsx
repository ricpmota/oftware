import type { Metadata } from 'next';
import { MatchLandingPage } from '@/components/meta/match/MatchLandingPage';

export const metadata: Metadata = {
  title: 'Match Saudável',
  description: 'Conexões para uma vida melhor.',
};

export default function MetaMatchPage() {
  return <MatchLandingPage />;
}
