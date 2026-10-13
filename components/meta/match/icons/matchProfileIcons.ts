import { MATCH_INTERESTS } from '@/lib/match/matchTaxonomy';

/** Única imagem. O navegador baixa este arquivo uma vez. */
export const MATCH_PROFILE_ICONS_SRC = '/match/profile-icons.png';
export const MATCH_PROFILE_ICONS_WIDTH = 1536;
export const MATCH_PROFILE_ICONS_HEIGHT = 1024;

export type MatchProfileIconCategory = 'identity' | 'activity' | 'experience' | 'lifestyle' | 'social';

/**
 * Recorte medido na prancha real.
 * row/column descrevem a posição visual.
 * x, y, width e height são o retângulo do desenho, porque a grade não é uniforme
 * (a primeira linha tem 7 ícones; as demais têm 8).
 * offsetX, offsetY e scale ajustam o recorte sem CSS espalhado.
 */
export type MatchProfileIconDefinition = {
  label: string;
  category: MatchProfileIconCategory;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

export const MATCH_PROFILE_ICONS = {
  married: { label: 'Casado', category: 'identity', row: 0, column: 0, x: 70, y: 73, width: 135, height: 175, offsetX: 0, offsetY: 0, scale: 1 },
  single: { label: 'Solteiro', category: 'identity', row: 0, column: 1, x: 275, y: 101, width: 156, height: 133, offsetX: 0, offsetY: 0, scale: 1 },
  relationship: { label: 'Em relacionamento', category: 'identity', row: 0, column: 2, x: 487, y: 105, width: 172, height: 123, offsetX: 0, offsetY: 0, scale: 1 },
  individual: { label: 'Individual', category: 'identity', row: 0, column: 3, x: 735, y: 88, width: 149, height: 154, offsetX: 0, offsetY: 0, scale: 1 },
  connections: { label: 'Conexões', category: 'identity', row: 0, column: 4, x: 938, y: 109, width: 171, height: 128, offsetX: 0, offsetY: 0, scale: 1 },
  family: { label: 'Família', category: 'identity', row: 0, column: 5, x: 1146, y: 97, width: 160, height: 145, offsetX: 0, offsetY: 0, scale: 1 },
  pets: { label: 'Pets', category: 'identity', row: 0, column: 6, x: 1350, y: 111, width: 141, height: 127, offsetX: 0, offsetY: 0, scale: 1 },

  running: { label: 'Corrida', category: 'activity', row: 1, column: 0, x: 40, y: 309, width: 158, height: 144, offsetX: 0, offsetY: 0, scale: 1 },
  cycling: { label: 'Ciclismo', category: 'activity', row: 1, column: 1, x: 231, y: 298, width: 168, height: 148, offsetX: 0, offsetY: 0, scale: 1 },
  gym: { label: 'Academia', category: 'activity', row: 1, column: 2, x: 432, y: 334, width: 149, height: 90, offsetX: 0, offsetY: 0, scale: 1 },
  swimming: { label: 'Natação', category: 'activity', row: 1, column: 3, x: 610, y: 323, width: 156, height: 127, offsetX: 0, offsetY: 0, scale: 1 },
  hiking: { label: 'Trilhas', category: 'activity', row: 1, column: 4, x: 830, y: 298, width: 114, height: 158, offsetX: 0, offsetY: 0, scale: 1 },
  camping: { label: 'Camping', category: 'activity', row: 1, column: 5, x: 973, y: 308, width: 178, height: 127, offsetX: 0, offsetY: 0, scale: 1 },
  beach: { label: 'Praia', category: 'activity', row: 1, column: 6, x: 1194, y: 304, width: 143, height: 157, offsetX: 0, offsetY: 0, scale: 1 },
  sun: { label: 'Sol', category: 'activity', row: 1, column: 7, x: 1366, y: 309, width: 141, height: 142, offsetX: 0, offsetY: 0, scale: 1 },

  travel: { label: 'Viagens', category: 'experience', row: 2, column: 0, x: 62, y: 509, width: 137, height: 132, offsetX: 0, offsetY: 0, scale: 1 },
  traveler: { label: 'Viajante', category: 'experience', row: 2, column: 1, x: 262, y: 504, width: 107, height: 138, offsetX: 0, offsetY: 0, scale: 1 },
  photography: { label: 'Fotografia', category: 'experience', row: 2, column: 2, x: 431, y: 516, width: 128, height: 105, offsetX: 0, offsetY: 0, scale: 1 },
  gastronomy: { label: 'Gastronomia', category: 'experience', row: 2, column: 3, x: 621, y: 510, width: 98, height: 127, offsetX: 0, offsetY: 0, scale: 1 },
  coffee: { label: 'Café', category: 'experience', row: 2, column: 4, x: 785, y: 497, width: 132, height: 140, offsetX: 0, offsetY: 0, scale: 1 },
  cooking: { label: 'Culinária', category: 'experience', row: 2, column: 5, x: 972, y: 501, width: 154, height: 133, offsetX: 0, offsetY: 0, scale: 1 },
  wine: { label: 'Vinhos', category: 'experience', row: 2, column: 6, x: 1210, y: 502, width: 83, height: 135, offsetX: 0, offsetY: 0, scale: 1 },
  music: { label: 'Música', category: 'experience', row: 2, column: 7, x: 1376, y: 511, width: 113, height: 121, offsetX: 0, offsetY: 0, scale: 1 },

  wellbeing: { label: 'Bem-estar', category: 'lifestyle', row: 3, column: 0, x: 49, y: 693, width: 173, height: 106, offsetX: 0, offsetY: 0, scale: 1 },
  healthy_life: { label: 'Vida saudável', category: 'lifestyle', row: 3, column: 1, x: 275, y: 692, width: 103, height: 116, offsetX: 0, offsetY: 0, scale: 1 },
  mind: { label: 'Mente', category: 'lifestyle', row: 3, column: 2, x: 431, y: 687, width: 122, height: 117, offsetX: 0, offsetY: 0, scale: 1 },
  sleep: { label: 'Sono', category: 'lifestyle', row: 3, column: 3, x: 608, y: 687, width: 111, height: 115, offsetX: 0, offsetY: 0, scale: 1 },
  reading: { label: 'Leitura', category: 'lifestyle', row: 3, column: 4, x: 782, y: 698, width: 144, height: 101, offsetX: 0, offsetY: 0, scale: 1 },
  technology: { label: 'Tecnologia', category: 'lifestyle', row: 3, column: 5, x: 983, y: 693, width: 149, height: 103, offsetX: 0, offsetY: 0, scale: 1 },
  gaming: { label: 'Games', category: 'lifestyle', row: 3, column: 6, x: 1175, y: 699, width: 158, height: 93, offsetX: 0, offsetY: 0, scale: 1 },
  cinema: { label: 'Cinema', category: 'lifestyle', row: 3, column: 7, x: 1374, y: 679, width: 122, height: 120, offsetX: 0, offsetY: 0, scale: 1 },

  groups: { label: 'Grupos', category: 'social', row: 4, column: 0, x: 48, y: 856, width: 171, height: 107, offsetX: 0, offsetY: 0, scale: 1 },
  conversation: { label: 'Conversar', category: 'social', row: 4, column: 1, x: 276, y: 860, width: 120, height: 111, offsetX: 0, offsetY: 0, scale: 1 },
  podcast: { label: 'Podcast', category: 'social', row: 4, column: 2, x: 458, y: 845, width: 80, height: 118, offsetX: 0, offsetY: 0, scale: 1 },
  instruments: { label: 'Instrumentos', category: 'social', row: 4, column: 3, x: 599, y: 848, width: 122, height: 124, offsetX: 0, offsetY: 0, scale: 1 },
  adventure: { label: 'Aventuras', category: 'social', row: 4, column: 4, x: 773, y: 860, width: 152, height: 106, offsetX: 0, offsetY: 0, scale: 1 },
  nautical: { label: 'Mar', category: 'social', row: 4, column: 5, x: 974, y: 847, width: 143, height: 133, offsetX: 0, offsetY: 0, scale: 1 },
  health: { label: 'Saúde', category: 'social', row: 4, column: 6, x: 1174, y: 853, width: 134, height: 118, offsetX: 0, offsetY: 0, scale: 1 },
  goals: { label: 'Metas', category: 'social', row: 4, column: 7, x: 1359, y: 842, width: 132, height: 132, offsetX: 0, offsetY: 0, scale: 1 },
} as const satisfies Record<string, MatchProfileIconDefinition>;

export type MatchProfileIconId = keyof typeof MATCH_PROFILE_ICONS;

/** Estado civil e vínculo. Não são interesses. */
export const MATCH_IDENTITY_ICON_IDS = [
  'married',
  'single',
  'relationship',
  'individual',
  'connections',
] as const satisfies readonly MatchProfileIconId[];

export const MATCH_PROFILE_ICON_CATEGORIES: { id: MatchProfileIconCategory; label: string }[] = [
  { id: 'identity', label: 'Identidade' },
  { id: 'activity', label: 'Atividades' },
  { id: 'experience', label: 'Experiências' },
  { id: 'lifestyle', label: 'Estilo de vida' },
  { id: 'social', label: 'Social' },
];

export function isMatchProfileIconId(value: string): value is MatchProfileIconId {
  return Object.prototype.hasOwnProperty.call(MATCH_PROFILE_ICONS, value);
}

export function getMatchProfileIcon(id: string): MatchProfileIconDefinition | undefined {
  if (!isMatchProfileIconId(id)) return undefined;
  return MATCH_PROFILE_ICONS[id];
}

/** Interesses da taxonomia que já têm o mesmo id na sprite. */
export const INTERESTS_WITH_PROFILE_ICON = MATCH_INTERESTS.filter((item) =>
  isMatchProfileIconId(item.id)
).map((item) => item.id);
