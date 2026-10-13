'use client';

import { Search } from 'lucide-react';

export default function MentorSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar aulas, treinamentos e temas..."
        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] py-3 pl-11 pr-4 text-base text-[var(--text-primary)] outline-none transition-shadow placeholder:text-[var(--text-secondary)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--border-focus)]/20"
        aria-label="Buscar aulas, treinamentos e temas"
      />
    </div>
  );
}
