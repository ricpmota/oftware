'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { AvaliacaoAtividadeFisicaStatusBadge } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaStatusBadge';
import { AvaliacaoAtividadeFisicaSummarySections } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaSummarySections';
import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import {
  getDurationLabel,
  getExperienceLabel,
  getPrimaryGoalLabel,
  getTrainingLocationLabel,
} from '@/lib/avaliacaoAtividadeFisica/summaryLabels';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import type {
  AvaliacaoAtividadeFisica,
  AvaliacaoAtividadeFisicaSummary,
} from '@/types/avaliacaoAtividadeFisica';

function formatDateBr(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR');
}

function resolveSummary(assessment: AvaliacaoAtividadeFisica): AvaliacaoAtividadeFisicaSummary {
  const existing = assessment.summary;
  if (
    existing &&
    typeof existing === 'object' &&
    'version' in existing &&
    (existing as AvaliacaoAtividadeFisicaSummary).version === 1 &&
    'goalProfile' in existing
  ) {
    return existing as AvaliacaoAtividadeFisicaSummary;
  }
  return buildPhysicalActivityAssessmentSummary(assessment.answers || {}, assessment.safety);
}

export type AvaliacaoAtividadeFisicaProfessionalViewProps = {
  /** Se informado, o componente carrega via getByPatientId (lazy). */
  patientId?: string | null;
  /** Alternativa: assessment já carregado pelo container. */
  assessment?: AvaliacaoAtividadeFisica | null;
  viewerRole: 'doctor' | 'personal_trainer';
  patientName?: string | null;
  compact?: boolean;
};

export function AvaliacaoAtividadeFisicaProfessionalView({
  patientId,
  assessment: assessmentProp,
  viewerRole,
  patientName,
  compact = false,
}: AvaliacaoAtividadeFisicaProfessionalViewProps) {
  const [loading, setLoading] = useState(Boolean(patientId) && assessmentProp === undefined);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AvaliacaoAtividadeFisica | null>(
    assessmentProp ?? null
  );

  const load = useCallback(async () => {
    if (!patientId) {
      setAssessment(assessmentProp ?? null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const doc = await avaliacaoAtividadeFisicaService.getByPatientId(patientId);
      setAssessment(doc);
    } catch (e) {
      console.error('[AvaliacaoAtividadeFisicaProfessionalView] load_failure');
      setError(
        e instanceof Error
          ? e.message
          : 'Não foi possível carregar a avaliação de atividade física.'
      );
    } finally {
      setLoading(false);
    }
  }, [patientId, assessmentProp]);

  useEffect(() => {
    if (assessmentProp !== undefined && !patientId) {
      setAssessment(assessmentProp);
      setLoading(false);
      return;
    }
    void load();
  }, [load, assessmentProp, patientId]);

  // Troca de paciente: limpa estado anterior
  useEffect(() => {
    setAssessment(assessmentProp ?? null);
    setError(null);
  }, [patientId, assessmentProp]);

  const intro =
    viewerRole === 'doctor'
      ? 'Use estas informações como apoio ao acompanhamento clínico e à orientação de atividade física.'
      : 'Considere estas informações ao planejar e acompanhar os exercícios do paciente.';

  const summaryResolved = useMemo(() => {
    if (!assessment || assessment.status !== 'completed') return null;
    return resolveSummary(assessment);
  }, [assessment]);

  const shellClass = compact
    ? 'border border-gray-200 rounded-lg px-3 py-3 bg-white space-y-3'
    : 'rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 space-y-4';

  if (loading) {
    return (
      <div className={`${shellClass} flex items-center gap-2 text-sm text-slate-500`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando avaliação…
      </div>
    );
  }

  if (error) {
    return (
      <div className={shellClass}>
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">Avaliação de atividade física</h4>
          <AvaliacaoAtividadeFisicaStatusBadge status={null} />
        </div>
        <p className="text-sm text-slate-600">Avaliação de atividade física ainda não iniciada.</p>
      </div>
    );
  }

  if (assessment.status === 'draft') {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-slate-900">Avaliação de atividade física</h4>
          <AvaliacaoAtividadeFisicaStatusBadge status="draft" />
        </div>
        <p className="text-sm text-slate-600">Avaliação em preenchimento pelo paciente.</p>
        <div className="text-xs text-slate-500 space-y-0.5">
          {typeof assessment.progressPercent === 'number' && (
            <p>Progresso: {assessment.progressPercent}%</p>
          )}
          {assessment.currentStep && (
            <p>Etapa atual: {assessment.currentStep.replace(/_/g, ' ')}</p>
          )}
          {formatDateBr(assessment.updatedAt) && (
            <p>Última atualização: {formatDateBr(assessment.updatedAt)}</p>
          )}
        </div>
      </div>
    );
  }

  if (assessment.status === 'needs_review') {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-slate-900">Avaliação de atividade física</h4>
          <AvaliacaoAtividadeFisicaStatusBadge status="needs_review" />
        </div>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Esta avaliação foi sinalizada para revisão profissional.
        </p>
        <p className="text-xs text-slate-500">
          Ainda não é possível registrar parecer ou alterar o status nesta versão.
        </p>
      </div>
    );
  }

  // completed
  const summary = summaryResolved!;
  const completedAt = formatDateBr(assessment.completedAt);
  const updatedAt = formatDateBr(assessment.updatedAt);

  const quick = [
    {
      label: 'Objetivo',
      value:
        summary.goalProfile.primaryGoal === 'other'
          ? summary.goalProfile.primaryGoalOther || 'Outro'
          : getPrimaryGoalLabel(summary.goalProfile.primaryGoal),
    },
    {
      label: 'Frequência possível',
      value:
        summary.routine.availableDaysPerWeek != null
          ? `${summary.routine.availableDaysPerWeek} dias/semana`
          : '—',
    },
    {
      label: 'Tempo',
      value: getDurationLabel(summary.routine.sessionDurationMinutes),
    },
    {
      label: 'Local',
      value: getTrainingLocationLabel(summary.environment.trainingLocation),
    },
    {
      label: 'Experiência',
      value: getExperienceLabel(summary.goalProfile.experienceLevel),
    },
    {
      label: 'Segurança',
      value: assessment.safety.requiresProfessionalAttention
        ? 'Requer atenção'
        : 'Sem alertas',
    },
  ];

  return (
    <div className={shellClass}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Avaliação de atividade física</h4>
            {patientName ? (
              <p className="text-xs text-slate-500 mt-0.5">{patientName}</p>
            ) : null}
          </div>
          <AvaliacaoAtividadeFisicaStatusBadge status="completed" />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{intro}</p>
        <div className="text-xs text-slate-500 space-y-0.5">
          {completedAt && <p>Avaliação concluída em {completedAt}</p>}
          {updatedAt && <p>Última atualização: {updatedAt}</p>}
          <p>Versão do resumo: {summary.version}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {quick.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
          >
            <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-snug">{item.value}</p>
          </div>
        ))}
      </div>

      <AvaliacaoAtividadeFisicaSummarySections
        summary={summary}
        safety={assessment.safety}
        mode="professional_readonly"
        attentionIntroProfessional
        defaultOpen={false}
      />
    </div>
  );
}

export default AvaliacaoAtividadeFisicaProfessionalView;
