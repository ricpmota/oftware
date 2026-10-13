export type MatchMonitorStage = 'visit' | 'onboarding' | 'active' | 'paused';

export function matchMonitorStage(
  profile: {
    status: string;
    onboardingCompleted: boolean;
    discoverable?: boolean;
  } | null,
): MatchMonitorStage {
  if (!profile) return 'visit';
  if (profile.status === 'paused') return 'paused';
  if (profile.discoverable === false && (profile.onboardingCompleted || profile.status === 'active')) {
    return 'paused';
  }
  if (profile.discoverable === true) return 'active';
  if (profile.status === 'active' && profile.onboardingCompleted) return 'active';
  return 'onboarding';
}
