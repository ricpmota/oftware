import type { MatchProfileDraft } from '@/lib/match/matchProfile';

export function matchPhotoFallback(matchUrl?: string, authUrl?: string): string | undefined {
  const match = matchUrl?.trim();
  if (match) return match;
  const auth = authUrl?.trim();
  if (auth && /^https:\/\//i.test(auth)) return auth;
  return undefined;
}

/** Opt-in explícito. Onboarding concluído continua valendo. O interruptor pode publicar o mínimo ou pausar. */
export function isDiscoverableProfile(draft: Pick<MatchProfileDraft, 'status' | 'onboardingCompleted' | 'discoverable'>): boolean {
  if (draft.status === 'paused' || draft.discoverable === false) return false;
  if (draft.discoverable === true) return true;
  return draft.status === 'active' && draft.onboardingCompleted === true;
}
