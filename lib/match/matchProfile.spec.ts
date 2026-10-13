import { describe, expect, it } from 'vitest';
import {
  ageFromBirthDate,
  buildMatchViewerCard,
  createEmptyMatchDraft,
  firstDisplayName,
  getProfileSocialIcons,
  isOwnMatchPhotoPath,
  patchAchievement,
  publicAchievementIds,
  publicGoalIds,
  sanitizeMatchProfile,
  toggleAchievement,
  toggleGoal,
} from '@/lib/match/matchProfile';
import { MATCH_CONNECTION_GOALS } from '@/lib/match/matchTaxonomy';

describe('matchProfile', () => {
  it('usa só o primeiro nome e descarta sobrenome', () => {
    expect(firstDisplayName('Ana Beatriz Souza')).toBe('Ana');
    expect(firstDisplayName('A')).toBe('');
  });

  it('calcula idade sem copiar dado clínico', () => {
    expect(ageFromBirthDate('1990-09-25', new Date('2026-09-25T12:00:00Z'))).toBe(36);
    expect(ageFromBirthDate('1990-12-01', new Date('2026-09-25T12:00:00Z'))).toBe(35);
    expect(ageFromBirthDate('prontuario')).toBeNull();
  });

  it('remove campos clínicos e ids desconhecidos', () => {
    const clean = sanitizeMatchProfile({
      ...createEmptyMatchDraft(),
      diagnostico: 'não pode',
      medicamentos: ['x'],
      prontuario: { anamnese: true },
      interests: ['cycling', 'Beach Tennis', 'imc'],
      activities: ['cycle', 'exame'],
      identity: { displayName: 'Ana Souza', bio: 'a'.repeat(200) },
    });
    expect(clean).not.toHaveProperty('diagnostico');
    expect(clean).not.toHaveProperty('medicamentos');
    expect(clean).not.toHaveProperty('prontuario');
    expect(clean.interests).toEqual(['cycling']);
    expect(clean.activities).toEqual(['cycle']);
    expect(clean.identity.displayName).toBe('Ana Souza');
    expect(clean.identity.bio).toHaveLength(160);
  });

  it('aceita foto só no namespace do próprio uid', () => {
    const uid = 'abc123xyz0';
    const clean = sanitizeMatchProfile(
      {
        photos: [
          {
            id: 'p1',
            url: 'https://firebasestorage.googleapis.com/p1',
            storagePath: `match-profiles/${uid}/photos/p1.jpg`,
            order: 0,
            isPrimary: true,
          },
          {
            id: 'clinica',
            url: 'https://firebasestorage.googleapis.com/clinica',
            storagePath: 'patients/abc/progress/1.jpg',
            order: 1,
            isPrimary: false,
          },
        ],
      },
      uid
    );
    expect(clean.photos.map((photo) => photo.id)).toEqual(['p1']);
    expect(isOwnMatchPhotoPath(uid, `match-profiles/${uid}/photos/p1.jpg`)).toBe(true);
    expect(isOwnMatchPhotoPath(uid, `match-profiles/outro/photos/p1.jpg`)).toBe(false);
  });

  it('esconde idade, cidade, interesses, rotina e jornada quando o controle está desligado', () => {
    const draft = sanitizeMatchProfile({
      identity: {
        displayName: 'Marina',
        birthDate: '1992-01-10',
        city: 'Recife',
        state: 'PE',
        bio: 'Praia e café.',
      },
      interests: ['beach', 'coffee'],
      activities: ['go_to_beach'],
      connectionGoals: ['friendships'],
      availability: { days: ['sat'], periods: ['morning'] },
      journeyHighlights: [
        {
          id: 'building_routine',
          type: 'social_routine',
          label: 'Estou construindo uma rotina mais ativa.',
          visibility: 'public',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      sharing: {
        showAge: false,
        showCity: false,
        showDistance: false,
        showInterests: false,
        showAvailability: false,
        showJourney: false,
      },
    });
    const card = buildMatchViewerCard(draft, new Date('2026-09-25T12:00:00Z'));
    expect(card.displayName).toBe('Marina');
    expect(card.bio).toBe('Praia e café.');
    expect(card.age).toBeUndefined();
    expect(card.cityLine).toBeUndefined();
    expect(card.interests).toEqual([]);
    expect(card.availabilityLine).toBeUndefined();
    expect(card.highlights).toEqual([]);
    expect(card.activities).toEqual(['Ir à praia']);
    expect(card.connectionGoals).toEqual(['Novas amizades']);
  });

  it('mostra a jornada só quando o compartilhamento está ligado', () => {
    const draft = sanitizeMatchProfile({
      identity: { displayName: 'Lia' },
      sharing: { showJourney: true },
      journeyHighlights: [{ id: 'personal_goal' }],
    });
    const card = buildMatchViewerCard(draft);
    expect(card.highlights).toEqual(['Conquistei uma meta pessoal.']);
  });

  it('trata perfil antigo sem conquistas como listas vazias', () => {
    const clean = sanitizeMatchProfile({
      identity: { displayName: 'Ana' },
      interests: ['running'],
      activities: ['run'],
    });
    expect(clean.achievements).toEqual([]);
    expect(clean.goals).toEqual([]);
    expect(clean.interests).toEqual(['running']);
    expect(clean.activities).toEqual(['run']);
    const card = buildMatchViewerCard(clean);
    expect(card.photoMedals).toEqual([]);
    expect(card.photoMedalExtra).toBe(0);
    expect(card.achievements).toEqual([]);
    expect(card.goals).toEqual([]);
  });

  it('guarda só ids da taxonomy, data opcional e não promove verificação', () => {
    const declared = toggleAchievement([], 'running_10k');
    expect(declared[0]?.verification.status).toBe('self_declared');
    expect(declared[0]?.verification.source).toBeUndefined();
    const withDate = patchAchievement(declared, 'running_10k', { achievedAt: '2026-04-12' });
    const clean = sanitizeMatchProfile({
      identity: { displayName: 'Ricardo' },
      achievements: [
        ...withDate,
        { id: 'ruim', achievementId: 'Corri 10 km', visibility: 'public' },
        {
          id: 'ok',
          achievementId: 'cycling_50k',
          visibility: 'private',
          verification: { status: 'verified', source: 'Strava' },
        },
      ],
      goals: [
        { id: 'g1', goalId: 'running_21k', visibility: 'public', status: 'active' },
        { id: 'g2', goalId: 'swimming_1k', visibility: 'private', status: 'paused' },
        { id: 'g3', goalId: 'texto livre' },
      ],
    });
    expect(clean.achievements.map((item) => item.achievementId)).toEqual(['running_10k', 'cycling_50k']);
    expect(clean.achievements[0]?.achievedAt).toBe('2026-04-12');
    expect(clean.achievements[0]?.verification).toEqual({ status: 'self_declared' });
    expect(clean.achievements[1]?.verification).toEqual({ status: 'verified', source: 'Strava' });
    expect(clean.achievements[1]?.visibility).toBe('private');
    expect(clean.goals.map((item) => item.goalId)).toEqual(['running_21k', 'swimming_1k']);
    expect(publicAchievementIds(clean.achievements)).toEqual(['running_10k']);
    expect(publicGoalIds(clean.goals)).toEqual(['running_21k']);
  });

  it('mostra no máximo 4 medalhas públicas na foto e esconde as privadas de quem visita', () => {
    const ids = [
      'running_5k',
      'running_10k',
      'running_21k',
      'running_42k',
      'cycling_50k',
      'swimming_1k',
      'hiking_10k',
      'cycling_100k',
    ];
    let achievements = ids.reduce((list, id) => toggleAchievement(list, id), createEmptyMatchDraft().achievements);
    achievements = patchAchievement(achievements, 'running_21k', { visibility: 'private', achievedAt: '' });
    achievements = patchAchievement(achievements, 'running_10k', { achievedAt: '2026-04-12' });
    const draft = sanitizeMatchProfile({
      identity: { displayName: 'Ricardo', city: 'João Pessoa', state: 'PB' },
      achievements,
      goals: toggleGoal(toggleGoal([], 'running_21k'), 'cycling_100k').map((goal, index) =>
        index === 1 ? { ...goal, visibility: 'private' } : goal
      ),
    });
    const owner = buildMatchViewerCard(draft, new Date('2026-09-25'), 'owner');
    const visitor = buildMatchViewerCard(draft, new Date('2026-09-25'), 'public');
    expect(owner.photoMedals.map((item) => item.achievementId)).toEqual([
      'running_5k',
      'running_10k',
      'running_42k',
      'cycling_50k',
    ]);
    expect(owner.photoMedalExtra).toBe(3);
    expect(owner.achievements).toHaveLength(8);
    expect(owner.achievements.find((item) => item.achievementId === 'running_10k')?.achievedAt).toBe('2026-04-12');
    expect(owner.achievements.find((item) => item.achievementId === 'running_5k')?.achievedAt).toBeUndefined();
    expect(visitor.achievements.map((item) => item.achievementId)).not.toContain('running_21k');
    expect(visitor.goals.map((item) => item.goalId)).toEqual(['running_21k']);
    expect(owner.goals.map((item) => item.goalId)).toEqual(['running_21k', 'cycling_100k']);
    expect(owner.photoMedals.every((item) => item.visibility === 'public')).toBe(true);
  });

  it('só expõe WhatsApp com o telefone visível e limpa os perfis sociais', () => {
    const hidden = sanitizeMatchProfile({
      identity: { displayName: 'Ana' },
      sharing: { showPhone: false },
      contact: { phone: '5583988192848', instagram: '@ana.fit', tiktok: 'https://www.tiktok.com/@ana.fit' },
    });
    expect(hidden.sharing.showPhone).toBe(false);
    expect(hidden.contact.phone).toBeUndefined();
    expect(hidden.contact.instagram).toBe('ana.fit');
    expect(hidden.contact.tiktok).toBe('ana.fit');
    expect(buildMatchViewerCard(hidden).whatsappUrl).toBeUndefined();
    expect(buildMatchViewerCard(hidden).instagramUrl).toBe('https://instagram.com/ana.fit');

    const shown = sanitizeMatchProfile({
      identity: { displayName: 'Ana' },
      sharing: { showPhone: true },
      contact: { phone: '+55 (83) 98819-2848', instagram: ' ', tiktok: '@@@' },
    });
    expect(shown.contact.phone).toBe('5583988192848');
    expect(shown.contact.instagram).toBeUndefined();
    expect(shown.contact.tiktok).toBeUndefined();
    expect(buildMatchViewerCard(shown).whatsappUrl).toBe('https://wa.me/5583988192848');
  });

  it('deriva ícones sociais do estado civil e dos interesses, sem usar conquista nem atividade', () => {
    const many = sanitizeMatchProfile({
      identity: { displayName: 'Ricardo', maritalStatus: 'married' },
      interests: ['pets', 'running', 'travel', 'yoga', 'beach', 'coffee', 'family', 'technology', 'gym', 'wellbeing'],
      activities: ['run', 'cycle'],
      achievements: [{ id: 'a', achievementId: 'swimming_1k', verification: { status: 'self_declared' }, visibility: 'public' }],
    });
    expect(getProfileSocialIcons(many)).toEqual([
      'married',
      'running',
      'gym',
      'beach',
      'family',
      'pets',
      'wellbeing',
      'technology',
      'travel',
      'coffee',
    ]);
    expect(getProfileSocialIcons(many)).not.toContain('swimming');
    expect(getProfileSocialIcons(many)).not.toContain('yoga');

    const single = sanitizeMatchProfile({
      identity: { displayName: 'Lia', maritalStatus: 'single' },
      interests: ['pets', 'coffee', 'cycling'],
    });
    expect(getProfileSocialIcons(single)).toEqual(['single', 'cycling', 'pets', 'coffee']);

    const divorced = sanitizeMatchProfile({
      identity: { displayName: 'Ana', maritalStatus: 'divorced' },
      interests: ['walking'],
      activities: ['cycle'],
    });
    expect(getProfileSocialIcons(divorced)).toEqual([]);

    const hiddenInterests = sanitizeMatchProfile({
      identity: { displayName: 'Ana', maritalStatus: 'single' },
      interests: ['running'],
      sharing: { showInterests: false },
    });
    expect(getProfileSocialIcons(hiddenInterests)).toEqual(['single']);
  });

  it('não coloca relacionamento como primeira conexão', () => {
    expect(MATCH_CONNECTION_GOALS[0]?.id).not.toBe('relationship');
    expect(MATCH_CONNECTION_GOALS.at(-1)?.id).toBe('relationship');
  });
});
