'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatchProfileStage } from '@/components/meta/match/profile/MatchProfileStage';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import { applyKnownIdentity, loadKnownMatchIdentity } from '@/lib/match/matchKnownIdentity';
import { buildMatchViewerCard, type MatchProfileDraft } from '@/lib/match/matchProfile';
import type { MatchGrammaticalGender } from '@/lib/match/matchTaxonomy';
import { getMyMatchProfile, saveMyMatchProfile } from '@/services/matchProfileService';

export function MatchOwnProfile() {
  const router = useRouter();
  const user = useMatchAuth();
  const [draft, setDraft] = useState<MatchProfileDraft | null>(null);
  const [gender, setGender] = useState<MatchGrammaticalGender>('u');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    Promise.all([
      getMyMatchProfile(),
      loadKnownMatchIdentity(user.uid, user.email).catch(() => null),
    ])
      .then(async ([profile, known]) => {
        if (cancelled) return;
        if (!profile || !profile.onboardingCompleted) {
          router.replace('/meta/match/onboarding');
          return;
        }
        const withKnown = applyKnownIdentity(profile, known);
        setDraft(withKnown);
        setGender(known?.grammaticalGender || 'u');
        if (known?.birthDate && profile.identity.birthDate !== known.birthDate) {
          await saveMyMatchProfile(withKnown).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível abrir seu perfil.');
      });
    return () => {
      cancelled = true;
    };
  }, [router, user]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0A1F44] px-6 text-center text-sm text-white">
        {error}
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0A1F44] text-sm text-white/70">
        Carregando seu perfil…
      </div>
    );
  }

  return (
    <MatchProfileStage
      card={buildMatchViewerCard(draft, new Date(), 'owner')}
      isOwner
      grammaticalGender={gender}
      onBack={() => router.push('/meta/match')}
    />
  );
}
