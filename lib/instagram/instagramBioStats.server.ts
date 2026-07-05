import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildInstagramBioInsights } from '@/lib/instagram/buildInstagramBioInsights';
import {
  EMPTY_BY_PROFILE,
  INSTAGRAM_BIO_STATS_COLLECTION,
} from '@/lib/instagram/instagramBioStatsConstants';
import type {
  InstagramBioStatsApiResponse,
  InstagramBioStatsDailyEntry,
  InstagramBioStatsDoc,
  InstagramBioStatsProfileKey,
} from '@/types/instagramBioStats';

export type InstagramBioAnalyticsEventInput = {
  medicoId: string;
  type: 'view' | 'click' | 'whatsapp';
  profile?: InstagramBioStatsProfileKey;
};

const PROFILE_KEYS = new Set<InstagramBioStatsProfileKey>([
  'emagrecer',
  'nutricionista',
  'personal',
  'fundador',
  'medico',
]);

function todayKeyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function lastNDaysKeys(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function formatDayLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
}

function parseDaily(raw: unknown): Record<string, InstagramBioStatsDailyEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, InstagramBioStatsDailyEntry> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const v = value as Record<string, unknown>;
    out[key] = {
      views: typeof v.views === 'number' ? v.views : 0,
      clicks: typeof v.clicks === 'number' ? v.clicks : 0,
      whatsapp: typeof v.whatsapp === 'number' ? v.whatsapp : 0,
    };
  }
  return out;
}

function parseByProfile(raw: unknown): InstagramBioStatsDoc['byProfile'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_BY_PROFILE };
  }
  const o = raw as Record<string, unknown>;
  return {
    emagrecer: typeof o.emagrecer === 'number' ? o.emagrecer : 0,
    nutricionista: typeof o.nutricionista === 'number' ? o.nutricionista : 0,
    personal: typeof o.personal === 'number' ? o.personal : 0,
    fundador: typeof o.fundador === 'number' ? o.fundador : 0,
    medico: typeof o.medico === 'number' ? o.medico : 0,
  };
}

function parseStatsDoc(raw: Record<string, unknown> | undefined): InstagramBioStatsDoc {
  if (!raw) {
    return {
      views: 0,
      clicks: 0,
      whatsappClicks: 0,
      byProfile: { ...EMPTY_BY_PROFILE },
      daily: {},
    };
  }
  return {
    views: typeof raw.views === 'number' ? raw.views : 0,
    clicks: typeof raw.clicks === 'number' ? raw.clicks : 0,
    whatsappClicks: typeof raw.whatsappClicks === 'number' ? raw.whatsappClicks : 0,
    byProfile: parseByProfile(raw.byProfile),
    daily: parseDaily(raw.daily),
    updatedAt: raw.updatedAt,
  };
}

function trimDailyMap(daily: Record<string, InstagramBioStatsDailyEntry>): Record<string, InstagramBioStatsDailyEntry> {
  const allowed = new Set(lastNDaysKeys(7));
  const trimmed: Record<string, InstagramBioStatsDailyEntry> = {};
  for (const key of allowed) {
    if (daily[key]) trimmed[key] = { ...daily[key] };
  }
  return trimmed;
}

function conversionRate(whatsapp: number, views: number): number {
  if (views <= 0) return 0;
  return Math.round((whatsapp / views) * 1000) / 10;
}

function sumLast7Days(daily: Record<string, InstagramBioStatsDailyEntry>) {
  const keys = lastNDaysKeys(7);
  return keys.reduce(
    (acc, key) => {
      const entry = daily[key];
      if (!entry) return acc;
      return {
        views: acc.views + entry.views,
        clicks: acc.clicks + entry.clicks,
        whatsappClicks: acc.whatsappClicks + entry.whatsapp,
      };
    },
    { views: 0, clicks: 0, whatsappClicks: 0 },
  );
}

export async function recordInstagramBioAnalyticsEvent(
  input: InstagramBioAnalyticsEventInput,
): Promise<void> {
  const medicoId = input.medicoId.trim();
  if (!medicoId) return;

  const profile =
    input.profile && PROFILE_KEYS.has(input.profile) ? input.profile : undefined;
  const dayKey = todayKeyUtc();

  const db = getFirestoreAdmin();
  const ref = db.collection(INSTAGRAM_BIO_STATS_COLLECTION).doc(medicoId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = parseStatsDoc(
      snap.exists ? (snap.data() as Record<string, unknown>) : undefined,
    );

    const daily = trimDailyMap(current.daily);
    const dayEntry = daily[dayKey] ?? { views: 0, clicks: 0, whatsapp: 0 };
    const byProfile = { ...current.byProfile };

    let views = current.views;
    let clicks = current.clicks;
    let whatsappClicks = current.whatsappClicks;

    if (input.type === 'view') {
      views += 1;
      dayEntry.views += 1;
    } else if (input.type === 'click') {
      clicks += 1;
      dayEntry.clicks += 1;
      if (profile) byProfile[profile] += 1;
    } else if (input.type === 'whatsapp') {
      whatsappClicks += 1;
      dayEntry.whatsapp += 1;
    }

    daily[dayKey] = dayEntry;

    const payload = {
      views,
      clicks,
      whatsappClicks,
      byProfile,
      daily,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (snap.exists) {
      tx.update(ref, payload);
    } else {
      tx.set(ref, payload);
    }
  });
}

export async function getInstagramBioStatsForMedico(
  medicoId: string,
  medicoEmail?: string,
): Promise<InstagramBioStatsApiResponse> {
  const db = getFirestoreAdmin();
  const snap = await db.collection(INSTAGRAM_BIO_STATS_COLLECTION).doc(medicoId).get();
  const doc = parseStatsDoc(snap.exists ? (snap.data() as Record<string, unknown>) : undefined);

  const last7 = sumLast7Days(doc.daily);
  const chartKeys = lastNDaysKeys(7);
  const chart = chartKeys.map((date) => {
    const entry = doc.daily[date] ?? { views: 0, clicks: 0, whatsapp: 0 };
    return {
      date,
      label: formatDayLabel(date),
      views: entry.views,
      clicks: entry.clicks,
      whatsapp: entry.whatsapp,
    };
  });

  const insights = buildInstagramBioInsights({
    last7Days: last7,
    byProfile: doc.byProfile,
    medicoEmail,
  });

  return {
    totals: {
      views: doc.views,
      clicks: doc.clicks,
      whatsappClicks: doc.whatsappClicks,
      conversionRate: conversionRate(doc.whatsappClicks, doc.views),
    },
    last7Days: {
      views: last7.views,
      clicks: last7.clicks,
      whatsappClicks: last7.whatsappClicks,
      conversionRate: conversionRate(last7.whatsappClicks, last7.views),
    },
    byProfile: doc.byProfile,
    chart,
    insights,
  };
}

export async function isInstagramBioAnalyticsAllowed(medicoId: string): Promise<boolean> {
  const db = getFirestoreAdmin();
  const snap = await db.collection('medicos').doc(medicoId).get();
  if (!snap.exists) return false;
  const bio = snap.data()?.instagramBio;
  return bio?.enabled !== false;
}
