'use client';

import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import { formatMatchDay, MATCH_ACHIEVEMENT_CATEGORIES } from '@/lib/match/matchAchievements';
import type { MatchAchievementView } from '@/lib/match/matchProfile';

export function MatchAchievementsSection({
  items,
  isOwner,
  onOpen,
}: {
  items: MatchAchievementView[];
  isOwner: boolean;
  onOpen: (item: MatchAchievementView) => void;
}) {
  if (!items.length) {
    if (!isOwner) return null;
    return (
      <p className="text-sm leading-relaxed text-white/75">
        Adicione conquistas que fazem parte da sua história.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-3">
      {items.map((item) => {
        const category = MATCH_ACHIEVEMENT_CATEGORIES.find((entry) => entry.id === item.category)?.label;
        const date = formatMatchDay(item.achievedAt);
        return (
          <li key={item.recordId}>
            <button type="button" onClick={() => onOpen(item)} className="flex w-full flex-col items-center text-center">
              <MatchAchievementBadge
                achievementId={item.achievementId}
                size={56}
                verified={item.verified}
                decorative
              />
              <span className="mt-1.5 text-sm font-semibold text-white">{item.label}</span>
              <span className="text-[11px] text-white/60">{category}</span>
              {date ? <span className="text-[11px] text-white/45">{date}</span> : null}
              {item.visibility === 'private' ? <span className="text-[11px] text-[#4CCB7A]">Só você</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
