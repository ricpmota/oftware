import { ACHIEVEMENT_IDS, achievementById, listedIds } from '@/lib/match/matchAchievements';
import {
  INTERESTS_WITH_PROFILE_ICON,
  MATCH_PROFILE_ICONS,
  isMatchProfileIconId,
  type MatchProfileIconId,
} from '@/components/meta/match/icons/matchProfileIcons';
import {
  ACTIVITY_IDS,
  ACTIVITY_LEVEL_IDS,
  CONNECTION_GOAL_IDS,
  DAY_IDS,
  INTEREST_IDS,
  JOURNEY_PRESET_IDS,
  LOCATION_MODE_IDS,
  MATCH_JOURNEY_PRESETS,
  MATCH_RADIUS_OPTIONS,
  PERIOD_IDS,
  PLANNING_STYLE_IDS,
  SHOW_ME_IDS,
  activityById,
  connectionGoalById,
  interestById,
} from '@/lib/match/matchTaxonomy';

export const MATCH_PROFILE_VERSION = 1;
export const MATCH_BIO_MAX = 160;
export const MATCH_NAME_MAX = 40;
export const MATCH_PHOTO_MAX = 6;
export const MATCH_ONBOARDING_STEP_COUNT = 16;
export const MATCH_ACHIEVEMENT_STEP = 13;
export const MATCH_GOAL_STEP = 14;
export const MATCH_PHOTO_MEDAL_MAX = 4;
export const MATCH_ACHIEVEMENT_MAX = 24;

export type MatchProfileStatus = 'draft' | 'active' | 'paused';
export type MatchAgeVisibility = 'show' | 'hide';
export type MatchPlanningStyle = 'planned' | 'spontaneous' | 'either';
export type MatchActivityLevel = 'starting' | 'moving' | 'active';
export type MatchLocationMode = 'my_city' | 'nearby' | 'anywhere';

export type MatchPhoto = {
  id: string;
  url: string;
  storagePath: string;
  order: number;
  isPrimary: boolean;
};

export type MatchJourneyHighlight = {
  id: string;
  type: string;
  label: string;
  visibility: 'public';
  createdAt: string;
};

export type MatchSharing = {
  showAge: boolean;
  showCity: boolean;
  showDistance: boolean;
  showInterests: boolean;
  showAvailability: boolean;
  showJourney: boolean;
  showPhone: boolean;
};

export type MatchContact = {
  phone?: string;
  instagram?: string;
  tiktok?: string;
};

export type MatchMaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'undisclosed';
export type MatchVisibility = 'public' | 'private';
export type MatchVerificationStatus = 'self_declared' | 'verified';
export type MatchGoalStatus = 'active' | 'completed' | 'paused';
export type MatchCardAudience = 'owner' | 'public';

export type MatchAchievementRecord = {
  id: string;
  achievementId: string;
  category: string;
  achievedAt?: string;
  verification: {
    status: MatchVerificationStatus;
    source?: string;
  };
  visibility: MatchVisibility;
  createdAt: string;
};

export type MatchGoalRecord = {
  id: string;
  goalId: string;
  category: string;
  targetDate?: string;
  status: MatchGoalStatus;
  visibility: MatchVisibility;
  createdAt: string;
  completedAt?: string;
};

export type MatchAchievementView = {
  recordId: string;
  achievementId: string;
  category: string;
  label: string;
  title: string;
  story: string;
  achievedAt?: string;
  verified: boolean;
  source?: string;
  visibility: MatchVisibility;
};

export type MatchGoalView = {
  recordId: string;
  goalId: string;
  category: string;
  label: string;
  title: string;
  goalLine: string;
  status: MatchGoalStatus;
  visibility: MatchVisibility;
  targetDate?: string;
};

export type MatchProfileDraft = {
  version: 1;
  status: MatchProfileStatus;
  onboardingCompleted: boolean;
  onboardingStep: number;
  /** false pausa o Discovery sem apagar perfil, conexões ou mensagens. */
  discoverable?: boolean;
  identity: {
    displayName: string;
    birthDate?: string;
    ageVisibility: MatchAgeVisibility;
    city?: string;
    state?: string;
    bio?: string;
    maritalStatus?: MatchMaritalStatus;
  };
  photos: MatchPhoto[];
  interests: string[];
  activities: string[];
  connectionGoals: string[];
  availability: {
    periods: string[];
    days: string[];
    planningStyle?: MatchPlanningStyle;
  };
  lifestyle: {
    activityLevel?: MatchActivityLevel;
  };
  discoveryPreferences: {
    locationMode?: MatchLocationMode;
    radiusKm?: number;
    ageMin?: number;
    ageMax?: number;
    showMe: string[];
    connectionGoals: string[];
    preferSharedActivities: boolean;
  };
  sharing: MatchSharing;
  contact: MatchContact;
  journeyHighlights: MatchJourneyHighlight[];
  achievements: MatchAchievementRecord[];
  goals: MatchGoalRecord[];
};

export type MatchViewerCard = {
  displayName: string;
  bio?: string;
  maritalStatus?: MatchMaritalStatus;
  age?: number;
  cityLine?: string;
  photos: MatchPhoto[];
  primaryPhoto?: MatchPhoto;
  interests: string[];
  activities: string[];
  connectionGoals: string[];
  availabilityLine?: string;
  highlights: string[];
  connectionPreview: string[];
  whatsappUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  socialIcons: MatchProfileIconId[];
  photoMedals: MatchAchievementView[];
  photoMedalExtra: number;
  achievements: MatchAchievementView[];
  goals: MatchGoalView[];
};

const BIRTH_DATE = /^\d{4}-\d{2}-\d{2}$/;
const GOAL_STATUSES = new Set<MatchGoalStatus>(['active', 'completed', 'paused']);
const MARITAL_IDS = new Set<MatchMaritalStatus>(['single', 'married', 'divorced', 'widowed', 'undisclosed']);

export function createEmptyMatchDraft(): MatchProfileDraft {
  return {
    version: 1,
    status: 'draft',
    onboardingCompleted: false,
    onboardingStep: 0,
    identity: {
      displayName: '',
      ageVisibility: 'show',
    },
    photos: [],
    interests: [],
    activities: [],
    connectionGoals: [],
    availability: {
      periods: [],
      days: [],
    },
    lifestyle: {},
    discoveryPreferences: {
      showMe: [],
      connectionGoals: [],
      preferSharedActivities: true,
    },
    sharing: {
      showAge: true,
      showCity: true,
      showDistance: false,
      showInterests: true,
      showAvailability: true,
      showJourney: false,
      showPhone: false,
    },
    contact: {},
    journeyHighlights: [],
    achievements: [],
    goals: [],
  };
}

export function firstDisplayName(fullName: string | null | undefined): string {
  const token = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];
  if (!token || token.length < 2) return '';
  return token.slice(0, MATCH_NAME_MAX);
}

export function ageFromBirthDate(birthDate: string | undefined, today = new Date()): number | null {
  if (!birthDate || !BIRTH_DATE.test(birthDate)) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  let age = today.getFullYear() - year;
  const monthDelta = today.getMonth() + 1 - month;
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day)) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function isOwnMatchPhotoPath(uid: string, storagePath: string): boolean {
  if (!uid || storagePath.includes('..') || storagePath.includes('\\')) return false;
  return storagePath.startsWith(`match-profiles/${uid}/photos/`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, max: number): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function idList(value: unknown, allowed: Set<string>, max = 40): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    const id = String(item || '').trim();
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    if (seen.size >= max) break;
  }
  return [...seen];
}

function clampInt(value: unknown, min: number, max: number): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return undefined;
  return rounded;
}

function sanitizePhotos(value: unknown, uid?: string): MatchPhoto[] {
  if (!Array.isArray(value)) return [];
  const photos: MatchPhoto[] = [];
  for (const item of value) {
    const photo = asRecord(item);
    const id = asString(photo.id, 80);
    const url = asString(photo.url, 2000);
    const storagePath = asString(photo.storagePath, 300);
    if (!id || !url.startsWith('https://') || !storagePath) continue;
    if (uid && !isOwnMatchPhotoPath(uid, storagePath)) continue;
    if (!uid && !storagePath.startsWith('match-profiles/')) continue;
    photos.push({
      id,
      url,
      storagePath,
      order: clampInt(photo.order, 0, 20) ?? photos.length,
      isPrimary: photo.isPrimary === true,
    });
    if (photos.length >= MATCH_PHOTO_MAX) break;
  }
  photos.sort((a, b) => a.order - b.order);
  const primaryIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.isPrimary)
  );
  return photos.map((photo, index) => ({
    ...photo,
    order: index,
    isPrimary: photos.length > 0 && index === primaryIndex,
  }));
}

function sanitizeHighlights(value: unknown): MatchJourneyHighlight[] {
  if (!Array.isArray(value)) return [];
  const highlights: MatchJourneyHighlight[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const raw = asRecord(item);
    const id = asString(raw.id, 80);
    const preset = MATCH_JOURNEY_PRESETS.find((entry) => entry.id === id);
    if (!preset || seen.has(preset.id) || !JOURNEY_PRESET_IDS.has(preset.id)) continue;
    seen.add(preset.id);
    const createdAt = asString(raw.createdAt, 40);
    highlights.push({
      id: preset.id,
      type: preset.type,
      label: preset.label,
      visibility: 'public',
      createdAt: createdAt || new Date(0).toISOString(),
    });
  }
  return highlights;
}

function phoneDigits(value: unknown): string | undefined {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 15);
  if (digits.length < 10) return undefined;
  return digits;
}

function socialHandle(value: unknown): string | undefined {
  let handle = asString(value, 80);
  handle = handle.replace(/^https?:\/\/(www\.)?/i, '');
  handle = handle.replace(/^(instagram\.com|tiktok\.com)\//i, '');
  handle = handle.replace(/^@+/, '').split(/[/?#\s]/)[0] || '';
  handle = handle.replace(/[^A-Za-z0-9._]/g, '');
  if (handle.length < 1 || handle.length > 30) return undefined;
  return handle;
}

function asDay(value: unknown): string | undefined {
  const day = asString(value, 10);
  if (!BIRTH_DATE.test(day)) return undefined;
  const [year, month, date] = day.split('-').map(Number);
  const parsed = new Date(year, month - 1, date);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== date) {
    return undefined;
  }
  if (year < 1950 || year > 2100) return undefined;
  return day;
}

function newRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeAchievements(value: unknown): MatchAchievementRecord[] {
  if (!Array.isArray(value)) return [];
  const records: MatchAchievementRecord[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const raw = asRecord(item);
    const achievementId = asString(raw.achievementId, 40);
    const definition = achievementById(achievementId);
    if (!definition || seen.has(definition.id) || !ACHIEVEMENT_IDS.has(definition.id)) continue;
    seen.add(definition.id);
    const verification = asRecord(raw.verification);
    const status: MatchVerificationStatus = verification.status === 'verified' ? 'verified' : 'self_declared';
    const source = status === 'verified' ? asString(verification.source, 40) : '';
    const achievedAt = asDay(raw.achievedAt);
    const createdAt = asString(raw.createdAt, 40);
    records.push({
      id: asString(raw.id, 80) || definition.id,
      achievementId: definition.id,
      category: definition.category,
      ...(achievedAt ? { achievedAt } : {}),
      verification: {
        status,
        ...(source ? { source } : {}),
      },
      visibility: raw.visibility === 'private' ? 'private' : 'public',
      createdAt: createdAt || new Date(0).toISOString(),
    });
    if (records.length >= MATCH_ACHIEVEMENT_MAX) break;
  }
  return records;
}

function sanitizeGoals(value: unknown): MatchGoalRecord[] {
  if (!Array.isArray(value)) return [];
  const records: MatchGoalRecord[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const raw = asRecord(item);
    const goalId = asString(raw.goalId, 40);
    const definition = achievementById(goalId);
    if (!definition || seen.has(definition.id) || !ACHIEVEMENT_IDS.has(definition.id)) continue;
    seen.add(definition.id);
    const statusText = asString(raw.status, 20);
    const status: MatchGoalStatus = GOAL_STATUSES.has(statusText as MatchGoalStatus)
      ? (statusText as MatchGoalStatus)
      : 'active';
    const targetDate = asDay(raw.targetDate);
    const completedAt = status === 'completed' ? asDay(raw.completedAt) : undefined;
    const createdAt = asString(raw.createdAt, 40);
    records.push({
      id: asString(raw.id, 80) || definition.id,
      goalId: definition.id,
      category: definition.category,
      ...(targetDate ? { targetDate } : {}),
      status,
      visibility: raw.visibility === 'private' ? 'private' : 'public',
      createdAt: createdAt || new Date(0).toISOString(),
      ...(completedAt ? { completedAt } : {}),
    });
    if (records.length >= MATCH_ACHIEVEMENT_MAX) break;
  }
  return records;
}

function toAchievementView(record: MatchAchievementRecord): MatchAchievementView | null {
  const definition = achievementById(record.achievementId);
  if (!definition) return null;
  return {
    recordId: record.id,
    achievementId: record.achievementId,
    category: definition.category,
    label: definition.label,
    title: definition.title,
    story: definition.story,
    ...(record.achievedAt ? { achievedAt: record.achievedAt } : {}),
    verified: record.verification.status === 'verified',
    ...(record.verification.source ? { source: record.verification.source } : {}),
    visibility: record.visibility,
  };
}

function toGoalView(record: MatchGoalRecord): MatchGoalView | null {
  const definition = achievementById(record.goalId);
  if (!definition) return null;
  return {
    recordId: record.id,
    goalId: record.goalId,
    category: definition.category,
    label: definition.label,
    title: definition.title,
    goalLine: definition.goalLine,
    status: record.status,
    visibility: record.visibility,
    ...(record.targetDate ? { targetDate: record.targetDate } : {}),
  };
}

export function publicAchievementIds(records: MatchAchievementRecord[]): string[] {
  return listedIds(records, 'achievementId', 'public');
}

export function publicGoalIds(records: MatchGoalRecord[]): string[] {
  return listedIds(records, 'goalId', 'public');
}

export function toggleAchievement(records: MatchAchievementRecord[], achievementId: string): MatchAchievementRecord[] {
  const definition = achievementById(achievementId);
  if (!definition) return records;
  if (records.some((record) => record.achievementId === achievementId)) {
    return records.filter((record) => record.achievementId !== achievementId);
  }
  return [
    ...records,
    {
      id: newRecordId(),
      achievementId: definition.id,
      category: definition.category,
      verification: { status: 'self_declared' },
      visibility: 'public',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function patchAchievement(
  records: MatchAchievementRecord[],
  achievementId: string,
  patch: { achievedAt?: string; visibility?: MatchVisibility }
): MatchAchievementRecord[] {
  return records.map((record) => {
    if (record.achievementId !== achievementId) return record;
    const next = { ...record, verification: { ...record.verification } };
    if ('achievedAt' in patch) {
      if (patch.achievedAt) next.achievedAt = patch.achievedAt;
      else delete next.achievedAt;
    }
    if (patch.visibility) next.visibility = patch.visibility;
    return next;
  });
}

export function toggleGoal(records: MatchGoalRecord[], goalId: string): MatchGoalRecord[] {
  const definition = achievementById(goalId);
  if (!definition) return records;
  if (records.some((record) => record.goalId === goalId)) {
    return records.filter((record) => record.goalId !== goalId);
  }
  return [
    ...records,
    {
      id: newRecordId(),
      goalId: definition.id,
      category: definition.category,
      status: 'active',
      visibility: 'public',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function patchGoal(
  records: MatchGoalRecord[],
  goalId: string,
  patch: { targetDate?: string; visibility?: MatchVisibility; status?: MatchGoalStatus }
): MatchGoalRecord[] {
  return records.map((record) => {
    if (record.goalId !== goalId) return record;
    const next = { ...record };
    if ('targetDate' in patch) {
      if (patch.targetDate) next.targetDate = patch.targetDate;
      else delete next.targetDate;
    }
    if (patch.visibility) next.visibility = patch.visibility;
    if (patch.status) {
      next.status = patch.status;
      if (patch.status === 'completed') {
        next.completedAt = next.completedAt || new Date().toISOString().slice(0, 10);
      } else {
        delete next.completedAt;
      }
    }
    return next;
  });
}

export function sanitizeMatchProfile(raw: unknown, uid?: string): MatchProfileDraft {
  const data = asRecord(raw);
  const identity = asRecord(data.identity);
  const availability = asRecord(data.availability);
  const lifestyle = asRecord(data.lifestyle);
  const discovery = asRecord(data.discoveryPreferences);
  const sharingRaw = asRecord(data.sharing);

  const sharing: MatchSharing = {
    showAge: sharingRaw.showAge !== false,
    showCity: sharingRaw.showCity !== false,
    showDistance: sharingRaw.showDistance === true,
    showInterests: sharingRaw.showInterests !== false,
    showAvailability: sharingRaw.showAvailability !== false,
    showJourney: sharingRaw.showJourney === true,
    showPhone: sharingRaw.showPhone === true,
  };

  const contactRaw = asRecord(data.contact);
  const phone = sharing.showPhone ? phoneDigits(contactRaw.phone) : undefined;
  const instagram = socialHandle(contactRaw.instagram);
  const tiktok = socialHandle(contactRaw.tiktok);
  const contact: MatchContact = {
    ...(phone ? { phone } : {}),
    ...(instagram ? { instagram } : {}),
    ...(tiktok ? { tiktok } : {}),
  };

  const maritalStatus = asString(identity.maritalStatus, 20);
  const birthDate = asString(identity.birthDate, 10);
  const city = asString(identity.city, 80);
  const state = asString(identity.state, 40);
  const bio = asString(identity.bio, MATCH_BIO_MAX);
  const planning = asString(availability.planningStyle, 20);
  const activityLevel = asString(lifestyle.activityLevel, 20);
  const locationMode = asString(discovery.locationMode, 20);
  const radius = clampInt(discovery.radiusKm, 1, 500);
  let ageMin = clampInt(discovery.ageMin, 18, 70);
  let ageMax = clampInt(discovery.ageMax, 18, 70);
  if (ageMin != null && ageMax != null && ageMin > ageMax) {
    const swap = ageMin;
    ageMin = ageMax;
    ageMax = swap;
  }

  const status = data.status === 'active' || data.status === 'paused' ? data.status : 'draft';
  const step = clampInt(data.onboardingStep, 0, MATCH_ONBOARDING_STEP_COUNT - 1) ?? 0;

  return {
    version: 1,
    status,
    onboardingCompleted: data.onboardingCompleted === true,
    onboardingStep: step,
    ...(data.discoverable === true || data.discoverable === false ? { discoverable: data.discoverable === true } : {}),
    identity: {
      displayName: asString(identity.displayName, MATCH_NAME_MAX),
      ...(birthDate && BIRTH_DATE.test(birthDate) ? { birthDate } : {}),
      ageVisibility: sharing.showAge ? 'show' : 'hide',
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(bio ? { bio } : {}),
      ...(MARITAL_IDS.has(maritalStatus as MatchMaritalStatus)
        ? { maritalStatus: maritalStatus as MatchMaritalStatus }
        : {}),
    },
    photos: sanitizePhotos(data.photos, uid),
    interests: idList(data.interests, INTEREST_IDS),
    activities: idList(data.activities, ACTIVITY_IDS),
    connectionGoals: idList(data.connectionGoals, CONNECTION_GOAL_IDS),
    availability: {
      periods: idList(availability.periods, PERIOD_IDS, 3),
      days: idList(availability.days, DAY_IDS, 7),
      ...(PLANNING_STYLE_IDS.has(planning) ? { planningStyle: planning as MatchPlanningStyle } : {}),
    },
    lifestyle: {
      ...(ACTIVITY_LEVEL_IDS.has(activityLevel)
        ? { activityLevel: activityLevel as MatchActivityLevel }
        : {}),
    },
    discoveryPreferences: {
      ...(LOCATION_MODE_IDS.has(locationMode)
        ? { locationMode: locationMode as MatchLocationMode }
        : {}),
      ...(radius != null && (MATCH_RADIUS_OPTIONS as readonly number[]).includes(radius)
        ? { radiusKm: radius }
        : {}),
      ...(ageMin != null ? { ageMin } : {}),
      ...(ageMax != null ? { ageMax } : {}),
      showMe: idList(discovery.showMe, SHOW_ME_IDS, 3),
      connectionGoals: idList(discovery.connectionGoals, CONNECTION_GOAL_IDS),
      preferSharedActivities: discovery.preferSharedActivities !== false,
    },
    sharing,
    contact,
    journeyHighlights: sanitizeHighlights(data.journeyHighlights),
    achievements: sanitizeAchievements(data.achievements),
    goals: sanitizeGoals(data.goals),
  };
}

function dayLabel(id: string): string {
  const labels: Record<string, string> = {
    mon: 'Seg',
    tue: 'Ter',
    wed: 'Qua',
    thu: 'Qui',
    fri: 'Sex',
    sat: 'Sáb',
    sun: 'Dom',
  };
  return labels[id] || id;
}

function periodLabel(id: string): string {
  const labels: Record<string, string> = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    night: 'Noite',
  };
  return labels[id] || id;
}

const SOCIAL_ICON_ORDER = Object.keys(MATCH_PROFILE_ICONS);
const INTEREST_ICON_IDS = new Set<string>(INTERESTS_WITH_PROFILE_ICON);

function socialIconGroup(id: MatchProfileIconId): number {
  if (id === 'married' || id === 'single') return 0;
  const categories = interestById(id)?.categories ?? [];
  if (categories.includes('movement') || categories.includes('outdoors')) return 1;
  if (categories.includes('lifestyle')) return 2;
  if (categories.includes('experiences')) return 3;
  const iconCategory = MATCH_PROFILE_ICONS[id].category;
  if (iconCategory === 'activity') return 1;
  if (iconCategory === 'lifestyle') return 2;
  if (iconCategory === 'experience') return 3;
  if (iconCategory === 'social') return 4;
  return 5;
}

/** Ícones da sprite derivados do estado civil e dos interesses. Não usa conquistas. */
export function getProfileSocialIcons(draft: MatchProfileDraft): MatchProfileIconId[] {
  const ids: MatchProfileIconId[] = [];
  const marital = draft.identity.maritalStatus;
  if (marital === 'married' || marital === 'single') ids.push(marital);
  if (draft.sharing.showInterests) {
    for (const interest of draft.interests) {
      if (INTEREST_ICON_IDS.has(interest) && isMatchProfileIconId(interest) && !ids.includes(interest)) {
        ids.push(interest);
      }
    }
  }
  return ids.sort((a, b) => {
    const groupDelta = socialIconGroup(a) - socialIconGroup(b);
    if (groupDelta !== 0) return groupDelta;
    return SOCIAL_ICON_ORDER.indexOf(a) - SOCIAL_ICON_ORDER.indexOf(b);
  });
}

export function buildMatchViewerCard(
  draft: MatchProfileDraft,
  today = new Date(),
  audience: MatchCardAudience = 'public'
): MatchViewerCard {
  const photos = [...draft.photos].sort((a, b) => a.order - b.order);
  const primaryPhoto = photos.find((photo) => photo.isPrimary) || photos[0];
  const age = draft.sharing.showAge ? ageFromBirthDate(draft.identity.birthDate, today) : null;
  const cityParts = [draft.identity.city, draft.identity.state].filter(Boolean);
  const interests = draft.sharing.showInterests
    ? draft.interests.map((id) => interestById(id)?.label).filter((label): label is string => !!label)
    : [];
  const activities = draft.activities
    .map((id) => activityById(id)?.label)
    .filter((label): label is string => !!label);
  const connectionGoals = draft.connectionGoals
    .map((id) => connectionGoalById(id)?.label)
    .filter((label): label is string => !!label);

  let availabilityLine: string | undefined;
  if (draft.sharing.showAvailability) {
    const days = draft.availability.days.map(dayLabel);
    const periods = draft.availability.periods.map(periodLabel);
    const parts = [days.join(', '), periods.join(', ')].filter(Boolean);
    if (parts.length) availabilityLine = parts.join(' · ');
  }

  const achievementViews = draft.achievements
    .map(toAchievementView)
    .filter((item): item is MatchAchievementView => !!item);
  const goalViews = draft.goals.map(toGoalView).filter((item): item is MatchGoalView => !!item);
  const publicAchievements = achievementViews.filter((item) => item.visibility === 'public');
  const visibleAchievements = audience === 'owner' ? achievementViews : publicAchievements;
  const visibleGoals = audience === 'owner' ? goalViews : goalViews.filter((item) => item.visibility === 'public');

  const preview: string[] = [];
  for (const label of [...activities, ...interests]) {
    if (!preview.includes(label)) preview.push(label);
    if (preview.length >= 4) break;
  }

  return {
    displayName: draft.identity.displayName,
    ...(draft.identity.bio ? { bio: draft.identity.bio } : {}),
    ...(draft.identity.maritalStatus && draft.identity.maritalStatus !== 'undisclosed'
      ? { maritalStatus: draft.identity.maritalStatus }
      : {}),
    ...(age != null ? { age } : {}),
    ...(draft.sharing.showCity && cityParts.length ? { cityLine: cityParts.join(' · ') } : {}),
    photos,
    ...(primaryPhoto ? { primaryPhoto } : {}),
    interests,
    activities,
    connectionGoals,
    ...(availabilityLine ? { availabilityLine } : {}),
    ...(draft.sharing.showPhone && draft.contact.phone
      ? { whatsappUrl: `https://wa.me/${draft.contact.phone}` }
      : {}),
    ...(draft.contact.instagram ? { instagramUrl: `https://instagram.com/${draft.contact.instagram}` } : {}),
    ...(draft.contact.tiktok ? { tiktokUrl: `https://www.tiktok.com/@${draft.contact.tiktok}` } : {}),
    highlights: draft.sharing.showJourney ? draft.journeyHighlights.map((item) => item.label) : [],
    connectionPreview: preview,
    socialIcons: getProfileSocialIcons(draft),
    photoMedals: publicAchievements.slice(0, MATCH_PHOTO_MEDAL_MAX),
    photoMedalExtra: Math.max(0, publicAchievements.length - MATCH_PHOTO_MEDAL_MAX),
    achievements: visibleAchievements,
    goals: visibleGoals,
  };
}

export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function withShowMe(current: string[], id: string): string[] {
  if (id === 'all') return current.includes('all') ? [] : ['all'];
  const withoutAll = current.filter((item) => item !== 'all');
  return toggleId(withoutAll, id);
}
