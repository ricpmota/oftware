'use client';

import { Bike, Check, Footprints, Mountain, PersonStanding, Sparkles, Waves, type LucideIcon } from 'lucide-react';
import { achievementById, type MatchAchievementCategoryId } from '@/lib/match/matchAchievements';

const ICONS: Record<MatchAchievementCategoryId, LucideIcon> = {
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  hiking: Mountain,
  walking: PersonStanding,
  consistency: Sparkles,
};

type MatchAchievementBadgeProps = {
  achievementId: string;
  size?: number;
  variant?: 'solid' | 'outline';
  surface?: 'dark' | 'light';
  verified?: boolean;
  onClick?: () => void;
  decorative?: boolean;
};

export function MatchAchievementBadge({
  achievementId,
  size = 40,
  variant = 'solid',
  surface = 'dark',
  verified = false,
  onClick,
  decorative = false,
}: MatchAchievementBadgeProps) {
  const definition = achievementById(achievementId);
  if (!definition) return null;
  const Icon = ICONS[definition.category];
  const label = definition.label;
  const compact = label.length > 3;
  const solid = variant === 'solid';
  const className = solid
    ? 'border-[#4CCB7A] bg-[#0A1F44] text-white'
    : surface === 'light'
      ? 'border-[#0A1F44] bg-white text-[#0A1F44]'
      : 'border-[#4CCB7A] bg-[#0A1F44]/35 text-white';
  const shared = `relative inline-flex shrink-0 flex-col items-center justify-center rounded-full border-2 shadow-[0_8px_16px_-10px_rgba(0,0,0,0.7)] ${className}`;
  const style = { width: size, height: size };
  const inner = (
    <>
      <Icon
        className={solid || surface === 'dark' ? 'text-[#4CCB7A]' : 'text-[#0A1F44]'}
        style={{ width: size * 0.28, height: size * 0.28 }}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      <span
        className={`font-extrabold leading-none tracking-tight ${compact ? 'text-[8px]' : 'text-[10px]'}`}
        style={size >= 56 ? { fontSize: compact ? 11 : 13 } : undefined}
      >
        {label}
      </span>
      {verified ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4CCB7A] text-[#0A1F44]"
          title="Conquista verificada"
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
        </span>
      ) : null}
    </>
  );
  const name = verified ? `${definition.title}. Conquista verificada` : definition.title;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shared} style={style} aria-label={name}>
        {inner}
      </button>
    );
  }

  return (
    <span className={shared} style={style} role={decorative ? undefined : 'img'} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : name}>
      {inner}
    </span>
  );
}
