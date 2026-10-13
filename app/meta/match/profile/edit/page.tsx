import type { Metadata } from 'next';
import { MatchProfileEditor } from '@/components/meta/match/profile/MatchProfileEditor';

export const metadata: Metadata = {
  title: 'Editar perfil — Match Saudável',
};

export default function MatchProfileEditPage() {
  return <MatchProfileEditor />;
}
