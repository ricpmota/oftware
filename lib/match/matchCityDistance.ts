import { matchCityKey, matchStateKey } from '@/lib/match/matchCity';
import coordinates from '@/lib/match/data/brazilCityCoordinates.json';

function asPlaces(value: unknown): Record<string, [number, number]> {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  if (Array.isArray(record['joao pessoa|PB'])) return record as Record<string, [number, number]>;
  if (record.default) return asPlaces(record.default);
  return record as Record<string, [number, number]>;
}

const PLACES = asPlaces(coordinates);

function point(city?: string, state?: string): [number, number] | null {
  const cityKey = matchCityKey(city);
  const stateKey = matchStateKey(state);
  if (!cityKey) return null;
  if (stateKey) return PLACES[`${cityKey}|${stateKey}`] || null;
  const found = Object.keys(PLACES).filter((key) => key.startsWith(`${cityKey}|`));
  if (found.length !== 1) return null;
  return PLACES[found[0]] || null;
}

function haversineKm(left: [number, number], right: [number, number]): number {
  const earth = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(right[0] - left[0]);
  const dLng = toRad(right[1] - left[1]);
  const lat1 = toRad(left[0]);
  const lat2 = toRad(right[0]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Distância entre as cidades do cadastro. Não é GPS da pessoa. */
export function matchCityDistanceKm(
  left: { city?: string; state?: string },
  right: { city?: string; state?: string }
): number | null {
  const from = point(left.city, left.state);
  const to = point(right.city, right.state);
  if (!from || !to) return null;
  return haversineKm(from, to);
}
