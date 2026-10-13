import type { Metadata } from 'next';
import { MatchOwnProfile } from '@/components/meta/match/profile/MatchOwnProfile';

export const metadata: Metadata = {
  title: 'Meu perfil — Match Saudável',
};

export default function MatchProfilePage() {
  return <MatchOwnProfile />;
}
