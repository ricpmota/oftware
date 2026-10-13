'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CheckCircle, ChevronLeft, Loader2, User, UtensilsCrossed, X } from 'lucide-react';
import { CheckInSemanalNutriProgress } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriProgress';
import { CheckInSemanalNutriQuestionRenderer } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriQuestionRenderer';
import { CheckInSemanalNutriScoreCard } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriScoreCard';
import { calcularScoreCheckInSemanalNutriForVersion } from '@/lib/nutri/calcularScoreCheckInSemanalNutri';
import {
  checkInSemanalNutriAnswersToForm,
  emptyCheckInSemanalNutriForm,
  formToCheckInSemanalNutriAnswers,
  validateCheckInSemanalNutriQuestion,
  type CheckInSemanalNutriFormState,
} from '@/lib/nutri/checkInSemanalNutriForm';
import {
  CHECK_IN_SEMANAL_NUTRI_STEP_LABEL,
  visibleCheckInSemanalNutriQuestions,
} from '@/lib/nutri/checkInSemanalNutriQuestions';
import type {
  CheckInSemanalNutriAnswers,
  CheckInSemanalNutriQuestionnaireVersion,
  CheckInSemanalNutriSuplementosAplicaveis,
  CheckInSemanalNutriWizardMode,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import { CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION, SUPLEMENTOS_APLICAVEIS_TODOS } from '@/lib/nutri/checkInSemanalNutriTypes';
import type { CheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriV3';
import { formatNutritionWeekLongLabel, type NutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

const INTRO_STEP = 0;

export type { CheckInSemanalNutriWizardMode };

export type CheckInSemanalNutriWizardProps = {
  mode: CheckInSemanalNutriWizardMode;
  week: NutritionWeek;
  pacienteNome?: string;
  nutricionistaNome?: string;
  metaAguaMl?: number;
  menuContext?: CheckInMenuContext | null;
  questionnaireVersion?: CheckInSemanalNutriQuestionnaireVersion;
  suplementosAplicaveis?: CheckInSemanalNutriSuplementosAplicaveis;
  initialData?: Partial<CheckInSemanalNutriAnswers> | null;
  alreadyCompleted?: boolean;
  initialScore?: number;
  onSubmit: (answers: CheckInSemanalNutriAnswers) => Promise<void>;
  onClose?: () => void;
  onGoToHistory?: () => void;
  canEdit?: boolean;
};

function formatarNomePaciente(nomeCompleto: string | undefined) {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/).filter((p) => p.length > 0);
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

export function CheckInSemanalNutriWizard({
  mode,
  week,
  pacienteNome,
  nutricionistaNome,
  metaAguaMl,
  menuContext = null,
  questionnaireVersion = CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION,
  suplementosAplicaveis = SUPLEMENTOS_APLICAVEIS_TODOS,
  initialData,
  alreadyCompleted = false,
  initialScore,
  onSubmit,
  onClose,
  onGoToHistory,
  canEdit = true,
}: CheckInSemanalNutriWizardProps) {
  const [step, setStep] = useState(INTRO_STEP);
  const [form, setForm] = useState<CheckInSemanalNutriFormState>(() =>
    checkInSemanalNutriAnswersToForm(initialData, questionnaireVersion)
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(alreadyCompleted);
  const [scoreFinal, setScoreFinal] = useState<number | null>(initialScore ?? null);
  const openedAlreadyCompleted = useRef(alreadyCompleted);

  const visible = useMemo(
    () =>
      visibleCheckInSemanalNutriQuestions(
        {
          answers: form,
          suplementosAplicaveis,
          metaAguaMl,
          hasMenu: Boolean(menuContext?.meals.length),
        },
        questionnaireVersion
      ),
    [form, menuContext?.meals.length, metaAguaMl, questionnaireVersion, suplementosAplicaveis]
  );

  const questionCount = visible.length;
  const totalSteps = INTRO_STEP + questionCount + 1;
  const isIntro = step === INTRO_STEP;
  const questionIndex = step - 1;
  const currentQuestion =
    questionIndex >= 0 && questionIndex < questionCount ? visible[questionIndex] : null;
  const isLastStep = step === questionCount;

  useEffect(() => {
    if (step > questionCount) {
      setStep(questionCount);
    }
  }, [questionCount, step]);
  const progress = ((step + 1) / Math.max(1, totalSteps)) * 100;
  const stepLabel = `${step + 1} de ${totalSteps}`;
  const groupLabel = isIntro
    ? 'Check-in Semanal Nutri'
    : currentQuestion
      ? CHECK_IN_SEMANAL_NUTRI_STEP_LABEL[currentQuestion.step]
      : 'Check-in Semanal Nutri';

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErro(null);
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    if (isIntro) return true;
    if (!currentQuestion) return true;
    const msg = validateCheckInSemanalNutriQuestion(currentQuestion, form);
    if (msg) {
      setErro(msg);
      return false;
    }
    setErro(null);
    return true;
  }, [currentQuestion, form, isIntro]);

  const handleSubmit = useCallback(async () => {
    const visibleIds = new Set(visible.map((q) => q.id));
    const answers = formToCheckInSemanalNutriAnswers(form, visibleIds, {
      version: questionnaireVersion,
      menuContext,
    });
    setEnviando(true);
    setErro(null);
    try {
      await onSubmit(answers);
      const score = calcularScoreCheckInSemanalNutriForVersion(answers, questionnaireVersion).score;
      setScoreFinal(score);
      setSucesso(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  }, [form, menuContext, onSubmit, questionnaireVersion, visible]);

  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) return;
    if (isLastStep) {
      await handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }, [handleSubmit, isLastStep, validateCurrentStep]);

  const handleBack = useCallback(() => {
    if (step > INTRO_STEP) {
      setStep((s) => s - 1);
      setErro(null);
    }
  }, [step]);

  const weekLabel = formatNutritionWeekLongLabel(week);
  const hint = currentQuestion?.hintFromContext?.({
    answers: form,
    suplementosAplicaveis,
    metaAguaMl,
    hasMenu: Boolean(menuContext?.meals.length),
  });
  const greetingName = formatarNomePaciente(pacienteNome);

  if (sucesso) {
    return (
      <div className="min-h-0 flex-1 flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto w-full max-w-lg md:max-w-2xl">
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
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h1 className="text-xl font-semibold text-slate-900 mb-1">
                  {openedAlreadyCompleted.current ? 'Check-in concluído' : 'Perfeito!'}
                </h1>
                <p className="text-sm text-slate-700">
                  {openedAlreadyCompleted.current
                    ? 'Seu Check-in Semanal já foi enviado.'
                    : 'Seu check-in semanal foi enviado.'}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Seu nutricionista poderá acompanhar sua evolução e usar essas informações no seu planejamento.
                </p>
                <p className="text-xs text-slate-400 mt-2">{weekLabel}</p>
              </div>
              {scoreFinal != null ? (
                <div className="mb-4">
                  <CheckInSemanalNutriScoreCard score={scoreFinal} />
                </div>
              ) : null}
              <div className="space-y-2">
                {onGoToHistory ? (
                  <button
                    type="button"
                    onClick={onGoToHistory}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    Ver meu histórico
                  </button>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSucesso(false);
                      setStep(INTRO_STEP);
                      setErro(null);
                    }}
                    className="w-full py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50"
                  >
                    Editar Check-in
                  </button>
                ) : null}
                {onClose && !onGoToHistory ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    Fechar
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <CheckInSemanalNutriProgress
        progress={progress}
        stepLabel={stepLabel}
        groupLabel={groupLabel}
        onClose={onClose}
      />

      <div className="flex-1 flex flex-col max-w-lg md:max-w-2xl mx-auto w-full px-4 md:px-6 pt-3 pb-4 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto"
          >
            {isIntro ? (
              <>
                {mode === 'public' ? (
                  <p className="text-base font-semibold text-emerald-800 mb-1">
                    {greetingName ? `Olá, ${greetingName}!` : 'Olá!'}
                  </p>
                ) : null}
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
                  Check-in Semanal Nutri
                </h1>
                <p className="text-base font-semibold text-slate-800 mb-2">{weekLabel}</p>
                <p className="text-sm text-slate-600 mb-2">
                  {mode === 'public'
                    ? 'Seu nutricionista quer saber como foi cada dia da sua semana e como você se relacionou com o cardápio planejado.'
                    : questionnaireVersion === 'nutri_weekly_v3'
                      ? 'Conte como foi cada dia da semana e como você se relacionou com o cardápio. O sistema calcula a aderência.'
                      : 'Conte como foi sua alimentação, rotina e bem-estar durante esta semana. Isso ajuda seu nutricionista a acompanhar sua evolução.'}
                </p>
                {mode === 'nutritionist' ? (
                  <p className="text-xs text-slate-500 mb-5">Preenchimento em nome do paciente.</p>
                ) : (
                  <div className="mb-5" />
                )}
                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-4 mb-4">
                  {nutricionistaNome ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] text-white">
                        <UtensilsCrossed className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Nutricionista
                        </p>
                        <p className="text-sm font-semibold text-slate-900">{nutricionistaNome}</p>
                      </div>
                    </div>
                  ) : null}
                  {mode !== 'public' && pacienteNome ? (
                    <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Paciente</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatarNomePaciente(pacienteNome)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-sky-700 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">Semana</p>
                      <p className="text-sm font-semibold text-slate-900">{weekLabel}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : currentQuestion ? (
              <CheckInSemanalNutriQuestionRenderer
                question={currentQuestion}
                value={form[currentQuestion.id] || ''}
                hint={hint}
                onChange={(v) => updateField(currentQuestion.id, v)}
                week={week}
                menuContext={menuContext}
              />
            ) : null}

            {erro ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {erro}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] mt-auto bg-gradient-to-t from-white via-white to-transparent">
          <div className="flex gap-3">
            {step > INTRO_STEP ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={enviando}
                className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleNext}
              disabled={enviando}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 disabled:opacity-70"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                </>
              ) : isIntro ? (
                'Responder Check-in Semanal'
              ) : isLastStep ? (
                'Salvar check-in'
              ) : (
                'Responder'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function resetCheckInSemanalNutriForm(): CheckInSemanalNutriFormState {
  return emptyCheckInSemanalNutriForm();
}
