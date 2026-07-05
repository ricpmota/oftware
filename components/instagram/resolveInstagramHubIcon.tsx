import type { LucideIcon } from 'lucide-react';
import { Dumbbell, HeartPulse, Rocket, Stethoscope, UtensilsCrossed } from 'lucide-react';
import type { InstagramProfileIconKey } from '@/components/instagram/instagramHubData';

const INSTAGRAM_HUB_ICON_MAP: Record<InstagramProfileIconKey, LucideIcon> = {
  stethoscope: Stethoscope,
  utensils: UtensilsCrossed,
  dumbbell: Dumbbell,
  heart: HeartPulse,
  rocket: Rocket,
};

export function resolveInstagramHubIcon(iconKey: InstagramProfileIconKey): LucideIcon {
  return INSTAGRAM_HUB_ICON_MAP[iconKey];
}
