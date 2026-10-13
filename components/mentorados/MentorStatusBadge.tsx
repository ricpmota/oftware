'use client';

export default function MentorStatusBadge({
  status,
  isNew,
  isUpdated,
}: {
  status?: 'draft' | 'published' | 'archived';
  isNew?: boolean;
  isUpdated?: boolean;
}) {
  if (status === 'draft') {
    return (
      <span className="rounded-full bg-[var(--state-warning)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--state-warning)]">
        Rascunho
      </span>
    );
  }
  if (status === 'archived') {
    return (
      <span className="rounded-full bg-[var(--text-secondary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Arquivado
      </span>
    );
  }
  if (isNew) {
    return (
      <span className="rounded-full bg-[var(--brand-primary)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-primary)]">
        Novo
      </span>
    );
  }
  if (isUpdated) {
    return (
      <span className="rounded-full bg-[var(--state-info)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--state-info)]">
        Atualizado
      </span>
    );
  }
  return null;
}
