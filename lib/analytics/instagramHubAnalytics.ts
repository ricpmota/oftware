/**
 * Eventos da hub /instagram — prontos para GA4, Firebase Analytics ou PostHog.
 */
import {
  mapHubProfileToStatsProfile,
  trackInstagramBioProfileClick,
  trackInstagramBioWhatsappClick,
} from '@/lib/analytics/instagramBioStatsClient';

export type InstagramHubAnalyticsEvent =
  | 'instagram_hub_medico_click'
  | 'instagram_hub_nutricionista_click'
  | 'instagram_hub_personal_click'
  | 'instagram_hub_emagrecer_click'
  | 'instagram_hub_dr_ricardo_click'
  | 'instagram_hub_whatsapp_click';

export type InstagramHubAnalyticsAction = 'open_modal' | 'cta' | 'whatsapp_open';

export type InstagramHubAnalyticsPayload = {
  action?: InstagramHubAnalyticsAction;
  profile?: string;
  href?: string;
};

export function trackInstagramHubEvent(
  event: InstagramHubAnalyticsEvent,
  payload?: InstagramHubAnalyticsPayload,
): void {
  if (typeof window === 'undefined') return;

  const detail = { event, ...payload, timestamp: Date.now() };

  if (process.env.NODE_ENV === 'development') {
    console.debug('[instagram-hub analytics]', detail);
  }

  window.dispatchEvent(new CustomEvent('oftware:instagram-hub-analytics', { detail }));

  persistAggregatedStats(payload);
}

function persistAggregatedStats(payload?: InstagramHubAnalyticsPayload): void {
  if (!payload?.profile) return;

  const statsProfile = mapHubProfileToStatsProfile(payload.profile);
  if (!statsProfile) return;

  if (payload.action === 'whatsapp_open') {
    trackInstagramBioWhatsappClick(statsProfile);
    return;
  }

  if (payload.action === 'open_modal' || payload.action === 'cta') {
    if (payload.action === 'cta' && payload.href?.startsWith('https://wa.me')) {
      trackInstagramBioWhatsappClick(statsProfile);
      return;
    }
    trackInstagramBioProfileClick(statsProfile);
  }
}

const PROFILE_EVENT_MAP: Partial<Record<string, InstagramHubAnalyticsEvent>> = {
  medico: 'instagram_hub_medico_click',
  nutricionista: 'instagram_hub_nutricionista_click',
  personal: 'instagram_hub_personal_click',
  emagrecer: 'instagram_hub_emagrecer_click',
  fundador: 'instagram_hub_dr_ricardo_click',
};

export function trackInstagramHubProfileEvent(
  profileId: string,
  action: InstagramHubAnalyticsAction,
  href?: string,
): void {
  const event = PROFILE_EVENT_MAP[profileId];
  if (!event) return;
  trackInstagramHubEvent(event, { action, profile: profileId, href });
}

export function trackInstagramHubWhatsAppEvent(_profile: string): void {
  trackInstagramHubEvent('instagram_hub_whatsapp_click', {
    action: 'whatsapp_open',
    profile: 'fundador',
  });
}

declare global {
  interface WindowEventMap {
    'oftware:instagram-hub-analytics': CustomEvent<
      InstagramHubAnalyticsPayload & { event: string; timestamp: number }
    >;
  }
}
