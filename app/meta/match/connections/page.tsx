import type { Metadata } from 'next';
import { MatchConnectionsScreen } from '@/components/meta/match/discovery/MatchConnectionsScreen';

export const metadata: Metadata = {
  title: 'Minhas conexões — Match Saudável',
};

export default function MatchConnectionsPage() {
  return <MatchConnectionsScreen />;
}
