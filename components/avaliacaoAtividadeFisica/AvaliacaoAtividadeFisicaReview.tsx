'use client';

import { useMemo } from 'react';
import { AvaliacaoAtividadeFisicaSummarySections } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaSummarySections';
import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import { buildSafetyAssessment } from '@/lib/avaliacaoAtividadeFisica/buildSafetyAssessment';
import type { AvaliacaoReviewEditBlock } from '@/lib/avaliacaoAtividadeFisica/questionsBasic';
import type { AvaliacaoAtividadeFisicaBasicAnswers } from '@/types/avaliacaoAtividadeFisica';

export type AvaliacaoAtividadeFisicaReviewProps = {
  answers: AvaliacaoAtividadeFisicaBasicAnswers;
  onEditBlock: (block: AvaliacaoReviewEditBlock) => void;
  onContinue: () => void;
  title?: string;
  description?: string;
  continueLabel?: string;
};

export function AvaliacaoAtividadeFisicaReview({
  answers,
  onEditBlock,
  onContinue,
  title = 'Revise sua avaliação',
  description = 'Confira suas respostas antes de concluir. Você poderá voltar e corrigir qualquer informação.',
  continueLabel = 'Concluir avaliação',
}: AvaliacaoAtividadeFisicaReviewProps) {
  const safety = useMemo(() => buildSafetyAssessment(answers), [answers]);
  const summary = useMemo(
    () => buildPhysicalActivityAssessmentSummary(answers, safety),
    [answers, safety]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>

      <AvaliacaoAtividadeFisicaSummarySections
        summary={summary}
        safety={safety}
        mode="patient_review"
        onEditBlock={onEditBlock}
      />

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
      >
        {continueLabel}
      </button>
    </div>
  );
}

export default AvaliacaoAtividadeFisicaReview;
