'use client';

import { useState } from 'react';
import {
  labelCardioActivity,
  labelExerciseRole,
  labelMuscle,
  labelSplit,
  labelWeekday,
} from '@/lib/trainingEngine/draftLabels';
import { describeRpeRange } from '@/lib/trainingEngine/rpePatientCopy';
import type { PublishedTrainingPlan } from '@/types/publishedTrainingPlan';

export type PublishedTrainingPlanViewProps = {
  plan: PublishedTrainingPlan;
  mode: 'professional' | 'patient';
  compact?: boolean;
  onCancel?: (() => void) | null;
  cancelling?: boolean;
  /** Sessão prescrita em andamento (patient). */
  inProgressPrescribedSessionId?: string | null;
  onStartSession?: ((prescribedSessionId: string) => void) | null;
  onContinueSession?: (() => void) | null;
  startingSessionId?: string | null;
};

export function PublishedTrainingPlanView({
  plan,
  mode,
  compact = false,
  onCancel = null,
  cancelling = false,
  inProgressPrescribedSessionId = null,
  onStartSession = null,
  onContinueSession = null,
  startingSessionId = null,
}: PublishedTrainingPlanViewProps) {
  const [openSession, setOpenSession] = useState<number | null>(0);
  const isPatient = mode === 'patient';

  const shell = compact
    ? 'border border-gray-200 rounded-lg px-3 py-3 space-y-3'
    : 'rounded-xl border border-gray-200 bg-white p-4 space-y-4 dark:border-gray-700 dark:bg-gray-900/40';

  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {isPatient ? 'Meu plano de treino' : plan.title}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Versão {plan.planVersion}
            {plan.status === 'active' ? ' · Ativo' : ` · ${plan.status}`}
            {' · '}
            {plan.structure.weeklyFrequency}x/semana · {plan.structure.sessionDurationMinutes}{' '}
            min · {labelSplit(plan.structure.splitStrategy)}
          </p>
        </div>
        {mode === 'professional' && plan.status === 'active' && onCancel && (
          <button
            type="button"
            disabled={cancelling}
            onClick={onCancel}
            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            Cancelar plano
          </button>
        )}
      </div>

      {plan.description && !isPatient && (
        <p className="text-sm text-slate-600">{plan.description}</p>
      )}

      {!isPatient && (
        <p className="text-[11px] text-slate-400">
          Publicado em{' '}
          {plan.lifecycle.publishedAt
            ? new Date(plan.lifecycle.publishedAt).toLocaleDateString('pt-BR')
            : '—'}
          {plan.lifecycle.startsAt
            ? ` · Início ${new Date(plan.lifecycle.startsAt).toLocaleDateString('pt-BR')}`
            : ''}
          {plan.lifecycle.endsAt
            ? ` · Fim ${new Date(plan.lifecycle.endsAt).toLocaleDateString('pt-BR')}`
            : ''}
        </p>
      )}

      <div className="space-y-3">
        {plan.sessions.map((session, idx) => {
          const open = openSession === idx;
          const dayLabel =
            labelWeekday(session.weekday) ||
            (isPatient ? `Sessão ${idx + 1}` : session.title);
          return (
            <section
              key={session.sessionId}
              className="rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-2"
                onClick={() => setOpenSession(open ? null : idx)}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{dayLabel}</p>
                  <p className="text-xs text-slate-500">
                    {session.exercises.length} exercício
                    {session.exercises.length === 1 ? '' : 's'}
                    {!isPatient ? ` · ${session.focus}` : ''}
                  </p>
                </div>
                <span className="text-xs text-slate-400">{open ? 'Ocultar' : 'Ver'}</span>
              </button>

              {open && (
                <div className="p-3 space-y-3">
                  {session.warmup && (
                    <p className="text-xs text-slate-600">
                      Aquecimento: {session.warmup.durationMinutes} minutos
                    </p>
                  )}

                  {session.exercises.map((ex, i) => (
                    <article
                      key={ex.planExerciseId}
                      className="rounded-lg border border-slate-100 p-3 space-y-2"
                    >
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          {ex.media.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ex.media.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {i + 1}. {ex.sourceExerciseName}
                          </p>
                          {!isPatient && (
                            <p className="text-[11px] text-emerald-700">
                              {labelExerciseRole(ex.role)}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {ex.primaryMuscles.map(labelMuscle).join(', ')}
                            {ex.equipment.length ? ` · ${ex.equipment.join(', ')}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs text-slate-700">
                        <span>
                          <strong>{ex.prescription.sets}</strong> séries
                        </span>
                        <span>
                          <strong>
                            {ex.prescription.repetitionRange.min}–
                            {ex.prescription.repetitionRange.max}
                          </strong>{' '}
                          reps
                        </span>
                        <span>
                          Descanso: <strong>{ex.prescription.restSeconds}s</strong>
                        </span>
                        <span>
                          Esforço:{' '}
                          <strong>
                            {ex.prescription.targetRpe.min}–{ex.prescription.targetRpe.max}
                          </strong>
                        </span>
                      </div>
                      {isPatient && (
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {describeRpeRange(
                            ex.prescription.targetRpe.min,
                            ex.prescription.targetRpe.max
                          )}
                        </p>
                      )}
                      {ex.instructions.length > 0 && (
                        <ol className="list-decimal pl-4 space-y-0.5">
                          {ex.instructions.slice(0, isPatient ? 6 : 10).map((step, si) => (
                            <li key={si} className="text-[11px] text-slate-600">
                              {step}
                            </li>
                          ))}
                        </ol>
                      )}
                    </article>
                  ))}

                  {session.cardio && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-700">
                      Cardio: {labelCardioActivity(session.cardio.activityCode)} ·{' '}
                      {session.cardio.durationMinutes} min
                    </div>
                  )}

                  {isPatient && (onStartSession || onContinueSession) && (
                    <div className="pt-1">
                      {inProgressPrescribedSessionId === session.sessionId &&
                      onContinueSession ? (
                        <button
                          type="button"
                          onClick={onContinueSession}
                          className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
                        >
                          Continuar treino
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            Boolean(inProgressPrescribedSessionId) ||
                            startingSessionId === session.sessionId
                          }
                          onClick={() => onStartSession?.(session.sessionId)}
                          className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {startingSessionId === session.sessionId
                            ? 'Iniciando…'
                            : inProgressPrescribedSessionId
                              ? 'Finalize o treino em andamento'
                              : 'Iniciar treino'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default PublishedTrainingPlanView;
