'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, SkipForward, Timer } from 'lucide-react';
import { describeRpeRange } from '@/lib/trainingEngine/rpePatientCopy';
import { trainingSessionExecutionService } from '@/services/trainingSessionExecutionService';
import type {
  TrainingSessionDifficulty,
  TrainingSessionExecution,
} from '@/types/trainingSessionExecution';
import { SKIP_REASON_OPTIONS } from '@/types/trainingSessionExecution';

export type TrainingSessionExecutionWorkspaceProps = {
  executionId: string;
  userId: string;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TrainingSessionExecutionWorkspace({
  executionId,
  userId,
}: TrainingSessionExecutionWorkspaceProps) {
  const router = useRouter();
  const [execution, setExecution] = useState<TrainingSessionExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);

  const [repsDraft, setRepsDraft] = useState<Record<number, string>>({});
  const [loadDraft, setLoadDraft] = useState<Record<number, string>>({});
  const [rpeDraft, setRpeDraft] = useState<Record<number, string>>({});

  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState('equipment_busy');
  const [showFinish, setShowFinish] = useState(false);
  const [overallRpe, setOverallRpe] = useState('');
  const [difficulty, setDifficulty] = useState<TrainingSessionDifficulty | ''>('');
  const [pain, setPain] = useState<boolean | null>(null);
  const [painRegions, setPainRegions] = useState('');
  const [finishNotes, setFinishNotes] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await trainingSessionExecutionService.getById(executionId);
      if (!doc) {
        setError('Treino não encontrado.');
        setExecution(null);
        return;
      }
      if (doc.patientUserId !== userId) {
        setError('Você não tem acesso a este treino.');
        setExecution(null);
        return;
      }
      setExecution(doc);
      setExerciseIndex(doc.currentExerciseIndex || 0);
    } catch {
      setError('Não foi possível carregar o treino.');
    } finally {
      setLoading(false);
    }
  }, [executionId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!execution || execution.status !== 'in_progress') return;
    const started = new Date(execution.timing.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [execution]);

  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  const exercise = execution?.exercises[exerciseIndex] || null;

  const progressLabel = useMemo(() => {
    if (!execution) return '';
    const done = execution.exercises.filter(
      (e) => e.status === 'completed' || e.status === 'skipped'
    ).length;
    return `${done}/${execution.exercises.length} exercícios`;
  }, [execution]);

  const startRest = (seconds: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestSecondsLeft(seconds);
    restTimerRef.current = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev == null || prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestSecondsLeft(null);
  };

  const goToExercise = async (next: number) => {
    if (!execution) return;
    const max = execution.exercises.length - 1;
    const index = Math.min(Math.max(0, next), max);
    setExerciseIndex(index);
    try {
      await trainingSessionExecutionService.setCurrentExerciseIndex({
        executionId,
        userId,
        index,
      });
    } catch {
      // local ok
    }
  };

  const completeSet = async (setIndex: number) => {
    if (!execution || !exercise) return;
    setBusy(true);
    setError(null);
    try {
      const repsRaw = repsDraft[setIndex];
      const loadRaw = loadDraft[setIndex];
      const rpeRaw = rpeDraft[setIndex];
      const repetitions =
        repsRaw != null && repsRaw !== '' ? Number(repsRaw.replace(',', '.')) : null;
      const loadValue =
        loadRaw != null && loadRaw !== '' ? Number(loadRaw.replace(',', '.')) : null;
      const rpe = rpeRaw != null && rpeRaw !== '' ? Number(rpeRaw.replace(',', '.')) : null;

      const next = await trainingSessionExecutionService.updateSetExecution({
        executionId,
        userId,
        executionExerciseId: exercise.executionExerciseId,
        setIndex,
        repetitions: Number.isFinite(repetitions as number) ? repetitions : null,
        loadValue: Number.isFinite(loadValue as number) ? loadValue : null,
        loadUnit: loadValue != null ? 'kg' : null,
        rpe: Number.isFinite(rpe as number) ? rpe : null,
        status: 'completed',
      });
      setExecution(next);
      startRest(exercise.snapshot.prescribedRestSeconds);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar série.');
    } finally {
      setBusy(false);
    }
  };

  const handleSkipExercise = async () => {
    if (!execution || !exercise) return;
    setBusy(true);
    try {
      const next = await trainingSessionExecutionService.skipExercise({
        executionId,
        userId,
        executionExerciseId: exercise.executionExerciseId,
        reason: skipReason,
      });
      setExecution(next);
      setShowSkip(false);
      if (exerciseIndex < next.exercises.length - 1) {
        await goToExercise(exerciseIndex + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao pular exercício.');
    } finally {
      setBusy(false);
    }
  };

  const handleWarmup = async (status: 'completed' | 'skipped') => {
    setBusy(true);
    try {
      await trainingSessionExecutionService.updateWarmup({
        executionId,
        userId,
        status,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao atualizar aquecimento.');
    } finally {
      setBusy(false);
    }
  };

  const handleCardio = async (status: 'completed' | 'skipped') => {
    setBusy(true);
    try {
      await trainingSessionExecutionService.updateCardio({
        executionId,
        userId,
        status,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao atualizar cardio.');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!execution) return;
    const pendingLeft = execution.exercises.some(
      (e) => e.status === 'pending' || e.status === 'in_progress'
    );
    if (pendingLeft) {
      const ok = window.confirm(
        'Existem exercícios ou séries não concluídos. Deseja finalizar mesmo assim?'
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const regions = pain
        ? painRegions
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      await trainingSessionExecutionService.completeSessionExecution({
        executionId,
        userId,
        overallRpe: overallRpe ? Number(overallRpe) : null,
        difficulty: difficulty || null,
        painDuringSession: pain,
        painRegions: regions,
        notes: finishNotes || null,
      });
      setShowFinish(false);
      router.push('/meta/personal');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao concluir treino.');
    } finally {
      setBusy(false);
    }
  };

  const handleAbandon = async () => {
    if (!window.confirm('Abandonar este treino? O que já foi registrado será preservado.')) {
      return;
    }
    setBusy(true);
    try {
      await trainingSessionExecutionService.abandonSessionExecution({
        executionId,
        userId,
      });
      router.push('/meta/personal');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao abandonar.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0A1F44]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error && !execution) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 px-4 bg-slate-50">
        <p className="text-sm text-red-600 text-center">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/meta/personal')}
          className="text-sm text-emerald-700 font-medium"
        >
          Voltar ao Personal
        </button>
      </div>
    );
  }

  if (!execution || !exercise) return null;

  const finished = execution.status !== 'in_progress';

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-3 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push('/meta/personal')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {execution.sessionSnapshot.title}
            </p>
            <p className="text-[11px] text-slate-500">
              {progressLabel} · {formatDuration(elapsed)}
            </p>
          </div>
          <button
            type="button"
            disabled={busy || finished}
            onClick={() => setShowFinish(true)}
            className="text-xs font-semibold text-emerald-700 px-2 py-1"
          >
            Finalizar
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-3 py-4 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {execution.warmup && execution.warmup.status === 'pending' && !finished && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 space-y-2">
            <p className="text-sm font-medium text-amber-900">
              Aquecimento · {execution.warmup.plannedDurationMinutes} min
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleWarmup('completed')}
                className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
              >
                Feito
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleWarmup('skipped')}
                className="px-3 py-2 rounded-lg border border-amber-300 text-sm text-amber-900"
              >
                Pular
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Exercício {exerciseIndex + 1} de {execution.exercises.length}
          </span>
          <span className="uppercase tracking-wide text-emerald-700">
            {exercise.status === 'skipped'
              ? 'Pulado'
              : exercise.status === 'completed'
                ? 'Concluído'
                : 'Em andamento'}
          </span>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          <div className="flex gap-3">
            <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0">
              {exercise.snapshot.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={exercise.snapshot.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                {exercise.snapshot.exerciseName}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {exercise.snapshot.prescribedSets} séries ·{' '}
                {exercise.snapshot.prescribedRepetitionRange.min}–
                {exercise.snapshot.prescribedRepetitionRange.max} reps · descanso{' '}
                {exercise.snapshot.prescribedRestSeconds}s
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {describeRpeRange(
                  exercise.snapshot.prescribedTargetRpe.min,
                  exercise.snapshot.prescribedTargetRpe.max
                )}
              </p>
            </div>
          </div>

          {exercise.snapshot.instructions.length > 0 && (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer font-medium">Instruções</summary>
              <ol className="list-decimal pl-4 mt-2 space-y-1">
                {exercise.snapshot.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </details>
          )}

          {restSecondsLeft != null && restSecondsLeft > 0 && (
            <div className="rounded-xl bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Descanso {formatDuration(restSecondsLeft)}
                </span>
              </div>
              <button type="button" onClick={skipRest} className="text-xs underline">
                Pular descanso
              </button>
            </div>
          )}

          <div className="space-y-3">
            {exercise.sets.map((set) => (
              <div
                key={set.setIndex}
                className="rounded-xl border border-slate-100 px-3 py-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">
                    Série {set.setIndex}
                  </p>
                  {set.status === 'completed' && (
                    <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Feita
                    </span>
                  )}
                  {set.status === 'skipped' && (
                    <span className="text-[10px] text-slate-400">Pulada</span>
                  )}
                </div>
                {set.status === 'pending' && !finished && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-[11px] text-slate-500 space-y-1">
                        Reps
                        <input
                          inputMode="numeric"
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          placeholder={`${exercise.snapshot.prescribedRepetitionRange.min}–${exercise.snapshot.prescribedRepetitionRange.max}`}
                          value={repsDraft[set.setIndex] ?? ''}
                          onChange={(e) =>
                            setRepsDraft((d) => ({ ...d, [set.setIndex]: e.target.value }))
                          }
                        />
                      </label>
                      <label className="text-[11px] text-slate-500 space-y-1">
                        Carga (kg)
                        <input
                          inputMode="decimal"
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          placeholder="opc."
                          value={loadDraft[set.setIndex] ?? ''}
                          onChange={(e) =>
                            setLoadDraft((d) => ({ ...d, [set.setIndex]: e.target.value }))
                          }
                        />
                      </label>
                      <label className="text-[11px] text-slate-500 space-y-1">
                        RPE
                        <input
                          inputMode="numeric"
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          placeholder={`${exercise.snapshot.prescribedTargetRpe.min}–${exercise.snapshot.prescribedTargetRpe.max}`}
                          value={rpeDraft[set.setIndex] ?? ''}
                          onChange={(e) =>
                            setRpeDraft((d) => ({ ...d, [set.setIndex]: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void completeSet(set.setIndex)}
                      className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      Concluir série
                    </button>
                  </>
                )}
                {set.status === 'completed' && (
                  <p className="text-xs text-slate-600">
                    {set.repetitions != null ? `${set.repetitions} reps` : '—'}
                    {set.load.value != null ? ` · ${set.load.value} kg` : ''}
                    {set.rpe != null ? ` · RPE ${set.rpe}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!finished && exercise.status !== 'skipped' && (
            <button
              type="button"
              onClick={() => setShowSkip(true)}
              className="w-full py-2 text-sm text-slate-500 flex items-center justify-center gap-1"
            >
              <SkipForward className="w-4 h-4" />
              Pular exercício
            </button>
          )}
        </article>

        {execution.cardio && (
          <div className="rounded-xl border border-slate-200 px-3 py-3 space-y-2">
            <p className="text-sm font-medium text-slate-800">
              Cardio · {execution.cardio.plannedDurationMinutes} min
            </p>
            {execution.cardio.status === 'pending' && !finished ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCardio('completed')}
                  className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-sm"
                >
                  Feito
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCardio('skipped')}
                  className="px-3 py-2 rounded-lg border text-sm"
                >
                  Pular
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Status: {execution.cardio.status}</p>
            )}
          </div>
        )}

        <div className="flex gap-2 pb-8">
          <button
            type="button"
            disabled={exerciseIndex <= 0}
            onClick={() => void goToExercise(exerciseIndex - 1)}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Anterior
          </button>
          <button
            type="button"
            disabled={exerciseIndex >= execution.exercises.length - 1}
            onClick={() => void goToExercise(exerciseIndex + 1)}
            className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-1"
          >
            Próximo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {!finished && (
          <button
            type="button"
            onClick={() => void handleAbandon()}
            className="w-full text-xs text-red-600 pb-6"
          >
            Abandonar treino
          </button>
        )}
      </main>

      {showSkip && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setShowSkip(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Pular exercício</h3>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
            >
              {SKIP_REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2 border rounded-lg text-sm"
                onClick={() => setShowSkip(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm"
                onClick={() => void handleSkipExercise()}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinish && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowFinish(false)}
          />
          <div className="relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Concluir treino</h3>
            <label className="block text-xs text-slate-600 space-y-1">
              Esforço geral (RPE 1–10)
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                inputMode="numeric"
                value={overallRpe}
                onChange={(e) => setOverallRpe(e.target.value)}
              />
            </label>
            <label className="block text-xs text-slate-600 space-y-1">
              Dificuldade
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as TrainingSessionDifficulty | '')}
              >
                <option value="">Selecionar</option>
                <option value="very_easy">Muito fácil</option>
                <option value="easy">Fácil</option>
                <option value="adequate">Adequada</option>
                <option value="hard">Difícil</option>
                <option value="very_hard">Muito difícil</option>
              </select>
            </label>
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Sentiu dor durante o treino?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPain(false)}
                  className={`flex-1 py-2 rounded-lg border text-sm ${pain === false ? 'border-emerald-500 bg-emerald-50' : ''}`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => setPain(true)}
                  className={`flex-1 py-2 rounded-lg border text-sm ${pain === true ? 'border-amber-500 bg-amber-50' : ''}`}
                >
                  Sim
                </button>
              </div>
              {pain === true && (
                <>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Regiões (ex.: joelho, lombar)"
                    value={painRegions}
                    onChange={(e) => setPainRegions(e.target.value)}
                  />
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                    Interrompa o exercício que causa dor e converse com o profissional responsável
                    antes de repeti-lo.
                  </p>
                </>
              )}
            </div>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[72px]"
              placeholder="Observações (opcional)"
              value={finishNotes}
              onChange={(e) => setFinishNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2.5 border rounded-lg text-sm"
                onClick={() => setShowFinish(false)}
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={busy}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                onClick={() => void handleComplete()}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Concluir treino'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingSessionExecutionWorkspace;
