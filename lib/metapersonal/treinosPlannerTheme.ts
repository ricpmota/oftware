/**
 * Paleta visual do planner. A chave `cor` persiste em planos_treino.
 * O agrupamento das colunas não usa a cor.
 */

import type { TreinosWeekday } from '@/components/metapersonal/treinos/treinosCentral.types';

export type TreinoColorTone = {
  bg: string;
  border: string;
  accent: string;
  badge: string;
};

export type WeekdayColumnTone = {
  bar: string;
  header: string;
  label: string;
};

export const TREINOS_WEEKDAY_TONES: Record<TreinosWeekday, WeekdayColumnTone> = {
  monday: { bar: 'border-blue-400', header: 'bg-blue-50/70', label: 'text-blue-800' },
  tuesday: { bar: 'border-violet-400', header: 'bg-violet-50/70', label: 'text-violet-800' },
  wednesday: { bar: 'border-emerald-400', header: 'bg-emerald-50/70', label: 'text-emerald-800' },
  thursday: { bar: 'border-amber-400', header: 'bg-amber-50/70', label: 'text-amber-800' },
  friday: { bar: 'border-cyan-400', header: 'bg-cyan-50/70', label: 'text-cyan-800' },
  saturday: { bar: 'border-purple-400', header: 'bg-purple-50/70', label: 'text-purple-800' },
  sunday: { bar: 'border-rose-300', header: 'bg-rose-50/70', label: 'text-rose-800' },
};

export const TREINO_COLOR_KEYS = [
  'emerald',
  'blue',
  'violet',
  'amber',
  'cyan',
  'rose',
  'indigo',
  'lime',
] as const;

export type TreinoColorKey = (typeof TREINO_COLOR_KEYS)[number];

export const TREINO_COLOR_BY_KEY: Record<TreinoColorKey, TreinoColorTone> = {
  emerald: { bg: 'bg-emerald-50/90', border: 'border-emerald-200', accent: 'bg-emerald-500', badge: 'text-emerald-800' },
  blue: { bg: 'bg-blue-50/90', border: 'border-blue-200', accent: 'bg-blue-500', badge: 'text-blue-800' },
  violet: { bg: 'bg-violet-50/90', border: 'border-violet-200', accent: 'bg-violet-500', badge: 'text-violet-800' },
  amber: { bg: 'bg-amber-50/90', border: 'border-amber-200', accent: 'bg-amber-500', badge: 'text-amber-800' },
  cyan: { bg: 'bg-cyan-50/90', border: 'border-cyan-200', accent: 'bg-cyan-500', badge: 'text-cyan-800' },
  rose: { bg: 'bg-rose-50/90', border: 'border-rose-200', accent: 'bg-rose-500', badge: 'text-rose-800' },
  indigo: { bg: 'bg-indigo-50/90', border: 'border-indigo-200', accent: 'bg-indigo-500', badge: 'text-indigo-800' },
  lime: { bg: 'bg-lime-50/90', border: 'border-lime-200', accent: 'bg-lime-600', badge: 'text-lime-800' },
};

export const TREINO_COLOR_SWATCH: Record<TreinoColorKey, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  cyan: 'bg-cyan-500',
  rose: 'bg-rose-500',
  indigo: 'bg-indigo-500',
  lime: 'bg-lime-600',
};

export const TREINO_COLOR_PALETTE: TreinoColorTone[] = TREINO_COLOR_KEYS.map(
  (key) => TREINO_COLOR_BY_KEY[key]
);

export function hashVisualSignature(signature: string): number {
  const value = String(signature || '');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function treinoColorFromSignature(signature: string): TreinoColorTone {
  const index = hashVisualSignature(signature) % TREINO_COLOR_PALETTE.length;
  return TREINO_COLOR_PALETTE[index];
}

export function isTreinoColorKey(value: unknown): value is TreinoColorKey {
  return typeof value === 'string' && (TREINO_COLOR_KEYS as readonly string[]).includes(value);
}

export function normalizeTreinoColorKey(value: unknown): TreinoColorKey | undefined {
  return isTreinoColorKey(value) ? value : undefined;
}

export function resolveTreinoColor(
  colorKey?: string | null,
  signature?: string
): TreinoColorTone {
  const key = normalizeTreinoColorKey(colorKey);
  if (key) return TREINO_COLOR_BY_KEY[key];
  return treinoColorFromSignature(signature || '');
}

export function suggestTreinoColorKey(used: Array<string | undefined | null>): TreinoColorKey {
  const taken = new Set(
    used.map((item) => normalizeTreinoColorKey(item)).filter((item): item is TreinoColorKey => Boolean(item))
  );
  const free = TREINO_COLOR_KEYS.find((key) => !taken.has(key));
  if (free) return free;
  return TREINO_COLOR_KEYS[used.length % TREINO_COLOR_KEYS.length];
}
