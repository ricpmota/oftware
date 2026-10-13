import { describe, expect, it } from 'vitest';
import { getMatchCommonalities } from '@/lib/match/matchCommonalities';
import { matchCityDistanceKm } from '@/lib/match/matchCityDistance';
import { passesDiscoveryFilters, sortDiscoveryCandidates } from '@/lib/match/matchDiscovery';
import { createEmptyMatchDraft, sanitizeMatchProfile } from '@/lib/match/matchProfile';
import { decideConnect, decideResponse } from '@/lib/match/matchConnectionDecision';
import { matchPairKey } from '@/lib/match/matchPair';

function profile(partial: Record<string, unknown>) {
  return sanitizeMatchProfile({ ...createEmptyMatchDraft(), ...partial, status: 'active', onboardingCompleted: true });
}

describe('match social', () => {
  it('gera a mesma chave para o par', () => {
    expect(matchPairKey('b', 'a')).toBe('a_b');
    expect(matchPairKey('a', 'b')).toBe(matchPairKey('b', 'a'));
  });

  it('não trata rótulos parecidos como a mesma afinidade', () => {
    const current = profile({ interests: ['running'], activities: ['run'] });
    const candidate = profile({ interests: ['walking'], activities: ['cycle'] });
    expect(getMatchCommonalities(current, candidate).items).toEqual([]);
  });

  it('conta interesse, atividade, conquista, objetivo e período pelo id', () => {
    const current = profile({
      interests: ['running', 'beach'],
      activities: ['run'],
      connectionGoals: ['activities'],
      availability: { periods: ['morning'], days: [] },
      achievements: [{ id: 'a', achievementId: 'running_10k', visibility: 'public', verification: { status: 'self_declared' } }],
      goals: [{ id: 'g', goalId: 'running_21k', visibility: 'public', status: 'active' }],
    });
    const candidate = profile({
      interests: ['beach', 'coffee'],
      activities: ['run', 'talk'],
      connectionGoals: ['activities', 'networking'],
      availability: { periods: ['morning', 'night'], days: [] },
      achievements: [{ id: 'b', achievementId: 'running_10k', visibility: 'public', verification: { status: 'self_declared' } }],
      goals: [{ id: 'h', goalId: 'running_21k', visibility: 'public', status: 'active' }],
    });
    const result = getMatchCommonalities(current, candidate);
    expect(result.total).toBe(6);
    expect(result.items.map((item) => `${item.type}:${item.id}`)).toEqual([
      'interest:beach',
      'activity:run',
      'achievement:running_10k',
      'goal:running_21k',
      'connection_goal:activities',
      'availability_period:morning',
    ]);
  });

  it('ignora interesse oculto e conquista privada', () => {
    const current = profile({
      interests: ['running'],
      sharing: { showInterests: false },
      achievements: [{ id: 'a', achievementId: 'running_5k', visibility: 'private', verification: { status: 'self_declared' } }],
    });
    const candidate = profile({
      interests: ['running'],
      achievements: [{ id: 'b', achievementId: 'running_5k', visibility: 'public', verification: { status: 'self_declared' } }],
    });
    expect(getMatchCommonalities(current, candidate).total).toBe(0);
  });

  it('filtra idade, objetivo e cidade, e não inventa raio', () => {
    const viewer = profile({
      identity: { displayName: 'Ana', city: 'João Pessoa', state: 'PB' },
      discoveryPreferences: {
        showMe: ['men'],
        connectionGoals: ['activities'],
        ageMin: 30,
        ageMax: 45,
        locationMode: 'nearby',
        radiusKm: 10,
        preferSharedActivities: true,
      },
    });
    const near = profile({
      identity: { displayName: 'Lia', city: 'João Pessoa', state: 'PB', birthDate: '1990-01-01' },
      connectionGoals: ['activities'],
    });
    const far = profile({
      identity: { displayName: 'Bia', city: 'Recife', state: 'PE', birthDate: '1990-01-01' },
      connectionGoals: ['activities'],
    });
    const young = profile({
      identity: { displayName: 'Caio', city: 'João Pessoa', state: 'PB', birthDate: '2010-01-01' },
      connectionGoals: ['activities'],
    });
    const today = new Date('2026-09-26T12:00:00Z');
    const registered = profile({
      identity: { displayName: 'Marina', city: 'João Pessoa', state: 'PB' },
      status: 'draft',
      onboardingCompleted: false,
      discoverable: true,
      connectionGoals: [],
    });
    const openPlace = profile({
      identity: { displayName: 'Ana', city: 'João Pessoa', state: 'PB' },
      discoveryPreferences: {
        showMe: ['all'],
        connectionGoals: [],
        ageMin: 30,
        ageMax: 45,
        locationMode: 'anywhere',
      },
    });
    const around = profile({
      identity: { displayName: 'Ana', city: 'João Pessoa', state: 'PB' },
      discoveryPreferences: {
        showMe: ['all'],
        connectionGoals: ['activities'],
        ageMin: 30,
        ageMax: 45,
        locationMode: 'nearby',
        radiusKm: 100,
      },
    });
    const close = profile({
      identity: { displayName: 'Duda', city: 'Cabedelo', state: 'PB', birthDate: '1990-01-01' },
      connectionGoals: ['activities'],
    });
    expect(passesDiscoveryFilters(viewer, near, today, 'm')).toBe(true);
    expect(passesDiscoveryFilters(viewer, far, today, 'm')).toBe(false);
    expect(passesDiscoveryFilters(viewer, young, today, 'm')).toBe(false);
    expect(passesDiscoveryFilters(viewer, registered, today, 'm')).toBe(false);
    expect(matchCityDistanceKm({ city: 'João Pessoa', state: 'PB' }, { city: 'Recife', state: 'PE' })).toBeGreaterThan(100);
    expect(passesDiscoveryFilters(openPlace, far, today, 'm')).toBe(true);
    expect(passesDiscoveryFilters(around, close, today, 'm')).toBe(true);
    expect(passesDiscoveryFilters(around, far, today, 'm')).toBe(false);
  });

  it('ordena por quantidade de afinidades e desempata pelo uid', () => {
    const sorted = sortDiscoveryCandidates([
      { uid: 'b', commonCount: 1, updatedAtMs: 20 },
      { uid: 'a', commonCount: 3, updatedAtMs: 1 },
      { uid: 'c', commonCount: 1, updatedAtMs: 20 },
    ]);
    expect(sorted.map((item) => item.uid)).toEqual(['a', 'b', 'c']);
  });

  it('não mostra perfil pausado ou sem opt-in, e mostra o mínimo autorizado', () => {
    const viewer = profile({ identity: { displayName: 'Ana' } });
    const paused = sanitizeMatchProfile({ identity: { displayName: 'Lia' }, status: 'paused', onboardingCompleted: true });
    const draft = sanitizeMatchProfile({ identity: { displayName: 'Lia' }, status: 'active', onboardingCompleted: false });
    const minimal = sanitizeMatchProfile({
      identity: { displayName: 'Lia', city: 'João Pessoa' },
      status: 'draft',
      onboardingCompleted: false,
      discoverable: true,
    });
    expect(passesDiscoveryFilters(viewer, paused)).toBe(false);
    expect(passesDiscoveryFilters(viewer, draft)).toBe(false);
    expect(passesDiscoveryFilters(viewer, minimal)).toBe(true);
  });

  it('coloca mais coisas em comum antes da mesma cidade', () => {
    const sorted = sortDiscoveryCandidates([
      { uid: 'far', commonCount: 4, updatedAtMs: 50, sameCity: false },
      { uid: 'near', commonCount: 0, updatedAtMs: 1, sameCity: true },
    ]);
    expect(sorted.map((item) => item.uid)).toEqual(['far', 'near']);
  });

  it('um toque cria interesse, reciprocidade aceita, e ignored reabre o pedido', () => {
    const open = { blocked: false, connectionActive: false, requestStatus: null, requestFromUid: null, requestToUid: null };
    expect(decideConnect('a', open)).toEqual({ action: 'create_interest' });
    expect(decideConnect('a', { ...open, requestStatus: 'pending', requestFromUid: 'a', requestToUid: 'b' })).toEqual({
      action: 'noop',
      result: 'already_sent',
    });
    expect(decideConnect('b', { ...open, requestStatus: 'pending', requestFromUid: 'a', requestToUid: 'b' })).toEqual({
      action: 'accept',
    });
    expect(decideConnect('a', { ...open, blocked: true })).toEqual({ action: 'noop', result: 'blocked' });
    expect(decideConnect('a', { ...open, connectionActive: true })).toEqual({ action: 'noop', result: 'already_connected' });
    expect(decideConnect('b', { ...open, requestStatus: 'ignored', requestFromUid: 'a', requestToUid: 'b' })).toEqual({
      action: 'create_interest',
    });
    expect(decideConnect('a', { ...open, requestStatus: 'accepted', requestFromUid: 'a', requestToUid: 'b' })).toEqual({
      action: 'accept',
    });
  });

  it('aceita só o destinatário e ignora sem criar conexão', () => {
    const pending = { toUid: 'b', status: 'pending' };
    expect(decideResponse('b', pending, 'accept', false)).toEqual({ action: 'accept', createConnection: true });
    expect(decideResponse('b', pending, 'accept', true)).toEqual({ action: 'accept', createConnection: false });
    expect(decideResponse('b', pending, 'ignore', false)).toEqual({ action: 'ignore' });
    expect(decideResponse('a', pending, 'accept', false)).toEqual({ action: 'reject', code: 'forbidden' });
    expect(decideResponse('b', null, 'accept', false)).toEqual({ action: 'reject', code: 'missing' });
    expect(decideResponse('b', { toUid: 'b', status: 'accepted' }, 'accept', true)).toEqual({
      action: 'reject',
      code: 'forbidden',
    });
  });
});
