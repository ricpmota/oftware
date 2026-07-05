/**
 * Geometria do mapa esquemático de retina (região, quadrante, hora- relógio).
 */

import type {
  EyeSide,
  RetinaQuadrant,
  RetinaRegion,
} from '@/types/oftpay/retinaMap';

export const RETINA_MAP_VIEW_SIZE = 400;

/** Raio do fundo (fração do viewBox). */
const RETINA_RADIUS = 0.45;
/** Centro do viewBox normalizado. */
const CX = 0.5;
const CY = 0.5;

/** Centro do disco óptico normalizado (temporal na imagem). */
function discCenter(eye: EyeSide): { x: number; y: number } {
  return eye === 'OD' ? { x: 0.62, y: 0.5 } : { x: 0.38, y: 0.5 };
}

/** Centro da mácula normalizado. */
function maculaCenter(eye: EyeSide): { x: number; y: number } {
  return eye === 'OD' ? { x: 0.44, y: 0.5 } : { x: 0.56, y: 0.5 };
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function isInsideRetina(nx: number, ny: number): boolean {
  return dist(nx, ny, CX, CY) <= RETINA_RADIUS;
}

export function estimateRegion(nx: number, ny: number, eye: EyeSide): RetinaRegion {
  const disc = discCenter(eye);
  const mac = maculaCenter(eye);

  if (dist(nx, ny, disc.x, disc.y) <= 0.1) return 'disco';
  if (dist(nx, ny, mac.x, mac.y) <= 0.09) return 'macula';
  if (dist(nx, ny, CX, CY) <= 0.22) return 'polo_posterior';
  return 'periferia';
}

/** Nasal = em direção ao disco (lado nasal do olho). */
function isNasalSide(nx: number, eye: EyeSide): boolean {
  return eye === 'OD' ? nx > CX : nx < CX;
}

export function estimateQuadrant(nx: number, ny: number, eye: EyeSide): RetinaQuadrant {
  const superior = ny < CY;
  const nasal = isNasalSide(nx, eye);
  const temporal = !nasal;

  const nearCenter = Math.abs(nx - CX) < 0.08 || Math.abs(ny - CY) < 0.08;

  if (nearCenter) {
    if (superior && nasal) return 'nasal_superior';
    if (superior && temporal) return 'temporal_superior';
    if (!superior && nasal) return 'nasal_inferior';
    return 'temporal_inferior';
  }

  if (superior && (nasal || temporal)) {
    return nasal ? 'nasal_superior' : 'temporal_superior';
  }
  if (!superior && (nasal || temporal)) {
    return nasal ? 'nasal_inferior' : 'temporal_inferior';
  }
  if (nasal) return 'nasal';
  if (temporal) return 'temporal';
  return superior ? 'superior' : 'inferior';
}

/**
 * Hora no relógio (1–12) a partir do centro do disco.
 * 12h = superior, 3h = temporal (OD), 9h = nasal (OD).
 */
export function estimateClockHour(nx: number, ny: number, eye: EyeSide): number {
  const disc = discCenter(eye);
  const dx = nx - disc.x;
  const dy = ny - disc.y;
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // 12h = -90°
  angleDeg = angleDeg + 90;
  if (angleDeg < 0) angleDeg += 360;
  const hour = Math.round(angleDeg / 30) % 12;
  return hour === 0 ? 12 : hour;
}

export interface RetinaMapHitResult {
  x: number;
  y: number;
  region: RetinaRegion;
  quadrant: RetinaQuadrant;
  clockHour: number;
  insideRetina: boolean;
}

export function hitTestRetinaMap(
  nx: number,
  ny: number,
  eye: EyeSide
): RetinaMapHitResult {
  const clampedX = Math.max(0, Math.min(1, nx));
  const clampedY = Math.max(0, Math.min(1, ny));
  const insideRetina = isInsideRetina(clampedX, clampedY);

  return {
    x: clampedX,
    y: clampedY,
    region: estimateRegion(clampedX, clampedY, eye),
    quadrant: estimateQuadrant(clampedX, clampedY, eye),
    clockHour: estimateClockHour(clampedX, clampedY, eye),
    insideRetina,
  };
}

/** Coordenadas em pixels do viewBox para desenho. */
export function toViewBoxCoords(nx: number, ny: number): { px: number; py: number } {
  return {
    px: nx * RETINA_MAP_VIEW_SIZE,
    py: ny * RETINA_MAP_VIEW_SIZE,
  };
}

export function getDiscCenterPx(eye: EyeSide): { px: number; py: number } {
  const c = discCenter(eye);
  return toViewBoxCoords(c.x, c.y);
}

export function getMaculaCenterPx(eye: EyeSide): { px: number; py: number } {
  const c = maculaCenter(eye);
  return toViewBoxCoords(c.x, c.y);
}

export function getRetinaCirclePx(): { cx: number; cy: number; r: number } {
  return {
    cx: CX * RETINA_MAP_VIEW_SIZE,
    cy: CY * RETINA_MAP_VIEW_SIZE,
    r: RETINA_RADIUS * RETINA_MAP_VIEW_SIZE,
  };
}
