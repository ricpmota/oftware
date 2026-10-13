'use client';

import { useState } from 'react';
import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import { MatchSwitch } from '@/components/meta/match/flow/MatchChoice';
import {
  MATCH_ACHIEVEMENT_CATEGORIES,
  achievementsInCategory,
  type MatchAchievementCategoryId,
} from '@/lib/match/matchAchievements';
import {
  patchAchievement,
  patchGoal,
  toggleAchievement,
  toggleGoal,
  type MatchGoalStatus,
  type MatchProfileDraft,
} from '@/lib/match/matchProfile';

const GOAL_STATUS: { id: MatchGoalStatus; label: string }[] = [
  { id: 'active', label: 'Ativo' },
  { id: 'paused', label: 'Em pausa' },
  { id: 'completed', label: 'Concluído' },
];

export function MatchAchievementSelector({
  mode,
  draft,
  onChange,
}: {
  mode: 'achievement' | 'goal';
  draft: MatchProfileDraft;
  onChange: (draft: MatchProfileDraft) => void;
}) {
  const [open, setOpen] = useState<MatchAchievementCategoryId | ''>('running');

  return (
    <div className="space-y-2">
      {MATCH_ACHIEVEMENT_CATEGORIES.map((category) => {
        const items = achievementsInCategory(category.id);
        const expanded = open === category.id;
        return (
          <section key={category.id} className="overflow-hidden rounded-2xl border border-[#E4E8F0] bg-white">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? '' : category.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-[#0A1F44]">{category.label}</span>
              <span className="text-xs text-[#0A1F44]/45">{expanded ? 'Fechar' : 'Abrir'}</span>
            </button>
            {expanded ? (
              <div className="space-y-3 border-t border-[#E4E8F0] px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => {
                    const selected =
                      mode === 'achievement'
                        ? draft.achievements.some((record) => record.achievementId === item.id)
                        : draft.goals.some((record) => record.goalId === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          onChange(
                            mode === 'achievement'
                              ? { ...draft, achievements: toggleAchievement(draft.achievements, item.id) }
                              : { ...draft, goals: toggleGoal(draft.goals, item.id) }
                          )
                        }
                        className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold ${
                          selected
                            ? 'border-[#4CCB7A] bg-[#E8F8EE] text-[#0A1F44]'
                            : 'border-[#E4E8F0] text-[#0A1F44]'
                        }`}
                      >
                        <MatchAchievementBadge
                          achievementId={item.id}
                          size={32}
                          variant={mode === 'goal' ? 'outline' : 'solid'}
                          surface="light"
                          decorative
                        />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                {mode === 'achievement'
                  ? draft.achievements
                      .filter((record) => record.category === category.id)
                      .map((record) => (
                        <div key={record.id} className="rounded-2xl bg-[#F4F6F8] p-3">
                          <p className="text-sm font-semibold text-[#0A1F44]">
                            {achievementsInCategory(category.id).find((item) => item.id === record.achievementId)?.title}
                          </p>
                          <label className="mt-2 block text-xs font-semibold text-[#0A1F44]/60">
                            Quando aconteceu?
                            <input
                              type="date"
                              value={record.achievedAt || ''}
                              onChange={(event) =>
                                onChange({
                                  ...draft,
                                  achievements: patchAchievement(draft.achievements, record.achievementId, {
                                    achievedAt: event.target.value,
                                  }),
                                })
                              }
                              className="mt-1 h-10 w-full rounded-xl border border-[#E4E8F0] bg-white px-3 text-sm text-[#0A1F44]"
                            />
                          </label>
                          {record.achievedAt ? (
                            <button
                              type="button"
                              onClick={() =>
                                onChange({
                                  ...draft,
                                  achievements: patchAchievement(draft.achievements, record.achievementId, {
                                    achievedAt: '',
                                  }),
                                })
                              }
                              className="mt-1 text-xs font-semibold text-[#0A1F44]/60"
                            >
                              Não informar
                            </button>
                          ) : null}
                          <div className="mt-2">
                            <MatchSwitch
                              label="Mostrar no meu perfil"
                              checked={record.visibility !== 'private'}
                              onChange={(checked) =>
                                onChange({
                                  ...draft,
                                  achievements: patchAchievement(draft.achievements, record.achievementId, {
                                    visibility: checked ? 'public' : 'private',
                                  }),
                                })
                              }
                            />
                          </div>
                        </div>
                      ))
                  : null}
                {mode === 'goal'
                  ? draft.goals
                      .filter((record) => record.category === category.id)
                      .map((record) => (
                        <div key={record.id} className="rounded-2xl bg-[#F4F6F8] p-3">
                          <p className="text-sm font-semibold text-[#0A1F44]">
                            {achievementsInCategory(category.id).find((item) => item.id === record.goalId)?.goalLine}
                          </p>
                          <div className="mt-2 flex gap-1">
                            {GOAL_STATUS.map((status) => (
                              <button
                                key={status.id}
                                type="button"
                                aria-pressed={record.status === status.id}
                                onClick={() =>
                                  onChange({
                                    ...draft,
                                    goals: patchGoal(draft.goals, record.goalId, { status: status.id }),
                                  })
                                }
                                className={`h-8 flex-1 rounded-full text-[12px] font-semibold ${
                                  record.status === status.id
                                    ? 'bg-[#0A1F44] text-white'
                                    : 'bg-white text-[#0A1F44]'
                                }`}
                              >
                                {status.label}
                              </button>
                            ))}
                          </div>
                          <label className="mt-2 block text-xs font-semibold text-[#0A1F44]/60">
                            Quando você quer alcançar?
                            <input
                              type="date"
                              value={record.targetDate || ''}
                              onChange={(event) =>
                                onChange({
                                  ...draft,
                                  goals: patchGoal(draft.goals, record.goalId, { targetDate: event.target.value }),
                                })
                              }
                              className="mt-1 h-10 w-full rounded-xl border border-[#E4E8F0] bg-white px-3 text-sm text-[#0A1F44]"
                            />
                          </label>
                          <div className="mt-2">
                            <MatchSwitch
                              label="Mostrar no meu perfil"
                              checked={record.visibility !== 'private'}
                              onChange={(checked) =>
                                onChange({
                                  ...draft,
                                  goals: patchGoal(draft.goals, record.goalId, {
                                    visibility: checked ? 'public' : 'private',
                                  }),
                                })
                              }
                            />
                          </div>
                        </div>
                      ))
                  : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
