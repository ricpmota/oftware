import type { Metadata } from 'next';
import { MatchDiscoverScreen } from '@/components/meta/match/discovery/MatchDiscoverScreen';

export const metadata: Metadata = {
  title: 'Descobrir conexões — Match Saudável',
  description: 'Encontre pessoas com coisas em comum.',
};

export default function MatchDiscoverPage() {
  return <MatchDiscoverScreen />;
}
