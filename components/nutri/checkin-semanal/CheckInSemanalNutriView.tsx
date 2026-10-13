'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { CheckInSemanalNutriDetails } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriDetails';
import { CheckInSemanalNutriWizard } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriWizard';
import {
  canCreateWeeklyNutritionCheckIn,
  canEditWeeklyNutritionCheckIn,
  resolveCheckInSemanalNutriInteraction,
  type CheckInSemanalNutriInteraction,
} from '@/lib/nutri/canEditWeeklyNutritionCheckIn';
import {
  getCheckInSemanalNutriCapabilities,
  type CheckInSemanalNutriViewerRole,
} from '@/lib/nutri/checkInSemanalNutriCapabilities';
import { loadCheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriMenuContextStore';
import {
  formatWeeklyNutritionCheckInFillWindowLabel,
  getWeeklyNutritionCheckInFillWindow,
  isWeeklyNutritionCheckInFillWindowOpen,
  type NutriWeeklyCheckInSchedule,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import { loadNutriWeeklyCheckInScheduleForPatient } from '@/lib/nutri/checkInSemanalNutriScheduleStore';
import { loadCheckInSemanalNutri, saveCheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriStore';
import type {
  CheckInSemanalNutri,
  CheckInSemanalNutriAnswers,
  CheckInSemanalNutriAnsweredBy,
  CheckInSemanalNutriSource,
  CheckInSemanalNutriWizardMode,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import { CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION, isWeeklyNutritionQuestionnaireV3 } from '@/lib/nutri/checkInSemanalNutriTypes';
import type { CheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriV3';
import {
  getNutritionCheckInReferenceWeek,
  getNutritionWeek,
  getPreviousNutritionWeek,
  isNutritionCheckInFutureWeek,
  type NutritionWeek,
} from '@/lib/nutri/checkInSemanalNutriWeek';

type Props = {
  pacienteId: string;
  pacienteNome?: string;
  nutricionistaNome?: string;
  nutritionistId?: string;
  metaAguaMl?: number;
  mode: CheckInSemanalNutriWizardMode;
  answeredBy: CheckInSemanalNutriAnsweredBy;
  source: CheckInSemanalNutriSource;
  answeredById?: string;
  week?: NutritionWeek;
  intent?: CheckInSemanalNutriInteraction;
  readOnly?: boolean;
  viewerRole?: CheckInSemanalNutriViewerRole;
  onClose?: () => void;
  onGoToHistory?: (weekKey: string) => void;
};

/**
 * Carrega/salva um Check-in Semanal (semana de referência ou weekKey explícita).
 * Não depende de router do /meta, Auth ou modal do NutriContent.
 */
export function CheckInSemanalNutriView({
  pacienteId,
  pacienteNome,
  nutricionistaNome,
  nutritionistId,
  metaAguaMl,
  mode,
  answeredBy,
  source,
  answeredById,
  week: weekProp,
  intent,
  readOnly = false,
  viewerRole = 'patient',
  onClose,
  onGoToHistory,
}: Props) {
  const weekKey = weekProp?.weekKey || weekProp?.weekStart || '';
  const week = useMemo(
    () => (weekKey ? getNutritionWeek(weekKey) : getNutritionCheckInReferenceWeek()),
    [weekKey]
  );
  const capabilities = useMemo(
    () => getCheckInSemanalNutriCapabilities(viewerRole),
    [viewerRole]
  );
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<CheckInSemanalNutri | null>(null);
  const [previous, setPrevious] = useState<CheckInSemanalNutri | null>(null);
  const [menuContext, setMenuContext] = useState<CheckInMenuContext | null>(null);
  const [schedule, setSchedule] = useState<NutriWeeklyCheckInSchedule | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<CheckInSemanalNutriInteraction>('create');

  const canEdit = canEditWeeklyNutritionCheckIn({
    weekKey: week.weekKey,
    readOnly,
    capabilities,
  });
  const canCreate = canCreateWeeklyNutritionCheckIn({
    weekKey: week.weekKey,
    readOnly,
    capabilities,
    schedule,
  });
  const fillWindow = getWeeklyNutritionCheckInFillWindow({ week, schedule });
  const fillWindowOpen = isWeeklyNutritionCheckInFillWindowOpen({ week, schedule });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    const previousWeek = getPreviousNutritionWeek(week);
    Promise.all([
      loadCheckInSemanalNutri(pacienteId, week.weekKey),
      loadCheckInSemanalNutri(pacienteId, previousWeek.weekKey),
      loadCheckInMenuContext(pacienteId),
      loadNutriWeeklyCheckInScheduleForPatient(pacienteId, nutritionistId),
    ])
      .then(([record, previousRecord, menu, loadedSchedule]) => {
        if (cancelled) return;
        setExisting(record);
        setPrevious(previousRecord);
        setSchedule(loadedSchedule);
        setMenuContext(menu.meals.length > 0 ? menu : { meals: [], aguaDia_ml: menu.aguaDia_ml });
        setInteraction(
          resolveCheckInSemanalNutriInteraction({
            hasRecord: Boolean(record),
            canEdit: canEditWeeklyNutritionCheckIn({
              weekKey: week.weekKey,
              readOnly,
              capabilities,
            }),
            canCreate: canCreateWeeklyNutritionCheckIn({
              weekKey: week.weekKey,
              readOnly,
              capabilities,
              schedule: loadedSchedule,
            }),
            requested: intent,
          })
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setErro(err instanceof Error ? err.message : 'Não foi possível carregar o check-in.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Recarregar só quando muda o paciente, a semana ou o nutricionista — não a cada re-render do modal pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId, week.weekKey, nutritionistId]);

  const handleSubmit = useCallback(
    async (answers: CheckInSemanalNutriAnswers) => {
      if (isNutritionCheckInFutureWeek(week.weekKey)) {
        throw new Error('Não é possível preencher um check-in de semana futura.');
      }
      if (!existing && !canCreateWeeklyNutritionCheckIn({ weekKey: week.weekKey, readOnly, capabilities, schedule })) {
        throw new Error('Este check-in ainda não está liberado.');
      }
      if (!canEditWeeklyNutritionCheckIn({ weekKey: week.weekKey, readOnly, capabilities })) {
        throw new Error('Esta semana não pode mais ser editada.');
      }
      const saved = await saveCheckInSemanalNutri({
        pacienteId,
        week,
        answers,
        answeredBy,
        source,
        answeredById,
        nutritionistId,
        scheduledDate:
          existing?.scheduledDate ||
          getWeeklyNutritionCheckInFillWindow({ week, schedule }).scheduledDate,
      });
      setExisting(saved);
    },
    [answeredBy, answeredById, capabilities, existing, nutritionistId, pacienteId, readOnly, schedule, source, week]
  );

  if (loading) {
    return (
      <div className="flex h-full min-h-[16rem] flex-1 items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Carregando" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-white px-4 text-center">
        <p className="text-sm text-red-600">{erro}</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Voltar
          </button>
        ) : null}
      </div>
    );
  }

  if (interaction === 'view' && existing) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 md:px-6 py-6">
          {onClose ? (
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : null}
          <CheckInSemanalNutriDetails record={existing} viewerRole={viewerRole} previous={previous} />
          <div className="mt-5 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {canEdit ? (
              <button
                type="button"
                onClick={() => setInteraction('edit')}
                className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
              >
                Editar Check-in
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50"
              >
                Fechar
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (interaction === 'view' && !existing) {
    return (
      <div className="min-h-0 flex-1 flex flex-col items-center justify-center bg-white px-4 text-center">
        <p className="font-semibold text-slate-900">
          {isNutritionCheckInFutureWeek(week.weekKey)
            ? 'Esta semana ainda não está disponível para preenchimento.'
            : !fillWindowOpen
              ? 'Check-in ainda não liberado.'
              : 'Check-in da semana ainda não respondido'}
        </p>
        {!isNutritionCheckInFutureWeek(week.weekKey) && !fillWindowOpen ? (
          <p className="mt-2 text-sm text-slate-600">
            Disponível a partir de {formatWeeklyNutritionCheckInFillWindowLabel(fillWindow)}.
          </p>
        ) : null}
        {canCreate ? (
          <button
            type="button"
            onClick={() => setInteraction('create')}
            className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Preencher Check-in
          </button>
        ) : null}
        {onClose ? (
          <button type="button" onClick={onClose} className="mt-3 text-sm font-semibold text-slate-600">
            Fechar
          </button>
        ) : null}
      </div>
    );
  }

  if (!existing && !canCreate) {
    return (
      <div className="min-h-0 flex-1 flex flex-col items-center justify-center bg-white px-4 text-center">
        <p className="font-semibold text-slate-900">
          {isNutritionCheckInFutureWeek(week.weekKey)
            ? 'Esta semana ainda não está disponível para preenchimento.'
            : !fillWindowOpen
              ? 'Check-in ainda não liberado.'
              : 'Check-in da semana ainda não respondido'}
        </p>
        {!isNutritionCheckInFutureWeek(week.weekKey) && !fillWindowOpen ? (
          <p className="mt-2 text-sm text-slate-600">
            Disponível a partir de {formatWeeklyNutritionCheckInFillWindowLabel(fillWindow)}.
          </p>
        ) : null}
        {onClose ? (
          <button type="button" onClick={onClose} className="mt-3 text-sm font-semibold text-slate-600">
            Fechar
          </button>
        ) : null}
      </div>
    );
  }

  const questionnaireVersion = existing?.questionnaireVersion ?? CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION;
  const wizardMenu = isWeeklyNutritionQuestionnaireV3(questionnaireVersion)
    ? existing?.menuSnapshot ?? menuContext
    : null;
  const wizardMetaAgua = wizardMenu?.aguaDia_ml ?? metaAguaMl ?? menuContext?.aguaDia_ml;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CheckInSemanalNutriWizard
        key={`${week.weekKey}-${questionnaireVersion}`}
        mode={mode}
        week={week}
        pacienteNome={pacienteNome}
        nutricionistaNome={nutricionistaNome}
        metaAguaMl={wizardMetaAgua}
        menuContext={wizardMenu}
        questionnaireVersion={questionnaireVersion}
        initialData={existing}
        alreadyCompleted={false}
        initialScore={existing?.score}
        canEdit={canEdit}
        onSubmit={handleSubmit}
        onClose={onClose}
        onGoToHistory={onGoToHistory ? () => onGoToHistory(week.weekKey) : undefined}
      />
    </div>
  );
}
