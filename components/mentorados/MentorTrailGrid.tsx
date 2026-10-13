'use client';

import MentorTrailCard from '@/components/mentorados/MentorTrailCard';
import type { MentorTrailCardDto } from '@/types/mentorTrail';

export default function MentorTrailGrid({
  trails,
  canManage,
  onCreate,
}: {
  trails: MentorTrailCardDto[];
  canManage?: boolean;
  onCreate?: () => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Trilhas</h2>
      {trails.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-default)] px-6 py-10 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">Treinamentos</p>
          {canManage ? (
            <>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Nenhuma trilha criada.</p>
              <button
                type="button"
                onClick={onCreate}
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)]"
              >
                + Criar primeira trilha
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              As primeiras trilhas de treinamento estarão disponíveis em breve.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trails.map((trail) => (
            <MentorTrailCard key={trail.id} trail={trail} />
          ))}
        </div>
      )}
    </section>
  );
}
