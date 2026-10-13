import { FieldValue, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getMatchCommonalities, type MatchCommonality } from '@/lib/match/matchCommonalities';
import { passesDiscoveryFilters, sortDiscoveryCandidates } from '@/lib/match/matchDiscovery';
import {
  buildMatchViewerCard,
  createEmptyMatchDraft,
  sanitizeMatchProfile,
  type MatchProfileDraft,
  type MatchViewerCard,
} from '@/lib/match/matchProfile';
import {
  buildMatchPublicProfile,
  discoveryCandidateFromProjection,
  MATCH_DISCOVERY_PROFILES,
  projectionFromData,
  sameCityAs,
} from '@/lib/server/matchPublicProfile';
import { decideConnect, decideResponse } from '@/lib/match/matchConnectionDecision';
import { listMatchPasses } from '@/lib/server/matchPassesAdmin';
import { matchPairKey, otherUid, type MatchRelation } from '@/lib/match/matchPair';

export const MATCH_PROFILES = 'match_profiles';
export const MATCH_REQUESTS = 'match_connection_requests';
export const MATCH_CONNECTIONS = 'match_connections';
export const MATCH_BLOCKS = 'match_blocks';

const BATCH = 20;
const PROJECTION_PAGE = 200;
const PROJECTION_CAP = 3000;

export type MatchPersonPayload = {
  uid: string;
  card: MatchViewerCard;
  commonalities: { total: number; items: MatchCommonality[] };
  relation: MatchRelation;
  requestId?: string;
  reasonLabel?: string;
  message?: string;
  connectedAtMs?: number;
  sameCity?: boolean;
};

type LoadedProfile = {
  uid: string;
  draft: MatchProfileDraft;
  updatedAtMs: number;
};

function millis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}

function loadProfile(snap: QueryDocumentSnapshot): LoadedProfile | null {
  if (!snap.exists) return null;
  const draft = sanitizeMatchProfile(snap.data(), snap.id);
  return { uid: snap.id, draft, updatedAtMs: millis(snap.data().updatedAt) };
}

function otherFrom(snap: QueryDocumentSnapshot, uid: string): string {
  const users = Array.isArray(snap.data().users) ? (snap.data().users as string[]) : [snap.data().fromUid, snap.data().toUid];
  return otherUid(users.filter(Boolean), uid);
}

/** Some da fila só quem já está conectado ou bloqueado. Quem aguarda continua, com Conectar desativado. */
async function deckGate(db: Firestore, uid: string): Promise<{ hidden: Set<string>; relations: Map<string, MatchRelation> }> {
  const [incoming, outgoing, connections, blocks] = await Promise.all([
    db.collection(MATCH_REQUESTS).where('toUid', '==', uid).where('status', '==', 'pending').limit(200).get(),
    db.collection(MATCH_REQUESTS).where('fromUid', '==', uid).where('status', '==', 'pending').limit(200).get(),
    db.collection(MATCH_CONNECTIONS).where('users', 'array-contains', uid).where('status', '==', 'active').limit(200).get(),
    db.collection(MATCH_BLOCKS).where('users', 'array-contains', uid).limit(200).get(),
  ]);
  const hidden = new Set<string>();
  const relations = new Map<string, MatchRelation>();
  for (const snap of connections.docs) {
    const other = otherFrom(snap, uid);
    if (other) hidden.add(other);
  }
  for (const snap of blocks.docs) {
    const other = otherFrom(snap, uid);
    if (other) hidden.add(other);
  }
  for (const snap of outgoing.docs) {
    const other = otherFrom(snap, uid);
    if (other && !hidden.has(other)) relations.set(other, 'outgoing_pending');
  }
  for (const snap of incoming.docs) {
    const other = otherFrom(snap, uid);
    if (other && !hidden.has(other)) relations.set(other, 'incoming_pending');
  }
  return { hidden, relations };
}

function pushCandidate(
  people: Array<MatchPersonPayload & { commonCount: number; updatedAtMs: number; sameCity?: boolean }>,
  viewer: MatchProfileDraft,
  candidate: {
    uid: string;
    draft: MatchProfileDraft;
    card: MatchViewerCard;
    updatedAtMs: number;
    sex?: 'm' | 'f';
    birthDate?: string;
  }
) {
  if (!passesDiscoveryFilters(viewer, candidate.draft, new Date(), candidate.sex, candidate.birthDate)) return;
  const commonalities = getMatchCommonalities(viewer, candidate.draft);
  const sameCity = sameCityAs(viewer, candidate.draft);
  people.push({
    uid: candidate.uid,
    card: candidate.card,
    commonalities,
    relation: 'none',
    commonCount: commonalities.total,
    updatedAtMs: candidate.updatedAtMs,
    ...(sameCity ? { sameCity } : {}),
  });
}

export async function listDiscovery(
  db: Firestore,
  uid: string,
  cursor?: string
): Promise<{ people: MatchPersonPayload[]; nextCursor: string | null; passedUids: string[] }> {
  const [viewer, passedUids] = await Promise.all([buildMatchPublicProfile(db, uid), listMatchPasses(db, uid)]);
  if (!viewer || !viewer.discoverable) {
    return { people: [], nextCursor: null, passedUids };
  }
  const gate = await deckGate(db, uid);
  const people: Array<MatchPersonPayload & { commonCount: number; updatedAtMs: number; sameCity?: boolean }> = [];
  const seen = new Set<string>();
  let start: string | undefined = cursor;

  if (!cursor) {
    const projectionDocs: QueryDocumentSnapshot[] = [];
    let projectionCursor: QueryDocumentSnapshot | undefined;
    while (projectionDocs.length < PROJECTION_CAP) {
      let query = db.collection(MATCH_DISCOVERY_PROFILES).where('discoverable', '==', true).limit(PROJECTION_PAGE);
      if (projectionCursor) query = query.startAfter(projectionCursor);
      const snap = await query.get();
      projectionDocs.push(...snap.docs);
      if (snap.size < PROJECTION_PAGE) break;
      projectionCursor = snap.docs[snap.docs.length - 1];
    }
    for (const doc of projectionDocs) {
      if (doc.id === uid || gate.hidden.has(doc.id) || seen.has(doc.id)) continue;
      const bundle = discoveryCandidateFromProjection(projectionFromData(doc.id, doc.data()));
      if (!bundle) continue;
      seen.add(doc.id);
      pushCandidate(people, viewer.draft, { uid: doc.id, ...bundle });
    }
  }

  for (let page = 0; page < 3; page += 1) {
    let query = db.collection(MATCH_PROFILES).where('status', '==', 'active').orderBy('updatedAt', 'desc').limit(BATCH);
    if (start) {
      const cursorSnap = await db.collection(MATCH_PROFILES).doc(start).get();
      if (cursorSnap.exists) query = query.startAfter(cursorSnap);
    }
    const snap = await query.get();
    if (snap.empty) break;
    const last = snap.docs[snap.docs.length - 1];
    const hasMore = snap.size === BATCH;
    for (const doc of snap.docs) {
      if (doc.id === uid || gate.hidden.has(doc.id) || seen.has(doc.id)) continue;
      const candidate = loadProfile(doc);
      if (!candidate) continue;
      seen.add(doc.id);
      pushCandidate(people, viewer.draft, {
        uid: candidate.uid,
        draft: candidate.draft,
        card: buildMatchViewerCard(candidate.draft, new Date(), 'public'),
        updatedAtMs: candidate.updatedAtMs,
      });
    }
    if (!hasMore) break;
    start = last.id;
  }

  const ordered = sortDiscoveryCandidates(people).map((item) => ({
    uid: item.uid,
    card: item.card,
    commonalities: item.commonalities,
    relation: gate.relations.get(item.uid) || item.relation,
    ...(item.sameCity ? { sameCity: true } : {}),
  }));
  return { people: ordered, nextCursor: null, passedUids };
}

export async function relationFor(db: Firestore, uid: string, other: string): Promise<{ relation: MatchRelation; requestId?: string; reasonLabel?: string; message?: string }> {
  const key = matchPairKey(uid, other);
  const [block, connection, request] = await Promise.all([
    db.collection(MATCH_BLOCKS).doc(key).get(),
    db.collection(MATCH_CONNECTIONS).doc(key).get(),
    db.collection(MATCH_REQUESTS).doc(key).get(),
  ]);
  if (block.exists) return { relation: 'blocked' };
  if (connection.exists && connection.data()?.status === 'active') return { relation: 'connected' };
  if (request.exists && request.data()?.status === 'pending') {
    const data = request.data() || {};
    const incoming = data.toUid === uid;
    return {
      relation: incoming ? 'incoming_pending' : 'outgoing_pending',
      requestId: request.id,
      ...(typeof data.reason?.labelSnapshot === 'string' ? { reasonLabel: data.reason.labelSnapshot } : {}),
      ...(typeof data.message === 'string' ? { message: data.message } : {}),
    };
  }
  return { relation: 'none' };
}

export async function personPayload(db: Firestore, uid: string, other: string): Promise<MatchPersonPayload | null> {
  const [viewer, candidate, relation] = await Promise.all([
    buildMatchPublicProfile(db, uid),
    buildMatchPublicProfile(db, other),
    relationFor(db, uid, other),
  ]);
  if (!candidate) return null;
  if (!candidate.discoverable && relation.relation === 'none') return null;
  const viewerDraft = viewer?.draft || createEmptyMatchDraft();
  return {
    uid: other,
    card: candidate.card,
    commonalities: getMatchCommonalities(viewerDraft, candidate.draft),
    ...(sameCityAs(viewerDraft, candidate.draft) ? { sameCity: true } : {}),
    ...relation,
  };
}

export type MatchConnectResult = 'interest_sent' | 'connected' | 'already_sent' | 'already_connected';

export async function sendConnectionRequest(
  db: Firestore,
  fromUid: string,
  toUid: string
): Promise<{ ok: true; result: MatchConnectResult; requestId: string } | { ok: false; result: 'self' | 'unavailable' | 'blocked' }> {
  if (fromUid === toUid) return { ok: false, result: 'self' };
  const [from, to] = await Promise.all([buildMatchPublicProfile(db, fromUid), buildMatchPublicProfile(db, toUid)]);
  if (!from?.discoverable || !to?.discoverable) return { ok: false, result: 'unavailable' };

  const key = matchPairKey(fromUid, toUid);
  const requestRef = db.collection(MATCH_REQUESTS).doc(key);
  const connectionRef = db.collection(MATCH_CONNECTIONS).doc(key);
  const blockRef = db.collection(MATCH_BLOCKS).doc(key);

  return db.runTransaction(async (tx) => {
    const [block, connection, request] = await Promise.all([tx.get(blockRef), tx.get(connectionRef), tx.get(requestRef)]);
    const requestData = request.data() || {};
    const users = [fromUid, toUid].sort();
    const decision = decideConnect(fromUid, {
      blocked: block.exists,
      connectionActive: connection.exists && connection.data()?.status === 'active',
      requestStatus: request.exists ? String(requestData.status || '') : null,
      requestFromUid: request.exists ? String(requestData.fromUid || '') : null,
      requestToUid: request.exists ? String(requestData.toUid || '') : null,
    });
    if (decision.action === 'noop') {
      if (decision.result === 'blocked') return { ok: false as const, result: 'blocked' as const };
      return { ok: true as const, result: decision.result, requestId: key };
    }
    if (decision.action === 'create_interest' || !request.exists) {
      tx.set(requestRef, {
        fromUid,
        toUid,
        users,
        pairKey: key,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true as const, result: 'interest_sent' as const, requestId: key };
    }
    const pairUsers = Array.isArray(requestData.users) ? requestData.users : users;
    tx.update(requestRef, {
      status: 'accepted',
      updatedAt: FieldValue.serverTimestamp(),
      respondedAt: FieldValue.serverTimestamp(),
    });
    tx.set(connectionRef, {
      pairKey: key,
      users: pairUsers,
      createdFromRequestId: key,
      status: 'active',
      connectedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true as const, result: 'connected' as const, requestId: key };
  });
}

export async function respondConnectionRequest(
  db: Firestore,
  uid: string,
  requestId: string,
  action: 'accept' | 'ignore'
): Promise<{ ok: true; connected: boolean; users: string[] } | { ok: false; code: string }> {
  const requestRef = db.collection(MATCH_REQUESTS).doc(requestId);
  const connectionRef = db.collection(MATCH_CONNECTIONS).doc(requestId);

  return db.runTransaction(async (tx) => {
    const request = await tx.get(requestRef);
    const data = request.data() || {};
    const connection = request.exists ? await tx.get(connectionRef) : null;
    const decision = decideResponse(
      uid,
      request.exists ? { toUid: String(data.toUid || ''), status: String(data.status || '') } : null,
      action,
      Boolean(connection?.exists && connection.data()?.status === 'active')
    );
    if (decision.action === 'reject') return { ok: false as const, code: decision.code };
    if (decision.action === 'ignore') {
      tx.update(requestRef, {
        status: 'ignored',
        updatedAt: FieldValue.serverTimestamp(),
        respondedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true as const, connected: false, users: [] };
    }
    tx.update(requestRef, {
      status: 'accepted',
      updatedAt: FieldValue.serverTimestamp(),
      respondedAt: FieldValue.serverTimestamp(),
    });
    const users = [String(data.fromUid || ''), String(data.toUid || '')].filter(Boolean);
    if (decision.createConnection) {
      tx.set(connectionRef, {
        pairKey: requestId,
        users: Array.isArray(data.users) ? data.users : users,
        createdFromRequestId: requestId,
        status: 'active',
        connectedAt: FieldValue.serverTimestamp(),
      });
    }
    return { ok: true as const, connected: decision.createConnection, users };
  });
}

export async function listIncomingRequests(db: Firestore, uid: string): Promise<MatchPersonPayload[]> {
  const viewer = await buildMatchPublicProfile(db, uid);
  const viewerDraft = viewer?.draft || createEmptyMatchDraft();
  const snap = await db.collection(MATCH_REQUESTS).where('toUid', '==', uid).where('status', '==', 'pending').limit(30).get();
  const people: MatchPersonPayload[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const fromUid = String(data.fromUid || '');
    const person = fromUid ? await buildMatchPublicProfile(db, fromUid) : null;
    if (!person) continue;
    const reasonLabel = typeof data.reason?.labelSnapshot === 'string' ? data.reason.labelSnapshot : '';
    const message = typeof data.message === 'string' ? data.message : '';
    people.push({
      uid: fromUid,
      card: person.card,
      commonalities: getMatchCommonalities(viewerDraft, person.draft),
      relation: 'incoming_pending',
      requestId: doc.id,
      ...(sameCityAs(viewerDraft, person.draft) ? { sameCity: true } : {}),
      ...(reasonLabel ? { reasonLabel } : {}),
      ...(message ? { message } : {}),
    });
  }
  return people;
}

export async function listConnections(db: Firestore, uid: string, limit = 40): Promise<MatchPersonPayload[]> {
  const viewer = await buildMatchPublicProfile(db, uid);
  const viewerDraft = viewer?.draft || createEmptyMatchDraft();
  const snap = await db
    .collection(MATCH_CONNECTIONS)
    .where('users', 'array-contains', uid)
    .where('status', '==', 'active')
    .limit(50)
    .get();
  const people: MatchPersonPayload[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const users = Array.isArray(data.users) ? (data.users as string[]) : [];
    const other = otherUid(users, uid);
    if (!other) continue;
    const person = await buildMatchPublicProfile(db, other);
    if (!person) continue;
    const connectedAtMs = millis(data.connectedAt);
    people.push({
      uid: other,
      card: person.card,
      commonalities: getMatchCommonalities(viewerDraft, person.draft),
      relation: 'connected',
      ...(sameCityAs(viewerDraft, person.draft) ? { sameCity: true } : {}),
      ...(connectedAtMs > 0 ? { connectedAtMs } : {}),
    });
  }
  people.sort((a, b) => (b.connectedAtMs || 0) - (a.connectedAtMs || 0) || a.uid.localeCompare(b.uid));
  const size = Math.min(50, Math.max(1, limit));
  return people.slice(0, size);
}
