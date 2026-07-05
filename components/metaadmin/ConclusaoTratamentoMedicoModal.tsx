'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  Hash,
  Loader2,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { DigitalMeasurePicker } from '@/components/aplicacao/DigitalMeasurePicker';
import { formatarVariacaoMedida, toneVariacaoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';
import { obterMedidasReferenciaPaciente } from '@/lib/aplicacao/checkInSemanalFormUtils';
import { CONCLUSAO_QUESTIONS, type ConclusaoQuestion } from '@/lib/conclusao/conclusaoQuestions';
import {
  calcularMetricasConclusao,
  conclusaoFormFromPaciente,
} from '@/lib/conclusao/conclusaoFormUtils';
import { salvarConclusaoMedicoNoPaciente } from '@/lib/conclusao/salvarConclusaoMedicoNoPaciente';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';

const INTRO_STEP = 0;
const REVIEW_KIND = 'review' as const;

type FlowStep = { kind: 'question'; question: ConclusaoQuestion } | { kind: typeof REVIEW_KIND };

type FormState = Record<string, string>;

const INITIAL_FORM: FormState = Object.fromEntries(CONCLUSAO_QUESTIONS.map((q) => [q.key, '']));

function toneDeltaClasses(tone: ReturnType<typeof toneVariacaoMedida>): string {
  if (tone === 'positivo') return 'text-emerald-600';
  if (tone === 'atencao') return 'text-amber-600';
  return 'text-slate-700';
}

function formatarNomePaciente(nomeCompleto: string | undefined) {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/).filter((p) => p.length > 0);
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function formatarDataPrevista(d: Date) {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export type ConclusaoTratamentoMedicoModalProps = {
  open: boolean;
  onClose: () => void;
  paciente: PacienteCompleto;
  semana: number;
  dataPrevista: Date;
  registro?: SeguimentoSemanal | null;
  medicoNome?: string;
  medicoGenero?: 'M' | 'F';
  anteciparPlano?: boolean;
  onSaved: (paciente: PacienteCompleto) => void | Promise<void>;
};

export function ConclusaoTratamentoMedicoModal({
  open,
  onClose,
  paciente,
  semana,
  dataPrevista,
  registro,
  medicoNome,
  medicoGenero = 'M',
  anteciparPlano = false,
  onSaved,
}: ConclusaoTratamentoMedicoModalProps) {
  const [step, setStep] = useState(INTRO_STEP);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [medidasReferencia, setMedidasReferencia] = useState<{
    peso: number | null;
    circunferenciaAbdominal: number | null;
  }>({ peso: null, circunferenciaAbdominal: null });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [resultado, setResultado] = useState<{
    pesoPerdidoAcumulado: number | null;
    circunferenciaAbdominalReduzidaCm: number | null;
    depoimento?: string | null;
    percepcaoResultadoFinal?: string | null;
    principalConquista?: string | null;
  } | null>(null);

  const nomePaciente = paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente';
  const tituloMedico = medicoGenero === 'F' ? 'Dra.' : 'Dr.';

  const flowSteps = useMemo((): FlowStep[] => {
    const steps: FlowStep[] = CONCLUSAO_QUESTIONS.map((question) => ({
      kind: 'question',
      question,
    }));
    steps.push({ kind: REVIEW_KIND });
    return steps;
  }, []);

  const TOTAL_STEPS = 1 + flowSteps.length;
  const isIntro = step === INTRO_STEP;
  const contentIndex = step - 1;
  const currentFlowStep =
    contentIndex >= 0 && contentIndex < flowSteps.length ? flowSteps[contentIndex] : null;
  const isLastStep = step === TOTAL_STEPS - 1;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const stepLabel = `${step + 1} de ${TOTAL_STEPS}`;

  const resetModal = useCallback(() => {
    setStep(INTRO_STEP);
    setErro(null);
    setEnviando(false);
    setSucesso(false);
    setResultado(null);

    const refs = obterMedidasReferenciaPaciente(paciente, semana);
    setMedidasReferencia(refs);

    const fromPaciente = conclusaoFormFromPaciente(paciente, registro);
    const nextForm = { ...INITIAL_FORM };

    for (const q of CONCLUSAO_QUESTIONS) {
      if (fromPaciente[q.key]) {
        nextForm[q.key] = fromPaciente[q.key];
      } else if (q.key === 'pesoFinal' && refs.peso != null) {
        nextForm.pesoFinal = refs.peso.toFixed(1).replace('.', ',');
      } else if (q.key === 'circunferenciaAbdominal' && refs.circunferenciaAbdominal != null) {
        nextForm.circunferenciaAbdominal = refs.circunferenciaAbdominal
          .toFixed(2)
          .replace('.', ',');
      }
    }

    setForm(nextForm);
  }, [paciente, registro, semana]);

  useEffect(() => {
    if (open) resetModal();
  }, [open, resetModal]);

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErro(null);
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    if (isIntro || currentFlowStep?.kind === REVIEW_KIND) {
      setErro(null);
      return true;
    }

    const q = currentFlowStep.question;
    const value = (form[q.key] || '').trim();

    if (q.type === 'decimal') {
      if (q.required && !value) {
        setErro('Este campo é obrigatório.');
        return false;
      }
      if (value) {
        const num = parseFloat(value.replace(',', '.'));
        if (Number.isNaN(num) || num <= 0) {
          setErro('Informe um valor válido maior que zero.');
          return false;
        }
      }
      setErro(null);
      return true;
    }

    if (q.type === 'choice' && q.required && !value) {
      setErro('Selecione uma opção.');
      return false;
    }

    if (q.type === 'textarea' && value.length > 3000) {
      setErro('O depoimento deve ter no máximo 3000 caracteres.');
      return false;
    }

    setErro(null);
    return true;
  }, [currentFlowStep, form, isIntro]);

  const handleSubmit = useCallback(async () => {
    setEnviando(true);
    setErro(null);
    try {
      const dataRegistro = new Date(dataPrevista);
      dataRegistro.setHours(12, 0, 0, 0);

      const resultadoSalvo = await salvarConclusaoMedicoNoPaciente({
        paciente,
        semana,
        dataRegistro,
        form,
        registroExistente: registro,
        anteciparPlano,
      });

      setResultado({
        pesoPerdidoAcumulado: resultadoSalvo.pesoPerdidoAcumulado,
        circunferenciaAbdominalReduzidaCm: resultadoSalvo.circunferenciaAbdominalReduzidaCm,
        depoimento: resultadoSalvo.depoimento,
        percepcaoResultadoFinal: resultadoSalvo.percepcaoResultadoFinal,
        principalConquista: resultadoSalvo.principalConquista,
      });
      setSucesso(true);
      await onSaved(resultadoSalvo.paciente);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar conclusão');
    } finally {
      setEnviando(false);
    }
  }, [anteciparPlano, dataPrevista, form, onSaved, paciente, registro, semana]);

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

  const renderReviewItem = (label: string, value?: string | null) => {
    if (!value?.trim()) return null;
    return (
      <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 mt-0.5 whitespace-pre-wrap">{value}</p>
      </div>
    );
  };

  const metricasPreview = useMemo(() => {
    const pesoNum = parseFloat((form.pesoFinal || '').replace(',', '.'));
    const circNum = parseFloat((form.circunferenciaAbdominal || '').replace(',', '.'));
    if (Number.isNaN(pesoNum) || pesoNum <= 0) return null;
    return calcularMetricasConclusao(
      paciente,
      pesoNum,
      !Number.isNaN(circNum) && circNum > 0 ? circNum : undefined
    );
  }, [form.circunferenciaAbdominal, form.pesoFinal, paciente]);

  if (!open) return null;

  const nextButtonLabel = isIntro
    ? 'Começar conclusão'
    : isLastStep
      ? enviando
        ? 'Salvando...'
        : 'Registrar conclusão'
      : 'Continuar';

  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col md:items-center md:justify-center md:bg-black/50 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conclusao-medico-title"
    >
      <div className="flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[92vh] md:max-w-lg md:rounded-2xl md:shadow-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Conclusão pelo médico
            </p>
            <h2
              id="conclusao-medico-title"
              className="text-sm font-semibold text-slate-900 truncate"
            >
              {formatarNomePaciente(nomePaciente)} · Semana {semana}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sucesso ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-1">Conclusão registrada</h3>
              <p className="text-sm text-slate-500">
                Os dados foram salvos no prontuário do paciente.
              </p>
            </div>

            {(resultado?.pesoPerdidoAcumulado != null ||
              resultado?.circunferenciaAbdominalReduzidaCm != null) && (
              <div
                className={`grid gap-3 mb-4 ${
                  resultado?.pesoPerdidoAcumulado != null &&
                  resultado?.circunferenciaAbdominalReduzidaCm != null
                    ? 'grid-cols-2'
                    : 'grid-cols-1 max-w-[220px] mx-auto'
                }`}
              >
                {resultado?.pesoPerdidoAcumulado != null && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                      Peso perdido (acum.)
                    </p>
                    <p
                      className={`text-lg font-bold tabular-nums ${toneDeltaClasses(toneVariacaoMedida(resultado.pesoPerdidoAcumulado))}`}
                    >
                      {formatarVariacaoMedida(resultado.pesoPerdidoAcumulado, 'kg')?.replace(
                        '.',
                        ','
                      )}
                    </p>
                  </div>
                )}
                {resultado?.circunferenciaAbdominalReduzidaCm != null && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                      Redução abdominal
                    </p>
                    <p
                      className={`text-lg font-bold tabular-nums ${toneDeltaClasses(toneVariacaoMedida(resultado.circunferenciaAbdominalReduzidaCm))}`}
                    >
                      {formatarVariacaoMedida(
                        resultado.circunferenciaAbdominalReduzidaCm,
                        'cm'
                      )?.replace('.', ',')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {(resultado?.principalConquista || resultado?.percepcaoResultadoFinal) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {resultado.principalConquista && (
                  <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase text-violet-700 mb-1">
                      Principal conquista
                    </p>
                    <p className="text-sm font-semibold text-violet-900">
                      {resultado.principalConquista}
                    </p>
                  </div>
                )}
                {resultado.percepcaoResultadoFinal && (
                  <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase text-sky-700 mb-1">
                      Percepção do resultado
                    </p>
                    <p className="text-sm font-semibold text-sky-900">
                      {resultado.percepcaoResultadoFinal}
                    </p>
                  </div>
                )}
              </div>
            )}

            {resultado?.depoimento?.trim() && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 mb-4">
                <p className="text-[10px] font-semibold uppercase text-slate-500 mb-2">Depoimento</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {resultado.depoimento}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-white/90 border-b border-slate-100">
              <div className="flex items-center justify-end mb-2">
                <span className="text-xs font-medium text-slate-500">{stepLabel}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-500"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 pb-28">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                >
                  {isIntro ? (
                    <>
                      <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
                        Conclusão do Tratamento
                      </h3>
                      <p className="text-sm text-slate-600 mb-5">
                        Preencha em nome do paciente as mesmas informações da página de conclusão.
                      </p>

                      <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm space-y-4">
                        {medicoNome && (
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 text-white">
                              <Stethoscope className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                                Médico(a)
                              </p>
                              <p className="text-sm font-semibold text-slate-900">
                                {tituloMedico} {medicoNome}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                              Paciente
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatarNomePaciente(nomePaciente)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                              <Hash className="h-4 w-4" />
                              <span className="text-[10px] font-semibold uppercase">Semana</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900">{semana}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 col-span-1">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                              <Calendar className="h-4 w-4" />
                              <span className="text-[10px] font-semibold uppercase">Data</span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {formatarDataPrevista(dataPrevista)}
                            </p>
                          </div>
                        </div>

                        {anteciparPlano && (
                          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                            O plano será ajustado para refletir apenas as aplicações já realizadas.
                          </p>
                        )}
                      </div>
                    </>
                  ) : currentFlowStep?.kind === REVIEW_KIND ? (
                    <>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Revisão antes de salvar</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Confira as informações antes de registrar a conclusão.
                      </p>
                      <div className="space-y-2">
                        {renderReviewItem('Peso final', form.pesoFinal ? `${form.pesoFinal} kg` : null)}
                        {renderReviewItem(
                          'Circunferência abdominal',
                          form.circunferenciaAbdominal ? `${form.circunferenciaAbdominal} cm` : null
                        )}
                        {renderReviewItem('Percepção do resultado', form.percepcaoResultadoFinal)}
                        {renderReviewItem('Principal conquista', form.principalConquista)}
                        {renderReviewItem('Depoimento', form.depoimento)}
                      </div>
                      {metricasPreview && (
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          {metricasPreview.pesoPerdidoAcumulado != null && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                              <p className="text-[10px] font-semibold uppercase text-emerald-800 mb-1">
                                Δ Peso acum.
                              </p>
                              <p
                                className={`text-sm font-bold ${toneDeltaClasses(toneVariacaoMedida(metricasPreview.pesoPerdidoAcumulado))}`}
                              >
                                {formatarVariacaoMedida(metricasPreview.pesoPerdidoAcumulado, 'kg')}
                              </p>
                            </div>
                          )}
                          {metricasPreview.circunferenciaAbdominalReduzidaCm != null && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                              <p className="text-[10px] font-semibold uppercase text-emerald-800 mb-1">
                                Δ Abdominal
                              </p>
                              <p
                                className={`text-sm font-bold ${toneDeltaClasses(toneVariacaoMedida(metricasPreview.circunferenciaAbdominalReduzidaCm))}`}
                              >
                                {formatarVariacaoMedida(
                                  metricasPreview.circunferenciaAbdominalReduzidaCm,
                                  'cm'
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : currentFlowStep?.kind === 'question' ? (
                    (() => {
                      const q = currentFlowStep.question;
                      return (
                        <>
                          <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-2 leading-snug">
                            {q.label}
                            {q.unit ? (
                              <span className="block text-sm font-medium text-slate-500 mt-1">
                                ({q.unit})
                              </span>
                            ) : null}
                          </label>
                          {q.hint && <p className="text-sm text-slate-500 mb-4">{q.hint}</p>}

                          {q.type === 'choice' && q.options ? (
                            <div className="space-y-2.5">
                              {q.options.map((option) => {
                                const selected = form[q.key] === option;
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => updateField(q.key, option)}
                                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-all ${
                                      selected
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/30'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          ) : q.type === 'textarea' ? (
                            <>
                              <textarea
                                value={form[q.key] || ''}
                                onChange={(e) => updateField(q.key, e.target.value)}
                                placeholder={q.placeholder}
                                rows={5}
                                maxLength={3000}
                                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-y min-h-[140px]"
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                {(form[q.key] || '').length}/3000 caracteres · Opcional
                              </p>
                            </>
                          ) : q.key === 'pesoFinal' ? (
                            <DigitalMeasurePicker
                              value={form.pesoFinal}
                              onChange={(v) => updateField('pesoFinal', v)}
                              step={0.1}
                              decimals={1}
                              min={20}
                              unit="kg"
                              referenceValue={medidasReferencia.peso}
                            />
                          ) : q.key === 'circunferenciaAbdominal' ? (
                            <DigitalMeasurePicker
                              value={form.circunferenciaAbdominal}
                              onChange={(v) => updateField('circunferenciaAbdominal', v)}
                              step={0.25}
                              decimals={2}
                              min={40}
                              unit="cm"
                              referenceValue={medidasReferencia.circunferenciaAbdominal}
                            />
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={form[q.key] || ''}
                              onChange={(e) => updateField(q.key, e.target.value)}
                              placeholder={q.placeholder}
                              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            />
                          )}
                        </>
                      );
                    })()
                  ) : null}

                  {erro && (
                    <p className="mt-3 text-sm text-red-600" role="alert">
                      {erro}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-4">
              <div className="flex gap-3 max-w-lg mx-auto">
                {step > INTRO_STEP && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={enviando}
                    className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    enviando ||
                    (currentFlowStep?.kind === 'question' &&
                      currentFlowStep.question.key === 'pesoFinal' &&
                      !form.pesoFinal.trim())
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold shadow-sm transition-all"
                >
                  {enviando && isLastStep && <Loader2 className="w-5 h-5 animate-spin" />}
                  {nextButtonLabel}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
