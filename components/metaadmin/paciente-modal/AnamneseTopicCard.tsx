'use client';

import { Edit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AnamneseTopicCardData = {
  id: string;
  title: string;
  chips: string[];
  informed: boolean;
};

type Props = {
  card: AnamneseTopicCardData;
  icon: LucideIcon;
  onEdit?: () => void;
};

export function AnamneseTopicCard({ card, icon: Icon, onEdit }: Props) {
  return (
    <article className="rounded-lg border border-gray-200/90 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h5 className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{card.title}</h5>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-violet-700 dark:hover:bg-gray-700 dark:hover:text-violet-300"
            aria-label={`Editar ${card.title}`}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>
      {card.informed && card.chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {card.chips.map((chip, chipIdx) => (
            <span
              key={`${card.id}-${chipIdx}-${chip}`}
              className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Não informado</p>
      )}
    </article>
  );
}
