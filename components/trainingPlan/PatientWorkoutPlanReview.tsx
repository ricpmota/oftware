'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  buildMaterializedSessionsFromDraft,
  countMaterializedSessionDocs,
  describeSessionSchedule,
  getDraftWorkingPlan,
} from '@/lib/trainingEngine/materializeDraftToTrainingSessions';
import { patientTrainingCalendarService } from '@/services/patientTrainingCalendarService';
import { workoutPlanDraftService } from '@/services/workoutPlanDraftService';
import type { ReviewedWorkoutPlanDraft } from '@/types/reviewedWorkoutPlanDraft';

export type PatientWorkoutPlanReviewProps = {
  /** pacientes_completos id */
  assessmentPatientId: string;
  /** Auth UID — trainingSessions.patientId */
  sessionPatientId: string;
  userId: string;
  patientFullName?: string | null;
  onSaved: () => void;
  onSkipToPersonal?: () => void;
};

export function PatientWorkoutPlanReview({
  assessmentPatientId,
  sessionPatientId,
  userId,
  patientFullName,
  onSaved,
  onSkipToPersonal,
}: PatientWorkoutPlanReviewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<ReviewedWorkoutPlanDraft | null>(null);
  const [weeksCount, setWeeksCount] = useState(4);
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({});

  const firstName = patientFullName?.trim().split(/\s+/)[0] || null;

  const load = useCallback(
    async (forceNew = false) => {
      setLoading(true);
      setError(null);
      try {
        const result = await workoutPlanDraftService.generatePreview({
          patientId: assessmentPatientId,
          userId,
          viewerRole: 'patient',
          forceNew,
        });
        if (!result.ok) {
          setError(result.message || 'Não foi possível montar seu treino.');
          setReviewed(null);
          return;
        }
        setReviewed(result.reviewed);
        setTitleOverrides({});
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao gerar o treino.');
        setReviewed(null);
      } finally {
        setLoading(false);
      }
    },
    [assessmentPatientId, userId]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const draft = reviewed ? getDraftWorkingPlan(reviewed) : null;
  const preview = draft
    ? buildMaterializedSessionsFromDraft({ draft, weeksCount, titleOverrides })
    : [];
  const totalSessions = countMaterializedSessionDocs(preview);

  const handleSave = async () => {
    if (!reviewed) return;
    for (const plan of preview) {
      if (!plan.title.trim()) {
        setError(`Informe um nome para o treino “${plan.seriesKey}”.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await patientTrainingCalendarService.saveDraftToPersonalCalendar({
        assessmentPatientId,
        sessionPatientId,
        userId,
        reviewed,
        weeksCount,
        titleOverrides,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gravar o treino.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm">Montando seu treino…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-medium text-emerald-700">Seu plano de treino</p>
          <h1 className="text-lg font-semibold text-slate-900 mt-0.5">
            {firstName ? `${firstName}, revise e grave seus treinos` : 'Revise e grave seus treinos'}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Cada bloco vira uma série na aba Criar: um nome (ex.: Costas), os dias da semana (ex.:
            segunda e quinta) e a repetição por algumas semanas. Outro bloco (ex.: Peito) fica em
            outra série.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-800">
              Gravar por quantas semanas?
            </label>
            <div className="flex gap-2">
              {[2, 4, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeeksCount(n)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border ${
                    weeksCount === n
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {n} semanas
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {preview.length} treino{preview.length === 1 ? '' : 's'} distinto
              {preview.length === 1 ? '' : 's'} · {totalSessions} ocorrência
              {totalSessions === 1 ? '' : 's'} no calendário
            </p>
          </div>

          {preview.map((session) => (
            <section
              key={session.seriesKey}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-2">
                <label className="block text-xs font-medium text-slate-500">
                  Nome deste treino
                </label>
                <input
                  type="text"
                  value={session.title}
                  onChange={(e) =>
                    setTitleOverrides((prev) => ({
                      ...prev,
                      [session.seriesKey]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Ex.: Costas, Peito, Superior"
                />
                <p className="text-xs text-slate-500">{describeSessionSchedule(session)}</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {session.exercises.map((ex, i) => (
                  <li key={`${ex.exerciseId}-${i}`} className="px-4 py-3 flex gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      {ex.gifUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ex.gifUrl} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{ex.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ex.prescription?.sets ?? '—'} séries · {ex.prescription?.reps ?? '—'}{' '}
                        reps · descanso {ex.prescription?.restSec ?? '—'}s
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-col gap-2 pt-2 pb-8">
            <button
              type="button"
              disabled={saving || !reviewed || preview.length === 0}
              onClick={() => void handleSave()}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Gravar treinos no calendário
            </button>
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => void load(true)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Gerar nova versão
            </button>
            {onSkipToPersonal && (
              <button
                type="button"
                onClick={onSkipToPersonal}
                className="w-full py-2 text-sm text-slate-500 underline underline-offset-2"
              >
                Ver o Personal sem gravar agora
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default PatientWorkoutPlanReview;
