import {
  MATCH_PROFILE_NAVIGATION_ICONS_HEIGHT,
  MATCH_PROFILE_NAVIGATION_ICONS_SRC,
  MATCH_PROFILE_NAVIGATION_ICONS_WIDTH,
  getMatchProfileNavigationIcon,
  type MatchProfileNavigationIconId,
} from '@/components/meta/match/profile/navigation/matchProfileNavigationIcons';

type MatchProfileNavigationIconProps = {
  icon: MatchProfileNavigationIconId;
  size?: number;
  className?: string;
};

export function MatchProfileNavigationIcon({
  icon,
  size = 36,
  className = '',
}: MatchProfileNavigationIconProps) {
  const entry = getMatchProfileNavigationIcon(icon);
  if (!entry) return null;

  const { rect, offsetX, offsetY, scale } = entry;
  const fit = (size / Math.max(rect.width, rect.height)) * scale;
  const displayW = MATCH_PROFILE_NAVIGATION_ICONS_WIDTH * fit;
  const displayH = MATCH_PROFILE_NAVIGATION_ICONS_HEIGHT * fit;
  const drawnW = rect.width * fit;
  const drawnH = rect.height * fit;
  const left = (size - drawnW) / 2 - rect.x * fit + offsetX;
  const top = (size - drawnH) / 2 - rect.y * fit + offsetY;

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute max-w-none"
        style={{
          width: displayW,
          height: displayH,
          left,
          top,
          backgroundImage: `url("${MATCH_PROFILE_NAVIGATION_ICONS_SRC}")`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${displayW}px ${displayH}px`,
          backgroundPosition: 'left top',
        }}
      />
    </span>
  );
}
