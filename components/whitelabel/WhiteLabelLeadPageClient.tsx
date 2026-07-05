'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { WHITELABEL_LEAD_QUESTIONS } from '@/lib/whiteLabel/leadWhiteLabelQuestions';
import { formatLeadWhiteLabelWhatsAppDisplay } from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import { createClientEvent } from '@/lib/whiteLabel/clientTrackingEvents';
import WhiteLabelMeetingScheduler from '@/components/whitelabel/WhiteLabelMeetingScheduler';
import WhiteLabelMeetingReview from '@/components/whitelabel/WhiteLabelMeetingReview';
import WhiteLabelMeetingSuccess from '@/components/whitelabel/WhiteLabelMeetingSuccess';
import type { WhiteLabelClientEvent } from '@/types/whiteLabelClientEvents';
import type { WhiteLabelAvailabilityApiRow } from '@/types/whiteLabelAvailability';

const QUESTION_STEPS = WHITELABEL_LEAD_QUESTIONS.length;
const SCHEDULER_STEP = QUESTION_STEPS;
const REVIEW_STEP = QUESTION_STEPS + 1;
const TOTAL_STEPS = REVIEW_STEP + 1;

const SLOT_UNAVAILABLE_MSG =
  'Esse horário acabou de ser reservado por outro médico. Escolha outro horário disponível.';

type FormState = Record<string, string>;

const INITIAL_FORM: FormState = Object.fromEntries(
  WHITELABEL_LEAD_QUESTIONS.map((q) => [q.key, ''])
);

type MeetingInfo = {
  date: string;
  startTime: string;
  endTime: string;
  googleMeetLink?: string;
  status: 'scheduled' | 'error';
};

function maskWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '');
  return formatLeadWhiteLabelWhatsAppDisplay(digits);
}

export default function WhiteLabelLeadPageClient() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<WhiteLabelAvailabilityApiRow | null>(null);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [clientEvents, setClientEvents] = useState<WhiteLabelClientEvent[]>([]);
  const [schedulerReloadKey, setSchedulerReloadKey] = useState(0);
  const [schedulerViewTracked, setSchedulerViewTracked] = useState(false);

  const isSchedulerStep = step === SCHEDULER_STEP;
  const isReviewStep = step === REVIEW_STEP;
  const currentQuestion = step < SCHEDULER_STEP ? WHITELABEL_LEAD_QUESTIONS[step] : null;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const appendClientEvent = useCallback((event: WhiteLabelClientEvent) => {
    setClientEvents((prev) => {
      const exists = prev.some(
        (e) => e.type === event.type && e.createdAt === event.createdAt
      );
      if (exists) return prev;
      return [...prev, event];
    });
  }, []);

  const trackSchedulerViewed = useCallback(() => {
    if (schedulerViewTracked) return;
    setSchedulerViewTracked(true);
    appendClientEvent(createClientEvent('scheduler_viewed'));
  }, [schedulerViewTracked, appendClientEvent]);

  useEffect(() => {
    if (isSchedulerStep) {
      trackSchedulerViewed();
    }
  }, [isSchedulerStep, trackSchedulerViewed]);

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }, []);

  const handleSlotSelect = useCallback(
    (slot: WhiteLabelAvailabilityApiRow) => {
      setSelectedSlot(slot);
      setError('');
      appendClientEvent(
        createClientEvent('scheduler_slot_selected', {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })
      );
    },
    [appendClientEvent]
  );

  const validateCurrentStep = useCallback((): boolean => {
    if (isReviewStep) return true;

    if (isSchedulerStep) {
      if (!selectedSlot) {
        setError('Selecione um horário para a reunião.');
        return false;
      }
      setError('');
      return true;
    }

    const q = WHITELABEL_LEAD_QUESTIONS[step];
    const value = (form[q.key] || '').trim();

    if (!value) {
      setError('Este campo é obrigatório.');
      return false;
    }

    if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Informe um e-mail válido.');
      return false;
    }

    if (q.type === 'tel') {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10) {
        setError('Informe um WhatsApp válido.');
        return false;
      }
    }

    setError('');
    return true;
  }, [form, step, isSchedulerStep, isReviewStep, selectedSlot]);

  const submitForm = useCallback(async () => {
    if (!selectedSlot) return;

    const confirmedEvent = createClientEvent('meeting_confirmed', {
      date: selectedSlot.date,
      startTime: selectedSlot.startTime,
    });
    const eventsPayload = [...clientEvents, confirmedEvent];

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/whitelabel/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form,
          availabilityId: selectedSlot.id,
          clientEvents: eventsPayload,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        meeting?: MeetingInfo;
      };

      if (!res.ok) {
        if (data.code === 'SLOT_UNAVAILABLE') {
          setSelectedSlot(null);
          setStep(SCHEDULER_STEP);
          setSchedulerReloadKey((k) => k + 1);
          setError(SLOT_UNAVAILABLE_MSG);
          return;
        }
        throw new Error(data.error || 'Erro ao enviar formulário.');
      }

      if (data.meeting) {
        setMeetingInfo(data.meeting);
      }
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [form, selectedSlot, clientEvents]);

  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) return;

    if (step < SCHEDULER_STEP) {
      setStep((s) => s + 1);
      return;
    }

    if (isSchedulerStep) {
      setStep(REVIEW_STEP);
      setError('');
      return;
    }

    if (isReviewStep) {
      await submitForm();
    }
  }, [validateCurrentStep, step, isSchedulerStep, isReviewStep, submitForm]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      setError('');
    }
  }, [step]);

  const stepLabel = useMemo(() => `${step + 1} de ${TOTAL_STEPS}`, [step]);

  if (success) {
    const resolvedMeeting: MeetingInfo | null =
      meetingInfo ||
      (selectedSlot
        ? {
            date: selectedSlot.date,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            status: 'error',
          }
        : null);
    if (resolvedMeeting) {
      return <WhiteLabelMeetingSuccess meeting={resolvedMeeting} doctorName={form.nome} />;
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3 md:max-w-2xl">
          <div className="flex items-center justify-between mb-2">
            <img src="/oftware1.jpg" alt="Oftware" className="h-8 w-auto object-contain" />
            <span className="text-xs font-medium text-slate-500">{stepLabel}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 md:max-w-2xl">
        <div className="mb-6">
          {step === 0 && (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
                Mentoria White Label Oftware
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Descubra se você tem perfil para transformar sua experiência médica em uma operação
                digital escalável com sua própria marca.
              </p>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {isSchedulerStep ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-2 leading-snug">
                  Escolha o melhor horário para conversarmos sobre sua operação White Label
                </label>
                <p className="text-sm text-slate-500 mb-4">
                  Selecione o dia e o horário que melhor se encaixam na sua agenda.
                </p>
                <WhiteLabelMeetingScheduler
                  selectedId={selectedSlot?.id || null}
                  onSelect={handleSlotSelect}
                  onViewed={trackSchedulerViewed}
                  slotConflictError={error.includes('reservado') ? error : undefined}
                  reloadKey={schedulerReloadKey}
                />
              </>
            ) : isReviewStep && selectedSlot ? (
              <WhiteLabelMeetingReview form={form} slot={selectedSlot} />
            ) : currentQuestion ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-4 leading-snug">
                  {currentQuestion.label}
                </label>

                {currentQuestion.type === 'choice' && currentQuestion.options ? (
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((option) => {
                      const selected = form[currentQuestion.key] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField(currentQuestion.key, option)}
                          className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-all ${
                            selected
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type={currentQuestion.type === 'tel' ? 'tel' : currentQuestion.type}
                    value={form[currentQuestion.key] || ''}
                    onChange={(e) => {
                      const val =
                        currentQuestion.type === 'tel'
                          ? maskWhatsApp(e.target.value)
                          : e.target.value;
                      updateField(currentQuestion.key, val);
                    }}
                    placeholder={currentQuestion.placeholder}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                    autoComplete={
                      currentQuestion.type === 'email'
                        ? 'email'
                        : currentQuestion.type === 'tel'
                          ? 'tel'
                          : 'name'
                    }
                  />
                )}
              </>
            ) : null}

            {error && !error.includes('reservado') && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 pt-6 pb-4 mt-auto bg-gradient-to-t from-white via-white to-transparent">
          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm sm:text-base hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirmando...
                </>
              ) : isReviewStep ? (
                'Confirmar agendamento'
              ) : isSchedulerStep ? (
                'Revisar agendamento'
              ) : step === QUESTION_STEPS - 1 ? (
                'Próximo: agendar reunião'
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
