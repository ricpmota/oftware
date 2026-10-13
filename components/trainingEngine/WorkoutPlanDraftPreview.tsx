'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { WorkoutDraftExerciseCard } from '@/components/trainingEngine/WorkoutDraftExerciseCard';
import { WorkoutExerciseReplaceModal } from '@/components/trainingEngine/WorkoutExerciseReplaceModal';
import { PublishTrainingPlanModal } from '@/components/trainingPlan/PublishTrainingPlanModal';
import { isTrainingPlanPublishingEnabled } from '@/components/trainingPlan/ActivePublishedTrainingPlanPanel';
import {
  labelBlocker,
  labelCardioActivity,
  labelSplit,
  labelWarning,
  labelWeekday,
} from '@/lib/trainingEngine/draftLabels';
import {
  listReplacementCandidates,
  type ReplacementCandidate,
} from '@/lib/trainingEngine/listReplacementCandidates';
import { loadCatalogForTrainingEngine } from '@/lib/trainingEngine/loadCatalogForTrainingEngine';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import { workoutPlanDraftService } from '@/services/workoutPlanDraftService';
import { publishedTrainingPlanService } from '@/services/publishedTrainingPlanService';
import type { AvaliacaoAtividadeFisica } from '@/types/avaliacaoAtividadeFisica';
import type { ReviewedWorkoutPlanDraft } from '@/types/reviewedWorkoutPlanDraft';
import type { PublishedTrainingPlan } from '@/types/publishedTrainingPlan';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import type { Exercise } from '@/types/exercise';

export function isTrainingEnginePreviewEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_TRAINING_ENGINE_PREVIEW_ENABLED;
  if (v === 'false' || v === '0') return false;
  return true;
}

export type WorkoutPlanDraftPreviewProps = {
  patientId: string;
  viewerRole: 'doctor' | 'personal_trainer';
  userId: string | null | undefined;
  organizationId?: string | null;
  compact?: boolean;
};

type ReplaceTarget = {
  sessionIndex: number;
  exerciseIndex: number;
  name: string;
};

function gifProxyUrl(exerciseId: string): string {
  return `/api/exercisedb/image?exerciseId=${encodeURIComponent(exerciseId)}`;
}

export function WorkoutPlanDraftPreview({
  patientId,
  viewerRole,
  userId,
  organizationId,
  compact = false,
}: WorkoutPlanDraftPreviewProps) {
  const enabled = isTrainingEnginePreviewEnabled();

  const [assessment, setAssessment] = useState<AvaliacaoAtividadeFisica | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reviewed, setReviewed] = useState<ReviewedWorkoutPlanDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [diagOpen, setDiagOpen] = useState(false);

  const [catalog, setCatalog] = useState<Exercise[] | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ReplaceTarget | null>(null);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [candidates, setCandidates] = useState<ReplacementCandidate[]>([]);

  const [publishOpen, setPublishOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<PublishedTrainingPlan | null>(null);
  const [publishedPlan, setPublishedPlan] = useState<PublishedTrainingPlan | null>(null);
  const publishingEnabled = isTrainingPlanPublishingEnabled();

  const index: TrainingPersonalizationIndex | null =
    assessment?.trainingPersonalizationIndex &&
    assessment.trainingPersonalizationIndex.version === 1
      ? assessment.trainingPersonalizationIndex
      : null;

  const staleInfo = useMemo(() => {
    if (!reviewed || !assessment) return { stale: false, reasons: [] as string[] };
    return workoutPlanDraftService.isStale(reviewed, assessment);
  }, [reviewed, assessment]);

  const canEdit =
    reviewed != null &&
    reviewed.review.status !== 'approved' &&
    reviewed.review.status !== 'discarded' &&
    !staleInfo.stale;

  const loadAssessment = useCallback(async () => {
    if (!patientId) return;
    setLoadState('loading');
    setLoadError(null);
    try {
      const doc = await avaliacaoAtividadeFisicaService.getByPatientId(patientId);
      setAssessment(doc);
      try {
        const latest = await workoutPlanDraftService.getLatestActiveByPatientId(patientId);
        if (latest) {
          setReviewed(latest);
          setNotes(latest.review.notes || '');
        }
      } catch {
        // collection/index pode não existir ainda
      }
      setLoadState('ready');
    } catch {
      setLoadError('Não foi possível carregar a avaliação.');
      setLoadState('error');
    }
  }, [patientId]);

  useEffect(() => {
    if (!enabled) return;
    void loadAssessment();
  }, [enabled, loadAssessment]);

  /** Paciente já passou pelo fluxo automático — não reexibir/gerar por cima do personal. */
  const planAlreadySaved = Boolean(
    assessment?.patientPlanCalendar?.savedAt ||
      assessment?.patientPlanCalendar?.clearedAt ||
      assessment?.patientPlanDismissedAt
  );

  const handleGenerate = async (forceNew = false) => {
    if (!userId) {
      setActionError('Usuário não autenticado.');
      return;
    }
    setGenerating(true);
    setActionError(null);
    setActionInfo(null);
    try {
      const result = await workoutPlanDraftService.generatePreview({
        patientId,
        userId,
        viewerRole,
        organizationId,
        forceNew,
      });
      if (!result.ok) {
        setAssessment(result.assessment ?? assessment);
        setActionError(result.message);
        if (result.draft) {
          // draft bloqueado em memória (não persistimos blockers sem necessidade)
        }
        return;
      }
      setAssessment(result.assessment);
      setReviewed(result.reviewed);
      setNotes(result.reviewed.review.notes || '');
      setActionInfo(
        result.reused
          ? 'Prévia existente reutilizada para o mesmo contexto.'
          : 'Prévia gerada com sucesso.'
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Falha ao gerar prévia.');
    } finally {
      setGenerating(false);
    }
  };

  const openReplace = async (sessionIndex: number, exerciseIndex: number) => {
    if (!reviewed || !index) return;
    const ex = reviewed.workingDraft.sessions[sessionIndex]?.exercises[exerciseIndex];
    if (!ex) return;
    setReplaceTarget({ sessionIndex, exerciseIndex, name: ex.exerciseName });
    setReplaceLoading(true);
    setCandidates([]);
    try {
      let cat = catalog;
      if (!cat) {
        const loaded = await loadCatalogForTrainingEngine();
        cat = loaded.exercises;
        setCatalog(cat);
      }
      const list = listReplacementCandidates({
        draft: reviewed.workingDraft,
        index,
        catalog: cat,
        sessionIndex,
        exerciseIndex,
      });
      setCandidates(list);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Falha ao listar alternativas.');
      setReplaceTarget(null);
    } finally {
      setReplaceLoading(false);
    }
  };

  const applyReplace = async (candidate: ReplacementCandidate) => {
    if (!reviewed || !userId || !replaceTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      const next = await workoutPlanDraftService.applyReplacement({
        reviewed,
        sessionIndex: replaceTarget.sessionIndex,
        exerciseIndex: replaceTarget.exerciseIndex,
        replacement: candidate.exercise,
        changedBy: userId,
      });
      setReviewed(next);
      setReplaceTarget(null);
      setActionInfo('Exercício substituído. A prévia foi revalidada.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Falha na substituição.');
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async (sessionDayIndex: number, slotId: string) => {
    if (!reviewed) return;
    setBusy(true);
    try {
      const next = await workoutPlanDraftService.undoLastReplacementForSlot({
        reviewed,
        sessionDayIndex,
        slotId,
      });
      setReviewed(next);
      setActionInfo('Substituição desfeita.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível desfazer.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!reviewed || !userId) return;
    setBusy(true);
    setActionError(null);
    try {
      let current = reviewed;
      if (notes !== (reviewed.review.notes || '')) {
        current = await workoutPlanDraftService.updateNotes(reviewed, notes);
      }
      const next = await workoutPlanDraftService.approve({
        reviewed: current,
        userId,
        viewerRole,
        stale: staleInfo.stale,
      });
      setReviewed(next);
      setActionInfo(
        'Prévia aprovada. O plano ainda não foi disponibilizado ao paciente.'
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível aprovar.');
    } finally {
      setBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!reviewed || !userId) return;
    if (!window.confirm('Descartar esta prévia? O registro será mantido para auditoria.')) {
      return;
    }
    setBusy(true);
    try {
      const next = await workoutPlanDraftService.discard({
        reviewed,
        userId,
        viewerRole,
      });
      setReviewed(next);
      setActionInfo('Prévia descartada.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível descartar.');
    } finally {
      setBusy(false);
    }
  };

  const openPublish = async () => {
    if (!reviewed || !publishingEnabled) return;
    setActionError(null);
    try {
      const active = await publishedTrainingPlanService.getActiveByPatientId(patientId);
      setActivePlan(active);
      setPublishOpen(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível preparar a publicação.');
    }
  };

  const handlePublish = async (params: {
    title: string;
    description: string;
    startsAt: string | null;
    endsAt: string | null;
    confirmSupersede: boolean;
  }) => {
    if (!reviewed?.id || !userId) return;
    if (activePlan && !params.confirmSupersede) {
      setActionError('Confirme a substituição do plano ativo.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const plan = await publishedTrainingPlanService.publishApprovedWorkoutPlan({
        reviewedDraftId: reviewed.id,
        userId,
        viewerRole,
        title: params.title,
        description: params.description || null,
        startsAt: params.startsAt,
        endsAt: params.endsAt,
      });
      setPublishedPlan(plan);
      setPublishOpen(false);
      setActionInfo('Plano publicado com sucesso. Ainda não há sessões no calendário.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Falha ao publicar o plano.');
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return null;

  /** Já gravado no calendário pelo paciente — médico/personal não veem de novo. */
  if (loadState === 'ready' && planAlreadySaved) return null;

  const shellClass = compact
    ? 'border border-gray-200 rounded-lg px-3 py-3 space-y-3'
    : 'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40 space-y-4';

  if (loadState === 'loading' || loadState === 'idle') {
    return (
      <div className={shellClass}>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando prévia do treino…
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className={shellClass}>
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          type="button"
          onClick={() => void loadAssessment()}
          className="text-sm text-emerald-700 font-medium"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const draft = reviewed?.workingDraft;
  const canApprove =
    canEdit &&
    draft?.status === 'generated' &&
    draft.validation.valid &&
    !draft.sessions.some((s) => s.missingRequiredSlots.length > 0) &&
    reviewed?.review.status !== 'approved';

  return (
    <div className={shellClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Prévia do plano de treino
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Proposta técnica determinística — o paciente grava no calendário Personal (Criar/Hoje).
            Aqui você pode regenerar ou ajustar quando houver vínculo.
          </p>
        </div>
        {staleInfo.stale && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-2 py-1 rounded">
            Prévia desatualizada
          </span>
        )}
      </div>

      {!assessment && (
        <p className="text-sm text-slate-600">
          O paciente ainda não iniciou a avaliação de atividade física.
        </p>
      )}

      {assessment && assessment.status !== 'completed' && (
        <p className="text-sm text-slate-600">
          A avaliação ainda está em preenchimento.
          {typeof assessment.progressPercent === 'number'
            ? ` (${assessment.progressPercent}%)`
            : ''}
        </p>
      )}

      {assessment?.status === 'completed' &&
        index &&
        !index.eligibility.generationAllowed &&
        !reviewed && (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              O treino não pode ser gerado automaticamente neste momento.
            </p>
            {index.eligibility.requiresProfessionalReview && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                A avaliação possui informações que precisam de revisão profissional antes da
                geração do treino.
              </p>
            )}
            <ul className="space-y-1">
              {index.eligibility.blockers.map((b) => (
                <li key={b} className="text-xs text-slate-600">
                  · {labelBlocker(b)}
                </li>
              ))}
            </ul>
          </div>
        )}

      {assessment?.status === 'completed' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={generating || !userId}
            onClick={() => void handleGenerate(false)}
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {reviewed ? 'Abrir / regenerar prévia' : 'Gerar prévia do treino'}
          </button>
          {reviewed && (
            <button
              type="button"
              disabled={generating || !userId}
              onClick={() => void handleGenerate(true)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Gerar nova versão
            </button>
          )}
        </div>
      )}

      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}
      {actionInfo && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          {actionInfo}
        </p>
      )}

      {draft && reviewed && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700">
            <span>
              Status:{' '}
              <strong>
                {draft.status}
                {reviewed.review.status !== 'not_reviewed'
                  ? ` · ${reviewed.review.status}`
                  : ''}
              </strong>
            </span>
            <span>
              Frequência: <strong>{draft.structure.weeklyFrequency}x</strong>
            </span>
            <span>
              Duração: <strong>{draft.structure.sessionDurationMinutes} min</strong>
            </span>
            <span>
              Divisão: <strong>{labelSplit(draft.structure.splitStrategy)}</strong>
            </span>
            <span>
              Sessões: <strong>{draft.sessions.length}</strong>
            </span>
            <span>
              Exercícios:{' '}
              <strong>
                {draft.sessions.reduce((n, s) => n + s.exercises.length, 0)}
              </strong>
            </span>
          </div>

          {draft.status === 'blocked' && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-800">Geração bloqueada</p>
              {draft.eligibility.blockers.map((b) => (
                <p key={b} className="text-xs text-slate-600">
                  · {labelBlocker(b)}
                </p>
              ))}
            </div>
          )}
          {draft.status === 'unsupported_profile' && (
            <p className="text-sm text-slate-700">
              O perfil de treino ainda não é suportado pelo motor atual.
            </p>
          )}
          {draft.status === 'unsupported_split' && (
            <p className="text-sm text-slate-700">
              A divisão semanal indicada ainda precisa de montagem profissional.
            </p>
          )}
          {draft.status === 'insufficient_catalog' && (
            <div className="space-y-1">
              <p className="text-sm text-slate-700">
                O catálogo disponível não possui exercícios suficientes para preencher todos os
                componentes necessários.
              </p>
              {draft.catalogDiagnostics.missingSlots.map((s) => (
                <p key={s} className="text-xs text-slate-500">
                  · {s}
                </p>
              ))}
            </div>
          )}

          {(draft.eligibility.warnings.length > 0 || draft.validation.warnings.length > 0) && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-800">Avisos</p>
              {[...draft.eligibility.warnings, ...draft.validation.warnings].map((w, i) => (
                <p key={`${w}-${i}`} className="text-xs text-amber-800">
                  · {labelWarning(w)}
                </p>
              ))}
            </div>
          )}

          {draft.sessions.map((session, sessionIndex) => (
            <section
              key={`s-${session.dayIndex}`}
              className="rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                <h5 className="text-sm font-semibold text-slate-900">{session.title}</h5>
                <p className="text-xs text-slate-500">
                  {labelWeekday(session.weekday) || 'Dia flexível'} · Foco: {session.focus}
                </p>
              </div>
              <div className="p-3 space-y-3">
                {session.warmup && (
                  <p className="text-xs text-slate-600">
                    Aquecimento: {session.warmup.durationMinutes} minutos (dinâmico geral)
                  </p>
                )}
                {session.exercises.map((ex, exerciseIndex) => {
                  const adjusted = reviewed.manualAdjustments.some(
                    (a) =>
                      a.sessionDayIndex === session.dayIndex && a.slotId === ex.slotId
                  );
                  return (
                    <WorkoutDraftExerciseCard
                      key={`${session.dayIndex}-${ex.slotId}-${ex.exerciseId}`}
                      exercise={ex}
                      order={exerciseIndex + 1}
                      canEdit={canEdit}
                      imageUrl={gifProxyUrl(ex.exerciseId)}
                      onReplace={() => void openReplace(sessionIndex, exerciseIndex)}
                      onUndo={
                        adjusted
                          ? () => void handleUndo(session.dayIndex, ex.slotId)
                          : null
                      }
                    />
                  );
                })}
                {session.cardio && (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-700">
                    Cardio: {labelCardioActivity(session.cardio.activityCode)} ·{' '}
                    {session.cardio.durationMinutes} min · RPE{' '}
                    {session.cardio.intensity.rpeMin}–{session.cardio.intensity.rpeMax}
                  </div>
                )}
                {session.missingRequiredSlots.length > 0 && (
                  <p className="text-xs text-red-600">
                    Componentes sem exercício: {session.missingRequiredSlots.join(', ')}
                  </p>
                )}
              </div>
            </section>
          ))}

          <details
            open={diagOpen}
            onToggle={(e) => setDiagOpen((e.target as HTMLDetailsElement).open)}
            className="rounded-lg border border-slate-200"
          >
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">
              Diagnóstico da geração
            </summary>
            <div className="px-3 pb-3 text-xs text-slate-600 space-y-1">
              <p>Total recebido: {draft.catalogDiagnostics.totalExercises}</p>
              <p>Normalizados: {draft.catalogDiagnostics.normalizedExercises}</p>
              <p>Elegíveis: {draft.catalogDiagnostics.eligibleExercises}</p>
              <p>Excluídos: {draft.catalogDiagnostics.excludedExercises}</p>
              <p>
                Validação: {draft.validation.valid ? 'ok' : 'com erros'}
                {draft.validation.errors.length
                  ? ` — ${draft.validation.errors.join('; ')}`
                  : ''}
              </p>
              <p className="text-slate-400 pt-1">
                Motor {reviewed.engineVersion} · Índice v{reviewed.indexVersion} · Fingerprint
                técnico oculto na UI principal
              </p>
            </div>
          </details>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Observações da revisão
            </label>
            <textarea
              className="w-full min-h-[72px] rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              value={notes}
              disabled={!canEdit || busy}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional — não é interpretado automaticamente."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={!canApprove || busy}
              onClick={() => void handleApprove()}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Aprovar prévia
            </button>
            <button
              type="button"
              disabled={
                busy ||
                reviewed.review.status === 'discarded' ||
                reviewed.review.status === 'approved'
              }
              onClick={() => void handleDiscard()}
              className="py-2.5 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Descartar prévia
            </button>
          </div>

          {reviewed.review.status === 'approved' && (
            <div className="space-y-2">
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {publishedPlan
                  ? `Plano publicado com sucesso (versão ${publishedPlan.planVersion}).`
                  : 'Prévia aprovada. O plano ainda não foi disponibilizado ao paciente.'}
              </p>
              {publishingEnabled && !publishedPlan && (
                <button
                  type="button"
                  disabled={busy || !userId || staleInfo.stale}
                  onClick={() => void openPublish()}
                  className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  Publicar plano para o paciente
                </button>
              )}
              {publishedPlan && (
                <p className="text-xs text-slate-500">
                  Versão ativa {publishedPlan.planVersion} ·{' '}
                  {publishedPlan.sessions.length} sessões prescritas
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <WorkoutExerciseReplaceModal
        open={Boolean(replaceTarget)}
        loading={replaceLoading}
        candidates={candidates}
        currentName={replaceTarget?.name || ''}
        onClose={() => setReplaceTarget(null)}
        onSelect={(c) => void applyReplace(c)}
      />

      {reviewed && publishOpen && (
        <PublishTrainingPlanModal
          open={publishOpen}
          reviewed={reviewed}
          activePlan={activePlan}
          busy={busy}
          onClose={() => setPublishOpen(false)}
          onConfirm={(p) => void handlePublish(p)}
        />
      )}
    </div>
  );
}

export default WorkoutPlanDraftPreview;
