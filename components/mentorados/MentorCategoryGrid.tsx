'use client';

import MentorCategoryCard from '@/components/mentorados/MentorCategoryCard';
import { MENTOR_CATEGORY_LIST } from '@/lib/mentorados/categories';
import type { MentorCategory, MentorCategoryCounts } from '@/types/mentorContent';

export default function MentorCategoryGrid({
  counts,
  selected,
  onSelect,
}: {
  counts: MentorCategoryCounts;
  selected: MentorCategory | null;
  onSelect: (category: MentorCategory | null) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Explorar por tema</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MENTOR_CATEGORY_LIST.map((category) => (
          <MentorCategoryCard
            key={category.id}
            category={category}
            count={counts[category.id] || 0}
            selected={selected === category.id}
            onSelect={() => onSelect(selected === category.id ? null : category.id)}
          />
        ))}
      </div>
    </section>
  );
}
