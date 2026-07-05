'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Droplet,
  Flag,
  Heart,
  Pill,
  Scale,
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
  medicacoes: Pill,
  alergias: ShieldAlert,
  riscos: AlertTriangle,
  tireoide: Activity,
  renal: Droplet,
  sintomasGi: Wind,
  objetivos: Flag,
} as const satisfies Record<string, LucideIcon>;

export type AnamneseSectionIconKey = keyof typeof AnamneseIcons;

export function AnamneseTabShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 to-transparent px-4 py-3 dark:border-violet-900/40 dark:from-violet-950/20">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Anamnese</h4>
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
          Histórico clínico, medidas e perfil metabólico do paciente
        </p>
      </div>
      <div className="space-y-4">{children}</div>
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
};

export function AnamneseSectionCard({
  sectionId,
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
}: AnamneseSectionCardProps) {
  return (
    <article
      data-anamnese-section={sectionId}
      className={`rounded-lg border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80 ${className}`}
    >
      <div className="mb-4 flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
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
