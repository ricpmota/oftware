'use client';

import { Sparkles, AlertTriangle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { getBioQualityInsight } from '@/utils/bioImpedanciaMetrics';
import { BIO_CARD, BIO_CARD_PAD } from '@/components/bodymap/bioImpedanciaTokens';

const ICON_BY_TYPE = {
  excelente: Sparkles,
  gordura_predominante: TrendingDown,
  atencao_massa_magra: AlertTriangle,
  recomposicao: TrendingUp,
  piora: AlertTriangle,
  plato: Minus,
  neutro: Sparkles,
} as const;

const ACCENT_BY_TYPE = {
  excelente: 'border-emerald-200 bg-emerald-50/60',
  gordura_predominante: 'border-teal-200 bg-teal-50/60',
  atencao_massa_magra: 'border-amber-200 bg-amber-50/60',
  recomposicao: 'border-emerald-200 bg-emerald-50/60',
  piora: 'border-red-200 bg-red-50/60',
  plato: 'border-gray-200 bg-gray-50/80',
  neutro: 'border-gray-200 bg-gray-50/80',
} as const;

export interface BioQualityInsightCardProps {
  registroAtual: BioImpedanciaRegistro;
  registroAnterior: BioImpedanciaRegistro | null;
}

export function BioQualityInsightCard({ registroAtual, registroAnterior }: BioQualityInsightCardProps) {
  const insight = getBioQualityInsight(registroAtual, registroAnterior);
  const Icon = ICON_BY_TYPE[insight.type];

  return (
    <div className={`${BIO_CARD} ${BIO_CARD_PAD} border-l-4 ${ACCENT_BY_TYPE[insight.type]}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
          <Icon className="h-4 w-4 text-gray-700" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Qualidade do emagrecimento
          </p>
          <h4 className="text-sm font-semibold text-gray-900 leading-snug">{insight.title}</h4>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}
