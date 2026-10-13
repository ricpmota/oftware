'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export type DashboardDepoimento = {
  instanceKey: string;
  pacienteId: string;
  nome: string;
  cidadeEstado: string | null;
  idade: number | null;
  depoimento: string;
  estrelas: number;
  pesoInicialKg: number | null;
  pesoAtualKg: number | null;
  perdaTotalKg: number | null;
  perdaPercentual: number | null;
  evolucao: { weekIndex: number; peso: number; doseMg: number }[];
  photoUrl?: string | null;
};

type Props = {
  depoimento: DashboardDepoimento;
  onOpen: () => void;
};

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function DashboardPatientAvatar({
  nome,
  photoUrl,
  sizeClass = 'h-10 w-10 text-[12px]',
}: {
  nome: string;
  photoUrl?: string | null;
  sizeClass?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = photoUrl?.trim() || '';
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ backgroundColor: 'var(--shell-avatar-bg, #0A1F44)', color: 'var(--shell-avatar-text, #fff)' }}
      aria-hidden
    >
      {initials(nome)}
    </div>
  );
}

export default function DashboardTestimonialCard({ depoimento, onOpen }: Props) {
  const meta = [depoimento.idade != null ? `${depoimento.idade} anos` : null, depoimento.cidadeEstado]
    .filter(Boolean)
    .join(' · ');
  const hasEvolucao = depoimento.evolucao.length > 0;

  return (
    <article
      className="flex w-[min(85%,20rem)] shrink-0 snap-start flex-col rounded-[16px] border bg-white p-4"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <div className="flex items-start gap-3">
        <DashboardPatientAvatar nome={depoimento.nome} photoUrl={depoimento.photoUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{depoimento.nome}</p>
          {meta ? <p className="truncate text-[12px] text-[var(--text-secondary)]">{meta}</p> : null}
          <div className="mt-1 flex items-center gap-0.5" aria-label={`${depoimento.estrelas} de 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={13}
                className={s <= (depoimento.estrelas || 0) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-[var(--text-primary)]">
        “{depoimento.depoimento}”
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-[12px] font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Ver depoimento completo
        </button>
        {hasEvolucao ? (
          <button
            type="button"
            onClick={onOpen}
            className="text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Ver evolução
          </button>
        ) : null}
      </div>
    </article>
  );
}
