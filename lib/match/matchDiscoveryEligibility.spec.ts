import { describe, expect, it } from 'vitest';
import { isDiscoverableProfile, matchPhotoFallback } from '@/lib/match/matchDiscoveryEligibility';

describe('match discovery eligibility', () => {
  it('mantém quem concluiu o onboarding e quem ligou o interruptor', () => {
    expect(isDiscoverableProfile({ status: 'active', onboardingCompleted: true })).toBe(true);
    expect(isDiscoverableProfile({ status: 'draft', onboardingCompleted: false, discoverable: true })).toBe(true);
  });

  it('esconde pausa, opt-out e quem ainda não aceitou aparecer', () => {
    expect(isDiscoverableProfile({ status: 'paused', onboardingCompleted: true })).toBe(false);
    expect(isDiscoverableProfile({ status: 'active', onboardingCompleted: true, discoverable: false })).toBe(false);
    expect(isDiscoverableProfile({ status: 'draft', onboardingCompleted: false })).toBe(false);
  });

  it('resolve a foto do Match antes da do login', () => {
    expect(matchPhotoFallback('https://cdn.example/match.jpg', 'https://lh3.googleusercontent.com/a/photo')).toBe(
      'https://cdn.example/match.jpg'
    );
    expect(matchPhotoFallback('', 'https://lh3.googleusercontent.com/a/photo')).toBe('https://lh3.googleusercontent.com/a/photo');
    expect(matchPhotoFallback('', 'http://insecure.example/a.jpg')).toBeUndefined();
    expect(matchPhotoFallback('', '')).toBeUndefined();
  });
});
