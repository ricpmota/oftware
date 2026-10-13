'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function MentoradosHeader({
  canManage,
  onNewContent,
  firstName,
}: {
  canManage: boolean;
  onNewContent: () => void;
  firstName?: string;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Central do Mentorado
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {firstName
            ? `Olá, ${firstName}. Continue sua jornada de aprendizado.`
            : 'Bem-vindo à Central do Mentorado'}
        </p>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
          Treinamentos, protocolos e atualizações oficiais para utilização do método e da
          plataforma Oftware.
        </p>
      </div>
      {canManage ? (
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={onNewContent}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-inverse)]"
          >
            <Plus className="h-4 w-4" />
            Nova aula
          </button>
          <Link
            href="/videosmentorados/gerenciar"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] px-4 text-sm font-medium text-[var(--text-primary)]"
          >
            Gerenciar trilhas
          </Link>
        </div>
      ) : null}
    </header>
  );
}
