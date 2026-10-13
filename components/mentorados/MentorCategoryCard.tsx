'use client';

import type { MentorCategoryMeta } from '@/lib/mentorados/categories';

export default function MentorCategoryCard({
  category,
  count,
  selected,
  onSelect,
}: {
  category: MentorCategoryMeta;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[132px] w-full flex-col items-start rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
        selected
          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
          : 'border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)]/40'
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {category.emoji}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)] sm:text-base">
        {category.shortName || category.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
        {category.description}
      </p>
      <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">
        {count} {count === 1 ? 'aula' : 'aulas'}
      </p>
    </button>
  );
}
