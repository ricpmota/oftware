import type { Metadata } from 'next';
import { MatchRequestsScreen } from '@/components/meta/match/discovery/MatchRequestsScreen';

export const metadata: Metadata = {
  title: 'Querem se conectar — Match Saudável',
};

export default function MatchRequestsPage() {
  return <MatchRequestsScreen />;
}
