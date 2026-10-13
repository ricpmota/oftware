import type { Metadata } from 'next';
import { MatchOnboarding } from '@/components/meta/match/onboarding/MatchOnboarding';

export const metadata: Metadata = {
  title: 'Criar perfil — Match Saudável',
};

export default function MatchOnboardingPage() {
  return <MatchOnboarding />;
}
