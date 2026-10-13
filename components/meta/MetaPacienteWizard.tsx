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
import MetaPacienteConsultaBookingPanel, {
  type MedicoConsultaBookingPhase,
} from '@/components/meta/MetaPacienteConsultaBookingPanel';
import DiagnosticoCondicoesPicker from '@/components/meta/DiagnosticoCondicoesPicker';
import ComorbidadesChecklist from '@/components/meta/ComorbidadesChecklist';
import CirurgiasChecklist from '@/components/meta/CirurgiasChecklist';
import MedicamentosDiabetesPicker from '@/components/meta/MedicamentosDiabetesPicker';
import { textoMedicamentosDiabetes } from '@/lib/meta/metaChatInicial/medicamentosDiabetes';
import { comRespostaTriagemHumor, respostaDepressao, respostaIdeacao, TRIAGEM_SIM_NAO } from '@/lib/meta/metaChatInicial/triagemHumor';
import PerfilMetabolicoV3ChatUI from '@/components/meta/PerfilMetabolicoV3ChatUI';
import {
  applyExpectativaFromMetas,
  getPerfilMetabolicoBotText,
  isPerfilMetabolicoChatStep,
  STEP_PERFIL_METABOLICO_BARREIRAS,
} from '@/lib/meta/perfilMetabolicoV3Chat';
import {
  filterRiskQuestionsForSexo,
  formatCpf,
  getFirstUnansweredRiskIndex,
  getNextMetaPacienteWizardStep,
  getPreviousMetaPacienteWizardStep,
  getStepTitleAndHint,
  MESES,
  META_CHAT_INTRO_SANDBOX_SESSION_KEY,
  META_CHAT_INTRO_SESSION_KEY,
  META_CHAT_STEP_CIRURGIAS,
  META_CHAT_STEP_COMORBIDADES,
  META_CHAT_STEP_DEPRESSAO,
  META_CHAT_STEP_IDEACAO_SUICIDA,
  META_CHAT_STEP_INTRO,
  META_CHAT_STEP_LOCALIZACAO,
  META_CHAT_STEP_MEDICAMENTOS_DIABETES,
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
  getMetaChatWizardProgressIndex,
  type MetaChatMedicoUiState,
} from '@/lib/meta/metaChatInicial';
import PublicPageTopLogo from '@/components/public/PublicPageTopLogo';
import RulerPicker from '@/components/meta/RulerPicker';
import { PatientLocationFields } from '@/components/localizacao/PatientLocationFields';
import { aplicarLocalizacaoResidencial } from '@/lib/meta/metaChatInicial/localizacaoResidencial';
import { InternationalPhoneInput } from '@/components/phone/InternationalPhoneInput';
import { persistedPhoneForIdentificacao } from '@/lib/phone/internationalPhoneValue';
import type { MedicoWhiteLabelResolved } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { ensureImcOnPaciente } from '@/lib/meta/medidasIniciaisImc';
import { listAnosNascimentoDesc } from '@/utils/dataNascimentoLocal';

const BIRTH_YEARS = listAnosNascimentoDesc();

const PESO_PADRAO_KG = 70;
const ALTURA_PADRAO_CM = 160;
const CINTURA_PADRAO_CM = 80;

function formatMedidaPt(value: number, digits: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function MedidaComRegua({
  label,
  value,
  min,
  max,
  step,
  unit,
  digits,
  ariaLabel,
  onChange,
  children,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  digits: number;
  ariaLabel: string;
  onChange: (value: number) => void;
  children?: React.ReactNode;
}) {
  const shown = digits === 0 ? String(Math.round(value)) : formatMedidaPt(value, digits);
  return (
    <div className="space-y-3">
      <FieldLabel>{label}</FieldLabel>
      <p className="text-xs text-slate-500">Arraste a régua ou digite o valor</p>
      <p className="text-center leading-none">
        <span className="text-4xl font-bold tabular-nums tracking-tight text-emerald-600">{shown}</span>
        <span className="ml-1 text-base font-semibold text-emerald-700">{unit}</span>
      </p>
      <RulerPicker
        value={value}
        min={min}
        max={max}
        step={step}
        unit={unit}
        ariaLabel={ariaLabel}
        onChange={onChange}
      />
      {children}
    </div>
  );
}

/** Wizard: fluxo completo até solicitação médico (18) ou perfil completo (17). */
export function getMetaPacienteWizardMaxStep(p: PacienteCompleto): number {
  if (devePularSelecaoMedicoNoChat(p)) return META_CHAT_STEP_PERFIL_COMPLETO;
  return META_CHAT_STEP_SOLICITACAO_ENVIADA;
}

function normalizeWizardStep(raw: number): number {
  if (raw === META_CHAT_STEP_MEDICO_LISTA) return META_CHAT_STEP_MEDICO_UF;
  return raw;
}

function clampWizardStep(raw: number, p: PacienteCompleto): number {
  const normalized = normalizeWizardStep(raw);
  const max = getMetaPacienteWizardMaxStep(p);
  if (normalized === META_CHAT_STEP_LOCALIZACAO) return normalized;
  if (normalized === META_CHAT_STEP_CIRURGIAS) return normalized;
  if (normalized === META_CHAT_STEP_MEDICAMENTOS_DIABETES) return normalized;
  if (normalized === META_CHAT_STEP_DEPRESSAO) return normalized;
  if (normalized === META_CHAT_STEP_IDEACAO_SUICIDA) return normalized;
  if (isPerfilMetabolicoChatStep(normalized)) return normalized;
  if (normalized >= 15 && normalized <= 18) return normalized;
  return Math.min(Math.max(normalized, META_CHAT_STEP_INTRO), max);
}

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
  const [bookingPhase, setBookingPhase] = useState<MedicoConsultaBookingPhase>('off');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatCompletoMarcadoRef = useRef(false);

  const aguardandoAceiteMedico =
    solicitacaoMedicoPendente && paciente.statusTratamento !== 'em_tratamento'
      ? { medicoNome: solicitacaoMedicoPendente.medicoNome }
      : null;

  const bookingMedicoId = (
    paciente.medicoResponsavelId ||
    paciente.medicoRecomendadoId ||
    solicitacaoMedicoPendente?.medicoId ||
    ''
  ).trim();

  const canShowPublicBooking =
    !embedded &&
    !sandboxBanner &&
    Boolean(paciente.id && bookingMedicoId) &&
    (devePularSelecaoMedicoNoChat(paciente) || Boolean(solicitacaoMedicoPendente));

  const showBookingPanel =
    step === META_CHAT_STEP_PERFIL_COMPLETO &&
    canShowPublicBooking &&
    bookingPhase !== 'off';

  /** Link do médico ou solicitação já criada: não exibir busca por UF/cidade. */
  useEffect(() => {
    if (step !== META_CHAT_STEP_MEDICO_UF && step !== META_CHAT_STEP_MEDICO_LISTA) return;
    if (!devePularSelecaoMedicoNoChat(paciente) && !aguardandoAceiteMedico) return;
    setStep(META_CHAT_STEP_PERFIL_COMPLETO);
  }, [step, paciente, aguardandoAceiteMedico]);

  useEffect(() => {
    if (step !== META_CHAT_STEP_PERFIL_COMPLETO || !canShowPublicBooking) return;
    setBookingPhase((prev) => (prev === 'off' ? 'loading' : prev));
  }, [canShowPublicBooking, step]);

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
    if (step === 5) {
      const peso = pacienteRef.current.dadosClinicos?.medidasIniciais?.peso;
      if (peso && peso > 0) return;
      setPacienteSynced((p) => ({
        ...p,
        dadosClinicos: {
          ...p.dadosClinicos,
          medidasIniciais: patchMedidasIniciais(p.dadosClinicos?.medidasIniciais, { peso: PESO_PADRAO_KG }),
        },
      }));
      return;
    }
    if (step === 6) {
      const saved = pacienteRef.current.dadosClinicos?.medidasIniciais?.altura;
      setAlturaInputStr(saved && saved > 0 ? String(Math.round(saved)) : String(ALTURA_PADRAO_CM));
      return;
    }
    if (step === 7) {
      const mi = pacienteRef.current.dadosClinicos?.medidasIniciais;
      if (mi?.circunferenciaNaoInformada) {
        setCircInputStr('');
        return;
      }
      const saved = mi?.circunferenciaAbdominal;
      setCircInputStr(saved && saved > 0 ? String(Math.round(saved)) : String(CINTURA_PADRAO_CM));
    }
  }, [step, setPacienteSynced]);

  useEffect(() => {
    if (step === META_CHAT_STEP_RISCOS) {
      setRiskQuestionIndex(getFirstUnansweredRiskIndex(paciente));
    }
  }, [step, paciente.dadosIdentificacao?.sexoBiologico]);

  const { current: progressCurrent, total: progressTotal } = getMetaChatWizardProgressIndex(step, paciente);
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
            ? showBookingPanel
              ? bookingPhase === 'done'
                ? { title: 'Consulta agendada', hint: undefined }
                : bookingPhase === 'review'
                  ? {
                      title: 'Revise seu agendamento',
                      hint: 'Confira seus dados e o horário antes de concluir.',
                    }
                  : {
                      title: 'Agende sua consulta',
                      hint: 'Toque no dia disponível no calendário e escolha um horário com o seu médico.',
                    }
              : aguardandoAceiteMedico
              ? { title: 'Aguardando aceite do médico', hint: undefined }
              : splitStepText(TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA)
            : step === META_CHAT_STEP_MEDICO_UF
              ? aguardandoAceiteMedico || devePularSelecaoMedicoNoChat(paciente)
                ? null
                : splitStepText(TEXTO_PESQUISA_MEDICO)
              : step === META_CHAT_STEP_MEDICAMENTOS_DIABETES
                ? splitStepText(textoMedicamentosDiabetes(paciente))
              : step > META_CHAT_STEP_INTRO
                ? getStepTitleAndHint(step)
                : null;

  const isV3Step = isPerfilMetabolicoChatStep(step);
  const isTerminalStep = isMetaPacienteWizardTerminalStep(step);
  const showContinueButton =
    !isTerminalStep &&
    step !== META_CHAT_STEP_MEDICO_UF &&
    step !== META_CHAT_STEP_MEDICO_LISTA &&
    (step === META_CHAT_STEP_INTRO ||
      step === META_CHAT_STEP_LOCALIZACAO ||
      step === META_CHAT_STEP_CIRURGIAS ||
      step === META_CHAT_STEP_MEDICAMENTOS_DIABETES ||
      step === META_CHAT_STEP_DEPRESSAO ||
      step === META_CHAT_STEP_IDEACAO_SUICIDA ||
      step <= META_CHAT_STEP_METAS ||
      isV3Step);

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

    const nextStep = getNextMetaPacienteWizardStep(step, payload);
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

    const prev = getPreviousMetaPacienteWizardStep(step, pacienteRef.current, riskQuestionIndex);
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
          <div className="min-w-0">
            <FieldLabel htmlFor="meta-anamnese-telefone">Telefone</FieldLabel>
            <InternationalPhoneInput
              id="meta-anamnese-telefone"
              value={{
                telefone: paciente.dadosIdentificacao?.telefone,
                telefoneDdi: paciente.dadosIdentificacao?.telefoneDdi,
                telefonePais: paciente.dadosIdentificacao?.telefonePais,
              }}
              onChange={(next) => {
                const phone = persistedPhoneForIdentificacao(next);
                setPacienteSynced((p) => ({
                  ...p,
                  dadosIdentificacao: {
                    ...p.dadosIdentificacao,
                    ...phone,
                  },
                }));
                setError('');
              }}
            />
          </div>
        </FieldGrid>
      );
    }

    if (step === META_CHAT_STEP_LOCALIZACAO) {
      const endereco = paciente.dadosIdentificacao?.endereco;
      return (
        <FieldGrid>
          <PatientLocationFields
            id="meta-anamnese-localizacao"
            required
            value={{
              estado: endereco?.estado,
              cidade: endereco?.cidade,
              codigoIbge: endereco?.codigoIbge,
            }}
            onChange={(next) => {
              setPacienteSynced((p) => aplicarLocalizacaoResidencial(p, next));
              setError('');
            }}
          />
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
      const pesoSalvo = paciente.dadosClinicos?.medidasIniciais?.peso;
      const pesoRegua = pesoSalvo && pesoSalvo > 0 ? pesoSalvo : PESO_PADRAO_KG;
      const gravarPeso = (kg: number) => {
        const peso = Math.round(kg * 10) / 10;
        setPacienteSynced((p) => ({
          ...p,
          dadosClinicos: {
            ...p.dadosClinicos,
            medidasIniciais: patchMedidasIniciais(p.dadosClinicos?.medidasIniciais, { peso }),
          },
        }));
        setError('');
      };
      return (
        <MedidaComRegua
          label="Peso (kg)"
          value={pesoRegua}
          min={20}
          max={400}
          step={0.1}
          unit="kg"
          digits={1}
          ariaLabel={`Peso atual: ${formatMedidaPt(pesoRegua, 1)} quilogramas`}
          onChange={gravarPeso}
        >
          <input
            type="number"
            min={20}
            max={400}
            step={0.1}
            className={inputClassName}
            value={pesoSalvo && pesoSalvo > 0 ? pesoSalvo : PESO_PADRAO_KG}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0) gravarPeso(v);
            }}
            placeholder="Ex: 85,5"
          />
        </MedidaComRegua>
      );
    }

    if (step === 6) {
      const alturaCm = parseAlturaToCm(alturaInputStr);
      const alturaRegua = alturaCm && alturaCm > 0 ? alturaCm : ALTURA_PADRAO_CM;
      return (
        <MedidaComRegua
          label="Altura"
          value={alturaRegua}
          min={130}
          max={210}
          step={1}
          unit="cm"
          digits={0}
          ariaLabel={`Altura: ${Math.round(alturaRegua)} centímetros`}
          onChange={(cm) => {
            setAlturaInputStr(String(Math.round(cm)));
            setError('');
          }}
        >
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
        </MedidaComRegua>
      );
    }

    if (step === 7) {
      const naoSei = !!paciente.dadosClinicos?.medidasIniciais?.circunferenciaNaoInformada;
      const circCm = parseCircToCm(circInputStr);
      const circRegua = circCm && circCm > 0 ? circCm : CINTURA_PADRAO_CM;
      const gravarCirc = (cm: number) => {
        const circunferenciaAbdominal = Math.round(cm);
        setCircInputStr(String(circunferenciaAbdominal));
        setPacienteSynced((p) => ({
          ...p,
          dadosClinicos: {
            ...p.dadosClinicos,
            medidasIniciais: patchMedidasIniciais(p.dadosClinicos?.medidasIniciais, {
              circunferenciaAbdominal,
              circunferenciaNaoInformada: false,
            }),
          },
        }));
        setError('');
      };
      return (
        <div className="space-y-4">
          <MedidaComRegua
            label="Circunferência abdominal (cm)"
            value={circRegua}
            min={50}
            max={170}
            step={1}
            unit="cm"
            digits={0}
            ariaLabel={`Circunferência abdominal: ${Math.round(circRegua)} centímetros`}
            onChange={gravarCirc}
          >
            <input
              type="text"
              inputMode="decimal"
              className={inputClassName}
              value={circInputStr}
              onChange={(e) => {
                setCircInputStr(e.target.value);
                setError('');
                const cm = parseCircToCm(e.target.value);
                if (!cm || cm <= 0) return;
                setPacienteSynced((p) => ({
                  ...p,
                  dadosClinicos: {
                    ...p.dadosClinicos,
                    medidasIniciais: patchMedidasIniciais(p.dadosClinicos?.medidasIniciais, {
                      circunferenciaAbdominal: Math.round(cm),
                      circunferenciaNaoInformada: false,
                    }),
                  },
                }));
              }}
              placeholder="102 ou 1,02 m"
            />
          </MedidaComRegua>
          <button
            type="button"
            onClick={() => void handleCircNaoSei()}
            disabled={saving}
            className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium ${
              naoSei
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Não sei
          </button>
        </div>
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
      return (
        <DiagnosticoCondicoesPicker paciente={paciente} setPaciente={setPacienteSynced} />
      );
    }

    if (step === META_CHAT_STEP_MEDICAMENTOS_DIABETES) {
      return <MedicamentosDiabetesPicker paciente={paciente} setPaciente={setPacienteSynced} />;
    }

    if (step === META_CHAT_STEP_COMORBIDADES) {
      return <ComorbidadesChecklist paciente={paciente} setPaciente={setPacienteSynced} />;
    }

    if (step === META_CHAT_STEP_CIRURGIAS) {
      return <CirurgiasChecklist paciente={paciente} setPaciente={setPacienteSynced} />;
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

    if (step === META_CHAT_STEP_DEPRESSAO || step === META_CHAT_STEP_IDEACAO_SUICIDA) {
      const campo =
        step === META_CHAT_STEP_DEPRESSAO ? 'depressaoOuAnedonia30Dias' : 'ideacaoSuicida12Meses';
      const selected =
        step === META_CHAT_STEP_DEPRESSAO
          ? respostaDepressao(paciente.dadosClinicos)
          : respostaIdeacao(paciente.dadosClinicos);
      return (
        <div className="space-y-2.5">
          {TRIAGEM_SIM_NAO.map(({ value, label }) => (
            <ChoiceButton
              key={value}
              selected={selected === value}
              onClick={() => setPacienteSynced((p) => comRespostaTriagemHumor(p, campo, value))}
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
      if (showBookingPanel && paciente.id && bookingMedicoId) {
        return (
          <MetaPacienteConsultaBookingPanel
            pacienteId={paciente.id}
            medicoId={bookingMedicoId}
            onPhaseChange={setBookingPhase}
          />
        );
      }
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

      <div ref={scrollRef} className="meta-wizard-scroll flex-1 min-h-0 flex flex-col px-4 py-5 overflow-y-auto bg-white">
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
                {stepTexts.hint && step !== META_CHAT_STEP_METAS ? (
                  <StepHint>{stepTexts.hint}</StepHint>
                ) : null}
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
              className={
                showBookingPanel && (bookingPhase === 'agenda' || bookingPhase === 'review')
                  ? 'flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50'
                  : 'flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
              }
            >
              {showBookingPanel && (bookingPhase === 'agenda' || bookingPhase === 'review')
                ? 'Agendar depois'
                : 'Fechar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
