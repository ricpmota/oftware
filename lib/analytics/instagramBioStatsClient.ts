import type { InstagramBioStatsProfileKey } from '@/types/instagramBioStats';

let activeMedicoId: string | null = null;

export function setInstagramBioStatsMedicoId(medicoId: string | null): void {
  activeMedicoId = medicoId?.trim() || null;
}

export function getInstagramBioStatsMedicoId(): string | null {
  return activeMedicoId;
}

function sendInstagramBioStatsEvent(payload: {
  type: 'view' | 'click' | 'whatsapp';
  profile?: InstagramBioStatsProfileKey;
}): void {
  if (!activeMedicoId || typeof window === 'undefined') return;

  const body = JSON.stringify({
    medicoId: activeMedicoId,
    type: payload.type,
    profile: payload.profile,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/instagram-bio/analytics', blob);
      return;
    }
  } catch {
    // fallback fetch
  }

  void fetch('/api/instagram-bio/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackInstagramBioPageView(): void {
  sendInstagramBioStatsEvent({ type: 'view' });
}

export function trackInstagramBioProfileClick(profile: InstagramBioStatsProfileKey): void {
  sendInstagramBioStatsEvent({ type: 'click', profile });
}

export function trackInstagramBioWhatsappClick(profile: InstagramBioStatsProfileKey): void {
  sendInstagramBioStatsEvent({ type: 'whatsapp', profile });
}

export function mapHubProfileToStatsProfile(profileId: string): InstagramBioStatsProfileKey | null {
  if (
    profileId === 'emagrecer' ||
    profileId === 'nutricionista' ||
    profileId === 'personal' ||
    profileId === 'fundador' ||
    profileId === 'medico'
  ) {
    return profileId;
  }
  return null;
}

/** Mapeia perfil do picker do Ricardo para agregação no botão fundador. */
export function mapFounderPickerProfileToStatsProfile(
  profile: string,
): InstagramBioStatsProfileKey {
  if (profile === 'medico') return 'medico';
  if (profile === 'nutricionista') return 'nutricionista';
  if (profile === 'personal') return 'personal';
  return 'fundador';
}
