'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, User as UserIcon, Loader2, Send, MapPin, Star, BadgeCheck, Badge, AlertTriangle } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';
import { MedicoService } from '@/services/medicoService';
import { ClassificacaoProfissionalService } from '@/services/classificacaoProfissionalService';
import { gerarSlugDrMedico } from '@/utils/medicoDrSlug';
import {
  resolveMetaPerdaPesoAtiva,
  resolveMetaReducaoCinturaAtiva,
  resolveMetasTratamentoModuloResumo,
} from '@/utils/metasTratamentoSwitches';
import { pacienteMetaTemDataNascimentoCadastro } from '@/utils/pacienteMetaChatResume';

const TYPING_DELAY_MS = 1500;
const OPTIONS_DELAY_MS = 500;
/** Intro "Começar" no fluxo real (/meta, metaadmin). */
export const META_CHAT_INTRO_SESSION_KEY = 'meta-chat-intro-v2';
/** Intro isolada do preview em metaadmingeral/chatinicial (não herda session do /meta). */
export const META_CHAT_INTRO_SANDBOX_SESSION_KEY = 'meta-chat-intro-sandbox-v1';

/** Foto de perfil do médico na lista do chat; fallback: inicial ou ícone. */
function MedicoChatListAvatar({ medico }: { medico: Medico }) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = (medico.fotoPerfilUrl || '').trim();
  const initial = (medico.nome || '').trim().charAt(0).toUpperCase();
  const alt = medico.nome ? `Foto de ${medico.nome}` : 'Foto do médico';

  if (url && !imgFailed) {
    return (
      <img
        src={url}
        alt={alt}
        width={40}
        height={40}
        className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 bg-gray-100"
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-[#075e54] text-white flex items-center justify-center shrink-0 text-sm font-semibold">
      {initial || <UserIcon size={20} />}
    </div>
  );
}

function isIntroSessionDone(introKey: string): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(introKey) === '1';
}

/** Mensagens do bot por step (1=telefone … 14=metas peso/cintura). Step 0=intro sem bot. */
const CHAT_BOT_TEXTS: string[] = [
  'Pra começar, me passa seu telefone.\n\nO médico usará esse número para entrar em contato com você.',
  'Quando você nasceu?\n\nIsso ajuda a ajustar o tratamento com mais precisão.',
  'Qual seu gênero?',
  'Qual seu CPF?\n\nUsado apenas para registro médico seguro.',
  'Qual seu peso atual?\n\nPode ser aproximado, sem problema.',
  'Qual sua altura?\n\nVocê pode informar em centímetros ou em metros.',
  'Você sabe sua circunferência abdominal?',
  'O que mais te incomoda hoje em relação ao seu peso?\n\nPode marcar mais de uma opção.',
  'Você tem alguma dessas condições? Pode marcar a que melhor descreve o motivo principal do seu acompanhamento.\n\nUsamos nomes mais simples para facilitar a escolha.',
  'Além disso, você tem ou já teve alguma dessas condições? Pode marcar mais de uma.',
  'Agora algumas perguntas rápidas sobre sua saúde — isso nos ajuda a garantir que o tratamento seja seguro para você.',
  'Em relação à tireoide, qual situação se aplica a você?',
  'Você costuma ter algum desses sintomas digestivos? Marque os que se aplicam.',
  'Defina suas metas para o tratamento: quanto do seu peso inicial você deseja perder (%) e, se você informou a circunferência abdominal, quantos centímetros deseja reduzir.\n\nUse as barras abaixo e toque em Enviar quando estiver satisfeito(a).',
];

const TEXTO_PESQUISA_MEDICO =
  'Perfeito. Já conseguimos montar seu perfil inicial. Agora selecione seu estado e cidade para encontrar um médico.\n\nVamos te conectar com um profissional para avaliar seu caso e iniciar seu plano.';

const TEXTO_FECHAMENTO_PERFIL =
  'Perfeito. Com base nas suas respostas, já conseguimos montar seu perfil inicial para o tratamento.';

/** Após metas: médico já vinculado ao cadastro — sem escolher médico de novo neste chat. */
const TEXTO_POS_METAS_SEM_BUSCA_MEDICO =
  'Seu médico já está vinculado ao seu cadastro — não é preciso escolher outro aqui. Continue usando o app normalmente.';

/** Passo 17: perfil completo sem busca por médico (só quando há médico responsável vinculado). */
const TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA =
  'Seu perfil está completo. Como você já tem médico vinculado, a busca por profissional não aparece neste chat.';

const CHAT_CIRC_DETAIL =
  'Qual sua circunferência abdominal inicial?\n\nSe quiser, pode informar em cm ou metros.';

type DiagnosticoTipo = NonNullable<PacienteCompleto['dadosClinicos']['diagnosticoPrincipal']>['tipo'];
type Riscos = NonNullable<PacienteCompleto['dadosClinicos']['riscos']>;
type HistoriaTireoide = NonNullable<PacienteCompleto['dadosClinicos']['historiaTireoidiana']>;

/** Estados brasileiros (UF) para seleção */
const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, (_, a) => a ? `(${a}` : '');
  return digits.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? '-' + c : ''}`);
}

const DIAGNOSTICO_LABELS: Record<string, string> = {
  dm1: 'Diabetes tipo 1',
  dm2: 'Diabetes tipo 2',
  pre_diabetes: 'Pré-diabetes',
  sobrepeso_comorbidade: 'Sobrepeso com problema de saúde',
  sop_ri: 'Ovário policístico (SOP)',
  ehna_sem_dm2: 'Gordura no fígado / esteatose hepática',
  obesidade: 'Obesidade',
  resistencia_insulinica: 'Resistência à insulina / síndrome metabólica',
  outro: 'Outro',
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => [a, b, c].filter(Boolean).join('.') + (d ? `-${d}` : ''));
}

/** Converte input de altura para cm: se tiver ponto ou vírgula = metros; senão = cm. Usado só no envio. */
function parseAlturaToCm(raw: string): number | undefined {
  const s = raw.replace(',', '.').trim();
  if (!s) return undefined;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return undefined;
  const isMeters = raw.includes(',') || raw.includes('.');
  if (isMeters) return Math.round(n * 100);
  return Math.round(n);
}

/** Converte input circunferência para cm: ponto ou vírgula = metros; senão = cm. Usado só no envio. */
function parseCircToCm(raw: string): number | undefined {
  const s = raw.replace(',', '.').trim();
  if (!s) return undefined;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return undefined;
  const isMeters = raw.includes(',') || raw.includes('.');
  if (isMeters) return Math.round(n * 100);
  return Math.round(n);
}

const RISK_QUESTIONS: { key: string; label: string; options: readonly ('sim' | 'nao' | 'desconheco')[] }[] = [
  { key: 'pancreatitePrevia', label: 'Você já teve pancreatite?', options: ['sim', 'nao'] },
  {
    key: 'gastroparesia',
    label: 'Você tem ou já teve esvaziamento lento do estômago (gastroparesia)?',
    options: ['sim', 'nao'],
  },
  {
    key: 'historicoCMT_MEN2',
    label: 'Existe histórico familiar de câncer medular de tireoide (CMT) ou MEN2?',
    options: ['sim', 'nao', 'desconheco'],
  },
  { key: 'gestacao', label: 'Você está grávida ou pode estar?', options: ['sim', 'nao', 'desconheco'] },
  { key: 'lactacao', label: 'Você está em período de amamentação?', options: ['sim', 'nao'] },
];

/** Índice na lista filtrada por sexo da primeira pergunta de risco ainda sem resposta (passo 11). */
function getFirstUnansweredRiskIndex(p: PacienteCompleto): number {
  const sexo = p.dadosIdentificacao?.sexoBiologico;
  const riskList = RISK_QUESTIONS.filter((r) =>
    r.key === 'gestacao' || r.key === 'lactacao' ? sexo === 'F' || sexo === 'Outro' : true
  );
  if (riskList.length === 0) return 0;
  const riscos = p.dadosClinicos?.riscos as Record<string, string> | undefined;
  const idx = riskList.findIndex((r) => {
    const v = riscos?.[r.key];
    return v == null || String(v).trim() === '';
  });
  return idx < 0 ? 0 : idx;
}

function motivacaoPreenchida(p: PacienteCompleto): boolean {
  const m = p.dadosClinicos?.motivacao;
  if (!m || typeof m !== 'object') return false;
  const keys = ['estetica', 'cansaco_falta_energia', 'saude_exames_alterados', 'autoestima', 'dificuldade_emagrecer'] as const;
  if (keys.some((k) => m[k])) return true;
  if (m.outro && (p.dadosClinicos?.motivacaoOutro || '').trim()) return true;
  if (m.outro) return true;
  return false;
}

function temCircunferenciaInicialParaMetas(
  mi: PacienteCompleto['dadosClinicos']['medidasIniciais'] | undefined
): boolean {
  if (!mi) return false;
  if ((mi as { circunferenciaNaoInformada?: boolean }).circunferenciaNaoInformada) return false;
  return mi.circunferenciaAbdominal != null && mi.circunferenciaAbdominal > 0;
}

/** Metas definidas pelo novo fluxo (barras); compatível com respostas antigas em objetivosTratamento. */
function metasTratamentoPasso14Ok(p: PacienteCompleto): boolean {
  const temCint = temCircunferenciaInicialParaMetas(p.dadosClinicos?.medidasIniciais);
  const metas = p.planoTerapeutico?.metas;
  if (!metas) return false;
  const modulo =
    metas.metasTratamentoModuloAtivo === true ||
    resolveMetasTratamentoModuloResumo(metas, temCint);
  if (!modulo) return false;

  const pesoOn = resolveMetaPerdaPesoAtiva(metas);
  const cintOn = resolveMetaReducaoCinturaAtiva(metas, temCint);
  if (!pesoOn && !cintOn) return false;

  if (pesoOn) {
    if (
      metas.weightLossTargetType !== 'PERCENTUAL' ||
      metas.weightLossTargetValue == null ||
      metas.weightLossTargetValue <= 0
    ) {
      return false;
    }
  }
  if (cintOn) {
    if (typeof metas.waistReductionTargetCm !== 'number' || Number.isNaN(metas.waistReductionTargetCm)) {
      return false;
    }
  }
  return true;
}

/** Só pula UF/cidade/lista quando há médico responsável vinculado (regra 2). Sem vínculo = regra 3, mostra seleção. */
function devePularSelecaoMedicoNoChat(p: PacienteCompleto): boolean {
  return !!(p?.medicoResponsavelId && String(p.medicoResponsavelId).trim());
}

/** Passos: 0 intro | 1 tel … 14 metas | 15 médico UF | 16 lista | 17 concluído sem busca (médico já vinculado) */
export function getFirstIncompleteStep(
  p: PacienteCompleto,
  introSessionKey: string = META_CHAT_INTRO_SESSION_KEY
): number {
  const tel = (p.dadosIdentificacao?.telefone || '').replace(/\D/g, '');
  if (tel.length < 10) return isIntroSessionDone(introSessionKey) ? 1 : 0;
  if (!pacienteMetaTemDataNascimentoCadastro(p)) return 2;
  if (!p.dadosIdentificacao?.sexoBiologico) return 3;
  if (!p.dadosIdentificacao?.cpf || (p.dadosIdentificacao.cpf || '').replace(/\D/g, '').length !== 11) return 4;
  const mi = p.dadosClinicos?.medidasIniciais;
  if (!mi?.peso) return 5;
  if (!mi?.altura) return 6;
  const circOk =
    (mi as { circunferenciaNaoInformada?: boolean }).circunferenciaNaoInformada ||
    (mi.circunferenciaAbdominal != null && mi.circunferenciaAbdominal > 0);
  if (!circOk) return 7;
  if (!motivacaoPreenchida(p)) return 8;
  const tipos = (p.dadosClinicos as { diagnosticoPrincipalTipos?: string[] })?.diagnosticoPrincipalTipos;
  const tipo = p.dadosClinicos?.diagnosticoPrincipal?.tipo;
  if (!((tipos && tipos.length > 0) || tipo)) return 9;
  const comb = p.dadosClinicos?.comorbidades as Record<string, unknown> | undefined;
  const comorbMarcada = comb && Object.keys(comb).some((k) => k !== 'outraDescricao' && comb[k]);
  const riscos = p.dadosClinicos?.riscos as Record<string, string> | undefined;
  const jaPassouComorbOuLegado =
    comorbMarcada ||
    p.dadosClinicos?.chatComorbidadesEnviado ||
    !!(riscos && riscos.pancreatitePrevia);
  if (!jaPassouComorbOuLegado) return 10;
  const sexo = p.dadosIdentificacao?.sexoBiologico;
  const riskList = RISK_QUESTIONS.filter((r) =>
    r.key === 'gestacao' || r.key === 'lactacao' ? sexo === 'F' || sexo === 'Outro' : true
  );
  const riscosOk = riskList.every((r) => riscos && (riscos as Record<string, string>)[r.key]);
  if (!riscosOk) return 11;
  const historiaTireoide = p.dadosClinicos?.historiaTireoidiana;
  const tireoideOutro = (p.dadosClinicos?.historiaTireoidianaOutro || '').trim();
  if (!(historiaTireoide || tireoideOutro)) return 12;
  const sintomas = p.dadosClinicos?.sintomasGI as Record<string, boolean> | undefined;
  const sintomasOk = sintomas && Object.keys(sintomas).some((k) => sintomas[k]);
  if (!sintomasOk) return 13;
  const obj = p.dadosClinicos?.objetivosTratamento as Record<string, unknown> | undefined;
  const objOk =
    !!obj &&
    (Object.keys(obj).some((k) => !['outroDescricao', 'outro'].includes(k) && obj[k]) ||
      (!!obj.outro && !!(obj.outroDescricao as string)?.trim()));
  if (!metasTratamentoPasso14Ok(p) && !objOk) return 14;
  if (devePularSelecaoMedicoNoChat(p)) return 17;
  return 15;
}

function getInitialBotTextForStep(step: number): string | null {
  if (step === 0) return null;
  if (step === 17) return null;
  if (step >= 15) return TEXTO_PESQUISA_MEDICO;
  return CHAT_BOT_TEXTS[step - 1] ?? null;
}

export default function ModalDadosPacienteChat({
  paciente,
  setPaciente,
  onClose,
  onSave,
  saving,
  setSaving,
  onCreateSolicitacao,
  onCheckSolicitacaoAberta,
  embedded = false,
  sandboxBanner = false,
  chatTitle = 'Completar dados',
  chatSubtitle = 'Médico',
  resumeAfterLoadTick = 0,
}: {
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
  onClose: () => void;
  /** Salva o paciente. Se closeAfter for true, o parent pode fechar o modal (ex.: após selecionar médico). */
  onSave: (closeAfter?: boolean, pacienteAtualizado?: PacienteCompleto) => Promise<void>;
  saving: boolean;
  setSaving: (v: boolean) => void;
  /** Se informado, ao confirmar solicitação o parent cria a solicitação (solicitacoes_medico) e a solicitação aparece em Minhas Solicitações. */
  onCreateSolicitacao?: (medico: { id: string; nome: string }, pacienteAtualizado: PacienteCompleto) => Promise<void>;
  /** Se informado, ao chegar no passo de selecionar médico (step 13) verifica se o paciente já tem solicitação em aberto; se tiver, não exige nova solicitação. */
  onCheckSolicitacaoAberta?: () => Promise<boolean>;
  /** Página preview (metaadmingeral): ocupa altura disponível e bordas próprias. */
  embedded?: boolean;
  /** Faixa aviso: dados não vão para produção quando onSave for noop. */
  sandboxBanner?: boolean;
  chatTitle?: string;
  chatSubtitle?: string;
  /** Incrementado quando o pai termina de recarregar o paciente (ex.: Firestore); realinha passo sem reabrir o modal. */
  resumeAfterLoadTick?: number;
}) {
  const introSessionKey = sandboxBanner
    ? META_CHAT_INTRO_SANDBOX_SESSION_KEY
    : META_CHAT_INTRO_SESSION_KEY;
  const firstStep = getFirstIncompleteStep(paciente, introSessionKey);
  const [messages, setMessages] = useState<Array<{ type: 'bot' | 'user'; text: string }>>([]);
  const [step, setStep] = useState(firstStep);
  const [riskQuestionIndex, setRiskQuestionIndex] = useState(() =>
    firstStep === 11 ? getFirstUnansweredRiskIndex(paciente) : 0
  );
  const [showTyping, setShowTyping] = useState(firstStep > 0 && firstStep !== 17);
  const [showOptionsAfterQuestion, setShowOptionsAfterQuestion] = useState(firstStep === 17);
  const [nextBotText, setNextBotText] = useState<string | null>(getInitialBotTextForStep(firstStep));
  const [alturaInputStr, setAlturaInputStr] = useState('');
  const [circInputStr, setCircInputStr] = useState('');
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedCidade, setSelectedCidade] = useState('');
  const [medicosFiltrados, setMedicosFiltrados] = useState<Medico[]>([]);
  const [agregadosMedicos, setAgregadosMedicos] = useState<Record<string, { count: number; media: number }>>({});
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [selectedMedicoId, setSelectedMedicoId] = useState<string | null>(null);
  const [showSolicitacaoEnviadaModal, setShowSolicitacaoEnviadaModal] = useState(false);
  const [showPerfilMedicoModal, setShowPerfilMedicoModal] = useState(false);
  const [medicoParaSolicitar, setMedicoParaSolicitar] = useState<Medico | null>(null);
  const [iframePerfilSrc, setIframePerfilSrc] = useState('');
  const [iframePerfilLoading, setIframePerfilLoading] = useState(true);
  const solicitacaoCriadaViaCallbackRef = useRef(false);
  const [hasSolicitacaoAbertaCheck, setHasSolicitacaoAbertaCheck] = useState<boolean | null>(null);
  /** Após ler o aviso de solicitação em aberto, esconde o modal grande e mantém só o resumo no chat */
  const [modalSolicitacaoMedicoDismissed, setModalSolicitacaoMedicoDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const addedFirstRiskQuestionRef = useRef(false);
  /** Step 7 circunferência: pergunta Sim/Não sei → depois input */
  const [circFase, setCircFase] = useState<'pergunta' | 'valor'>('pergunta');
  const pacienteRef = useRef(paciente);

  useEffect(() => {
    pacienteRef.current = paciente;
  }, [paciente]);

  /** Após loadPaciente no /meta, avança o passo se o Firestore já tem mais respostas (só quando o tick muda — não a cada tecla). */
  useEffect(() => {
    if (!resumeAfterLoadTick) return;
    const p = pacienteRef.current;
    const target = getFirstIncompleteStep(p, introSessionKey);
    setStep((prev) => (target > prev ? target : prev));
    if (target === 11) {
      setRiskQuestionIndex(getFirstUnansweredRiskIndex(p));
    }
  }, [resumeAfterLoadTick, introSessionKey]);

  // Ao sair do passo 15 (busca médico), resetar verificação e modal de bloqueio
  useEffect(() => {
    if (step !== 15) {
      setHasSolicitacaoAbertaCheck(null);
      setModalSolicitacaoMedicoDismissed(false);
    }
  }, [step]);

  useEffect(() => {
    if (hasSolicitacaoAbertaCheck !== true) setModalSolicitacaoMedicoDismissed(false);
  }, [hasSolicitacaoAbertaCheck]);

  // Ref estável: o callback do pai costuma mudar a cada render (ex.: após setMinhasSolicitacoes), o que reexecutava o efeito em loop ("Verificando solicitações...").
  const onCheckSolicitacaoRef = useRef(onCheckSolicitacaoAberta);
  onCheckSolicitacaoRef.current = onCheckSolicitacaoAberta;

  useEffect(() => {
    if (step !== 15 || !onCheckSolicitacaoRef.current) return;
    let cancelled = false;
    setHasSolicitacaoAbertaCheck(null);
    onCheckSolicitacaoRef.current().then((hasOpen) => {
      if (!cancelled) setHasSolicitacaoAbertaCheck(hasOpen);
    }).catch(() => {
      if (!cancelled) setHasSolicitacaoAbertaCheck(false);
    });
    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    if (step === 6) setAlturaInputStr('');
    if (step === 7 && circFase === 'valor') setCircInputStr('');
  }, [step, circFase]);

  useEffect(() => {
    if (step === 11) {
      setRiskQuestionIndex(0);
      addedFirstRiskQuestionRef.current = false;
    } else {
      addedFirstRiskQuestionRef.current = false;
    }
  }, [step]);

  useEffect(() => {
    if (step !== 11 || !showOptionsAfterQuestion || addedFirstRiskQuestionRef.current || !paciente?.dadosIdentificacao) return;
    const sexo = paciente.dadosIdentificacao.sexoBiologico;
    const riskList = RISK_QUESTIONS.filter((r) => (r.key === 'gestacao' || r.key === 'lactacao' ? sexo === 'F' || sexo === 'Outro' : true));
    if (riskList.length === 0) return;
    addedFirstRiskQuestionRef.current = true;
    setMessages((m) => [...m, { type: 'bot', text: riskList[0].label }]);
  }, [step, showOptionsAfterQuestion, paciente?.dadosIdentificacao?.sexoBiologico]);

  // Sempre que há "digitando..." e próxima mensagem: após delay, mostrar a pergunta do bot
  useEffect(() => {
    if (!nextBotText || !showTyping) return;
    const t = setTimeout(() => {
      setMessages((m) => [...m, { type: 'bot', text: nextBotText }]);
      setShowTyping(false);
      setNextBotText(null);
    }, TYPING_DELAY_MS);
    return () => clearTimeout(t);
  }, [showTyping, nextBotText]);

  // Mostrar opções só depois que a pergunta apareceu (com um pequeno delay)
  useEffect(() => {
    if (showTyping) {
      setShowOptionsAfterQuestion(false);
      return;
    }
    const t = setTimeout(() => setShowOptionsAfterQuestion(true), OPTIONS_DELAY_MS);
    return () => clearTimeout(t);
  }, [showTyping]);

  useEffect(() => {
    if (step !== 17) return;
    setMessages((m) => (m.length > 0 ? m : [{ type: 'bot', text: TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA }]));
  }, [step]);

  useEffect(() => {
    if (step !== 15 || medicos.length > 0) return;
    setLoadingMedicos(true);
    MedicoService.getAllMedicos()
      .then((list) => setMedicos(list.filter((m) => m.cidades?.length)))
      .catch(() => setMedicos([]))
      .finally(() => setLoadingMedicos(false));
  }, [step, medicos.length]);

  // Estados que têm pelo menos um médico (para o dropdown)
  const estadosComMedicos = [...new Set(medicos.flatMap((m) => (m.cidades || []).map((c) => c.estado)))].filter(Boolean).sort();
  // Cidades únicas do estado selecionado (a partir da lista de médicos)
  const cidadesDoEstado = selectedEstado
    ? [...new Set(medicos.flatMap((m) => (m.cidades || []).filter((c) => c.estado === selectedEstado).map((c) => c.cidade)))]
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b)))
    : [];

  useEffect(() => {
    if (step !== 16 || !selectedEstado || !selectedCidade) return;
    setLoadingMedicos(true);
    setAgregadosMedicos({});
    MedicoService.getMedicosByCidade(selectedCidade, selectedEstado)
      .then(setMedicosFiltrados)
      .finally(() => setLoadingMedicos(false));
  }, [step, selectedEstado, selectedCidade]);

  useEffect(() => {
    if (step !== 16 || medicosFiltrados.length === 0) return;
    const load = async () => {
      const map: Record<string, { count: number; media: number }> = {};
      await Promise.all(medicosFiltrados.map(async (m) => {
        const a = await ClassificacaoProfissionalService.getAgregado('medico', m.id);
        map[m.id] = a;
      }));
      setAgregadosMedicos(map);
    };
    load();
  }, [step, medicosFiltrados]);

  // Ordenar: 1) Verificados primeiro, 2) Maior nota, 3) Número de classificações
  const medicosOrdenados = useMemo(() => {
    if (medicosFiltrados.length === 0) return [];
    return [...medicosFiltrados].sort((a, b) => {
      const va = a.isVerificado ? 1 : 0;
      const vb = b.isVerificado ? 1 : 0;
      if (vb !== va) return vb - va;
      const ma = agregadosMedicos[a.id]?.media ?? 0;
      const mb = agregadosMedicos[b.id]?.media ?? 0;
      if (mb !== ma) return mb - ma;
      const ca = agregadosMedicos[a.id]?.count ?? 0;
      const cb = agregadosMedicos[b.id]?.count ?? 0;
      return cb - ca;
    });
  }, [medicosFiltrados, agregadosMedicos]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, showTyping]);

  useEffect(() => {
    if (!showOptionsAfterQuestion) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 350);
    return () => clearTimeout(t);
  }, [showOptionsAfterQuestion, step]);

  const pushReplyAndNext = (replyText: string, pacienteAtualizado?: PacienteCompleto) => {
    if (step === 14) {
      const cur = pacienteAtualizado ?? pacienteRef.current;
      const pularBusca = devePularSelecaoMedicoNoChat(cur);
      if (pularBusca) {
        setMessages((m) => [
          ...m,
          { type: 'user', text: replyText },
          { type: 'bot', text: TEXTO_FECHAMENTO_PERFIL },
          { type: 'bot', text: TEXTO_POS_METAS_SEM_BUSCA_MEDICO },
        ]);
        setTimeout(() => {
          setStep(17);
          setShowTyping(false);
          setNextBotText(null);
          setShowOptionsAfterQuestion(true);
          onSave(false, cur).catch(() => {});
        }, 1600);
        return;
      }
      setMessages((m) => [...m, { type: 'user', text: replyText }, { type: 'bot', text: TEXTO_FECHAMENTO_PERFIL }]);
      setTimeout(() => {
        setMessages([]);
        setStep(15);
        setNextBotText(TEXTO_PESQUISA_MEDICO);
        setShowTyping(true);
      }, 1600);
      onSave(false, pacienteAtualizado ?? pacienteRef.current).catch(() => {});
      return;
    }
    const nextStep = step + 1;
    setMessages((m) => [...m, { type: 'user', text: replyText }]);
    if (nextStep <= 14) {
      setNextBotText(CHAT_BOT_TEXTS[nextStep - 1]);
      setShowTyping(true);
    }
    setStep((s) => {
      const next = s + 1;
      if (next === 11) setShowOptionsAfterQuestion(false);
      return next;
    });
    onSave(false, pacienteAtualizado ?? pacienteRef.current).catch(() => {});
  };

  const handleClose = () => {
    setShowPerfilMedicoModal(false);
    setMedicoParaSolicitar(null);
    setIframePerfilSrc('');
    setMessages([]);
    onClose();
  };

  useEffect(() => {
    if (showPerfilMedicoModal && medicoParaSolicitar && typeof window !== 'undefined') {
      setIframePerfilLoading(true);
      setIframePerfilSrc(`${window.location.origin}/dr/${gerarSlugDrMedico(medicoParaSolicitar.nome)}?embed=1`);
    } else if (!showPerfilMedicoModal) {
      setIframePerfilSrc('');
      setIframePerfilLoading(true);
    }
  }, [showPerfilMedicoModal, medicoParaSolicitar?.id]);

  const fecharPerfilMedicoModal = () => {
    setShowPerfilMedicoModal(false);
    setMedicoParaSolicitar(null);
    setIframePerfilSrc('');
    setIframePerfilLoading(true);
  };

  const executarSolicitacaoTratamentoComoSim = async () => {
    const medico = medicoParaSolicitar;
    if (!medico) return;
    const atualizado = { ...paciente, medicoResponsavelId: medico.id };
    if (onCreateSolicitacao) {
      setSaving(true);
      try {
        await onCreateSolicitacao({ id: medico.id, nome: medico.nome }, atualizado);
        solicitacaoCriadaViaCallbackRef.current = true;
        setSelectedMedicoId(medico.id);
        setShowSolicitacaoEnviadaModal(true);
      } catch (err) {
        console.error('Erro ao criar solicitação:', err);
      } finally {
        setSaving(false);
      }
    } else {
      setPaciente(atualizado);
      setSelectedMedicoId(medico.id);
      setShowSolicitacaoEnviadaModal(true);
    }
    fecharPerfilMedicoModal();
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const whatsappBg = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='%23d4d4d4' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)' opacity='0.3'/%3E%3C/svg%3E")`,
  };

  return (
    <>
    <div
      className={
        embedded
          ? 'flex flex-col h-full min-h-0 max-h-[calc(100vh-8rem)] rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-[#e5ddd5]'
          : 'flex flex-col h-full max-h-[85vh]'
      }
    >
      {/* Header estilo WhatsApp */}
      <div
        className={`flex-shrink-0 bg-[#075e54] text-white px-4 py-3 flex items-center justify-between ${embedded ? 'rounded-t-xl' : 'rounded-t-2xl'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate">{chatTitle}</h2>
            <p className="text-xs text-white/80 truncate">{chatSubtitle}</p>
          </div>
        </div>
        {embedded && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {sandboxBanner && (
        <div className="shrink-0 px-3 py-2 bg-amber-100 text-amber-950 text-xs border-b border-amber-200/80">
          Modo preview: o fluxo é o mesmo do /meta. O salvamento depende da página (no Meta Admin Geral não grava
          paciente de produção).
        </div>
      )}

      {/* Área de mensagens estilo WhatsApp */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 pb-20 min-h-[320px] bg-[#e5ddd5]"
        style={whatsappBg}
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                msg.type === 'user' ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
              }`}
            >
              <p className="text-sm text-gray-800 whitespace-pre-line break-words">{msg.text}</p>
              <p className={`text-[10px] text-gray-500 mt-0.5 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                {formatTime(new Date())}
              </p>
            </div>
          </div>
        ))}

        {/* Bolha "digitando..." (três pontinhos) */}
        {showTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm border border-gray-200">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {step === 0 && (
          <div className="sticky bottom-0 left-0 right-0 mt-2 p-4 bg-[#e5ddd5] border-t border-gray-200 rounded-t-xl">
            <p className="text-base font-medium text-gray-800 mb-1">Vamos montar um plano personalizado para você emagrecer com mais segurança.</p>
            <p className="text-sm text-gray-600 mb-4">Leva menos de 2 minutos.</p>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem(introSessionKey, '1');
                } catch {
                  /* ignore */
                }
                setStep(1);
                setShowTyping(true);
                setNextBotText(CHAT_BOT_TEXTS[0]);
              }}
              className="w-full py-3 rounded-xl bg-[#25d366] text-white font-semibold text-sm hover:opacity-90"
            >
              Começar
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="sticky bottom-0 left-0 right-0 mt-2 p-2 bg-[#e5ddd5] border-t border-gray-200">
            <div className="w-full flex gap-2 items-center">
              <input
                type="tel"
                inputMode="numeric"
                value={paciente.dadosIdentificacao?.telefone || ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                  const formatted = formatTelefone(raw);
                  setPaciente((p) => ({ ...p, dadosIdentificacao: { ...p.dadosIdentificacao, telefone: formatted || undefined } }));
                }}
                placeholder="(11) 99999-9999"
                className="flex-1 min-w-0 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm text-gray-900 bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  const tel = (paciente.dadosIdentificacao?.telefone || '').replace(/\D/g, '');
                  if (tel.length < 10) return;
                  setMessages((m) => [...m, { type: 'user', text: paciente.dadosIdentificacao?.telefone || '' }]);
                  setStep(2);
                  setNextBotText(CHAT_BOT_TEXTS[1]);
                  setShowTyping(true);
                  onSave(false).catch(() => {});
                }}
                disabled={((paciente.dadosIdentificacao?.telefone || '').replace(/\D/g, '').length < 10)}
                className="shrink-0 p-2.5 rounded-full bg-[#25d366] text-white hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}

        {(step === 5 || step === 6 || (step === 7 && circFase === 'valor')) && !showTyping && showOptionsAfterQuestion && (
          <div className="sticky bottom-0 left-0 right-0 mt-2 p-2 bg-[#e5ddd5] border-t border-gray-200">
            <div className="w-full flex gap-2 items-center max-w-full">
              {step === 5 && (
                <>
                  <input
                    type="number"
                    min={20}
                    max={400}
                    step={0.1}
                    value={paciente.dadosClinicos?.medidasIniciais?.peso ?? ''}
                    onChange={(e) => {
                      const v = e.target.value ? parseFloat(e.target.value) : undefined;
                      setPaciente((p) => ({
                        ...p,
                        dadosClinicos: {
                          ...p.dadosClinicos,
                          medidasIniciais: {
                            ...(p.dadosClinicos?.medidasIniciais || {}),
                            peso: v ?? 0,
                            altura: p.dadosClinicos?.medidasIniciais?.altura ?? 0,
                            imc: p.dadosClinicos?.medidasIniciais?.imc ?? 0,
                            circunferenciaAbdominal: p.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal ?? 0,
                          },
                        },
                      }));
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && paciente.dadosClinicos?.medidasIniciais?.peso && pushReplyAndNext(`${paciente.dadosClinicos!.medidasIniciais!.peso} kg`)}
                    placeholder="Peso em kg (ex: 85.5)"
                    className="flex-1 min-w-0 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm text-gray-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => paciente.dadosClinicos?.medidasIniciais?.peso && pushReplyAndNext(`${paciente.dadosClinicos.medidasIniciais.peso} kg`)}
                    disabled={!paciente.dadosClinicos?.medidasIniciais?.peso}
                    className="shrink-0 p-2.5 rounded-full bg-[#25d366] text-white hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Enviar"
                  >
                    <Send size={20} />
                  </button>
                </>
              )}
              {step === 6 && (
                <>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={alturaInputStr}
                    onChange={(e) => setAlturaInputStr(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      const cm = parseAlturaToCm(alturaInputStr);
                      if (cm == null) return;
                      const next = {
                        ...paciente,
                        dadosClinicos: {
                          ...paciente.dadosClinicos,
                          medidasIniciais: {
                            ...(paciente.dadosClinicos?.medidasIniciais || {}),
                            peso: paciente.dadosClinicos?.medidasIniciais?.peso ?? 0,
                            altura: cm,
                            imc: paciente.dadosClinicos?.medidasIniciais?.imc ?? 0,
                            circunferenciaAbdominal: paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal ?? 0,
                          },
                        },
                      };
                      setPaciente(next);
                      pushReplyAndNext(`${cm} cm`, next);
                      setAlturaInputStr('');
                    }}
                    placeholder="Altura: 170 ou 1,70 m"
                    className="flex-1 min-w-0 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm text-gray-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cm = parseAlturaToCm(alturaInputStr);
                      if (cm == null) return;
                      const next = {
                        ...paciente,
                        dadosClinicos: {
                          ...paciente.dadosClinicos,
                          medidasIniciais: {
                            ...(paciente.dadosClinicos?.medidasIniciais || {}),
                            peso: paciente.dadosClinicos?.medidasIniciais?.peso ?? 0,
                            altura: cm,
                            imc: paciente.dadosClinicos?.medidasIniciais?.imc ?? 0,
                            circunferenciaAbdominal: paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal ?? 0,
                          },
                        },
                      };
                      setPaciente(next);
                      pushReplyAndNext(`${cm} cm`, next);
                      setAlturaInputStr('');
                    }}
                    disabled={parseAlturaToCm(alturaInputStr) == null}
                    className="shrink-0 p-2.5 rounded-full bg-[#25d366] text-white hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Enviar"
                  >
                    <Send size={20} />
                  </button>
                </>
              )}
              {step === 7 && circFase === 'valor' && (
                <>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={circInputStr}
                    onChange={(e) => setCircInputStr(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      const cm = parseCircToCm(circInputStr);
                      if (cm != null) {
                        const next = {
                          ...paciente,
                          dadosClinicos: {
                            ...paciente.dadosClinicos,
                            medidasIniciais: {
                              ...(paciente.dadosClinicos?.medidasIniciais || {}),
                              peso: paciente.dadosClinicos?.medidasIniciais?.peso ?? 0,
                              altura: paciente.dadosClinicos?.medidasIniciais?.altura ?? 0,
                              imc: paciente.dadosClinicos?.medidasIniciais?.imc ?? 0,
                              circunferenciaAbdominal: cm,
                              circunferenciaNaoInformada: false,
                            },
                          },
                        };
                        setPaciente(next);
                        pushReplyAndNext(`${cm} cm`, next);
                        setCircInputStr('');
                      }
                    }}
                    placeholder="Circunferência: 102 ou 1,02 m"
                    className="flex-1 min-w-0 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm text-gray-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cm = parseCircToCm(circInputStr);
                      if (cm != null) {
                        const next = {
                          ...paciente,
                          dadosClinicos: {
                            ...paciente.dadosClinicos,
                            medidasIniciais: {
                              ...(paciente.dadosClinicos?.medidasIniciais || {}),
                              peso: paciente.dadosClinicos?.medidasIniciais?.peso ?? 0,
                              altura: paciente.dadosClinicos?.medidasIniciais?.altura ?? 0,
                              imc: paciente.dadosClinicos?.medidasIniciais?.imc ?? 0,
                              circunferenciaAbdominal: cm,
                              circunferenciaNaoInformada: false,
                            },
                          },
                        };
                        setPaciente(next);
                        pushReplyAndNext(`${cm} cm`, next);
                        setCircInputStr('');
                      }
                    }}
                    disabled={parseCircToCm(circInputStr) == null}
                    className="shrink-0 p-2.5 rounded-full bg-[#25d366] text-white hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Enviar"
                  >
                    <Send size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Opções só depois que a pergunta apareceu (e após um pequeno delay). Card sem fundo branco em gênero, diagnóstico, comorbidades, riscos, tireoide, sintomas, metas. */}
        {step >= 2 && step < 15 && !(step === 5 || step === 6 || (step === 7 && circFase === 'valor')) && !showTyping && showOptionsAfterQuestion && (
          <div className="flex justify-start mt-2">
            <div className={`rounded-lg rounded-tl-none px-4 py-3 max-w-[95%] ${[2, 4].includes(step) ? 'bg-white shadow-sm border border-gray-200' : 'bg-transparent border-0 shadow-none'}`}>
              {step === 2 && (() => {
                const d = paciente.dadosIdentificacao?.dataNascimento ? new Date(paciente.dadosIdentificacao.dataNascimento) : null;
                const day = d ? d.getDate() : '';
                const month = d ? d.getMonth() + 1 : '';
                const year = d ? d.getFullYear() : '';
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="Dia"
                      value={day === '' ? '' : day}
                      onChange={(e) => {
                        const v = e.target.value ? parseInt(e.target.value, 10) : null;
                        const m = month || 1;
                        const y = year || new Date().getFullYear();
                        if (v && v >= 1 && v <= 31) {
                          const date = new Date(y, Number(m) - 1, v);
                          setPaciente((p) => ({ ...p, dadosIdentificacao: { ...p.dadosIdentificacao, dataNascimento: date } }));
                        } else if (e.target.value === '') {
                          setPaciente((p) => ({ ...p, dadosIdentificacao: { ...p.dadosIdentificacao, dataNascimento: undefined } }));
                        }
                      }}
                      className="w-14 border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 text-center"
                    />
                    <select
                      value={month === '' ? '' : month}
                      onChange={(e) => {
                        const v = e.target.value ? parseInt(e.target.value, 10) : null;
                        const dd = day || 1;
                        const y = year || new Date().getFullYear();
                        if (v) {
                          const date = new Date(y, v - 1, Math.min(dd, new Date(y, v, 0).getDate()));
                          setPaciente((p) => ({ ...p, dadosIdentificacao: { ...p.dadosIdentificacao, dataNascimento: date } }));
                        } else {
                          setPaciente((p) => ({ ...p, dadosIdentificacao: { ...p.dadosIdentificacao, dataNascimento: undefined } }));
                        }
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 min-w-[100px]"
                    >
                      <option value="">Mês</option>
                      {MESES.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={year === '' ? '' : year}
                      onChange={(e) => {
                        const v = e.target.value ? parseInt(e.target.value, 10) : null;
                        const dd = day || 1;
                        const m = month || 1;
                        if (v) {
                          const date = new Date(v, Number(m) - 1, Math.min(dd, new Date(v, Number(m), 0).getDate()));
                          setPaciente((p) => ({ ...p, dadosIdentificacao: { ...p.dadosIdentificacao, dataNascimento: date } }));
                        } else {
                          setPaciente((p) => ({ ...p, dadosIdentificacao: { ...p.dadosIdentificacao, dataNascimento: undefined } }));
                        }
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 min-w-[80px]"
                    >
                      <option value="">Ano</option>
                      {Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const d = paciente.dadosIdentificacao?.dataNascimento;
                        if (d) pushReplyAndNext(new Date(d).toLocaleDateString('pt-BR'));
                      }}
                      disabled={!paciente.dadosIdentificacao?.dataNascimento}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25d366] text-white text-sm font-medium hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={16} /> Enviar
                    </button>
                  </div>
                );
              })()}
              {/* Step 2: Gênero — sem fundo branco do card; ao clicar fica verde como Sim/Não */}
              {step === 3 && (
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'M' as const, label: 'Masculino' },
                    { value: 'F' as const, label: 'Feminino' },
                    { value: 'Outro' as const, label: 'Prefiro não responder' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        const next = { ...paciente, dadosIdentificacao: { ...paciente.dadosIdentificacao, sexoBiologico: value } };
                        setPaciente(next);
                        pushReplyAndNext(label, next);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${paciente.dadosIdentificacao?.sexoBiologico === value ? 'bg-[#25d366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {/* Step 3: CPF — máscara xxx.xxx.xxx-xx */}
              {step === 4 && (
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    type="text"
                    value={formatCpf(paciente.dadosIdentificacao?.cpf || '')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setPaciente((p) => ({ ...p, dadosIdentificacao: { ...p.dadosIdentificacao, cpf: raw } }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && paciente.dadosIdentificacao?.cpf?.replace(/\D/g, '').length === 11) {
                        pushReplyAndNext(formatCpf(paciente.dadosIdentificacao.cpf));
                      }
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="flex-1 min-w-[140px] max-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => paciente.dadosIdentificacao?.cpf?.replace(/\D/g, '').length === 11 && pushReplyAndNext(formatCpf(paciente.dadosIdentificacao.cpf))}
                    disabled={paciente.dadosIdentificacao?.cpf?.replace(/\D/g, '').length !== 11}
                    className="p-2 rounded-full bg-[#25d366] text-white hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Enviar"
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
              {step === 7 && circFase === 'pergunta' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMessages((m) => [...m, { type: 'user', text: 'Sim' }]);
                      setTimeout(() => {
                        setMessages((m) => [...m, { type: 'bot', text: CHAT_CIRC_DETAIL }]);
                        setCircFase('valor');
                        setShowOptionsAfterQuestion(true);
                      }, 450);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next: PacienteCompleto = {
                        ...paciente,
                        dadosClinicos: {
                          ...paciente.dadosClinicos,
                          medidasIniciais: {
                            ...(paciente.dadosClinicos?.medidasIniciais || {}),
                            peso: paciente.dadosClinicos?.medidasIniciais?.peso ?? 0,
                            altura: paciente.dadosClinicos?.medidasIniciais?.altura ?? 0,
                            imc: paciente.dadosClinicos?.medidasIniciais?.imc ?? 0,
                            circunferenciaAbdominal: 0,
                            circunferenciaNaoInformada: true,
                          },
                        },
                      };
                      setPaciente(next);
                      pushReplyAndNext('Não sei', next);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Não sei
                  </button>
                </div>
              )}
              {step === 8 && (() => {
                const MOT = [
                  { k: 'estetica' as const, l: 'Estética' },
                  { k: 'cansaco_falta_energia' as const, l: 'Cansaço / falta de energia' },
                  { k: 'saude_exames_alterados' as const, l: 'Saúde / exames alterados' },
                  { k: 'autoestima' as const, l: 'Autoestima' },
                  { k: 'dificuldade_emagrecer' as const, l: 'Dificuldade para emagrecer' },
                  { k: 'outro' as const, l: 'Outro' },
                ];
                const m = (paciente.dadosClinicos?.motivacao || {}) as Record<string, boolean>;
                const labels = MOT.filter((x) => m[x.k]).map((x) => x.l);
                if (m.outro && (paciente.dadosClinicos?.motivacaoOutro || '').trim()) labels.push(String(paciente.dadosClinicos?.motivacaoOutro));
                else if (m.outro) labels.push('Outro');
                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {MOT.map(({ k, l }) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() =>
                            setPaciente((p) => ({
                              ...p,
                              dadosClinicos: {
                                ...p.dadosClinicos,
                                motivacao: {
                                  ...(p.dadosClinicos?.motivacao || {}),
                                  [k]: !((p.dadosClinicos?.motivacao as Record<string, boolean> | undefined)?.[k]),
                                },
                              },
                            }))
                          }
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${m[k] ? 'bg-[#25d366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    {m.outro && (
                      <input
                        type="text"
                        value={paciente.dadosClinicos?.motivacaoOutro || ''}
                        onChange={(e) => setPaciente((p) => ({ ...p, dadosClinicos: { ...p.dadosClinicos, motivacaoOutro: e.target.value } }))}
                        placeholder="Qual?"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2"
                      />
                    )}
                    <button
                      type="button"
                      disabled={!MOT.some(({ k }) => m[k])}
                      onClick={() => pushReplyAndNext(labels.length ? labels.join(', ') : '—')}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25d366] text-white text-sm font-medium hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={14} /> Enviar
                    </button>
                  </div>
                );
              })()}
              {step === 9 && (() => {
                const tipos = ['dm1', 'dm2', 'pre_diabetes', 'sobrepeso_comorbidade', 'sop_ri', 'ehna_sem_dm2', 'obesidade', 'resistencia_insulinica', 'outro'];
                const dc = paciente.dadosClinicos as unknown as { diagnosticoPrincipalTipos?: string[] };
                const selected = (dc.diagnosticoPrincipalTipos || (paciente.dadosClinicos?.diagnosticoPrincipal?.tipo ? [paciente.dadosClinicos.diagnosticoPrincipal.tipo] : [])) as string[];
                const toggle = (value: string) => {
                  setPaciente((p) => {
                    const dc2 = p.dadosClinicos as unknown as { diagnosticoPrincipalTipos?: string[] };
                    const arr = (dc2.diagnosticoPrincipalTipos || (p.dadosClinicos?.diagnosticoPrincipal?.tipo ? [p.dadosClinicos.diagnosticoPrincipal.tipo] : [])) as string[];
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
                    <div className="flex flex-wrap gap-2">
                      {tipos.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggle(value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selected.includes(value) ? 'bg-[#25d366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {DIAGNOSTICO_LABELS[value]}
                        </button>
                      ))}
                    </div>
                    {selected.includes('outro') && (
                      <div className="flex flex-wrap gap-2 items-center mt-2">
                        <input
                          type="text"
                          value={paciente.dadosClinicos?.diagnosticoPrincipal?.outro || ''}
                          onChange={(e) => setPaciente((p) => ({ ...p, dadosClinicos: { ...p.dadosClinicos, diagnosticoPrincipal: { tipo: 'outro', outro: e.target.value } } }))}
                          placeholder="Especificar outro"
                          className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const arr = (paciente.dadosClinicos as unknown as { diagnosticoPrincipalTipos?: string[] }).diagnosticoPrincipalTipos;
                        const labels = (arr?.length ? arr : paciente.dadosClinicos?.diagnosticoPrincipal?.tipo ? [paciente.dadosClinicos.diagnosticoPrincipal!.tipo] : []).map((t) => DIAGNOSTICO_LABELS[t] || t);
                        pushReplyAndNext(labels.length ? labels.join(', ') : '—');
                      }}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25d366] text-white text-sm font-medium hover:bg-[#20bd5a]"
                    >
                      <Send size={14} /> Enviar
                    </button>
                  </div>
                );
              })()}
              {step === 10 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'hipertensaoArterial', label: 'Pressão alta (hipertensão)' },
                      { key: 'dislipidemia', label: 'Colesterol ou triglicerídeos altos' },
                      { key: 'apneiaObstrutivaSono', label: 'Apneia do sono' },
                      { key: 'esteatoseEHNA', label: 'Gordura no fígado / esteatose' },
                      { key: 'doencaCardiovascular', label: 'Doença cardiovascular' },
                      { key: 'doencaRenalCronica', label: 'Doença renal crônica' },
                      { key: 'sop', label: 'Ovário policístico (SOP)' },
                      { key: 'hipotireoidismo', label: 'Hipotireoidismo' },
                      { key: 'asmaDPOC', label: 'Asma / DPOC' },
                      { key: 'transtornoAnsiedadeDepressao', label: 'Ansiedade / depressão' },
                      { key: 'nenhuma', label: 'Nenhuma' },
                      { key: 'outra', label: 'Outra' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setPaciente((p) => {
                            const cur = (p.dadosClinicos?.comorbidades || {}) as Record<string, unknown>;
                            const nextVal = !Boolean(cur[key]);
                            return {
                              ...p,
                              dadosClinicos: { ...p.dadosClinicos, comorbidades: { ...cur, [key]: nextVal } },
                            };
                          })
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          ((paciente.dadosClinicos?.comorbidades || {}) as Record<string, unknown>)[key] ? 'bg-[#25d366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {Boolean(((paciente.dadosClinicos?.comorbidades || {}) as Record<string, unknown>).outra) && (
                    <input
                      type="text"
                      value={String((((paciente.dadosClinicos?.comorbidades || {}) as Record<string, unknown>).outraDescricao as string) || '')}
                      onChange={(e) =>
                        setPaciente((p) => {
                          const cur = (p.dadosClinicos?.comorbidades || {}) as Record<string, unknown>;
                          return { ...p, dadosClinicos: { ...p.dadosClinicos, comorbidades: { ...cur, outraDescricao: e.target.value } } };
                        })
                      }
                      placeholder="Qual?"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const c = paciente.dadosClinicos?.comorbidades as Record<string, unknown> | undefined;
                      const labels = [
                        c?.hipertensaoArterial && 'Pressão alta',
                        c?.dislipidemia && 'Dislipidemia',
                        c?.apneiaObstrutivaSono && 'Apneia do sono',
                        c?.esteatoseEHNA && 'Esteatose',
                        c?.doencaCardiovascular && 'Doença cardiovascular',
                        c?.doencaRenalCronica && 'DRC',
                        c?.sop && 'SOP',
                        c?.hipotireoidismo && 'Hipotireoidismo',
                        c?.asmaDPOC && 'Asma/DPOC',
                        c?.transtornoAnsiedadeDepressao && 'Ansiedade/depressão',
                        c?.nenhuma && 'Nenhuma',
                        c?.outra && (c?.outraDescricao ? String(c.outraDescricao) : 'Outra'),
                      ].filter(Boolean) as string[];
                      const next: PacienteCompleto = {
                        ...paciente,
                        dadosClinicos: { ...paciente.dadosClinicos, chatComorbidadesEnviado: true },
                      };
                      setPaciente(next);
                      pushReplyAndNext(labels.length ? labels.join(', ') : '—', next);
                    }}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25d366] text-white text-sm font-medium hover:bg-[#20bd5a]"
                  >
                    <Send size={14} /> Enviar
                  </button>
                </div>
              )}
              {step === 11 && (() => {
                const sexo = paciente.dadosIdentificacao?.sexoBiologico;
                const riskList = RISK_QUESTIONS.filter(
                  (r) => (r.key === 'gestacao' || r.key === 'lactacao' ? sexo === 'F' || sexo === 'Outro' : true)
                );
                if (riskQuestionIndex >= riskList.length) return null;
                const { key, options } = riskList[riskQuestionIndex];
                const optLabel = (opt: string) => opt === 'nao' ? 'Não' : opt === 'sim' ? 'Sim' : 'Desconheço';
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            const next: PacienteCompleto = {
                              ...pacienteRef.current,
                              dadosClinicos: {
                                ...pacienteRef.current.dadosClinicos,
                                riscos: { ...(pacienteRef.current.dadosClinicos?.riscos || {}), [key]: opt } as Riscos,
                              },
                            };
                            setPaciente(next);
                            onSave(false, next).catch(() => {});
                            setMessages((m) => [...m, { type: 'user', text: optLabel(opt) }]);
                            if (riskQuestionIndex + 1 < riskList.length) {
                              const nextQ = riskList[riskQuestionIndex + 1];
                              setMessages((m) => [...m, { type: 'bot', text: nextQ.label }]);
                              setRiskQuestionIndex((i) => i + 1);
                            } else {
                              setStep(12);
                              setNextBotText(CHAT_BOT_TEXTS[11]);
                              setShowTyping(true);
                            }
                          }}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          {optLabel(opt)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {step === 12 && (() => {
                const tireoideOpts = [
                  { value: 'eutireoidismo', label: 'Tireoide normal' },
                  { value: 'hipotireoidismo_tratado', label: 'Hipotireoidismo tratado' },
                  { value: 'nodulo_bocio', label: 'Nódulo ou bócio' },
                  { value: 'tireoidite_previa', label: 'Tireoidite prévia' },
                  { value: 'cmt_confirmado', label: 'CMT confirmado' },
                  { value: 'outro', label: 'Outro' },
                ];
                const selected = paciente.dadosClinicos?.historiaTireoidiana;
                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {tireoideOpts.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            const next: PacienteCompleto = {
                              ...pacienteRef.current,
                              dadosClinicos: { ...pacienteRef.current.dadosClinicos, historiaTireoidiana: value as HistoriaTireoide },
                            };
                            setPaciente(next);
                            onSave(false, next).catch(() => {});
                            if (value !== 'outro') pushReplyAndNext(label, next);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selected === value ? 'bg-[#25d366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {selected === 'outro' && (
                      <>
                        <input
                          type="text"
                          value={paciente.dadosClinicos?.historiaTireoidianaOutro || ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            const next: PacienteCompleto = {
                              ...pacienteRef.current,
                              dadosClinicos: { ...pacienteRef.current.dadosClinicos, historiaTireoidianaOutro: v },
                            };
                            setPaciente(next);
                          }}
                          placeholder="Qual?"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2"
                        />
                        <button type="button" onClick={() => pushReplyAndNext(paciente.dadosClinicos?.historiaTireoidianaOutro || 'Outro')} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25d366] text-white text-sm font-medium hover:bg-[#20bd5a]">
                          <Send size={14} /> Enviar
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
              {step === 13 && (() => {
                const sintomasOpts = [
                  { key: 'plenitudePosPrandial', label: 'Sensação de estômago cheio / plenitude após comer' },
                  { key: 'nauseaLeve', label: 'Náusea leve' },
                  { key: 'constipacao', label: 'Constipação' },
                  { key: 'refluxoPirose', label: 'Refluxo / queimação' },
                  { key: 'nenhum', label: 'Nenhum' },
                ];
                const sintomasGI = (paciente.dadosClinicos?.sintomasGI || {}) as Record<string, boolean>;
                const toggleSintoma = (key: string) =>
                  setPaciente((p) => {
                    const cur = (p.dadosClinicos?.sintomasGI || {}) as Record<string, boolean>;
                    return {
                      ...p,
                      dadosClinicos: { ...p.dadosClinicos, sintomasGI: { ...cur, [key]: !cur[key] } },
                    };
                  });
                const labels = sintomasOpts.filter((o) => sintomasGI[o.key]).map((o) => o.label);
                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {sintomasOpts.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleSintoma(key)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${sintomasGI[key] ? 'bg-[#25d366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => pushReplyAndNext(labels.length ? labels.join(', ') : '—')} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25d366] text-white text-sm font-medium hover:bg-[#20bd5a]">
                      <Send size={14} /> Enviar
                    </button>
                  </div>
                );
              })()}
              {step === 14 && (() => {
                const p = paciente;
                const mi = p.dadosClinicos?.medidasIniciais;
                const peso0 = mi?.peso;
                const cint0 = mi?.circunferenciaAbdominal;
                const temCint = temCircunferenciaInicialParaMetas(mi);
                const m = p.planoTerapeutico?.metas;

                const pctMin = 5;
                const pctMax = 45;
                let pctLoss =
                  m?.weightLossTargetType === 'PERCENTUAL' && m.weightLossTargetValue != null && m.weightLossTargetValue > 0
                    ? m.weightLossTargetValue
                    : m?.weightLossTargetType === 'PESO_ABSOLUTO' &&
                        m.weightLossTargetValue != null &&
                        peso0 != null &&
                        peso0 > 0
                      ? (m.weightLossTargetValue / peso0) * 100
                      : 12;
                pctLoss = Math.round(Math.min(pctMax, Math.max(pctMin, pctLoss)) * 10) / 10;

                const kgMin =
                  peso0 != null && peso0 > 0 ? Math.round(((peso0 * pctMin) / 100) * 10) / 10 : 0;
                const kgMax =
                  peso0 != null && peso0 > 0 ? Math.round(((peso0 * pctMax) / 100) * 10) / 10 : 0;
                let kgLoss =
                  peso0 != null && peso0 > 0 ? Math.round(((peso0 * pctLoss) / 100) * 10) / 10 : 0;
                kgLoss = Math.round(Math.min(kgMax, Math.max(kgMin, kgLoss)) * 10) / 10;

                const maxWaistLoss =
                  cint0 != null && cint0 > 60
                    ? Math.min(40, Math.round((cint0 - 55) * 10) / 10)
                    : cint0 != null && cint0 > 0
                      ? Math.min(30, Math.round(cint0 * 0.25 * 10) / 10)
                      : 25;
                let waistLossCm =
                  typeof m?.waistReductionTargetCm === 'number' && !Number.isNaN(m.waistReductionTargetCm)
                    ? m.waistReductionTargetCm
                    : 8;
                waistLossCm = Math.round(Math.min(maxWaistLoss, Math.max(0, waistLossCm)) * 10) / 10;

                const pesoMeta =
                  peso0 != null && peso0 > 0 ? Math.round((peso0 - kgLoss) * 10) / 10 : null;
                const cinturaMeta =
                  temCint && cint0 != null ? Math.round((cint0 - waistLossCm) * 10) / 10 : null;

                const patchMetasPartial = (partial: Record<string, unknown>) => {
                  setPaciente((prev) => ({
                    ...prev,
                    planoTerapeutico: {
                      ...prev.planoTerapeutico,
                      metas: {
                        ...prev.planoTerapeutico?.metas,
                        ...partial,
                      },
                    },
                  }));
                };

                const enviarMetas = () => {
                  const cur = pacienteRef.current;
                  const mi2 = cur.dadosClinicos?.medidasIniciais;
                  const peso02 = mi2?.peso;
                  const cint02 = mi2?.circunferenciaAbdominal;
                  const temCint2 = temCircunferenciaInicialParaMetas(mi2);
                  const m2 = cur.planoTerapeutico?.metas;

                  let pct =
                    m2?.weightLossTargetType === 'PERCENTUAL' && m2.weightLossTargetValue != null && m2.weightLossTargetValue > 0
                      ? m2.weightLossTargetValue
                      : 12;
                  pct = Math.round(Math.min(pctMax, Math.max(pctMin, pct)) * 10) / 10;

                  const maxW =
                    cint02 != null && cint02 > 60
                      ? Math.min(40, Math.round((cint02 - 55) * 10) / 10)
                      : cint02 != null && cint02 > 0
                        ? Math.min(30, Math.round(cint02 * 0.25 * 10) / 10)
                        : 25;
                  let waist =
                    typeof m2?.waistReductionTargetCm === 'number' && !Number.isNaN(m2.waistReductionTargetCm)
                      ? m2.waistReductionTargetCm
                      : 8;
                  waist = Math.round(Math.min(maxW, Math.max(0, waist)) * 10) / 10;

                  const kgP =
                    peso02 != null && peso02 > 0 ? Math.round(((peso02 * pct) / 100) * 10) / 10 : null;
                  const partes: string[] = [];
                  if (peso02 != null && peso02 > 0 && kgP != null) {
                    const pesoMetaStr = Math.round((peso02 - kgP) * 10) / 10;
                    partes.push(
                      `Perder ~${kgP} kg (~${pct}% do peso inicial, peso meta ~${pesoMetaStr} kg)`
                    );
                  }
                  if (temCint2 && cint02 != null) {
                    partes.push(`Reduzir ${waist} cm na cintura (meta ~${Math.round((cint02 - waist) * 10) / 10} cm)`);
                  }
                  const replyText = partes.length ? partes.join(' · ') : 'Metas definidas';

                  const pesoAtivo = peso02 != null && peso02 > 0;
                  const cintAtivo = temCint2;
                  const metasFinal: Record<string, unknown> = {
                    ...cur.planoTerapeutico?.metas,
                    metaPerdaPesoAtiva: pesoAtivo,
                    metaReducaoCinturaAtiva: cintAtivo,
                    metasTratamentoModuloAtivo: pesoAtivo || cintAtivo,
                    weightLossTargetType: 'PERCENTUAL',
                    weightLossTargetValue: pct,
                  };
                  if (temCint2) {
                    metasFinal.waistReductionTargetCm = waist;
                  } else {
                    delete metasFinal.waistReductionTargetCm;
                    metasFinal.metaReducaoCinturaAtiva = false;
                  }

                  const atualizado: PacienteCompleto = {
                    ...cur,
                    planoTerapeutico: {
                      ...cur.planoTerapeutico,
                      metas: metasFinal as PacienteCompleto['planoTerapeutico']['metas'],
                    },
                  };
                  setPaciente(atualizado);
                  pushReplyAndNext(replyText, atualizado);
                };

                return (
                  <div className="space-y-4 max-w-full">
                    {peso0 != null && peso0 > 0 ? (
                      <div className="rounded-xl border border-emerald-200/80 bg-white/95 px-3 py-3 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">Quanto deseja perder (peso)</span>
                          <span className="text-lg font-bold text-emerald-700 tabular-nums">{kgLoss} kg</span>
                        </div>
                        <input
                          type="range"
                          min={kgMin}
                          max={kgMax}
                          step={0.1}
                          value={kgLoss}
                          onChange={(e) => {
                            const kg = parseFloat(e.target.value);
                            if (!peso0 || peso0 <= 0) return;
                            let pctNew = (kg / peso0) * 100;
                            pctNew = Math.round(Math.min(pctMax, Math.max(pctMin, pctNew)) * 10) / 10;
                            patchMetasPartial({
                              weightLossTargetType: 'PERCENTUAL',
                              weightLossTargetValue: pctNew,
                            });
                          }}
                          className="metaadmin-metas-range w-full"
                          aria-label="Quilogramas de peso a perder"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>{kgMin} kg</span>
                          <span>{kgMax} kg</span>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-snug">
                          ≈ <span className="font-semibold text-gray-800">{pctLoss}%</span> do peso inicial (
                          {peso0} kg). Peso meta ~<span className="font-medium">{pesoMeta}</span> kg.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700">Falta peso inicial — volte às medidas.</p>
                    )}

                    {temCint && cint0 != null && cint0 > 0 ? (
                      <div className="rounded-xl border border-sky-200/80 bg-white/95 px-3 py-3 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">Meta de circunferência abdominal</span>
                          <span className="text-base font-bold text-sky-700 tabular-nums">−{waistLossCm} cm</span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Cintura inicial: {cint0} cm · Meta ~{cinturaMeta} cm
                        </p>
                        <input
                          type="range"
                          min={0}
                          max={maxWaistLoss}
                          step={0.5}
                          value={waistLossCm}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            patchMetasPartial({ waistReductionTargetCm: v });
                          }}
                          className="metaadmin-metas-range metaadmin-metas-range--waist w-full"
                          aria-label="Redução em cm da circunferência abdominal"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>0 cm</span>
                          <span>{maxWaistLoss} cm</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500">
                        Você não informou a circunferência abdominal — só a meta de peso será salva.
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={!(peso0 != null && peso0 > 0)}
                      onClick={enviarMetas}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#25d366] text-white text-sm font-medium hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={14} /> Enviar metas
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {step === 15 && !showTyping && showOptionsAfterQuestion && hasSolicitacaoAbertaCheck === true && !modalSolicitacaoMedicoDismissed && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="solicitacao-medico-chat-titulo"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-amber-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 id="solicitacao-medico-chat-titulo" className="text-lg font-bold text-gray-900">
                    Solicitação já enviada
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    Já existe uma <strong>solicitação em andamento</strong>. Você pode acompanhar em{' '}
                    <strong>Médicos → Minhas solicitações</strong>.
                  </p>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                    Por enquanto <strong>não é possível escolher outro médico por este formulário</strong>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setModalSolicitacaoMedicoDismissed(true)}
                  className="w-full py-3 rounded-xl bg-[#25d366] text-white font-semibold text-sm hover:opacity-90"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 15 && !showTyping && showOptionsAfterQuestion && (
          <div className="space-y-3 mt-2">
            {hasSolicitacaoAbertaCheck === true && modalSolicitacaoMedicoDismissed ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Não é possível buscar outro médico: solicitação em andamento.</p>
                <p className="text-xs text-gray-600">Veja em Médicos → Minhas solicitações.</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25d366] text-white text-sm font-medium hover:opacity-90"
                >
                  Entendi
                </button>
              </div>
            ) : hasSolicitacaoAbertaCheck === true ? null : (hasSolicitacaoAbertaCheck === false || !onCheckSolicitacaoAberta) ? (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-sm font-medium text-gray-700">Estado:</label>
                  <select
                    value={selectedEstado}
                    onChange={(e) => {
                      setSelectedEstado(e.target.value);
                      setSelectedCidade('');
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white min-w-[100px]"
                  >
                    <option value="">Selecione</option>
                    {(estadosComMedicos.length ? estadosComMedicos : ESTADOS_BR).map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                {selectedEstado && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-sm font-medium text-gray-700">Cidade:</label>
                    <select
                      value={selectedCidade}
                      onChange={(e) => {
                        setSelectedCidade(e.target.value);
                        setStep(16);
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white min-w-[160px]"
                    >
                      <option value="">Selecione</option>
                      {cidadesDoEstado.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
                {loadingMedicos && (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Carregando...
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Verificando solicitações...
              </p>
            )}
          </div>
        )}

        {step === 16 && (
          <div className="space-y-2 mt-2">
            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
              <p className="text-xs text-gray-600">Quer buscar médicos em outro lugar? Você pode mudar aqui.</p>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm font-medium text-gray-700">Estado:</label>
                <select
                  value={selectedEstado}
                  onChange={(e) => {
                    setSelectedEstado(e.target.value);
                    setSelectedCidade('');
                    setSelectedMedicoId(null);
                    setMedicosFiltrados([]);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white min-w-[100px]"
                >
                  <option value="">Selecione</option>
                  {(estadosComMedicos.length ? estadosComMedicos : ESTADOS_BR).map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              {selectedEstado && (
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-sm font-medium text-gray-700">Cidade:</label>
                  <select
                    value={selectedCidade}
                    onChange={(e) => {
                      setSelectedCidade(e.target.value);
                      setSelectedMedicoId(null);
                      setStep(16);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white min-w-[160px]"
                  >
                    <option value="">Selecione</option>
                    {cidadesDoEstado.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {loadingMedicos ? (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Buscando médicos...
              </p>
            ) : medicosFiltrados.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum médico encontrado nesta cidade.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {medicosOrdenados.map((medico) => {
                  const agg = agregadosMedicos[medico.id];
                  const media = agg?.media ?? 0;
                  const count = agg?.count ?? 0;
                  const estrelasCheias = Math.round(media);
                  const isSelected = selectedMedicoId === medico.id;
                  return (
                    <button
                      key={medico.id}
                      type="button"
                      onClick={() => {
                        setMedicoParaSolicitar(medico);
                        setShowPerfilMedicoModal(true);
                      }}
                      className={`flex items-center gap-3 w-full text-left p-3 rounded-xl border transition-colors shadow-sm ${
                        isSelected
                          ? 'border-[#25d366] bg-green-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-[#25d366]'
                      }`}
                    >
                      <MedicoChatListAvatar medico={medico} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                          {medico.genero === 'F' ? 'Dra. ' : 'Dr. '}{(() => {
                            const cap = (s: string) => (s.charAt(0).toUpperCase() + (s.slice(1) || '').toLowerCase()).trim();
                            const parts = (medico.nome || '').trim().split(/\s+/).filter(Boolean);
                            if (parts.length <= 1) return cap(parts[0] || medico.nome || '');
                            return `${cap(parts[0])} ${cap(parts[parts.length - 1])}`;
                          })()}
                          {medico.isVerificado ? (
                            <BadgeCheck size={18} className="text-green-600 fill-green-100 shrink-0" title="Médico verificado" />
                          ) : (
                            <Badge size={16} className="text-gray-400 shrink-0" title="Não verificado" />
                          )}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={12} />
                          {selectedCidade}, {selectedEstado}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i <= estrelasCheias ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                            />
                          ))}
                          {count > 0 && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({count} {count === 1 ? 'avaliação' : 'avaliações'})
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 17 && (
          <div className="sticky bottom-0 left-0 right-0 mt-2 p-4 bg-[#e5ddd5] border-t border-gray-200 rounded-t-xl">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-[#25d366] text-white font-semibold text-sm hover:opacity-90"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

    </div>

    {showPerfilMedicoModal && medicoParaSolicitar && (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-0 box-border"
        aria-modal="true"
        role="dialog"
        aria-labelledby="perfil-medico-modal-title"
      >
        <div className="bg-white rounded-none shadow-2xl flex flex-col overflow-hidden w-screen h-[100dvh] max-w-[100vw]">
          <div className="flex-shrink-0 flex justify-end items-center px-3 py-2 pt-[env(safe-area-inset-top)] border-b border-gray-200 bg-white">
            <span id="perfil-medico-modal-title" className="sr-only">
              Perfil do médico — {medicoParaSolicitar.nome}
            </span>
            <button
              type="button"
              onClick={fecharPerfilMedicoModal}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative bg-gray-100">
            {iframePerfilLoading && iframePerfilSrc && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-[1]">
                <Loader2 className="h-10 w-10 text-[#075e54] animate-spin" aria-hidden />
              </div>
            )}
            {iframePerfilSrc ? (
              <iframe
                title={`Perfil — ${medicoParaSolicitar.nome}`}
                src={iframePerfilSrc}
                className="absolute inset-0 w-full h-full border-0 bg-white"
                onLoad={() => setIframePerfilLoading(false)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-[#075e54] animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-gray-200 bg-gray-50 flex justify-center shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <button
              type="button"
              disabled={saving}
              onClick={() => void executarSolicitacaoTratamentoComoSim()}
              className="w-full max-w-md py-3.5 rounded-xl bg-[#25d366] text-white font-semibold text-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
              {saving ? 'Enviando...' : 'Solicitar Tratamento'}
            </button>
          </div>
        </div>
      </div>
    )}

    {showSolicitacaoEnviadaModal && selectedMedicoId && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" aria-modal="true">
        <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-center text-gray-900 font-medium">A solicitação foi enviada.</p>
          <button
            type="button"
            onClick={() => {
              setShowSolicitacaoEnviadaModal(false);
              if (solicitacaoCriadaViaCallbackRef.current) {
                solicitacaoCriadaViaCallbackRef.current = false;
                onClose();
              } else {
                const atualizado = { ...paciente, medicoResponsavelId: selectedMedicoId };
                onSave(true, atualizado).then(() => onClose()).catch(() => {});
              }
            }}
            className="mt-4 w-full py-2 rounded-lg bg-[#25d366] text-white font-medium hover:opacity-90"
          >
            OK
          </button>
        </div>
      </div>
    )}
    </>
  );
}
