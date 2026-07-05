'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Loader2, X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  ChoiceButton,
  FieldGrid,
  FieldLabel,
  StepHint,
  inputClassName,
  selectClassName,
} from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import MetaPacienteWizardStepMetas, {
  buildPacienteComMetasFinalizadas,
} from '@/components/meta/MetaPacienteWizardStepMetas';
import MetaPacienteWizardStepMedico, {
  isMetaPacienteWizardMedicoStep,
  isMetaPacienteWizardTerminalStep,
} from '@/components/meta/MetaPacienteWizardStepMedico';
import PerfilMetabolicoV3ChatUI from '@/components/meta/PerfilMetabolicoV3ChatUI';
import {
  applyExpectativaFromMetas,
  countPerfilMetabolicoV3WizardSteps,
  getPerfilMetabolicoBotText,
  isPerfilMetabolicoChatStep,
  STEP_PERFIL_METABOLICO_BARREIRAS,
} from '@/lib/meta/perfilMetabolicoV3Chat';
import {
  COMORBIDADES_OPTIONS,
  DIAGNOSTICO_LABELS,
  DIAGNOSTICO_TIPOS,
  filterRiskQuestionsForSexo,
  formatCpf,
  formatTelefone,
  getFirstUnansweredRiskIndex,
  getNextStepAfter,
  getPreviousStep,
  getStepTitleAndHint,
  MESES,
  META_CHAT_INTRO_SANDBOX_SESSION_KEY,
  META_CHAT_INTRO_SESSION_KEY,
  META_CHAT_STEP_COMORBIDADES,
  META_CHAT_STEP_INTRO,
  META_CHAT_STEP_METAS,
  META_CHAT_STEP_MEDICO_UF,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_PERFIL_COMPLETO,
  META_CHAT_STEP_RISCOS,
  META_CHAT_STEP_SOLICITACAO_ENVIADA,
  MOTIVACAO_OPTIONS,
  parseAlturaToCm,
  parseCircToCm,
  patchMedidasIniciais,
  resolveInitialChatStep,
  riskOptionLabel,
  devePularSelecaoMedicoNoChat,
  SEXO_OPTIONS,
  SINTOMAS_GI_OPTIONS,
  TIREOIDE_OPTIONS,
  TEXTO_INTRO_HINT,
  TEXTO_INTRO_TITULO,
  validateMetaChatStep,
  splitStepText,
  TEXTO_PESQUISA_MEDICO,
  TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA,
  isMetaChatInicialCompleto,
  type MetaChatMedicoUiState,
} from '@/lib/meta/metaChatInicial';
import PublicPageTopLogo from '@/components/public/PublicPageTopLogo';
import type { MedicoWhiteLabelResolved } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { ensureImcOnPaciente } from '@/lib/meta/medidasIniciaisImc';

/** Wizard: fluxo completo até solicitação médico (18) ou perfil completo (17). */
export function getMetaPacienteWizardMaxStep(p: PacienteCompleto): number {
  if (devePularSelecaoMedicoNoChat(p)) return META_CHAT_STEP_PERFIL_COMPLETO;
  return META_CHAT_STEP_SOLICITACAO_ENVIADA;
}

function normalizeWizardStep(raw: number): number {
  if (raw === META_CHAT_STEP_MEDICO_LISTA) return META_CHAT_STEP_MEDICO_UF;
  return raw;
}

function getWizardProgressIndex(step: number, p: PacienteCompleto): { current: number; total: number } {
  const v3Count = countPerfilMetabolicoV3WizardSteps(p);
  const total = 15 + v3Count + 1;

  const normalizedStep = normalizeWizardStep(step);
  let current = normalizedStep;
  if (normalizedStep <= 14) {
    current = normalizedStep;
  } else if (isPerfilMetabolicoChatStep(normalizedStep)) {
    current = 15 + (normalizedStep - 19);
  } else if (normalizedStep === META_CHAT_STEP_MEDICO_UF) {
    current = 15 + v3Count;
  } else if (
    normalizedStep === META_CHAT_STEP_PERFIL_COMPLETO ||
    normalizedStep === META_CHAT_STEP_SOLICITACAO_ENVIADA
  ) {
    current = total - 1;
  }

  return { current: Math.min(Math.max(current, 0), total - 1), total };
}

const BIRTH_YEARS = Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i);

function clampWizardStep(raw: number, p: PacienteCompleto): number {
  const normalized = normalizeWizardStep(raw);
  const max = getMetaPacienteWizardMaxStep(p);
  if (isPerfilMetabolicoChatStep(normalized)) return normalized;
  if (normalized >= 15 && normalized <= 18) return normalized;
  return Math.min(Math.max(normalized, META_CHAT_STEP_INTRO), max);
}

type DiagnosticoTipo = NonNullable<PacienteCompleto['dadosClinicos']['diagnosticoPrincipal']>['tipo'];
type HistoriaTireoide = NonNullable<PacienteCompleto['dadosClinicos']['historiaTireoidiana']>;
type Riscos = NonNullable<PacienteCompleto['dadosClinicos']['riscos']>;

export type MetaPacienteWizardProps = {
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
  onClose: () => void;
  onSave: (closeAfter?: boolean, pacienteAtualizado?: PacienteCompleto) => Promise<void>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  embedded?: boolean;
  sandboxBanner?: boolean;
  chatTitle?: string;
  chatSubtitle?: string;
  resumeAfterLoadTick?: number;
  onCreateSolicitacao?: (medico: { id: string; nome: string }, pacienteAtualizado: PacienteCompleto) => Promise<void>;
  onCheckSolicitacaoAberta?: () => Promise<boolean>;
  /** Logo e marca do médico (mesmo padrão das páginas de aplicação). */
  headerWhiteLabel?: MedicoWhiteLabelResolved | null;
  /** Solicitação pendente (ex.: paciente veio do link /dr). */
  solicitacaoMedicoPendente?: { medicoId: string; medicoNome: string } | null;
  /** Chamado quando o paciente conclui o chat e há solicitação para o médico. */
  onChatInicialCompleto?: () => Promise<void>;
};

export default function MetaPacienteWizard({
  paciente,
  setPaciente,
  onClose,
  onSave,
  saving,
  setSaving,
  embedded = false,
  sandboxBanner = false,
  chatTitle = '',
  chatSubtitle = '',
  resumeAfterLoadTick = 0,
  onCreateSolicitacao,
  onCheckSolicitacaoAberta,
  headerWhiteLabel = null,
  solicitacaoMedicoPendente = null,
  onChatInicialCompleto,
}: MetaPacienteWizardProps) {
  const introSessionKey = sandboxBanner
    ? META_CHAT_INTRO_SANDBOX_SESSION_KEY
    : META_CHAT_INTRO_SESSION_KEY;

  const pacienteRef = useRef(paciente);

  const setPacienteSynced = useCallback(
    (update: React.SetStateAction<PacienteCompleto>) => {
      setPaciente((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        pacienteRef.current = next;
        return next;
      });
    },
    [setPaciente]
  );

  useEffect(() => {
    pacienteRef.current = paciente;
  }, [paciente]);

  /** Wizard = avaliação completa + V3. Garante o flag mesmo se a intro foi pulada (session já marcada). */
  useEffect(() => {
    if (paciente.dadosClinicos?.tipoAvaliacaoInicial === 'completa') return;
    setPacienteSynced((p) => ({
      ...p,
      dadosClinicos: { ...p.dadosClinicos, tipoAvaliacaoInicial: 'completa' },
    }));
  }, [paciente.dadosClinicos?.tipoAvaliacaoInicial, setPacienteSynced]);

  const [step, setStep] = useState(() =>
    clampWizardStep(resolveInitialChatStep(paciente, introSessionKey), paciente)
  );
  const [riskQuestionIndex, setRiskQuestionIndex] = useState(() =>
    resolveInitialChatStep(paciente, introSessionKey) === META_CHAT_STEP_RISCOS
      ? getFirstUnansweredRiskIndex(paciente)
      : 0
  );
  const [alturaInputStr, setAlturaInputStr] = useState('');
  const [circInputStr, setCircInputStr] = useState('');
  const [error, setError] = useState('');
  const [medicoUi, setMedicoUi] = useState<MetaChatMedicoUiState>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatCompletoMarcadoRef = useRef(false);

  const aguardandoAceiteMedico =
    solicitacaoMedicoPendente && paciente.statusTratamento !== 'em_tratamento'
      ? { medicoNome: solicitacaoMedicoPendente.medicoNome }
      : null;

  /** Link do médico ou solicitação já criada: não exibir busca por UF/cidade. */
  useEffect(() => {
    if (step !== META_CHAT_STEP_MEDICO_UF && step !== META_CHAT_STEP_MEDICO_LISTA) return;
    if (!devePularSelecaoMedicoNoChat(paciente) && !aguardandoAceiteMedico) return;
    setStep(META_CHAT_STEP_PERFIL_COMPLETO);
  }, [step, paciente, aguardandoAceiteMedico]);

  useEffect(() => {
    if (step !== META_CHAT_STEP_PERFIL_COMPLETO) return;
    if (!isMetaChatInicialCompleto(pacienteRef.current)) return;
    if (!onChatInicialCompleto || chatCompletoMarcadoRef.current) return;
    chatCompletoMarcadoRef.current = true;
    void onChatInicialCompleto().catch((err) => {
      console.error('Erro ao marcar chat inicial completo:', err);
      chatCompletoMarcadoRef.current = false;
    });
  }, [step, paciente, onChatInicialCompleto]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, riskQuestionIndex]);

  useEffect(() => {
    if (!resumeAfterLoadTick) return;
    const target = clampWizardStep(resolveInitialChatStep(pacienteRef.current, introSessionKey), pacienteRef.current);
    setStep((prev) => (target > prev ? target : prev));
    if (target === META_CHAT_STEP_RISCOS) {
      setRiskQuestionIndex(getFirstUnansweredRiskIndex(pacienteRef.current));
    }
  }, [resumeAfterLoadTick, introSessionKey]);

  useEffect(() => {
    if (step === 6) setAlturaInputStr('');
    if (step === 7) setCircInputStr('');
  }, [step]);

  useEffect(() => {
    if (step === META_CHAT_STEP_RISCOS) {
      setRiskQuestionIndex(getFirstUnansweredRiskIndex(paciente));
    }
  }, [step, paciente.dadosIdentificacao?.sexoBiologico]);

  const { current: progressCurrent, total: progressTotal } = getWizardProgressIndex(step, paciente);
  const progress = ((progressCurrent + 1) / progressTotal) * 100;
  const stepLabel = `${progressCurrent + 1} de ${progressTotal}`;

  const riskList = filterRiskQuestionsForSexo(paciente.dadosIdentificacao?.sexoBiologico);
  const currentRisk = step === META_CHAT_STEP_RISCOS ? riskList[riskQuestionIndex] : null;

  const v3Text = isPerfilMetabolicoChatStep(step) ? getPerfilMetabolicoBotText(step) : null;

  const stepTexts =
    step === META_CHAT_STEP_RISCOS && currentRisk
      ? { title: currentRisk.label, hint: currentRisk.hint }
      : v3Text
        ? splitStepText(v3Text)
        : step === META_CHAT_STEP_SOLICITACAO_ENVIADA
          ? { title: 'Solicitação enviada', hint: undefined }
          : step === META_CHAT_STEP_PERFIL_COMPLETO
            ? aguardandoAceiteMedico
              ? { title: 'Aguardando aceite do médico', hint: undefined }
              : splitStepText(TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA)
            : step === META_CHAT_STEP_MEDICO_UF
              ? aguardandoAceiteMedico || devePularSelecaoMedicoNoChat(paciente)
                ? null
                : splitStepText(TEXTO_PESQUISA_MEDICO)
              : step > META_CHAT_STEP_INTRO
                ? getStepTitleAndHint(step)
                : null;

  const isV3Step = isPerfilMetabolicoChatStep(step);
  const isTerminalStep = isMetaPacienteWizardTerminalStep(step);
  const showContinueButton =
    !isTerminalStep &&
    step !== META_CHAT_STEP_MEDICO_UF &&
    step !== META_CHAT_STEP_MEDICO_LISTA &&
    (step === META_CHAT_STEP_INTRO || step <= META_CHAT_STEP_METAS || isV3Step);

  const persist = useCallback(
    async (payload: PacienteCompleto) => {
      setSaving(true);
      try {
        await onSave(false, payload);
        pacienteRef.current = payload;
        setPacienteSynced(payload);
        setError('');
        return true;
      } catch {
        setError('Não foi possível salvar. Verifique a conexão e tente novamente.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [onSave, setPacienteSynced, setSaving]
  );

  const handleNext = useCallback(async () => {
    pacienteRef.current = paciente;
    let working = paciente;

    if (step === 6) {
      const cm = parseAlturaToCm(alturaInputStr);
      if (cm == null) {
        setError('Informe sua altura (cm ou metros, ex: 170 ou 1,70).');
        return;
      }
      working = {
        ...working,
        dadosClinicos: {
          ...working.dadosClinicos,
          medidasIniciais: patchMedidasIniciais(working.dadosClinicos?.medidasIniciais, { altura: cm }),
        },
      };
      setPacienteSynced(working);
      pacienteRef.current = working;
    }

    if (step === 7 && !working.dadosClinicos?.medidasIniciais?.circunferenciaNaoInformada) {
      const cm = parseCircToCm(circInputStr);
      if (cm != null) {
        working = {
          ...working,
          dadosClinicos: {
            ...working.dadosClinicos,
            medidasIniciais: patchMedidasIniciais(working.dadosClinicos?.medidasIniciais, {
              circunferenciaAbdominal: cm,
              circunferenciaNaoInformada: false,
            }),
          },
        };
        setPacienteSynced(working);
        pacienteRef.current = working;
      }
    }

    if (step === META_CHAT_STEP_COMORBIDADES) {
      working = {
        ...working,
        dadosClinicos: {
          ...working.dadosClinicos,
          chatComorbidadesEnviado: true,
        } as PacienteCompleto['dadosClinicos'],
      };
      setPacienteSynced(working);
      pacienteRef.current = working;
    }

    if (step === META_CHAT_STEP_METAS) {
      working = buildPacienteComMetasFinalizadas(working);
      working = {
        ...working,
        dadosClinicos: { ...working.dadosClinicos, tipoAvaliacaoInicial: 'completa' },
      };
      setPacienteSynced(working);
      pacienteRef.current = working;
    }

    if (step === STEP_PERFIL_METABOLICO_BARREIRAS) {
      working = applyExpectativaFromMetas(working);
      setPacienteSynced(working);
      pacienteRef.current = working;
    }

    const validationError = validateMetaChatStep(step, working, {
      riskQuestionIndex,
      medicoUi,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = ensureImcOnPaciente(working);
    const ok = await persist(payload);
    if (!ok) return;

    if (step === META_CHAT_STEP_RISCOS) {
      const list = filterRiskQuestionsForSexo(payload.dadosIdentificacao?.sexoBiologico);
      const riscos = payload.dadosClinicos?.riscos as Record<string, string> | undefined;
      const nextIdx = list.findIndex((r) => {
        const v = riscos?.[r.key];
        return v == null || String(v).trim() === '';
      });
      if (nextIdx >= 0 && nextIdx !== riskQuestionIndex) {
        setRiskQuestionIndex(nextIdx);
        return;
      }
    }

    const nextStep = getNextStepAfter(step, payload);
    setStep(clampWizardStep(nextStep, payload));
    if (nextStep === META_CHAT_STEP_RISCOS) {
      setRiskQuestionIndex(getFirstUnansweredRiskIndex(payload));
    }
  }, [alturaInputStr, circInputStr, medicoUi, paciente, persist, riskQuestionIndex, setPacienteSynced, step]);

  const handleBack = useCallback(() => {
    if (step === META_CHAT_STEP_RISCOS && riskQuestionIndex > 0) {
      setRiskQuestionIndex((i) => i - 1);
      setError('');
      return;
    }

    const prev = getPreviousStep(step, pacienteRef.current, riskQuestionIndex);
    if (prev == null) return;

    setStep(clampWizardStep(prev, pacienteRef.current));
    if (prev === META_CHAT_STEP_RISCOS) {
      const list = filterRiskQuestionsForSexo(pacienteRef.current.dadosIdentificacao?.sexoBiologico);
      setRiskQuestionIndex(Math.max(0, list.length - 1));
    }
    setError('');
  }, [riskQuestionIndex, step]);

  const handleIntroStart = useCallback(() => {
    try {
      sessionStorage.setItem(introSessionKey, '1');
    } catch {
      /* ignore */
    }
    if (!pacienteRef.current.dadosClinicos?.tipoAvaliacaoInicial) {
      setPacienteSynced((p) => ({
        ...p,
        dadosClinicos: { ...p.dadosClinicos, tipoAvaliacaoInicial: 'completa' },
      }));
    }
    setStep(1);
    setError('');
  }, [introSessionKey, setPacienteSynced]);

  const handleCircNaoSei = useCallback(async () => {
    const working: PacienteCompleto = {
      ...pacienteRef.current,
      dadosClinicos: {
        ...pacienteRef.current.dadosClinicos,
        medidasIniciais: patchMedidasIniciais(pacienteRef.current.dadosClinicos?.medidasIniciais, {
          circunferenciaAbdominal: 0,
          circunferenciaNaoInformada: true,
        }),
      },
    };
    setPacienteSynced(working);
    const payload = ensureImcOnPaciente(working);
    const ok = await persist(payload);
    if (!ok) return;
    setStep(8);
    setCircInputStr('');
  }, [persist, setPacienteSynced]);

  const renderStepContent = () => {
    if (step === META_CHAT_STEP_INTRO) {
      return <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{TEXTO_INTRO_HINT}</p>;
    }

    if (step === 1) {
      return (
        <FieldGrid>
          <div>
            <FieldLabel>Telefone</FieldLabel>
            <input
              type="tel"
              inputMode="numeric"
              className={inputClassName}
              value={paciente.dadosIdentificacao?.telefone || ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                setPacienteSynced((p) => ({
                  ...p,
                  dadosIdentificacao: { ...p.dadosIdentificacao, telefone: formatTelefone(raw) || undefined },
                }));
                setError('');
              }}
              placeholder="(11) 99999-9999"
            />
          </div>
        </FieldGrid>
      );
    }

    if (step === 2) {
      const d = paciente.dadosIdentificacao?.dataNascimento
        ? new Date(paciente.dadosIdentificacao.dataNascimento)
        : null;
      const day = d ? d.getDate() : '';
      const month = d ? d.getMonth() + 1 : '';
      const year = d ? d.getFullYear() : '';

      return (
        <FieldGrid>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Dia</FieldLabel>
              <input
                type="number"
                min={1}
                max={31}
                className={inputClassName}
                value={day === '' ? '' : day}
                onChange={(e) => {
                  const v = e.target.value ? parseInt(e.target.value, 10) : null;
                  const m = month || 1;
                  const y = year || new Date().getFullYear();
                  if (v && v >= 1 && v <= 31) {
                    setPacienteSynced((p) => ({
                      ...p,
                      dadosIdentificacao: {
                        ...p.dadosIdentificacao,
                        dataNascimento: new Date(y, Number(m) - 1, v),
                      },
                    }));
                  } else if (e.target.value === '') {
                    setPacienteSynced((p) => ({
                      ...p,
                      dadosIdentificacao: { ...p.dadosIdentificacao, dataNascimento: undefined },
                    }));
                  }
                  setError('');
                }}
                placeholder="DD"
              />
            </div>
            <div>
              <FieldLabel>Mês</FieldLabel>
              <select
                className={selectClassName}
                value={month === '' ? '' : month}
                onChange={(e) => {
                  const m = e.target.value ? parseInt(e.target.value, 10) : null;
                  const dVal = day || 1;
                  const y = year || new Date().getFullYear();
                  if (m) {
                    setPacienteSynced((p) => ({
                      ...p,
                      dadosIdentificacao: {
                        ...p.dadosIdentificacao,
                        dataNascimento: new Date(y, m - 1, Number(dVal)),
                      },
                    }));
                  }
                  setError('');
                }}
              >
                <option value="">Mês</option>
                {MESES.map((nome, i) => (
                  <option key={nome} value={i + 1}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Ano</FieldLabel>
              <select
                className={selectClassName}
                value={year === '' ? '' : year}
                onChange={(e) => {
                  const y = e.target.value ? parseInt(e.target.value, 10) : null;
                  const m = month || 1;
                  const dVal = day || 1;
                  if (y) {
                    setPacienteSynced((p) => ({
                      ...p,
                      dadosIdentificacao: {
                        ...p.dadosIdentificacao,
                        dataNascimento: new Date(y, Number(m) - 1, Number(dVal)),
                      },
                    }));
                  } else {
                    setPacienteSynced((p) => ({
                      ...p,
                      dadosIdentificacao: { ...p.dadosIdentificacao, dataNascimento: undefined },
                    }));
                  }
                  setError('');
                }}
              >
                <option value="">Ano</option>
                {BIRTH_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FieldGrid>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-2.5">
          {SEXO_OPTIONS.map(({ value, label }) => (
            <ChoiceButton
              key={value}
              selected={paciente.dadosIdentificacao?.sexoBiologico === value}
              onClick={() => {
                setPacienteSynced((p) => ({
                  ...p,
                  dadosIdentificacao: { ...p.dadosIdentificacao, sexoBiologico: value },
                }));
                setError('');
              }}
            >
              {label}
            </ChoiceButton>
          ))}
        </div>
      );
    }

    if (step === 4) {
      return (
        <FieldGrid>
          <div>
            <FieldLabel>CPF</FieldLabel>
            <input
              type="text"
              inputMode="numeric"
              className={inputClassName}
              value={formatCpf(paciente.dadosIdentificacao?.cpf || '')}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                setPacienteSynced((p) => ({
                  ...p,
                  dadosIdentificacao: { ...p.dadosIdentificacao, cpf: digits },
                }));
                setError('');
              }}
              placeholder="000.000.000-00"
            />
          </div>
        </FieldGrid>
      );
    }

    if (step === 5) {
      return (
        <FieldGrid>
          <div>
            <FieldLabel>Peso (kg)</FieldLabel>
            <input
              type="number"
              min={20}
              max={400}
              step={0.1}
              className={inputClassName}
              value={paciente.dadosClinicos?.medidasIniciais?.peso ?? ''}
              onChange={(e) => {
                const v = e.target.value ? parseFloat(e.target.value) : undefined;
                setPacienteSynced((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    medidasIniciais: patchMedidasIniciais(p.dadosClinicos?.medidasIniciais, {
                      peso: v ?? 0,
                    }),
                  },
                }));
                setError('');
              }}
              placeholder="Ex: 85,5"
            />
          </div>
        </FieldGrid>
      );
    }

    if (step === 6) {
      return (
        <FieldGrid>
          <div>
            <FieldLabel>Altura</FieldLabel>
            <input
              type="text"
              inputMode="decimal"
              className={inputClassName}
              value={alturaInputStr}
              onChange={(e) => {
                setAlturaInputStr(e.target.value);
                setError('');
              }}
              placeholder="170 ou 1,70 m"
            />
          </div>
        </FieldGrid>
      );
    }

    if (step === 7) {
      return (
        <FieldGrid>
          <div>
            <FieldLabel>Circunferência abdominal (cm)</FieldLabel>
            <input
              type="text"
              inputMode="decimal"
              className={inputClassName}
              value={circInputStr}
              onChange={(e) => {
                setCircInputStr(e.target.value);
                setError('');
              }}
              placeholder="102 ou 1,02 m"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleCircNaoSei()}
            disabled={saving}
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Não sei
          </button>
        </FieldGrid>
      );
    }

    if (step === 8) {
      const m = (paciente.dadosClinicos?.motivacao || {}) as Record<string, boolean>;
      return (
        <div className="space-y-3">
          <div className="space-y-2.5">
            {MOTIVACAO_OPTIONS.map(({ key, label }) => (
              <ChoiceButton
                key={key}
                selected={!!m[key]}
                onClick={() =>
                  setPacienteSynced((p) => ({
                    ...p,
                    dadosClinicos: {
                      ...p.dadosClinicos,
                      motivacao: {
                        ...(p.dadosClinicos?.motivacao || {}),
                        [key]: !m[key],
                      },
                    },
                  }))
                }
              >
                {label}
              </ChoiceButton>
            ))}
          </div>
          {m.outro && (
            <input
              type="text"
              className={inputClassName}
              value={paciente.dadosClinicos?.motivacaoOutro || ''}
              onChange={(e) =>
                setPacienteSynced((p) => ({
                  ...p,
                  dadosClinicos: { ...p.dadosClinicos, motivacaoOutro: e.target.value },
                }))
              }
              placeholder="Qual?"
            />
          )}
        </div>
      );
    }

    if (step === 9) {
      const dc = paciente.dadosClinicos as unknown as { diagnosticoPrincipalTipos?: string[] };
      const selected = (dc.diagnosticoPrincipalTipos ||
        (paciente.dadosClinicos?.diagnosticoPrincipal?.tipo
          ? [paciente.dadosClinicos.diagnosticoPrincipal.tipo]
          : [])) as string[];

      const toggle = (value: string) => {
        setPacienteSynced((p) => {
          const dc2 = p.dadosClinicos as unknown as { diagnosticoPrincipalTipos?: string[] };
          const arr = (dc2.diagnosticoPrincipalTipos ||
            (p.dadosClinicos?.diagnosticoPrincipal?.tipo ? [p.dadosClinicos.diagnosticoPrincipal.tipo] : [])) as string[];
          const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
          return {
            ...p,
            dadosClinicos: {
              ...p.dadosClinicos,
              diagnosticoPrincipal: {
                tipo: ((next[0] as DiagnosticoTipo) || 'outro') as DiagnosticoTipo,
                outro: p.dadosClinicos?.diagnosticoPrincipal?.outro,
              },
              diagnosticoPrincipalTipos: next,
            } as unknown as PacienteCompleto['dadosClinicos'],
          };
        });
      };

      return (
        <div className="space-y-3">
          <div className="space-y-2.5">
            {DIAGNOSTICO_TIPOS.map((value) => (
              <ChoiceButton key={value} selected={selected.includes(value)} onClick={() => toggle(value)}>
                {DIAGNOSTICO_LABELS[value]}
              </ChoiceButton>
            ))}
          </div>
          {selected.includes('outro') && (
            <input
              type="text"
              className={inputClassName}
              value={paciente.dadosClinicos?.diagnosticoPrincipal?.outro || ''}
              onChange={(e) =>
                setPacienteSynced((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    diagnosticoPrincipal: { tipo: 'outro', outro: e.target.value },
                  },
                }))
              }
              placeholder="Especificar outro"
            />
          )}
        </div>
      );
    }

    if (step === META_CHAT_STEP_COMORBIDADES) {
      const c = (paciente.dadosClinicos?.comorbidades || {}) as Record<string, unknown>;
      return (
        <div className="space-y-3">
          <div className="space-y-2.5">
            {COMORBIDADES_OPTIONS.map(({ key, label }) => (
              <ChoiceButton
                key={key}
                selected={!!c[key]}
                onClick={() =>
                  setPacienteSynced((p) => {
                    const cur = (p.dadosClinicos?.comorbidades || {}) as Record<string, unknown>;
                    return {
                      ...p,
                      dadosClinicos: {
                        ...p.dadosClinicos,
                        comorbidades: { ...cur, [key]: !Boolean(cur[key]) },
                      },
                    };
                  })
                }
              >
                {label}
              </ChoiceButton>
            ))}
          </div>
          {Boolean(c.outra) && (
            <input
              type="text"
              className={inputClassName}
              value={String(c.outraDescricao || '')}
              onChange={(e) =>
                setPacienteSynced((p) => {
                  const cur = (p.dadosClinicos?.comorbidades || {}) as Record<string, unknown>;
                  return {
                    ...p,
                    dadosClinicos: {
                      ...p.dadosClinicos,
                      comorbidades: { ...cur, outraDescricao: e.target.value },
                    },
                  };
                })
              }
              placeholder="Qual?"
            />
          )}
        </div>
      );
    }

    if (step === META_CHAT_STEP_RISCOS && currentRisk) {
      const riscos = paciente.dadosClinicos?.riscos as Record<string, string> | undefined;
      return (
        <div className="space-y-2.5">
          {currentRisk.options.map((opt) => (
            <ChoiceButton
              key={opt}
              selected={riscos?.[currentRisk.key] === opt}
              onClick={() =>
                setPacienteSynced((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    riscos: {
                      ...(p.dadosClinicos?.riscos || {}),
                      [currentRisk.key]: opt,
                    } as Riscos,
                  },
                }))
              }
            >
              {riskOptionLabel(opt)}
            </ChoiceButton>
          ))}
        </div>
      );
    }

    if (step === 12) {
      const selected = paciente.dadosClinicos?.historiaTireoidiana;
      return (
        <div className="space-y-3">
          <div className="space-y-2.5">
            {TIREOIDE_OPTIONS.map(({ value, label }) => (
              <ChoiceButton
                key={value}
                selected={selected === value}
                onClick={() =>
                  setPacienteSynced((p) => ({
                    ...p,
                    dadosClinicos: {
                      ...p.dadosClinicos,
                      historiaTireoidiana: value as HistoriaTireoide,
                    },
                  }))
                }
              >
                {label}
              </ChoiceButton>
            ))}
          </div>
          {selected === 'outro' && (
            <input
              type="text"
              className={inputClassName}
              value={paciente.dadosClinicos?.historiaTireoidianaOutro || ''}
              onChange={(e) =>
                setPacienteSynced((p) => ({
                  ...p,
                  dadosClinicos: { ...p.dadosClinicos, historiaTireoidianaOutro: e.target.value },
                }))
              }
              placeholder="Qual?"
            />
          )}
        </div>
      );
    }

    if (step === 13) {
      const sintomasGI = (paciente.dadosClinicos?.sintomasGI || {}) as Record<string, boolean>;
      return (
        <div className="space-y-2.5">
          {SINTOMAS_GI_OPTIONS.map(({ key, label }) => (
            <ChoiceButton
              key={key}
              selected={!!sintomasGI[key]}
              onClick={() =>
                setPacienteSynced((p) => {
                  const cur = (p.dadosClinicos?.sintomasGI || {}) as Record<string, boolean>;
                  return {
                    ...p,
                    dadosClinicos: {
                      ...p.dadosClinicos,
                      sintomasGI: { ...cur, [key]: !cur[key] },
                    },
                  };
                })
              }
            >
              {label}
            </ChoiceButton>
          ))}
        </div>
      );
    }

    if (step === META_CHAT_STEP_METAS) {
      return <MetaPacienteWizardStepMetas paciente={paciente} setPaciente={setPacienteSynced} />;
    }

    if (isPerfilMetabolicoChatStep(step)) {
      return (
        <PerfilMetabolicoV3ChatUI
          step={step}
          paciente={paciente}
          setPaciente={setPacienteSynced}
          wizardMode
        />
      );
    }

    if (isMetaPacienteWizardMedicoStep(step)) {
      return (
        <MetaPacienteWizardStepMedico
          step={step}
          paciente={paciente}
          setPaciente={setPacienteSynced}
          medicoUi={medicoUi}
          setMedicoUi={setMedicoUi}
          onGoToStep={(s) => {
            setStep(clampWizardStep(s, pacienteRef.current));
            setError('');
          }}
          onSave={onSave}
          saving={saving}
          setSaving={setSaving}
          onCreateSolicitacao={onCreateSolicitacao}
          onCheckSolicitacaoAberta={onCheckSolicitacaoAberta}
          aguardandoAceiteMedico={aguardandoAceiteMedico}
        />
      );
    }

    return null;
  };

  const shellClass = embedded
    ? 'flex flex-col h-full min-h-0 max-h-[calc(100vh-8rem)] rounded-xl border border-slate-200 overflow-hidden bg-white'
    : 'flex flex-col h-full min-h-0 overflow-hidden bg-white';

  const aplicacaoPageTheme = headerWhiteLabel?.publicPages.aplicacao ?? null;

  return (
    <div className={shellClass}>
      <div className="shrink-0 bg-white/90 border-b border-slate-200/80 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            {aplicacaoPageTheme ? (
              <PublicPageTopLogo theme={aplicacaoPageTheme} brandName={headerWhiteLabel?.brandName} />
            ) : chatTitle ? (
              <h2 className="text-base font-bold truncate text-slate-900">{chatTitle}</h2>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500">{stepLabel}</span>
            {embedded && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
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

      {sandboxBanner && (
        <div className="shrink-0 px-3 py-2 bg-amber-50 text-amber-900 text-xs border-b border-amber-200/80">
          Preview do wizard — toggle para comparar com chat legado.
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 flex flex-col px-4 py-5 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step === META_CHAT_STEP_RISCOS ? `risk-${riskQuestionIndex}` : step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {step === META_CHAT_STEP_INTRO ? (
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mb-4">
                {TEXTO_INTRO_TITULO}
              </h1>
            ) : stepTexts ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-2 leading-snug">
                  {stepTexts.title}
                </label>
                {stepTexts.hint ? <StepHint>{stepTexts.hint}</StepHint> : null}
              </>
            ) : null}

            {renderStepContent()}

            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-slate-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white">
        <div className="flex gap-3">
          {step > META_CHAT_STEP_INTRO && !isTerminalStep && (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          {!showContinueButton ? null : (
            <button
              type="button"
              onClick={step === META_CHAT_STEP_INTRO ? handleIntroStart : () => void handleNext()}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : step === META_CHAT_STEP_INTRO ? (
                'Começar agora'
              ) : (
                'Continuar'
              )}
            </button>
          )}
          {isTerminalStep && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
