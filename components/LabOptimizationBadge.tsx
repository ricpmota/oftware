'use client';

import type { LabRange } from '@/types/labRanges';
import {
  getLabOptimizationStatus,
  getLabExamMeta,
  type OptimizationStatus,
  type ReferenceStatus,
} from '@/lib/labExames/labOptimization';

interface LabOptimizationBadgeProps {
  examKey: string;
  value: number | null | undefined;
  range: LabRange | null;
  compact?: boolean;
}

const BADGE_STYLES: Record<string, string> = {
  ideal: 'bg-green-100 text-green-800 border-green-200',
  optimize: 'bg-amber-50 text-amber-800 border-amber-200',
  outOfRange: 'bg-red-100 text-red-800 border-red-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
};

function getBadgeConfig(
  refStatus: ReferenceStatus,
  optStatus: OptimizationStatus,
  meta: ReturnType<typeof getLabExamMeta>
): { label: string; style: string; detail?: string } {
  if (meta?.qualitative) {
    return { label: 'Qualitativo', style: BADGE_STYLES.neutral };
  }

  if (meta?.optional && meta?.scoreEligible === false) {
    return { label: 'Complementar', style: BADGE_STYLES.neutral };
  }

  if (refStatus === 'unknown' || optStatus === 'unknown') {
    return { label: 'Sem avaliação', style: BADGE_STYLES.neutral };
  }

  if (refStatus === 'below_reference') {
    return { label: 'Fora da referência', style: BADGE_STYLES.outOfRange, detail: 'Abaixo da referência laboratorial' };
  }
  if (refStatus === 'above_reference') {
    return { label: 'Fora da referência', style: BADGE_STYLES.outOfRange, detail: 'Acima da referência laboratorial' };
  }

  if (optStatus === 'ideal') {
    return { label: 'Ideal Oftware', style: BADGE_STYLES.ideal, detail: 'Dentro do ideal Oftware' };
  }

  if (optStatus === 'above_ideal') {
    return { label: 'Otimizar', style: BADGE_STYLES.optimize, detail: 'Dentro da referência, mas acima do ideal' };
  }
  if (optStatus === 'below_ideal') {
    return { label: 'Otimizar', style: BADGE_STYLES.optimize, detail: 'Dentro da referência, mas abaixo do ideal' };
  }
  if (optStatus === 'normal_but_not_ideal') {
    return { label: 'Otimizar', style: BADGE_STYLES.optimize, detail: 'Normal, porém fora do alvo metabólico' };
  }

  if (optStatus === 'not_applicable') {
    return { label: 'Complementar', style: BADGE_STYLES.neutral };
  }

  return { label: 'Sem avaliação', style: BADGE_STYLES.neutral };
}

function formatIdealText(meta: ReturnType<typeof getLabExamMeta>): string | null {
  if (!meta?.ideal) return null;
  const { min, max, targetQuartile } = meta.ideal;

  if (min != null && max != null) return `Ideal Oftware: ${min}–${max}`;
  if (max != null) return `Ideal Oftware: até ${max}`;
  if (min != null) return `Ideal Oftware: acima de ${min}`;

  switch (targetQuartile) {
    case 'LOW': return 'Meta: quartil baixo';
    case 'HIGH': return 'Meta: quartil alto';
    case 'MID': return 'Meta: faixa intermediária';
    default: return null;
  }
}

export function LabOptimizationBadge({ examKey, value, range, compact }: LabOptimizationBadgeProps) {
  const meta = getLabExamMeta(examKey);
  if (!meta) return null;

  const result = getLabOptimizationStatus({ value, range, meta });
  const badge = getBadgeConfig(result.referenceStatus, result.optimizationStatus, meta);
  const idealText = formatIdealText(meta);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.style}`}
        title={badge.detail || badge.label}
      >
        {badge.label}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.style}`}>
        {badge.label}
      </span>
      {idealText && (
        <span className="text-[10px] text-gray-500">{idealText}</span>
      )}
    </div>
  );
}
