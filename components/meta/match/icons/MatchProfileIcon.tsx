import { Sparkles } from 'lucide-react';
import {
  MATCH_PROFILE_ICONS_HEIGHT,
  MATCH_PROFILE_ICONS_SRC,
  MATCH_PROFILE_ICONS_WIDTH,
  getMatchProfileIcon,
  type MatchProfileIconId,
} from '@/components/meta/match/icons/matchProfileIcons';

type MatchProfileIconProps = {
  icon: MatchProfileIconId | string;
  size?: number;
  /** Quando true, o ícone não é anunciado por leitores de tela. */
  decorative?: boolean;
  className?: string;
};

export function MatchProfileIcon({
  icon,
  size = 28,
  decorative = true,
  className = '',
}: MatchProfileIconProps) {
  const entry = getMatchProfileIcon(icon);

  if (!entry) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[MatchProfileIcon] ícone desconhecido: ${icon}`);
    }
    return (
      <Sparkles
        size={size}
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : 'Destaque'}
        className={className}
      />
    );
  }

  const pad = 4;
  const sourceX = Math.max(0, entry.x - pad);
  const sourceY = Math.max(0, entry.y - pad);
  const sourceW = Math.min(MATCH_PROFILE_ICONS_WIDTH - sourceX, entry.width + pad * 2);
  const sourceH = Math.min(MATCH_PROFILE_ICONS_HEIGHT - sourceY, entry.height + pad * 2);
  const fit = (size / Math.max(sourceW, sourceH)) * entry.scale;
  const displayW = MATCH_PROFILE_ICONS_WIDTH * fit;
  const displayH = MATCH_PROFILE_ICONS_HEIGHT * fit;
  const drawnW = sourceW * fit;
  const drawnH = sourceH * fit;
  const left = (size - drawnW) / 2 - sourceX * fit + entry.offsetX;
  const top = (size - drawnH) / 2 - sourceY * fit + entry.offsetY;

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : entry.label}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute max-w-none"
        style={{
          width: displayW,
          height: displayH,
          left,
          top,
          backgroundImage: `url("${MATCH_PROFILE_ICONS_SRC}")`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${displayW}px ${displayH}px`,
          backgroundPosition: 'left top',
        }}
      />
    </span>
  );
}
