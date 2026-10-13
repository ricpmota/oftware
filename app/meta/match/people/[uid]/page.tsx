import type { Metadata } from 'next';
import { MatchPersonScreen } from '@/components/meta/match/discovery/MatchPersonScreen';

export const metadata: Metadata = {
  title: 'Perfil — Match Saudável',
};

export default async function MatchPersonPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return <MatchPersonScreen uid={uid} />;
}
