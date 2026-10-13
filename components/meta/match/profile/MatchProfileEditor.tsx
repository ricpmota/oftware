'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatchPrimaryButton, MatchFlowShell } from '@/components/meta/match/flow/MatchFlowChrome';
import {
  MatchStepAchievements,
  MatchStepConnections,
  MatchStepGoals,
  MatchStepDiscovery,
  MatchStepIdentity,
  MatchStepInterests,
  MatchStepJourney,
  MatchStepLocation,
  MatchStepMarital,
  MatchStepPace,
  MatchStepPhotos,
  MatchStepPrivacy,
} from '@/components/meta/match/onboarding/MatchOnboardingSteps';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import { applyKnownIdentity, loadKnownMatchIdentity } from '@/lib/match/matchKnownIdentity';
import type { MatchProfileDraft } from '@/lib/match/matchProfile';
import type { MatchGrammaticalGender } from '@/lib/match/matchTaxonomy';
import { getMyMatchProfile, saveMyMatchProfile } from '@/services/matchProfileService';

export function MatchProfileEditor() {
  const router = useRouter();
  const user = useMatchAuth();
  const [draft, setDraft] = useState<MatchProfileDraft | null>(null);
  const [gender, setGender] = useState<MatchGrammaticalGender>('u');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [saving, setSaving] = useState(false);
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
      .then(([profile, known]) => {
        if (cancelled) return;
        if (!profile || !profile.onboardingCompleted) {
          router.replace('/meta/match/onboarding');
          return;
        }
        setGender(known?.grammaticalGender || 'u');
        setPhoneDigits(known?.phoneDigits || '');
        setDraft({
          ...applyKnownIdentity(profile, known),
          contact: {
            ...profile.contact,
            ...(profile.sharing.showPhone && !profile.contact.phone && known?.phoneDigits
              ? { phone: known.phoneDigits }
              : {}),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível abrir seu perfil.');
      });
    return () => {
      cancelled = true;
    };
  }, [router, user]);

  async function save() {
    if (!draft || saving) return;
    if (draft.identity.displayName.trim().length < 2) {
      setError('Escolha um nome público com pelo menos 2 letras.');
      return;
    }
    if (!draft.identity.maritalStatus) {
      setError('Escolha o estado civil para continuar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveMyMatchProfile({
        ...draft,
        status: 'active',
        onboardingCompleted: true,
      });
      router.push('/meta/match/profile');
    } catch {
      setError('Não foi possível salvar agora. Tente de novo.');
      setSaving(false);
    }
  }

  return (
    <MatchFlowShell
      title="Editar perfil"
      step={1}
      total={1}
      showProgress={false}
      onBack={() => router.push('/meta/match/profile')}
      footer={
        <div>
          {error ? <p className="mb-2 text-sm text-[#9A3B3B]">{error}</p> : null}
          <MatchPrimaryButton onClick={save} disabled={!draft || saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </MatchPrimaryButton>
        </div>
      }
    >
      {!draft ? <p className="pt-10 text-center text-sm text-[#0A1F44]/60">Carregando seu perfil…</p> : null}
      {draft ? (
        <div className="space-y-10 pb-6">
          <MatchStepMarital draft={draft} gender={gender} onChange={setDraft} />
          <MatchStepIdentity draft={draft} onChange={setDraft} />
          <MatchStepPhotos draft={draft} onChange={setDraft} />
          <MatchStepInterests draft={draft} onChange={setDraft} />
          <MatchStepAchievements draft={draft} onChange={setDraft} />
          <MatchStepGoals draft={draft} onChange={setDraft} />
          <MatchStepConnections draft={draft} onChange={setDraft} />
          <MatchStepPace draft={draft} onChange={setDraft} />
          <MatchStepLocation draft={draft} onChange={setDraft} />
          <MatchStepJourney draft={draft} onChange={setDraft} />
          <MatchStepPrivacy draft={draft} onChange={setDraft} phoneDigits={phoneDigits} hideAvailability />
          <MatchStepDiscovery draft={draft} onChange={setDraft} />
        </div>
      ) : null}
    </MatchFlowShell>
  );
}
