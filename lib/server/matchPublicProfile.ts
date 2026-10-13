import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { sameMatchCity } from '@/lib/match/matchCity';
import { isDiscoverableProfile, matchPhotoFallback } from '@/lib/match/matchDiscoveryEligibility';
import {
  buildMatchViewerCard,
  createEmptyMatchDraft,
  firstDisplayName,
  sanitizeMatchProfile,
  type MatchProfileDraft,
  type MatchViewerCard,
} from '@/lib/match/matchProfile';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';

export const MATCH_DISCOVERY_PROFILES = 'match_discovery_profiles';

export type MatchDiscoveryProjection = {
  uid: string;
  displayName: string;
  photoUrl?: string;
  city?: string;
  state?: string;
  birthDate?: string;
  sex?: 'm' | 'f';
  discoverable: boolean;
  updatedAtMs: number;
};

function millis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string {
  return String(value || '').trim().slice(0, max);
}

function stateUf(value: unknown): string | undefined {
  const raw = text(value, 32).toUpperCase();
  return /^[A-Z]{2}$/.test(raw) ? raw : undefined;
}

function placeFrom(cityValue: unknown, stateValue: unknown): { city?: string; state?: string } {
  const city = text(cityValue, 80);
  const state = stateUf(stateValue);
  if (!city) return {};
  return { city, ...(state ? { state } : {}) };
}

function cityFromDoctor(data: Record<string, unknown>): { city?: string; state?: string } {
  const list = Array.isArray(data.cidades) ? data.cidades : [];
  for (const item of list) {
    const row = asRecord(item);
    const place = placeFrom(row.cidade, row.estado);
    if (place.city) return place;
  }
  return {};
}

/** Só nome, cidade e estado. O restante do prontuário não entra no objeto. */
function identityFromPatient(data: Record<string, unknown>): { displayName: string; city?: string; state?: string } {
  const identity = asRecord(data.dadosIdentificacao);
  const address = asRecord(identity.endereco);
  const place = placeFrom(address.cidade, address.estado);
  return {
    displayName: firstDisplayName(text(identity.nomeCompleto, 120) || text(data.nome, 120)),
    ...place,
  };
}

async function authIdentity(uid: string): Promise<{ displayName?: string; photoUrl?: string }> {
  if (!isValidFirebaseAuthUid(uid)) return {};
  try {
    const user = await getAuthAdmin().getUser(uid);
    const displayName = firstDisplayName(user.displayName);
    const photoUrl = matchPhotoFallback(undefined, user.photoURL || undefined);
    return {
      ...(displayName ? { displayName } : {}),
      ...(photoUrl ? { photoUrl } : {}),
    };
  } catch {
    return {};
  }
}

export function projectionFromData(uid: string, data: Record<string, unknown>): MatchDiscoveryProjection {
  const displayName = text(data.displayName, 40);
  const city = text(data.city, 80);
  const state = stateUf(data.state);
  const photoUrl = matchPhotoFallback(text(data.photoUrl, 500));
  const birthDate = text(data.birthDate, 10);
  const sex = data.sex === 'm' || data.sex === 'f' ? data.sex : undefined;
  return {
    uid,
    displayName,
    discoverable: data.discoverable === true,
    updatedAtMs: millis(data.updatedAt),
    ...(photoUrl ? { photoUrl } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(sex ? { sex } : {}),
  };
}

export async function readDiscoveryProjection(db: Firestore, uid: string): Promise<MatchDiscoveryProjection | null> {
  const snap = await db.collection(MATCH_DISCOVERY_PROFILES).doc(uid).get();
  if (!snap.exists) return null;
  return projectionFromData(uid, snap.data() || {});
}

export function discoveryCandidateFromProjection(projection: MatchDiscoveryProjection): {
  draft: MatchProfileDraft;
  card: MatchViewerCard;
  updatedAtMs: number;
  sex?: 'm' | 'f';
  birthDate?: string;
} | null {
  if (!projection.discoverable || !projection.displayName || !projection.city) return null;
  const draft = draftFromProjection(projection);
  return {
    draft,
    card: applyPhoto(buildMatchViewerCard(draft, new Date(), 'public'), projection.photoUrl),
    updatedAtMs: projection.updatedAtMs,
    ...(projection.sex ? { sex: projection.sex } : {}),
    ...(projection.birthDate ? { birthDate: projection.birthDate } : {}),
  };
}

function draftFromProjection(projection: MatchDiscoveryProjection): MatchProfileDraft {
  const draft = createEmptyMatchDraft();
  draft.discoverable = projection.discoverable;
  draft.identity.displayName = projection.displayName;
  if (projection.city) draft.identity.city = projection.city;
  if (projection.state) draft.identity.state = projection.state;
  if (projection.photoUrl) {
    draft.photos = [{ id: 'fallback', url: projection.photoUrl, storagePath: '', order: 0, isPrimary: true }];
  }
  return draft;
}

function applyPhoto(card: MatchViewerCard, photoUrl?: string): MatchViewerCard {
  if (card.primaryPhoto || !photoUrl) return card;
  const photo = { id: 'fallback', url: photoUrl, storagePath: '', order: 0, isPrimary: true };
  return { ...card, primaryPhoto: photo, photos: [photo, ...card.photos] };
}

export async function buildMatchPublicProfile(
  db: Firestore,
  uid: string
): Promise<{ draft: MatchProfileDraft; card: MatchViewerCard; discoverable: boolean; updatedAtMs: number } | null> {
  const [profileSnap, projection] = await Promise.all([
    db.collection('match_profiles').doc(uid).get(),
    readDiscoveryProjection(db, uid),
  ]);
  if (!profileSnap.exists && !projection) return null;

  const profile = profileSnap.exists ? sanitizeMatchProfile(profileSnap.data(), uid) : null;
  const base = profile || (projection ? draftFromProjection(projection) : null);
  if (!base) return null;
  if (projection?.displayName && !base.identity.displayName) base.identity.displayName = projection.displayName;
  if (projection?.city) {
    base.identity.city = projection.city;
    base.identity.state = projection.state;
  }
  if (!base.identity.displayName) return null;

  const optedOut = profile?.status === 'paused' || profile?.discoverable === false || projection?.discoverable === false;
  const discoverable =
    !optedOut && (projection?.discoverable === true || (profile ? isDiscoverableProfile(profile) : false));
  const card = applyPhoto(buildMatchViewerCard(base, new Date(), 'public'), projection?.photoUrl);
  const updatedAtMs = Math.max(millis(profileSnap.data()?.updatedAt), projection?.updatedAtMs || 0);
  return { draft: base, card, discoverable, updatedAtMs };
}

export function sameCityAs(viewer: MatchProfileDraft, candidate: MatchProfileDraft): boolean {
  if (!viewer.sharing.showCity || !candidate.sharing.showCity) return false;
  return sameMatchCity(viewer.identity, candidate.identity);
}

/** Cidade do cadastro já existente. Paciente tem prioridade; médico entra quando o paciente não tem cidade. */
export async function registrationIdentity(
  db: Firestore,
  uid: string
): Promise<{ displayName: string; city?: string; state?: string; photoUrl?: string }> {
  const [patientSnap, doctorSnap] = await Promise.all([
    db.collection('pacientes_completos').where('userId', '==', uid).limit(1).get(),
    db.collection('medicos').where('userId', '==', uid).limit(1).get(),
  ]);
  const patient = patientSnap.docs[0] ? identityFromPatient(patientSnap.docs[0].data()) : { displayName: '' };
  const doctor = doctorSnap.docs[0]?.data();
  const doctorPlace = doctor ? cityFromDoctor(doctor) : {};
  const doctorName = doctor ? firstDisplayName(text(doctor.nome, 120)) : '';
  const photoUrl = doctor ? matchPhotoFallback(text(doctor.fotoPerfilUrl, 500)) : undefined;
  const place = patient.city
    ? { city: patient.city, ...(patient.state ? { state: patient.state } : {}) }
    : doctorPlace;
  return {
    displayName: patient.displayName || doctorName,
    ...place,
    ...(photoUrl ? { photoUrl } : {}),
  };
}

export async function setMatchDiscoverable(
  db: Firestore,
  uid: string,
  discoverable: boolean
): Promise<{ discoverable: boolean }> {
  const profileRef = db.collection('match_profiles').doc(uid);
  const projectionRef = db.collection(MATCH_DISCOVERY_PROFILES).doc(uid);
  if (!discoverable) {
    await projectionRef.set({ uid, discoverable: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      await profileRef.set({ discoverable: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return { discoverable: false };
  }
  const [profileSnap, registered, existing, auth] = await Promise.all([
    profileRef.get(),
    registrationIdentity(db, uid),
    readDiscoveryProjection(db, uid),
    authIdentity(uid),
  ]);
  const profile = profileSnap.exists ? sanitizeMatchProfile(profileSnap.data(), uid) : null;
  const primary = profile?.photos.find((photo) => photo.isPrimary) || profile?.photos[0];
  const photoUrl = matchPhotoFallback(primary?.url, registered.photoUrl || auth.photoUrl);
  const displayName = registered.displayName || profile?.identity.displayName || existing?.displayName || auth.displayName || '';
  if (!displayName) return { discoverable: false };
  const city = registered.city || existing?.city;
  const state = registered.state || existing?.state;

  const projection: Record<string, unknown> = {
    uid,
    displayName,
    discoverable,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (photoUrl) projection.photoUrl = photoUrl;
  if (city) projection.city = city;
  if (state) projection.state = state;
  await projectionRef.set(projection, { merge: true });
  if (profileSnap.exists) {
    await profileRef.set({ discoverable, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  return { discoverable };
}
