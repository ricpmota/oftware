'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PublishedTrainingPlanView } from '@/components/trainingPlan/PublishedTrainingPlanView';
import { publishedTrainingPlanService } from '@/services/publishedTrainingPlanService';
import { trainingSessionExecutionService } from '@/services/trainingSessionExecutionService';
import type { PublishedTrainingPlan } from '@/types/publishedTrainingPlan';
import type { TrainingSessionExecution } from '@/types/trainingSessionExecution';

export function isTrainingPlanPublishingEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_TRAINING_PLAN_PUBLISHING_ENABLED;
  if (v === 'false' || v === '0') return false;
  return true;
}

export function isTrainingSessionExecutionEnabled(): boolean {
  // Desligado por padrão: execução canônica é a aba Hoje (trainingSessions).
  // Só liga com true / 1 explícito.
  const v = process.env.NEXT_PUBLIC_TRAINING_SESSION_EXECUTION_ENABLED;
  return v === 'true' || v === '1';
}

export type ActivePublishedTrainingPlanPanelProps = {
  patientId: string;
  mode: 'professional' | 'patient';
  viewerRole?: 'doctor' | 'personal_trainer';
  userId?: string | null;
  compact?: boolean;
};

export function ActivePublishedTrainingPlanPanel({
  patientId,
  mode,
  viewerRole = 'doctor',
  userId = null,
  compact = false,
}: ActivePublishedTrainingPlanPanelProps) {
  const router = useRouter();
  const enabled = isTrainingPlanPublishingEnabled();
  const executionEnabled = isTrainingSessionExecutionEnabled();

  const [plan, setPlan] = useState<PublishedTrainingPlan | null>(null);
  const [versions, setVersions] = useState<PublishedTrainingPlan[]>([]);
  const [inProgress, setInProgress] = useState<TrainingSessionExecution | null>(null);
  const [recent, setRecent] = useState<TrainingSessionExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!patientId || !enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const active = await publishedTrainingPlanService.getActiveByPatientId(patientId);
      setPlan(active);
      if (mode === 'professional') {
        const list = await publishedTrainingPlanService.listVersionsByPatientId(patientId, 10);
        setVersions(list);
      }
      if (executionEnabled && (mode === 'patient' || mode === 'professional')) {
        const [ip, rec] = await Promise.all([
          trainingSessionExecutionService.getInProgressByPatientId(patientId),
          trainingSessionExecutionService.listRecentByPatientId(patientId, 8),
        ]);
        setInProgress(ip);
        setRecent(rec.filter((e) => e.status !== 'in_progress'));
      }
    } catch {
      setError('Não foi possível carregar o plano de treino.');
    } finally {
      setLoading(false);
    }
  }, [patientId, enabled, mode, executionEnabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleStart = async (prescribedSessionId: string) => {
    if (!plan?.id || !userId || !executionEnabled) return;
    if (inProgress) {
      if (inProgress.source.prescribedSessionId === prescribedSessionId) {
        router.push(`/meta/personal/treino/${inProgress.id}`);
        return;
      }
      const abandon = window.confirm(
        'Já existe um treino em andamento. Deseja abandoná-lo e iniciar este?'
      );
      if (!abandon) return;
      try {
        await trainingSessionExecutionService.abandonSessionExecution({
          executionId: inProgress.id!,
          userId,
          reason: 'started_another_session',
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível abandonar o treino anterior.');
        return;
      }
    }
    setStartingSessionId(prescribedSessionId);
    setError(null);
    try {
      const clientRequestId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `req_${Date.now()}`;
      const execution = await trainingSessionExecutionService.startSessionExecution({
        publishedPlanId: plan.id,
        prescribedSessionId,
        userId,
        clientRequestId,
      });
      router.push(`/meta/personal/treino/${execution.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar o treino.');
    } finally {
      setStartingSessionId(null);
    }
  };

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando plano…
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="text-sm text-red-600 space-y-1">
        <p>{error}</p>
        <button
          type="button"
          className="text-emerald-700 text-xs font-medium"
          onClick={() => void reload()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div
        className={
          compact
            ? 'border border-gray-200 rounded-lg px-3 py-3'
            : 'rounded-xl border border-dashed border-gray-200 px-4 py-3'
        }
      >
        <p className="text-sm text-slate-600">
          {mode === 'patient'
            ? 'Nenhum plano ativo no momento.'
            : 'Nenhum plano publicado ativo para este paciente.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {mode === 'patient' && inProgress && executionEnabled && (
        <button
          type="button"
          onClick={() => router.push(`/meta/personal/treino/${inProgress.id}`)}
          className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left"
        >
          <p className="text-sm font-semibold text-emerald-900">Treino em andamento</p>
          <p className="text-xs text-emerald-800 mt-0.5">
            {inProgress.sessionSnapshot.title} · toque para continuar
          </p>
        </button>
      )}

      <PublishedTrainingPlanView
        plan={plan}
        mode={mode}
        compact={compact}
        cancelling={cancelling}
        inProgressPrescribedSessionId={
          mode === 'patient' ? inProgress?.source.prescribedSessionId ?? null : null
        }
        startingSessionId={startingSessionId}
        onContinueSession={
          mode === 'patient' && inProgress
            ? () => router.push(`/meta/personal/treino/${inProgress.id}`)
            : null
        }
        onStartSession={
          mode === 'patient' && executionEnabled && userId
            ? (sid) => void handleStart(sid)
            : null
        }
        onCancel={
          mode === 'professional' && userId
            ? async () => {
                if (!window.confirm('Cancelar o plano ativo? O histórico será preservado.')) {
                  return;
                }
                setCancelling(true);
                try {
                  await publishedTrainingPlanService.cancelPlan({
                    planId: plan.id!,
                    userId,
                    viewerRole,
                  });
                  await reload();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Falha ao cancelar.');
                } finally {
                  setCancelling(false);
                }
              }
            : null
        }
      />

      {executionEnabled && recent.length > 0 && (
        <div className="rounded-xl border border-slate-200 px-3 py-3 space-y-2">
          <p className="text-xs font-semibold text-slate-700">Treinos recentes</p>
          <ul className="space-y-1.5">
            {recent.slice(0, 5).map((e) => {
              const done = e.exercises.filter(
                (x) => x.status === 'completed' || x.status === 'skipped'
              ).length;
              const mins =
                e.timing.durationSeconds != null
                  ? Math.round(e.timing.durationSeconds / 60)
                  : null;
              return (
                <li key={e.id} className="text-xs text-slate-600 flex justify-between gap-2">
                  <span className="truncate">
                    {new Date(e.timing.startedAt).toLocaleDateString('pt-BR')} ·{' '}
                    {e.sessionSnapshot.title}
                  </span>
                  <span className="shrink-0 text-slate-400">
                    {e.status}
                    {mins != null ? ` · ${mins} min` : ''} · {done}/{e.exercises.length}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {mode === 'professional' && versions.length > 1 && (
        <div>
          <button
            type="button"
            className="text-xs font-medium text-slate-600 underline"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? 'Ocultar versões anteriores' : 'Ver versões anteriores'}
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1">
              {versions
                .filter((v) => v.id !== plan.id)
                .map((v) => (
                  <li key={v.id} className="text-xs text-slate-500">
                    Versão {v.planVersion} · {v.status} · {v.title}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ActivePublishedTrainingPlanPanel;
