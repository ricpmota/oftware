import type { Firestore } from 'firebase-admin/firestore';
import { getMatchCommonalities } from '@/lib/match/matchCommonalities';
import type { MatchProfileDraft } from '@/lib/match/matchProfile';
import { sameCityAs } from '@/lib/server/matchPublicProfile';

function sameCityLabel(left: MatchProfileDraft, right: MatchProfileDraft, same: boolean): string | null {
  if (!same) return null;
  const city = left.identity.city?.trim() || right.identity.city?.trim() || '';
  return city ? `Mesma cidade: ${city}` : 'Mesma cidade';
}

/** O que os dois têm em comum, no mesmo formato da mensagem do Canal Chat. */
export function sharedMatchLabels(left: MatchProfileDraft, right: MatchProfileDraft): string[] {
  const items = getMatchCommonalities(left, right).items.map((item) => item.label);
  const city = sameCityLabel(left, right, sameCityAs(left, right));
  return city ? [...items, city] : items;
}
