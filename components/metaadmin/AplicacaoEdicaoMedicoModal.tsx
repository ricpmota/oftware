'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Hash,
  Loader2,
  Pill,
  Save,
  Stethoscope,
  Target,
  User,
  X,
} from 'lucide-react';
import { DoseMgTirzepatidaStepperField } from '@/components/tirzepatida/DoseMgTirzepatidaStepperField';
import {
  CHECK_IN_SEMANAL_QUESTIONS,
} from '@/lib/aplicacao/checkInSemanalQuestions';
import { MARCO_ZERO_QUESTIONS } from '@/lib/aplicacao/marcoZeroQuestions';
import {
  checkInFormFromRegistro,
  LOCAL_APLICACAO_VALUE_TO_LABEL,
} from '@/lib/aplicacao/checkInSemanalFormUtils';
import {
  resolverModoEdicaoAplicacao,
  salvarEdicaoAplicacaoMedico,
  type ModoEdicaoAplicacaoMedico,
} from '@/lib/aplicacao/salvarEdicaoAplicacaoMedico';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';

type FormState = Record<string, string>;

function formatarNomePaciente(nomeCompleto: string | undefined) {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/).filter((p) => p.length > 0);
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function formatarDataRegistro(value: unknown): string {
  if (!value) return '—';
  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function weekIndexOf(e: SeguimentoSemanal): number {
  return e.weekIndex ?? (e as { numeroSemana?: number }).numeroSemana ?? 0;
}

function marcoZeroFormFromRegistro(
  paciente: PacienteCompleto,
  registro: SeguimentoSemanal
): FormState {
  const marco = registro.marcoZero ?? paciente.marcoZero;
  const peso =
    registro.peso ?? marco?.pesoInicial ?? paciente.dadosClinicos?.medidasIniciais?.peso;
  const circ =
    registro.circunferenciaAbdominal ??
    marco?.circunferenciaInicial ??
    paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal;

  return {
    peso: peso != null && peso > 0 ? String(peso).replace('.', ',') : '',
    circunferenciaAbdominal:
      circ != null && circ > 0 ? String(circ).replace('.', ',') : '',
    motivacaoPrincipal: marco?.motivacaoPrincipal || '',
    satisfacaoAtual: marco?.satisfacaoAtual || '',
    objetivoPaciente: marco?.objetivoPaciente || '',
    confiancaNoObjetivo: marco?.confiancaNoObjetivo || '',
  };
}

const CHECK_IN_EDIT_QUESTIONS = CHECK_IN_SEMANAL_QUESTIONS.filter((q) => q.key !== 'fotos');
const MARCO_ZERO_EDIT_QUESTIONS = MARCO_ZERO_QUESTIONS.filter((q) => q.key !== 'fotos');

export type AplicacaoEdicaoMedicoModalProps = {
  open: boolean;
  onClose: () => void;
  paciente: PacienteCompleto;
  registro: SeguimentoSemanal;
  doseMgInicial?: number;
  medicoNome?: string;
  medicoGenero?: 'M' | 'F';
  onSaved: (paciente: PacienteCompleto) => void;
};

export function AplicacaoEdicaoMedicoModal({
  open,
  onClose,
  paciente,
  registro,
  doseMgInicial,
  medicoNome,
  medicoGenero = 'M',
  onSaved,
}: AplicacaoEdicaoMedicoModalProps) {
  const semana = weekIndexOf(registro);
  const modo: ModoEdicaoAplicacaoMedico = useMemo(
    () => resolverModoEdicaoAplicacao(paciente, registro),
    [paciente, registro]
  );

  const [form, setForm] = useState<FormState>({});
  const [doseMg, setDoseMg] = useState('');
  const [comentarioMedico, setComentarioMedico] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const nomePaciente =
    paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente';
  const tituloMedico = medicoGenero === 'F' ? 'Dra.' : 'Dr.';

  const resetFromRegistro = useCallback(() => {
    const dose =
      doseMgInicial ??
      registro.doseAplicada?.quantidade ??
      0;
    setDoseMg(dose > 0 ? String(dose) : '');
    setComentarioMedico(registro.comentarioMedico || '');
    setErro(null);
    setSalvando(false);

    if (modo === 'marco_zero') {
      setForm(marcoZeroFormFromRegistro(paciente, registro));
    } else {
      const base = checkInFormFromRegistro(registro);
      if (!base.localAplicacao && registro.localAplicacao) {
        base.localAplicacao = LOCAL_APLICACAO_VALUE_TO_LABEL[registro.localAplicacao] || '';
      }
      setForm(base);
    }
  }, [doseMgInicial, modo, paciente, registro]);

  useEffect(() => {
    if (open) resetFromRegistro();
  }, [open, resetFromRegistro]);

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErro(null);
  };

  const questions = modo === 'marco_zero' ? MARCO_ZERO_EDIT_QUESTIONS : CHECK_IN_EDIT_QUESTIONS;

  const handleSalvar = async () => {
    if (salvando) return;
    const dose = parseFloat(doseMg);
    if (!doseMg || Number.isNaN(dose) || dose < 0) {
      setErro('Informe a dose aplicada.');
      return;
    }
    for (const q of questions) {
      if (!q.required) continue;
      const val = (form[q.key] || '').trim();
      if (!val) {
        setErro(`Preencha: ${q.label}`);
        return;
      }
    }
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await salvarEdicaoAplicacaoMedico({
        paciente,
        registro,
        doseMg: dose,
        form,
        comentarioMedico,
      });
      onSaved(resultado.paciente);
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  if (!open) return null;

  const accent =
    modo === 'marco_zero'
      ? {
          shell: 'from-violet-600 via-violet-700 to-indigo-800',
          badge: 'bg-amber-400 text-amber-950',
          ring: 'focus:ring-violet-500/40',
          btn: 'bg-violet-600 hover:bg-violet-700',
          section: 'border-violet-100 bg-violet-50/50',
          label: 'text-violet-800',
        }
      : {
          shell: 'from-teal-600 via-emerald-700 to-teal-900',
          badge: 'bg-emerald-300 text-emerald-950',
          ring: 'focus:ring-emerald-500/40',
          btn: 'bg-emerald-600 hover:bg-emerald-700',
          section: 'border-emerald-100 bg-emerald-50/40',
          label: 'text-emerald-800',
        };

  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col sm:items-center sm:justify-center sm:bg-black/55 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edicao-aplicacao-medico-title"
    >
      <div className="flex flex-col flex-1 min-h-0 w-full h-full sm:flex-initial sm:h-auto sm:max-w-2xl sm:max-h-[92vh] overflow-hidden rounded-none sm:rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className={`flex-shrink-0 bg-gradient-to-br ${accent.shell} text-white px-4 sm:px-5 pt-4 pb-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${accent.badge}`}
              >
                {modo === 'marco_zero' ? (
                  <>
                    <Target className="h-3.5 w-3.5" /> Marco Zero
                  </>
                ) : (
                  <>Check-in semanal</>
                )}
              </span>
              <h2
                id="edicao-aplicacao-medico-title"
                className="mt-2 text-xl sm:text-2xl font-bold leading-tight"
              >
                Editar aplicação
              </h2>
              <p className="mt-1 text-sm text-white/85">
                Ajuste as respostas do paciente e a dose registrada.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-white/70 mb-0.5">
                <User className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase">Paciente</span>
              </div>
              <p className="text-sm font-semibold truncate">{formatarNomePaciente(nomePaciente)}</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-white/70 mb-0.5">
                <Hash className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase">Semana</span>
              </div>
              <p className="text-sm font-semibold">{semana}</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-white/70 mb-0.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase">Registro</span>
              </div>
              <p className="text-sm font-semibold truncate">
                {formatarDataRegistro(registro.dataRegistro)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-white/70 mb-0.5">
                <Stethoscope className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase">Médico</span>
              </div>
              <p className="text-sm font-semibold truncate">
                {medicoNome ? `${tituloMedico} ${medicoNome}` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          <section className={`rounded-2xl border ${accent.section} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Pill className={`h-4 w-4 ${accent.label}`} />
              <h3 className={`text-xs font-bold uppercase tracking-wide ${accent.label}`}>
                Dose aplicada
              </h3>
            </div>
            <DoseMgTirzepatidaStepperField
              value={doseMg}
              onChange={(mg) => {
                setDoseMg(String(mg));
                setErro(null);
              }}
              placeholder="Selecione a dose"
              ariaLabel="Alterar dose aplicada em miligramas"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              {modo === 'marco_zero'
                ? 'Questionário Marco Zero'
                : 'Questionário do check-in semanal'}
            </h3>

            {questions.map((q) => {
              const value = form[q.key] || '';
              const inputClass = `w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 ${accent.ring}`;

              return (
                <div key={q.key}>
                  <label className="block text-sm font-medium text-slate-800 mb-1.5">
                    {q.label}
                    {q.required ? (
                      <span className="text-rose-500 ml-0.5">*</span>
                    ) : (
                      <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                    )}
                  </label>

                  {q.type === 'decimal' && (
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => setField(q.key, e.target.value)}
                        placeholder={q.placeholder}
                        className={inputClass}
                      />
                      {q.unit && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          {q.unit}
                        </span>
                      )}
                    </div>
                  )}

                  {q.type === 'choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.options || []).map((opt) => {
                        const selected = value === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setField(q.key, opt)}
                            className={`text-left rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                              selected
                                ? modo === 'marco_zero'
                                  ? 'border-violet-500 bg-violet-50 text-violet-950 font-semibold ring-1 ring-violet-400/40'
                                  : 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-400/40'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {(q.type === 'shorttext' || q.type === 'textarea') && (
                    <textarea
                      value={value}
                      onChange={(e) => setField(q.key, e.target.value)}
                      placeholder={q.placeholder}
                      rows={q.type === 'textarea' ? 3 : 2}
                      className={`${inputClass} resize-y min-h-[44px]`}
                    />
                  )}
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Comentário médico
              <span className="text-slate-400 font-normal ml-1">(opcional)</span>
            </label>
            <textarea
              value={comentarioMedico}
              onChange={(e) => setComentarioMedico(e.target.value)}
              placeholder="Observações clínicas, orientações, ajustes…"
              rows={3}
              className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 ${accent.ring} resize-y`}
            />
          </section>

          {erro && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              {erro}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200/80 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSalvar()}
            disabled={salvando}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white ${accent.btn} disabled:opacity-60`}
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
