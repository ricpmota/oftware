'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatchPrimaryButton, MatchFlowShell } from '@/components/meta/match/flow/MatchFlowChrome';
import {
  MatchStepAchievements,
  MatchStepActivities,
  MatchStepConnections,
  MatchStepGoals,
  MatchStepDiscovery,
  MatchStepIdentity,
  MatchStepInterests,
  MatchStepIntro,
  MatchStepJourney,
  MatchStepLocation,
  MatchStepMarital,
  MatchStepPace,
  MatchStepPhotos,
  MatchStepPreview,
  MatchStepPrivacy,
  MatchStepRoutine,
} from '@/components/meta/match/onboarding/MatchOnboardingSteps';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import {
  MATCH_ACHIEVEMENT_STEP,
  MATCH_GOAL_STEP,
  MATCH_ONBOARDING_STEP_COUNT,
  createEmptyMatchDraft,
  firstDisplayName,
  type MatchProfileDraft,
} from '@/lib/match/matchProfile';
import { applyKnownIdentity, loadKnownMatchIdentity } from '@/lib/match/matchKnownIdentity';
import type { MatchGrammaticalGender } from '@/lib/match/matchTaxonomy';
import { getMyMatchProfile, saveMyMatchProfile } from '@/services/matchProfileService';

const LAST_STEP = MATCH_ONBOARDING_STEP_COUNT - 1;

export function MatchOnboarding() {
  const router = useRouter();
  const user = useMatchAuth();
  const [draft, setDraft] = useState<MatchProfileDraft | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [gender, setGender] = useState<MatchGrammaticalGender>('u');
  const [phoneDigits, setPhoneDigits] = useState('');

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    getMyMatchProfile()
      .then(async (profile) => {
        if (cancelled) return;
        if (profile?.onboardingCompleted) {
          router.replace('/meta/match/profile');
          return;
        }
        const known = await loadKnownMatchIdentity(user.uid, user.email).catch(() => null);
        if (cancelled) return;
        setGender(known?.grammaticalGender || 'u');
        setPhoneDigits(known?.phoneDigits || '');
        if (profile) {
          setDraft({
            ...applyKnownIdentity(profile, known),
            contact: {
              ...profile.contact,
              ...(profile.sharing.showPhone && !profile.contact.phone && known?.phoneDigits
                ? { phone: known.phoneDigits }
                : {}),
            },
          });
          const saved = profile.onboardingStep || 0;
          setStep(!profile.identity.maritalStatus && saved > 0 ? 1 : saved);
          setIsNew(false);
          return;
        }
        const empty = createEmptyMatchDraft();
        empty.identity.displayName = firstDisplayName(user.displayName) || known?.displayName || '';
        if (known?.birthDate) empty.identity.birthDate = known.birthDate;
        if (known?.city) empty.identity.city = known.city;
        if (known?.state) empty.identity.state = known.state;
        setGender(known?.grammaticalGender || 'u');
        setDraft(empty);
        setIsNew(true);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível abrir seu perfil.');
      });
    return () => {
      cancelled = true;
    };
  }, [router, user]);

  async function persist(next: MatchProfileDraft, advance: boolean) {
    setSaving(true);
    setError('');
    try {
      const saved = await saveMyMatchProfile(next, { isNew });
      setDraft(saved);
      setIsNew(false);
      if (next.onboardingCompleted) {
        router.push('/meta/match/profile');
        return;
      }
      if (advance) setStep(next.onboardingStep);
    } catch {
      setError('Não foi possível salvar agora. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  async function onContinue() {
    if (!draft || saving) return;
    if (step === 1 && !draft.identity.maritalStatus) {
      setError('Escolha uma opção para continuar.');
      return;
    }
    if (step === 2 && draft.identity.displayName.trim().length < 2) {
      setError('Escolha um nome público com pelo menos 2 letras.');
      return;
    }
    const finishing = step === LAST_STEP;
    const next: MatchProfileDraft = {
      ...draft,
      status: finishing ? 'active' : 'draft',
      onboardingCompleted: finishing,
      onboardingStep: finishing ? step : Math.min(step + 1, LAST_STEP),
    };
    await persist(next, !finishing);
  }

  function onBack() {
    setError('');
    if (step === 0) {
      router.push('/meta/match');
      return;
    }
    setStep((current) => Math.max(0, current - 1));
  }

  const cta =
    step === 0 ? 'Começar' : step === LAST_STEP ? 'Entrar no Match Saudável' : 'Continuar';

  return (
    <MatchFlowShell
      title="Match Saudável"
      step={step + 1}
      total={MATCH_ONBOARDING_STEP_COUNT}
      onBack={onBack}
      backLabel={step === 0 ? 'Voltar para o Match' : 'Voltar'}
      footer={
        <div>
          {error ? <p className="mb-2 text-sm text-[#9A3B3B]">{error}</p> : null}
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={onBack}
                className="h-12 shrink-0 rounded-full px-4 text-sm font-semibold text-[#0A1F44]"
              >
                Voltar
              </button>
            ) : null}
            <MatchPrimaryButton onClick={onContinue} disabled={!draft || saving}>
              {saving ? 'Salvando…' : cta}
              {saving ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </MatchPrimaryButton>
          </div>
          {step === MATCH_ACHIEVEMENT_STEP || step === MATCH_GOAL_STEP ? (
            <button
              type="button"
              onClick={onContinue}
              className="mt-2 h-10 w-full text-sm font-semibold text-[#0A1F44]/70"
            >
              Pular por enquanto
            </button>
          ) : null}
          {step === LAST_STEP ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-2 h-10 w-full text-sm font-semibold text-[#0A1F44]/70"
            >
              Editar perfil
            </button>
          ) : null}
        </div>
      }
    >
      {!draft ? (
        <p className="pt-10 text-center text-sm text-[#0A1F44]/60">Carregando seu perfil…</p>
      ) : (
        <StepBody step={step} draft={draft} gender={gender} phoneDigits={phoneDigits} onChange={setDraft} />
      )}
    </MatchFlowShell>
  );
}

function StepBody({
  step,
  draft,
  gender,
  phoneDigits,
  onChange,
}: {
  step: number;
  draft: MatchProfileDraft;
  gender: MatchGrammaticalGender;
  phoneDigits?: string;
  onChange: (draft: MatchProfileDraft) => void;
}) {
  switch (step) {
    case 0:
      return <MatchStepIntro />;
    case 1:
      return <MatchStepMarital draft={draft} gender={gender} onChange={onChange} />;
    case 2:
      return <MatchStepIdentity draft={draft} onChange={onChange} />;
    case 3:
      return <MatchStepPhotos draft={draft} onChange={onChange} />;
    case 4:
      return <MatchStepInterests draft={draft} onChange={onChange} />;
    case 5:
      return <MatchStepActivities draft={draft} onChange={onChange} />;
    case 6:
      return <MatchStepConnections draft={draft} onChange={onChange} />;
    case 7:
      return <MatchStepRoutine draft={draft} onChange={onChange} />;
    case 8:
      return <MatchStepPace draft={draft} onChange={onChange} />;
    case 9:
      return <MatchStepLocation draft={draft} onChange={onChange} />;
    case 10:
      return <MatchStepJourney draft={draft} onChange={onChange} />;
    case 11:
      return <MatchStepPrivacy draft={draft} onChange={onChange} phoneDigits={phoneDigits} />;
    case 12:
      return <MatchStepDiscovery draft={draft} onChange={onChange} />;
    case MATCH_ACHIEVEMENT_STEP:
      return <MatchStepAchievements draft={draft} onChange={onChange} />;
    case MATCH_GOAL_STEP:
      return <MatchStepGoals draft={draft} onChange={onChange} />;
    default:
      return <MatchStepPreview draft={draft} />;
  }
}
