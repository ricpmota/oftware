'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  Hash,
  Loader2,
  Pill,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { DigitalMeasurePicker } from '@/components/aplicacao/DigitalMeasurePicker';
import { CheckInSemanalScoreCard } from '@/components/aplicacao/CheckInSemanalScoreCard';
import { DoseMgTirzepatidaSelectOptions } from '@/components/tirzepatida/DoseMgTirzepatidaSelectOptions';
import {
  CHECK_IN_SEMANAL_QUESTIONS,
  LOCAL_APLICACAO_LABEL_TO_VALUE,
} from '@/lib/aplicacao/checkInSemanalQuestions';
import {
  checkInFormFromRegistro,
  obterMedidasReferenciaPaciente,
} from '@/lib/aplicacao/checkInSemanalFormUtils';
import { salvarCheckInMedicoNoPaciente } from '@/lib/aplicacao/salvarCheckInMedicoNoPaciente';
import type { CheckInSemanalScoreResultado } from '@/lib/aplicacao/calcularScoreCheckInSemanal';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';

const MEDICO_QUESTIONS = CHECK_IN_SEMANAL_QUESTIONS.filter((q) => q.key !== 'fotos');
const INTRO_STEP = 0;
const QUESTION_COUNT = MEDICO_QUESTIONS.length;
const TOTAL_STEPS = INTRO_STEP + QUESTION_COUNT + 1;

type FormState = Record<string, string>;

const INITIAL_FORM: FormState = Object.fromEntries(MEDICO_QUESTIONS.map((q) => [q.key, '']));

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

function formatarDoseMg(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  const t = Number.isInteger(n)
    ? String(n)
    : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${t} mg`;
}

function formatarPerda(valor: number | null | undefined, unidade: 'kg' | 'cm') {
  if (valor == null || Number.isNaN(valor)) return null;
  if (valor === 0) return `Sem alteração (${unidade})`;
  const sinal = valor > 0 ? '−' : '+';
  return `${sinal}${Math.abs(valor).toFixed(1)} ${unidade}`;
}

export type AplicacaoCheckInMedicoModalProps = {
  open: boolean;
  onClose: () => void;
  paciente: PacienteCompleto;
  semana: number;
  dataPrevista: Date;
  doseMgInicial: number;
  registro?: SeguimentoSemanal | null;
  medicoNome?: string;
  medicoGenero?: 'M' | 'F';
  onSaved: (paciente: PacienteCompleto) => void;
};

export function AplicacaoCheckInMedicoModal({
  open,
  onClose,
  paciente,
  semana,
  dataPrevista,
  doseMgInicial,
  registro,
  medicoNome,
  medicoGenero = 'M',
  onSaved,
}: AplicacaoCheckInMedicoModalProps) {
  const [step, setStep] = useState(INTRO_STEP);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [doseMg, setDoseMg] = useState(String(doseMgInicial || ''));
  const [medidasReferencia, setMedidasReferencia] = useState<{
    peso: number | null;
    circunferenciaAbdominal: number | null;
  }>({ peso: null, circunferenciaAbdominal: null });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [resultado, setResultado] = useState<{
    variacaoPeso: number | null;
    variacaoCircunferencia: number | null;
    scoreCheckInSemanal?: CheckInSemanalScoreResultado | null;
  } | null>(null);

  const nomePaciente =
    paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente';
  const tituloMedico = medicoGenero === 'F' ? 'Dra.' : 'Dr.';

  const resetModal = useCallback(() => {
    setStep(INTRO_STEP);
    setErro(null);
    setEnviando(false);
    setSucesso(false);
    setResultado(null);
    setDoseMg(String(doseMgInicial || ''));

    const refs = obterMedidasReferenciaPaciente(paciente, semana);
    setMedidasReferencia(refs);

    const fromRegistro = checkInFormFromRegistro(registro);
    const nextForm = { ...INITIAL_FORM };

    if (fromRegistro.peso) {
      nextForm.peso = fromRegistro.peso;
    } else if (refs.peso != null) {
      nextForm.peso = refs.peso.toFixed(1).replace('.', ',');
    }

    if (fromRegistro.circunferenciaAbdominal) {
      nextForm.circunferenciaAbdominal = fromRegistro.circunferenciaAbdominal;
    } else if (refs.circunferenciaAbdominal != null) {
      nextForm.circunferenciaAbdominal = refs.circunferenciaAbdominal
        .toFixed(2)
        .replace('.', ',');
    }

    for (const q of MEDICO_QUESTIONS) {
      if (fromRegistro[q.key]) nextForm[q.key] = fromRegistro[q.key];
    }

    setForm(nextForm);
  }, [doseMgInicial, paciente, registro, semana]);

  useEffect(() => {
    if (open) resetModal();
  }, [open, resetModal]);

  const isIntro = step === INTRO_STEP;
  const questionIndex = step - 1;
  const currentQuestion =
    questionIndex >= 0 && questionIndex < QUESTION_COUNT
      ? MEDICO_QUESTIONS[questionIndex]
      : null;
  const isLastStep = step === QUESTION_COUNT;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const stepLabel = useMemo(() => `${step + 1} de ${TOTAL_STEPS}`, [step]);

  const pesoInicial = paciente.dadosClinicos?.medidasIniciais?.peso;
  const circInicial = paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;
  const evolucao = paciente.evolucaoSeguimento || [];
  const ultimoComPeso = [...evolucao]
    .reverse()
    .find((e) => e.peso != null && e.peso > 0);
  const ultimoComCirc = [...evolucao]
    .reverse()
    .find((e) => e.circunferenciaAbdominal != null && e.circunferenciaAbdominal > 0);
  const pesoPerdidoLabel = formatarPerda(
    pesoInicial != null ? pesoInicial - (ultimoComPeso?.peso ?? pesoInicial) : null,
    'kg'
  );
  const circPerdidaLabel = formatarPerda(
    circInicial != null
      ? circInicial - (ultimoComCirc?.circunferenciaAbdominal ?? circInicial)
      : null,
    'cm'
  );

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErro(null);
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    if (isIntro) {
      const doseNum = parseFloat(doseMg);
      if (!doseMg.trim() || Number.isNaN(doseNum) || doseNum <= 0) {
        setErro('Informe a dose aplicada (mg).');
        return false;
      }
      setErro(null);
      return true;
    }
    if (!currentQuestion) return true;

    const value = (form[currentQuestion.key] || '').trim();

    if (currentQuestion.type === 'decimal') {
      if (currentQuestion.required && !value) {
        setErro('Este campo é obrigatório.');
        return false;
      }
      if (value) {
        const num = parseFloat(value.replace(',', '.'));
        if (Number.isNaN(num) || num <= 0) {
          setErro('Informe um valor válido.');
          return false;
        }
      }
      setErro(null);
      return true;
    }

    if (currentQuestion.type === 'choice') {
      if (currentQuestion.required && !value) {
        setErro('Selecione uma opção.');
        return false;
      }
      setErro(null);
      return true;
    }

    setErro(null);
    return true;
  }, [currentQuestion, doseMg, form, isIntro]);

  const handleSubmit = useCallback(async () => {
    const doseNum = parseFloat(doseMg);
    if (!doseMg.trim() || Number.isNaN(doseNum) || doseNum <= 0) {
      setErro('Informe a dose aplicada (mg).');
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const dataRegistro = new Date(dataPrevista);
      dataRegistro.setHours(12, 0, 0, 0);

      const resultadoSalvo = await salvarCheckInMedicoNoPaciente({
        paciente,
        semana,
        dataRegistro,
        doseMg: doseNum,
        form,
        registroExistente: registro,
      });

      setResultado({
        variacaoPeso: resultadoSalvo.variacaoPeso,
        variacaoCircunferencia: resultadoSalvo.variacaoCircunferencia,
        scoreCheckInSemanal: resultadoSalvo.scoreCheckInSemanal,
      });
      setSucesso(true);
      onSaved(resultadoSalvo.paciente);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar check-in');
    } finally {
      setEnviando(false);
    }
  }, [dataPrevista, doseMg, form, onSaved, paciente, registro, semana]);

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col md:items-center md:justify-center md:bg-black/50 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-medico-title"
    >
      <div className="flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[92vh] md:max-w-lg md:rounded-2xl md:shadow-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Check-in pelo médico
            </p>
            <h2
              id="checkin-medico-title"
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
              <h3 className="text-xl font-semibold text-slate-900 mb-1">Check-in registrado</h3>
              <p className="text-sm text-slate-500">
                Os dados foram salvos no prontuário do paciente.
              </p>
            </div>

            {resultado?.scoreCheckInSemanal && (
              <div className="mb-4">
                <CheckInSemanalScoreCard score={resultado.scoreCheckInSemanal} />
              </div>
            )}

            {(resultado?.variacaoPeso != null || resultado?.variacaoCircunferencia != null) && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {resultado.variacaoPeso != null && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Δ Peso</p>
                    <p
                      className={`text-lg font-bold ${
                        resultado.variacaoPeso < 0
                          ? 'text-emerald-600'
                          : resultado.variacaoPeso > 0
                            ? 'text-amber-600'
                            : 'text-slate-700'
                      }`}
                    >
                      {resultado.variacaoPeso > 0 ? '+' : ''}
                      {resultado.variacaoPeso.toFixed(1)} kg
                    </p>
                  </div>
                )}
                {resultado.variacaoCircunferencia != null && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                      Δ Abdominal
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        resultado.variacaoCircunferencia < 0
                          ? 'text-emerald-600'
                          : resultado.variacaoCircunferencia > 0
                            ? 'text-amber-600'
                            : 'text-slate-700'
                      }`}
                    >
                      {resultado.variacaoCircunferencia > 0 ? '+' : ''}
                      {resultado.variacaoCircunferencia.toFixed(1)} cm
                    </p>
                  </div>
                )}
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
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
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
                        Check-in Semanal
                      </h3>
                      <p className="text-sm text-slate-600 mb-5">
                        Preencha em nome do paciente as mesmas informações do link de aplicação.
                      </p>

                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-4">
                        {medicoNome && (
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] text-white">
                              <Stethoscope className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
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
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                              <Pill className="h-4 w-4" />
                              <span className="text-[10px] font-semibold uppercase">Dose</span>
                            </div>
                            <p className="text-base font-bold text-slate-900">
                              {formatarDoseMg(parseFloat(doseMg) || doseMgInicial)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                          <label className="block text-[10px] font-semibold uppercase text-amber-900 mb-2">
                            Dose aplicada (mg) — editável
                          </label>
                          <select
                            value={doseMg}
                            onChange={(e) => {
                              setDoseMg(e.target.value);
                              setErro(null);
                            }}
                            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          >
                            <option value="">Selecione a dose</option>
                            <DoseMgTirzepatidaSelectOptions />
                          </select>
                        </div>

                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-sky-700 shrink-0" />
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-slate-500">
                              Data prevista
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatarDataPrevista(dataPrevista)}
                            </p>
                          </div>
                        </div>

                        {(pesoPerdidoLabel || circPerdidaLabel) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {pesoPerdidoLabel && (
                              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                                <p className="text-[10px] font-semibold uppercase text-emerald-800 mb-1">
                                  Peso perdido
                                </p>
                                <p className="text-sm font-bold text-emerald-900">{pesoPerdidoLabel}</p>
                              </div>
                            )}
                            {circPerdidaLabel && (
                              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                                <p className="text-[10px] font-semibold uppercase text-emerald-800 mb-1">
                                  Abdominal perdido
                                </p>
                                <p className="text-sm font-bold text-emerald-900">{circPerdidaLabel}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : currentQuestion ? (
                    <>
                      <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-4 leading-snug">
                        {currentQuestion.label}
                        {currentQuestion.unit ? (
                          <span className="block text-sm font-medium text-slate-500 mt-1">
                            ({currentQuestion.unit})
                          </span>
                        ) : null}
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
                      ) : currentQuestion.type === 'textarea' ? (
                        <textarea
                          value={form[currentQuestion.key] || ''}
                          onChange={(e) => updateField(currentQuestion.key, e.target.value)}
                          placeholder={currentQuestion.placeholder}
                          rows={4}
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-y min-h-[120px]"
                        />
                      ) : currentQuestion.key === 'peso' ? (
                        <DigitalMeasurePicker
                          value={form.peso || ''}
                          onChange={(v) => updateField('peso', v)}
                          unit="kg"
                          step={0.1}
                          decimals={1}
                          referenceValue={medidasReferencia.peso}
                        />
                      ) : currentQuestion.key === 'circunferenciaAbdominal' ? (
                        <DigitalMeasurePicker
                          value={form.circunferenciaAbdominal || ''}
                          onChange={(v) => updateField('circunferenciaAbdominal', v)}
                          unit="cm"
                          step={0.25}
                          decimals={2}
                          referenceValue={medidasReferencia.circunferenciaAbdominal}
                        />
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form[currentQuestion.key] || ''}
                          onChange={(e) => updateField(currentQuestion.key, e.target.value)}
                          placeholder={currentQuestion.placeholder}
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                        />
                      )}
                    </>
                  ) : null}

                  {erro && (
                    <p className="mt-3 text-sm text-red-600" role="alert">
                      {erro}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex-shrink-0 px-4 pt-4 pb-5 border-t border-slate-200 bg-white">
              <div className="flex gap-3">
                {step > INTRO_STEP && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={enviando}
                    className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={enviando}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : isLastStep ? (
                    'Salvar check-in'
                  ) : step === INTRO_STEP ? (
                    'Começar'
                  ) : (
                    'Continuar'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
