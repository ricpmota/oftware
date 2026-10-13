import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import type {
  MatchCanalDeliveryStatus,
  MatchMonitorBroadcast,
  MatchMonitorConnection,
  MatchMonitorDelivery,
  MatchMonitorPerson,
  MatchMonitorRequest,
  MatchMonitorSend,
  MatchMonitorSnapshot,
  MatchMonitorStats,
} from '@/lib/match/matchAdminTypes';
import { DEFAULT_MATCH_CANAL_CHAT_TEMPLATE, renderMatchCanalChatTemplate } from '@/lib/match/matchCanalChatMessage';
import { matchMonitorStage } from '@/lib/match/matchMonitorStage';
import { firstDisplayName, sanitizeMatchProfile, type MatchProfileDraft } from '@/lib/match/matchProfile';
import { loadCanalChatSender, maskMatchPhoneTail, resolveMatchPhone } from '@/lib/server/matchCanalChatSend';
import {
  MATCH_BROADCASTS,
  MATCH_CANAL_CHAT_LOG,
  MATCH_VISITS,
  loadMatchCanalChatSettings,
} from '@/lib/server/matchCanalChatSettings';
import { sharedMatchLabels } from '@/lib/server/matchConnectionLabels';
import { MATCH_CONNECTIONS, MATCH_PROFILES, MATCH_REQUESTS } from '@/lib/server/matchSocialAdmin';

const SOURCE_CAP = 500;
const PEOPLE_CAP = 250;
const CONNECTION_CAP = 80;
const REQUEST_CAP = 40;
const LOG_CAP = 30;
const BROADCAST_CAP = 8;
const PHONE_CONCURRENCY = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ProfileHit = {
  draft: MatchProfileDraft;
  createdAtMs: number;
  updatedAtMs: number;
};

type VisitHit = {
  displayName: string;
  firstSeenMs: number;
  lastSeenMs: number;
  visitCount: number;
};

type PersonAcc = {
  uid: string;
  visit?: VisitHit;
  profile?: ProfileHit;
};

function millis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return 0;
}

function iso(ms: number): string | null {
  if (!ms) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function saoPauloDayStart(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  const stamp = Date.parse(`${year}-${month}-${day}T00:00:00-03:00`);
  return Number.isNaN(stamp) ? now.getTime() - 24 * 60 * 60 * 1000 : stamp;
}

function text(value: unknown, max: number): string {
  return String(value || '').trim().slice(0, max);
}

function nameFrom(acc: PersonAcc | undefined, fallback = 'Sem nome'): string {
  const profileName = acc?.profile?.draft.identity.displayName?.trim();
  if (profileName) return profileName;
  const visitName = acc?.visit?.displayName?.trim();
  if (visitName) return firstDisplayName(visitName) || visitName;
  return fallback;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function readProfile(snap: QueryDocumentSnapshot): ProfileHit | null {
  try {
    return {
      draft: sanitizeMatchProfile(snap.data(), snap.id),
      createdAtMs: millis(snap.data().createdAt),
      updatedAtMs: millis(snap.data().updatedAt),
    };
  } catch {
    return null;
  }
}

function readVisit(snap: QueryDocumentSnapshot): VisitHit {
  const data = snap.data();
  return {
    displayName: text(data.displayName, 80),
    firstSeenMs: millis(data.firstSeenAt),
    lastSeenMs: millis(data.lastSeenAt),
    visitCount: typeof data.visitCount === 'number' && data.visitCount > 0 ? data.visitCount : 1,
  };
}

function deliveryStatus(value: unknown): MatchCanalDeliveryStatus {
  if (value === 'sent' || value === 'no_phone' || value === 'failed' || value === 'channel_offline') return value;
  return 'untracked';
}

export async function loadMatchMonitorSnapshot(db: Firestore): Promise<MatchMonitorSnapshot> {
  const dayStart = saoPauloDayStart();
  const weekStart = Date.now() - WEEK_MS;
  const [visitsSnap, profilesSnap, connectionsSnap, requestsSnap, logsSnap, broadcastsSnap, settings, sender] =
    await Promise.all([
      db.collection(MATCH_VISITS).orderBy('lastSeenAt', 'desc').limit(SOURCE_CAP).get(),
      db.collection(MATCH_PROFILES).limit(SOURCE_CAP).get(),
      db.collection(MATCH_CONNECTIONS).orderBy('connectedAt', 'desc').limit(CONNECTION_CAP).get(),
      db.collection(MATCH_REQUESTS).where('status', '==', 'pending').limit(REQUEST_CAP).get(),
      db.collection(MATCH_CANAL_CHAT_LOG).orderBy('createdAt', 'desc').limit(LOG_CAP).get(),
      db.collection(MATCH_BROADCASTS).orderBy('createdAt', 'desc').limit(BROADCAST_CAP).get(),
      loadMatchCanalChatSettings(db),
      loadCanalChatSender(),
    ]);

  const people = new Map<string, PersonAcc>();
  const partial = visitsSnap.size >= SOURCE_CAP || profilesSnap.size >= SOURCE_CAP;

  for (const snap of visitsSnap.docs) {
    if (!isValidFirebaseAuthUid(snap.id)) continue;
    people.set(snap.id, { uid: snap.id, visit: readVisit(snap) });
  }
  for (const snap of profilesSnap.docs) {
    if (!isValidFirebaseAuthUid(snap.id)) continue;
    const profile = readProfile(snap);
    if (!profile) continue;
    const current = people.get(snap.id) || { uid: snap.id };
    current.profile = profile;
    people.set(snap.id, current);
  }

  const connectionCounts = new Map<string, number>();
  const pendingIn = new Map<string, number>();
  const pendingOut = new Map<string, number>();
  let connections = 0;
  let connectionsWeek = 0;

  const connectionDocs = connectionsSnap.docs
    .map((snap) => ({ snap, data: snap.data() }))
    .filter((row) => row.data.status === 'active' || row.data.status == null);

  for (const row of connectionDocs) {
    const users = Array.isArray(row.data.users) ? row.data.users.filter((uid) => typeof uid === 'string') : [];
    if (users.length < 2) continue;
    connections += 1;
    if (millis(row.data.connectedAt) >= weekStart) connectionsWeek += 1;
    for (const uid of users) connectionCounts.set(uid, (connectionCounts.get(uid) || 0) + 1);
  }

  for (const snap of requestsSnap.docs) {
    const data = snap.data();
    const fromUid = text(data.fromUid, 128);
    const toUid = text(data.toUid, 128);
    if (fromUid) pendingOut.set(fromUid, (pendingOut.get(fromUid) || 0) + 1);
    if (toUid) pendingIn.set(toUid, (pendingIn.get(toUid) || 0) + 1);
  }

  const ranked = [...people.values()].sort((a, b) => {
    const aMs = Math.max(a.visit?.lastSeenMs || 0, a.profile?.updatedAtMs || 0, a.profile?.createdAtMs || 0);
    const bMs = Math.max(b.visit?.lastSeenMs || 0, b.profile?.updatedAtMs || 0, b.profile?.createdAtMs || 0);
    return bMs - aMs || a.uid.localeCompare(b.uid);
  });

  const statsBase: MatchMonitorStats = {
    entered: ranked.length,
    enteredToday: 0,
    profiles: 0,
    onboardingDone: 0,
    discoverable: 0,
    paused: 0,
    connections,
    connectionsWeek,
    peopleConnected: 0,
    pending: requestsSnap.size,
    withoutPhone: 0,
  };
  const cityCounts = new Map<string, number>();

  for (const person of ranked) {
    const stage = matchMonitorStage(
      person.profile
        ? {
            status: person.profile.draft.status,
            onboardingCompleted: person.profile.draft.onboardingCompleted,
            discoverable: person.profile.draft.discoverable,
          }
        : null,
    );
    const seen = Math.max(person.visit?.lastSeenMs || 0, person.profile?.createdAtMs || 0);
    if (seen >= dayStart) statsBase.enteredToday += 1;
    if (person.profile) statsBase.profiles += 1;
    if (person.profile?.draft.onboardingCompleted) statsBase.onboardingDone += 1;
    if (stage === 'active') statsBase.discoverable += 1;
    if (stage === 'paused') statsBase.paused += 1;
    if ((connectionCounts.get(person.uid) || 0) > 0) statsBase.peopleConnected += 1;
    const city = person.profile?.draft.identity.city?.trim();
    if (city) cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  }

  const listed = ranked.slice(0, PEOPLE_CAP);
  const phones = await mapPool(listed, PHONE_CONCURRENCY, async (person) => {
    try {
      return await resolveMatchPhone(db, person.uid);
    } catch {
      return null;
    }
  });

  const peopleRows: MatchMonitorPerson[] = listed.map((person, index) => {
    const phone = phones[index];
    const stage = matchMonitorStage(
      person.profile
        ? {
            status: person.profile.draft.status,
            onboardingCompleted: person.profile.draft.onboardingCompleted,
            discoverable: person.profile.draft.discoverable,
          }
        : null,
    );
    if (!phone) statsBase.withoutPhone += 1;
    return {
      uid: person.uid,
      displayName: nameFrom(person),
      city: person.profile?.draft.identity.city?.trim() || null,
      stage,
      onboardingCompleted: person.profile?.draft.onboardingCompleted === true,
      onboardingStep: person.profile?.draft.onboardingStep || 0,
      discoverable: stage === 'active',
      firstSeenAt: iso(person.visit?.firstSeenMs || person.profile?.createdAtMs || 0),
      lastSeenAt: iso(person.visit?.lastSeenMs || person.profile?.updatedAtMs || 0),
      visitCount: person.visit?.visitCount || 0,
      connections: connectionCounts.get(person.uid) || 0,
      pendingIn: pendingIn.get(person.uid) || 0,
      pendingOut: pendingOut.get(person.uid) || 0,
      hasPhone: Boolean(phone),
      phoneTail: phone ? maskMatchPhoneTail(phone.phone) : null,
      phoneSource: phone?.source || null,
    };
  });

  const byUid = new Map(ranked.map((person) => [person.uid, person]));
  const template = settings.template;

  const connectionsRows: MatchMonitorConnection[] = connectionDocs
    .map((row) => {
      const users = (Array.isArray(row.data.users) ? row.data.users : []).filter(
        (uid): uid is string => typeof uid === 'string',
      );
      const [leftUid, rightUid] = [...users].sort();
      if (!leftUid || !rightUid) return null;
      const left = byUid.get(leftUid);
      const right = byUid.get(rightUid);
      const labels =
        left?.profile && right?.profile ? sharedMatchLabels(left.profile.draft, right.profile.draft) : [];
      const leftName = nameFrom(left, 'Alguém');
      const rightName = nameFrom(right, 'Alguém');
      const stored = row.data.canalChatByUid && typeof row.data.canalChatByUid === 'object'
        ? (row.data.canalChatByUid as Record<string, unknown>)
        : {};
      const deliveryFor = (uid: string): MatchMonitorDelivery => {
        const raw = stored[uid] && typeof stored[uid] === 'object' ? (stored[uid] as Record<string, unknown>) : null;
        return {
          uid,
          status: deliveryStatus(raw?.status),
          at: iso(millis(raw?.atMs)),
          sentMessage: typeof raw?.message === 'string' ? raw.message : null,
        };
      };
      return {
        pairKey: row.snap.id,
        connectedAt: iso(millis(row.data.connectedAt)),
        left: { uid: leftUid, name: leftName },
        right: { uid: rightUid, name: rightName },
        messageForLeft: renderMatchCanalChatTemplate(template, rightName, labels),
        messageForRight: renderMatchCanalChatTemplate(template, leftName, labels),
        delivery: [deliveryFor(leftUid), deliveryFor(rightUid)],
      };
    })
    .filter((row): row is MatchMonitorConnection => Boolean(row))
    .sort((a, b) => {
      if (a.connectedAt === b.connectedAt) return 0;
      if (!a.connectedAt) return 1;
      if (!b.connectedAt) return -1;
      return b.connectedAt.localeCompare(a.connectedAt);
    });

  const requests: MatchMonitorRequest[] = requestsSnap.docs.map((snap) => {
    const data = snap.data();
    const fromUid = text(data.fromUid, 128);
    const toUid = text(data.toUid, 128);
    return {
      id: snap.id,
      fromUid,
      fromName: nameFrom(byUid.get(fromUid), 'Alguém'),
      toUid,
      toName: nameFrom(byUid.get(toUid), 'Alguém'),
      createdAt: iso(millis(data.createdAt)),
    };
  });

  const recentSends: MatchMonitorSend[] = logsSnap.docs.map((snap) => {
    const data = snap.data();
    const status = deliveryStatus(data.status);
    return {
      id: snap.id,
      kind: data.kind === 'broadcast' ? 'broadcast' : 'connection',
      uid: text(data.uid, 128),
      name: text(data.recipientName, 80) || 'Sem nome',
      status: status === 'untracked' ? 'failed' : status,
      message: text(data.message, 800),
      at: iso(millis(data.createdAt)),
      error: typeof data.error === 'string' ? data.error : null,
    };
  });

  const broadcasts: MatchMonitorBroadcast[] = broadcastsSnap.docs.map((snap) => {
    const data = snap.data();
    return {
      id: snap.id,
      message: text(data.message, 800),
      createdAt: iso(millis(data.createdAt)),
      sent: Number(data.sent) || 0,
      failed: Number(data.failed) || 0,
      noPhone: Number(data.noPhone) || 0,
      total: Number(data.total) || 0,
    };
  });

  const cities = [...cityCounts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'pt-BR'))
    .slice(0, 6);

  return {
    canalChatConnected: Boolean(sender),
    template,
    defaultTemplate: DEFAULT_MATCH_CANAL_CHAT_TEMPLATE,
    broadcastDraft: settings.broadcastDraft,
    partial,
    totalPeople: ranked.length,
    stats: statsBase,
    cities,
    people: peopleRows,
    connections: connectionsRows,
    requests,
    recentSends,
    broadcasts,
  };
}
