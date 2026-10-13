'use client';

import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import type { MatchGoalView } from '@/lib/match/matchProfile';

const STATUS = {
  active: '',
  paused: 'Em pausa',
  completed: 'Concluído',
} as const;

export function MatchGoalsSection({
  items,
  isOwner,
  onOpen,
}: {
  items: MatchGoalView[];
  isOwner: boolean;
  onOpen: (item: MatchGoalView) => void;
}) {
  if (!items.length) {
    if (!isOwner) return null;
    return <p className="text-sm leading-relaxed text-white/75">Escolha algo que você gostaria de alcançar.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.recordId}>
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white/10 px-2 py-2 text-left"
          >
            <MatchAchievementBadge achievementId={item.goalId} size={44} variant="outline" decorative />
            <span>
              <span className="block text-sm font-semibold text-white">{item.goalLine}</span>
              <span className="block text-[11px] text-white/60">
                Meu próximo objetivo
                {STATUS[item.status] ? ` · ${STATUS[item.status]}` : ''}
                {item.visibility === 'private' ? ' · Só você' : ''}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
