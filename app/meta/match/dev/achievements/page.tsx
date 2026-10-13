'use client';

import { MatchProfileStage } from '@/components/meta/match/profile/MatchProfileStage';
import { buildMatchViewerCard, sanitizeMatchProfile } from '@/lib/match/matchProfile';

function record(id: string, achievementId: string, extra?: { visibility?: 'private'; achievedAt?: string; verified?: boolean }) {
  return {
    id,
    achievementId,
    visibility: extra?.visibility || 'public',
    ...(extra?.achievedAt ? { achievedAt: extra.achievedAt } : {}),
    verification: extra?.verified ? { status: 'verified', source: 'Strava' } : { status: 'self_declared' },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function fixture() {
  const draft = sanitizeMatchProfile({
    identity: {
      displayName: 'Ricardo',
      city: 'João Pessoa',
      state: 'PB',
      bio: 'Corrida, pedal e praia.',
      birthDate: '1984-03-02',
      maritalStatus: 'married',
    },
    interests: ['pets', 'running', 'travel', 'beach', 'coffee', 'cycling'],
    achievements: [
      record('a1', 'running_5k'),
      record('a2', 'running_10k', { achievedAt: '2026-04-12' }),
      record('a3', 'running_21k', { visibility: 'private' }),
      record('a4', 'running_42k', { verified: true }),
      record('a5', 'cycling_50k'),
      record('a6', 'swimming_1k'),
      record('a7', 'hiking_10k'),
      record('a8', 'cycling_100k'),
    ],
    goals: [
      { id: 'g1', goalId: 'running_21k', visibility: 'public', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'g2', goalId: 'cycling_100k', visibility: 'private', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
    ],
  });
  draft.photos = [
    {
      id: 'hero',
      url: '/matchsaudavel2.png',
      storagePath: 'match-profiles/dev/photos/hero.jpg',
      order: 0,
      isPrimary: true,
    },
  ];
  return buildMatchViewerCard(draft, new Date('2026-09-25T12:00:00'), 'owner');
}

export default function MatchAchievementsDevPage() {
  return <MatchProfileStage card={fixture()} isOwner onBack={() => undefined} editHref="/meta/match/dev/achievements" />;
}
