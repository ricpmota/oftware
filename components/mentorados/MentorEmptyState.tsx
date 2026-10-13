'use client';

import { Plus } from 'lucide-react';

export default function MentorEmptyState({
  canManage,
  onAdd,
}: {
  canManage: boolean;
  onAdd?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">
        Ainda não há aulas nesta categoria.
      </p>
      {canManage ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-inverse)]"
        >
          <Plus className="h-4 w-4" />
          Adicionar aula
        </button>
      ) : (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Novos treinamentos serão disponibilizados aqui.
        </p>
      )}
    </div>
  );
}
