/**
 * IDs estáveis do Match Saudável.
 * Componentes traduzem id → rótulo. Não persistir o texto visível.
 * Conquistas e objetivos ficam em lib/match/matchAchievements.ts.
 */

export type MatchInterestCategoryId = 'movement' | 'outdoors' | 'experiences' | 'lifestyle';

export type MatchTaxonomyItem = {
  id: string;
  label: string;
  emoji?: string;
};

export type MatchInterest = MatchTaxonomyItem & {
  categories: MatchInterestCategoryId[];
};

export const INTEREST_CATEGORIES: { id: MatchInterestCategoryId; label: string }[] = [
  { id: 'movement', label: 'Movimento' },
  { id: 'outdoors', label: 'Ao ar livre' },
  { id: 'experiences', label: 'Experiências' },
  { id: 'lifestyle', label: 'Estilo de vida' },
];

export const MATCH_INTERESTS: MatchInterest[] = [
  { id: 'gym', label: 'Academia', categories: ['movement'] },
  { id: 'running', label: 'Corrida', categories: ['movement'] },
  { id: 'walking', label: 'Caminhada', categories: ['movement'] },
  { id: 'cycling', label: 'Ciclismo', categories: ['movement'] },
  { id: 'swimming', label: 'Natação', categories: ['movement'] },
  { id: 'crossfit', label: 'CrossFit', categories: ['movement'] },
  { id: 'functional', label: 'Funcional', categories: ['movement'] },
  { id: 'yoga', label: 'Yoga', categories: ['movement'] },
  { id: 'pilates', label: 'Pilates', categories: ['movement'] },
  { id: 'football', label: 'Futebol', categories: ['movement'] },
  { id: 'beach_tennis', label: 'Beach tennis', categories: ['movement'] },
  { id: 'tennis', label: 'Tênis', categories: ['movement'] },
  { id: 'hiking', label: 'Trilhas', categories: ['movement', 'outdoors'] },
  { id: 'dance', label: 'Dança', categories: ['movement'] },
  { id: 'beach', label: 'Praia', categories: ['outdoors'] },
  { id: 'nature', label: 'Natureza', categories: ['outdoors'] },
  { id: 'parks', label: 'Parques', categories: ['outdoors'] },
  { id: 'outdoor_cycling', label: 'Pedalar', categories: ['outdoors'] },
  { id: 'outdoor_sports', label: 'Esportes ao ar livre', categories: ['outdoors'] },
  { id: 'travel', label: 'Viagens', categories: ['experiences'] },
  { id: 'gastronomy', label: 'Gastronomia', categories: ['experiences'] },
  { id: 'coffee', label: 'Café', categories: ['experiences'] },
  { id: 'cinema', label: 'Cinema', categories: ['experiences'] },
  { id: 'music', label: 'Música', categories: ['experiences'] },
  { id: 'shows', label: 'Shows', categories: ['experiences'] },
  { id: 'events', label: 'Eventos', categories: ['experiences'] },
  { id: 'photography', label: 'Fotografia', categories: ['experiences'] },
  { id: 'healthy_life', label: 'Vida saudável', categories: ['lifestyle'] },
  { id: 'family', label: 'Família', categories: ['lifestyle'] },
  { id: 'pets', label: 'Pets', categories: ['lifestyle'] },
  { id: 'entrepreneurship', label: 'Empreendedorismo', categories: ['lifestyle'] },
  { id: 'technology', label: 'Tecnologia', categories: ['lifestyle'] },
  { id: 'reading', label: 'Leitura', categories: ['lifestyle'] },
  { id: 'cooking', label: 'Culinária', categories: ['lifestyle'] },
  { id: 'wellbeing', label: 'Bem-estar', categories: ['lifestyle'] },
];

/** O que a pessoa quer viver com outras pessoas. Distinto dos interesses. */
export const MATCH_ACTIVITIES: MatchTaxonomyItem[] = [
  { id: 'train', label: 'Treinar', emoji: '🏃' },
  { id: 'walk', label: 'Caminhar', emoji: '🚶' },
  { id: 'run', label: 'Correr', emoji: '🏃' },
  { id: 'cycle', label: 'Pedalar', emoji: '🚴' },
  { id: 'go_to_beach', label: 'Ir à praia', emoji: '🏖️' },
  { id: 'hike', label: 'Fazer trilhas', emoji: '🥾' },
  { id: 'play_sports', label: 'Praticar esportes', emoji: '🎾' },
  { id: 'grab_coffee', label: 'Tomar um café', emoji: '☕' },
  { id: 'try_restaurants', label: 'Conhecer restaurantes', emoji: '🍽️' },
  { id: 'travel_together', label: 'Viajar', emoji: '✈️' },
  { id: 'go_to_events', label: 'Ir a eventos', emoji: '🎵' },
  { id: 'talk', label: 'Conversar', emoji: '💬' },
  { id: 'join_groups', label: 'Participar de grupos', emoji: '👥' },
  { id: 'try_new_things', label: 'Conhecer coisas novas', emoji: '✨' },
];

/** Relacionamento é uma opção entre outras, nunca o destaque do produto. */
export const MATCH_CONNECTION_GOALS: MatchTaxonomyItem[] = [
  { id: 'activities', label: 'Atividades' },
  { id: 'friendships', label: 'Novas amizades' },
  { id: 'groups', label: 'Grupos' },
  { id: 'networking', label: 'Networking' },
  { id: 'experience_exchange', label: 'Troca de experiências' },
  { id: 'relationship', label: 'Relacionamento' },
];

export const MATCH_DAYS: MatchTaxonomyItem[] = [
  { id: 'mon', label: 'Seg' },
  { id: 'tue', label: 'Ter' },
  { id: 'wed', label: 'Qua' },
  { id: 'thu', label: 'Qui' },
  { id: 'fri', label: 'Sex' },
  { id: 'sat', label: 'Sáb' },
  { id: 'sun', label: 'Dom' },
];

export const MATCH_PERIODS: MatchTaxonomyItem[] = [
  { id: 'morning', label: 'Manhã' },
  { id: 'afternoon', label: 'Tarde' },
  { id: 'night', label: 'Noite' },
];

export const MATCH_PLANNING_STYLES: MatchTaxonomyItem[] = [
  { id: 'planned', label: 'Planejadas' },
  { id: 'spontaneous', label: 'Espontâneas' },
  { id: 'either', label: 'Tanto faz' },
];

export const MATCH_ACTIVITY_LEVELS: { id: string; title: string; text: string }[] = [
  { id: 'starting', title: 'Começando agora', text: 'Quero criar novos hábitos.' },
  { id: 'moving', title: 'Em movimento', text: 'Já tenho uma rotina ativa.' },
  { id: 'active', title: 'Bem ativo', text: 'Atividade física faz parte da minha rotina.' },
];

export const MATCH_LOCATION_MODES: MatchTaxonomyItem[] = [
  { id: 'my_city', label: 'Minha cidade' },
  { id: 'nearby', label: 'Perto de mim' },
  { id: 'anywhere', label: 'Qualquer lugar' },
];

export const MATCH_RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;

export const MATCH_SHOW_ME: MatchTaxonomyItem[] = [
  { id: 'men', label: 'Homens' },
  { id: 'women', label: 'Mulheres' },
  { id: 'all', label: 'Todos' },
];

export const MATCH_JOURNEY_PRESETS: { id: string; type: string; label: string }[] = [
  {
    id: 'building_routine',
    type: 'social_routine',
    label: 'Estou construindo uma rotina mais ativa.',
  },
  {
    id: 'started_journey',
    type: 'social_start',
    label: 'Comecei minha jornada.',
  },
  {
    id: 'completed_workouts',
    type: 'social_workouts',
    label: 'Completei treinos.',
  },
  {
    id: 'personal_goal',
    type: 'social_goal',
    label: 'Conquistei uma meta pessoal.',
  },
  {
    id: 'share_progress',
    type: 'social_progress',
    label: 'Quero compartilhar minha evolução.',
  },
];

const interestByIdMap = new Map(MATCH_INTERESTS.map((item) => [item.id, item]));
const activityByIdMap = new Map(MATCH_ACTIVITIES.map((item) => [item.id, item]));
const connectionByIdMap = new Map(MATCH_CONNECTION_GOALS.map((item) => [item.id, item]));

export const INTEREST_IDS = new Set(interestByIdMap.keys());
export const ACTIVITY_IDS = new Set(activityByIdMap.keys());
export const CONNECTION_GOAL_IDS = new Set(connectionByIdMap.keys());
export const DAY_IDS = new Set(MATCH_DAYS.map((item) => item.id));
export const PERIOD_IDS = new Set(MATCH_PERIODS.map((item) => item.id));
export const PLANNING_STYLE_IDS = new Set(MATCH_PLANNING_STYLES.map((item) => item.id));
export const ACTIVITY_LEVEL_IDS = new Set(MATCH_ACTIVITY_LEVELS.map((item) => item.id));
export const LOCATION_MODE_IDS = new Set(MATCH_LOCATION_MODES.map((item) => item.id));
export const SHOW_ME_IDS = new Set(MATCH_SHOW_ME.map((item) => item.id));
export const JOURNEY_PRESET_IDS = new Set(MATCH_JOURNEY_PRESETS.map((item) => item.id));

export function interestById(id: string) {
  return interestByIdMap.get(id);
}

export function activityById(id: string) {
  return activityByIdMap.get(id);
}

export function connectionGoalById(id: string) {
  return connectionByIdMap.get(id);
}

export function labelFor(mapItem: { label: string } | undefined, fallback = '') {
  return mapItem?.label || fallback;
}

export const MATCH_AGE_MIN = 18;
export const MATCH_AGE_MAX = 70;

export type MatchGrammaticalGender = 'm' | 'f' | 'u';

const MARITAL_LABELS: Record<string, Record<MatchGrammaticalGender, string>> = {
  single: { m: 'Solteiro', f: 'Solteira', u: 'Solteiro(a)' },
  married: { m: 'Casado', f: 'Casada', u: 'Casado(a)' },
  divorced: { m: 'Divorciado', f: 'Divorciada', u: 'Divorciado(a)' },
  widowed: { m: 'Viúvo', f: 'Viúva', u: 'Viúvo(a)' },
  undisclosed: { m: 'Não informar', f: 'Não informar', u: 'Não informar' },
};

export const MATCH_MARITAL_STATUS_IDS = ['single', 'married', 'divorced', 'widowed', 'undisclosed'] as const;

export function maritalStatusLabel(id: string, gender: MatchGrammaticalGender): string {
  return MARITAL_LABELS[id]?.[gender] || '';
}
