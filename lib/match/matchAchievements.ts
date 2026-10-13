/**
 * Conquistas e objetivos do Match Saudável.
 * IDs estáveis. O texto visível não é a chave.
 *
 * Isto não é interesse nem atividade desejada.
 * Consistência fica na taxonomy, sem cálculo automático.
 */

export type MatchAchievementCategoryId =
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'hiking'
  | 'walking'
  | 'consistency';

export type MatchAchievementUnit = 'km' | 'm';

export type MatchAchievementDefinition = {
  id: string;
  category: MatchAchievementCategoryId;
  label: string;
  title: string;
  story: string;
  goalLine: string;
  iconType: 'medal';
  distance?: number;
  unit?: MatchAchievementUnit;
};

export const MATCH_ACHIEVEMENT_CATEGORIES: { id: MatchAchievementCategoryId; label: string }[] = [
  { id: 'running', label: 'Corrida' },
  { id: 'cycling', label: 'Ciclismo' },
  { id: 'swimming', label: 'Natação' },
  { id: 'hiking', label: 'Trilha' },
  { id: 'walking', label: 'Caminhada' },
  { id: 'consistency', label: 'Jornada' },
];

export const MATCH_ACHIEVEMENTS: MatchAchievementDefinition[] = [
  { id: 'running_5k', category: 'running', label: '5K', title: 'Primeiros 5K', story: 'completou uma corrida de 5 km.', goalLine: 'Correr 5 km', iconType: 'medal', distance: 5, unit: 'km' },
  { id: 'running_10k', category: 'running', label: '10K', title: 'Corrida 10K', story: 'completou uma corrida de 10 km.', goalLine: 'Correr 10 km', iconType: 'medal', distance: 10, unit: 'km' },
  { id: 'running_21k', category: 'running', label: '21K', title: 'Meia maratona', story: 'completou uma corrida de 21 km.', goalLine: 'Correr 21 km', iconType: 'medal', distance: 21, unit: 'km' },
  { id: 'running_42k', category: 'running', label: '42K', title: 'Maratona', story: 'completou uma maratona de 42 km.', goalLine: 'Correr 42 km', iconType: 'medal', distance: 42, unit: 'km' },

  { id: 'cycling_25k', category: 'cycling', label: '25K', title: 'Pedal de 25 km', story: 'pedalou 25 km.', goalLine: 'Pedalar 25 km', iconType: 'medal', distance: 25, unit: 'km' },
  { id: 'cycling_50k', category: 'cycling', label: '50K', title: 'Pedal de 50 km', story: 'pedalou 50 km.', goalLine: 'Pedalar 50 km', iconType: 'medal', distance: 50, unit: 'km' },
  { id: 'cycling_100k', category: 'cycling', label: '100K', title: 'Pedal de 100 km', story: 'pedalou 100 km.', goalLine: 'Pedalar 100 km', iconType: 'medal', distance: 100, unit: 'km' },
  { id: 'cycling_200k', category: 'cycling', label: '200K', title: 'Pedal de 200 km', story: 'pedalou 200 km.', goalLine: 'Pedalar 200 km', iconType: 'medal', distance: 200, unit: 'km' },

  { id: 'swimming_500m', category: 'swimming', label: '500m', title: 'Natação 500 m', story: 'nadou 500 metros.', goalLine: 'Nadar 500 m', iconType: 'medal', distance: 500, unit: 'm' },
  { id: 'swimming_1k', category: 'swimming', label: '1K', title: 'Natação 1 km', story: 'nadou 1 km.', goalLine: 'Nadar 1 km', iconType: 'medal', distance: 1, unit: 'km' },
  { id: 'swimming_2k', category: 'swimming', label: '2K', title: 'Natação 2 km', story: 'nadou 2 km.', goalLine: 'Nadar 2 km', iconType: 'medal', distance: 2, unit: 'km' },
  { id: 'swimming_5k', category: 'swimming', label: '5K', title: 'Natação 5 km', story: 'nadou 5 km.', goalLine: 'Nadar 5 km', iconType: 'medal', distance: 5, unit: 'km' },

  { id: 'hiking_5k', category: 'hiking', label: '5K', title: 'Trilha de 5 km', story: 'completou uma trilha de 5 km.', goalLine: 'Trilha de 5 km', iconType: 'medal', distance: 5, unit: 'km' },
  { id: 'hiking_10k', category: 'hiking', label: '10K', title: 'Trilha de 10 km', story: 'completou uma trilha de 10 km.', goalLine: 'Trilha de 10 km', iconType: 'medal', distance: 10, unit: 'km' },
  { id: 'hiking_25k', category: 'hiking', label: '25K', title: 'Trilha de 25 km', story: 'completou uma trilha de 25 km.', goalLine: 'Trilha de 25 km', iconType: 'medal', distance: 25, unit: 'km' },
  { id: 'hiking_50k', category: 'hiking', label: '50K', title: 'Trilha de 50 km', story: 'completou uma trilha de 50 km.', goalLine: 'Trilha de 50 km', iconType: 'medal', distance: 50, unit: 'km' },

  { id: 'walking_5k', category: 'walking', label: '5K', title: 'Caminhada de 5 km', story: 'caminhou 5 km.', goalLine: 'Caminhar 5 km', iconType: 'medal', distance: 5, unit: 'km' },
  { id: 'walking_10k', category: 'walking', label: '10K', title: 'Caminhada de 10 km', story: 'caminhou 10 km.', goalLine: 'Caminhar 10 km', iconType: 'medal', distance: 10, unit: 'km' },
  { id: 'walking_21k', category: 'walking', label: '21K', title: 'Caminhada de 21 km', story: 'caminhou 21 km.', goalLine: 'Caminhar 21 km', iconType: 'medal', distance: 21, unit: 'km' },

  { id: 'first_activity', category: 'consistency', label: '1º', title: 'Primeiro passo', story: 'deu o primeiro passo.', goalLine: 'Dar o primeiro passo', iconType: 'medal' },
  { id: 'active_30_days', category: 'consistency', label: '30d', title: '30 dias em movimento', story: 'manteve 30 dias em movimento.', goalLine: '30 dias em movimento', iconType: 'medal' },
  { id: 'active_90_days', category: 'consistency', label: '90d', title: '90 dias em movimento', story: 'manteve 90 dias em movimento.', goalLine: '90 dias em movimento', iconType: 'medal' },
  { id: 'training_100', category: 'consistency', label: '100', title: '100 treinos', story: 'completou 100 treinos.', goalLine: 'Completar 100 treinos', iconType: 'medal' },
];

const byId = new Map(MATCH_ACHIEVEMENTS.map((item) => [item.id, item]));

export const ACHIEVEMENT_IDS = new Set(byId.keys());

export function achievementById(id: string) {
  return byId.get(id);
}

export function achievementsInCategory(category: MatchAchievementCategoryId) {
  return MATCH_ACHIEVEMENTS.filter((item) => item.category === category);
}

export function formatMatchDay(isoDay: string | undefined): string {
  if (!isoDay || !/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return '';
  const [year, month, day] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** IDs públicos, na ordem do perfil. Não há cópia persistida. */
export function listedIds(
  records: { achievementId?: string; goalId?: string; visibility?: string }[],
  key: 'achievementId' | 'goalId',
  visibility: 'public' | 'all' = 'all'
): string[] {
  const ids: string[] = [];
  for (const record of records) {
    const id = record[key];
    if (!id) continue;
    if (visibility === 'public' && record.visibility === 'private') continue;
    ids.push(id);
  }
  return ids;
}
