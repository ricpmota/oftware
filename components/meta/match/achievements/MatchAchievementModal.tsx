'use client';

import { useEffect } from 'react';
import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import { formatMatchDay } from '@/lib/match/matchAchievements';
import type { MatchAchievementView, MatchGoalView } from '@/lib/match/matchProfile';

const GOAL_STATUS = {
  active: 'Em andamento',
  paused: 'Em pausa',
  completed: 'Concluído',
} as const;

type MatchAchievementModalProps = {
  displayName: string;
  achievement?: MatchAchievementView | null;
  goal?: MatchGoalView | null;
  onClose: () => void;
};

export function MatchAchievementModal({
  displayName,
  achievement,
  goal,
  onClose,
}: MatchAchievementModalProps) {
  const open = Boolean(achievement || goal);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const name = displayName.trim() || 'Esta pessoa';
  const date = formatMatchDay(achievement?.achievedAt || goal?.targetDate);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={achievement?.title || goal?.title || 'Conquista'}
        className="w-full max-w-[480px] rounded-t-3xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-[#0A1F44]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E4E8F0]" />
        <div className="flex items-center gap-3">
          <MatchAchievementBadge
            achievementId={(achievement?.achievementId || goal?.goalId) as string}
            size={72}
            variant={goal ? 'outline' : 'solid'}
            surface="light"
            verified={achievement?.verified}
          />
          <div>
            <p className="text-lg font-extrabold leading-tight">{achievement?.title || goal?.title}</p>
            {goal ? <p className="text-sm font-semibold text-[#0A1F44]/70">Meu próximo objetivo</p> : null}
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed">
          {achievement ? `${name} ${achievement.story}` : null}
          {goal ? `${name} quer alcançar: ${goal.goalLine}.` : null}
        </p>
        {date ? <p className="mt-2 text-sm text-[#0A1F44]/70">{goal ? `Até ${date}` : date}</p> : null}
        {goal ? <p className="mt-2 text-sm text-[#0A1F44]/70">{GOAL_STATUS[goal.status]}</p> : null}
        {achievement?.verified ? (
          <p className="mt-3 text-sm font-semibold text-[#0A1F44]">
            ✓ Conquista verificada
            {achievement.source ? <span className="font-medium text-[#0A1F44]/70"> · {achievement.source}</span> : null}
          </p>
        ) : achievement ? (
          <p className="mt-3 text-sm text-[#0A1F44]/55">Conquista informada pelo usuário.</p>
        ) : null}
        {achievement?.visibility === 'private' || goal?.visibility === 'private' ? (
          <p className="mt-2 text-sm text-[#0A1F44]/55">Só você vê isto no perfil.</p>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-full bg-[#0A1F44] text-sm font-semibold text-white"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
