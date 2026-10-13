'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Brain,
  AlertTriangle,
  Droplet,
  Edit,
  Flag,
  Heart,
  HeartPulse,
  Pill,
  Scale,
  Scissors,
  ShieldAlert,
  Stethoscope,
  Target,
  Wind,
} from 'lucide-react';

/** Ícones por seção da anamnese (mesmo vocabulário visual do Perfil Metabólico). */
export const AnamneseIcons = {
  medidas: Scale,
  motivacao: Target,
  diagnostico: Stethoscope,
  comorbidades: Heart,
  cirurgias: Scissors,
  medicacoes: Pill,
  alergias: ShieldAlert,
  riscos: AlertTriangle,
  tireoide: Activity,
  renal: Droplet,
  sintomasGi: Wind,
  triagemDepressao: Brain,
  triagemIdeacao: HeartPulse,
  objetivos: Flag,
} as const satisfies Record<string, LucideIcon>;

export type AnamneseSectionIconKey = keyof typeof AnamneseIcons;

export function AnamneseTabShell({
  children,
  canEdit = false,
}: {
  children: React.ReactNode;
  canEdit?: boolean;
}) {
  return (
    <div className="w-full min-w-0 bg-surface-background">
      <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="text-xl font-semibold tracking-wide text-text-primary sm:text-[22px] dark:text-white">
            ANAMNESE
          </h4>
          <p className="text-xs text-text-secondary sm:text-sm">Respostas fornecidas pelo paciente</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() =>
              document.getElementById('anamnese-secao-indicacao')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-border-default bg-surface-card px-3 text-sm text-text-primary hover:border-brand-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus dark:text-slate-100"
          >
            <Edit className="h-3.5 w-3.5" aria-hidden />
            Editar respostas
          </button>
        )}
      </header>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export type AnamneseSectionCardProps = {
  sectionId: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
};

export function AnamneseSectionCard({
  sectionId,
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
  hideHeader = false,
}: AnamneseSectionCardProps) {
  return (
    <article
      data-anamnese-section={sectionId}
      className={`w-full min-w-0 rounded-xl border border-border-default bg-surface-card px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40 ${className}`}
    >
      {!hideHeader && (
        <div className="mb-1.5 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      <div>{children}</div>
    </article>
  );
}

/** Chips de opção (checkbox/radio) no padrão Perfil Metabólico. */
export function AnamneseChip({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/80 px-3 py-1.5 text-sm text-gray-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100 ${className}`}
    >
      {children}
    </span>
  );
}

export const anamneseFieldLabelClass =
  'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

export const anamneseInputClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';

export const anamneseInputReadonlyClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-400';
