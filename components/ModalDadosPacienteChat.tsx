'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, User as UserIcon, Loader2, Send, MapPin, Star, BadgeCheck, Badge } from 'lucide-react';
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
import { META_STEP_CM, META_STEP_KG, roundMetaHalfStep } from '@/utils/metaadminMetasUiSteps';
import {
  ensureImcOnPaciente,
} from '@/lib/meta/medidasIniciaisImc';
import PerfilMetabolicoV3ChatUI from '@/components/meta/PerfilMetabolicoV3ChatUI';
import {
  deveExibirPerfilMetabolicoV3,
  deveRedirecionarParaPerfilMetabolicoV3,
  getFirstIncompletePerfilMetabolicoStep,
  getPerfilMetabolicoBotText,
  isPerfilMetabolicoChatStep,
  PERFIL_METABOLICO_V3_STEP_LAST,
  PERFIL_METABOLICO_V3_STEP_FIRST,
  resolveEffectiveChatStep,
} from '@/lib/meta/perfilMetabolicoV3Chat';
import {
  CHAT_BOT_TEXTS,
  COMORBIDADES_OPTIONS,
  DIAGNOSTICO_LABELS,
  DIAGNOSTICO_TIPOS,
  ESTADOS_BR,
  formatCpf,
  formatTelefone,
  getFirstIncompleteStep,
  getFirstUnansweredRiskIndex,
  getInitialBotTextForStep,
  getMedicoChatDisplayName,
  medicoElegivelListaPaciente,
  META_CHAT_INTRO_SANDBOX_SESSION_KEY,
  META_CHAT_INTRO_SESSION_KEY,
  MESES,
  MOTIVACAO_OPTIONS,
  parseAlturaToCm,
  parseCircToCm,
  patchMedidasIniciais,
  resolveInitialChatStep,
  RISK_QUESTIONS,
  riskOptionLabel,
  SINTOMAS_GI_OPTIONS,
  TIREOIDE_OPTIONS,
  TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA,
  TEXTO_FECHAMENTO_PERFIL,
  TEXTO_INTRO_HINT,
  TEXTO_INTRO_TITULO,
  TEXTO_PESQUISA_MEDICO,
  TEXTO_POS_METAS_SEM_BUSCA_MEDICO,
  TEXTO_SOLICITACAO_PENDENTE,
  temCircunferenciaInicialParaMetas,
  devePularSelecaoMedicoNoChat,
} from '@/lib/meta/metaChatInicial';

export {
  META_CHAT_INTRO_SESSION_KEY,
  META_CHAT_INTRO_SANDBOX_SESSION_KEY,
  getFirstIncompleteStep,
} from '@/lib/meta/metaChatInicial';

const TYPING_DELAY_MS = 1500;
const OPTIONS_DELAY_MS = 500;

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
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] text-white flex items-center justify-center shrink-0 text-sm font-semibold">
      {initial || <UserIcon size={20} />}
    </div>
  );
}

type DiagnosticoTipo = NonNullable<PacienteCompleto['dadosClinicos']['diagnosticoPrincipal']>['tipo'];
type Riscos = NonNullable<PacienteCompleto['dadosClinicos']['riscos']>;
type HistoriaTireoide = NonNullable<PacienteCompleto['dadosClinicos']['historiaTireoidiana']>;
type SolicitacaoResumo = {
  medicoNome: string;
  status: 'pendente_confirmacao';
};

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
  const initialStep = resolveInitialChatStep(paciente, introSessionKey);
  const [messages, setMessages] = useState<Array<{ type: 'bot' | 'user'; text: string }>>([]);
  const [step, setStep] = useState(initialStep);
  const [riskQuestionIndex, setRiskQuestionIndex] = useState(() =>
    initialStep === 11 ? getFirstUnansweredRiskIndex(paciente) : 0
  );
  const [showTyping, setShowTyping] = useState(initialStep > 0 && initialStep !== 17);
  const [showOptionsAfterQuestion, setShowOptionsAfterQuestion] = useState(initialStep === 17);
  const [replyPersisting, setReplyPersisting] = useState(false);
  const [nextBotText, setNextBotText] = useState<string | null>(getInitialBotTextForStep(initialStep));
  const [alturaInputStr, setAlturaInputStr] = useState('');
  const [circInputStr, setCircInputStr] = useState('');
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedCidade, setSelectedCidade] = useState('');
  const [medicosFiltrados, setMedicosFiltrados] = useState<Medico[]>([]);
  const [agregadosMedicos, setAgregadosMedicos] = useState<Record<string, { count: number; media: number }>>({});
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [selectedMedicoId, setSelectedMedicoId] = useState<string | null>(null);
  const [solicitacaoResumo, setSolicitacaoResumo] = useState<SolicitacaoResumo | null>(null);
  const [showPerfilMedicoModal, setShowPerfilMedicoModal] = useState(false);
  const [medicoParaSolicitar, setMedicoParaSolicitar] = useState<Medico | null>(null);
  const [iframePerfilSrc, setIframePerfilSrc] = useState('');
  const [iframePerfilLoading, setIframePerfilLoading] = useState(true);
  const [hasSolicitacaoAbertaCheck, setHasSolicitacaoAbertaCheck] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const addedFirstRiskQuestionRef = useRef(false);
  const pacienteRef = useRef(paciente);
  const replyPersistingRef = useRef(false);

  useEffect(() => {
    pacienteRef.current = paciente;
  }, [paciente]);

  /** Após loadPaciente no /meta, avança o passo se o Firestore já tem mais respostas (só quando o tick muda — não a cada tecla). */
  useEffect(() => {
    if (!resumeAfterLoadTick) return;
    const p = pacienteRef.current;
    const v2 = getFirstIncompleteStep(p, introSessionKey);
    const perfilPendente = getFirstIncompletePerfilMetabolicoStep(p);
    if (perfilPendente != null && deveRedirecionarParaPerfilMetabolicoV3(p, v2)) {
      setStep(perfilPendente);
      const bot = getPerfilMetabolicoBotText(perfilPendente);
      setNextBotText(bot);
      setShowTyping(!!bot);
      setShowOptionsAfterQuestion(false);
      return;
    }
    const target = resolveEffectiveChatStep(p, v2);
    setStep((prev) => {
      return target > prev ? target : prev;
    });
    if (target === 11) {
      setRiskQuestionIndex(getFirstUnansweredRiskIndex(p));
    }
  }, [resumeAfterLoadTick, introSessionKey]);


  // Ao sair do passo 15 (busca médico), resetar a verificação de solicitação aberta.
  useEffect(() => {
    if (step !== 15) {
      setHasSolicitacaoAbertaCheck(null);
    }
  }, [step]);

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
    if (step === 7) setCircInputStr('');
  }, [step]);

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
      .then((list) => setMedicos(list.filter(medicoElegivelListaPaciente)))
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
      .then((list) => setMedicosFiltrados(list.filter(medicoElegivelListaPaciente)))
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

  const beginReplyPersist = () => {
    if (replyPersistingRef.current) return false;
    replyPersistingRef.current = true;
    setReplyPersisting(true);
    setShowOptionsAfterQuestion(false);
    setSaving(true);
    return true;
  };

  const endReplyPersist = () => {
    replyPersistingRef.current = false;
    setReplyPersisting(false);
    setSaving(false);
  };

  const removeOptimisticReply = (replyText: string) => {
    setMessages((m) => {
      const last = m[m.length - 1];
      if (last?.type === 'user' && last.text === replyText) {
        return m.slice(0, -1);
      }
      return m;
    });
  };

  const irParaBuscaMedicoOuPerfilCompleto = (cur: PacienteCompleto) => {
    const pularBusca = devePularSelecaoMedicoNoChat(cur);
    if (pularBusca) {
      setMessages((m) => [
        ...m,
        { type: 'bot', text: TEXTO_FECHAMENTO_PERFIL },
        { type: 'bot', text: TEXTO_POS_METAS_SEM_BUSCA_MEDICO },
      ]);
      setTimeout(() => {
        setStep(17);
        setShowTyping(false);
        setNextBotText(null);
        setShowOptionsAfterQuestion(true);
      }, 1600);
      return;
    }
    setMessages((m) => [...m, { type: 'bot', text: TEXTO_FECHAMENTO_PERFIL }]);
    setTimeout(() => {
      setMessages([]);
      setStep(15);
      setNextBotText(TEXTO_PESQUISA_MEDICO);
      setShowTyping(true);
    }, 1600);
  };

  const iniciarPerfilMetabolicoV3AposMetas = (cur: PacienteCompleto) => {
    const perfilStep = getFirstIncompletePerfilMetabolicoStep(cur) ?? PERFIL_METABOLICO_V3_STEP_FIRST;
    setMessages((m) => [...m, { type: 'bot', text: TEXTO_FECHAMENTO_PERFIL }]);
    setTimeout(() => {
      setMessages([]);
      setStep(perfilStep);
      const bot = getPerfilMetabolicoBotText(perfilStep);
      setNextBotText(bot);
      setShowTyping(!!bot);
    }, 1200);
  };

  const pushReplyAndNext = async (replyText: string, pacienteAtualizado?: PacienteCompleto) => {
    if (!beginReplyPersist()) return;
    const payload = ensureImcOnPaciente(pacienteAtualizado ?? pacienteRef.current);
    const currentStep = step;
    setMessages((m) => [...m, { type: 'user', text: replyText }]);
    try {
      await onSave(false, payload);
    } catch {
      removeOptimisticReply(replyText);
      setShowOptionsAfterQuestion(true);
      return;
    } finally {
      endReplyPersist();
    }

    if (currentStep === 14) {
      const cur = payload;
      if (deveExibirPerfilMetabolicoV3(cur) && getFirstIncompletePerfilMetabolicoStep(cur) != null) {
        iniciarPerfilMetabolicoV3AposMetas(cur);
        return;
      }
      irParaBuscaMedicoOuPerfilCompleto(cur);
      return;
    }

    if (isPerfilMetabolicoChatStep(currentStep)) {
      if (currentStep === PERFIL_METABOLICO_V3_STEP_LAST) {
        irParaBuscaMedicoOuPerfilCompleto(payload);
        return;
      }
      const next = currentStep + 1;
      setNextBotText(getPerfilMetabolicoBotText(next));
      setShowTyping(true);
      setStep(next);
      return;
    }

    const nextStep = currentStep + 1;
    if (nextStep <= 14) {
      setNextBotText(CHAT_BOT_TEXTS[nextStep - 1]);
      setShowTyping(true);
    }
    setStep((s) => {
      const next = s + 1;
      if (next === 11) setShowOptionsAfterQuestion(false);
      return next;
    });
  };

  const handleClose = () => {
    setShowPerfilMedicoModal(false);
    setMedicoParaSolicitar(null);
    setIframePerfilSrc('');
    setSolicitacaoResumo(null);
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

  const finalizarFluxoSolicitacao = (medico: Medico) => {
    setSelectedMedicoId(medico.id);
    setSolicitacaoResumo({
      medicoNome: getMedicoChatDisplayName(medico),
      status: 'pendente_confirmacao',
    });
    setMessages((m) => [...m, { type: 'bot', text: TEXTO_SOLICITACAO_PENDENTE }]);
    setStep(18);
    setShowTyping(false);
    setNextBotText(null);
    setShowOptionsAfterQuestion(false);
    fecharPerfilMedicoModal();
  };

  const executarSolicitacaoTratamentoComoSim = async () => {
    const medico = medicoParaSolicitar;
    if (!medico) return;
    const atualizado = { ...paciente, medicoResponsavelId: medico.id };
    if (onCreateSolicitacao) {
      setSaving(true);
      try {
        await onCreateSolicitacao({ id: medico.id, nome: medico.nome }, atualizado);
        finalizarFluxoSolicitacao(medico);
      } catch (err) {
        console.error('Erro ao criar solicitação:', err);
      } finally {
        setSaving(false);
      }
    } else {
      setPaciente(atualizado);
      setSaving(true);
      try {
        await onSave(false, atualizado);
        finalizarFluxoSolicitacao(medico);
      } catch {
        return;
      } finally {
        setSaving(false);
      }
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const chatPatternBg = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='%23ffffff' stroke-width='0.35'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23g)' opacity='0.07'/%3E%3C/svg%3E")`,
  };

  return (
    <>
    <div
      className={
        embedded
          ? 'flex flex-col h-full min-h-0 max-h-[calc(100vh-8rem)] rounded-xl border border-white/10 overflow-hidden bg-[#0A1F44]'
          : 'flex flex-col h-full min-h-0 overflow-hidden bg-[#0A1F44]'
      }
    >
      {/* Header estilo WhatsApp */}
      <div
        className={`flex-shrink-0 border-b border-white/10 bg-[#0A1F44] text-[#E8EDED] px-4 py-3 flex items-center justify-between ${embedded ? 'rounded-t-xl' : 'rounded-t-none'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center shrink-0 shadow-md shadow-[#4CCB7A]/20">
            <UserIcon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate text-[#E8EDED]">{chatTitle}</h2>
            <p className="text-xs text-[#E8EDED]/70 truncate">{chatSubtitle}</p>
          </div>
        </div>
        {embedded && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-[#E8EDED] shrink-0"
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

      {/* Mensagens com scroll; composição (campo + enviar) fixa no rodapé como WhatsApp */}
      <div className="flex min-h-0 flex-1 flex-col">
      {/* Área de mensagens */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-3 bg-[#0A1F44]"
        style={chatPatternBg}
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                msg.type === 'user'
                  ? 'bg-[#4CCB7A] text-[#0A1F44] rounded-tr-none border border-[#4CCB7A]/50'
                  : 'bg-white/10 border border-white/10 text-[#E8EDED] rounded-tl-none'
              }`}
            >
              <p
                className={`text-sm whitespace-pre-line break-words ${
                  msg.type === 'user' ? 'text-[#0A1F44]' : 'text-[#E8EDED]'
                }`}
              >
                {msg.text}
              </p>
              <p
                className={`text-[10px] mt-0.5 ${msg.type === 'user' ? 'text-right text-[#0A1F44]/55' : 'text-left text-[#E8EDED]/45'}`}
              >
                {formatTime(new Date())}
              </p>
            </div>
          </div>
        ))}

        {/* Bolha "digitando..." (três pontinhos) */}
        {showTyping && (
          <div className="flex justify-start mb-2">
            <div className="rounded-lg rounded-tl-none border border-white/10 bg-white/10 px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#4CCB7A] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#4CCB7A] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#4CCB7A] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Opções só depois que a pergunta apareceu (e após um pequeno delay). Card sem fundo branco em gênero, diagnóstico, comorbidades, riscos, tireoide, sintomas, metas. */}
        {((step >= 2 && step < 15) || isPerfilMetabolicoChatStep(step)) &&
          !(step === 5 || step === 6) &&
          !showTyping &&
          showOptionsAfterQuestion &&
          !replyPersisting && (
          <div className={`mt-2 flex ${step === 14 ? 'w-full' : 'justify-start'}`}>
            <div
              className={`rounded-lg rounded-tl-none px-4 py-3 ${
                step === 14 ? 'w-full max-w-full' : 'max-w-[95%]'
              } ${[2, 4].includes(step) ? 'border border-white/10 bg-white/5 shadow-sm' : 'border-0 bg-transparent shadow-none'}`}
            >
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
                      className="w-14 rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-2 py-2 text-center text-sm text-[#E8EDED]"
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
                      className="min-w-[100px] rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-2 py-2 text-sm text-[#E8EDED]"
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
                      className="min-w-[80px] rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-2 py-2 text-sm text-[#E8EDED]"
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
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm font-medium hover:bg-[#45b86d] disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${paciente.dadosIdentificacao?.sexoBiologico === value ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold' : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'}`}
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
                    className="max-w-[220px] min-w-[140px] flex-1 rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
                  />
                  <button
                    type="button"
                    onClick={() => paciente.dadosIdentificacao?.cpf?.replace(/\D/g, '').length === 11 && pushReplyAndNext(formatCpf(paciente.dadosIdentificacao.cpf))}
                    disabled={paciente.dadosIdentificacao?.cpf?.replace(/\D/g, '').length !== 11}
                    className="p-2 rounded-full bg-[#4CCB7A] text-[#0A1F44] font-semibold hover:bg-[#45b86d] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Enviar"
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
              {step === 7 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next: PacienteCompleto = {
                        ...paciente,
                        dadosClinicos: {
                          ...paciente.dadosClinicos,
                          medidasIniciais: patchMedidasIniciais(paciente.dadosClinicos?.medidasIniciais, {
                            circunferenciaAbdominal: 0,
                            circunferenciaNaoInformada: true,
                          }),
                        },
                      };
                      setPaciente(next);
                      pushReplyAndNext('Não sei', next);
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15"
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
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${m[k] ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold' : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'}`}
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
                        className="mt-2 w-full rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
                      />
                    )}
                    <button
                      type="button"
                      disabled={!MOT.some(({ k }) => m[k])}
                      onClick={() => pushReplyAndNext(labels.length ? labels.join(', ') : '—')}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm font-medium hover:bg-[#45b86d] disabled:opacity-50 disabled:cursor-not-allowed"
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
                            selected.includes(value) ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold' : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'
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
                          className="min-w-[120px] flex-1 rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
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
                      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm font-medium hover:bg-[#45b86d]"
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
                          ((paciente.dadosClinicos?.comorbidades || {}) as Record<string, unknown>)[key] ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold' : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'
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
                      className="mt-2 w-full rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
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
                        dadosClinicos: {
                          ...paciente.dadosClinicos,
                          chatComorbidadesEnviado: true,
                        } as PacienteCompleto['dadosClinicos'],
                      };
                      setPaciente(next);
                      pushReplyAndNext(labels.length ? labels.join(', ') : '—', next);
                    }}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm font-medium hover:bg-[#45b86d]"
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
                          onClick={async () => {
                            const next: PacienteCompleto = {
                              ...pacienteRef.current,
                              dadosClinicos: {
                                ...pacienteRef.current.dadosClinicos,
                                riscos: { ...(pacienteRef.current.dadosClinicos?.riscos || {}), [key]: opt } as Riscos,
                              },
                            };
                            const replyText = optLabel(opt);
                            setPaciente(next);
                            const currentRiskQuestionIndex = riskQuestionIndex;
                            if (!beginReplyPersist()) return;
                            setMessages((m) => [...m, { type: 'user', text: replyText }]);
                            try {
                              await onSave(false, next);
                            } catch {
                              removeOptimisticReply(replyText);
                              setShowOptionsAfterQuestion(true);
                              return;
                            } finally {
                              endReplyPersist();
                            }
                            if (currentRiskQuestionIndex + 1 < riskList.length) {
                              const nextQ = riskList[currentRiskQuestionIndex + 1];
                              setMessages((m) => [...m, { type: 'bot', text: nextQ.label }]);
                              setRiskQuestionIndex((i) => i + 1);
                              setShowOptionsAfterQuestion(true);
                            } else {
                              setStep(12);
                              setNextBotText(CHAT_BOT_TEXTS[11]);
                              setShowTyping(true);
                            }
                          }}
                          className="px-3 py-2 rounded-lg text-sm font-medium border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15"
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
                            if (value !== 'outro') void pushReplyAndNext(label, next);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selected === value ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold' : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'}`}
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
                          className="mt-2 w-full rounded-lg border border-white/20 bg-[#0d2a5a]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
                        />
                        <button type="button" onClick={() => pushReplyAndNext(paciente.dadosClinicos?.historiaTireoidianaOutro || 'Outro')} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm font-medium hover:bg-[#45b86d]">
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
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${sintomasGI[key] ? 'bg-[#4CCB7A] text-[#0A1F44] font-semibold' : 'border border-white/10 bg-white/10 text-[#E8EDED]/90 hover:bg-white/15'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => pushReplyAndNext(labels.length ? labels.join(', ') : '—')} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm font-medium hover:bg-[#45b86d]">
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

                const kgMinRaw = peso0 != null && peso0 > 0 ? (peso0 * pctMin) / 100 : 0;
                const kgMaxRaw = peso0 != null && peso0 > 0 ? (peso0 * pctMax) / 100 : 0;
                const kgMin =
                  peso0 != null && peso0 > 0 ? Math.ceil(kgMinRaw * (1 / META_STEP_KG)) * META_STEP_KG : 0;
                const kgMax =
                  peso0 != null && peso0 > 0 ? Math.floor(kgMaxRaw * (1 / META_STEP_KG)) * META_STEP_KG : 0;
                let kgLoss =
                  peso0 != null && peso0 > 0 ? roundMetaHalfStep((peso0 * pctLoss) / 100) : 0;
                if (peso0 != null && peso0 > 0 && kgMax >= kgMin) {
                  kgLoss = roundMetaHalfStep(Math.min(kgMax, Math.max(kgMin, kgLoss)));
                }

                const maxWaistLoss =
                  cint0 != null && cint0 > 60
                    ? Math.min(40, Math.round((cint0 - 55) * 10) / 10)
                    : cint0 != null && cint0 > 0
                      ? Math.min(30, Math.round(cint0 * 0.25 * 10) / 10)
                      : 25;
                const maxWaistLossSlider =
                  Math.max(0, Math.floor(maxWaistLoss / META_STEP_CM) * META_STEP_CM);
                let waistLossCm =
                  typeof m?.waistReductionTargetCm === 'number' && !Number.isNaN(m.waistReductionTargetCm)
                    ? m.waistReductionTargetCm
                    : 8;
                waistLossCm = roundMetaHalfStep(
                  Math.min(maxWaistLossSlider > 0 ? maxWaistLossSlider : maxWaistLoss, Math.max(0, waistLossCm))
                );

                const pesoMeta =
                  peso0 != null && peso0 > 0 ? roundMetaHalfStep(peso0 - kgLoss) : null;
                const cinturaMeta =
                  temCint && cint0 != null ? roundMetaHalfStep(cint0 - waistLossCm) : null;

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
                  const maxWSlider = Math.max(0, Math.floor(maxW / META_STEP_CM) * META_STEP_CM);
                  let waist =
                    typeof m2?.waistReductionTargetCm === 'number' && !Number.isNaN(m2.waistReductionTargetCm)
                      ? m2.waistReductionTargetCm
                      : 8;
                  waist = roundMetaHalfStep(
                    Math.min(maxWSlider > 0 ? maxWSlider : maxW, Math.max(0, waist))
                  );

                  let kgP =
                    peso02 != null && peso02 > 0 ? roundMetaHalfStep((peso02 * pct) / 100) : null;
                  if (kgP != null && peso02 != null && peso02 > 0) {
                    pct = Math.round(Math.min(pctMax, Math.max(pctMin, (kgP / peso02) * 100)) * 10) / 10;
                  }
                  const partes: string[] = [];
                  if (peso02 != null && peso02 > 0 && kgP != null) {
                    const pesoMetaStr = roundMetaHalfStep(peso02 - kgP);
                    partes.push(
                      `Perder ~${kgP} kg (~${pct}% do peso inicial, peso meta ~${pesoMetaStr} kg)`
                    );
                  }
                  if (temCint2 && cint02 != null) {
                    partes.push(
                      `Reduzir ${waist} cm na cintura (meta ~${roundMetaHalfStep(cint02 - waist)} cm)`
                    );
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
                  void pushReplyAndNext(replyText, atualizado);
                };

                return (
                  <div className="space-y-4 max-w-full">
                    {peso0 != null && peso0 > 0 ? (
                      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#E8EDED]">Quanto deseja perder (peso)</span>
                          <span className="text-lg font-bold tabular-nums text-[#4CCB7A]">{kgLoss} kg</span>
                        </div>
                        <input
                          type="range"
                          min={kgMin}
                          max={kgMax}
                          step={META_STEP_KG}
                          value={kgLoss}
                          onChange={(e) => {
                            const kg = roundMetaHalfStep(parseFloat(e.target.value));
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
                        <div className="flex justify-between text-[10px] text-[#E8EDED]/45">
                          <span>{kgMin} kg</span>
                          <span>{kgMax} kg</span>
                        </div>
                        <p className="text-[11px] leading-snug text-[#E8EDED]/70">
                          ≈ <span className="font-semibold text-[#4CCB7A]">{pctLoss}%</span> do peso inicial (
                          {peso0} kg). Peso meta ~<span className="font-medium text-[#E8EDED]">{pesoMeta}</span> kg.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-200/90">Falta peso inicial — volte às medidas.</p>
                    )}

                    {temCint && cint0 != null && cint0 > 0 ? (
                      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#E8EDED]">Circunferência abdominal</span>
                          <span className="text-base font-bold tabular-nums text-[#2F8FA3]">−{waistLossCm} cm</span>
                        </div>
                        <p className="text-[11px] text-[#E8EDED]/65">
                          Cintura inicial: {cint0} cm · Meta ~{cinturaMeta} cm
                        </p>
                        <input
                          type="range"
                          min={0}
                          max={maxWaistLossSlider > 0 ? maxWaistLossSlider : maxWaistLoss}
                          step={META_STEP_CM}
                          value={waistLossCm}
                          onChange={(e) => {
                            const v = roundMetaHalfStep(parseFloat(e.target.value));
                            patchMetasPartial({ waistReductionTargetCm: v });
                          }}
                          className="metaadmin-metas-range metaadmin-metas-range--waist w-full"
                          aria-label="Redução em cm da circunferência abdominal"
                        />
                        <div className="flex justify-between text-[10px] text-[#E8EDED]/45">
                          <span>0 cm</span>
                          <span>{maxWaistLossSlider > 0 ? maxWaistLossSlider : maxWaistLoss} cm</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#E8EDED]/60">
                        Você não informou a circunferência abdominal — só a meta de peso será salva.
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={!(peso0 != null && peso0 > 0)}
                      onClick={enviarMetas}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#4CCB7A] px-3 py-2.5 text-sm font-semibold text-[#0A1F44] hover:bg-[#45b86d] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={14} /> Enviar metas
                    </button>
                  </div>
                );
              })()}
              {isPerfilMetabolicoChatStep(step) && (
                <PerfilMetabolicoV3ChatUI
                  step={step}
                  paciente={paciente}
                  setPaciente={setPaciente}
                  onSubmit={(reply, updated) => {
                    void pushReplyAndNext(reply, updated);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {step === 15 && !showTyping && showOptionsAfterQuestion && (
          <div className="space-y-3 mt-2">
            {hasSolicitacaoAbertaCheck === true ? (
              <div className="space-y-3 rounded-xl border border-amber-400/35 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-[#E8EDED]">Você já tem uma solicitação em andamento.</p>
                <div className="inline-flex rounded-full border border-amber-300/35 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100">
                  Em andamento
                </div>
                <p className="text-xs leading-relaxed text-[#E8EDED]/70">
                  Acompanhe o status em Médicos {'>'} Minhas solicitações.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#4CCB7A] px-4 py-2 text-sm font-semibold text-[#0A1F44] hover:bg-[#45b86d]"
                >
                  Fechar
                </button>
              </div>
            ) : (hasSolicitacaoAbertaCheck === false || !onCheckSolicitacaoAberta) ? (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-sm font-medium text-[#E8EDED]/85">Estado:</label>
                  <select
                    value={selectedEstado}
                    onChange={(e) => {
                      setSelectedEstado(e.target.value);
                      setSelectedCidade('');
                    }}
                    className="min-w-[100px] rounded-lg border border-white/20 bg-[#0d2a5a]/90 px-3 py-2 text-sm text-[#E8EDED]"
                  >
                    <option value="">Selecione</option>
                    {(estadosComMedicos.length ? estadosComMedicos : ESTADOS_BR).map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                {selectedEstado && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-sm font-medium text-[#E8EDED]/85">Cidade:</label>
                    <select
                      value={selectedCidade}
                      onChange={(e) => {
                        setSelectedCidade(e.target.value);
                        setStep(16);
                      }}
                      className="min-w-[160px] rounded-lg border border-white/20 bg-[#0d2a5a]/90 px-3 py-2 text-sm text-[#E8EDED]"
                    >
                      <option value="">Selecione</option>
                      {cidadesDoEstado.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
                {loadingMedicos && (
                  <p className="flex items-center gap-2 text-sm text-[#E8EDED]/65">
                    <Loader2 size={16} className="animate-spin text-[#4CCB7A]" /> Carregando...
                  </p>
                )}
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-[#E8EDED]/65">
                <Loader2 size={16} className="animate-spin text-[#4CCB7A]" /> Verificando solicitações...
              </p>
            )}
          </div>
        )}

        {step === 16 && (
          <div className="space-y-2 mt-2">
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-[#E8EDED]/70">Quer buscar médicos em outro lugar? Você pode mudar aqui.</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium text-[#E8EDED]/85">Estado:</label>
                <select
                  value={selectedEstado}
                  onChange={(e) => {
                    setSelectedEstado(e.target.value);
                    setSelectedCidade('');
                    setSelectedMedicoId(null);
                    setMedicosFiltrados([]);
                  }}
                  className="min-w-[100px] rounded-lg border border-white/20 bg-[#0d2a5a]/90 px-3 py-2 text-sm text-[#E8EDED]"
                >
                  <option value="">Selecione</option>
                  {(estadosComMedicos.length ? estadosComMedicos : ESTADOS_BR).map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              {selectedEstado && (
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-sm font-medium text-[#E8EDED]/85">Cidade:</label>
                  <select
                    value={selectedCidade}
                    onChange={(e) => {
                      setSelectedCidade(e.target.value);
                      setSelectedMedicoId(null);
                      setStep(16);
                    }}
                    className="min-w-[160px] rounded-lg border border-white/20 bg-[#0d2a5a]/90 px-3 py-2 text-sm text-[#E8EDED]"
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
              <p className="flex items-center gap-2 text-sm text-[#E8EDED]/65">
                <Loader2 size={16} className="animate-spin text-[#4CCB7A]" /> Buscando médicos...
              </p>
            ) : medicosFiltrados.length === 0 ? (
              <p className="text-sm text-[#E8EDED]/70">Nenhum médico encontrado nesta cidade.</p>
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
                          ? 'border-[#4CCB7A] bg-[#4CCB7A]/15'
                          : 'border-white/10 bg-white/5 hover:border-[#4CCB7A]/50 hover:bg-white/10'
                      }`}
                    >
                      <MedicoChatListAvatar medico={medico} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate font-medium text-[#E8EDED]">
                          {medico.genero === 'F' ? 'Dra. ' : 'Dr. '}{(() => {
                            const cap = (s: string) => (s.charAt(0).toUpperCase() + (s.slice(1) || '').toLowerCase()).trim();
                            const parts = (medico.nome || '').trim().split(/\s+/).filter(Boolean);
                            if (parts.length <= 1) return cap(parts[0] || medico.nome || '');
                            return `${cap(parts[0])} ${cap(parts[parts.length - 1])}`;
                          })()}
                          {medico.isVerificado ? (
                            <BadgeCheck size={18} className="text-green-600 fill-green-100 shrink-0" title="Médico verificado" />
                          ) : (
                            <Badge size={16} className="shrink-0 text-[#E8EDED]/45" title="Não verificado" />
                          )}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-[#E8EDED]/60">
                          <MapPin size={12} />
                          {selectedCidade}, {selectedEstado}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i <= estrelasCheias ? 'text-amber-400 fill-amber-400' : 'text-[#E8EDED]/25'}
                            />
                          ))}
                          {count > 0 && (
                            <span className="ml-1 text-xs text-[#E8EDED]/55">
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

        {step === 18 && solicitacaoResumo && (
          <div className="mt-2 flex justify-start">
            <div className="max-w-[95%] rounded-lg rounded-tl-none border border-white/10 bg-white/10 px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold text-[#E8EDED]">Solicitação enviada com sucesso</p>
              <div className="mt-3 rounded-xl border border-[#4CCB7A]/25 bg-[#4CCB7A]/10 p-3">
                <p className="text-[11px] uppercase tracking-wide text-[#E8EDED]/60">Médico selecionado</p>
                <p className="mt-1 text-sm font-semibold text-[#E8EDED]">{solicitacaoResumo.medicoNome}</p>
                <div className="mt-3 inline-flex rounded-full border border-amber-300/35 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100">
                  {solicitacaoResumo.status === 'pendente_confirmacao' ? 'Pendente de confirmação' : ''}
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#E8EDED]/70">
                Agora é só aguardar a confirmação do médico. Você pode acompanhar em Médicos {'>'} Minhas solicitações.
              </p>
            </div>
          </div>
        )}

      </div>

      {(step === 0 ||
        (step === 1 && !replyPersisting) ||
        ((step === 5 || step === 6 || step === 7) && !showTyping && showOptionsAfterQuestion) ||
        (step === 17 || step === 18)) && (
        <div className="shrink-0 border-t border-white/10 bg-[#0A1F44] px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
          {step === 0 && (
            <div className="rounded-t-xl p-1">
              <p className="mb-1 text-base font-medium text-[#E8EDED]">Vamos montar juntos um plano personalizado para o seu tratamento.</p>
              <p className="mb-4 text-sm text-[#E8EDED]/70">Leva menos de 2 minutos.</p>
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem(introSessionKey, '1');
                  } catch {
                    /* ignore */
                  }
                  if (!pacienteRef.current.dadosClinicos?.tipoAvaliacaoInicial) {
                    setPaciente((p) => ({
                      ...p,
                      dadosClinicos: { ...p.dadosClinicos, tipoAvaliacaoInicial: 'completa' },
                    }));
                  }
                  setStep(1);
                  setShowTyping(true);
                  setNextBotText(CHAT_BOT_TEXTS[0]);
                }}
                className="w-full rounded-xl bg-[#4CCB7A] py-3 text-sm font-semibold text-[#0A1F44] shadow-lg shadow-[#4CCB7A]/20 transition-colors hover:bg-[#45b86d]"
              >
                Começar agora
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="flex w-full items-center gap-2 py-1">
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
                className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-[#0d2a5a]/80 px-4 py-2.5 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
              />
              <button
                type="button"
                onClick={async () => {
                  const tel = (paciente.dadosIdentificacao?.telefone || '').replace(/\D/g, '');
                  if (tel.length < 10) return;
                  const replyText = paciente.dadosIdentificacao?.telefone || '';
                  if (!beginReplyPersist()) return;
                  setMessages((m) => [...m, { type: 'user', text: replyText }]);
                  try {
                    await onSave(false, paciente);
                  } catch {
                    removeOptimisticReply(replyText);
                    setShowOptionsAfterQuestion(true);
                    return;
                  } finally {
                    endReplyPersist();
                  }
                  setStep(2);
                  setNextBotText(CHAT_BOT_TEXTS[1]);
                  setShowTyping(true);
                }}
                disabled={((paciente.dadosIdentificacao?.telefone || '').replace(/\D/g, '').length < 10)}
                className="shrink-0 rounded-full bg-[#4CCB7A] p-2.5 text-[#0A1F44] hover:bg-[#45b86d] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send size={20} />
              </button>
            </div>
          )}

          {(step === 5 || step === 6 || step === 7) && !showTyping && showOptionsAfterQuestion && (
            <div className="flex w-full max-w-full items-center gap-2 py-1">
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
                          medidasIniciais: patchMedidasIniciais(p.dadosClinicos?.medidasIniciais, {
                            peso: v ?? 0,
                          }),
                        },
                      }));
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && paciente.dadosClinicos?.medidasIniciais?.peso && pushReplyAndNext(`${paciente.dadosClinicos!.medidasIniciais!.peso} kg`)}
                    placeholder="Peso em kg (ex: 85.5)"
                    className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-[#0d2a5a]/80 px-4 py-2.5 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
                  />
                  <button
                    type="button"
                    onClick={() => paciente.dadosClinicos?.medidasIniciais?.peso && pushReplyAndNext(`${paciente.dadosClinicos.medidasIniciais.peso} kg`)}
                    disabled={!paciente.dadosClinicos?.medidasIniciais?.peso}
                    className="shrink-0 rounded-full bg-[#4CCB7A] p-2.5 text-[#0A1F44] hover:bg-[#45b86d] disabled:cursor-not-allowed disabled:opacity-50"
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
                          medidasIniciais: patchMedidasIniciais(paciente.dadosClinicos?.medidasIniciais, {
                            altura: cm,
                          }),
                        },
                      };
                      setPaciente(next);
                      pushReplyAndNext(`${cm} cm`, next);
                      setAlturaInputStr('');
                    }}
                    placeholder="Altura: 170 ou 1,70 m"
                    className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-[#0d2a5a]/80 px-4 py-2.5 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
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
                          medidasIniciais: patchMedidasIniciais(paciente.dadosClinicos?.medidasIniciais, {
                            altura: cm,
                          }),
                        },
                      };
                      setPaciente(next);
                      pushReplyAndNext(`${cm} cm`, next);
                      setAlturaInputStr('');
                    }}
                    disabled={parseAlturaToCm(alturaInputStr) == null}
                    className="shrink-0 rounded-full bg-[#4CCB7A] p-2.5 text-[#0A1F44] hover:bg-[#45b86d] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Enviar"
                  >
                    <Send size={20} />
                  </button>
                </>
              )}
              {step === 7 && (
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
                            medidasIniciais: patchMedidasIniciais(paciente.dadosClinicos?.medidasIniciais, {
                              circunferenciaAbdominal: cm,
                              circunferenciaNaoInformada: false,
                            }),
                          },
                        };
                        setPaciente(next);
                        pushReplyAndNext(`${cm} cm`, next);
                        setCircInputStr('');
                      }
                    }}
                    placeholder="Circunferência: 102 ou 1,02 m"
                    className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-[#0d2a5a]/80 px-4 py-2.5 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40"
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
                            medidasIniciais: patchMedidasIniciais(paciente.dadosClinicos?.medidasIniciais, {
                              circunferenciaAbdominal: cm,
                              circunferenciaNaoInformada: false,
                            }),
                          },
                        };
                        setPaciente(next);
                        pushReplyAndNext(`${cm} cm`, next);
                        setCircInputStr('');
                      }
                    }}
                    disabled={parseCircToCm(circInputStr) == null}
                    className="shrink-0 rounded-full bg-[#4CCB7A] p-2.5 text-[#0A1F44] hover:bg-[#45b86d] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Enviar"
                  >
                    <Send size={20} />
                  </button>
                </>
              )}
            </div>
          )}

          {(step === 17 || step === 18) && (
            <div className="p-1">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-[#4CCB7A] py-3 text-sm font-semibold text-[#0A1F44] shadow-lg shadow-[#4CCB7A]/15 transition-colors hover:bg-[#45b86d]"
              >
                Fechar
              </button>
            </div>
          )}
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
        <div className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] flex-col overflow-hidden rounded-none bg-[#0A1F44] shadow-2xl">
          <div className="flex shrink-0 items-center justify-end border-b border-white/10 bg-[#0A1F44] px-3 py-2 pt-[env(safe-area-inset-top)]">
            <span id="perfil-medico-modal-title" className="sr-only">
              Perfil do médico — {medicoParaSolicitar.nome}
            </span>
            <button
              type="button"
              onClick={fecharPerfilMedicoModal}
              className="rounded-full p-2 text-[#E8EDED]/80 transition-colors hover:bg-white/10 hover:text-[#E8EDED]"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
          </div>
          <div className="relative min-h-0 flex-1 bg-[#0d2a5a]">
            {iframePerfilLoading && iframePerfilSrc && (
              <div className="absolute inset-0 z-[1] flex items-center justify-center bg-[#0A1F44]">
                <Loader2 className="h-10 w-10 animate-spin text-[#4CCB7A]" aria-hidden />
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
                <Loader2 className="h-10 w-10 animate-spin text-[#4CCB7A]" />
              </div>
            )}
          </div>
          <div className="flex shrink-0 justify-center border-t border-white/10 bg-[#0A1F44] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
            <button
              type="button"
              disabled={saving}
              onClick={() => void executarSolicitacaoTratamentoComoSim()}
              className="w-full max-w-md py-3.5 rounded-xl bg-[#4CCB7A] text-[#0A1F44] font-semibold text-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
              {saving ? 'Enviando...' : 'Solicitar Tratamento'}
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  );
}
