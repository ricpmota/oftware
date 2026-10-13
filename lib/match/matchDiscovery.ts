import { sameMatchCity } from '@/lib/match/matchCity';
import { matchCityDistanceKm } from '@/lib/match/matchCityDistance';
import { isDiscoverableProfile } from '@/lib/match/matchDiscoveryEligibility';
import { ageFromBirthDate, type MatchProfileDraft } from '@/lib/match/matchProfile';

export type DiscoveryCandidateMeta = {
  uid: string;
  commonCount: number;
  updatedAtMs: number;
  sameCity?: boolean;
};

function wantedSex(showMe: readonly string[]): 'm' | 'f' | null {
  const men = showMe.includes('men');
  const women = showMe.includes('women');
  if (showMe.includes('all') || (men && women) || (!men && !women)) return null;
  return men ? 'm' : 'f';
}

function withinChosenPlace(viewer: MatchProfileDraft, candidate: MatchProfileDraft): boolean {
  const mode = viewer.discoveryPreferences.locationMode;
  if (!mode || mode === 'anywhere') return true;
  if (!viewer.identity.city) return true;
  if (sameMatchCity(viewer.identity, candidate.identity)) return true;
  if (mode === 'my_city') return false;
  const radius = viewer.discoveryPreferences.radiusKm;
  const distance = matchCityDistanceKm(viewer.identity, candidate.identity);
  if (radius == null || distance == null) return false;
  return distance <= radius;
}

/**
 * Idade, sexo e lugar seguem o que a pessoa escolheu no perfil.
 * Quem não declarou tipo de conexão não é excluído por isso.
 * A distância é entre cidades do cadastro, não GPS.
 */
export function passesDiscoveryFilters(
  viewer: MatchProfileDraft,
  candidate: MatchProfileDraft,
  today = new Date(),
  candidateSex?: 'm' | 'f',
  candidateBirthDate?: string
): boolean {
  if (!isDiscoverableProfile(candidate)) return false;

  const ageMin = viewer.discoveryPreferences.ageMin;
  const ageMax = viewer.discoveryPreferences.ageMax;
  if (ageMin != null || ageMax != null) {
    const age = ageFromBirthDate(candidateBirthDate || candidate.identity.birthDate, today);
    if (age == null) return false;
    if (ageMin != null && age < ageMin) return false;
    if (ageMax != null && age > ageMax) return false;
  }

  const sex = wantedSex(viewer.discoveryPreferences.showMe);
  if (sex && candidateSex !== sex) return false;

  const goals = viewer.discoveryPreferences.connectionGoals;
  if (goals.length && candidate.connectionGoals.length) {
    const shared = candidate.connectionGoals.some((id) => goals.includes(id));
    if (!shared) return false;
  }

  return withinChosenPlace(viewer, candidate);
}

export function sortDiscoveryCandidates<T extends DiscoveryCandidateMeta>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.commonCount !== a.commonCount) return b.commonCount - a.commonCount;
    const sameCity = Number(b.sameCity === true) - Number(a.sameCity === true);
    if (sameCity !== 0) return sameCity;
    if (b.updatedAtMs !== a.updatedAtMs) return b.updatedAtMs - a.updatedAtMs;
    return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
  });
}
