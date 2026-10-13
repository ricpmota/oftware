/** Sprite única da navegação do perfil. O navegador baixa este arquivo uma vez. */
export const MATCH_PROFILE_NAVIGATION_ICONS_SRC = '/icones-perfil.png';
export const MATCH_PROFILE_NAVIGATION_ICONS_WIDTH = 2172;
export const MATCH_PROFILE_NAVIGATION_ICONS_HEIGHT = 724;

/**
 * Retângulos medidos no PNG real (2172×724, alpha real).
 * A grade não é largura/7: há padding e vãos irregulares.
 * offsetX, offsetY e scale ajustam o recorte sem espalhar coordenadas no JSX.
 */
export type MatchProfileNavigationIconDefinition = {
  label: string;
  rect: { x: number; y: number; width: number; height: number };
  offsetX: number;
  offsetY: number;
  scale: number;
};

export const MATCH_PROFILE_NAVIGATION_ICONS = {
  about: {
    label: 'Sobre',
    rect: { x: 59, y: 252, width: 232, height: 246 },
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  achievements: {
    label: 'Conquistas',
    rect: { x: 360, y: 234, width: 200, height: 273 },
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  interests: {
    label: 'Interesses',
    rect: { x: 653, y: 258, width: 218, height: 236 },
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  live: {
    label: 'Viver',
    rect: { x: 934, y: 250, width: 289, height: 255 },
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  connection: {
    label: 'Conexão',
    rect: { x: 1255, y: 306, width: 288, height: 178 },
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  routine: {
    label: 'Rotina',
    rect: { x: 1590, y: 261, width: 252, height: 240 },
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  journey: {
    label: 'Jornada',
    rect: { x: 1845, y: 236, width: 284, height: 265 },
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
} as const;

export type MatchProfileNavigationIconId = keyof typeof MATCH_PROFILE_NAVIGATION_ICONS;

export const MATCH_PROFILE_NAVIGATION_ORDER: readonly MatchProfileNavigationIconId[] = [
  'about',
  'achievements',
  'interests',
  'live',
  'connection',
  'routine',
  'journey',
];

export function getMatchProfileNavigationIcon(id: string) {
  if (id in MATCH_PROFILE_NAVIGATION_ICONS) {
    return MATCH_PROFILE_NAVIGATION_ICONS[id as MatchProfileNavigationIconId];
  }
  return undefined;
}
