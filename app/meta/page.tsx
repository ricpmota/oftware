'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { BarChart3, RefreshCw, Calendar, Menu, X, MessageSquare, Bell, Plus, Trash2, Edit, Stethoscope, FlaskConical, FileText, User as UserIcon, Shield, ShieldCheck, ChevronDown, ChevronUp, Activity, Weight, Send, AlertCircle, Clock, Phone, AlertTriangle, ChevronLeft, ChevronRight, UtensilsCrossed, Dumbbell, Eye, DollarSign, CheckCircle, Copy, UserPlus, MessageCircleIcon, ArrowRight, Mail, MapPin, Sun, Moon, Monitor, HelpCircle, LayoutDashboard, Check, Sparkles, Zap, Download, Syringe, TrendingUp, Loader2, Star, Scale, Share2, Quote, ExternalLink, Play } from 'lucide-react';
import { gerarRelatorioCompleto as gerarRelatorioPDF } from '@/utils/gerarRelatorioPDF';
import { UserService } from '@/services/userService';
import { Escala, Local, Servico, Residente } from '@/types/auth';
import { Troca } from '@/types/troca';
import { Ferias } from '@/types/ferias';
// import { InternalNotificationService } from '@/services/internalNotificationService';
import { MensagemService } from '@/services/mensagemService';
import { MensagemResidente, MensagemResidenteParaAdmin } from '@/types/mensagem';
import { PacienteService } from '@/services/pacienteService';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { PacienteCompleto } from '@/types/obesidade';
import { GoogleCalendarService } from '@/services/googleCalendarService';
import { PacienteMensagemService, PacienteMensagem } from '@/services/pacienteMensagemService';
import { MedicoService } from '@/services/medicoService';
import { Medico } from '@/types/medico';
import { estadosCidades, estadosList } from '@/data/cidades-brasil';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import { SolicitacaoMedico, MOTIVOS_DESISTENCIA, MOTIVOS_ABANDONO_TRATAMENTO } from '@/types/solicitacaoMedico';
import { CidadeCustomizadaService } from '@/services/cidadeCustomizadaService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Scatter, LabelList } from 'recharts';
import { buildExpectedCurveDoseDrivenAnchored, buildSuggestedDoseSchedule, predictHbA1c, predictWaistCircumference } from '@/utils/expectedCurve';
import type { Sex } from '@/types/labRanges';
import { getLabRange } from '@/utils/labRangesFromJson';
import { useLabOrderBySection } from '@/hooks/useLabOrderBySection';
import { EXAME_LABORATORIAL_KEY_TO_FIELD } from '@/lib/metaadmin/exameLaboratorialFormFields';
import { buildPatientLabSectionsFromOrder } from '@/lib/labExames/buildPatientLabSectionsFromOrder';
import { LabRangeBar } from '@/components/LabRangeBar';
import TrendLine from '@/components/TrendLine';
import ChatIA from '@/components/ChatIA';
import NutriContent from '@/components/NutriContent';
import { PersonalPageContent } from '@/app/meta/personal/page';
import { IndicacaoService } from '@/services/indicacaoService';
import { Indicacao } from '@/types/indicacao';
import { BannerService } from '@/services/bannerService';
import { Banner } from '@/types/banner';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LayoutModerno from '@/components/layouts/LayoutModerno';
import LayoutMinimalista from '@/components/layouts/LayoutMinimalista';
import LayoutInterativo from '@/components/layouts/LayoutInterativo';
import NPSModal from '@/components/NPSModal';
import NPSNotification from '@/components/NPSNotification';
import { NPSService } from '@/services/npsService';
import { calcularSemanaAtualTratamento } from '@/utils/tratamentoUtils';
import { alturaInputParaCm } from '@/utils/alturaInput';
import { ClassificacaoProfissionalService } from '@/services/classificacaoProfissionalService';
import type { ProfissionalTipo } from '@/types/classificacaoProfissional';
import { RatingHint } from '@/components/RatingHint';
import DepoimentosAnimatedBackdrop from '@/components/landing/DepoimentosAnimatedBackdrop';
import { BodyMapOverlay } from '@/components/bodymap/BodyMapOverlay';
import { BioImpedanciaDisplay } from '@/components/bodymap/BioImpedanciaDisplay';
import { BioImpedanciaTrendGlyph } from '@/components/bodymap/BioImpedanciaTrendGlyph';
import { bioFieldTrend, findRegistroAnteriorCronologico, formatBioMetricDisplay } from '@/utils/bioImpedanciaTrend';
import { parseBioDataRegistro } from '@/utils/bioImpedanciaDate';
import ModalDadosPacienteChat, { getFirstIncompleteStep } from '@/components/ModalDadosPacienteChat';
import { MetaadminPlanoTerapeuticoEditSections } from '@/components/metaadmin/MetaadminPlanoTerapeuticoEditSections';
import {
  resolveMetaPerdaPesoAtiva,
  resolveMetaReducaoCinturaAtiva,
} from '@/utils/metasTratamentoSwitches';
import { roundMetaHalfStep } from '@/utils/metaadminMetasUiSteps';
import { PagamentoService } from '@/services/pagamentoService';
import { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';
import InitialLoadingSplash from '@/components/landing/InitialLoadingSplash';
import { EvolucaoTratamentoChart } from '@/components/EvolucaoTratamentoChart';
import { buildDepoimentoResultadoFromPaciente } from '@/utils/buildDepoimentoResultadoFromPaciente';
import {
  aplicacaoFoiFeitaNoPaciente,
  formatarDataAplicacaoISO,
  labelLocalAplicacao,
  localPlanejadoParaSemana,
  obterRegistroSeguimentoDaAplicacao,
  obterUltimaVariacaoCompPaciente,
  obterUltimaVariacaoPesoPaciente,
  obterVariacaoCompAplicacao,
  obterVariacaoPesoAplicacao,
} from '@/utils/evolucaoAplicacaoHelpers';

const META_SPLASH_BG = '#0A1F44';

// Componente para animação de contagem regressiva
function AnimatedCounter({ from, to, suffix = '', duration = 2000 }: { from: number; to: number; suffix?: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(from);

  useEffect(() => {
    if (from === to) {
      setDisplayValue(to);
      return;
    }

    const startTime = Date.now();
    const difference = to - from;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function para suavizar a animação
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = from + (difference * easeOutCubic);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(to);
      }
    };

    requestAnimationFrame(animate);
  }, [from, to, duration]);

  return (
    <span className="text-base font-semibold text-black">
      {displayValue.toFixed(1)}{suffix}
    </span>
  );
}

function AnimatedWeight({ weight, immediate = false, onAnimationComplete }: { weight: number | null; immediate?: boolean; onAnimationComplete?: () => void }) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasCalledCallback = useRef(false);
  const lastWeight = useRef<number | null>(null);

  useEffect(() => {
    // Resetar se o peso mudou
    if (weight !== lastWeight.current) {
      hasCalledCallback.current = false;
      lastWeight.current = weight;
    }

    if (!weight || weight <= 0) {
      setDisplayValue(0);
      return;
    }

    // Se immediate for true, atualiza imediatamente sem animação
    if (immediate) {
      setDisplayValue(weight);
      if (onAnimationComplete && !hasCalledCallback.current) {
        hasCalledCallback.current = true;
        onAnimationComplete();
      }
      return;
    }

    const startTime = Date.now();
    const duration = 1500;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function para suavizar a animação
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = weight * easeOutCubic;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(weight);
        // Chamar callback quando a animação terminar (apenas uma vez)
        if (onAnimationComplete && !hasCalledCallback.current) {
          hasCalledCallback.current = true;
          onAnimationComplete();
        }
      }
    };

    requestAnimationFrame(animate);
  }, [weight, immediate, onAnimationComplete]);

  if (!weight || weight <= 0) {
    return <span>--</span>;
  }

  return <span>{displayValue.toFixed(1)}</span>;
}

// Componente para o link de encaminhamento
function LinkEncaminhamentoComponent({ emailIndicador, nomeIndicador }: { emailIndicador: string; nomeIndicador: string }) {
  const [copiado, setCopiado] = useState(false);
  const linkIndicacao = typeof window !== 'undefined' 
    ? `${window.location.origin}/meta?ref=${encodeURIComponent(emailIndicador)}`
    : '';
  
  const copiarLink = async () => {
    if (!linkIndicacao) return;
    try {
      await navigator.clipboard.writeText(linkIndicacao);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      alert('Erro ao copiar link. Tente selecionar e copiar manualmente.');
    }
  };
  
  return (
    <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Compartilhe seu link de encaminhamento</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Compartilhe este link com seus amigos e familiares. Quando eles se cadastrarem usando seu link e escolherem um médico, o encaminhamento será criado automaticamente.
          </p>
          
          {/* Link gerado */}
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 flex items-center gap-2">
              <input
                type="text"
                value={linkIndicacao}
                readOnly
                className="flex-1 text-sm text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none"
              />
              <button
                onClick={copiarLink}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiado ? (
                  <>
                    <CheckCircle size={16} />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-600">
              💡 Dica: Compartilhe este link via WhatsApp, email ou redes sociais. Quando alguém se cadastrar usando seu link e escolher um médico, o encaminhamento será criado automaticamente!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Card Bio Impedância - padrão Exames: seções, Detalhes (oculta valores), Novo Registro em metanutri
function BioImpedanciaCard({ 
  expanded, 
  onToggle, 
  paciente,
  isMobile = false,
}: { 
  expanded: boolean; 
  onToggle: () => void; 
  paciente: PacienteCompleto | null;
  isMobile?: boolean;
}) {
  const registros = paciente?.bioimpedanciaRegistros || [];
  const registrosSorted = useMemo(
    () =>
      [...registros].sort(
        (a, b) => parseBioDataRegistro(b.dataRegistro).getTime() - parseBioDataRegistro(a.dataRegistro).getTime()
      ),
    [registros]
  );
  const ultimo = registrosSorted[0];
  const registroAnteriorBio = ultimo ? findRegistroAnteriorCronologico(registrosSorted, ultimo) : null;
  const pgc = ultimo?.analiseObesidade?.percentualGordura;
  const pgcTrend = ultimo ? bioFieldTrend(registroAnteriorBio, ultimo, (r) => r.analiseObesidade?.percentualGordura) : 'none';
  const sexoBiologico = paciente?.dadosIdentificacao?.sexoBiologico ?? (paciente as any)?.dadosidentificacao?.sexobiologico;
  const imagemSrc = sexoBiologico === 'F' ? '/bioimpedancia/mulher-frente.png' : '/bioimpedancia/homem-frente.png';
  const imageAlt = sexoBiologico === 'F' ? 'Body map feminino' : 'Body map masculino';

  return (
    <div className="border border-gray-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-md shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200/90 border-b border-gray-200/80 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1">
          <Scale className="h-4 w-4 text-teal-600 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900">Bio Impedância</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-black flex items-center gap-1 tabular-nums">
            {ultimo && pgc != null ? (
              <>
                <BioImpedanciaTrendGlyph dir={pgcTrend} />
                {formatBioMetricDisplay(pgc, '%')}
              </>
            ) : (
              'Ver detalhes'
            )}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-black flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-black flex-shrink-0" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200/50">
          <BioImpedanciaDisplay
            paciente={paciente}
            registros={registrosSorted}
            imagemSrc={imagemSrc}
            imageAlt={imageAlt}
            isMobile={isMobile}
          />
        </div>
      )}
    </div>
  );
}

function MetaPageContent() {
  const { labOrderBySection: labOrderBySecaoConfig, labLimitOverrides } = useLabOrderBySection();
  const searchParams = useSearchParams();
  const layoutParam = searchParams.get('layout');
  const [activeMenu, setActiveMenu] = useState('estatisticas');
  const [pacienteIdFromQuery, setPacienteIdFromQuery] = useState<string | null>(null);
  const [isNutricionistaMode, setIsNutricionistaMode] = useState(false);
  const [preferenciaLayout, setPreferenciaLayout] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const profileButtonMobileRef = useRef<HTMLButtonElement>(null);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locais, setLocais] = useState<Local[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [userEscalas, setUserEscalas] = useState<Escala[]>([]);
  const [todasEscalas, setTodasEscalas] = useState<Escala[]>([]);
  const [filtroTempo, setFiltroTempo] = useState<'ano' | 'mes' | 'semana'>('semana');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  /** Evita duplicar o menu de perfil: sidebar desktop (lg+) usa dropdown local; portal só abaixo de lg */
  const [isLgViewport, setIsLgViewport] = useState(false);
  
  // Estados para controle do arraste do marcador de IMC
  const [isDraggingIMC, setIsDraggingIMC] = useState(false);
  const [pesoTemporarioIMC, setPesoTemporarioIMC] = useState<number | null>(null);
  const [imcTemporarioIMC, setImcTemporarioIMC] = useState<number | null>(null);
  const barraIMCRef = useRef<HTMLDivElement>(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const [weightAnimationComplete, setWeightAnimationComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('segunda');
  const [showOnlyMyEscalas, setShowOnlyMyEscalas] = useState(true);
  const [expandedEscalas, setExpandedEscalas] = useState<Set<string>>(new Set());
  
  // Estados para mensagens
  const [mensagens, setMensagens] = useState<MensagemResidente[]>([]);
  const [mensagensEnviadas, setMensagensEnviadas] = useState<MensagemResidenteParaAdmin[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [loadingMensagensEnviadas, setLoadingMensagensEnviadas] = useState(false);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [showMensagensModal, setShowMensagensModal] = useState(false);
  const [showEnviarMensagemModal, setShowEnviarMensagemModal] = useState(false);
  const [activeTabMensagens, setActiveTabMensagens] = useState<'recebidas' | 'enviadas'>('recebidas');
  const [novaMensagemAdmin, setNovaMensagemAdmin] = useState({
    titulo: '',
    mensagem: '',
    anonima: false
  });
  
  // Estados para trocas
  const [servicoSelecionado, setServicoSelecionado] = useState('');
  const [residenteSelecionado, setResidenteSelecionado] = useState('');
  const [motivoTroca, setMotivoTroca] = useState('');
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<Troca[]>([]);
  const [minhasTrocas, setMinhasTrocas] = useState<Troca[]>([]);
  const [isLoadingTroca, setIsLoadingTroca] = useState(false);
  const [loadingTrocas, setLoadingTrocas] = useState(false);
  
  // Estados para férias
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [loadingFerias, setLoadingFerias] = useState(false);
  const [novaFerias, setNovaFerias] = useState({
    dataInicio: '',
    dataFim: '',
    motivo: ''
  });
  const [showSolicitarFeriasModal, setShowSolicitarFeriasModal] = useState(false);
  const [showEditarFeriasModal, setShowEditarFeriasModal] = useState(false);
  const [feriasEditando, setFeriasEditando] = useState<Ferias | null>(null);
  const [editarFerias, setEditarFerias] = useState({
    dataInicio: '',
    dataFim: '',
    motivo: ''
  });
  const [isSubmittingFerias, setIsSubmittingFerias] = useState(false);
  const [expandedFeriasCards, setExpandedFeriasCards] = useState<Set<string>>(new Set());

  // Estados para paciente
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null);
  const [metaPacienteLoadTick, setMetaPacienteLoadTick] = useState(0);
  const [loadingPaciente, setLoadingPaciente] = useState(false);
  const [mensagensPaciente, setMensagensPaciente] = useState<PacienteMensagem[]>([]);
  const [loadingMensagensPaciente, setLoadingMensagensPaciente] = useState(false);
  const [mensagensNaoLidasPaciente, setMensagensNaoLidasPaciente] = useState(0);
  const [showMensagensMedicoModal, setShowMensagensMedicoModal] = useState(false); // Novo modal de mensagens médico-paciente
  const [abaAtivaMensagens, setAbaAtivaMensagens] = useState<'recebidas' | 'enviadas'>('recebidas'); // Aba ativa no modal de mensagens
  const [showEnviarMensagemMedicoModal, setShowEnviarMensagemMedicoModal] = useState(false); // Modal para enviar nova mensagem ao médico
  const [showRecomendacoesModal, setShowRecomendacoesModal] = useState(false);
  const [slideRecomendacoes, setSlideRecomendacoes] = useState(0);
  const [recomendacoesLidas, setRecomendacoesLidas] = useState(false);
  const [mensagensEnviadasPaciente, setMensagensEnviadasPaciente] = useState<PacienteMensagem[]>([]); // Mensagens enviadas pelo paciente
  const [novaMensagemMedico, setNovaMensagemMedico] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'clinico' as 'clinico' | 'alerta' | 'orientacao' | 'revisao'
  });
  
  // Estados para médico responsável
  const [medicoResponsavel, setMedicoResponsavel] = useState<Medico | null>(null);
  
  // Estados para nutricionista vinculado
  const [nutricionistaVinculado, setNutricionistaVinculado] = useState<{
    id: string;
    nome: string;
    isVerificado?: boolean;
  } | null>(null);
  
  // Estados para personal trainer vinculado
  const [personalVinculado, setPersonalVinculado] = useState<{
    id: string;
    nome: string;
    isVerificado?: boolean;
  } | null>(null);
  
  // Estados para classificação de profissionais (1-5 estrelas)
  const [classificacaoMedico, setClassificacaoMedico] = useState<number | null>(null);
  const [classificacaoNutri, setClassificacaoNutri] = useState<number | null>(null);
  const [classificacaoPersonal, setClassificacaoPersonal] = useState<number | null>(null);
  const [showModalClassificacao, setShowModalClassificacao] = useState(false);
  const [profissionalParaClassificar, setProfissionalParaClassificar] = useState<{
    tipo: ProfissionalTipo;
    id: string;
    nome: string;
  } | null>(null);
  const [votoTemporario, setVotoTemporario] = useState<number>(0);
  const [salvandoClassificacao, setSalvandoClassificacao] = useState(false);
  const [agregadoNoModal, setAgregadoNoModal] = useState<{ count: number; media: number } | null>(null);
  const [agregadoMedico, setAgregadoMedico] = useState<{ count: number; media: number } | null>(null);
  const [agregadoNutri, setAgregadoNutri] = useState<{ count: number; media: number } | null>(null);
  const [agregadoPersonal, setAgregadoPersonal] = useState<{ count: number; media: number } | null>(null);
  const [agregadosMedicosBusca, setAgregadosMedicosBusca] = useState<Record<string, { count: number; media: number }>>({});
  /** Depoimento da conclusão — modal somente leitura (paciente), mesmo padrão visual do metaadmin */
  const [showDepoimentoLeituraModal, setShowDepoimentoLeituraModal] = useState(false);
  const [estrelasDepoimentoLeitura, setEstrelasDepoimentoLeitura] = useState<number | null>(null);
  /** Chave `dataISO-semana` enquanto busca o link público de preenchimento da aplicação */
  const [preencherAplicacaoLoadingKey, setPreencherAplicacaoLoadingKey] = useState<string | null>(null);

  /** Metas de peso / circunferência (mesmo bloco do metaadmin) — modal no card de peso da Home */
  const [showModalMetasTratamento, setShowModalMetasTratamento] = useState(false);
  const [salvandoMetasTratamento, setSalvandoMetasTratamento] = useState(false);
  const dataAplicacaoFocoMetasModalRef = useRef<{ semana: number; valor: string } | null>(null);

  /** % meta atingida (peso / circ.) no card da Home — alinhado ao cálculo do modal Metas */
  const pctMetasCardPesoHome = useMemo(() => {
    if (!paciente) {
      return {
        pctPeso: null as number | null,
        pctCint: null as number | null,
        onPeso: false,
        onCint: false,
        imcMetaAlvo: null as number | null,
      };
    }
    const p = paciente;
    const mi = p.dadosClinicos?.medidasIniciais;
    const peso0 = mi?.peso;
    const cint0 = mi?.circunferenciaAbdominal;
    const m = p.planoTerapeutico?.metas;
    const pctMin = 5;
    const pctMax = 45;
    const kgMin =
      peso0 != null && peso0 > 0 ? roundMetaHalfStep((peso0 * pctMin) / 100) : 0;
    const kgMax =
      peso0 != null && peso0 > 0 ? roundMetaHalfStep((peso0 * pctMax) / 100) : 0;
    let kgPerda: number | null = null;
    if (peso0 != null && peso0 > 0) {
      let kgRaw: number;
      if (
        m?.weightLossTargetType === 'PESO_ABSOLUTO' &&
        m.weightLossTargetValue != null &&
        m.weightLossTargetValue > 0
      ) {
        kgRaw = m.weightLossTargetValue;
      } else if (
        m?.weightLossTargetType === 'PERCENTUAL' &&
        m.weightLossTargetValue != null &&
        m.weightLossTargetValue > 0
      ) {
        kgRaw = (peso0 * m.weightLossTargetValue) / 100;
      } else {
        kgRaw = (peso0 * 12) / 100;
      }
      kgPerda = roundMetaHalfStep(Math.min(kgMax, Math.max(kgMin, kgRaw)));
    }
    const maxWaistLossRaw =
      cint0 != null && cint0 > 60
        ? Math.min(40, Math.round((cint0 - 55) * 10) / 10)
        : cint0 != null && cint0 > 0
          ? Math.min(30, Math.round(cint0 * 0.25 * 10) / 10)
          : 25;
    const maxWaistLoss = roundMetaHalfStep(maxWaistLossRaw);
    let waistLossCm =
      typeof m?.waistReductionTargetCm === 'number' && !Number.isNaN(m.waistReductionTargetCm)
        ? m.waistReductionTargetCm
        : 8;
    waistLossCm = roundMetaHalfStep(Math.min(maxWaistLoss, Math.max(0, waistLossCm)));

    const evolucao = p.evolucaoSeguimento || [];
    const seguimentoOrdem = [...evolucao].sort(
      (a, b) => (a.weekIndex ?? 0) - (b.weekIndex ?? 0)
    );
    const primeiroRegistro = seguimentoOrdem.find((e) => e.weekIndex === 1);
    const baselinePeso =
      primeiroRegistro?.peso != null && primeiroRegistro.peso > 0
        ? primeiroRegistro.peso
        : peso0 != null && peso0 > 0
          ? peso0
          : null;
    const ultimoComPeso = [...seguimentoOrdem]
      .reverse()
      .find((r) => r.peso != null && r.peso > 0);
    const pesoAtualVal = ultimoComPeso?.peso ?? null;
    const kgPerdido =
      baselinePeso != null && pesoAtualVal != null
        ? Math.round((baselinePeso - pesoAtualVal) * 10) / 10
        : null;
    const pctMetaPeso =
      kgPerda != null && kgPerda > 0
        ? kgPerdido == null
          ? null
          : Math.round((Math.max(0, kgPerdido) / kgPerda) * 1000) / 10
        : null;

    const baselineCint = cint0 != null && cint0 > 0 ? cint0 : null;
    const ultimoComp = [...seguimentoOrdem]
      .reverse()
      .find(
        (r) =>
          r.circunferenciaAbdominal != null && r.circunferenciaAbdominal > 0
      );
    const circAtualVal = ultimoComp?.circunferenciaAbdominal ?? null;
    const cmReduzido =
      baselineCint != null && circAtualVal != null
        ? Math.round((baselineCint - circAtualVal) * 10) / 10
        : null;
    const pctMetaCint =
      waistLossCm > 0
        ? cmReduzido == null
          ? null
          : Math.round((Math.max(0, cmReduzido) / waistLossCm) * 1000) / 10
        : null;

    const onPeso = resolveMetaPerdaPesoAtiva(m);
    const pesoMetaKg =
      peso0 != null && peso0 > 0 && kgPerda != null && kgPerda > 0
        ? Math.round((peso0 - kgPerda) * 10) / 10
        : null;
    const alturaRaw = mi?.altura;
    const alturaMetrosMeta =
      alturaRaw != null && Number(alturaRaw) > 0
        ? Number(alturaRaw) / 100
        : null;
    const imcMetaAlvo =
      onPeso &&
      pesoMetaKg != null &&
      pesoMetaKg > 0 &&
      alturaMetrosMeta != null &&
      alturaMetrosMeta > 0
        ? pesoMetaKg / (alturaMetrosMeta * alturaMetrosMeta)
        : null;

    const temCint0 = cint0 != null && cint0 > 0;
    return {
      pctPeso: pctMetaPeso,
      pctCint: pctMetaCint,
      onPeso,
      onCint: resolveMetaReducaoCinturaAtiva(m, temCint0),
      imcMetaAlvo,
    };
  }, [paciente]);

  /** Vídeo de aplicação (mesmo endpoint que /aplicacao/[token]) — modal na aba Aplicações */
  const [showModalVideoAplicacaoMeta, setShowModalVideoAplicacaoMeta] = useState(false);
  const [modalVideoAplicacaoMetaPlayer, setModalVideoAplicacaoMetaPlayer] = useState(false);
  const [videoSignedUrlAplicacaoMeta, setVideoSignedUrlAplicacaoMeta] = useState<string | null>(null);
  const [videoUrlLoadingAplicacaoMeta, setVideoUrlLoadingAplicacaoMeta] = useState(false);
  const videoAplicacaoMetaBusyRef = useRef(false);

  const abrirVideoAplicacaoPacienteMeta = useCallback(async () => {
    if (videoAplicacaoMetaBusyRef.current) return;
    videoAplicacaoMetaBusyRef.current = true;
    setVideoUrlLoadingAplicacaoMeta(true);
    try {
      const res = await fetch('/api/aplicacao/video-signed-url');
      const json = await res.json();
      if (res.ok && json.signedUrl) {
        setVideoSignedUrlAplicacaoMeta(json.signedUrl);
        setShowModalVideoAplicacaoMeta(true);
        setModalVideoAplicacaoMetaPlayer(true);
      }
    } finally {
      videoAplicacaoMetaBusyRef.current = false;
      setVideoUrlLoadingAplicacaoMeta(false);
    }
  }, []);

  const fecharModalVideoAplicacaoMeta = useCallback(() => {
    setShowModalVideoAplicacaoMeta(false);
    setModalVideoAplicacaoMetaPlayer(false);
    setVideoSignedUrlAplicacaoMeta(null);
  }, []);

  // Modal de dados do paciente — um único modal (padrão Meu Perfil); Home/Exames/etc. são atalhos para abri-lo
  const [showModalDadosPaciente, setShowModalDadosPaciente] = useState(false);
  const [salvandoDadosPaciente, setSalvandoDadosPaciente] = useState(false);
  const [modalDadosPacienteFoiFechado, setModalDadosPacienteFoiFechado] = useState(false); // se fechar, não reabre até o próximo refresh (não persiste)
  const modalDadosPacienteFoiFechadoRef = useRef(false); // ref para ler no callback de loadPaciente
  const modalDadosAberturaTentadaRef = useRef(false); // evita abrir o chat mais de uma vez por carga
  const [passoModalDadosPaciente, setPassoModalDadosPaciente] = useState(0); // usado ao abrir para reset

  // Um único modal (questionário em chat). Atalhos (Home, Exames, etc.) chamam isto; se não houver paciente, cria mínimo antes de abrir.
  const openModalDadosPaciente = useCallback(() => {
    if (!paciente && user?.uid && user?.email) {
      const minimal = {
        id: '',
        userId: user.uid,
        email: user.email,
        nome: user.displayName || user.email || '',
        medicoResponsavelId: null as string | null,
        dadosIdentificacao: {
          nomeCompleto: user.displayName || user.email || '',
          email: user.email,
          dataCadastro: new Date(),
          endereco: {},
        },
        dadosClinicos: { comorbidades: {} },
        estiloVida: {} as any,
        examesLaboratoriais: [],
        planoTerapeutico: {} as any,
        evolucaoSeguimento: [],
        alertas: [],
        comunicacao: {} as any,
        indicadores: {} as any,
        dataCadastro: new Date(),
        status: 'ativo' as const,
        statusTratamento: 'pendente' as const,
      } as PacienteCompleto;
      setPaciente(minimal);
    }
    setPassoModalDadosPaciente(0);
    setShowModalDadosPaciente(true);
  }, [paciente, user]);

  // Estados para referral de nutricionista
  const [referralInfo, setReferralInfo] = useState<{
    tipo: 'nutricionista';
    nutricionistaId: string;
    medicoId: string;
    nutricionistaNome?: string;
    medicoNome?: string;
  } | null>(null);
  const [medicoRecomendadoId, setMedicoRecomendadoId] = useState<string | null>(null);
  
  // Estados para exames
  const [exameDataSelecionada, setExameDataSelecionada] = useState('');
  const [showSeletorFlutuanteExames, setShowSeletorFlutuanteExames] = useState(false);
  // Estados para ChatNutri (seletor de datas)
  const [chatNutriDataSelecionada, setChatNutriDataSelecionada] = useState('');
  const [secoesExpandidas, setSecoesExpandidas] = useState<Set<string>>(new Set());
  const [examesExpandidos, setExamesExpandidos] = useState<Set<string>>(new Set());
  const [estatisticasExpandidas, setEstatisticasExpandidas] = useState<Set<string>>(new Set());
  
  // Estados para banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);
  
  // Estados para Add to Home Screen (PWA)
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [canShowInstall, setCanShowInstall] = useState(false);
  
  // Estados para busca de médicos
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [estadoBuscaMedico, setEstadoBuscaMedico] = useState<string>('');
  const [cidadeBuscaMedico, setCidadeBuscaMedico] = useState<string>('');
  const [showModalMedico, setShowModalMedico] = useState(false);
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null);
  const [telefonePaciente, setTelefonePaciente] = useState<string>('');
  const [pesoPacienteModal, setPesoPacienteModal] = useState<string>('');
  const [alturaPacienteModal, setAlturaPacienteModal] = useState<string>('');
  const [loadingSolicitacaoMedico, setLoadingSolicitacaoMedico] = useState(false);
  // Estados para barra IMC interativa no modal Solicitar Médico
  const [isDraggingIMCModal, setIsDraggingIMCModal] = useState(false);
  const [pesoTemporarioIMCModal, setPesoTemporarioIMCModal] = useState<number | null>(null);
  const [imcTemporarioIMCModal, setImcTemporarioIMCModal] = useState<number | null>(null);
  const barraIMCRefModal = useRef<HTMLDivElement | null>(null);
  const [showConfirmacaoSolicitarMedico, setShowConfirmacaoSolicitarMedico] = useState(false);
  const [showModalSolicitacaoEnviada, setShowModalSolicitacaoEnviada] = useState(false);

  // Event listeners para arrastar o marcador de IMC no modal Solicitar Médico (mouse)
  useEffect(() => {
    if (!isDraggingIMCModal || !showModalMedico) return;
    const alturaCm = alturaInputParaCm(alturaPacienteModal);
    const alturaMetros = alturaCm ? alturaCm / 100 : null;
    if (!alturaMetros) return;

    const handleMouseMove = (e: MouseEvent) => {
      const barraRef = barraIMCRefModal.current;
      if (!barraRef) return;
      const rect = barraRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));

      const percentualParaIMC = (percent: number): number => {
        const p = Math.max(0, Math.min(100, percent));
        if (p <= 25) return (p / 25) * 18.5;
        if (p <= 50) return 18.5 + ((p - 25) / 25) * (25 - 18.5);
        if (p <= 75) return 25 + ((p - 50) / 25) * (30 - 25);
        return 30 + ((p - 75) / 25) * 20;
      };
      const imcParaPeso = (imc: number) => imc * (alturaMetros * alturaMetros);

      const novoIMC = percentualParaIMC(percentual);
      setImcTemporarioIMCModal(novoIMC);
      setPesoTemporarioIMCModal(imcParaPeso(novoIMC));
    };

    const handleMouseUp = () => {
      setIsDraggingIMCModal(false);
      setPesoTemporarioIMCModal(null);
      setImcTemporarioIMCModal(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingIMCModal, showModalMedico, alturaPacienteModal]);

  // Event listeners para arrastar o marcador de IMC no modal Solicitar Médico (touch)
  useEffect(() => {
    if (!isDraggingIMCModal || !showModalMedico) return;
    const alturaCm = alturaInputParaCm(alturaPacienteModal);
    const alturaMetros = alturaCm ? alturaCm / 100 : null;
    if (!alturaMetros) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const barraRef = barraIMCRefModal.current;
      if (!barraRef) return;
      const rect = barraRef.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));

      const percentualParaIMC = (percent: number): number => {
        const p = Math.max(0, Math.min(100, percent));
        if (p <= 25) return (p / 25) * 18.5;
        if (p <= 50) return 18.5 + ((p - 25) / 25) * (25 - 18.5);
        if (p <= 75) return 25 + ((p - 50) / 25) * (30 - 25);
        return 30 + ((p - 75) / 25) * 20;
      };
      const imcParaPeso = (imc: number) => imc * (alturaMetros * alturaMetros);

      const novoIMC = percentualParaIMC(percentual);
      setImcTemporarioIMCModal(novoIMC);
      setPesoTemporarioIMCModal(imcParaPeso(novoIMC));
    };

    const handleTouchEnd = () => {
      setIsDraggingIMCModal(false);
      setPesoTemporarioIMCModal(null);
      setImcTemporarioIMCModal(null);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingIMCModal, showModalMedico, alturaPacienteModal]);
  
  // Estados para Google Calendar
  const [googleCalendarAutorizado, setGoogleCalendarAutorizado] = useState(false);
  const [loadingGoogleCalendar, setLoadingGoogleCalendar] = useState(false);
  const [sincronizandoCalendar, setSincronizandoCalendar] = useState(false);
  const [mensagemCalendar, setMensagemCalendar] = useState<string>('');
  const [tipoMensagemCalendar, setTipoMensagemCalendar] = useState<'success' | 'error' | ''>('');

  // Estados para calendário de aplicações
  const [mesCalendario, setMesCalendario] = useState<Date>(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [aplicacoesDiaSelecionado, setAplicacoesDiaSelecionado] = useState<any[]>([]);
  // Estados para pagamentos (aplicações)
  const [pagamentoPaciente, setPagamentoPaciente] = useState<PagamentoPaciente | null>(null);
  const [loadingPagamento, setLoadingPagamento] = useState(false);
  const [showModalPagamentos, setShowModalPagamentos] = useState(false);

  // Função para formatar nome do médico (2 primeiros + último)
  const formatarNomeMedico = (nome: string): string => {
    const partes = nome.trim().split(/\s+/);
    if (partes.length <= 3) {
      return nome; // Se tem 3 ou menos partes, retorna o nome completo
    }
    // Pega os 2 primeiros e o último
    return `${partes[0]} ${partes[1]} ${partes[partes.length - 1]}`;
  };
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<SolicitacaoMedico[]>([]);
  const [loadingMinhasSolicitacoes, setLoadingMinhasSolicitacoes] = useState(false);
  const SHOW_BUSCAR_MEDICOS_TAB = false; // ocultar aba "Buscar Médico" (sem apagar o código)
  const [abaAtivaMedicos, setAbaAtivaMedicos] = useState<'buscar' | 'solicitacoes' | 'meu-medico'>(
    SHOW_BUSCAR_MEDICOS_TAB ? 'buscar' : 'solicitacoes'
  );

  useEffect(() => {
    if (!SHOW_BUSCAR_MEDICOS_TAB && abaAtivaMedicos === 'buscar') {
      setAbaAtivaMedicos('solicitacoes');
    }
  }, [SHOW_BUSCAR_MEDICOS_TAB, abaAtivaMedicos]);

  // Sem médico e sem solicitação em aberto (pendente/aceita) = precisa procurar médico. Definido aqui para usar minhasSolicitacoes já declarado.
  const hasSolicitacaoAberta = minhasSolicitacoes.some(s => s.status === 'pendente' || s.status === 'aceita');
  const semMedicoNemSolicitacao = !paciente?.medicoResponsavelId && !hasSolicitacaoAberta;
  const [showModalDesistir, setShowModalDesistir] = useState(false);
  const [solicitacaoParaDesistir, setSolicitacaoParaDesistir] = useState<SolicitacaoMedico | null>(null);
  const [motivoDesistencia, setMotivoDesistencia] = useState('');
  const [showModalAbandono, setShowModalAbandono] = useState(false);
  const [motivoAbandono, setMotivoAbandono] = useState('');
  const [medicosExpandidos, setMedicosExpandidos] = useState<Set<string>>(new Set());
  const [cidadesCustomizadas, setCidadesCustomizadas] = useState<{ estado: string; cidade: string }[]>([]);
  const [todosMedicosDisponiveis, setTodosMedicosDisponiveis] = useState<Medico[]>([]);
  const [estadosDisponiveis, setEstadosDisponiveis] = useState<string[]>([]);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<{ estado: string; cidade: string }[]>([]);
  
  // Estados para Encaminhamento
  const [activeTabIndicar, setActiveTabIndicar] = useState<'indicar' | 'minhas'>('indicar');
  const [encaminhamentosViaMeuLink, setEncaminhamentosViaMeuLink] = useState<SolicitacaoMedico[]>([]);
  const [loadingEncaminhamentosViaMeuLink, setLoadingEncaminhamentosViaMeuLink] = useState(false);
  const [showModalEvolucao, setShowModalEvolucao] = useState(false);
  const [pendingAcaoEvolucao, setPendingAcaoEvolucao] = useState<'copiar' | 'whatsapp' | null>(null);
  const [linkPathParaEvolucao, setLinkPathParaEvolucao] = useState<string>('');
  const [medicoNomeParaEvolucao, setMedicoNomeParaEvolucao] = useState<string>('');
  const [medicoGeneroParaEvolucao, setMedicoGeneroParaEvolucao] = useState<'M' | 'F'>('M');
  
  // Estados para NPS
  const [showNPSModal, setShowNPSModal] = useState(false);
  const [npsJaRespondido, setNpsJaRespondido] = useState(false);
  const [mostrarNotificacaoNPS, setMostrarNotificacaoNPS] = useState(false);
  const [indicacaoForm, setIndicacaoForm] = useState({
    estado: '',
    cidade: '',
    medicoId: '',
    nomePaciente: '',
    telefonePaciente: ''
  });
  const [salvandoIndicacao, setSalvandoIndicacao] = useState(false);
  const [minhasIndicacoes, setMinhasIndicacoes] = useState<Indicacao[]>([]);
  const [loadingIndicacoes, setLoadingIndicacoes] = useState(false);
  const loadingIndicacoesRef = useRef(false);
  const [indicacoesExpandidas, setIndicacoesExpandidas] = useState<Set<string>>(new Set());
  const [medicosIndicacoes, setMedicosIndicacoes] = useState<Record<string, Medico>>({});
  
  // Estado para armazenar o email do indicador (quando paciente acessa via link)
  const [emailIndicadorRef, setEmailIndicadorRef] = useState<string | null>(null);
  
  // Estados para dados do Nutri
  const [planoNutricional, setPlanoNutricional] = useState<any>(null);
  const [loadingPlanoNutricional, setLoadingPlanoNutricional] = useState(false);
  
  // Função para carregar plano nutricional
  const loadPlanoNutricional = useCallback(async () => {
    if (!paciente?.id) return;
    
    try {
      setLoadingPlanoNutricional(true);
      const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
      const planoSnap = await getDoc(planoRef);
      
      if (planoSnap.exists()) {
        const planoData = planoSnap.data();
        setPlanoNutricional(planoData);
      } else {
        setPlanoNutricional(null);
      }
    } catch (error) {
      console.error('Erro ao carregar plano nutricional:', error);
      setPlanoNutricional(null);
    } finally {
      setLoadingPlanoNutricional(false);
    }
  }, [paciente?.id]);
  
  // Carregar plano nutricional quando entrar no perfil
  useEffect(() => {
    if (activeMenu === 'perfil' && paciente?.id) {
      loadPlanoNutricional();
    }
  }, [activeMenu, paciente?.id, loadPlanoNutricional]);

  // Carregar cidades customizadas
  useEffect(() => {
    const loadCidadesCustomizadas = async () => {
      try {
        const customizadas = await CidadeCustomizadaService.getAllCidadesCustomizadas();
        setCidadesCustomizadas(
          customizadas.map(c => ({ estado: c.estado, cidade: c.cidade }))
        );
      } catch (error) {
        console.error('Erro ao carregar cidades customizadas:', error);
      }
    };
    loadCidadesCustomizadas();
  }, []);


  // Funções auxiliares para status das férias
  const getFeriasStatus = (dataInicio: Date, dataFim: Date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);
    
    if (hoje < inicio) {
      const diasRestantes = Math.ceil((inicio.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return { status: 'futura', diasRestantes, cor: 'blue' };
    } else if (hoje >= inicio && hoje <= fim) {
      return { status: 'ativa', cor: 'green' };
    } else {
      return { status: 'finalizada', cor: 'gray' };
    }
  };

  // Função auxiliar para obter escalas da semana atual
  const getEscalasSemanaAtual = () => {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1); // Segunda-feira
    inicioSemana.setHours(0, 0, 0, 0);
    
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6); // Domingo
    fimSemana.setHours(23, 59, 59, 999);

    return userEscalas.filter(escala => {
      const dataInicio = new Date(escala.dataInicio);
      return dataInicio >= inicioSemana && dataInicio <= fimSemana;
    });
  };


  // Função para abrir modal de edição de férias
  const handleEditarFerias = (feriasItem: Ferias) => {
    setFeriasEditando(feriasItem);
    setEditarFerias({
      dataInicio: feriasItem.dataInicio.toISOString().split('T')[0],
      dataFim: feriasItem.dataFim.toISOString().split('T')[0],
      motivo: feriasItem.motivo || ''
    });
    setShowEditarFeriasModal(true);
  };

  // Função para controlar expand/collapse dos cards de férias
  const toggleFeriasCard = (feriasId: string) => {
    setExpandedFeriasCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feriasId)) {
        newSet.delete(feriasId);
      } else {
        newSet.add(feriasId);
      }
      return newSet;
    });
  };
  
  const router = useRouter();

  // Funções para controlar expand/collapse das escalas
  const toggleEscala = (escalaId: string) => {
    setExpandedEscalas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(escalaId)) {
        newSet.delete(escalaId);
      } else {
        newSet.add(escalaId);
      }
      return newSet;
    });
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔍 Carregando dados para usuário:', user.email);
      
      const [escalasData, locaisData, servicosData, residentesData] = await Promise.all([
        UserService.getAllEscalas(),
        UserService.getAllLocais(),
        UserService.getAllServicos(),
        UserService.getAllResidentes()
      ]);
      
      console.log('📊 Escalas carregadas:', escalasData.length);
      console.log('👥 Locais carregados:', locaisData.length);
      console.log('🔧 Serviços carregados:', servicosData.length);
      
      setLocais(locaisData);
      setServicos(servicosData);
      setResidentes(residentesData);
      setTodasEscalas(escalasData);
      
      // Filtrar escalas onde o usuário está presente (por email)
      const escalasDoUsuario = escalasData.filter(escala => {
        const temUsuario = Object.values(escala.dias).some(dia => {
          if (Array.isArray(dia)) {
            return dia.some(servico => {
              const temEmail = servico.residentes.includes(user.email || '');
              console.log('🔍 Verificando serviço:', {
                servicoId: servico.servicoId,
                residentes: servico.residentes,
                userEmail: user.email,
                temEmail
              });
              return temEmail;
            });
          }
          return false;
        });
        console.log('📅 Escala tem usuário?', temUsuario, 'Escala ID:', escala.id);
        return temUsuario;
      });
      
      console.log('✅ Escalas do usuário encontradas:', escalasDoUsuario.length);
      setUserEscalas(escalasDoUsuario);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    }
  }, [user]);

  // Garantir que o tema sempre seja claro
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      // Sempre remover a classe 'dark' para garantir tema claro
      root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (!user) {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const ref = urlParams.get('ref');
          if (ref) {
            const emailIndicador = decodeURIComponent(ref);
            localStorage.setItem('indicacao_ref', emailIndicador);
          }
        }
        router.push('/');
        return;
      }
      
      // Verificar se é o usuário master
      if (user.email === 'ricpmota.med@gmail.com') {
        // Usuário master tem acesso a tudo
      } else {
        // Não fazer verificação de role, deixar acesso livre para pacientes
        // A página vai carregar dados do paciente se existir
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Função para carregar dados do paciente
  const loadPaciente = useCallback(async () => {
    const qPacienteId = searchParams.get('pacienteId');
    const byNutri = user?.uid && qPacienteId;
    const byEmail = user?.email && !qPacienteId;
    if (!byNutri && !byEmail) return;

    setLoadingPaciente(true);
    // Não resetar modalDadosAberturaTentadaRef aqui: cada loadPaciente() alterna loadingPaciente
    // e o efeito de auto-abertura do chat interpretava "nova carga" como permissão para abrir
    // de novo (ex.: após Salvar no modal de Metas), reabrindo o questionário indevidamente.
    try {
      let pacienteData: PacienteCompleto | null = null;

      if (byNutri && qPacienteId) {
        console.log('[meta] Modo nutricionista: carregando paciente por id:', qPacienteId);
        pacienteData = await PacienteService.getPacienteById(qPacienteId);
        if (!pacienteData) {
          const list = await PacienteNutricionistaService.listPacientesVisiveisByNutri(user!.uid);
          const found = list.find(
            (p) => p.pacienteId === qPacienteId || p.paciente?.id === qPacienteId || p.paciente?.userId === qPacienteId
          );
          if (found) pacienteData = found.paciente;
        }
        console.log('[meta] Paciente encontrado (modo nutri):', pacienteData ? pacienteData.nome : 'nenhum');
      } else {
        console.log('Carregando paciente para email:', user!.email);
        pacienteData = await PacienteService.getPacienteByEmail(user!.email!);
        console.log('Paciente encontrado:', pacienteData ? pacienteData.nome : 'nenhum');
      }

      console.log('Status do tratamento:', pacienteData?.statusTratamento);
      setPaciente(pacienteData);
      // Carregar preferência de layout
      const preferencia = (pacienteData as any)?.preferenciaLayout;
      if (preferencia) {
        setPreferenciaLayout(preferencia);
      } else if (layoutParam) {
        setPreferenciaLayout(layoutParam);
      }
      
      // Carregar dados do médico responsável
      if (pacienteData && pacienteData.medicoResponsavelId) {
        try {
          const medicoData = await MedicoService.getMedicoById(pacienteData.medicoResponsavelId);
          setMedicoResponsavel(medicoData);
          console.log('Médico responsável carregado:', medicoData ? medicoData.nome : 'nenhum');
        } catch (error) {
          console.error('Erro ao carregar médico:', error);
          setMedicoResponsavel(null);
        }
      } else {
        console.log('Paciente não tem médico responsável vinculado');
        setMedicoResponsavel(null);
      }
      
      // Carregar nutricionista e personal vinculados ao paciente (e limpar quando não há paciente)
      if (!pacienteData) {
        setNutricionistaVinculado(null);
        setPersonalVinculado(null);
      } else {
        try {
          const { COL_PACIENTE_NUTRICIONISTA, COL_SOLICITACOES_NUTRICIONISTA, SOLICITACAO_STATUS } = await import('@/features/metaNutri/metaNutri.constants');
          const { NutricionistaService } = await import('@/services/nutricionistaService');
          
          // Buscar vínculo ativo na coleção paciente_nutricionista
          const vinculoQuery = query(
            collection(db, COL_PACIENTE_NUTRICIONISTA),
            where('pacienteId', '==', pacienteData.id),
            where('status', '==', 'ativo')
          );
          
          const vinculoSnapshot = await getDocs(vinculoQuery);
          
          if (!vinculoSnapshot.empty) {
            // Pegar o primeiro vínculo ativo
            const vinculoData = vinculoSnapshot.docs[0].data();
            const nutricionistaId = vinculoData.nutricionistaId;
            
            // Buscar dados do nutricionista
            const nutri = await NutricionistaService.getNutricionistaByUserId(nutricionistaId);
            
            if (nutri) {
              setNutricionistaVinculado({
                id: nutricionistaId,
                nome: nutri.nome,
                isVerificado: nutri.isVerificado,
              });
              console.log('Nutricionista vinculado carregado:', nutri.nome);
            } else {
              setNutricionistaVinculado(null);
            }
          } else {
            // Se não encontrar na coleção paciente_nutricionista, tentar buscar em solicitacoes_nutricionista com status aceita
            const solicitacaoQuery = query(
              collection(db, COL_SOLICITACOES_NUTRICIONISTA),
              where('pacienteId', '==', pacienteData.id),
              where('status', '==', SOLICITACAO_STATUS.ACEITA)
            );
            
            const solicitacaoSnapshot = await getDocs(solicitacaoQuery);
            
            if (!solicitacaoSnapshot.empty) {
              const solicitacaoData = solicitacaoSnapshot.docs[0].data();
              const nutricionistaId = solicitacaoData.nutricionistaId;
              const nutricionistaNome = solicitacaoData.nutricionistaNome;
              
              if (nutricionistaId && nutricionistaNome) {
                // Buscar dados completos do nutricionista para obter isVerificado
                try {
                  const nutri = await NutricionistaService.getNutricionistaByUserId(nutricionistaId);
                  setNutricionistaVinculado({
                    id: nutricionistaId,
                    nome: nutricionistaNome,
                    isVerificado: nutri?.isVerificado,
                  });
                } catch (error) {
                  // Se não conseguir buscar, usar apenas o nome da solicitação
                  setNutricionistaVinculado({
                    id: nutricionistaId,
                    nome: nutricionistaNome,
                    isVerificado: undefined,
                  });
                }
                console.log('Nutricionista vinculado carregado via solicitação:', nutricionistaNome);
              } else {
                setNutricionistaVinculado(null);
              }
            } else {
              setNutricionistaVinculado(null);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar nutricionista vinculado:', error);
          setNutricionistaVinculado(null);
        }
        // Carregar personal trainer vinculado ao paciente
        try {
          const { COL_PACIENTE_PERSONAL_TRAINER } = await import('@/features/metaPersonal/metaPersonal.constants');
          const { PersonalTrainerService } = await import('@/services/personalTrainerService');
          const vinculoPersonalQuery = query(
            collection(db, COL_PACIENTE_PERSONAL_TRAINER),
            where('pacienteId', '==', pacienteData.id),
            where('status', '==', 'ativo')
          );
          const vinculoPersonalSnapshot = await getDocs(vinculoPersonalQuery);
          if (!vinculoPersonalSnapshot.empty) {
            const vinculoData = vinculoPersonalSnapshot.docs[0].data();
            const personalTrainerId = vinculoData.personalTrainerId;
            const personal = await PersonalTrainerService.getPersonalTrainerByUserId(personalTrainerId);
            if (personal) {
              setPersonalVinculado({
                id: personalTrainerId,
                nome: personal.nome,
                isVerificado: personal.isVerificado,
              });
            } else {
              setPersonalVinculado(null);
            }
          } else {
            setPersonalVinculado(null);
          }
        } catch (error) {
          console.error('Erro ao carregar personal vinculado:', error);
          setPersonalVinculado(null);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar paciente:', error);
      setPaciente(null);
      setMedicoResponsavel(null);
      setNutricionistaVinculado(null);
      setPersonalVinculado(null);
    } finally {
      setLoadingPaciente(false);
      setMetaPacienteLoadTick((t) => t + 1);
    }
  }, [user?.email, user?.uid, layoutParam, searchParams]);

  // Carregar agregados de classificação dos médicos da busca (para cards)
  useEffect(() => {
    if (medicos.length === 0) {
      setAgregadosMedicosBusca({});
      return;
    }
    const load = async () => {
      const map: Record<string, { count: number; media: number }> = {};
      await Promise.all(medicos.map(async (m) => {
        const a = await ClassificacaoProfissionalService.getAgregado('medico', m.id);
        map[m.id] = a;
      }));
      setAgregadosMedicosBusca(map);
    };
    load();
  }, [medicos]);

  // Carregar classificações dos profissionais (1-5 estrelas) e agregados (para o modal abrir rápido)
  useEffect(() => {
    if (!paciente?.id) return;
    const load = async () => {
      const [estMedico, estNutri, estPersonal, aggMedico, aggNutri, aggPersonal] = await Promise.all([
        medicoResponsavel?.id
          ? ClassificacaoProfissionalService.getClassificacao(paciente.id, 'medico', medicoResponsavel.id)
          : Promise.resolve(null),
        nutricionistaVinculado?.id
          ? ClassificacaoProfissionalService.getClassificacao(paciente.id, 'nutricionista', nutricionistaVinculado.id)
          : Promise.resolve(null),
        personalVinculado?.id
          ? ClassificacaoProfissionalService.getClassificacao(paciente.id, 'personal', personalVinculado.id)
          : Promise.resolve(null),
        medicoResponsavel?.id
          ? ClassificacaoProfissionalService.getAgregado('medico', medicoResponsavel.id)
          : Promise.resolve(null),
        nutricionistaVinculado?.id
          ? ClassificacaoProfissionalService.getAgregado('nutricionista', nutricionistaVinculado.id)
          : Promise.resolve(null),
        personalVinculado?.id
          ? ClassificacaoProfissionalService.getAgregado('personal', personalVinculado.id)
          : Promise.resolve(null),
      ]);
      setClassificacaoMedico(estMedico ?? null);
      setClassificacaoNutri(estNutri ?? null);
      setClassificacaoPersonal(estPersonal ?? null);
      setAgregadoMedico(aggMedico ?? null);
      setAgregadoNutri(aggNutri ?? null);
      setAgregadoPersonal(aggPersonal ?? null);
    };
    load();
  }, [paciente?.id, medicoResponsavel?.id, nutricionistaVinculado?.id, personalVinculado?.id]);

  useEffect(() => {
    if (!showDepoimentoLeituraModal || !paciente?.id || !medicoResponsavel?.id) {
      setEstrelasDepoimentoLeitura(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/conclusao/classificacao-paciente?pacienteId=${encodeURIComponent(paciente.id)}&medicoId=${encodeURIComponent(medicoResponsavel.id)}`
        );
        const json = await res.json();
        if (!cancelled) {
          setEstrelasDepoimentoLeitura(typeof json.estrelas === 'number' ? json.estrelas : null);
        }
      } catch {
        if (!cancelled) setEstrelasDepoimentoLeitura(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDepoimentoLeituraModal, paciente?.id, medicoResponsavel?.id]);

  // Função para carregar mensagens do paciente
  const loadMensagensPacienteAtual = useCallback(async () => {
    if (!user?.email) return;
    
    setLoadingMensagensPaciente(true);
    try {
      console.log('📬 Carregando mensagens do paciente para:', user.email);
      const mensagensData = await PacienteMensagemService.getMensagensPaciente(user.email);
      console.log('📬 Mensagens recebidas do serviço:', mensagensData.length);
      console.log('📬 Mensagens (detalhes):', mensagensData);
      
      const mensagensFiltradas = mensagensData.filter(m => !m.deletada);
      console.log('📬 Mensagens não deletadas:', mensagensFiltradas.length);
      
      // Separar mensagens recebidas (do médico) e enviadas (pelo paciente)
      const recebidas = mensagensFiltradas.filter(m => m.direcao === 'medico_para_paciente' || !m.direcao);
      const enviadas = mensagensFiltradas.filter(m => m.direcao === 'paciente_para_medico');
      
      setMensagensPaciente(recebidas);
      setMensagensEnviadasPaciente(enviadas);
      
      // Contar não lidas (apenas recebidas)
      const naoLidas = recebidas.filter(m => !m.lida).length;
      console.log('📬 Mensagens não lidas:', naoLidas);
      setMensagensNaoLidasPaciente(naoLidas);
    } catch (error) {
      console.error('Erro ao carregar mensagens do paciente:', error);
      setMensagensPaciente([]);
      setMensagensEnviadasPaciente([]);
    } finally {
      setLoadingMensagensPaciente(false);
    }
  }, [user?.email]);

  // Função para carregar solicitações do paciente
  const loadMinhasSolicitacoes = useCallback(async () => {
    if (!user?.email) return;

    setLoadingMinhasSolicitacoes(true);
    try {
      const solicitacoesData = await SolicitacaoMedicoService.getSolicitacoesPorPaciente(user.email);
      setMinhasSolicitacoes(solicitacoesData);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      setMinhasSolicitacoes([]);
    } finally {
      setLoadingMinhasSolicitacoes(false);
    }
  }, [user?.email]);

  // Executa o envio da solicitação de médico (chamado após confirmação "Sim"). Usa peso/altura do paciente se já cadastrados.
  const executarEnvioSolicitacaoMedico = useCallback(async () => {
    if (!user || !medicoSelecionado) return;
    setLoadingSolicitacaoMedico(true);
    setShowConfirmacaoSolicitarMedico(false);
    try {
      const m = paciente?.dadosClinicos?.medidasIniciais;
      const pacienteTemPesoAltura = !!(m?.peso && Number(m.peso) > 0 && m?.altura && Number(m.altura) > 0);
      const pesoVal = pacienteTemPesoAltura ? Number(m!.peso) : (pesoTemporarioIMCModal ?? parseFloat(pesoPacienteModal));
      const alturaVal = pacienteTemPesoAltura ? Number(m!.altura) : alturaInputParaCm(alturaPacienteModal);
      let pacienteIdFinal = paciente?.id;
      const pacienteNome = user.displayName || paciente?.nome || paciente?.dadosIdentificacao?.nomeCompleto || 'Paciente';

      if (pesoVal && pesoVal > 0 && alturaVal && alturaVal > 0) {
        const alturaMetros = alturaVal / 100;
        const imcVal = pesoVal / (alturaMetros * alturaMetros);
        const medidasIniciais = {
          ...paciente?.dadosClinicos?.medidasIniciais,
          peso: pesoVal,
          altura: alturaVal,
          imc: imcVal,
          circunferenciaAbdominal: paciente?.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal ?? 0
        };
        let pacienteParaSalvar = paciente;
        if (!pacienteParaSalvar?.id) {
          pacienteParaSalvar = await PacienteService.getPacienteByEmail(user.email || '')
            ?? await PacienteService.getPacienteByUserId(user.uid);
        }
        if (pacienteParaSalvar?.id) {
          const pacienteAtualizado: PacienteCompleto = {
            ...pacienteParaSalvar,
            dadosClinicos: {
              ...pacienteParaSalvar.dadosClinicos,
              medidasIniciais
            }
          };
          pacienteIdFinal = await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
          setPaciente(pacienteAtualizado);
        } else {
          const pacienteNovo: PacienteCompleto = {
            id: '',
            userId: user.uid,
            email: user.email || '',
            nome: pacienteNome,
            medicoResponsavelId: null as string | null,
            dadosIdentificacao: {
              nomeCompleto: pacienteNome,
              email: user.email || '',
              telefone: telefonePaciente.trim().replace(/\D/g, ''),
              dataCadastro: new Date(),
              endereco: {}
            },
            dadosClinicos: {
              medidasIniciais: {
                peso: medidasIniciais.peso,
                altura: medidasIniciais.altura,
                imc: medidasIniciais.imc,
                circunferenciaAbdominal: medidasIniciais.circunferenciaAbdominal ?? 0
              },
              comorbidades: {}
            },
            estiloVida: {},
            examesLaboratoriais: [],
            planoTerapeutico: { metas: {} },
            evolucaoSeguimento: [],
            alertas: [],
            comunicacao: { mensagens: [], anexos: [], logsAuditoria: [] },
            indicadores: { tempoEmTratamento: { dias: 0, semanas: 0 }, adesaoMedia: 0, incidenciaEfeitosAdversos: { total: 0, grave: 0, moderado: 0, leve: 0 } },
            status: 'ativo' as const,
            statusTratamento: 'pendente' as const,
            dataCadastro: new Date()
          };
          pacienteIdFinal = await PacienteService.createOrUpdatePaciente(pacienteNovo);
          setPaciente({ ...pacienteNovo, id: pacienteIdFinal });
        }
      }

      await SolicitacaoMedicoService.criarSolicitacao({
        pacienteId: pacienteIdFinal ?? undefined,
        pacienteEmail: user.email || '',
        pacienteNome,
        pacienteTelefone: telefonePaciente.trim(),
        medicoId: medicoSelecionado.id,
        medicoNome: medicoSelecionado.nome,
        status: 'pendente'
      });
      await loadMinhasSolicitacoes();

      setShowModalMedico(false);
      setMedicoSelecionado(null);
      setTelefonePaciente('');
      setPesoPacienteModal('');
      setAlturaPacienteModal('');
      setShowModalSolicitacaoEnviada(true);

      setTimeout(() => {
        if (medicoSelecionado.telefone) {
          try {
            let telefoneFormatado = medicoSelecionado.telefone.replace(/\D/g, '');
            if (telefoneFormatado.startsWith('0')) telefoneFormatado = telefoneFormatado.substring(1);
            if (!telefoneFormatado.startsWith('55')) telefoneFormatado = '55' + telefoneFormatado;
            const tituloMedico = medicoSelecionado.genero === 'F' ? 'Dra.' : 'Dr.';
            const mensagem = `Olá, ${tituloMedico} ${medicoSelecionado.nome}, estou enviando uma solicitação para cotação de um tratamento com Tirzepatida. Poderia me dar mais informações, por favor.`;
            window.open(`https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`, '_blank');
          } catch (e) {
            console.error('Erro ao abrir WhatsApp:', e);
          }
        }
      }, 100);
    } catch (error) {
      console.error('Erro ao solicitar médico:', error);
      alert('Erro ao enviar solicitação');
    } finally {
      setLoadingSolicitacaoMedico(false);
    }
  }, [user, medicoSelecionado, paciente, telefonePaciente, pesoPacienteModal, alturaPacienteModal, pesoTemporarioIMCModal, loadMinhasSolicitacoes]);

  // Verificar autorização do Google Calendar
  const verificarAutorizacaoGoogleCalendar = useCallback(async () => {
    if (!paciente?.id || !user?.email) return;
    
    try {
      const autorizado = await GoogleCalendarService.isAutorizado(paciente.id);
      setGoogleCalendarAutorizado(autorizado);
    } catch (error) {
      console.error('Erro ao verificar autorização Google Calendar:', error);
      setGoogleCalendarAutorizado(false);
    }
  }, [paciente?.id, user?.email]);

  // Processar referral de nutricionista (quando vier de link de indicação)
  useEffect(() => {
    const refParam = searchParams.get('ref');
    const nutriId = searchParams.get('nutriId');
    const medicoIdParam = searchParams.get('medicoId');

    if (refParam === 'nutri' && nutriId && medicoIdParam) {
      // Carregar dados do nutricionista e médico para exibir no banner
      const loadReferralData = async () => {
        try {
          const { NutricionistaService } = await import('@/services/nutricionistaService');
          const nutri = await NutricionistaService.getNutricionistaByUserId(nutriId);
          const medico = await MedicoService.getMedicoById(medicoIdParam);

          if (nutri && medico) {
            setReferralInfo({
              tipo: 'nutricionista',
              nutricionistaId: nutriId,
              medicoId: medicoIdParam,
              nutricionistaNome: nutri.nome,
              medicoNome: medico.nome,
            });
            setMedicoRecomendadoId(medicoIdParam);
          }
        } catch (error) {
          console.error('Erro ao carregar dados do referral:', error);
        }
      };

      loadReferralData();
    }
  }, [searchParams]);

  // Modo nutricionista: /metanutri → /meta?pacienteId=...&menu=nutri (abre aba Nutri)
  useEffect(() => {
    const pacienteId = searchParams.get('pacienteId');
    const menu = searchParams.get('menu');
    if (pacienteId) {
      setPacienteIdFromQuery(pacienteId);
      setIsNutricionistaMode(true);
      setActiveMenu(menu === 'nutri' ? 'nutri' : (menu || 'nutri'));
    } else {
      setPacienteIdFromQuery(null);
      setIsNutricionistaMode(false);
    }
  }, [searchParams]);

  // Salvar referral no paciente quando ele for carregado e houver referral
  useEffect(() => {
    const saveReferral = async () => {
      if (!user?.email || !paciente || !referralInfo) return;
      
      // Verificar se já tem referral salvo
      const pacienteComReferral = paciente as any;
      if (pacienteComReferral.referral && pacienteComReferral.referral.tipo === 'nutricionista') {
        // Já tem referral salvo, não salvar novamente
        return;
      }

      try {
        // Salvar referral no Firestore
        const pacienteRef = doc(db, 'pacientes_completos', paciente.id);
        await setDoc(pacienteRef, {
          referral: {
            tipo: referralInfo.tipo,
            nutricionistaId: referralInfo.nutricionistaId,
            medicoId: referralInfo.medicoId,
            criadoEm: new Date(),
          },
          medicoRecomendadoId: referralInfo.medicoId,
        }, { merge: true });

        console.log('Referral salvo com sucesso');
      } catch (error) {
        console.error('Erro ao salvar referral:', error);
      }
    };

    saveReferral();
  }, [user, paciente, referralInfo]);

  // Carregar dados do paciente e mensagens quando o usuário estiver logado
  useEffect(() => {
    const qPacienteId = searchParams.get('pacienteId');
    const canLoadByNutri = user?.uid && qPacienteId;
    const canLoadByEmail = user?.email && !qPacienteId;
    const canLoadPaciente = user && (canLoadByEmail || canLoadByNutri);
    if (canLoadPaciente) loadPaciente();
    if (user && user.email && !qPacienteId) loadMensagensPacienteAtual();
  }, [user, searchParams, loadPaciente, loadMensagensPacienteAtual]);

  // Modal de dados: abre automaticamente ao entrar no /meta (tanto por link do médico quanto avulso), exceto no modo nutricionista (pacienteId na URL).
  // Importante: marcar modalDadosAberturaTentadaRef só dentro do setTimeout. Se marcar antes, o primeiro loadPaciente()
  // põe loadingPaciente=true, o cleanup cancela o timeout e o ref fica true para sempre — o chat nunca abre no 1.º acesso.
  // Após Salvar metas, loadPaciente() não deve reabrir o chat: o ref continua true após a primeira abertura bem-sucedida.
  // Passo 17 = perfil completo + médico já vinculado (só mostraria TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA) — não auto-abrir.
  useEffect(() => {
    if (loadingPaciente || !user?.uid) return;
    const qPacienteId = searchParams.get('pacienteId');
    if (qPacienteId) return; // modo nutricionista vendo paciente — não abrir
    if (modalDadosPacienteFoiFechadoRef.current || modalDadosAberturaTentadaRef.current) return;
    if (paciente && getFirstIncompleteStep(paciente) === 17) {
      modalDadosAberturaTentadaRef.current = true;
      return;
    }
    const t = setTimeout(() => {
      modalDadosAberturaTentadaRef.current = true;
      openModalDadosPaciente();
    }, 200);
    return () => clearTimeout(t);
  }, [
    loadingPaciente,
    user?.uid,
    searchParams.get('pacienteId'),
    openModalDadosPaciente,
    paciente,
  ]);

  // Carregar pagamento do paciente quando estiver na aba Aplicações
  useEffect(() => {
    if (!paciente?.id || activeMenu !== 'aplicacoes') return;
    const load = async () => {
      setLoadingPagamento(true);
      try {
        const pag = await PagamentoService.getPagamentoPorPacienteId(paciente.id);
        setPagamentoPaciente(pag ?? null);
      } catch (err) {
        console.error('Erro ao carregar pagamentos:', err);
        setPagamentoPaciente(null);
      } finally {
        setLoadingPagamento(false);
      }
    };
    load();
  }, [paciente?.id, activeMenu]);

  // Verificar se deve mostrar NPS (paciente na 4ª semana de tratamento)
  // Executar APENAS quando paciente for carregado E não estiver carregando
  useEffect(() => {
    // Aguardar até que o carregamento termine E tenha paciente carregado
    if (loadingPaciente) {
      console.log('NPS: Aguardando carregamento do paciente...');
      setMostrarNotificacaoNPS(false);
      return;
    }

    // Se não tiver usuário ou paciente, não executar
    if (!user?.uid || !paciente) {
      console.log('NPS: Dados não disponíveis', { hasUser: !!user?.uid, hasPaciente: !!paciente });
      setMostrarNotificacaoNPS(false);
      return;
    }

    const verificarNPS = async () => {
      console.log('NPS: Verificando condições', { 
        hasUser: !!user?.uid, 
        hasPaciente: !!paciente,
        pacienteNome: paciente.nome,
        hasStartDate: !!paciente.planoTerapeutico?.startDate,
        semanaCalculada: calcularSemanaAtualTratamento(paciente)
      });

      // Verificar se já respondeu completamente
      let npsRespondido = false;
      try {
        const resposta = await NPSService.getRespostaPorUserId(user.uid);
        if (resposta && NPSService.isRespostaCompleta(resposta)) {
          npsRespondido = true;
          setNpsJaRespondido(true);
          setMostrarNotificacaoNPS(false);
          localStorage.setItem('nps_respondido', 'true');
          console.log('NPS: Já respondido completamente');
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar resposta NPS:', error);
      }

      // Calcular semana atual de tratamento
      const semanaAtual = calcularSemanaAtualTratamento(paciente);
      console.log('NPS: Semana atual do paciente:', semanaAtual);

      // Lógica simplificada:
      // Se semana > 2 E NPS não respondido → mostra notificação
      // Se semana <= 2 → não mostra
      // Se semana > 2 E NPS respondido → não mostra (já retornou acima)
      if (semanaAtual !== null && semanaAtual > 2 && !npsRespondido) {
        console.log('NPS: ✅ Mostrando notificação (semana', semanaAtual, '> 2 e NPS não respondido)');
        setMostrarNotificacaoNPS(true);
      } else {
        console.log('NPS: ❌ Não mostrando notificação (semana:', semanaAtual, ', respondido:', npsRespondido, ')');
        setMostrarNotificacaoNPS(false);
      }
    };

    verificarNPS();
  }, [user?.uid, paciente, loadingPaciente]);

  // Handler para quando o modal NPS for fechado
  const handleNPSModalClose = async () => {
    setShowNPSModal(false);
    // Verificar novamente no banco se a resposta foi salva completamente
    if (user?.uid) {
      try {
        const resposta = await NPSService.getRespostaPorUserId(user.uid);
        if (resposta && NPSService.isRespostaCompleta(resposta)) {
          setNpsJaRespondido(true);
          setMostrarNotificacaoNPS(false);
          localStorage.setItem('nps_respondido', 'true');
          console.log('NPS: Resposta completa após fechar modal');
        } else {
          console.log('NPS: Resposta ainda incompleta ou não existe');
          // Não resetar npsJaRespondido, deixar o useEffect verificar
        }
      } catch (error) {
        console.error('Erro ao verificar resposta após fechar modal:', error);
      }
    }
  };

  // Carregar estado do checkbox quando paciente é carregado
  useEffect(() => {
    if (paciente) {
      setRecomendacoesLidas(paciente.recomendacoesLidas || false);
    }
  }, [paciente]);

  // Verificar autorização do Google Calendar quando o paciente for carregado
  useEffect(() => {
    if (paciente?.id && user?.email) {
      verificarAutorizacaoGoogleCalendar();
    }
  }, [paciente?.id, user?.email, verificarAutorizacaoGoogleCalendar]);

  // Callback para quando a animação do peso terminar
  const handleWeightAnimationComplete = useCallback(() => {
    setWeightAnimationComplete(true);
  }, []);

  // Resetar estado de animação quando o peso mudar ou quando mudar de página
  const ultimoPesoRef = useRef<number | null>(null);
  const ultimoActiveMenuRef = useRef<string>('');
  
  useEffect(() => {
    if (!paciente) return;
    
    const evolucao = paciente?.evolucaoSeguimento || [];
    const medidasIniciais = paciente?.dadosClinicos?.medidasIniciais;
    let novoPeso: number | null = null;
    
    if (evolucao.length > 0) {
      const evolucaoOrdenada = [...evolucao].sort((a, b) => {
        const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
        const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
        return dataB - dataA;
      });
      
      const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
      novoPeso = ultimoRegistroComPeso?.peso || null;
    }
    // Fallback: sem peso em aplicações, usar peso inicial
    if (novoPeso == null && medidasIniciais?.peso != null && medidasIniciais.peso > 0) {
      novoPeso = medidasIniciais.peso;
    }
    
    // Se o peso mudou, resetar o estado de animação
    if (novoPeso !== ultimoPesoRef.current) {
      ultimoPesoRef.current = novoPeso;
      setWeightAnimationComplete(false);
    }
  }, [paciente?.evolucaoSeguimento]);
  
  // Resetar animação quando mudar de página (activeMenu)
  useEffect(() => {
    // Se mudou de página e voltou para estatisticas, resetar animação
    if (ultimoActiveMenuRef.current !== '' && ultimoActiveMenuRef.current !== activeMenu && activeMenu === 'estatisticas') {
      setWeightAnimationComplete(false);
    }
    ultimoActiveMenuRef.current = activeMenu;
  }, [activeMenu]);

  // Mostrar fogos apenas quando a animação do peso terminar E o paciente estiver na faixa verde (IMC saudável 18.5-25)
  useEffect(() => {
    if (!paciente || isDraggingIMC || !weightAnimationComplete || activeMenu !== 'estatisticas') {
      setShowFireworks(false);
      return;
    }

    // Calcular IMC - usar o IMC atual (último peso) quando disponível; senão medidas iniciais
    const medidasIniciais = paciente?.dadosClinicos?.medidasIniciais || (paciente as any)?.dadosClinicos?.medidasIniciais;
    const evolucao = paciente?.evolucaoSeguimento || [];
    let ultimoPeso: number | null = null;
    if (evolucao.length > 0) {
      const evolucaoOrdenada = [...evolucao].sort((a, b) => {
        const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
        const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
        return dataB - dataA;
      });
      const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
      ultimoPeso = ultimoRegistroComPeso?.peso || null;
    }
    if (ultimoPeso == null && medidasIniciais?.peso != null && medidasIniciais.peso > 0) {
      ultimoPeso = medidasIniciais.peso;
    }
    const alturaMetros = medidasIniciais?.altura ? Number(medidasIniciais.altura) / 100 : null;
    const imcAtual = alturaMetros && ultimoPeso && ultimoPeso > 0 ? ultimoPeso / (alturaMetros * alturaMetros) : null;
    // Usar IMC do card (mesma lógica da barra: medidas iniciais ou calculado do último peso)
    const imcParaVerificar = medidasIniciais?.imc || imcAtual;
    const isSaudavel = typeof imcParaVerificar === 'number' && imcParaVerificar >= 18.5 && imcParaVerificar < 25;

    // Só soltar fogos se estiver na faixa verde (saudável)
    if (!isSaudavel) {
      setShowFireworks(false);
      return;
    }

    setShowFireworks(true);
    const timer = setTimeout(() => {
      setShowFireworks(false);
    }, 3000); // 3 segundos (aumentado para acompanhar confetes)
    
    return () => clearTimeout(timer);
  }, [paciente, isDraggingIMC, weightAnimationComplete, activeMenu]);

  // Capturar parâmetro de encaminhamento da URL (usando useEffect para evitar problemas com SSR)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        const emailIndicador = decodeURIComponent(ref);
        setEmailIndicadorRef(emailIndicador);
        // Salvar no localStorage para persistir mesmo após navegação
        localStorage.setItem('indicacao_ref', emailIndicador);
      } else {
        // Tentar recuperar do localStorage se não estiver na URL
        const savedRef = localStorage.getItem('indicacao_ref');
        if (savedRef) {
          setEmailIndicadorRef(savedRef);
        }
      }
    }
  }, [user]); // Re-executar quando o usuário fizer login

  // Carregar minhas indicações quando mudar para aba "minhas"
  useEffect(() => {
    let isMounted = true;
    
    const loadMinhasIndicacoes = async () => {
      if (!user?.email || activeMenu !== 'indicar' || activeTabIndicar !== 'minhas') {
        console.log('Condições não atendidas:', { userEmail: user?.email, activeMenu, activeTabIndicar });
        return;
      }
      if (loadingIndicacoesRef.current) {
        console.log('Já está carregando, ignorando...');
        return; // Evitar chamadas duplicadas
      }
      
      console.log('Carregando indicações para:', user.email);
      loadingIndicacoesRef.current = true;
      setLoadingIndicacoes(true);
      try {
        const indicacoes = await IndicacaoService.getIndicacoesPorPaciente(user.email);
        console.log('Indicações carregadas:', indicacoes.length);
        if (isMounted) {
          setMinhasIndicacoes(indicacoes);
          console.log('Estado atualizado com', indicacoes.length, 'indicações');
        }
      } catch (error) {
        console.error('Erro ao carregar indicações:', error);
        if (isMounted) {
          setMessage('Erro ao carregar seus encaminhamentos. Tente novamente.');
        }
      } finally {
        if (isMounted) {
          setLoadingIndicacoes(false);
          loadingIndicacoesRef.current = false;
        }
      }
    };

    loadMinhasIndicacoes();
    
    return () => {
      isMounted = false;
    };
  }, [activeMenu, activeTabIndicar, user?.email]);

  // Carregar encaminhamentos via meu link (pacientes que solicitaram usando o link da aplicação)
  useEffect(() => {
    const loadEncaminhamentosViaMeuLink = async () => {
      if (!user?.email || activeMenu !== 'indicar' || activeTabIndicar !== 'minhas') return;
      setLoadingEncaminhamentosViaMeuLink(true);
      try {
        const solicitacoes = await SolicitacaoMedicoService.getSolicitacoesPorPacienteIndicador(user.email);
        const comStatus: Array<SolicitacaoMedico & { statusExibicao?: string }> = [...solicitacoes];
        for (let i = 0; i < comStatus.length; i++) {
          const s = comStatus[i];
          if (s.status === 'aceita' && s.pacienteId) {
            try {
              const pac = await PacienteService.getPacienteById(s.pacienteId);
              if (pac?.statusTratamento === 'concluido') (comStatus[i] as any).statusExibicao = 'Concluído';
              else if (pac?.statusTratamento === 'abandono') (comStatus[i] as any).statusExibicao = 'Abandono';
              else if (pac?.statusTratamento === 'pendente') (comStatus[i] as any).statusExibicao = 'Pendente';
              else (comStatus[i] as any).statusExibicao = 'Em Tratamento';
            } catch {
              (comStatus[i] as any).statusExibicao = 'Em Tratamento';
            }
          } else if (s.status === 'pendente') (comStatus[i] as any).statusExibicao = 'Pendente';
          else if (s.status === 'rejeitada') (comStatus[i] as any).statusExibicao = 'Rejeitada';
          else if (s.status === 'desistiu') (comStatus[i] as any).statusExibicao = 'Desistiu';
        }
        setEncaminhamentosViaMeuLink(comStatus);
      } catch (err) {
        console.error('Erro ao carregar encaminhamentos via meu link:', err);
        setEncaminhamentosViaMeuLink([]);
      } finally {
        setLoadingEncaminhamentosViaMeuLink(false);
      }
    };
    loadEncaminhamentosViaMeuLink();
  }, [activeMenu, activeTabIndicar, user?.email]);

  // Carregar banners ativos quando entrar na página Home
  useEffect(() => {
    if (activeMenu === 'estatisticas') {
      const loadBanners = async () => {
        setLoadingBanners(true);
        try {
          const bannersData = await BannerService.getBannersAtivos('meta');
          setBanners(bannersData);
          if (bannersData.length > 0) {
            setCurrentBannerIndex(0);
          }
        } catch (error) {
          console.error('Erro ao carregar banners:', error);
        } finally {
          setLoadingBanners(false);
        }
      };
      loadBanners();
    }
  }, [activeMenu]);

  // Rotação automática dos banners (mais lenta e com controle de estado)
  useEffect(() => {
    if (banners.length > 1 && autoRotateEnabled) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => {
          const next = prev + 1;
          return next >= banners.length ? 0 : next;
        });
      }, 8000); // 8 segundos ao invés de 5
      return () => clearInterval(interval);
    }
  }, [banners.length, autoRotateEnabled]);

  // Add to Home Screen (PWA) - antes do banner
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Standalone = já instalado (pwa aberto fora do navegador)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    
    // Android: captura beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as unknown as { prompt: () => Promise<void> };
      setDeferredPrompt({ prompt: () => evt.prompt() });
      setCanShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Mobile (iOS ou Android): mostrar botão para Add to Home Screen
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!standalone && isMobile) {
      setCanShowInstall(true);
    }
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Verificar callback do Google Calendar
  useEffect(() => {
    const checkCalendarCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const calendarSync = urlParams.get('calendar_sync');
      const error = urlParams.get('error');
      
      if (calendarSync === 'success' && paciente?.id) {
        // Verificar autorização novamente para garantir
        try {
          const autorizado = await GoogleCalendarService.isAutorizado(paciente.id);
          setGoogleCalendarAutorizado(autorizado);
          
          if (autorizado) {
            // Sincronizar automaticamente após autorização
            setSincronizandoCalendar(true);
            try {
              const response = await fetch('/api/google-calendar/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: paciente.id,
                  tipo: 'paciente'
                }),
              });
              const data = await response.json();
              if (data.success) {
                setMensagemCalendar(`Autorização realizada com sucesso! ${data.eventsCreated || 0} eventos foram adicionados ao seu Google Calendar.`);
                setTipoMensagemCalendar('success');
              } else {
                setMensagemCalendar(`Autorização realizada, mas houve um erro ao sincronizar: ${data.error || 'Erro desconhecido'}`);
                setTipoMensagemCalendar('error');
              }
            } catch (error) {
              console.error('Erro ao sincronizar após autorização:', error);
              setMensagemCalendar('Autorização realizada, mas houve um erro ao sincronizar os eventos.');
              setTipoMensagemCalendar('error');
            } finally {
              setSincronizandoCalendar(false);
            }
          }
          
          // Limpar parâmetro da URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          
          // Limpar mensagem após 10 segundos
          setTimeout(() => {
            setMensagemCalendar('');
            setTipoMensagemCalendar('');
          }, 10000);
        } catch (error) {
          console.error('Erro ao verificar autorização após callback:', error);
          setMensagemCalendar('Erro ao verificar autorização. Tente novamente.');
          setTipoMensagemCalendar('error');
        }
      } else if (error) {
        setMensagemCalendar('Erro ao autorizar Google Calendar. Tente novamente.');
        setTipoMensagemCalendar('error');
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        setTimeout(() => {
          setMensagemCalendar('');
          setTipoMensagemCalendar('');
        }, 10000);
      }
    };
    
    if (paciente?.id) {
      checkCalendarCallback();
    }
  }, [paciente?.id]);

  const loadTrocas = useCallback(async () => {
    if (!user) return;
    
    setLoadingTrocas(true);
    try {
      const trocas = await UserService.getTrocasPorUsuario(user.email || '');
      
      // Separar trocas por tipo
      const pendentes = trocas.filter(troca => 
        troca.status === 'pendente' && troca.solicitadoEmail === user.email
      );
      const minhas = trocas.filter(troca => 
        troca.solicitanteEmail === user.email
      );
      
      setSolicitacoesPendentes(pendentes);
      setMinhasTrocas(minhas);
    } catch (error) {
      console.error('Erro ao carregar trocas:', error);
    } finally {
      setLoadingTrocas(false);
    }
  }, [user]);

  const loadFerias = useCallback(async () => {
    if (!user?.email) {
      console.log('❌ Usuário ou email não disponível para carregar férias');
      return;
    }
    
    console.log('🔄 Carregando férias para usuário:', user.email);
    setLoadingFerias(true);
    try {
      const feriasData = await UserService.getFeriasDoUsuario(user.email);
      console.log('📊 Férias carregadas no frontend:', feriasData.length);
      console.log('📋 Detalhes das férias:', feriasData.map(f => ({
        id: f.id,
        status: f.status,
        dataInicio: f.dataInicio.toLocaleDateString('pt-BR'),
        dataFim: f.dataFim.toLocaleDateString('pt-BR')
      })));
      setFerias(feriasData);
    } catch (error) {
      console.error('❌ Erro ao carregar férias:', error);
      setFerias([]);
    } finally {
      setLoadingFerias(false);
    }
  }, [user?.email]);

  // Função para carregar mensagens do residente
  const loadMensagens = useCallback(async () => {
    if (!user?.email) {
      console.log('❌ Usuário não logado, não carregando mensagens');
      return;
    }
    
    console.log('📬 Carregando mensagens para:', user.email);
    setLoadingMensagens(true);
    try {
      const mensagensData = await MensagemService.getMensagensResidente(user.email);
      console.log('📬 Mensagens carregadas:', mensagensData);
      setMensagens(mensagensData);
      
      // Contar mensagens não lidas
      const naoLidas = mensagensData.filter(m => !m.lida).length;
      console.log('📬 Mensagens não lidas:', naoLidas);
      setMensagensNaoLidas(naoLidas);
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
    } finally {
      setLoadingMensagens(false);
    }
  }, [user?.email]);

  // Função para carregar mensagens enviadas pelo residente
  const loadMensagensEnviadas = useCallback(async () => {
    if (!user?.email) {
      console.log('❌ Usuário não logado, não carregando mensagens enviadas');
      return;
    }
    
    console.log('📤 Carregando mensagens enviadas para:', user.email);
    setLoadingMensagensEnviadas(true);
    try {
      const mensagensData = await MensagemService.getMensagensResidenteParaAdmin();
      // Filtrar apenas as mensagens enviadas por este residente
      const mensagensDoResidente = mensagensData.filter(m => m.residenteEmail === user.email);
      console.log('📤 Mensagens enviadas carregadas:', mensagensDoResidente);
      setMensagensEnviadas(mensagensDoResidente);
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens enviadas:', error);
    } finally {
      setLoadingMensagensEnviadas(false);
    }
  }, [user?.email]);

  // Função para marcar mensagem como lida
  const marcarComoLida = async (mensagemId: string) => {
    try {
      await MensagemService.marcarComoLida(mensagemId);
      // Atualizar estado local
      setMensagens(prev => prev.map(m => 
        m.id === mensagemId ? { ...m, lida: true, lidaEm: new Date() } : m
      ));
      setMensagensNaoLidas(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  };

  // Função para enviar mensagem para o admin
  const handleEnviarMensagemAdmin = async () => {
    if (!user || !novaMensagemAdmin.titulo.trim() || !novaMensagemAdmin.mensagem.trim()) {
      alert('Título e mensagem são obrigatórios');
      return;
    }

    setLoading(true);
    
    try {
      // Buscar nome do residente
      const residente = residentes.find(r => r.email === user.email);
      const residenteNome = residente?.nome || 'Residente';

      await MensagemService.criarMensagemResidenteParaAdmin(
        user.email || '',
        residenteNome,
        novaMensagemAdmin.titulo.trim(),
        novaMensagemAdmin.mensagem.trim(),
        novaMensagemAdmin.anonima
      );
      
      alert('Mensagem enviada com sucesso!');
      setShowEnviarMensagemModal(false);
      setNovaMensagemAdmin({ titulo: '', mensagem: '', anonima: false });
      
      // Recarregar mensagens enviadas
      loadMensagensEnviadas();
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para deletar mensagem enviada
  const handleDeletarMensagemEnviada = async (mensagemId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta mensagem?')) return;
    
    try {
      await MensagemService.deletarMensagemResidente(mensagemId);
      setMensagensEnviadas(prev => prev.filter(m => m.id !== mensagemId));
      alert('Mensagem deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      alert('Erro ao deletar mensagem. Tente novamente.');
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
      loadTrocas();
      loadFerias();
      loadMensagens();
      loadMensagensEnviadas();
    }
  }, [user]);

  useLayoutEffect(() => {
    const checkMobile = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsLgViewport(w >= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desktop (lg+): abrir todas as seções de estatísticas por padrão para leitura mais fácil
  useEffect(() => {
    if (!isLgViewport) return;
    setEstatisticasExpandidas((prev) => {
      const next = new Set(prev);
      ['semanas', 'perdaPeso', 'hba1c', 'circunferencia', 'imc', 'bioimpedancia'].forEach((k) => next.add(k));
      return next;
    });
  }, [isLgViewport]);

  // Event listeners para arrastar o marcador de IMC (mouse)
  useEffect(() => {
    if (!isDraggingIMC) return;

    // Acessar medidasIniciais de forma mais robusta - está dentro de dadosClinicos
    const medidasIniciais = paciente?.dadosClinicos?.medidasIniciais || (paciente as any)?.dadosClinicos?.medidasIniciais;
    const alturaCm = medidasIniciais?.altura;
    const alturaMetros = alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;

    if (!alturaMetros || alturaMetros <= 0) {
      console.warn('Altura não disponível para calcular peso', {
        paciente: paciente?.id,
        pacienteCompleto: paciente,
        medidasIniciais,
        alturaCm,
        alturaMetros,
        tipoAltura: typeof alturaCm
      });
      setIsDraggingIMC(false);
      return;
    }

    const percentualParaIMC = (percentual: number): number => {
      const percent = Math.max(0, Math.min(100, percentual));
      if (percent <= 25) return (percent / 25) * 18.5;
      if (percent <= 50) {
        const percentualNaFaixa = (percent - 25) / 25;
        return 18.5 + (percentualNaFaixa * (25 - 18.5));
      }
      if (percent <= 75) {
        const percentualNaFaixa = (percent - 50) / 25;
        return 25 + (percentualNaFaixa * (30 - 25));
      }
      const percentualNaFaixa = (percent - 75) / 25;
      return 30 + (percentualNaFaixa * 20);
    };

    const imcParaPeso = (imc: number): number => {
      return imc * (alturaMetros * alturaMetros);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!barraIMCRef.current) return;
      
      const rect = barraIMCRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      const novoIMC = percentualParaIMC(percentual);
      const novoPeso = imcParaPeso(novoIMC);
      
      setImcTemporarioIMC(novoIMC);
      setPesoTemporarioIMC(novoPeso);
    };

    const handleMouseUp = () => {
      setIsDraggingIMC(false);
      setPesoTemporarioIMC(null);
      setImcTemporarioIMC(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingIMC, paciente]);

  // Event listeners para arrastar o marcador de IMC (touch)
  useEffect(() => {
    if (!isDraggingIMC) return;

    // Acessar medidasIniciais de forma mais robusta - está dentro de dadosClinicos
    const medidasIniciais = paciente?.dadosClinicos?.medidasIniciais || (paciente as any)?.dadosClinicos?.medidasIniciais;
    const alturaCm = medidasIniciais?.altura;
    const alturaMetros = alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;

    if (!alturaMetros || alturaMetros <= 0) {
      console.warn('Altura não disponível para calcular peso', {
        paciente: paciente?.id,
        pacienteCompleto: paciente,
        medidasIniciais,
        alturaCm,
        alturaMetros,
        tipoAltura: typeof alturaCm
      });
      setIsDraggingIMC(false);
      return;
    }

    const percentualParaIMC = (percentual: number): number => {
      const percent = Math.max(0, Math.min(100, percentual));
      if (percent <= 25) return (percent / 25) * 18.5;
      if (percent <= 50) {
        const percentualNaFaixa = (percent - 25) / 25;
        return 18.5 + (percentualNaFaixa * (25 - 18.5));
      }
      if (percent <= 75) {
        const percentualNaFaixa = (percent - 50) / 25;
        return 25 + (percentualNaFaixa * (30 - 25));
      }
      const percentualNaFaixa = (percent - 75) / 25;
      return 30 + (percentualNaFaixa * 20);
    };

    const imcParaPeso = (imc: number): number => {
      return imc * (alturaMetros * alturaMetros);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!barraIMCRef.current) return;
      
      if (e.cancelable) e.preventDefault(); // Só previne quando cancelável (evita warning no console)
      
      const rect = barraIMCRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      const novoIMC = percentualParaIMC(percentual);
      const novoPeso = imcParaPeso(novoIMC);
      
      setImcTemporarioIMC(novoIMC);
      setPesoTemporarioIMC(novoPeso);
    };

    const handleTouchEnd = () => {
      setIsDraggingIMC(false);
      setPesoTemporarioIMC(null);
      setImcTemporarioIMC(null);
    };

    // Adicionar listeners com { passive: false } para permitir preventDefault
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingIMC, paciente]);

  // Carregar todos os médicos e extrair estados/cidades disponíveis quando entrar na página Médicos ou Indicar
  useEffect(() => {
    const loadMedicosDisponiveis = async () => {
      if (user && ((activeMenu === 'medicos' && abaAtivaMedicos === 'buscar') || activeMenu === 'indicar')) {
        try {
          const todosMedicos = await MedicoService.getAllMedicos();
          setTodosMedicosDisponiveis(todosMedicos);

          // Extrair estados únicos onde existem médicos
          const estadosComMedicos = new Set<string>();
          const cidadesComMedicos: { estado: string; cidade: string }[] = [];

          todosMedicos.forEach(medico => {
            medico.cidades.forEach(cidade => {
              estadosComMedicos.add(cidade.estado);
              // Adicionar cidade se ainda não existir para este estado
              if (!cidadesComMedicos.some(c => c.estado === cidade.estado && c.cidade === cidade.cidade)) {
                cidadesComMedicos.push({
                  estado: cidade.estado,
                  cidade: cidade.cidade
                });
              }
            });
          });

          setEstadosDisponiveis(Array.from(estadosComMedicos).sort());
          setCidadesDisponiveis(cidadesComMedicos);
        } catch (error) {
          console.error('Erro ao carregar médicos disponíveis:', error);
        }
      }
    };

    if (user) {
    loadMedicosDisponiveis();
    }
  }, [user, activeMenu, abaAtivaMedicos]);

  // Carregar solicitações ao ter usuário (para saber se há solicitação em aberto e exibir/ocultar "Buscar Médico" e menu Médicos)
  useEffect(() => {
    if (user?.email) loadMinhasSolicitacoes();
  }, [user?.email, loadMinhasSolicitacoes]);

  // Carregar solicitações quando entrar na página Médicos (atualizar lista)
  useEffect(() => {
    if (user && activeMenu === 'medicos') {
      loadMinhasSolicitacoes();
    }
  }, [user, activeMenu, loadMinhasSolicitacoes]);

  // Debug: Log dos serviços carregados
  useEffect(() => {
    if (servicos.length > 0) {
      console.log('=== SERVIÇOS CARREGADOS ===');
      servicos.forEach(servico => {
        console.log(`ID: ${servico.id}, Nome: ${servico.nome}, Local: ${servico.localId}`);
      });
      console.log('========================');
    }
  }, [servicos]);

  // Carregar férias quando entrar na seção de férias
  useEffect(() => {
    if (user && activeMenu === 'ferias') {
      console.log('🔄 Carregando férias ao entrar na seção');
      loadFerias();
    }
  }, [user, activeMenu, loadFerias]);

  // Carregar mensagens periodicamente
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadMensagens();
      }, 30000); // A cada 30 segundos

      return () => clearInterval(interval);
    }
  }, [user, loadMensagens]);

  if (loading) {
    return <InitialLoadingSplash backgroundColor={META_SPLASH_BG} />;
  }

  if (!user) return null;

  // Função para gerar relatório completo em PDF
  const gerarRelatorioCompleto = async () => {
    if (!paciente) {
      alert('Dados do paciente não disponíveis');
      return;
    }
    await gerarRelatorioPDF(paciente, medicoResponsavel);
  };

  // Abrir modal de classificação do profissional (agregado já vem pré-carregado para abrir na hora)
  const openModalClassificacao = (tipo: ProfissionalTipo, id: string, nome: string) => {
    setProfissionalParaClassificar({ tipo, id, nome });
    const atual = tipo === 'medico' ? classificacaoMedico : tipo === 'nutricionista' ? classificacaoNutri : classificacaoPersonal;
    setVotoTemporario(atual ?? 0);
    const preloaded =
      tipo === 'medico' ? agregadoMedico : tipo === 'nutricionista' ? agregadoNutri : agregadoPersonal;
    setAgregadoNoModal(preloaded ?? null);
    setShowModalClassificacao(true);
    // Se não tinha pré-carregado, buscar agora; senão atualizar em background (caso tenha mudado)
    ClassificacaoProfissionalService.getAgregado(tipo, id).then((agregado) => {
      setAgregadoNoModal(agregado);
    });
  };

  // Salvar classificação e fechar modal
  const handleSalvarClassificacao = async () => {
    if (!paciente?.id || !profissionalParaClassificar || votoTemporario < 1 || votoTemporario > 5) return;
    setSalvandoClassificacao(true);
    try {
      await ClassificacaoProfissionalService.setClassificacao(
        paciente.id,
        profissionalParaClassificar.tipo,
        profissionalParaClassificar.id,
        votoTemporario
      );
      if (profissionalParaClassificar.tipo === 'medico') setClassificacaoMedico(votoTemporario);
      else if (profissionalParaClassificar.tipo === 'nutricionista') setClassificacaoNutri(votoTemporario);
      else setClassificacaoPersonal(votoTemporario);
      const novoAgregado = await ClassificacaoProfissionalService.getAgregado(profissionalParaClassificar.tipo, profissionalParaClassificar.id);
      setAgregadoNoModal(novoAgregado);
      if (profissionalParaClassificar.tipo === 'medico') setAgregadoMedico(novoAgregado);
      else if (profissionalParaClassificar.tipo === 'nutricionista') setAgregadoNutri(novoAgregado);
      else setAgregadoPersonal(novoAgregado);
      setShowModalClassificacao(false);
      setProfissionalParaClassificar(null);
    } catch (error) {
      console.error('Erro ao salvar classificação:', error);
      alert('Não foi possível salvar a avaliação. Tente novamente.');
    } finally {
      setSalvandoClassificacao(false);
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'estatisticas': {
        // Verificar se deve usar layout customizado
        const layoutAtual = layoutParam || preferenciaLayout;
        
        if (layoutAtual && paciente) {
          switch (layoutAtual) {
            case 'modern':
              return <LayoutModerno paciente={paciente} />;
            case 'minimal':
              return <LayoutMinimalista paciente={paciente} />;
            case 'interactive':
              return <LayoutInterativo paciente={paciente} />;
          }
        }

        // Layout padrão (original)
        const evolucao = paciente?.evolucaoSeguimento || [];
        const planoTerapeutico = paciente?.planoTerapeutico;
        const medidasIniciais = paciente?.dadosClinicos?.medidasIniciais;
        
        // Calcular estatísticas básicas
        const semanasTratamento = evolucao.length;
        
        // Baseline weight: usar o peso real da primeira medição (weekIndex 1) ou peso inicial se não houver registros
        const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
        const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
        
        // Peso Atual: último registro de aplicação (evolucaoSeguimento) ordenado por data; se não houver peso em aplicações, usar peso inicial (medidasIniciais.peso)
        let ultimoPeso: number | null = null;
        let dataUltimaMedicao: Date | null = null;
        if (evolucao.length > 0) {
          const evolucaoOrdenada = [...evolucao].sort((a, b) => {
            const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
            const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
            return dataB - dataA; // Mais recente primeiro
          });
          
          const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
          ultimoPeso = ultimoRegistroComPeso?.peso || null;
          if (ultimoRegistroComPeso?.dataRegistro) {
            dataUltimaMedicao = ultimoRegistroComPeso.dataRegistro instanceof Date 
              ? ultimoRegistroComPeso.dataRegistro 
              : new Date(ultimoRegistroComPeso.dataRegistro);
          }
        }
        // Fallback: quando o paciente ainda não tem peso em nenhuma aplicação, usar o peso inicial (medidasIniciais)
        if (ultimoPeso == null && medidasIniciais?.peso != null && medidasIniciais.peso > 0) {
          ultimoPeso = medidasIniciais.peso;
        }
        
        // Perda de Peso Acumulado: Delta = Peso Atual (do último registro) - Peso Inicial (baselineWeight)
        const perdaPesoAcumulado = ultimoPeso && baselineWeight > 0 ? ultimoPeso - baselineWeight : 0;
        
        // HbA1c atual (sempre do último registro de aplicação)
        const hba1cAtual = evolucao.length > 0 
          ? evolucao[evolucao.length - 1]?.hba1c || 0
          : 0;
        
        // Circunferência abdominal atual: sempre do último registro de aplicação
        const ultimaCircunferencia = evolucao.length > 0 
          ? (evolucao[evolucao.length - 1]?.circunferenciaAbdominal || null)
          : null;
        const circunferenciaInicial = medidasIniciais?.circunferenciaAbdominal || 0;
        const reducaoCircunferencia = circunferenciaInicial > 0 && ultimaCircunferencia && ultimaCircunferencia > 0 
          ? circunferenciaInicial - ultimaCircunferencia 
          : 0;

        const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
        const imcAtual = alturaMetros && ultimoPeso && ultimoPeso > 0 ? ultimoPeso / (alturaMetros * alturaMetros) : null;
        
        const tipoObesidade = (() => {
          if (!imcAtual) return null;
          if (imcAtual < 18.5) return 'Abaixo do peso';
          if (imcAtual < 25) return 'Peso normal';
          if (imcAtual < 30) return 'Sobrepeso';
          if (imcAtual < 35) return 'Obesidade Grau I';
          if (imcAtual < 40) return 'Obesidade Grau II';
          return 'Obesidade Grau III';
        })();

        // Preparar curva esperada igual ao médico
        // primeiroRegistro e baselineWeight já foram declarados acima
        
        // Calcular HbA1c inicial (primeiro registro ou primeiro exame)
        const primeiroRegistroHbA1c = evolucao.find(e => e.hba1c && e.hba1c > 0);
        const exames = paciente?.examesLaboratoriais || [];
        const primeiroExameHbA1c = exames
          .filter(ex => ex.hemoglobinaGlicada)
          .sort((a, b) => {
            const dateA = a.dataColeta ? new Date(a.dataColeta).getTime() : 0;
            const dateB = b.dataColeta ? new Date(b.dataColeta).getTime() : 0;
            return dateA - dateB;
          })[0]?.hemoglobinaGlicada;
        const hba1cInicial = primeiroRegistroHbA1c?.hba1c || primeiroExameHbA1c || 0;
        const reducaoHbA1c = hba1cInicial > 0 && hba1cAtual > 0 && hba1cInicial > hba1cAtual
          ? hba1cInicial - hba1cAtual
          : 0;
        
        const suggestedSchedule = buildSuggestedDoseSchedule(1, [2.5, 5, 7.5, 10, 12.5, 15], 4);
        // Usar número de semanas do plano terapêutico (padrão: 18)
        const totalSemanasGrafico = planoTerapeutico?.numeroSemanasTratamento || 18;
        
        const expectedCurve = buildExpectedCurveDoseDrivenAnchored({
          baselineWeightKg: baselineWeight,
          doseSchedule: suggestedSchedule,
          totalWeeks: totalSemanasGrafico,
          targetType: planoTerapeutico?.metas?.weightLossTargetType,
          targetValue: planoTerapeutico?.metas?.weightLossTargetValue || 0,
          useAnchorWeek: 18,
          useAnchorPct: 9.0
        });

        // Preparar dados para gráfico (estilo metaadmin - Peso e Comprimento abdominal)
        const seguimentoOrdem = [...evolucao].sort((a, b) => {
          const dateA = new Date(a.dataRegistro);
          const dateB = new Date(b.dataRegistro);
          return dateA.getTime() - dateB.getTime();
        });

        const registrosComPeso = seguimentoOrdem.filter((r: any) => r.peso != null && r.peso > 0);
        const ultimas4Peso = registrosComPeso.slice(-4);
        const pontosPeso = ultimas4Peso.map((r: any) => ({
          semana: r.weekIndex ?? r.numeroSemana ?? 0,
          peso: r.peso
        }));
        const pesoSemana1 = registrosComPeso.find((r: any) => (r.weekIndex ?? r.numeroSemana) === 1)?.peso;
        const pesoUltimaSemana = registrosComPeso.length > 0 ? registrosComPeso[registrosComPeso.length - 1].peso : null;
        const perdaTotalPeso = pesoSemana1 != null && pesoUltimaSemana != null ? pesoSemana1 - pesoUltimaSemana : 0;
        const dadosGraficoPeso: { semana: number; peso: number; pesoLine: number | null; variacao?: number; semanaLabel?: string }[] = [];
        for (let i = 0; i < pontosPeso.length; i++) {
          dadosGraficoPeso.push({ ...pontosPeso[i], pesoLine: pontosPeso[i].peso, semanaLabel: `Sem ${pontosPeso[i].semana}` });
          if (i < pontosPeso.length - 1) {
            const p1 = pontosPeso[i];
            const p2 = pontosPeso[i + 1];
            dadosGraficoPeso.push({
              semana: (p1.semana + p2.semana) / 2,
              peso: (p1.peso + p2.peso) / 2,
              pesoLine: null,
              variacao: Number((p2.peso - p1.peso).toFixed(1))
            });
          }
        }

        const registrosComComp = seguimentoOrdem.filter((r: any) => r.circunferenciaAbdominal != null && r.circunferenciaAbdominal > 0);
        const ultimas4Comp = registrosComComp.slice(-4);
        const baseCircAbdominal = primeiroRegistro?.circunferenciaAbdominal || medidasIniciais?.circunferenciaAbdominal || 0;
        const pontosComp = ultimas4Comp.map((r: any) => ({
          semana: r.weekIndex ?? r.numeroSemana ?? 0,
          comp: r.circunferenciaAbdominal
        }));
        const compUltimaSemana = registrosComComp.length > 0 ? registrosComComp[registrosComComp.length - 1].circunferenciaAbdominal : null;
        const reducaoTotalComp = baseCircAbdominal != null && compUltimaSemana != null ? baseCircAbdominal - compUltimaSemana : 0;
        const dadosGraficoComp: { semana: number; comp: number; compLine: number | null; variacao?: number; semanaLabel?: string }[] = [];
        for (let i = 0; i < pontosComp.length; i++) {
          dadosGraficoComp.push({ ...pontosComp[i], compLine: pontosComp[i].comp, semanaLabel: `Sem ${pontosComp[i].semana}` });
          if (i < pontosComp.length - 1) {
            const p1 = pontosComp[i];
            const p2 = pontosComp[i + 1];
            dadosGraficoComp.push({
              semana: (p1.semana + p2.semana) / 2,
              comp: (p1.comp + p2.comp) / 2,
              compLine: null,
              variacao: Number((p2.comp - p1.comp).toFixed(1))
            });
          }
        }

        const ultimas4Semanas = seguimentoOrdem.slice(-4);

        // Preparar dados para gráfico de HbA1c (últimas 4 semanas)
        const metaHba1c = planoTerapeutico?.metas?.hba1cTargetType;
        const metaValue = metaHba1c ? parseFloat(metaHba1c.replace('≤', '')) : null;
        
        // Definir faixa ideal de HbA1c (4.0% até a meta, ou 4.0-5.6% se não houver meta)
        const faixaIdealMin = 4.0;
        const faixaIdealMax = metaValue ? metaValue : 5.6; // Meta terapêutica ou faixa normal
        
        const hba1cData = ultimas4Semanas.map((s) => {
          return {
            semana: s.weekIndex,
            hba1c: s.hba1c || null,
            faixaIdealMin: faixaIdealMin,
            faixaIdealMax: faixaIdealMax
          };
        });

        // Função helper para calcular grau de obesidade baseado no IMC
        const calcularGrauObesidade = (imc: number | null | undefined): string | null => {
          if (!imc || imc === 0) return null;
          if (imc < 18.5) return 'Abaixo do peso';
          if (imc < 25) return 'Peso normal';
          if (imc < 30) return 'Sobrepeso';
          if (imc < 35) return 'Obesidade Grau I';
          if (imc < 40) return 'Obesidade Grau II';
          return 'Obesidade Grau III';
        };

        // Função helper para obter cor do grau de obesidade
        const getCorGrauObesidade = (grau: string | null): string => {
          if (!grau) return 'text-gray-500 dark:text-gray-400';
          if (grau.includes('Grau III')) return 'text-red-600 font-semibold';
          if (grau.includes('Grau II')) return 'text-orange-600 font-semibold';
          if (grau.includes('Grau I')) return 'text-yellow-600 font-semibold';
          if (grau === 'Sobrepeso') return 'text-amber-600';
          if (grau === 'Peso normal') return 'text-green-600';
          return 'text-blue-600';
        };

        // Função para converter IMC para índice de grau (para eixo Y)
        const imcParaIndiceGrau = (imc: number | null): number | null => {
          if (!imc) return null;
          if (imc < 18.5) return 0; // Abaixo do peso
          if (imc < 25) return 1; // Peso normal
          if (imc < 30) return 2; // Sobrepeso
          if (imc < 35) return 3; // Obesidade Grau I
          if (imc < 40) return 4; // Obesidade Grau II
          return 5; // Obesidade Grau III
        };

        // Preparar dados para gráfico de IMC (últimas 4 semanas)
        const imcChartData = alturaMetros ? ultimas4Semanas.map((s) => {
          const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
          const imcReal = s.peso && alturaMetros ? s.peso / (alturaMetros * alturaMetros) : null;
          const imcPrevisto = expectedWeek?.expectedWeightKg && alturaMetros 
            ? expectedWeek.expectedWeightKg / (alturaMetros * alturaMetros) 
            : null;
          
          // Calcular grau de obesidade
          const grauReal = calcularGrauObesidade(imcReal);
          const grauPrevisto = calcularGrauObesidade(imcPrevisto);
          
          // Converter para índice de grau para o eixo Y
          const indiceGrauReal = imcParaIndiceGrau(imcReal);
          const indiceGrauPrevisto = imcParaIndiceGrau(imcPrevisto);
          
          return {
            semana: s.weekIndex,
            imc: imcReal,
            previsto: imcPrevisto,
            grau: grauReal,
            grauPrevisto: grauPrevisto,
            indiceGrau: indiceGrauReal,
            indiceGrauPrevisto: indiceGrauPrevisto
          };
        }) : [];

        // IMC atual: priorizar calculado do último peso; fallback para IMC inicial quando não há evolução
        const imcParaCard = imcAtual || medidasIniciais?.imc;
        
        // Função para classificar IMC no formato simplificado (Status Corporal)
        const classificarIMC = (imc: number | null | undefined): { label: string; cor: string; bgGradient: string; icone: string } | null => {
          if (!imc || imc === 0) return null;
          if (imc < 18.5) return { 
            label: 'Baixo peso', 
            cor: 'text-blue-600', 
            bgGradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            icone: '😟' 
          };
          if (imc < 25) return { 
            label: 'Saudável', 
            cor: 'text-green-600', 
            bgGradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            icone: '🙂' 
          };
          if (imc < 30) return { 
            label: 'Alto', 
            cor: 'text-yellow-600', 
            bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            icone: '😐' 
          };
          return { 
            label: 'Obeso', 
            cor: 'text-red-600', 
            bgGradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            icone: '😟' 
          };
        };
        
        // Função para formatar data no formato ISO: "2026/01/11"
        const formatarDataISO = (data: Date | null): string => {
          if (!data) return '';
          const ano = data.getFullYear();
          const mes = String(data.getMonth() + 1).padStart(2, '0');
          const dia = String(data.getDate()).padStart(2, '0');
          return `${ano}/${mes}/${dia}`;
        };
        
        const classificacaoIMC = classificarIMC(imcParaCard);

        // Handlers para arrastar o marcador
        const handleMouseDown = (e: React.MouseEvent) => {
          e.preventDefault();
          setIsDraggingIMC(true);
        };

        const handleTouchStart = (e: React.TouchEvent) => {
          // Não precisamos de preventDefault aqui, apenas iniciar o arraste
          setIsDraggingIMC(true);
        };

        // Função para calcular posição do marcador na barra de IMC
        const calcularPosicaoMarcador = (imc: number | null | undefined): number => {
          if (!imc || imc === 0) return 0;
          // Faixas: Baixo peso (<18.5), Saudável (18.5-25), Sobrepeso (25-30), Obeso (>=30)
          // A barra tem 4 faixas iguais (25% cada)
          if (imc < 18.5) {
            // Dentro da primeira faixa (0-18.5)
            const percentualNaFaixa = (imc / 18.5) * 25;
            return percentualNaFaixa;
          } else if (imc < 25) {
            // Dentro da segunda faixa (18.5-25)
            const percentualNaFaixa = ((imc - 18.5) / (25 - 18.5)) * 25;
            return 25 + percentualNaFaixa;
          } else if (imc < 30) {
            // Dentro da terceira faixa (25-30)
            const percentualNaFaixa = ((imc - 25) / (30 - 25)) * 25;
            return 50 + percentualNaFaixa;
          } else {
            // Dentro da quarta faixa (>=30)
            // Limitar a 100% para IMC muito alto
            const percentualNaFaixa = Math.min(((imc - 30) / 20) * 25, 25);
            return 75 + percentualNaFaixa;
          }
        };

        // Componente de Confetes (apenas mobile) - explodem e depois caem - somente quando na faixa verde
        const Confetti = () => {
          if (!showFireworks || classificacaoIMC?.label !== 'Saudável') return null;
          
          const confettiColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff6b9d', '#c44569', '#f8b500', '#00d2d3', '#ffa500', '#ff1493', '#32cd32', '#9370db'];
          const confettiCount = 50;
          
          // Posições de explosão centralizadas no card
          const explosionCenters = [
            { x: '50%', y: '50%' },
            { x: '40%', y: '45%' },
            { x: '60%', y: '45%' },
            { x: '45%', y: '55%' },
            { x: '55%', y: '55%' },
          ];
          
          return (
            <div className="lg:hidden absolute inset-0 pointer-events-none z-[51]" style={{ overflow: 'hidden', borderRadius: '24px' }}>
              {Array.from({ length: confettiCount }).map((_, i) => {
                const center = explosionCenters[Math.floor(Math.random() * explosionCenters.length)];
                const angle = Math.random() * 360;
                const explosionDistance = 20 + Math.random() * 40; // Distância inicial da explosão
                const fallDistance = 200 + Math.random() * 200; // Distância que cai após explodir
                const delay = Math.random() * 0.3;
                const duration = 3; // 3 segundos (1 segundo a mais)
                const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
                const rotation = Math.random() * 360;
                const animationName = `confetti-explode-${i}`;
                
                // Calcular posição inicial da explosão
                const startX = Math.cos(angle * Math.PI / 180) * explosionDistance;
                const startY = Math.sin(angle * Math.PI / 180) * explosionDistance;
                
                // Calcular direção da queda (sempre para baixo com leve variação)
                const fallX = (Math.random() - 0.5) * 30; // Leve variação horizontal
                const fallY = fallDistance; // Sempre cai para baixo
                
                return (
                  <div key={`confetti-${i}`}>
                    <div
                      className="absolute"
                      style={{
                        left: center.x,
                        top: center.y,
                        width: '8px',
                        height: '8px',
                        backgroundColor: color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                        opacity: 0,
                        animation: `${animationName} ${duration}s ease-out ${delay}s forwards`,
                        transform: `translate(-50%, -50%)`,
                      }}
                    />
                    <style>{`
                      @keyframes ${animationName} {
                        0% {
                          transform: translate(-50%, -50%) translate(0, 0) rotate(${rotation}deg) scale(0);
                          opacity: 0;
                        }
                        10% {
                          transform: translate(-50%, -50%) translate(${startX}px, ${startY}px) rotate(${rotation}deg) scale(1);
                          opacity: 1;
                        }
                        30% {
                          transform: translate(-50%, -50%) translate(${startX + fallX * 0.3}px, ${startY - 50}px) rotate(${rotation + 180}deg) scale(1);
                          opacity: 1;
                        }
                        100% {
                          transform: translate(-50%, -50%) translate(${startX + fallX}px, ${startY + fallY}px) rotate(${rotation + 720}deg) scale(0.5);
                          opacity: 0;
                        }
                      }
                    `}</style>
                  </div>
                );
              })}
            </div>
          );
        };

        // Componente de Fogos de Artifício (apenas mobile) - 8 explosões sequenciais próximas - somente quando na faixa verde
        const Fireworks = () => {
          if (!showFireworks || classificacaoIMC?.label !== 'Saudável') return null;
          
          // 16 posições espalhadas no card (incluindo laterais)
          const fireworkPositions = [
            { x: '30%', y: '25%' },  // Esquerda superior
            { x: '70%', y: '20%' },  // Direita superior
            { x: '25%', y: '40%' },  // Esquerda centro-superior
            { x: '75%', y: '35%' },  // Direita centro-superior
            { x: '40%', y: '35%' },  // Centro-esquerda superior
            { x: '60%', y: '30%' },  // Centro-direita superior
            { x: '20%', y: '50%' },  // Esquerda extrema centro
            { x: '80%', y: '45%' },  // Direita extrema centro
            { x: '35%', y: '50%' },  // Esquerda centro
            { x: '65%', y: '45%' },  // Direita centro
            { x: '50%', y: '40%' },  // Centro superior
            { x: '30%', y: '60%' },  // Esquerda centro-inferior
            { x: '70%', y: '65%' },  // Direita centro-inferior
            { x: '45%', y: '60%' },  // Centro-esquerda inferior
            { x: '55%', y: '65%' },  // Centro-direita inferior
            { x: '50%', y: '55%' },  // Centro inferior
          ];
          
          const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff6b9d', '#c44569', '#f8b500', '#00d2d3', '#ffa500', '#ff1493'];
          
          return (
            <div className="lg:hidden absolute inset-0 pointer-events-none z-50" style={{ overflow: 'hidden', borderRadius: '24px' }}>
              {/* 16 fogos de artifício sequenciais espalhados */}
              {fireworkPositions.map((position, fireworkIndex) => {
                const delay = fireworkIndex * 0.15; // Delay sequencial mais rápido: 0s, 0.15s, 0.3s, 0.45s, 0.6s, 0.75s, 0.9s, 1.05s
                const duration = 0.8;
                
                // Gerar partículas para cada fogo (15 partículas por fogo)
                const particles = Array.from({ length: 15 }, (_, i) => {
                  const angle = (i * 360) / 15;
                  const distance = 30 + Math.random() * 40;
                  const particleDelay = delay + Math.random() * 0.05; // Delay menor para aparecerem juntas
                  const particleDuration = duration + Math.random() * 0.2;
                  const color = colors[Math.floor(Math.random() * colors.length)];
                  const x = Math.cos(angle * Math.PI / 180) * distance;
                  const y = Math.sin(angle * Math.PI / 180) * distance;
                  
                  return { x, y, particleDelay, particleDuration, color, key: `firework-${fireworkIndex}-particle-${i}` };
                });
                
                return (
                  <div key={`firework-${fireworkIndex}`}>
                    {particles.map((particle) => {
                      const animationName = `firework-${particle.key}`;
                      return (
                        <div key={particle.key}>
                          <div
                            className="absolute"
                            style={{
                              left: position.x,
                              top: position.y,
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: particle.color,
                              boxShadow: `0 0 8px ${particle.color}, 0 0 16px ${particle.color}`,
                              opacity: 0, // Começa invisível
                              animation: `${animationName} ${particle.particleDuration}s ease-out ${particle.particleDelay}s forwards`,
                            }}
                          />
                          <style>{`
                            @keyframes ${animationName} {
                              0% {
                                transform: translate(-50%, -50%) translate(0, 0) scale(0);
                                opacity: 0;
                              }
                              5% {
                                transform: translate(-50%, -50%) translate(0, 0) scale(1.2);
                                opacity: 1;
                              }
                              100% {
                                transform: translate(-50%, -50%) translate(${particle.x}px, ${particle.y}px) scale(0);
                                opacity: 0;
                              }
                            }
                          `}</style>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        };

        const showBannerColumn = loadingBanners || banners.length > 0;

        const renderImcBarraPacienteHome = () => (
          <>
            {imcParaCard && imcParaCard > 0 && (
              <div className="mt-4">
                <div className="relative mb-1 h-4">
                  <span className="absolute text-xs text-gray-500" style={{ left: '25%', transform: 'translateX(-50%)' }}>18.5</span>
                  <span className="absolute text-xs text-gray-500" style={{ left: '50%', transform: 'translateX(-50%)' }}>25</span>
                  <span className="absolute text-xs text-gray-500" style={{ left: '75%', transform: 'translateX(-50%)' }}>30</span>
                </div>
                <div
                  ref={barraIMCRef}
                  className="relative rounded-full overflow-visible bg-gray-100"
                  style={{ height: '6px', borderRadius: '999px' }}
                >
                  <div className="absolute left-0 top-0 h-full" style={{ width: '25%', backgroundColor: '#60a5fa' }}></div>
                  <div className="absolute left-1/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#34d399' }}></div>
                  <div className="absolute left-2/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#fbbf24' }}></div>
                  <div className="absolute left-3/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#f87171' }}></div>
                  {pctMetasCardPesoHome.imcMetaAlvo != null &&
                    pctMetasCardPesoHome.imcMetaAlvo > 0 && (
                    <div
                      className="absolute top-1/2 z-[6] pointer-events-none flex flex-col items-center -translate-x-1/2 -translate-y-full drop-shadow-md"
                      style={{ left: `${calcularPosicaoMarcador(pctMetasCardPesoHome.imcMetaAlvo)}%` }}
                      title={`IMC alvo (meta de peso): ${pctMetasCardPesoHome.imcMetaAlvo.toFixed(1)} kg/m²`}
                      role="img"
                      aria-label={`Marcador de meta de peso no IMC ${pctMetasCardPesoHome.imcMetaAlvo.toFixed(1)}`}
                    >
                      <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
                        <img
                          src="/icones/imc-meta-alvo-simbolo.png"
                          alt=""
                          width={22}
                          height={22}
                          className="h-[88%] w-[88%] object-contain object-center"
                          draggable={false}
                        />
                      </div>
                      <div
                        className="-mt-px h-0 w-0 shrink-0 border-x-[8px] border-t-[10px] border-x-transparent border-t-white"
                        aria-hidden
                      />
                    </div>
                  )}
                  <div
                    className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${calcularPosicaoMarcador(imcTemporarioIMC || imcParaCard)}%`,
                      userSelect: 'none',
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 text-xs font-bold" style={{ fontSize: '12px' }}>&lt;</span>
                      <div className="bg-white border-2 border-gray-400 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110" style={{ width: '24px', height: '24px' }}>
                        <span style={{ fontSize: '14px' }}>{(classificarIMC(imcTemporarioIMC || imcParaCard) || classificacaoIMC)?.icone || '🙂'}</span>
                      </div>
                      <span className="text-gray-600 text-xs font-bold" style={{ fontSize: '12px' }}>&gt;</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-500" style={{ fontSize: '11px' }}>Baixo</span>
                  <span className="text-gray-500" style={{ fontSize: '11px' }}>Saudável</span>
                  <span className="text-gray-500" style={{ fontSize: '11px' }}>Alto</span>
                  <span className="text-gray-500" style={{ fontSize: '11px' }}>Obeso</span>
                </div>
              </div>
            )}
            {(!imcParaCard || imcParaCard === 0) && (
              <div className="text-left py-2 text-gray-500 text-sm">
                Dados insuficientes para calcular o IMC
              </div>
            )}
          </>
        );

        const renderHistoricoTratamentoCard = (extraClassName = '') => (
          <div className={`min-w-0 w-full flex flex-col min-h-0 lg:h-full ${extraClassName}`}>
            <div className="border border-gray-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-md shadow-sm h-full min-h-0 flex flex-col lg:min-h-0">
              <button
                onClick={() => {
                  const newSet = new Set(estatisticasExpandidas);
                  if (newSet.has('semanas')) newSet.delete('semanas');
                  else newSet.add('semanas');
                  setEstatisticasExpandidas(newSet);
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200/90 border-b border-gray-200/80 transition-colors shrink-0"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <BarChart3 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 text-left">Histórico de Tratamento</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-base font-semibold text-black">{semanasTratamento}</span>
                  {estatisticasExpandidas.has('semanas') ? (
                    <ChevronUp className="w-4 h-4 text-black flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-black flex-shrink-0" />
                  )}
                </div>
              </button>
              {estatisticasExpandidas.has('semanas') && planoTerapeutico && (
                <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200/50 flex-1 min-h-0 flex flex-col overflow-hidden">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 shrink-0">Histórico de Medicações</h3>
                  <div className="space-y-2 flex-1 min-h-0 overflow-y-auto max-h-96 lg:max-h-full">
                    {(() => {
                      if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
                        return (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">Sem plano terapêutico cadastrado</p>
                          </div>
                        );
                      }

                      const diasSemana: { [key: string]: number } = {
                        dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
                      };
                      const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
                      const primeiraDose = new Date(planoTerapeutico.startDate);
                      primeiraDose.setHours(0, 0, 0, 0);
                      while (primeiraDose.getDay() !== diaDesejado) {
                        primeiraDose.setDate(primeiraDose.getDate() + 1);
                      }

                      const numeroSemanas = planoTerapeutico?.numeroSemanasTratamento || 18;
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];

                      return Array.from({ length: numeroSemanas }, (_, i) => {
                        const semanaNum = i + 1;
                        const dataDose = new Date(primeiraDose);
                        dataDose.setDate(primeiraDose.getDate() + (i * 7));

                        const isCancelada = semanasCanceladas.includes(semanaNum);

                        const registroEvolucao = evolucao.find(e => {
                          if (!e.dataRegistro) return false;
                          const dataRegistro = new Date(e.dataRegistro);
                          if (isNaN(dataRegistro.getTime())) return false;
                          dataRegistro.setHours(0, 0, 0, 0);
                          const diffDias = Math.abs((dataRegistro.getTime() - dataDose.getTime()) / (1000 * 60 * 60 * 24));
                          return diffDias <= 1;
                        });

                        const doseAplicada = registroEvolucao?.doseAplicada?.quantidade || null;

                        let status: string;
                        let statusClass: string;
                        let statusBg: string;
                        if (isCancelada) {
                          status = 'Cancelada';
                          statusClass = 'text-gray-500';
                          statusBg = 'bg-gray-50';
                        } else if (dataDose.getTime() === hoje.getTime()) {
                          status = 'Hoje';
                          statusClass = 'text-blue-700';
                          statusBg = 'bg-blue-50';
                        } else if (dataDose < hoje) {
                          if (registroEvolucao && registroEvolucao.adherence && registroEvolucao.adherence !== 'MISSED') {
                            status = 'Tomada';
                            statusClass = 'text-green-700';
                            statusBg = 'bg-green-50';
                          } else {
                            status = 'Não tomada';
                            statusClass = 'text-red-700';
                            statusBg = 'bg-red-50';
                          }
                        } else {
                          status = 'Futura';
                          statusClass = 'text-gray-600';
                          statusBg = 'bg-gray-50';
                        }

                        return (
                          <div
                            key={semanaNum}
                            className={`${statusBg} rounded-lg p-3 border border-gray-200 transition-all hover:shadow-sm`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-gray-700">{semanaNum}</span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {dataDose.toLocaleDateString('pt-BR', {
                                      weekday: 'short',
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </div>
                                  {doseAplicada && (
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      💉 Dose: <span className="font-semibold">{doseAplicada} mg</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusClass} bg-white/80`}>
                                  {status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

        const bioRegistrosHome = (paciente as any)?.bioimpedanciaRegistros || [];
        const sexoBioHome = paciente?.dadosIdentificacao?.sexoBiologico ?? (paciente as any)?.dadosidentificacao?.sexobiologico;
        const imagemSrcBioHome = sexoBioHome === 'F' ? '/bioimpedancia/mulher-frente.png' : '/bioimpedancia/homem-frente.png';
        const imageAltBioHome = sexoBioHome === 'F' ? 'Body map feminino' : 'Body map masculino';

        return (
          <div className="space-y-2">
            <div
              className={
                showBannerColumn
                  ? 'flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-x-3 lg:gap-y-2 lg:[grid-template-rows:18rem_36rem] lg:min-h-0'
                  : 'flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-x-3 lg:gap-y-2 lg:[grid-template-rows:18rem_36rem] lg:min-h-0'
              }
            >
              {showBannerColumn && (
                <div className="order-1 min-w-0 w-full flex flex-col lg:h-72 lg:row-start-1 lg:col-start-1">
                  {loadingBanners ? (
                    <div
                      className="rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 h-48 md:h-64 lg:h-72 animate-pulse shrink-0"
                      aria-hidden
                    />
                  ) : (
                    <div
                      className="rounded-lg overflow-hidden shadow-lg h-full flex flex-col min-h-0 lg:h-72"
                      style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
                      onTouchStart={(e) => {
                        setTouchEnd(null);
                        setTouchStart(e.targetTouches[0].clientX);
                      }}
                      onTouchMove={(e) => {
                        setTouchEnd(e.targetTouches[0].clientX);
                      }}
                      onTouchEnd={() => {
                        if (!touchStart || !touchEnd) return;
                        const distance = touchStart - touchEnd;
                        const isLeftSwipe = distance > 50;
                        const isRightSwipe = distance < -50;
                        if (isLeftSwipe && currentBannerIndex < banners.length - 1) {
                          setCurrentBannerIndex(currentBannerIndex + 1);
                        }
                        if (isRightSwipe && currentBannerIndex > 0) {
                          setCurrentBannerIndex(currentBannerIndex - 1);
                        }
                      }}
                    >
                      <div className="relative w-full h-full min-h-0 flex flex-col overflow-hidden" style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}>
                        <div
                          className="flex h-full min-h-0 transition-transform duration-300 ease-in-out"
                          style={{
                            transform: `translateX(-${currentBannerIndex * (100 / banners.length)}%)`,
                            width: `${banners.length * 100}%`,
                          }}
                        >
                          {banners.map((banner) => (
                            <Link
                              key={banner.id}
                              href={`/meta/banner/${banner.id}`}
                              prefetch
                              className="block relative flex-shrink-0 h-full flex items-center justify-center"
                              style={{ width: `${100 / banners.length}%`, touchAction: 'manipulation' }}
                            >
                              <img
                                src={banner.imagemUrl}
                                alt={banner.titulo}
                                className="w-full h-48 md:h-64 lg:h-full lg:min-h-0 object-contain select-none pointer-events-none bg-white dark:bg-gray-900"
                                draggable={false}
                              />
                            </Link>
                          ))}
                        </div>
                        {banners.length > 1 && (
                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 pointer-events-none">
                            {banners.map((_, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCurrentBannerIndex(index);
                                  setAutoRotateEnabled(false);
                                  setTimeout(() => setAutoRotateEnabled(true), 3000);
                                }}
                                className={`h-2 rounded-full transition-all pointer-events-auto ${
                                  index === currentBannerIndex ? 'bg-white w-8' : 'bg-white/50 w-2'
                                }`}
                                aria-label={`Banner ${index + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div
                className={`min-w-0 w-full order-2 flex flex-col lg:h-72 ${
                  showBannerColumn ? 'lg:row-start-1 lg:col-start-2' : 'lg:row-start-1 lg:col-start-1'
                }`}
              >
            {/* Card de Status Corporal — fundo animado igual à landing / depoimentos */}
            <div className="rounded-3xl border border-gray-200 shadow-sm overflow-hidden relative h-full flex flex-col min-h-0" style={{ borderRadius: '24px' }}>
              {paciente ? (
                <div className="absolute top-3 right-3 z-30 flex flex-col items-end pointer-events-none">
                  <button
                    type="button"
                    onClick={() => setShowModalMetasTratamento(true)}
                    className="pointer-events-auto inline-flex min-h-[30px] flex-row items-center gap-2 rounded-full border border-gray-200 dark:border-gray-600 bg-white/95 dark:bg-gray-900/95 px-3 py-2 shadow-sm text-sm font-medium tabular-nums leading-tight text-gray-800 dark:text-gray-100 hover:border-green-300 hover:bg-green-50/90 dark:hover:border-green-600 dark:hover:bg-green-950/50 transition-colors cursor-pointer"
                    aria-label={`Abrir metas de peso e circunferência. Meta atingida: peso ${
                      pctMetasCardPesoHome.onPeso && pctMetasCardPesoHome.pctPeso != null
                        ? `${pctMetasCardPesoHome.pctPeso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
                        : '—'
                    }; circunferência ${
                      pctMetasCardPesoHome.onCint && pctMetasCardPesoHome.pctCint != null
                        ? `${pctMetasCardPesoHome.pctCint.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
                        : '—'
                    }`}
                  >
                    <span
                      className={
                        pctMetasCardPesoHome.onPeso && pctMetasCardPesoHome.pctPeso != null
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }
                    >
                      {pctMetasCardPesoHome.onPeso && pctMetasCardPesoHome.pctPeso != null
                        ? `${pctMetasCardPesoHome.pctPeso.toLocaleString('pt-BR', {
                            maximumFractionDigits: 1,
                          })}%`
                        : '-'}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600 font-normal select-none" aria-hidden>
                      |
                    </span>
                    <span
                      className={
                        pctMetasCardPesoHome.onCint && pctMetasCardPesoHome.pctCint != null
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }
                    >
                      {pctMetasCardPesoHome.onCint && pctMetasCardPesoHome.pctCint != null
                        ? `${pctMetasCardPesoHome.pctCint.toLocaleString('pt-BR', {
                            maximumFractionDigits: 1,
                          })}%`
                        : '-'}
                    </span>
                  </button>
                </div>
              ) : null}
              <div className="absolute inset-0 z-0 overflow-hidden rounded-[24px]">
                <DepoimentosAnimatedBackdrop />
              </div>
              {/* Confetes e Fogos de artifício (apenas mobile) */}
              <Confetti />
              <Fireworks />
              <div className="relative z-10 p-4 flex-1 min-h-0 overflow-y-auto" style={{ padding: '18px' }}>
                {/* Peso em destaque + Perda de peso na mesma linha */}
                <div className="mb-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-900" style={{ fontSize: '52px' }}>
                      {isDraggingIMC && pesoTemporarioIMC !== null && pesoTemporarioIMC > 0 ? (
                        <span>{pesoTemporarioIMC.toFixed(1)}</span>
                      ) : (
                        <AnimatedWeight 
                          weight={ultimoPeso} 
                          onAnimationComplete={handleWeightAnimationComplete}
                        />
                      )}
                    </span>
                    {(isDraggingIMC && pesoTemporarioIMC !== null && pesoTemporarioIMC > 0) || (ultimoPeso && ultimoPeso > 0) ? (
                      <span className="text-gray-600 font-medium" style={{ fontSize: '20px' }}>Kg</span>
                    ) : null}
                  </div>
                  {baselineWeight > 0 && (() => {
                    const pesoAtualParaPerda = isDraggingIMC && pesoTemporarioIMC !== null && pesoTemporarioIMC > 0
                      ? pesoTemporarioIMC
                      : (ultimoPeso ?? baselineWeight);
                    const perdaKg = baselineWeight - pesoAtualParaPerda;
                    if (perdaKg === 0) return null;
                    const classif = classificarIMC(imcTemporarioIMC || imcParaCard) || classificacaoIMC;
                    const estilosPorZona = classif?.label === 'Saudável' 
                      ? { bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', cor: '#065f46' }
                      : classif?.label === 'Alto'
                      ? { bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', cor: '#92400e' }
                      : classif?.label === 'Obeso'
                      ? { bg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', cor: '#991b1b' }
                      : { bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', cor: '#1e40af' };
                    return (
                      <div 
                        className="px-3 py-1.5 rounded-full font-semibold shadow-sm shrink-0 self-center"
                        style={{ 
                          background: estilosPorZona.bg, 
                          color: estilosPorZona.cor,
                          fontSize: '15.47px',
                          marginTop: '6mm',
                        }}
                      >
                        {perdaKg > 0 ? '−' : '+'}{Math.abs(perdaKg).toFixed(1)} kg
                      </div>
                    );
                  })()}
                </div>
                {(classificacaoIMC || (imcTemporarioIMC && imcTemporarioIMC > 0)) && (
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div 
                      className={`px-3 py-2 rounded-full inline-flex items-center gap-2 ${(classificarIMC(imcTemporarioIMC || imcParaCard) || classificacaoIMC)?.cor}`}
                      style={{ 
                        height: '30px',
                        background: (classificarIMC(imcTemporarioIMC || imcParaCard) || classificacaoIMC)?.bgGradient
                      }}
                    >
                      <span className="text-sm font-medium">{(classificarIMC(imcTemporarioIMC || imcParaCard) || classificacaoIMC)?.label}</span>
                    </div>
                    {imcParaCard && imcParaCard > 0 && (
                      <span className="text-gray-500 text-sm font-medium">
                        IMC {(imcTemporarioIMC || imcParaCard).toFixed(1)}
                      </span>
                    )}
                  </div>
                )}
                </div>

                {renderImcBarraPacienteHome()}
              </div>
            </div>
              </div>

              {renderHistoricoTratamentoCard(
                `order-3 ${showBannerColumn ? 'lg:order-none lg:row-start-1 lg:row-span-2 lg:col-start-3' : 'lg:order-none lg:row-start-1 lg:row-span-2 lg:col-start-2'}`
              )}

              {/* Linha 2 desktop: Perda + Circ; ocupam colunas 1–2 com banner, ou subgrade na coluna 1 sem banner */}
              <div
                className={`order-4 flex flex-col gap-2 min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden lg:gap-3 ${
                  showBannerColumn
                    ? 'lg:flex-row lg:row-start-2 lg:col-start-1 lg:col-span-2'
                    : 'lg:grid lg:grid-cols-2 lg:row-start-2 lg:col-start-1'
                }`}
              >
              {/* Perda de Peso Acumulado */}
              <div className="border border-gray-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-md shadow-sm min-w-0 flex-1 lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden">
                <button
                  onClick={() => {
                    const newSet = new Set(estatisticasExpandidas);
                    if (newSet.has('perdaPeso')) {
                      newSet.delete('perdaPeso');
                    } else {
                      newSet.add('perdaPeso');
                    }
                    setEstatisticasExpandidas(newSet);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200/90 border-b border-gray-200/80 transition-colors shrink-0"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <RefreshCw className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">Perda de Peso Acumulado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AnimatedCounter 
                      from={0} 
                      to={perdaPesoAcumulado} 
                      suffix=" kg" 
                      duration={2000}
                    />
                    {estatisticasExpandidas.has('perdaPeso') ? (
                      <ChevronUp className="w-4 h-4 text-black flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-black flex-shrink-0" />
                    )}
                  </div>
                </button>
                {estatisticasExpandidas.has('perdaPeso') && baselineWeight > 0 && (
                  <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200/50 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                    <h3 className="text-lg font-semibold text-black mb-4">Peso (últimas 4 semanas)</h3>
                    {dadosGraficoPeso.length > 0 ? (
                      <>
                        <div className="w-full h-[260px] lg:h-[340px] shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={dadosGraficoPeso}
                              margin={{ top: 32, right: 24, left: 24, bottom: 32 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="semana" tick={false} axisLine={false} />
                              <YAxis tick={false} axisLine={false} domain={['auto', 'auto']} />
                              <Tooltip formatter={(v: any) => v != null ? [`${parseFloat(String(v)).toFixed(1)} kg`, 'Peso'] : null} labelFormatter={(l: any) => `Semana ${l}`} />
                              <Line type="monotone" dataKey="pesoLine" connectNulls isAnimationActive={false} stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 5 }}>
                                <LabelList
                                  dataKey="pesoLine"
                                  position="top"
                                  content={(props: any) => {
                                    const { x, y, value } = props;
                                    if (value == null) return null;
                                    return (
                                      <text x={x} y={y} textAnchor="middle" dy={-10} fill="currentColor" className="text-sm font-medium">
                                        {Number(value).toFixed(1)} kg
                                      </text>
                                    );
                                  }}
                                />
                                <LabelList
                                  dataKey="semanaLabel"
                                  position="bottom"
                                  content={(props: any) => {
                                    const { x, y, value } = props;
                                    if (!value) return null;
                                    return (
                                      <text x={x} y={y} textAnchor="middle" dy={14} fill="currentColor" className="text-xs font-medium">
                                        {value}
                                      </text>
                                    );
                                  }}
                                />
                              </Line>
                              <Scatter dataKey="peso" fill="transparent" shape={() => <circle r={0} />}>
                                <LabelList
                                  dataKey="variacao"
                                  position="top"
                                  content={(props: any) => {
                                    const { x, y, value } = props;
                                    if (value == null || value === undefined) return null;
                                    return (
                                      <text
                                        x={x}
                                        y={y}
                                        textAnchor="middle"
                                        dy={-4}
                                        fill={value <= -1 ? '#10b981' : '#ef4444'}
                                        className="text-xs font-medium"
                                      >
                                        {value > 0 ? '+' : ''}{value} kg
                                      </text>
                                    );
                                  }}
                                />
                              </Scatter>
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        {perdaTotalPeso !== 0 && (
                          <p className="text-sm text-gray-600 mt-2">Perda de peso total: {perdaTotalPeso.toFixed(1)} kg</p>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        Sem dados suficientes para exibir gráfico
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Circunferência Abdominal Atual */}
              <div className="border border-gray-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-md shadow-sm min-w-0 flex-1 lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden">
                <button
                  onClick={() => {
                    const newSet = new Set(estatisticasExpandidas);
                    if (newSet.has('circunferencia')) {
                      newSet.delete('circunferencia');
                    } else {
                      newSet.add('circunferencia');
                    }
                    setEstatisticasExpandidas(newSet);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200/90 border-b border-gray-200/80 transition-colors shrink-0"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Activity className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">Circunferência Abdominal Atual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-black">
                      {ultimaCircunferencia && ultimaCircunferencia > 0 ? `${ultimaCircunferencia.toFixed(1)} cm` : '-'}
                    </span>
                    {estatisticasExpandidas.has('circunferencia') ? (
                      <ChevronUp className="w-4 h-4 text-black flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-black flex-shrink-0" />
                    )}
                  </div>
                </button>
                {estatisticasExpandidas.has('circunferencia') && (
                  <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200/50 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                    <h3 className="text-lg font-semibold text-black mb-4">Circunferência Abdominal (últimas 4 semanas)</h3>
                    {dadosGraficoComp.length > 0 ? (
                      <>
                        <div className="w-full h-[260px] lg:h-[340px] shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={dadosGraficoComp}
                              margin={{ top: 32, right: 24, left: 24, bottom: 32 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="semana" tick={false} axisLine={false} />
                              <YAxis tick={false} axisLine={false} domain={['auto', 'auto']} />
                              <Tooltip formatter={(v: any) => v != null ? [`${parseFloat(String(v)).toFixed(1)} cm`, 'Comp. abdominal'] : null} labelFormatter={(l: any) => `Semana ${l}`} />
                              <Line type="monotone" dataKey="compLine" connectNulls isAnimationActive={false} stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 5 }}>
                                <LabelList
                                  dataKey="compLine"
                                  position="top"
                                  content={(props: any) => {
                                    const { x, y, value } = props;
                                    if (value == null) return null;
                                    return (
                                      <text x={x} y={y} textAnchor="middle" dy={-10} fill="currentColor" className="text-sm font-medium">
                                        {Number(value).toFixed(1)} cm
                                      </text>
                                    );
                                  }}
                                />
                                <LabelList
                                  dataKey="semanaLabel"
                                  position="bottom"
                                  content={(props: any) => {
                                    const { x, y, value } = props;
                                    if (!value) return null;
                                    return (
                                      <text x={x} y={y} textAnchor="middle" dy={14} fill="currentColor" className="text-xs font-medium">
                                        {value}
                                      </text>
                                    );
                                  }}
                                />
                              </Line>
                              <Scatter dataKey="comp" fill="transparent" shape={() => <circle r={0} />}>
                                <LabelList
                                  dataKey="variacao"
                                  position="top"
                                  content={(props: any) => {
                                    const { x, y, value } = props;
                                    if (value == null || value === undefined) return null;
                                    return (
                                      <text
                                        x={x}
                                        y={y}
                                        textAnchor="middle"
                                        dy={-4}
                                        fill={value <= 0 ? '#10b981' : '#ef4444'}
                                        className="text-xs font-medium"
                                      >
                                        {value > 0 ? '+' : ''}{value} cm
                                      </text>
                                    );
                                  }}
                                />
                              </Scatter>
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        {reducaoTotalComp !== 0 && (
                          <p className="text-sm text-gray-600 mt-2">Redução comp. abdominal total: {reducaoTotalComp.toFixed(1)} cm</p>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        Nenhum registro com comprimento abdominal nas últimas 4 semanas.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>

            <div className="order-5 flex flex-col gap-2 lg:grid lg:grid-cols-3 lg:gap-3 lg:items-start">
              <div className="flex flex-col gap-2 min-w-0">
              {/* IMC Atual */}
              <div className="border border-gray-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-md shadow-sm min-w-0">
                <button
                  onClick={() => {
                    const newSet = new Set(estatisticasExpandidas);
                    if (newSet.has('imc')) {
                      newSet.delete('imc');
                    } else {
                      newSet.add('imc');
                    }
                    setEstatisticasExpandidas(newSet);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200/90 border-b border-gray-200/80 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <BarChart3 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">IMC Atual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-black">
                      {imcParaCard && imcParaCard > 0 ? `${imcParaCard.toFixed(1)} kg/m²` : '-'}
                    </span>
                    {estatisticasExpandidas.has('imc') ? (
                      <ChevronUp className="w-4 h-4 text-black flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-black flex-shrink-0" />
                    )}
                  </div>
                </button>
                {estatisticasExpandidas.has('imc') && imcChartData.length > 0 && (
                  <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200/50">
                    <h3 className="text-lg font-semibold text-black mb-4">IMC (últimas 4 semanas)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={imcChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="semana" 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Semana', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          domain={[0, 5]} 
                          ticks={[0, 1, 2, 3, 4, 5]} 
                          tickFormatter={(tick) => {
                            if (isMobile) {
                              // Versão simplificada para mobile
                              switch (tick) {
                                case 0: return 'Baixo';
                                case 1: return 'Normal';
                                case 2: return 'Sobrepeso';
                                case 3: return 'Grau I';
                                case 4: return 'Grau II';
                                case 5: return 'Grau III';
                                default: return '';
                              }
                            } else {
                              // Versão completa para desktop
                              switch (tick) {
                                case 0: return 'Abaixo do peso';
                                case 1: return 'Peso normal';
                                case 2: return 'Sobrepeso';
                                case 3: return 'Obesidade I';
                                case 4: return 'Obesidade II';
                                case 5: return 'Obesidade III';
                                default: return '';
                              }
                            }
                          }}
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          label={{ value: 'Grau de Obesidade', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip formatter={(value: number, name: string, props: any) => {
                          const imcValue = props.payload.imc || props.payload.previsto;
                          const grau = calcularGrauObesidade(imcValue);
                          return [`${imcValue?.toFixed(1)} kg/m² (${grau})`, name];
                        }} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="indiceGrauPrevisto" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="IMC Previsto"
                          dot={{ fill: '#3b82f6', r: 3 }}
                          legendType="line"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="indiceGrau" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="IMC Real"
                          dot={{ fill: '#10b981', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* HbA1c Atual — mesma coluna que IMC no desktop */}
              <div className="border border-gray-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-md shadow-sm min-w-0">
                <button
                  onClick={() => {
                    const newSet = new Set(estatisticasExpandidas);
                    if (newSet.has('hba1c')) {
                      newSet.delete('hba1c');
                    } else {
                      newSet.add('hba1c');
                    }
                    setEstatisticasExpandidas(newSet);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200/90 border-b border-gray-200/80 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Activity className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">HbA1c Atual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-black">
                      {hba1cAtual > 0 ? `${hba1cAtual.toFixed(1)}%` : '-'}
                    </span>
                    {estatisticasExpandidas.has('hba1c') ? (
                      <ChevronUp className="w-4 h-4 text-black flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-black flex-shrink-0" />
                    )}
                  </div>
                </button>
                {estatisticasExpandidas.has('hba1c') && hba1cData.length > 0 && (
                  <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200/50">
                    <h3 className="text-lg font-semibold text-black mb-4">HbA1c (últimas 4 semanas)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={hba1cData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="semana"
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Semana', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          label={{ value: 'HbA1c (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="faixaIdealMax"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.1}
                          name="Meta"
                        />
                        <Area
                          type="monotone"
                          dataKey="faixaIdealMin"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.1}
                        />
                        <Area
                          type="monotone"
                          dataKey="hba1c"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.4}
                          name="HbA1c Real"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              </div>

              {isLgViewport ? (
                <>
                  <div className="border border-gray-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-md shadow-sm min-w-0 flex flex-col">
                    <div className="px-3 py-2.5 bg-gray-100 border-b border-gray-200/80 flex items-center gap-2 shrink-0">
                      <Scale className="h-4 w-4 text-teal-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">Composição corporal e obesidade</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-white/90 backdrop-blur-sm flex-1 min-h-0">
                      <BioImpedanciaDisplay
                        paciente={paciente}
                        registros={bioRegistrosHome}
                        imagemSrc={imagemSrcBioHome}
                        imageAlt={imageAltBioHome}
                        isMobile={isMobile}
                        metaHomeColumn="metrics"
                        mostrarHistoricoResumoNoBlocoMetricas={!isNutricionistaMode}
                      />
                    </div>
                  </div>
                  <div className="border border-gray-200/50 rounded-lg overflow-hidden bg-white/80 backdrop-blur-md shadow-sm min-w-0 flex flex-col">
                    <div className="px-3 py-2.5 bg-gray-100 border-b border-gray-200/80 flex items-center gap-2 shrink-0">
                      <Scale className="h-4 w-4 text-teal-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">Massa magra e gordura segmentar</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-white/90 backdrop-blur-sm flex-1 min-h-0 overflow-y-auto lg:overflow-visible">
                      <BioImpedanciaDisplay
                        paciente={paciente}
                        registros={bioRegistrosHome}
                        imagemSrc={imagemSrcBioHome}
                        imageAlt={imageAltBioHome}
                        isMobile={isMobile}
                        metaHomeColumn="body"
                        ocultarHistoricoResumoNoBlocoCorpo={!isNutricionistaMode}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <BioImpedanciaCard
                  expanded={estatisticasExpandidas.has('bioimpedancia')}
                  onToggle={() => {
                    const newSet = new Set(estatisticasExpandidas);
                    if (newSet.has('bioimpedancia')) {
                      newSet.delete('bioimpedancia');
                    } else {
                      newSet.add('bioimpedancia');
                    }
                    setEstatisticasExpandidas(newSet);
                  }}
                  paciente={paciente}
                  isMobile={isMobile}
                />
              )}
            </div>
            
            {/* Mostrar "Buscar Médico" só quando não tem médico e não tem solicitação em aberto (se rejeitou ou nunca enviou) */}
            {semMedicoNemSolicitacao && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Stethoscope className="mx-auto h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-black mb-2">Você ainda não tem um médico responsável</h3>
                <p className="text-black mb-4">Preencha as informações e escolha um médico na sua região para iniciar seu tratamento.</p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModalDadosPaciente(); }}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                >
                  <Stethoscope size={20} />
                  Buscar Médico
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'exames': {
        // Sem médico e sem solicitação em aberto: precisa procurar médico
        if (semMedicoNemSolicitacao) {
          return (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full mb-4">
                  <Stethoscope className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Vínculo com médico necessário
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-lg mx-auto">
                  Para acessar as páginas Exames, Aplicações, Nutri e Personal, você precisa primeiro ser vinculado a um médico. 
                  Preencha as informações e escolha um médico na sua região.
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModalDadosPaciente(); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Stethoscope className="w-5 h-5" />
                  Buscar Médico
                </button>
              </div>
            </div>
          );
        }

        const exames = paciente?.examesLaboratoriais || [];
        
        // Função helper para converter data de forma segura
        const safeDateToString = (date: any): string => {
          if (!date) return '';
          try {
            let d: Date;
            if (date instanceof Date) {
              d = date;
            } else if (typeof date === 'string') {
              d = new Date(date);
            } else if (date.toDate) {
              d = date.toDate();
            } else {
              d = new Date(date);
            }
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
          } catch {
            return '';
          }
        };
        
        // Ordenar exames por data (mais recente primeiro)
        
        // Ordenar exames por data (mais recente primeiro)
        const examesOrdenados = [...exames].sort((a, b) => {
          const dateA = safeDateToString(a.dataColeta);
          const dateB = safeDateToString(b.dataColeta);
          return dateB.localeCompare(dateA);
        }).filter(e => safeDateToString(e.dataColeta));
        
        // Inicializar data selecionada com o exame mais recente (se não estiver definida)
        const dataInicial = examesOrdenados.length > 0 
          ? safeDateToString(examesOrdenados[0].dataColeta)
          : '';
        
        const dataSelecionada = exameDataSelecionada || dataInicial;
        
        // Encontrar exame da data selecionada
        const exameOriginal = exames.find(e => {
          const dataExame = safeDateToString(e.dataColeta);
          return dataExame === dataSelecionada;
        }) || examesOrdenados[0] || {};
        
        // Mapear exame selecionado com os mesmos campos que dadosGrafico
        const getHemogramaVal = (ex: any, f: string) =>
          (ex?.hemogramaCompleto?.[f] ?? ex?.[f]) || null;
        const exameSelecionado = {
          glicemiaJejum: exameOriginal.glicemiaJejum || null,
          hemoglobinaGlicada: exameOriginal.hemoglobinaGlicada || null,
          insulinaJejum: exameOriginal.insulinaJejum || null,
          ureia: exameOriginal.ureia || null,
          creatinina: exameOriginal.creatinina || null,
          taxaFiltracaoGlomerular: exameOriginal.taxaFiltracaoGlomerular || null,
          sodio: exameOriginal.sodio || null,
          potassio: exameOriginal.potassio || null,
          tgp: exameOriginal.tgp || null,
          tgo: exameOriginal.tgo || null,
          ggt: exameOriginal.ggt || null,
          fosfataseAlcalina: exameOriginal.fosfataseAlcalina || null,
          amilase: exameOriginal.amilase || null,
          lipase: exameOriginal.lipase || null,
          colesterolTotal: exameOriginal.colesterolTotal || null,
          ldl: exameOriginal.ldl || null,
          hdl: exameOriginal.hdl || null,
          triglicerides: exameOriginal.triglicerides || null,
          tsh: exameOriginal.tsh || null,
          calcitonina: exameOriginal.calcitonina || null,
          ft4: exameOriginal.t4Livre || null,
          ferritina: exameOriginal.ferritina || null,
          ferroSerico: exameOriginal.ferroSerico || null,
          vitaminaB12: exameOriginal.vitaminaB12 || null,
          vitaminaD: exameOriginal.vitaminaD || null,
          hemoglobina: getHemogramaVal(exameOriginal, 'hemoglobina'),
          plaquetas: getHemogramaVal(exameOriginal, 'plaquetas'),
          leucocitos: getHemogramaVal(exameOriginal, 'leucocitos'),
          t3Livre: exameOriginal.t3Livre || null, antiTPO: exameOriginal.antiTPO || null, antiTg: exameOriginal.antiTg || null,
          testosteronaTotal: exameOriginal.testosteronaTotal || null, testosteronaLivre: exameOriginal.testosteronaLivre || null,
          shbg: exameOriginal.shbg || null, lh: exameOriginal.lh || null, fsh: exameOriginal.fsh || null,
          estradiol: exameOriginal.estradiol || null, dht: exameOriginal.dht || null, dheas: exameOriginal.dheas || null,
          prolactina: exameOriginal.prolactina || null, psa: exameOriginal.psa || null,
          progesterona: exameOriginal.progesterona || null, oh17Progesterona: exameOriginal.oh17Progesterona || null, amh: exameOriginal.amh || null,
          cortisol8h: exameOriginal.cortisol8h || null, cortisol16h: exameOriginal.cortisol16h || null, acth: exameOriginal.acth || null,
          homaIr: exameOriginal.homaIr || null, leptina: exameOriginal.leptina || null, adiponectina: exameOriginal.adiponectina || null,
          igf1: exameOriginal.igf1 || null, pcrUltra: exameOriginal.pcrUltra || null
        };
        
        // Preparar dados para gráfico de linha (todos os exames ao longo do tempo)
        const dadosGrafico = examesOrdenados.map(exame => {
          const dataExame = safeDateToString(exame.dataColeta);
          return {
            data: dataExame,
            glicemiaJejum: exame.glicemiaJejum || null,
            hemoglobinaGlicada: exame.hemoglobinaGlicada || null,
            insulinaJejum: exame.insulinaJejum || null,
            ureia: exame.ureia || null,
            creatinina: exame.creatinina || null,
            taxaFiltracaoGlomerular: exame.taxaFiltracaoGlomerular || null,
            sodio: exame.sodio || null,
            potassio: exame.potassio || null,
            tgp: exame.tgp || null,
            tgo: exame.tgo || null,
            ggt: exame.ggt || null,
            fosfataseAlcalina: exame.fosfataseAlcalina || null,
            amilase: exame.amilase || null,
            lipase: exame.lipase || null,
            colesterolTotal: exame.colesterolTotal || null,
            ldl: exame.ldl || null,
            hdl: exame.hdl || null,
            triglicerides: exame.triglicerides || null,
            tsh: exame.tsh || null,
            calcitonina: exame.calcitonina || null,
            ft4: exame.t4Livre || null,
          ferritina: exame.ferritina || null,
          ferroSerico: exame.ferroSerico || null,
          vitaminaB12: exame.vitaminaB12 || null,
          vitaminaD: exame.vitaminaD || null,
          albumina: exame.albumina || null,
          hemoglobina: (exame as any)?.hemogramaCompleto?.hemoglobina ?? (exame as any)?.hemoglobina ?? null,
          plaquetas: (exame as any)?.hemogramaCompleto?.plaquetas ?? (exame as any)?.plaquetas ?? null,
          leucocitos: (exame as any)?.hemogramaCompleto?.leucocitos ?? (exame as any)?.leucocitos ?? null,
          t3Livre: (exame as any)?.t3Livre ?? null, antiTPO: (exame as any)?.antiTPO ?? null, antiTg: (exame as any)?.antiTg ?? null,
          testosteronaTotal: (exame as any)?.testosteronaTotal ?? null, testosteronaLivre: (exame as any)?.testosteronaLivre ?? null,
          shbg: (exame as any)?.shbg ?? null, lh: (exame as any)?.lh ?? null, fsh: (exame as any)?.fsh ?? null,
          estradiol: (exame as any)?.estradiol ?? null, dht: (exame as any)?.dht ?? null, dheas: (exame as any)?.dheas ?? null,
          prolactina: (exame as any)?.prolactina ?? null, psa: (exame as any)?.psa ?? null,
          progesterona: (exame as any)?.progesterona ?? null, oh17Progesterona: (exame as any)?.oh17Progesterona ?? null, amh: (exame as any)?.amh ?? null,
          cortisol8h: (exame as any)?.cortisol8h ?? null, cortisol16h: (exame as any)?.cortisol16h ?? null, acth: (exame as any)?.acth ?? null,
          homaIr: (exame as any)?.homaIr ?? null, leptina: (exame as any)?.leptina ?? null, adiponectina: (exame as any)?.adiponectina ?? null,
          igf1: (exame as any)?.igf1 ?? null, pcrUltra: (exame as any)?.pcrUltra ?? null
          };
        }).reverse();
        
        const pacienteSex = paciente?.dadosIdentificacao?.sexoBiologico as Sex;

        const todosOsCampos = buildPatientLabSectionsFromOrder(
          labOrderBySecaoConfig,
          EXAME_LABORATORIAL_KEY_TO_FIELD,
          labLimitOverrides
        );

        const campoTemAlgumValor = (fieldKey: string) => {
          return exames.some((exame: any) => {
            let v;
            if (['hemoglobina', 'plaquetas', 'leucocitos'].includes(fieldKey)) {
              v = exame.hemogramaCompleto?.[fieldKey] ?? exame[fieldKey];
            } else {
              v = exame[fieldKey];
            }
            return v !== null && v !== undefined && v !== '';
          });
        };

        if (exames.length === 0) {
                        return (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Exames Laboratoriais</h2>
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <FlaskConical className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-black mb-2">Nenhum exame registrado</h3>
                <p className="text-black">Seus exames laboratoriais aparecerão aqui.</p>
              </div>
            </div>
          );
        }

        // Funções para controlar expansão
        const toggleSecao = (secaoKey: string) => {
          const newSet = new Set(secoesExpandidas);
          if (newSet.has(secaoKey)) {
            newSet.delete(secaoKey);
          } else {
            newSet.add(secaoKey);
          }
          setSecoesExpandidas(newSet);
        };

        const toggleExame = (exameKey: string) => {
          const newSet = new Set(examesExpandidos);
          if (newSet.has(exameKey)) {
            newSet.delete(exameKey);
          } else {
            newSet.add(exameKey);
          }
          setExamesExpandidos(newSet);
        };

        return (
          <div>
            <h2 className="text-lg font-bold text-black mb-3">Exames Laboratoriais</h2>
            
            {/* Mobile: acordeão por sistema. Desktop: um bloco por sistema (largura total); dentro de cada sistema, exames em 3 colunas. */}
            <div className="space-y-1.5 pb-3 text-sm lg:space-y-4">
              {todosOsCampos.map((secao) => {
                const camposComValor = secao.fields.filter((campo) =>
                  campoTemAlgumValor(campo.field)
                );

                if (camposComValor.length === 0) return null;

                const secaoKey = `secao-${secao.sectionId}`;
                const isSecaoExpandida = secoesExpandidas.has(secaoKey);
                const secaoComExameForaDaFaixa = camposComValor.some((campo) => {
                  const range = getLabRange(
                    campo.key as string,
                    pacienteSex,
                    paciente?.dadosIdentificacao?.dataNascimento,
                    labLimitOverrides
                  );
                  if (!range) return false;
                  const min = Number(range.min);
                  const max = Number(range.max);
                  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
                  const valor = Number(exameSelecionado[campo.field as keyof typeof exameSelecionado]);
                  if (!Number.isFinite(valor)) return false;
                  return valor < min || valor > max;
                });

                const blocosCampos = camposComValor.map((campo) => {
                  const range = getLabRange(campo.key as string, pacienteSex, paciente?.dadosIdentificacao?.dataNascimento, labLimitOverrides);
                  if (!range) return null;

                  const value = exameSelecionado[campo.field as keyof typeof exameSelecionado] as number | undefined;
                  const exameKey = `${secaoKey}-${campo.field}`;
                  const isExameExpandido = examesExpandidos.has(exameKey);
                  const temHistorico =
                    dadosGrafico.length > 0 &&
                    dadosGrafico.some((d) => {
                      const fieldValue = d[campo.field as keyof typeof d];
                      return fieldValue !== null && fieldValue !== undefined;
                    });

                  if (isLgViewport) {
                    return (
                      <div key={campo.field} className="border border-gray-200 rounded-lg overflow-hidden min-w-0">
                        <div className="p-2 bg-white space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-black text-left text-sm leading-tight">{range.label}</span>
                            <div className="text-sm font-semibold text-black whitespace-nowrap shrink-0">
                              {value || '-'}
                              {value && range.unit && ` ${range.unit}`}
                            </div>
                          </div>
                          <LabRangeBar range={range} value={value || null} />
                          {temHistorico ? (
                            <div className="pt-1">
                              <label className="block text-xs font-medium text-black mb-1.5">Evolução Temporal</label>
                              <TrendLine
                                data={dadosGrafico}
                                dataKeys={[{ key: campo.field, name: range.label, stroke: '#10b981', dot: true }]}
                                xKey="data"
                                height={150}
                                xAxisLabel="Data"
                                yAxisLabel={range.unit || ''}
                                formatter={(v: any) => (v !== null ? `${parseFloat(v).toFixed(1)}` : 'N/A')}
                                referenceLines={[
                                  { value: range.min, label: `Min: ${range.min}`, stroke: '#ef4444', strokeDasharray: '5 5' },
                                  { value: range.max, label: `Max: ${range.max}`, stroke: '#ef4444', strokeDasharray: '5 5' },
                                ]}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={campo.field} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleExame(exameKey)}
                        className="w-full flex items-center justify-between p-2 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {isExameExpandido ? (
                            <ChevronUp className="w-3.5 h-3.5 text-black flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-black flex-shrink-0" />
                          )}
                          <span className="font-medium text-black text-left text-sm">{range.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-black">
                            {value || '-'}
                            {value && range.unit && ` ${range.unit}`}
                          </div>
                        </div>
                      </button>

                      <div className="p-2 bg-white border-t border-gray-200">
                        <LabRangeBar range={range} value={value || null} />
                      </div>

                      {isExameExpandido && (
                        <div className="p-2 bg-white border-t border-gray-200">
                          <label className="block text-xs font-medium text-black mb-1.5">Evolução Temporal</label>
                          {temHistorico ? (
                            <TrendLine
                              data={dadosGrafico}
                              dataKeys={[{ key: campo.field, name: range.label, stroke: '#10b981', dot: true }]}
                              xKey="data"
                              height={150}
                              xAxisLabel="Data"
                              yAxisLabel={range.unit || ''}
                              formatter={(v: any) => (v !== null ? `${parseFloat(v).toFixed(1)}` : 'N/A')}
                              referenceLines={[
                                { value: range.min, label: `Min: ${range.min}`, stroke: '#ef4444', strokeDasharray: '5 5' },
                                { value: range.max, label: `Max: ${range.max}`, stroke: '#ef4444', strokeDasharray: '5 5' },
                              ]}
                            />
                          ) : (
                            <div className="h-[150px] flex items-center justify-center border border-gray-200 rounded-md bg-gray-50">
                              <p className="text-xs text-black">Sem dados históricos</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });

                if (isLgViewport) {
                  return (
                    <div key={secao.sectionId} className="border border-gray-200 rounded-lg overflow-hidden min-w-0 flex flex-col bg-white">
                      <div className="p-2.5 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${secaoComExameForaDaFaixa ? 'bg-red-500' : 'bg-green-500'}`}
                            aria-hidden="true"
                          />
                          <h4 className="font-semibold text-black text-sm">{secao.section}</h4>
                        </div>
                      </div>
                      <div className="p-2.5 grid grid-cols-3 gap-4 flex-1 min-w-0">{blocosCampos}</div>
                    </div>
                  );
                }

                return (
                  <div key={secao.sectionId} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSecao(secaoKey)}
                      className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${secaoComExameForaDaFaixa ? 'bg-red-500' : 'bg-green-500'}`}
                          aria-hidden="true"
                        />
                        <h4 className="font-semibold text-black text-left text-sm">{secao.section}</h4>
                      </div>
                      {isSecaoExpandida ? (
                        <ChevronUp className="w-4 h-4 text-black" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-black" />
                      )}
                    </button>

                    {isSecaoExpandida && (
                      <div className="p-2.5 space-y-2">
                        {blocosCampos}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'aplicacoes': {
        // Sem médico e sem solicitação em aberto: precisa procurar médico
        if (semMedicoNemSolicitacao) {
          return (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full mb-4">
                  <Stethoscope className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Vínculo com médico necessário
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-lg mx-auto">
                  Para acessar as páginas Exames, Aplicações, Nutri e Personal, você precisa primeiro ser vinculado a um médico. 
                  Preencha as informações e escolha um médico na sua região.
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModalDadosPaciente(); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Stethoscope className="w-5 h-5" />
                  Buscar Médico
                </button>
              </div>
            </div>
          );
        }

        const planoTerapeutico = paciente?.planoTerapeutico;
        const evolucao = paciente?.evolucaoSeguimento || [];
        
        // Função para converter dia da semana
        const diaSemanaNome = (dia: string) => {
          const dias: { [key: string]: string } = {
            seg: 'Segunda-feira',
            ter: 'Terça-feira',
            qua: 'Quarta-feira',
            qui: 'Quinta-feira',
            sex: 'Sexta-feira',
            sab: 'Sábado',
            dom: 'Domingo'
          };
          return dias[dia] || dia;
        };
        
        // Função para obter aplicações do mês
        const obterAplicacoesMes = () => {
          if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
            return [];
          }

          const ano = mesCalendario.getFullYear();
          const mes = mesCalendario.getMonth();
          const mesInicio = new Date(ano, mes, 1);
          const mesFim = new Date(ano, mes + 1, 0);
          mesFim.setHours(23, 59, 59);

          const diasSemana: { [key: string]: number } = {
            dom: 0,
            seg: 1,
            ter: 2,
            qua: 3,
            qui: 4,
            sex: 5,
            sab: 6
          };

          const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
          const primeiraDose = new Date(planoTerapeutico.startDate);
          primeiraDose.setHours(0, 0, 0, 0);
          while (primeiraDose.getDay() !== diaDesejado) {
            primeiraDose.setDate(primeiraDose.getDate() + 1);
          }

          const numeroSemanas = planoTerapeutico?.numeroSemanasTratamento || 18;
          const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
          const aplicacoes: Array<{
            data: Date;
            semana: number;
            dose: number;
            status: 'tomada' | 'perdida' | 'hoje' | 'futura' | 'cancelada';
            adherence?: string | null;
            localAplicacao?: string | null;
          }> = [];

          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);

          for (let semana = 0; semana < numeroSemanas; semana++) {
            const semanaNum = semana + 1;
            const isCancelada = semanasCanceladas.includes(semanaNum);
            
            const dataDose = new Date(primeiraDose);
            dataDose.setDate(primeiraDose.getDate() + (semana * 7));
            
            // Verificar se está no mês do calendário
            if (dataDose >= mesInicio && dataDose <= mesFim) {
              // Encontrar registro de evolução
              const registroEvolucao = evolucao.find(e => {
                if (!e.dataRegistro) return false;
                const dataRegistro = new Date(e.dataRegistro);
                if (isNaN(dataRegistro.getTime())) return false;
                dataRegistro.setHours(0, 0, 0, 0);
                const diffDias = Math.abs((dataRegistro.getTime() - dataDose.getTime()) / (1000 * 60 * 60 * 24));
                return diffDias <= 1;
              });

              let status: 'tomada' | 'perdida' | 'hoje' | 'futura' | 'cancelada';
              if (isCancelada) {
                status = 'cancelada';
              } else if (dataDose.getTime() === hoje.getTime()) {
                status = 'hoje';
              } else if (dataDose < hoje) {
                if (registroEvolucao && registroEvolucao.adherence && registroEvolucao.adherence !== 'MISSED') {
                  status = 'tomada';
                } else {
                  status = 'perdida';
                }
              } else {
                status = 'futura';
              }

              const doseInicial = planoTerapeutico.currentDoseMg || 2.5;
              let dose = doseInicial + (Math.floor(semana / 4) * 2.5);
              
              if (planoTerapeutico.esquemaDosesCustomizado && planoTerapeutico.esquemaDosesCustomizado[semanaNum]) {
                dose = planoTerapeutico.esquemaDosesCustomizado[semanaNum];
              } else if (registroEvolucao?.doseAplicada) {
                dose = registroEvolucao.doseAplicada.quantidade || dose;
              }

              aplicacoes.push({
                data: dataDose,
                semana: semanaNum,
                dose,
                status,
                adherence: registroEvolucao?.adherence || null,
                localAplicacao: registroEvolucao?.localAplicacao || null
              });
            }
          }

          return aplicacoes;
        };

        // Função para renderizar calendário
        const renderizarCalendario = () => {
          const ano = mesCalendario.getFullYear();
          const mes = mesCalendario.getMonth();
          const aplicacoes = obterAplicacoesMes();

          // Primeiro dia do mês
          const primeiroDia = new Date(ano, mes, 1);
          const ultimoDia = new Date(ano, mes + 1, 0);
          
          // Dia da semana do primeiro dia (0 = domingo, 6 = sábado)
          const diaSemanaPrimeiro = primeiroDia.getDay();
          
          // Número de dias no mês
          const diasNoMes = ultimoDia.getDate();
          
          // Array para os dias do calendário
          const dias: (Date | null)[] = [];
          
          // Adicionar dias vazios antes do primeiro dia
          for (let i = 0; i < diaSemanaPrimeiro; i++) {
            dias.push(null);
          }
          
          // Adicionar dias do mês
          for (let dia = 1; dia <= diasNoMes; dia++) {
            dias.push(new Date(ano, mes, dia));
          }

          const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

          const mudarMes = (direcao: 'anterior' | 'proximo') => {
            const novoMes = new Date(mesCalendario);
            if (direcao === 'anterior') {
              novoMes.setMonth(mes - 1);
            } else {
              novoMes.setMonth(mes + 1);
            }
            setMesCalendario(novoMes);
            setDiaSelecionado(null);
          };

          const handleDiaClick = (data: Date | null) => {
            if (!data) return;
            
            const aplicacoesDoDia = aplicacoes.filter(a => {
              return a.data.getDate() === data.getDate() &&
                     a.data.getMonth() === data.getMonth() &&
                     a.data.getFullYear() === data.getFullYear();
            });

            setDiaSelecionado(data);
            setAplicacoesDiaSelecionado(aplicacoesDoDia);
          };

          const evolucaoChartBlock =
            paciente &&
            (() => {
              const d = buildDepoimentoResultadoFromPaciente(paciente, classificacaoMedico ?? 0, '');
              if (d.evolucao.length === 0) return null;
              return (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden p-4 sm:p-6">
                  <EvolucaoTratamentoChart evolucao={d.evolucao} pacienteId={d.pacienteId} />
                </div>
              );
            })();

          return (
            <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
              {/* Coluna esquerda (desktop): calendário */}
              <div className="space-y-4 sm:space-y-6 min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Calendário de Aplicações</h2>
                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => mudarMes('anterior')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      aria-label="Mês anterior"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white flex-1 text-center sm:flex-none min-w-[140px]">
                      {meses[mes]} {ano}
                    </span>
                    <button
                      onClick={() => mudarMes('proximo')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      aria-label="Próximo mês"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => {
                        setMesCalendario(new Date());
                        setDiaSelecionado(null);
                      }}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
                    >
                      Hoje
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                    {diasSemana.map(dia => (
                      <div key={dia} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
                        {dia}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {dias.map((dia, index) => {
                      const aplicacoesDoDia = dia ? aplicacoes.filter(a => {
                        return a.data.getDate() === dia.getDate() &&
                               a.data.getMonth() === dia.getMonth() &&
                               a.data.getFullYear() === dia.getFullYear();
                      }) : [];

                      const hoje = new Date();
                      const eHoje = dia && dia.getDate() === hoje.getDate() &&
                                    dia.getMonth() === hoje.getMonth() &&
                                    dia.getFullYear() === hoje.getFullYear();

                      const temAplicacao = aplicacoesDoDia.length > 0;
                      const aplicacao = aplicacoesDoDia[0];

                      // Determinar cor baseado no status: Verde (tomada), Vermelho (perdida), Cinza (futura/cancelada)
                      let corFundo = '';
                      let corBadge = '';
                      if (dia === null) {
                        corFundo = 'bg-gray-50 dark:bg-gray-800';
                      } else if (temAplicacao && aplicacao) {
                        if (aplicacao.status === 'tomada') {
                          corFundo = 'bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50';
                          corBadge = 'bg-green-600 text-white';
                        } else if (aplicacao.status === 'perdida') {
                          corFundo = 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50';
                          corBadge = 'bg-red-600 text-white';
                        } else {
                          // Futura ou cancelada - cinza
                          corFundo = 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600';
                          corBadge = 'bg-gray-500 text-white';
                        }
                      } else {
                        corFundo = 'hover:bg-gray-50 dark:hover:bg-gray-700';
                      }

                      const isDiaSelecionado =
                        !!dia &&
                        !!diaSelecionado &&
                        dia.getDate() === diaSelecionado.getDate() &&
                        dia.getMonth() === diaSelecionado.getMonth() &&
                        dia.getFullYear() === diaSelecionado.getFullYear();

                      return (
                        <div
                          key={index}
                          onClick={() => handleDiaClick(dia)}
                          className={`min-h-[60px] sm:min-h-20 md:min-h-24 border border-gray-200 dark:border-gray-700 p-1 sm:p-2 cursor-pointer transition-colors ${corFundo} ${
                            isDiaSelecionado ? 'ring-2 ring-inset ring-blue-500 dark:ring-blue-400 z-[1]' : ''
                          }`}
                        >
                          {dia && (
                            <>
                              <div className={`text-xs sm:text-sm font-medium mb-1 ${
                                eHoje ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {dia.getDate()}
                              </div>
                              {temAplicacao && aplicacao && (
                                <div className="space-y-0.5 sm:space-y-1">
                                  <div
                                    className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 sm:py-1 rounded truncate font-medium ${corBadge}`}
                                    title={`${aplicacao.dose} mg - Semana ${aplicacao.semana}`}
                                  >
                                    {aplicacao.dose}mg
                                  </div>
                                  {aplicacoesDoDia.length > 1 && (
                                    <div className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                                      +{aplicacoesDoDia.length - 1}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Coluna direita (desktop): evolução + aplicações do dia selecionado */}
              <div className="space-y-4 sm:space-y-6 min-w-0 lg:sticky lg:top-4">
                {evolucaoChartBlock}

                {diaSelecionado && paciente && aplicacoesDiaSelecionado.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50 p-4 sm:p-5 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Nenhuma aplicação planejada em{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      .
                    </p>
                  </div>
                )}

                {!diaSelecionado && paciente && (
                  <div className="hidden lg:flex rounded-lg border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/40 p-5 items-center justify-center text-center min-h-[120px]">
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                      Selecione uma data no calendário para ver as aplicações daquele dia — dose, status e variações de peso e cintura quando houver registro.
                    </p>
                  </div>
                )}

              {/* Detalhes do dia selecionado */}
              {diaSelecionado && aplicacoesDiaSelecionado.length > 0 && paciente && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1">
                    Aplicações em {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 sm:mb-5">
                    Variações em relação ao registro anterior (última aplicação ou medidas iniciais), quando houver dados.
                  </p>
                  <div className="space-y-4">
                    {aplicacoesDiaSelecionado.map((aplicacao, idx) => {
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      const dataAplic = new Date(aplicacao.data);
                      dataAplic.setHours(0, 0, 0, 0);
                      const foiFeita = aplicacaoFoiFeitaNoPaciente(paciente, aplicacao.data);
                      const variacaoPeso = foiFeita
                        ? obterVariacaoPesoAplicacao(paciente, aplicacao.data)
                        : obterUltimaVariacaoPesoPaciente(paciente);
                      const variacaoComp = foiFeita
                        ? obterVariacaoCompAplicacao(paciente, aplicacao.data)
                        : obterUltimaVariacaoCompPaciente(paciente);
                      const registro = obterRegistroSeguimentoDaAplicacao(paciente, aplicacao.data);
                      const localSugerido = localPlanejadoParaSemana(aplicacao.semana);
                      const localCodigo =
                        (aplicacao.localAplicacao as string | null) || registro?.localAplicacao || null;
                      const dataAplicStr = formatarDataAplicacaoISO(aplicacao.data);
                      const loadKey = `${dataAplicStr}-${aplicacao.semana}`;
                      const carregandoLink = preencherAplicacaoLoadingKey === loadKey;
                      const ehHojeAplicacao = dataAplic.getTime() === hoje.getTime();
                      const podeLinkPreencher =
                        ehHojeAplicacao &&
                        aplicacao.status !== 'cancelada' &&
                        !!paciente.id;

                      return (
                        <div
                          key={idx}
                          className={`p-4 sm:p-5 rounded-xl border ${
                            aplicacao.status === 'tomada'
                              ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : aplicacao.status === 'perdida'
                              ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : aplicacao.status === 'hoje'
                              ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : aplicacao.status === 'cancelada'
                              ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-base font-semibold text-gray-900 dark:text-white">
                                  Semana {aplicacao.semana} · {aplicacao.dose} mg
                                </div>
                                {aplicacao.status === 'tomada' ? (
                                  <span className="inline-flex px-2.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">
                                    ✓ Tomada
                                  </span>
                                ) : aplicacao.status === 'perdida' ? (
                                  <span className="inline-flex px-2.5 py-0.5 bg-red-600 text-white text-xs font-medium rounded-full">
                                    ✗ Perdida
                                  </span>
                                ) : aplicacao.status === 'hoje' ? (
                                  <span className="inline-flex px-2.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                                    Hoje
                                  </span>
                                ) : aplicacao.status === 'cancelada' ? (
                                  <span className="inline-flex px-2.5 py-0.5 bg-gray-500 text-white text-xs font-medium rounded-full">
                                    Cancelada
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2.5 py-0.5 bg-gray-500 text-white text-xs font-medium rounded-full">
                                    Futura
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                                <div className="rounded-lg bg-white/70 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-600 px-3 py-2">
                                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Local de aplicação
                                  </p>
                                  <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                                    {localCodigo
                                      ? labelLocalAplicacao(localCodigo)
                                      : `Sugerido: ${labelLocalAplicacao(localSugerido)}`}
                                  </p>
                                  {!localCodigo && (
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                      Rotação semanal (abdômen · coxa · braço). Confirme no preenchimento.
                                    </p>
                                  )}
                                </div>
                                <div className="rounded-lg bg-white/70 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-600 px-3 py-2">
                                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Δ Peso (vs anterior)
                                  </p>
                                  <p
                                    className={`font-semibold mt-0.5 ${
                                      variacaoPeso == null
                                        ? 'text-gray-500 dark:text-gray-400'
                                        : variacaoPeso <= 0
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-amber-700 dark:text-amber-400'
                                    }`}
                                  >
                                    {variacaoPeso == null
                                      ? '—'
                                      : `${variacaoPeso > 0 ? '+' : ''}${variacaoPeso.toFixed(1)} kg`}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-white/70 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-600 px-3 py-2 sm:col-span-2">
                                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Δ Circunferência abdominal (vs anterior)
                                  </p>
                                  <p
                                    className={`font-semibold mt-0.5 ${
                                      variacaoComp == null
                                        ? 'text-gray-500 dark:text-gray-400'
                                        : variacaoComp <= 0
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-amber-700 dark:text-amber-400'
                                    }`}
                                  >
                                    {variacaoComp == null
                                      ? '—'
                                      : `${variacaoComp > 0 ? '+' : ''}${variacaoComp.toFixed(1)} cm`}
                                  </p>
                                </div>
                              </div>

                              {registro?.peso != null && typeof registro.peso === 'number' && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Peso neste registro:{' '}
                                  <span className="font-medium text-gray-900 dark:text-white">{registro.peso.toFixed(1)} kg</span>
                                  {registro.circunferenciaAbdominal != null &&
                                    typeof registro.circunferenciaAbdominal === 'number' && (
                                      <>
                                        {' · '}Cintura:{' '}
                                        <span className="font-medium text-gray-900 dark:text-white">
                                          {registro.circunferenciaAbdominal.toFixed(1)} cm
                                        </span>
                                      </>
                                    )}
                                </p>
                              )}

                              {aplicacao.adherence && aplicacao.status === 'tomada' && (
                                <div
                                  className={`text-xs font-medium ${
                                    aplicacao.adherence === 'ON_TIME'
                                      ? 'text-green-700 dark:text-green-400'
                                      : 'text-amber-700 dark:text-amber-400'
                                  }`}
                                >
                                  {aplicacao.adherence === 'ON_TIME' ? '✓ Aplicação pontual' : '⚠ Aplicação registrada com atraso'}
                                </div>
                              )}
                            </div>
                          </div>

                          {podeLinkPreencher && (
                            <div className="mt-4 pt-3 border-t border-gray-200/80 dark:border-gray-600">
                              <button
                                type="button"
                                disabled={carregandoLink}
                                onClick={async () => {
                                  if (!paciente.id) return;
                                  setPreencherAplicacaoLoadingKey(loadKey);
                                  try {
                                    const res = await fetch(
                                      `/api/aplicacao/link?pacienteId=${encodeURIComponent(paciente.id)}&data=${encodeURIComponent(dataAplicStr)}&semana=${encodeURIComponent(String(aplicacao.semana))}&dose=${encodeURIComponent(String(aplicacao.dose))}`
                                    );
                                    const json = await res.json();
                                    if (!res.ok) throw new Error(json.error || 'Erro ao abrir link');
                                    const url = json.url as string;
                                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                  } catch (e) {
                                    alert(e instanceof Error ? e.message : 'Não foi possível abrir o formulário da aplicação.');
                                  } finally {
                                    setPreencherAplicacaoLoadingKey(null);
                                  }
                                }}
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                              >
                                {carregandoLink ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                    Abrindo…
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="w-4 h-4 shrink-0" />
                                    Preencher dados da aplicação (mesmo link enviado pelo médico)
                                  </>
                                )}
                              </button>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                                Usa o mesmo endereço gerado para o WhatsApp no painel do médico. Abre em uma nova aba; você pode
                                voltar ao app depois de salvar.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            </div>
          );
        };

        // Calcular total de aplicações e mg
        const calcularEstatisticas = () => {
          if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
            return { totalAplicacoes: 0, totalMg: 0 };
          }

          const diasSemana: { [key: string]: number } = {
            dom: 0,
            seg: 1,
            ter: 2,
            qua: 3,
            qui: 4,
            sex: 5,
            sab: 6
          };

          const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
          const primeiraDose = new Date(planoTerapeutico.startDate);
          primeiraDose.setHours(0, 0, 0, 0);
          while (primeiraDose.getDay() !== diaDesejado) {
            primeiraDose.setDate(primeiraDose.getDate() + 1);
          }

          const numeroSemanas = planoTerapeutico?.numeroSemanasTratamento || 18;
          const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
          const doseInicial = planoTerapeutico.currentDoseMg || 2.5;
          let totalAplicacoes = 0;
          let totalMg = 0;

          for (let semana = 0; semana < numeroSemanas; semana++) {
            const semanaNum = semana + 1;
            const isCancelada = semanasCanceladas.includes(semanaNum);
            
            if (!isCancelada) {
              totalAplicacoes++;
              
              let dose = doseInicial + (Math.floor(semana / 4) * 2.5);
              
              if (planoTerapeutico.esquemaDosesCustomizado && planoTerapeutico.esquemaDosesCustomizado[semanaNum]) {
                dose = planoTerapeutico.esquemaDosesCustomizado[semanaNum];
              }
              
              totalMg += dose;
            }
          }

          return { totalAplicacoes, totalMg };
        };

        // Função para obter estilo do status do tratamento
        const obterEstiloStatus = (status: string) => {
          switch (status) {
            case 'pendente':
              return {
                label: 'Pendente',
                cor: 'text-orange-600',
                bgGradient: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'
              };
            case 'em_tratamento':
              return {
                label: 'Em Tratamento',
                cor: 'text-green-600',
                bgGradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
              };
            case 'concluido':
              return {
                label: 'Concluído',
                cor: 'text-red-600',
                bgGradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
              };
            case 'abandono':
              return {
                label: 'Abandono',
                cor: 'text-yellow-600',
                bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
              };
            default:
              return {
                label: status,
                cor: 'text-gray-600',
                bgGradient: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
              };
          }
        };

        const estatisticas = calcularEstatisticas();
        const estiloStatus = paciente?.statusTratamento ? obterEstiloStatus(paciente.statusTratamento) : null;

        // Vídeo ao lado do título; ícone ~80% do FAB anterior (h-14 → 2.8rem)
        const tituloAplicacoesComVideo = (
          <div className="flex items-center justify-between gap-3 w-full min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white min-w-0 flex-1">Aplicações</h2>
            <button
              type="button"
              onClick={abrirVideoAplicacaoPacienteMeta}
              disabled={videoUrlLoadingAplicacaoMeta}
              className="flex flex-col items-center gap-0.5 shrink-0 border-0 bg-transparent p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-gray-900 rounded-md disabled:opacity-55 disabled:pointer-events-none"
              aria-label="Assistir vídeo de como fazer a aplicação"
              title="Vídeo da aplicação"
            >
              <span className="flex h-[2.8rem] w-[2.8rem] items-center justify-center rounded-full bg-[#ff0000] text-white shadow-[0_4px_14px_rgba(255,0,0,0.4),0_2px_6px_rgba(0,0,0,0.1)] transition-transform hover:scale-105 hover:bg-[#e60000] active:scale-95">
                {videoUrlLoadingAplicacaoMeta ? (
                  <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" aria-hidden />
                ) : (
                  <Play className="h-[1.4rem] w-[1.4rem] fill-white text-white translate-x-px" aria-hidden />
                )}
              </span>
              <span className="rounded bg-white/95 px-1.5 py-px text-center text-[8.8px] font-semibold leading-tight text-gray-900 shadow-sm ring-1 ring-black/5 dark:bg-gray-900/95 dark:text-gray-100 dark:ring-white/10">
                Aplicação
              </span>
            </button>
          </div>
        );

        const modalVideoAplicacaoMetaEl = showModalVideoAplicacaoMeta && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) fecharModalVideoAplicacaoMeta();
            }}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-4 sm:p-6 max-h-[min(85vh,calc(100dvh-2rem))] overflow-y-auto overscroll-contain"
              role="dialog"
              aria-modal="true"
              aria-labelledby="meta-video-aplicacao-titulo"
              onClick={(e) => e.stopPropagation()}
            >
              {modalVideoAplicacaoMetaPlayer && (
                <div>
                  <div className="flex justify-between items-center mb-3 gap-2">
                    <h3 id="meta-video-aplicacao-titulo" className="text-lg font-semibold text-gray-900 dark:text-white">
                      Como fazer a aplicação
                    </h3>
                    <button
                      type="button"
                      onClick={fecharModalVideoAplicacaoMeta}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded shrink-0"
                      aria-label="Fechar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                    {videoSignedUrlAplicacaoMeta ? (
                      <video src={videoSignedUrlAplicacaoMeta} controls className="w-full h-full" autoPlay />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 min-h-[160px]">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

        if (!planoTerapeutico) {
          return (
            <div className="space-y-4">
              {tituloAplicacoesComVideo}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
                <Calendar className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum plano cadastrado</h3>
                <p className="text-gray-500 dark:text-gray-400">Seu calendário de aplicações aparecerá aqui quando um plano terapêutico for cadastrado.</p>
              </div>
              {modalVideoAplicacaoMetaEl}
            </div>
          );
        }
        
        return (
          <div className="space-y-4 sm:space-y-6">
            {tituloAplicacoesComVideo}

            {/* Informações do Plano */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 relative overflow-hidden">
              {/* Status do Tratamento no canto superior direito */}
              {estiloStatus && (
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
                  <div 
                    className={`${estiloStatus.cor} px-3 py-2 rounded-full inline-flex items-center gap-2 shadow-sm`}
                    style={{ 
                      height: '30px',
                      background: estiloStatus.bgGradient
                    }}
                  >
                    <span className="text-sm font-medium">{estiloStatus.label}</span>
                  </div>
                </div>
              )}
              
              {/* Linha 1: Data de Início e Dia da Aplicação */}
              <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
                      <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Data de Início</label>
                      <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {planoTerapeutico.startDate 
                          ? new Date(planoTerapeutico.startDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl flex items-center justify-center shadow-sm">
                      <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Dia da Aplicação</label>
                      <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {planoTerapeutico.injectionDayOfWeek 
                          ? diaSemanaNome(planoTerapeutico.injectionDayOfWeek)
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Linha 2: Quantidade de Doses e Pagamentos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center shadow-sm">
                    <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Quantidade de Doses</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {estatisticas.totalAplicacoes} aplicações • {estatisticas.totalMg.toFixed(1)} mg total
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModalPagamentos(true)}
                  className="flex items-center gap-3 text-left w-full rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors p-0"
                >
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl flex items-center justify-center shadow-sm">
                    <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Pagamentos</label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {loadingPagamento ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando...
                        </span>
                      ) : pagamentoPaciente && (pagamentoPaciente.valorTotal ?? 0) > 0 ? (
                        <>R$ {(pagamentoPaciente.valorTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Calendário Visual */}
            {renderizarCalendario()}
            {modalVideoAplicacaoMetaEl}
          </div>
        );
      }

      case 'nutri': {
        const isLoadingNutriMode = !!searchParams.get('pacienteId') && loadingPaciente;
        if (!paciente) {
          if (isLoadingNutriMode) {
            return (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-600 border-t-transparent mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando paciente...</p>
              </div>
            );
          }
          return (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full mb-4">
                  <Stethoscope className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Vínculo com médico necessário
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-lg mx-auto">
                  Para acessar as páginas Nutri e Personal, você precisa primeiro ser vinculado a um médico. 
                  Preencha as informações e escolha um médico na sua região.
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModalDadosPaciente(); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Stethoscope className="w-5 h-5" />
                  Buscar Médico
                </button>
              </div>
            </div>
          );
        }

        if (isNutricionistaMode) {
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => router.push('/metanutri')}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>
                <span className="px-3 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-md">
                  Paciente: <span className="font-semibold">{paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || '—'}</span>
                </span>
              </div>
              <NutriContent
                paciente={paciente}
                modoNutricionista
                chatNutriDataSelecionada={chatNutriDataSelecionada || new Date().toISOString().split('T')[0]}
                onChatNutriDataChange={(d) => setChatNutriDataSelecionada(d)}
              />
            </div>
          );
        }

        // Sem médico e sem solicitação em aberto: precisa procurar médico
        if (semMedicoNemSolicitacao) {
          return (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full mb-4">
                  <Stethoscope className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Vínculo com médico necessário
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-lg mx-auto">
                  Para acessar as páginas Nutri e Personal, você precisa primeiro ser vinculado a um médico. 
                  Preencha as informações e escolha um médico na sua região.
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModalDadosPaciente(); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Stethoscope className="w-5 h-5" />
                  Buscar Médico
                </button>
              </div>
            </div>
          );
        }
        
        return (
          <NutriContent
            paciente={paciente}
            chatNutriDataSelecionada={chatNutriDataSelecionada || new Date().toISOString().split('T')[0]}
            onChatNutriDataChange={(d) => setChatNutriDataSelecionada(d)}
          />
        );
      }

      case 'personal': {
        // Sem médico e sem solicitação em aberto: precisa procurar médico
        if (semMedicoNemSolicitacao) {
          return (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full mb-4">
                  <Stethoscope className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Vínculo com médico necessário
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-lg mx-auto">
                  Para acessar as páginas Nutri e Personal, você precisa primeiro ser vinculado a um médico. 
                  Preencha as informações e escolha um médico na sua região.
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModalDadosPaciente(); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Stethoscope className="w-5 h-5" />
                  Buscar Médico
                </button>
              </div>
            </div>
          );
        }

        // Paciente vinculado: exibir conteúdo Personal embutido (igual ao Nutri, mantém menu superior/inferior)
        return (
          <Suspense fallback={
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
            </div>
          }>
            <PersonalPageContent embedded pacienteProp={paciente} />
          </Suspense>
        );
      }

      case 'indicar': {
        // Função para validar telefone brasileiro (DDD + 9 dígitos)
        const validarTelefone = (telefone: string): boolean => {
          // Remove caracteres não numéricos
          const numeros = telefone.replace(/\D/g, '');
          // Deve ter 11 dígitos (2 DDD + 9 número) ou 10 dígitos (2 DDD + 8 número - formato antigo)
          // Aceitamos ambos, mas preferimos 11 dígitos
          return numeros.length === 10 || numeros.length === 11;
        };

        // Função para formatar telefone
        const formatarTelefone = (telefone: string): string => {
          const numeros = telefone.replace(/\D/g, '');
          if (numeros.length === 10) {
            return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
          } else if (numeros.length === 11) {
            return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
          }
          return telefone;
        };

        // Filtrar médicos por estado e cidade
        const medicosFiltrados = indicacaoForm.estado && indicacaoForm.cidade
          ? todosMedicosDisponiveis.filter(medico => 
              medico.cidades.some(c => 
                c.estado === indicacaoForm.estado && c.cidade === indicacaoForm.cidade
              )
            )
          : [];

        // Estados disponíveis (apenas os que têm médicos cadastrados)
        const estadosComMedicos = Array.from(new Set(
          todosMedicosDisponiveis
            .flatMap(m => m.cidades)
            .map(c => c.estado)
        )).sort();

        // Cidades disponíveis para o estado selecionado
        const cidadesDoEstado = indicacaoForm.estado
          ? Array.from(new Set(
              todosMedicosDisponiveis
                .flatMap(m => m.cidades)
                .filter(c => c.estado === indicacaoForm.estado)
                .map(c => c.cidade)
            )).sort()
          : [];

        const handleSalvarIndicacao = async () => {
          if (!user?.email || !paciente) {
            alert('Erro: Usuário não encontrado. Recarregue a página.');
            return;
          }

          if (!indicacaoForm.estado || !indicacaoForm.cidade || !indicacaoForm.medicoId || !indicacaoForm.nomePaciente || !indicacaoForm.telefonePaciente) {
            alert('Por favor, preencha todos os campos.');
            return;
          }

          // Validar telefone
          if (!validarTelefone(indicacaoForm.telefonePaciente)) {
            alert('Telefone inválido. Digite o DDD e o número com 9 dígitos (ex: (11) 98765-4321).');
            return;
          }

          setSalvandoIndicacao(true);
          try {
            const medicoSelecionado = todosMedicosDisponiveis.find(m => m.id === indicacaoForm.medicoId);
            if (!medicoSelecionado) {
              alert('Médico não encontrado.');
              return;
            }

            // Normalizar telefone (remover formatação)
            const telefoneNormalizado = indicacaoForm.telefonePaciente.replace(/\D/g, '');

            await IndicacaoService.criarIndicacao({
              indicadoPor: user.email,
              indicadoPorNome: paciente.nome || user.displayName || 'Paciente',
              indicadoPorTelefone: paciente.dadosIdentificacao?.telefone?.replace(/\D/g, '') || '',
              nomePaciente: indicacaoForm.nomePaciente.trim(),
              telefonePaciente: telefoneNormalizado,
              estado: indicacaoForm.estado,
              cidade: indicacaoForm.cidade,
              medicoId: indicacaoForm.medicoId,
              medicoNome: medicoSelecionado.nome
            });

            alert('Encaminhamento enviado com sucesso! O médico será notificado.');
            
            // Limpar formulário
            setIndicacaoForm({
              estado: '',
              cidade: '',
              medicoId: '',
              nomePaciente: '',
              telefonePaciente: ''
            });

            // Recarregar minhas indicações se estiver na aba
            if (activeTabIndicar === 'minhas') {
              setMinhasIndicacoes([]); // Resetar para forçar reload
            }
          } catch (error) {
            console.error('Erro ao salvar encaminhamento:', error);
            alert('Erro ao salvar encaminhamento. Tente novamente.');
          } finally {
            setSalvandoIndicacao(false);
          }
        };

        const getStatusLabel = (status: Indicacao['status']) => {
          switch (status) {
            case 'pendente':
              return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
            case 'visualizada':
              return { label: 'Visualizada', color: 'bg-blue-100 text-blue-800', icon: Eye };
            case 'venda':
              return { label: 'Virou Venda', color: 'bg-green-100 text-green-800', icon: CheckCircle };
            case 'paga':
              return { label: 'Paga', color: 'bg-purple-100 text-purple-800', icon: DollarSign };
            default:
              return { label: 'Pendente', color: 'bg-gray-100 text-gray-800', icon: Clock };
          }
        };

        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Encaminhamentos</h2>
            
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTabIndicar('indicar')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTabIndicar === 'indicar'
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Encaminhar
                </button>
                <button
                  onClick={() => setActiveTabIndicar('minhas')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTabIndicar === 'minhas'
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Meus Encaminhamentos
                </button>
              </div>

              {/* Conteúdo das tabs */}
              <div className="p-6">
                {activeTabIndicar === 'indicar' ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Encaminhar Paciente</h2>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Indique seu próprio médico</h3>
                      <p className="text-sm font-medium text-gray-700 mb-2">📌 Compartilhe o médico que está te acompanhando</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        Use o link do seu médico para que outras pessoas possam solicitar tratamento diretamente com ele.
                      </p>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 mb-2">
                          <strong>Como funciona:</strong>
                        </p>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                          <li>Você copia o link do seu médico</li>
                          <li>Envia o link para amigos e familiares (por WhatsApp ou como preferir)</li>
                          <li>Quem recebe o link preenche os dados e solicita tratamento com o seu médico</li>
                          <li>O médico recebe a solicitação e decide sobre o início do tratamento</li>
                        </ul>
                      </div>
                    </div>

                    {/* Seção: Link do meu médico */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {!paciente || !paciente.medicoResponsavelId || !medicoResponsavel ? (
                        <div className="text-sm text-gray-700">
                          <p className="font-semibold mb-1">Você ainda não tem um médico responsável cadastrado.</p>
                          <p className="text-gray-600">
                            Assim que estiver em tratamento com um médico, você poderá compartilhar um link para que outras pessoas solicitem tratamento com ele.
                          </p>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Compartilhe o link do seu médico
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Envie este link para que outras pessoas possam solicitar tratamento com o mesmo médico que acompanha você.
                          </p>
                          {(() => {
                            const normalizar = (str: string) =>
                              (str || '')
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .toLowerCase()
                                .trim();
                            const gerarSlug = (nomeCompleto: string) => {
                              const partes = (nomeCompleto || '')
                                .split(/\s+/)
                                .filter((p) => p.length > 0);
                              if (partes.length === 0) return '';
                              const first = normalizar(partes[0]);
                              const last = partes.length > 1 ? normalizar(partes[partes.length - 1]) : first;
                              return `${first}-${last}`;
                            };
                            const medicoNome = (medicoResponsavel?.nome || '').trim();
                            const pacienteNome =
                              (paciente?.nome || paciente?.dadosIdentificacao?.nomeCompleto || '').toString().trim();
                            const slugMedico = gerarSlug(medicoNome);
                            const slugPaciente = gerarSlug(pacienteNome);
                            const path =
                              slugMedico && slugPaciente ? `/dr/${slugMedico}/paciente/${slugPaciente}` : '';
                            const origin = typeof window !== 'undefined' ? window.location.origin : '';
                            const url = path ? `${origin}${path}` : '';

                            const abrirModalEvolucao = (acao: 'copiar' | 'whatsapp') => {
                              setLinkPathParaEvolucao(path);
                              setMedicoNomeParaEvolucao(medicoNome);
                              setMedicoGeneroParaEvolucao(medicoResponsavel?.genero === 'F' ? 'F' : 'M');
                              setPendingAcaoEvolucao(acao);
                              setShowModalEvolucao(true);
                            };

                            return path ? (
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={url}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-700 bg-gray-50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => abrirModalEvolucao('copiar')}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium text-gray-800"
                                  >
                                    <Copy size={16} />
                                    Copiar link
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => abrirModalEvolucao('whatsapp')}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
                                >
                                  <MessageCircleIcon size={18} />
                                  Enviar no WhatsApp
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">
                                Não foi possível gerar o link de encaminhamento. Tente novamente mais tarde.
                              </p>
                            );
                          })()}
                        </>
                      )}
                    </div>

                    {showModalEvolucao && pendingAcaoEvolucao && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Compartilhar evolução
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Quer mostrar sua evolução no tratamento para quem você está indicando? Assim a pessoa consegue ver, com números e gráficos, os resultados reais que você está alcançando.
                          </p>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                const pathFinal = `${linkPathParaEvolucao}?evolucao=1`;
                                const urlFinal = `${origin}${pathFinal}`;
                                const tituloMedico = medicoGeneroParaEvolucao === 'F' ? 'Dra.' : 'Dr.';
                                const medicoLabel = medicoNomeParaEvolucao ? `${tituloMedico} ${medicoNomeParaEvolucao}` : 'médico';
                                const msg = `Oi! Tudo bem?

Queria te indicar o método que usei para emagrecer. Fiz meu tratamento com ${medicoLabel} do *Método Emagrecer*, dentro do sistema da Oftware, e tive um resultado muito bom.

Nesse link você consegue ver também *meu histórico de evolução no tratamento*, como peso inicial e progresso ao longo do tempo:

${urlFinal}

Se você estiver pensando em cuidar do peso ou da saúde metabólica, vale a pena conhecer. Depois me conta o que achou 🙂`;
                                if (pendingAcaoEvolucao === 'copiar') {
                                  navigator.clipboard.writeText(urlFinal).then(() => alert('Link copiado para a área de transferência.')).catch(() => alert('Não foi possível copiar o link.'));
                                } else {
                                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }
                                setShowModalEvolucao(false);
                                setPendingAcaoEvolucao(null);
                              }}
                              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                            >
                              Sim, quero compartilhar minha evolução
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                const urlFinal = `${origin}${linkPathParaEvolucao}`;
                                const msg = `Oi! Tudo bem?

Queria te indicar o *Método Emagrecer*, que foi o tratamento que usei para perder peso com acompanhamento médico pela plataforma da Oftware.

Nesse link você consegue entender como funciona o método e, se quiser, iniciar o processo com um médico:

${urlFinal}

Achei muito organizado e sério. Se tiver interesse, dá uma olhada 🙂`;
                                if (pendingAcaoEvolucao === 'copiar') {
                                  navigator.clipboard.writeText(urlFinal).then(() => alert('Link copiado para a área de transferência.')).catch(() => alert('Não foi possível copiar o link.'));
                                } else {
                                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }
                                setShowModalEvolucao(false);
                                setPendingAcaoEvolucao(null);
                              }}
                              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
                            >
                              Não, prefiro não compartilhar agora
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Meus Encaminhamentos</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Pessoas que solicitaram tratamento via seu link (formulário ou link da aplicação).
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (!user?.email) return;
                          setLoadingEncaminhamentosViaMeuLink(true);
                          SolicitacaoMedicoService.getSolicitacoesPorPacienteIndicador(user.email)
                              .then(async (solicitacoes) => {
                                const comStatus: Array<SolicitacaoMedico & { statusExibicao?: string }> = [...solicitacoes];
                                for (let i = 0; i < comStatus.length; i++) {
                                  const s = comStatus[i];
                                  if (s.status === 'aceita' && s.pacienteId) {
                                    try {
                                      const pac = await PacienteService.getPacienteById(s.pacienteId);
                                      if (pac?.statusTratamento === 'concluido') (comStatus[i] as any).statusExibicao = 'Concluído';
                                      else if (pac?.statusTratamento === 'abandono') (comStatus[i] as any).statusExibicao = 'Abandono';
                                      else if (pac?.statusTratamento === 'pendente') (comStatus[i] as any).statusExibicao = 'Pendente';
                                      else (comStatus[i] as any).statusExibicao = 'Em Tratamento';
                                    } catch {
                                      (comStatus[i] as any).statusExibicao = 'Em Tratamento';
                                    }
                                  } else if (s.status === 'pendente') (comStatus[i] as any).statusExibicao = 'Pendente';
                                  else if (s.status === 'rejeitada') (comStatus[i] as any).statusExibicao = 'Rejeitada';
                                  else if (s.status === 'desistiu') (comStatus[i] as any).statusExibicao = 'Desistiu';
                                }
                                setEncaminhamentosViaMeuLink(comStatus);
                              })
                              .catch(() => setEncaminhamentosViaMeuLink([]))
                              .finally(() => setLoadingEncaminhamentosViaMeuLink(false));
                        }}
                        disabled={loadingEncaminhamentosViaMeuLink}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={16} className={loadingEncaminhamentosViaMeuLink ? 'animate-spin' : ''} />
                        Atualizar
                      </button>
                    </div>

                    {loadingEncaminhamentosViaMeuLink ? (
                      <div className="text-center py-8">
                        <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Carregando...</p>
                      </div>
                    ) : encaminhamentosViaMeuLink.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Share2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Nenhum paciente solicitou tratamento via seu link ainda.</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                          Compartilhe seu link na página de sucesso da aplicação para indicar seu médico.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {encaminhamentosViaMeuLink.map((s) => {
                          const statusExib = (s as any).statusExibicao || (s.status === 'pendente' ? 'Pendente' : s.status === 'aceita' ? 'Em Tratamento' : s.status === 'rejeitada' ? 'Rejeitada' : s.status === 'desistiu' ? 'Desistiu' : '-');
                          const statusColors: Record<string, string> = {
                            Pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
                            'Em Tratamento': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
                            Concluído: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
                            Abandono: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
                            Rejeitada: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
                            Desistiu: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                          };
                          return (
                            <div
                              key={s.id}
                              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                                      {s.pacienteNome || s.pacienteEmail}
                                    </h4>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Solicitado em:{' '}
                                    <span className="font-medium">
                                      {s.criadoEm?.toLocaleDateString('pt-BR') || '-'}
                                    </span>
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusColors[statusExib] || 'bg-gray-100 text-gray-800'}`}
                                  >
                                    {statusExib}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                </div>
            </div>
          </div>
        );
      }

      case 'perfil': {
        if (!paciente && !searchParams.get('pacienteId')) {
          return (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meu Perfil</h2>
              <div className="bg-[#075e54]/10 border border-[#075e54]/30 rounded-xl p-6 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-full bg-[#075e54] flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Preencha seus dados</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Responda às perguntas no formato de chat para cadastrar seus dados, peso, comorbidades e outras informações importantes para o tratamento.</p>
                <button
                  type="button"
                  onClick={() => openModalDadosPaciente()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#25d366] text-white font-medium text-sm hover:bg-[#20bd5a] transition-colors"
                >
                  <MessageSquare size={20} />
                  Abrir questionário em chat
                </button>
              </div>
            </div>
          );
        }
        if (!paciente) {
          return (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meu Perfil</h2>
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Dados não encontrados</h3>
                <p className="text-gray-500">Seus dados aparecerão aqui.</p>
              </div>
            </div>
          );
        }
        
        const dados = paciente.dadosIdentificacao;
        const clinicos = paciente.dadosClinicos;
        const estiloVida = paciente.estiloVida;
        
        // Funções auxiliares para formatação
        const formatarSexo = (sexo?: string) => {
          return sexo === 'M' ? 'Masculino' : sexo === 'F' ? 'Feminino' : '-';
        };
        
        const formatarPadraoAlimentar = (padrao?: string) => {
          const padroes: { [key: string]: string } = {
            'equilibrado': 'Alimentação Equilibrada',
            'hiper_calorico_noturno': 'Hipercalórico Noturno',
            'ultraprocessados': 'Alta Ingestão de Ultraprocessados',
            'baixo_proteico': 'Baixo Teor Proteico',
            'hiperproteico': 'Hiperproteico',
            'jejum_intermitente': 'Jejum Intermitente',
            'vegetariano_vegano': 'Vegetariano/Vegano'
          };
          return padroes[padrao || ''] || padrao || '-';
        };
        
        const formatarFrequenciaAlimentar = (freq?: string) => {
          return freq ? `${freq} refeições/dia` : '-';
        };
        
        const formatarAtividadeFisica = (atividade?: string) => {
          const atividades: { [key: string]: string } = {
            'sedentario': 'Sedentário',
            'leve': 'Leve (1–2x/sem)',
            'moderada': 'Moderada (3–4x/sem)',
            'intensa': 'Intensa (≥5x/sem)',
            'profissional': 'Profissional ou Atleta'
          };
          return atividades[atividade || ''] || atividade || '-';
        };
        
        const formatarUsoAlcool = (uso?: string) => {
          const usos: { [key: string]: string } = {
            'nao_consome': 'Não Consome',
            'social': 'Social',
            'frequente': 'Frequente',
            'abuso': 'Abuso/Diário'
          };
          return usos[uso || ''] || uso || '-';
        };
        
        const formatarTabagismo = (tabagismo?: string) => {
          const tipos: { [key: string]: string } = {
            'nunca_fumou': 'Nunca Fumou',
            'ex_fumante_5': 'Ex-fumante (<5 anos)',
            'ex_fumante_5plus': 'Ex-fumante (>5 anos)',
            'fumante_10': 'Fumante Atual (≤10 cigarros/dia)',
            'fumante_10plus': 'Fumante Atual (>10 cigarros/dia)'
          };
          return tipos[tabagismo || ''] || tabagismo || '-';
        };
        
        const formatarEstresse = (estresse?: string) => {
          const niveis: { [key: string]: string } = {
            'baixo': 'Baixo',
            'moderado': 'Moderado',
            'elevado': 'Elevado',
            'muito_elevado': 'Muito Elevado'
          };
          return niveis[estresse || ''] || estresse || '-';
        };
        
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meu Perfil</h2>
              {!searchParams.get('pacienteId') && (semMedicoNemSolicitacao || !paciente.dadosIdentificacao?.dataNascimento) && (
                <button
                  type="button"
                  onClick={() => openModalDadosPaciente()}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Edit size={16} />
                  Completar ou atualizar dados clínicos
                </button>
              )}
            </div>

            {/* Link destacado para abrir o modal de dados (chat) — quando sem médico nem solicitação em aberto, ou falta data de nascimento */}
            {!searchParams.get('pacienteId') && (semMedicoNemSolicitacao || !paciente.dadosIdentificacao?.dataNascimento) && (
              <div className="bg-[#075e54]/10 border border-[#075e54]/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#075e54] flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Preencher ou atualizar dados de saúde</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Responda no chat (dados, peso, motivação, comorbidades, etc.) — leva poucos minutos.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openModalDadosPaciente()}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#25d366] text-white font-medium text-sm hover:bg-[#20bd5a] transition-colors"
                >
                  <MessageSquare size={18} />
                  Abrir formulário em chat
                </button>
              </div>
            )}
            
            {/* Dados de Identificação */}
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dados de Identificação</h3>
              </div>
              
              <div className="space-y-4">
                {/* Cards principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Nome Completo</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{dados?.nomeCompleto || '-'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">E-mail</p>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-gray-500" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{paciente.email || '-'}</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Telefone</p>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-gray-500" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{dados?.telefone || '-'}</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">CPF</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{dados?.cpf || '-'}</p>
                  </div>
                </div>

                {/* Informações adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Data de Nascimento</p>
                      <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dados?.dataNascimento 
                          ? new Date(dados.dataNascimento).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Sexo Biológico</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatarSexo(dados?.sexoBiologico)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Data de Cadastro</p>
                      <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dados?.dataCadastro 
                          ? new Date(dados.dataCadastro).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                {(dados?.endereco?.cep || dados?.endereco?.rua) && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <p className="text-xs font-medium text-gray-600">Endereço</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {dados?.endereco?.rua ? `${dados.endereco.rua}, ${dados.endereco.cidade}/${dados.endereco.estado}` : dados?.endereco?.cep || '-'}
                    </p>
                  </div>
                )}

                {/* Médico Responsável */}
                {medicoResponsavel && (
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-3 border border-teal-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      <p className="text-xs font-medium text-gray-600">Médico Responsável</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Dados Clínicos */}
            {clinicos && (
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FlaskConical className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dados Clínicos</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Medidas Iniciais */}
                  {clinicos.medidasIniciais && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-3">Medidas Iniciais</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Peso</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {clinicos.medidasIniciais.peso ? `${clinicos.medidasIniciais.peso} kg` : '-'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Altura</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {clinicos.medidasIniciais.altura ? `${clinicos.medidasIniciais.altura} cm` : '-'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">IMC</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {clinicos.medidasIniciais.imc 
                              ? `${clinicos.medidasIniciais.imc.toFixed(1)} kg/m²` 
                              : '-'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Circunferência Abdominal</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {clinicos.medidasIniciais.circunferenciaAbdominal 
                              ? `${clinicos.medidasIniciais.circunferenciaAbdominal} cm` 
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {clinicos.motivacao && Object.keys(clinicos.motivacao).some((k) => k !== 'outro' && !!(clinicos.motivacao as any)[k]) && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Motivação (peso)</p>
                      <div className="flex flex-wrap gap-2">
                        {(clinicos.motivacao as any).estetica && <span className="px-2 py-1 bg-violet-50 text-violet-800 text-xs rounded-full border border-violet-200">Estética</span>}
                        {(clinicos.motivacao as any).cansaco_falta_energia && <span className="px-2 py-1 bg-violet-50 text-violet-800 text-xs rounded-full border border-violet-200">Cansaço / energia</span>}
                        {(clinicos.motivacao as any).saude_exames_alterados && <span className="px-2 py-1 bg-violet-50 text-violet-800 text-xs rounded-full border border-violet-200">Saúde / exames</span>}
                        {(clinicos.motivacao as any).autoestima && <span className="px-2 py-1 bg-violet-50 text-violet-800 text-xs rounded-full border border-violet-200">Autoestima</span>}
                        {(clinicos.motivacao as any).dificuldade_emagrecer && <span className="px-2 py-1 bg-violet-50 text-violet-800 text-xs rounded-full border border-violet-200">Dificuldade emagrecer</span>}
                        {(clinicos.motivacao as any).outro && (clinicos.motivacaoOutro ? <span className="px-2 py-1 bg-violet-50 text-violet-800 text-xs rounded-full border border-violet-200">{clinicos.motivacaoOutro}</span> : <span className="px-2 py-1 bg-violet-50 text-violet-800 text-xs rounded-full border border-violet-200">Outro</span>)}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clinicos.diagnosticoPrincipal && (
                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Diagnóstico Principal</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {clinicos.diagnosticoPrincipal.tipo === 'dm1' ? 'Diabetes tipo 1' :
                           clinicos.diagnosticoPrincipal.tipo === 'dm2' ? 'Diabetes tipo 2' :
                           clinicos.diagnosticoPrincipal.tipo === 'obesidade' ? 'Obesidade' :
                           clinicos.diagnosticoPrincipal.tipo === 'sobrepeso_comorbidade' ? 'Sobrepeso com problema de saúde' :
                           clinicos.diagnosticoPrincipal.tipo === 'pre_diabetes' ? 'Pré-diabetes' :
                           clinicos.diagnosticoPrincipal.tipo === 'resistencia_insulinica' ? 'Resistência à insulina / síndrome metabólica' :
                           clinicos.diagnosticoPrincipal.tipo === 'sop_ri' ? 'Ovário policístico (SOP)' :
                           clinicos.diagnosticoPrincipal.tipo === 'ehna_sem_dm2' ? 'Gordura no fígado / esteatose' :
                           clinicos.diagnosticoPrincipal.tipo === 'outro' ? (clinicos.diagnosticoPrincipal.outro || 'Outro') :
                           clinicos.diagnosticoPrincipal.tipo}
                        </p>
                      </div>
                    )}
                    {clinicos.historiaTireoidiana && (
                      <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">História Tireoidiana</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {clinicos.historiaTireoidiana === 'eutireoidismo' ? 'Tireoide normal' :
                           clinicos.historiaTireoidiana === 'hipotireoidismo_tratado' ? 'Hipotireoidismo tratado' :
                           clinicos.historiaTireoidiana === 'nodulo_bocio' ? 'Nódulo ou bócio' :
                           clinicos.historiaTireoidiana === 'tireoidite_previa' ? 'Tireoidite prévia' :
                           clinicos.historiaTireoidiana === 'cmt_confirmado' ? 'CMT confirmado' :
                           clinicos.historiaTireoidiana === 'outro' ? (clinicos.historiaTireoidianaOutro || 'Outro') :
                           clinicos.historiaTireoidiana}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Comorbidades Associadas (2.3) */}
                  {clinicos.comorbidades && Object.keys(clinicos.comorbidades).some(k => k !== 'outraDescricao' && !!(clinicos.comorbidades as any)[k]) && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Comorbidades Associadas</p>
                      <div className="flex flex-wrap gap-2">
                        {clinicos.comorbidades.hipertensaoArterial && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">Pressão alta</span>}
                        {clinicos.comorbidades.dislipidemia && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">Dislipidemia</span>}
                        {clinicos.comorbidades.apneiaObstrutivaSono && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">AOS</span>}
                        {clinicos.comorbidades.esteatoseEHNA && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">Esteatose/EHNA</span>}
                        {clinicos.comorbidades.doencaCardiovascular && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">Doença cardiovascular</span>}
                        {clinicos.comorbidades.doencaRenalCronica && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">DRC</span>}
                        {clinicos.comorbidades.sop && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">SOP</span>}
                        {clinicos.comorbidades.hipotireoidismo && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">Hipotireoidismo</span>}
                        {clinicos.comorbidades.asmaDPOC && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">Asma/DPOC</span>}
                        {clinicos.comorbidades.transtornoAnsiedadeDepressao && <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">Ansiedade/depressão</span>}
                        {clinicos.comorbidades.nenhuma && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200">Nenhuma</span>}
                        {clinicos.comorbidades.outra && (clinicos.comorbidades.outraDescricao ? <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">{clinicos.comorbidades.outraDescricao}</span> : <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">Outra</span>)}
                      </div>
                    </div>
                  )}

                  {/* Riscos e condições (2.6) */}
                  {clinicos.riscos && Object.values(clinicos.riscos).some(Boolean) && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Riscos e condições (Tirzepatida)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-900 dark:text-white">
                        {clinicos.riscos.pancreatitePrevia && <span>Pancreatite prévia: {clinicos.riscos.pancreatitePrevia === 'sim' ? 'Sim' : 'Não'}</span>}
                        {clinicos.riscos.gastroparesia && <span>Gastroparesia: {clinicos.riscos.gastroparesia === 'sim' ? 'Sim' : 'Não'}</span>}
                        {clinicos.riscos.historicoCMT_MEN2 && <span>Hist. CMT/MEN2: {clinicos.riscos.historicoCMT_MEN2 === 'sim' ? 'Sim' : clinicos.riscos.historicoCMT_MEN2 === 'nao' ? 'Não' : 'Desconheço'}</span>}
                        {clinicos.riscos.gestacao && <span>Gestação: {clinicos.riscos.gestacao === 'sim' ? 'Sim' : clinicos.riscos.gestacao === 'nao' ? 'Não' : 'Desconheço'}</span>}
                        {clinicos.riscos.lactacao && <span>Lactação: {clinicos.riscos.lactacao === 'sim' ? 'Sim' : 'Não'}</span>}
                      </div>
                    </div>
                  )}

                  {/* Sintomas basais GI (2.10) */}
                  {clinicos.sintomasGI && Object.keys(clinicos.sintomasGI).some(k => !!(clinicos.sintomasGI as any)[k]) && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Sintomas basais do trato GI</p>
                      <div className="flex flex-wrap gap-2">
                        {clinicos.sintomasGI.plenitudePosPrandial && <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full">Plenitude após comer</span>}
                        {clinicos.sintomasGI.nauseaLeve && <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full">Náusea leve</span>}
                        {clinicos.sintomasGI.constipacao && <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full">Constipação</span>}
                        {clinicos.sintomasGI.refluxoPirose && <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full">Refluxo / queimação</span>}
                        {clinicos.sintomasGI.nenhum && <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full">Nenhum</span>}
                      </div>
                    </div>
                  )}

                  {/* Objetivos do tratamento (2.11) */}
                  {clinicos.objetivosTratamento && Object.keys(clinicos.objetivosTratamento).some(k => k !== 'outroDescricao' && !!(clinicos.objetivosTratamento as any)[k]) && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Objetivos do tratamento</p>
                      <div className="flex flex-wrap gap-2">
                        {clinicos.objetivosTratamento.perdaPeso10Porcento && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">Perder ≥10% do peso</span>}
                        {clinicos.objetivosTratamento.hba1cMenor68 && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">Melhorar glicose / HbA1c</span>}
                        {clinicos.objetivosTratamento.reducaoCircunferencia10cm && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">Reduzir circunferência abdominal</span>}
                        {clinicos.objetivosTratamento.remissaoPreDiabetes && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">Reverter pré-diabetes</span>}
                        {clinicos.objetivosTratamento.melhoraEHNA && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">Melhorar fígado (esteatose)</span>}
                        {(clinicos.objetivosTratamento as any).mais_energia && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">Mais energia</span>}
                        {(clinicos.objetivosTratamento as any).melhora_autoestima && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">Autoestima</span>}
                        {clinicos.objetivosTratamento.outro && (clinicos.objetivosTratamento.outroDescricao ? <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">{clinicos.objetivosTratamento.outroDescricao}</span> : <span className="px-2 py-1 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">Outro</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Informações Nutricionais */}
            {loadingPlanoNutricional ? (
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-600">Carregando informações nutricionais...</span>
                </div>
              </div>
            ) : planoNutricional ? (
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UtensilsCrossed className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informações Nutricionais</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Plano Nutricional */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Estilo Alimentar</p>
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {planoNutricional.estilo?.replace('_', ' ') || '-'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Meta de Proteína</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {planoNutricional.protDia_g ? `${planoNutricional.protDia_g}g/dia` : '-'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 border border-cyan-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Meta de Água</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {planoNutricional.aguaDia_ml ? `${Math.round(planoNutricional.aguaDia_ml / 1000)}L/dia` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Hipótese Comportamental */}
                  {planoNutricional.hipoteseComportamental && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Análise Comportamental</p>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                        {planoNutricional.hipoteseComportamental}
                      </p>
                    </div>
                  )}

                  {/* Restrições e Preferências */}
                  {(planoNutricional.restricoesPaciente?.length > 0 || planoNutricional.preferenciasProteinaPaciente?.length > 0 || planoNutricional.evitar?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {planoNutricional.restricoesPaciente?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Restrições Alimentares</p>
                          <div className="flex flex-wrap gap-1.5">
                            {planoNutricional.restricoesPaciente.map((restricao: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
                                {restricao}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {planoNutricional.preferenciasProteinaPaciente?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Preferências de Proteína</p>
                          <div className="flex flex-wrap gap-1.5">
                            {planoNutricional.preferenciasProteinaPaciente.map((pref: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                                {pref}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {planoNutricional.evitar?.length > 0 && (
                        <div className="md:col-span-2">
                          <p className="text-xs font-medium text-gray-600 mb-2">Alimentos/Hábitos a Evitar</p>
                          <div className="flex flex-wrap gap-1.5">
                            {planoNutricional.evitar.map((item: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suplementos */}
                  {planoNutricional.suplementos && (planoNutricional.suplementos.probiotico || planoNutricional.suplementos.whey || planoNutricional.suplementos.creatina) && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Suplementos Recomendados</p>
                      <div className="flex flex-wrap gap-2">
                        {planoNutricional.suplementos.probiotico && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200">
                            Probiótico: {planoNutricional.suplementos.probiotico}
                          </span>
                        )}
                        {planoNutricional.suplementos.whey && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200">
                            Whey: {planoNutricional.suplementos.whey}
                          </span>
                        )}
                        {planoNutricional.suplementos.creatina && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200">
                            Creatina: {planoNutricional.suplementos.creatina}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Descrição do Estilo */}
                  {planoNutricional.descricaoEstilo && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Sobre o Plano</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{planoNutricional.descricaoEstilo}</p>
                    </div>
                  )}

                  {/* Data de Criação */}
                  {planoNutricional.criadoEm && (
                    <p className="text-xs text-gray-500 text-right">
                      Plano criado em {planoNutricional.criadoEm?.toDate ? new Date(planoNutricional.criadoEm.toDate()).toLocaleDateString('pt-BR') : new Date(planoNutricional.criadoEm).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UtensilsCrossed className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informações Nutricionais</h3>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6 text-center">
                  <UtensilsCrossed className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-gray-900 mb-2">
                    Plano Nutricional não disponível
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Você ainda não possui um plano nutricional cadastrado. Acesse a página Nutri para preencher suas informações e obter seu plano personalizado.
                  </p>
                  <button
                    onClick={() => setActiveMenu('nutri')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Ir para Nutri
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'troca': {
        const servicosUsuario = getServicosDoUsuario();
        const servicosDisponiveis = servicosUsuario.filter(s => s.podeTrocar);
        const residentesDisponiveis = getResidentesDisponiveis();

        if (loadingTrocas) {
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trocas</h2>
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando trocas...</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trocas</h2>
              {solicitacoesPendentes.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {solicitacoesPendentes.length} solicitação(ões) pendente(s)
                </span>
              )}
            </div>

            {/* Formulário de Solicitação de Troca */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Solicitar Troca</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione um serviço para trocar
                  </label>
                  <select
                    value={servicoSelecionado}
                    onChange={(e) => setServicoSelecionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Escolha um serviço...</option>
                    {servicosDisponiveis.map((servico) => {
                      // Calcular a data do serviço
                      const dataInicio = new Date(servico.dataInicio);
                      const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
                      const indiceDia = diasSemana.indexOf(servico.dia);
                      const dataServico = new Date(dataInicio);
                      dataServico.setDate(dataInicio.getDate() + indiceDia);
                      
                      return (
                        <option key={servico.id} value={servico.id}>
                          {servico.servicoNome} - {servico.localNome} ({servico.turno}) - {dataServico.toLocaleDateString('pt-BR')}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trocar com
                  </label>
                  <select
                    value={residenteSelecionado}
                    onChange={(e) => setResidenteSelecionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Escolha um residente...</option>
                    {residentesDisponiveis.map((residente) => (
                      <option key={residente.email} value={residente.email}>
                        {residente.nome}
                      </option>
                    ))}
                  </select>
                  {residentesDisponiveis.length === 0 && servicoSelecionado && (
                    <p className="text-sm text-gray-500 mt-1">
                      Nenhum residente disponível para troca neste serviço. 
                      Todos os residentes já estão escalados para este turno.
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da troca (opcional)
                </label>
                <textarea
                  value={motivoTroca}
                  onChange={(e) => setMotivoTroca(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  rows={3}
                  placeholder="Descreva o motivo da troca..."
                />
              </div>

              <button
                onClick={handleSolicitarTroca}
                disabled={isLoadingTroca || !servicoSelecionado || !residenteSelecionado}
                className="w-full md:w-auto bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingTroca ? 'Enviando...' : 'Solicitar Troca'}
              </button>
            </div>

            {/* Aviso sobre regras de troca */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Regras para Solicitação de Trocas
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>É necessário pelo menos 24 horas de antecedência para solicitar troca</li>
                      <li>Não é possível trocar escalas passadas, de ontem ou de hoje</li>
                      <li>Apenas escalas futuras com antecedência adequada podem ser trocadas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Solicitações Pendentes */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Solicitações Pendentes</h3>
              
              {solicitacoesPendentes.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhuma solicitação de troca no momento</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Quando alguém solicitar uma troca com você, ela aparecerá aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {solicitacoesPendentes.map((troca) => {
                    const servico = servicos.find(s => s.id === troca.servicoId);
                    const local = locais.find(l => l.id === troca.localId);
                    const solicitante = residentes.find(r => r.email === troca.solicitanteEmail);
                    const escala = todasEscalas.find(e => e.id === troca.escalaId);
                    
                    // Calcular a data do serviço
                    let dataServico = '';
                    if (escala) {
                      const dataInicio = new Date(escala.dataInicio);
                      const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
                      const indiceDia = diasSemana.indexOf(troca.dia);
                      if (indiceDia !== -1) {
                        const dataServicoCalc = new Date(dataInicio);
                        dataServicoCalc.setDate(dataInicio.getDate() + indiceDia);
                        dataServico = dataServicoCalc.toLocaleDateString('pt-BR');
                      }
                    }
                    
                    return (
                      <div key={troca.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {servico?.nome || 'Serviço não encontrado'} - {local?.nome || 'Local não encontrado'}
                                {dataServico && (
                                  <span className="text-xs text-blue-600 ml-2 font-normal">
                                    ({dataServico})
                                  </span>
                                )}
                              </h4>
                              {getStatusBadge(troca.status)}
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Turno:</span> {troca.turno === 'manha' ? 'Manhã' : 'Tarde'} • <span className="font-medium">Dia:</span> {troca.dia}
                                {dataServico && (
                                  <span className="text-blue-600 ml-1">({dataServico})</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                <span className="font-medium">Solicitado por:</span> {solicitante?.nome || troca.solicitanteEmail}
                              </p>
                              {troca.motivo && (
                                <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                  <span className="font-medium">Motivo:</span> {troca.motivo}
                                </p>
                              )}
                              {/* Mostrar quem aprovou/rejeitou/cancelou */}
                              {troca.aprovadoPor && (
                                <p className="text-xs text-green-600 mt-1">
                                  <span className="font-medium">Aprovado por:</span> {troca.aprovadoPor}
                                </p>
                              )}
                              {troca.rejeitadoPor && (
                                <p className="text-xs text-red-600 mt-1">
                                  <span className="font-medium">Rejeitado por:</span> {troca.rejeitadoPor}
                                </p>
                              )}
                              {troca.canceladoPor && (
                                <p className="text-xs text-gray-600 mt-1">
                                  <span className="font-medium">Cancelado por:</span> {troca.canceladoPor}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 lg:flex-col xl:flex-row lg:min-w-[200px] xl:min-w-[180px]">
                            <button
                              onClick={() => handleResponderSolicitacao(troca.id, true)}
                              className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors shadow-sm"
                            >
                              ✓ Aceitar
                            </button>
                            <button
                              onClick={() => handleResponderSolicitacao(troca.id, false)}
                              className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors shadow-sm"
                            >
                              ✗ Recusar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Histórico de Minhas Trocas */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Minhas Trocas</h3>
              
              {minhasTrocas.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhuma troca solicitada</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Suas solicitações de troca aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {minhasTrocas.map((troca) => {
                    const servico = servicos.find(s => s.id === troca.servicoId);
                    const local = locais.find(l => l.id === troca.localId);
                    const solicitado = residentes.find(r => r.email === troca.solicitadoEmail);
                    const escala = todasEscalas.find(e => e.id === troca.escalaId);
                    
                    // Calcular a data do serviço
                    let dataServico = '';
                    if (escala) {
                      const dataInicio = new Date(escala.dataInicio);
                      const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
                      const indiceDia = diasSemana.indexOf(troca.dia);
                      if (indiceDia !== -1) {
                        const dataServicoCalc = new Date(dataInicio);
                        dataServicoCalc.setDate(dataInicio.getDate() + indiceDia);
                        dataServico = dataServicoCalc.toLocaleDateString('pt-BR');
                      }
                    }
                    
                    return (
                      <div key={troca.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {servico?.nome || 'Serviço não encontrado'} - {local?.nome || 'Local não encontrado'}
                                {dataServico && (
                                  <span className="text-xs text-blue-600 ml-2 font-normal">
                                    ({dataServico})
                                  </span>
                                )}
                              </h4>
                              {getStatusBadge(troca.status)}
                            </div>
                            <p className="text-sm text-gray-600">
                              {troca.turno === 'manha' ? 'Manhã' : 'Tarde'} • {troca.dia}
                              {dataServico && (
                                <span className="text-blue-600 ml-1">({dataServico})</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">
                              Trocar com: {solicitado?.nome || troca.solicitadoEmail}
                            </p>
                            {troca.motivo && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Motivo:</strong> {troca.motivo}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              Solicitado em: {troca.createdAt.toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            {troca.status === 'pendente' && (
                              <button
                                onClick={() => handleCancelarTroca(troca.id)}
                                className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'escalas': {

        // Filtrar escalas baseado no toggle e ordenar por data de criação (decrescente)
        const escalasParaExibir = (showOnlyMyEscalas ? userEscalas : todasEscalas)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Debug logs para verificar filtragem
        console.log('🔍 DEBUG MINHAS ESCALAS:');
        console.log('- showOnlyMyEscalas:', showOnlyMyEscalas);
        console.log('- userEscalas.length:', userEscalas.length);
        console.log('- todasEscalas.length:', todasEscalas.length);
        console.log('- escalasParaExibir.length:', escalasParaExibir.length);
        console.log('- user?.email:', user?.email);

        // Função para formatar data
        const formatarData = (data: Date) => {
          return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).format(data);
        };

        // Função para obter nome do dia da semana
        const getNomeDia = (dia: string) => {
          const nomes = {
            'segunda': 'Segunda-feira',
            'terca': 'Terça-feira',
            'quarta': 'Quarta-feira',
            'quinta': 'Quinta-feira',
            'sexta': 'Sexta-feira',
            'sabado': 'Sábado',
            'domingo': 'Domingo'
          };
          return nomes[dia as keyof typeof nomes] || dia;
        };

        // Função para verificar se há serviços em um dia
        const temServicosNoDia = (escala: Escala, dia: string) => {
          const diaData = escala.dias[dia as keyof typeof escala.dias];
          if (!Array.isArray(diaData)) return false;
          
          if (showOnlyMyEscalas) {
            return diaData.some(servico => servico.residentes.includes(user?.email || ''));
          }
          return diaData.length > 0;
        };

        // Função para filtrar serviços de um dia
        const getServicosDoDia = (escala: Escala, dia: string) => {
          const diaData = escala.dias[dia as keyof typeof escala.dias];
          if (!Array.isArray(diaData)) return [];
          
          if (showOnlyMyEscalas) {
            return diaData.filter(servico => servico.residentes.includes(user?.email || ''));
          }
          return diaData;
        };

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Escalas</h2>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <button
                  onClick={() => setShowOnlyMyEscalas(!showOnlyMyEscalas)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    showOnlyMyEscalas ? 'bg-gray-200' : 'bg-green-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      showOnlyMyEscalas ? 'translate-x-1' : 'translate-x-8'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Botões de controle de expand/collapse */}
            {escalasParaExibir.length > 0 && (
              <div className="flex justify-end space-x-2 mb-4">
                <button
                  onClick={() => {
                    const allIds = escalasParaExibir.map(escala => escala.id);
                    setExpandedEscalas(new Set(allIds));
                  }}
                  className="px-3 py-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                >
                  Expandir Todas
                </button>
                <button
                  onClick={() => setExpandedEscalas(new Set())}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  Colapsar Todas
                </button>
              </div>
            )}

            {escalasParaExibir.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma escala encontrada</h3>
                  <p className="text-gray-500">
                    {showOnlyMyEscalas 
                      ? 'Você não possui escalas atribuídas.' 
                      : 'Nenhuma escala foi cadastrada ainda.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {escalasParaExibir.map((escala) => {
                  // Calcular data de início da semana (segunda-feira)
                  const dataInicio = new Date(escala.dataInicio);
                  
                  return (
                    <div key={escala.id} className="bg-white shadow rounded-lg border border-gray-200">
                      {/* Cabeçalho do card */}
                      <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Semana de {formatarData(dataInicio)}
                              </h3>
                              <button
                                onClick={() => toggleEscala(escala.id)}
                                className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                title={expandedEscalas.has(escala.id) ? 'Colapsar' : 'Expandir'}
                              >
                                <svg 
                                  className={`w-5 h-5 transform transition-transform ${expandedEscalas.has(escala.id) ? 'rotate-180' : ''}`} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Criada em {formatarData(escala.createdAt)}
                            </p>
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                showOnlyMyEscalas 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {showOnlyMyEscalas ? 'Suas escalas' : 'Escala completa'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo expandível */}
                      {expandedEscalas.has(escala.id) && (
                        <>
                          {/* Abas de dias da semana */}
                          <div className="px-6 py-3 border-b border-gray-200">
                            <div className="flex space-x-0.5 overflow-x-auto">
                              {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].map((dia) => {
                                const temServicos = temServicosNoDia(escala, dia);
                                const isActive = activeTab === dia;
                                
                                return (
                                  <button
                                    key={dia}
                                    onClick={() => setActiveTab(dia)}
                                    className={`relative px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-md ${
                                      isActive
                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span className="lg:hidden">
                                      {dia === 'segunda' ? 'Seg' : 
                                       dia === 'terca' ? 'Ter' :
                                       dia === 'quarta' ? 'Qua' :
                                       dia === 'quinta' ? 'Qui' :
                                       dia === 'sexta' ? 'Sex' :
                                       dia === 'sabado' ? 'Sáb' :
                                       dia === 'domingo' ? 'Dom' : dia}
                                    </span>
                                    <span className="hidden lg:inline">
                                      {getNomeDia(dia).split('-')[0]}
                                    </span>
                                    {temServicos && (
                                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full"></div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Conteúdo do dia ativo */}
                          <div className="p-6">
                        {(() => {
                          const servicosDoDia = getServicosDoDia(escala, activeTab);
                          
                          if (servicosDoDia.length === 0) {
                            return (
                              <div className="text-center py-8">
                                <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500">
                                  Nenhum serviço agendado para {getNomeDia(activeTab).toLowerCase()}
                                </p>
                              </div>
                            );
                          }

                          // Separar por turno
                          const servicosManha = servicosDoDia.filter(s => s.turno === 'manha');
                          const servicosTarde = servicosDoDia.filter(s => s.turno === 'tarde');

                          return (
                            <div className="space-y-6">
                              {/* Turno da Manhã */}
                              <div>
                                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                                  Manhã
                                </h4>
                                {servicosManha.length > 0 ? (
                                  <div className="space-y-3">
                                    {servicosManha.map((servicoDia) => {
                                      const servico = servicos.find(s => s.id === servicoDia.servicoId);
                                      const local = locais.find(l => l.id === servicoDia.localId);
                                      
                                      return (
                                        <div key={servicoDia.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                          <div className="flex justify-between items-start mb-3">
                                            <div>
                                              <h5 className="font-medium text-gray-900">{servico?.nome || 'Serviço não encontrado'}</h5>
                                              <p className="text-sm text-gray-600">{local?.nome || 'Local não encontrado'}</p>
                                            </div>
                                          </div>
                                          
                                          <div className="flex flex-wrap gap-2">
                                            {servicoDia.residentes.map((email) => {
                                              const residente = residentes.find(r => r.email === email);
                                              const isCurrentUser = email === user?.email;
                                              
                                              return (
                                                <span
                                                  key={email}
                                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    isCurrentUser
                                                      ? 'bg-green-200 text-green-800 border-2 border-green-400'
                                                      : 'bg-gray-200 text-gray-700'
                                                  }`}
                                                >
                                                  {residente?.nome || email}
                                                  {isCurrentUser && ' (Você)'}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 text-sm italic">
                                    Nenhum serviço no turno da manhã
                                  </p>
                                )}
                              </div>

                              {/* Turno da Tarde */}
                              <div>
                                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                                  Tarde
                                </h4>
                                {servicosTarde.length > 0 ? (
                                  <div className="space-y-3">
                                    {servicosTarde.map((servicoDia) => {
                                      const servico = servicos.find(s => s.id === servicoDia.servicoId);
                                      const local = locais.find(l => l.id === servicoDia.localId);
                                      
                                      return (
                                        <div key={servicoDia.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                          <div className="flex justify-between items-start mb-3">
                                            <div>
                                              <h5 className="font-medium text-gray-900">{servico?.nome || 'Serviço não encontrado'}</h5>
                                              <p className="text-sm text-gray-600">{local?.nome || 'Local não encontrado'}</p>
                                            </div>
                                          </div>
                                          
                                          <div className="flex flex-wrap gap-2">
                                            {servicoDia.residentes.map((email) => {
                                              const residente = residentes.find(r => r.email === email);
                                              const isCurrentUser = email === user?.email;
                                              
                                              return (
                                                <span
                                                  key={email}
                                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    isCurrentUser
                                                      ? 'bg-green-200 text-green-800 border-2 border-green-400'
                                                      : 'bg-gray-200 text-gray-700'
                                                  }`}
                                                >
                                                  {residente?.nome || email}
                                                  {isCurrentUser && ' (Você)'}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 text-sm italic">
                                    Nenhum serviço no turno da tarde
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'troca': {
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sistema de Trocas</h2>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Em Desenvolvimento</h3>
                <p className="text-gray-500">
                  O sistema de trocas será implementado em breve.
                </p>
              </div>
            </div>
          </div>
        );
      }

      case 'ferias': {
        if (loadingFerias) {
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Férias</h2>
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando férias...</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Férias</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSolicitarFeriasModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Solicitar Férias</span>
                </button>
                <button
                  onClick={() => loadFerias()}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>


            {/* Debug info - temporário */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-100 p-4 rounded-lg text-xs">
                <h4 className="font-bold mb-2">Debug Info:</h4>
                <p>Total de férias carregadas: {ferias.length}</p>
                <p>Loading: {loadingFerias ? 'Sim' : 'Não'}</p>
                <p>Usuário: {user?.email}</p>
                {ferias.length > 0 && (
                  <div className="mt-2">
                    <p>Férias encontradas:</p>
                    <ul className="list-disc list-inside">
                      {ferias.map(f => (
                        <li key={f.id}>
                          ID: {f.id} | Status: {f.status} | Início: {f.dataInicio.toLocaleDateString('pt-BR')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Calendário de Férias */}
            {ferias.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Minhas Férias</h3>
                
                {/* Cards de Férias em formato de calendário */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {ferias.map((feriasItem) => {
                    const statusInfo = getFeriasStatus(feriasItem.dataInicio, feriasItem.dataFim);
                    const duracao = Math.ceil((feriasItem.dataFim.getTime() - feriasItem.dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    
                    return (
                      <div key={feriasItem.id} className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                        {/* Header do card com status visual */}
                        <div className={`h-2 bg-${statusInfo.cor}-500`}></div>
                        
                        <div className="p-6">
                          {/* Cabeçalho compacto com seta de expansão */}
                          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleFeriasCard(feriasItem.id)}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 bg-${statusInfo.cor}-100 rounded-full flex items-center justify-center`}>
                                <Calendar className={`h-4 w-4 text-${statusInfo.cor}-600`} />
                              </div>
                              <div>
                                <h4 className="text-base font-medium text-gray-900 dark:text-white">
                                  {feriasItem.dataInicio.toLocaleDateString('pt-BR')} - {feriasItem.dataFim.toLocaleDateString('pt-BR')}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {duracao} dias • {statusInfo.status === 'futura' && `Faltam ${statusInfo.diasRestantes} dias`}
                                  {statusInfo.status === 'ativa' && 'De férias'}
                                  {statusInfo.status === 'finalizada' && 'Finalizada'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Status badge e controles */}
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                feriasItem.status === 'aprovada' 
                                  ? 'bg-green-100 text-green-800' 
                                  : feriasItem.status === 'rejeitada'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {feriasItem.status === 'aprovada' ? 'Aprovada' : 
                                 feriasItem.status === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
                              </span>
                              
                              {/* Botão de editar - só aparece se não for férias finalizadas */}
                              {statusInfo.status !== 'finalizada' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Previne o clique no card
                                    handleEditarFerias(feriasItem);
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Editar férias"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              
                              {/* Seta de expansão */}
                              <button
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title={expandedFeriasCards.has(feriasItem.id) ? 'Recolher' : 'Expandir'}
                              >
                                <svg 
                                  className={`w-4 h-4 transform transition-transform ${expandedFeriasCards.has(feriasItem.id) ? 'rotate-180' : ''}`} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Conteúdo expandível */}
                          {expandedFeriasCards.has(feriasItem.id) && (
                            <>
                              {/* Barra de progresso visual */}
                              <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                              <span>Período</span>
                              <span>{duracao} dias</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full bg-${statusInfo.cor}-500 transition-all duration-300`}
                                style={{ width: '100%' }}
                              ></div>
                            </div>
                          </div>

                          {/* Informações de status */}
                          <div className="space-y-3">
                            {/* Status atual */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700">Status Atual:</span>
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 bg-${statusInfo.cor}-500 rounded-full`}></div>
                                <span className={`text-sm font-medium text-${statusInfo.cor}-700`}>
                                  {statusInfo.status === 'futura' && `Faltam ${statusInfo.diasRestantes} dias`}
                                  {statusInfo.status === 'ativa' && 'De férias'}
                                  {statusInfo.status === 'finalizada' && 'Acabou'}
                                </span>
                              </div>
                            </div>

                            {/* Motivo se houver */}
                            {feriasItem.motivo && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Motivo:</span>
                                <p className="text-sm text-gray-600 mt-1">{feriasItem.motivo}</p>
                              </div>
                            )}

                            {/* Observações se houver */}
                            {feriasItem.observacoes && (
                              <div className="p-3 bg-amber-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Observações:</span>
                                <p className="text-sm text-gray-600 mt-1">{feriasItem.observacoes}</p>
                              </div>
                            )}

                            {/* Aprovado/Rejeitado por */}
                            {(feriasItem.aprovadoPor || feriasItem.rejeitadoPor) && (
                              <div className="p-3 bg-green-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">
                                  {feriasItem.aprovadoPor ? 'Aprovado por:' : 'Rejeitado por:'}
                                </span>
                                <p className="text-sm text-gray-600 mt-1">
                                  {feriasItem.aprovadoPor || feriasItem.rejeitadoPor}
                                </p>
                              </div>
                            )}
                          </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma Solicitação de Férias</h3>
                  <p className="text-gray-500">
                    Você ainda não fez nenhuma solicitação de férias.
                  </p>
                </div>
              </div>
            )}

            {/* Modal para solicitar férias */}
            {showSolicitarFeriasModal && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Solicitar Férias</h3>
                      <button
                        onClick={() => setShowSolicitarFeriasModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Início
                        </label>
                        <input
                          type="date"
                          value={novaFerias.dataInicio}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setNovaFerias({ ...novaFerias, dataInicio: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Fim
                        </label>
                        <input
                          type="date"
                          value={novaFerias.dataFim}
                          min={novaFerias.dataInicio || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setNovaFerias({ ...novaFerias, dataFim: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                      
                      {/* Mostrar duração calculada */}
                      {novaFerias.dataInicio && novaFerias.dataFim && (
                        <div className="p-3 bg-blue-50 rounded-md">
                          <div className="text-sm text-blue-800">
                            <strong>Duração:</strong> {Math.ceil((new Date(novaFerias.dataFim).getTime() - new Date(novaFerias.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
                            {Math.ceil((new Date(novaFerias.dataFim).getTime() - new Date(novaFerias.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1 > 30 && (
                              <span className="ml-2 text-amber-600">(Período longo - será necessário confirmação)</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Motivo (opcional)
                        </label>
                        <textarea
                          value={novaFerias.motivo}
                          onChange={(e) => setNovaFerias({ ...novaFerias, motivo: e.target.value })}
                          placeholder="Descreva o motivo das férias (ex: férias anuais, viagem, motivos pessoais...)..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        * As solicitações serão analisadas pela administração
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setShowSolicitarFeriasModal(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSolicitarFerias}
                          disabled={!novaFerias.dataInicio || !novaFerias.dataFim || isSubmittingFerias}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {isSubmittingFerias ? 'Enviando...' : 'Solicitar Férias'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para editar férias */}
            {showEditarFeriasModal && feriasEditando && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
                <div className="relative top-10 mx-auto max-w-md w-full p-4 border shadow-lg rounded-md bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Editar Férias</h3>
                    <button
                      onClick={() => setShowEditarFeriasModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        value={editarFerias.dataInicio}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEditarFerias({ ...editarFerias, dataInicio: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        value={editarFerias.dataFim}
                        min={editarFerias.dataInicio || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEditarFerias({ ...editarFerias, dataFim: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Motivo (opcional)
                      </label>
                      <textarea
                        value={editarFerias.motivo}
                        onChange={(e) => setEditarFerias({ ...editarFerias, motivo: e.target.value })}
                        placeholder="Motivo das férias..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-col space-y-3">
                    <div className="text-xs text-gray-500 text-center">
                      * Voltará para status "Pendente" para nova aprovação
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowEditarFeriasModal(false)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSalvarEdicaoFerias}
                        disabled={!editarFerias.dataInicio || !editarFerias.dataFim || isSubmittingFerias}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSubmittingFerias ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'medicos': {
        // Abre o modal "Solicitar Médico" com o médico selecionado (telefone, peso, altura se necessário, envio da solicitação).
        const abrirModalMedico = (medico: Medico) => {
          if (paciente?.statusTratamento === 'em_tratamento') {
            alert(`Você já está sendo acompanhado por ${medicoResponsavel?.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoResponsavel?.nome}. Não é possível solicitar um novo médico durante o tratamento.`);
            return;
          }
          if (hasSolicitacaoAberta) {
            alert('Você já está com uma solicitação em aberto. Acompanhe em "Minhas Solicitações" ou cancele a anterior antes de enviar outra.');
            return;
          }
          setMedicoSelecionado(medico);
          setShowModalMedico(true);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Médicos</h2>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
              <nav className="flex space-x-4">
                {SHOW_BUSCAR_MEDICOS_TAB && (
                  <button
                    onClick={() => setAbaAtivaMedicos('buscar')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'buscar'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Buscar Médico
                  </button>
                )}
                <button
                  onClick={() => setAbaAtivaMedicos('solicitacoes')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    abaAtivaMedicos === 'solicitacoes'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Minhas Solicitações
                  {minhasSolicitacoes.filter(s => s.status === 'pendente').length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {minhasSolicitacoes.filter(s => s.status === 'pendente').length}
                    </span>
                  )}
                </button>
                {paciente?.statusTratamento === 'em_tratamento' && medicoResponsavel && (
                  <button
                    onClick={() => setAbaAtivaMedicos('meu-medico')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'meu-medico'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Meu Médico
                  </button>
                )}
              </nav>
            </div>

            {/* Conteúdo das Tabs */}
            {SHOW_BUSCAR_MEDICOS_TAB && abaAtivaMedicos === 'buscar' && (
              <>
            {/* Banner de Referral de Nutricionista */}
            {referralInfo && referralInfo.tipo === 'nutricionista' && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 p-4 mb-4 rounded-lg shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <UtensilsCrossed className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-green-900 mb-1">
                      Médico Recomendado por {referralInfo.nutricionistaNome}
                    </h3>
                    <p className="text-sm text-green-800 mb-2">
                      {referralInfo.medicoNome ? (
                        <>Dr(a). {referralInfo.medicoNome}</>
                      ) : (
                        'Carregando informações do médico...'
                      )}
                    </p>
                    <p className="text-xs text-green-700">
                      Você foi encaminhado por um nutricionista. Clique no médico recomendado abaixo para solicitar acompanhamento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta de paciente em tratamento */}
            {paciente?.statusTratamento === 'em_tratamento' && medicoResponsavel && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Você está sendo acompanhado por {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}.</strong> Para solicitar um novo médico, primeiro você precisa abandonar o tratamento atual na aba "Meu Médico".
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    value={estadoBuscaMedico}
                    onChange={(e) => {
                      setEstadoBuscaMedico(e.target.value);
                      setCidadeBuscaMedico('');
                      setMedicos([]);
                    }}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Selecione o estado</option>
                    {estadosList
                      .filter(estado => estadosDisponiveis.includes(estado.sigla))
                      .map((estado) => (
                        <option key={estado.sigla} value={estado.sigla}>
                          {estado.nome}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <select
                    value={cidadeBuscaMedico}
                    onChange={async (e) => {
                      setCidadeBuscaMedico(e.target.value);
                                            // Buscar automaticamente quando selecionar cidade        
                      if (e.target.value && estadoBuscaMedico) {
                        setLoadingMedicos(true);
                        try {
                          // Usar a lista já carregada de médicos disponíveis
                          const medicosFiltrados = todosMedicosDisponiveis.filter(medico => {                                                                              
                            return medico.cidades.some(c =>
                              c.estado === estadoBuscaMedico && c.cidade === e.target.value                                                                     
                            );
                          });
                          // Ordenar: verificados primeiro, depois alfabético  
                          const medicosOrdenados = medicosFiltrados.sort((a, b) => {                                                                            
                            if (a.isVerificado && !b.isVerificado) return -1;   
                            if (!a.isVerificado && b.isVerificado) return 1;    
                            return a.nome.localeCompare(b.nome);
                          });
                          setMedicos(medicosOrdenados);
                        } catch (error) {
                          console.error('Erro ao buscar médicos:', error);     
                          alert('Erro ao buscar médicos');
                        } finally {
                          setLoadingMedicos(false);
                        }
                      }
                    }}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    disabled={!estadoBuscaMedico}
                  >
                    <option value="">Selecione a cidade</option>
                    {estadoBuscaMedico && (() => {
                      // Filtrar apenas cidades onde existem médicos cadastrados para este estado
                      const cidadesComMedicosNoEstado = cidadesDisponiveis
                        .filter(c => c.estado === estadoBuscaMedico)
                        .map(c => c.cidade)
                        .sort();
                      
                      return cidadesComMedicosNoEstado.map((cidade) => (
                        <option key={cidade} value={cidade}>
                          {cidade}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Médicos */}
            {medicos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {medicos.length} médico(s) encontrado(s)
                </h3>
                {[...medicos]
                  .sort((a, b) => {
                    const mediaA = agregadosMedicosBusca[a.id]?.media ?? 0;
                    const mediaB = agregadosMedicosBusca[b.id]?.media ?? 0;
                    if (mediaB !== mediaA) return mediaB - mediaA;
                    const countA = agregadosMedicosBusca[a.id]?.count ?? 0;
                    const countB = agregadosMedicosBusca[b.id]?.count ?? 0;
                    if (countB !== countA) return countB - countA;
                    if (a.isVerificado && !b.isVerificado) return -1;
                    if (!a.isVerificado && b.isVerificado) return 1;
                    return a.nome.localeCompare(b.nome);
                  })
                  .map((medico) => {
                  const isExpandido = medicosExpandidos.has(medico.id);
                  const toggleExpandir = () => {
                    const novosExpandidos = new Set(medicosExpandidos);
                    if (isExpandido) {
                      novosExpandidos.delete(medico.id);
                    } else {
                      novosExpandidos.add(medico.id);
                    }
                    setMedicosExpandidos(novosExpandidos);
                  };

                  const solicitacaoParaEsteMedico = minhasSolicitacoes.find(s => s.medicoId === medico.id);
                  const temPendenteOuAceita = solicitacaoParaEsteMedico && (solicitacaoParaEsteMedico.status === 'pendente' || solicitacaoParaEsteMedico.status === 'aceita');
                  const isMedicoRecomendado = medicoRecomendadoId === medico.id;

                  return (
                    <div key={medico.id} className={`rounded-lg shadow-sm hover:shadow-md transition-all border ${
                      isMedicoRecomendado 
                        ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-400 border-2' 
                        : medico.isVerificado 
                          ? 'bg-white border-green-200' 
                          : 'bg-white border-red-200'
                    }`}>
                      {/* Header Compacto - Sempre Visível */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Ícone de Status */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            medico.isVerificado ? 'bg-green-50' : 'bg-red-50'
                          }`}>
                            {medico.isVerificado ? (
                              <ShieldCheck className="h-5 w-5 text-green-600" />
                            ) : (
                              <Shield className="h-5 w-5 text-red-600" />
                            )}
                          </div>

                          {/* Nome, Status e Botões */}
                          <div className="flex-1 min-w-0">
                            {/* Nome e Badges de Status */}
                            <div className="mb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white break-words">
                                  {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {formatarNomeMedico(medico.nome)}
                                </h4>
                                {isMedicoRecomendado && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                                    <UtensilsCrossed className="h-3 w-3" />
                                    Recomendado
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  medico.isVerificado
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {medico.isVerificado ? (
                                    <>
                                      <ShieldCheck className="h-3 w-3" />
                                      Verificado
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="h-3 w-3" />
                                      Não Verificado
                                    </>
                                  )}
                                </div>
                                {paciente?.statusTratamento === 'em_tratamento' && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                    Bloqueado
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} size={12} className={agregadosMedicosBusca[medico.id]?.count ? (s <= Math.round(agregadosMedicosBusca[medico.id].media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300') : 'text-gray-300'} />
                                  ))}
                                  <span className="font-medium text-gray-900 dark:text-gray-200">
                                    {agregadosMedicosBusca[medico.id]?.count ? agregadosMedicosBusca[medico.id].media.toFixed(1) : '—'}
                                  </span>
                                  {agregadosMedicosBusca[medico.id]?.count ? (
                                    <span className="text-gray-500">({agregadosMedicosBusca[medico.id].count})</span>
                                  ) : null}
                                </span>
                              </div>
                            </div>

                            {/* Botão Detalhes (esquerda) e Solicitar (direita) na mesma linha */}
                            <div className="flex items-center justify-between gap-3">
                              {/* Botão Detalhes - Canto Esquerdo */}
                              <button
                                onClick={toggleExpandir}
                                className="flex items-center gap-1 px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-sm font-medium"
                                aria-label={isExpandido ? 'Recolher detalhes' : 'Expandir detalhes'}
                              >
                                <span>Detalhes</span>
                                {isExpandido ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>

                              {/* Botão Solicitar - Canto Direito */}
                              <div className="flex-shrink-0">
                                {temPendenteOuAceita ? (
                                  <button
                                    disabled
                                    className="px-3 py-1.5 bg-gray-400 text-white rounded-md cursor-not-allowed text-xs font-medium whitespace-nowrap"
                                  >
                                    ⏳ Aguardando
                                  </button>
                                ) : paciente?.statusTratamento === 'em_tratamento' ? (
                                  <button
                                    disabled
                                    className="px-3 py-1.5 bg-gray-400 text-white rounded-md cursor-not-allowed text-xs font-medium whitespace-nowrap"
                                  >
                                    Indisponível
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => abrirModalMedico(medico)}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-medium whitespace-nowrap"
                                  >
                                    Solicitar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpandido && (
                        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                          <div className="pt-4 space-y-4">
                            {/* CRM */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">CRM</p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {medico.crm.estado} {medico.crm.numero}
                              </p>
                            </div>

                            {/* Endereço */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">📍 Endereço</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug mb-1">
                                {medico.localizacao.endereco}
                              </p>
                              {medico.localizacao.pontoReferencia && (
                                <p className="text-xs text-gray-500 italic mb-2">
                                  Ref.: {medico.localizacao.pontoReferencia}
                                </p>
                              )}
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(medico.localizacao.endereco)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                              >
                                Ver no mapa →
                              </a>
                            </div>

                            {/* Telefone */}
                            {medico.telefone && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">📞 Telefone</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-gray-900 dark:text-white">{medico.telefone}</p>
                                  <a
                                    href={`https://wa.me/55${medico.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-xs font-medium"
                                  >
                                    WhatsApp
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Cidades Atendidas */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-2">Cidades atendidas</p>
                              <div className="flex flex-wrap gap-1.5">
                                {medico.cidades.map((c, idx) => (
                                  <span key={idx} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium border border-green-200">
                                    {c.cidade}/{c.estado}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loadingMedicos && estadoBuscaMedico && cidadeBuscaMedico && medicos.length === 0 && (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <Stethoscope className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum médico encontrado</h3>
                <p className="text-gray-500">Não há médicos disponíveis nesta cidade.</p>
              </div>
            )}

            {!estadoBuscaMedico && !cidadeBuscaMedico && (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <Stethoscope className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Busque por localização</h3>
                <p className="text-gray-500">Selecione estado e cidade para encontrar médicos próximos.</p>
              </div>
            )}
          </>
        )}

        {/* Aba de Solicitações */}
        {abaAtivaMedicos === 'solicitacoes' && (
          <>
            {minhasSolicitacoes.length > 0 ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {minhasSolicitacoes.map((solicitacao) => (
                    <div key={solicitacao.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-shrink-0">
                              <Stethoscope className="h-8 w-8 text-green-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                Dr(a). {solicitacao.medicoNome}
                              </h4>
                            </div>
                          </div>
                          
                          <div className="ml-11 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500">Solicitado em:</span>
                              <span className="text-sm text-gray-900">{solicitacao.criadoEm?.toLocaleDateString('pt-BR')}</span>
                            </div>
                            
                            {solicitacao.status === 'aceita' && solicitacao.aceitaEm && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">Aceita em:</span>
                                <span className="text-sm text-gray-900 dark:text-white">{solicitacao.aceitaEm?.toLocaleDateString('pt-BR')}</span>
                              </div>
                            )}
                            
                            {solicitacao.motivoDesistencia && (
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-gray-500">Motivo:</span>
                                <span className="text-sm text-gray-700 italic">"{solicitacao.motivoDesistencia}"</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-11 mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                solicitacao.status === 'pendente'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : solicitacao.status === 'aceita'
                                  ? 'bg-green-100 text-green-800'
                                  : solicitacao.status === 'rejeitada'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {solicitacao.status === 'pendente' && '⏳ Pendente'}
                                {solicitacao.status === 'aceita' && '✓ Aceita'}
                                {solicitacao.status === 'rejeitada' && '✕ Rejeitada'}
                                {solicitacao.status === 'desistiu' && '↩ Desistiu'}
                              </span>
                              {solicitacao.status !== 'desistiu' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      // Buscar dados do médico
                                      const medico = await MedicoService.getMedicoById(solicitacao.medicoId);
                                      if (!medico || !medico.telefone) {
                                        alert('Médico não possui telefone cadastrado.');
                                        return;
                                      }

                                      // Formatar número de telefone
                                      let telefoneFormatado = medico.telefone.replace(/\D/g, '');
                                      if (telefoneFormatado.startsWith('0')) {
                                        telefoneFormatado = telefoneFormatado.substring(1);
                                      }
                                      if (!telefoneFormatado.startsWith('55')) {
                                        telefoneFormatado = '55' + telefoneFormatado;
                                      }

                                      // Criar mensagem pré-definida
                                      const tituloMedico = medico.genero === 'F' ? 'Dra.' : 'Dr.';
                                      const mensagem = `Olá, ${tituloMedico} ${medico.nome}, estou enviando uma solicitação para cotação de um tratamento com Tirzepatida. Poderia me dar mais informações, por favor.`;

                                      // Codificar mensagem para URL
                                      const mensagemCodificada = encodeURIComponent(mensagem);

                                      // Abrir WhatsApp
                                      const whatsappUrl = `https://wa.me/${telefoneFormatado}?text=${mensagemCodificada}`;
                                      window.open(whatsappUrl, '_blank');
                                    } catch (error) {
                                      console.error('Erro ao abrir WhatsApp:', error);
                                      alert('Erro ao abrir WhatsApp. Tente novamente.');
                                    }
                                  }}
                                  className="inline-flex items-center justify-center p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                                  title="Abrir WhatsApp"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                            
                            {/* Mensagem quando solicitação está aceita mas paciente ainda está pendente */}
                            {solicitacao.status === 'aceita' && paciente?.statusTratamento === 'pendente' && (
                              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                <Clock className="h-4 w-4" />
                                <span>Aguardando o início do Tratamento pelo médico</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {solicitacao.status === 'pendente' && (
                          <button
                            onClick={() => {
                              setSolicitacaoParaDesistir(solicitacao);
                              setShowModalDesistir(true);
                            }}
                            className="ml-4 px-4 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                          >
                            Desistir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <Stethoscope className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhuma solicitação</h3>
                <p className="text-gray-500">Você ainda não enviou nenhuma solicitação.</p>
                <div className="mt-5">
                  <button
                    onClick={openModalDadosPaciente}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                  >
                    Abrir chat para buscar médico
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Aba Meu Médico */}
        {abaAtivaMedicos === 'meu-medico' && (
          <>
            {medicoResponsavel && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meu Médico</h3>
                  
                  {/* Card do Médico */}
                  <div className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        medicoResponsavel.isVerificado ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        {medicoResponsavel.isVerificado ? (
                          <ShieldCheck className="h-6 w-6 text-green-600" />
                        ) : (
                          <Shield className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                        </h4>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">CRM:</span> {medicoResponsavel.crm.estado} {medicoResponsavel.crm.numero}
                        </p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          medicoResponsavel.isVerificado
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {medicoResponsavel.isVerificado ? (
                            <>
                              <ShieldCheck className="h-3 w-3" />
                              Verificado
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3" />
                              Não Verificado
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção de Mensagens - Apenas visualização, sem formulário */}
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Comunicação</h4>
                    
                    {/* Mensagens recebidas do médico */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Mensagens do Médico</h5>
                      {loadingMensagensPaciente && mensagensPaciente.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">Carregando mensagens...</div>
                      ) : mensagensPaciente.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">Nenhuma mensagem recebida ainda</div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {mensagensPaciente.map((msg) => (
                            <div
                              key={msg.id}
                              className={`border rounded-lg p-3 ${msg.lida ? 'bg-gray-50' : 'bg-blue-50'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900">{msg.titulo}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full bg-white border border-gray-300 capitalize ${
                                      msg.tipo === 'clinico' ? 'text-gray-900' : 'text-gray-600'
                                    }`}>
                                      {msg.tipo}
                                    </span>
                                    {!msg.lida && (
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                                        Nova
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{msg.mensagem}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(msg.criadoEm).toLocaleDateString('pt-BR')} às {new Date(msg.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                {!msg.lida && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await PacienteMensagemService.marcarComoLida(msg.id);
                                        await loadMensagensPacienteAtual();
                                      } catch (error) {
                                        console.error('Erro ao marcar como lida:', error);
                                      }
                                    }}
                                    className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Marcar como lida
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 text-center">
                        <button
                          onClick={() => {
                            setShowMensagensMedicoModal(true);
                            loadMensagensPacienteAtual();
                          }}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Ver todas as mensagens →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botão Abandonar Tratamento */}
                  <button
                    onClick={() => setShowModalAbandono(true)}
                    className="w-full mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Abandonar Tratamento
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal de Solicitação de Médico */}
        {showModalMedico && medicoSelecionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
              {/* Overlay de carregamento */}
              {loadingSolicitacaoMedico && (
                <div className="absolute inset-0 bg-white/95 rounded-lg flex flex-col items-center justify-center z-10">
                  <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
                  <p className="text-gray-700 font-medium">Carregando e preparando o envio...</p>
                  <p className="text-sm text-gray-500 mt-1">Por favor, aguarde.</p>
                </div>
              )}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Solicitar Tratamento
                  </h3>
                  <button
                    onClick={() => {
                      if (!loadingSolicitacaoMedico) {
                        setShowModalMedico(false);
                        setMedicoSelecionado(null);
                        setTelefonePaciente('');
                      }
                    }}
                    disabled={loadingSolicitacaoMedico}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X size={24} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {medicoSelecionado.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoSelecionado.nome}
                </p>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seu telefone *
                  </label>
                  <input
                    type="tel"
                    value={telefonePaciente}
                    onChange={(e) => setTelefonePaciente(e.target.value)}
                    placeholder="(11) 98765-4321"
                    disabled={loadingSolicitacaoMedico}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    O médico usará este telefone para entrar em contato com você.
                  </p>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (!loadingSolicitacaoMedico) {
                      setShowModalMedico(false);
                      setMedicoSelecionado(null);
                      setTelefonePaciente('');
                    }
                  }}
                  disabled={loadingSolicitacaoMedico}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!telefonePaciente.trim()) {
                      alert('Por favor, informe seu telefone.');
                      return;
                    }
                    
                    if (!user?.email || !paciente) {
                      alert('Erro: Usuário não encontrado. Recarregue a página.');
                      return;
                    }
                    
                    if (loadingSolicitacaoMedico) return;
                    
                    try {
                      setLoadingSolicitacaoMedico(true);
                      
                      // Criar solicitação passando o emailIndicadorRef se houver
                      await SolicitacaoMedicoService.criarSolicitacao({
                        pacienteEmail: user.email,
                        pacienteNome: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || user.displayName || 'Paciente',
                        pacienteTelefone: telefonePaciente.replace(/\D/g, ''),
                        pacienteId: paciente.id,
                        medicoId: medicoSelecionado.id,
                        medicoNome: medicoSelecionado.nome,
                        status: 'pendente'
                      }, emailIndicadorRef || undefined);
                      
                      alert('Solicitação enviada com sucesso! O médico será notificado.');
                      
                      // Limpar estados
                      setShowModalMedico(false);
                      setMedicoSelecionado(null);
                      setTelefonePaciente('');
                      
                      // Limpar referência de encaminhamento após criar a solicitação
                      if (emailIndicadorRef && typeof window !== 'undefined') {
                        localStorage.removeItem('indicacao_ref');
                        setEmailIndicadorRef(null);
                      }
                      
                      // Recarregar solicitações
                      await loadMinhasSolicitacoes();
                    } catch (error) {
                      console.error('Erro ao criar solicitação:', error);
                      alert('Erro ao enviar solicitação. Tente novamente.');
                    } finally {
                      setLoadingSolicitacaoMedico(false);
                    }
                  }}
                  disabled={loadingSolicitacaoMedico || !telefonePaciente.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loadingSolicitacaoMedico ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const handleSelectLayout = async (layoutId: string) => {
    if (!user || !paciente) return;

    try {
      // Salvar preferência no Firestore
      const pacienteRef = doc(db, 'pacientes', paciente.id);
      await setDoc(pacienteRef, {
        preferenciaLayout: layoutId
      }, { merge: true });

      setPreferenciaLayout(layoutId);
      setShowLayoutModal(false);
      
      // Recarregar a página para aplicar o novo layout
      window.location.href = `/meta?layout=${layoutId}`;
    } catch (error) {
      console.error('Erro ao salvar preferência:', error);
      alert('Erro ao salvar preferência. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  // Funções para trocas
  const getServicosDoUsuario = () => {
    const servicosUsuario: {
      id: string;
      servicoId: string;
      localId: string;
      servicoNome: string;
      localNome: string;
      turno: string;
      dia: string;
      escalaId: string;
      dataInicio: string;
      podeTrocar: boolean;
      motivoBloqueio?: string;
    }[] = [];
    
    userEscalas.forEach(escala => {
      Object.entries(escala.dias).forEach(([dia, servicosDia]) => {
        if (Array.isArray(servicosDia)) {
          servicosDia.forEach(servicoDia => {
            if (servicoDia.residentes.includes(user?.email || '')) {
              const servico = servicos.find(s => s.id === servicoDia.servicoId);
              const local = locais.find(l => l.id === servicoDia.localId);
              
              // Validar se a troca é permitida
              const validacao = UserService.validarDataTroca(escala.dataInicio, dia);
              
              servicosUsuario.push({
                id: `${escala.id}-${dia}-${servicoDia.id}`,
                servicoId: servicoDia.servicoId,
                localId: servicoDia.localId,
                servicoNome: servico?.nome || 'Serviço não encontrado',
                localNome: local?.nome || 'Local não encontrado',
                turno: servicoDia.turno,
                dia: dia,
                escalaId: escala.id,
                dataInicio: escala.dataInicio.toISOString(),
                podeTrocar: validacao.valida,
                motivoBloqueio: validacao.erro
              });
            }
          });
        }
      });
    });
    return servicosUsuario;
  };

  const getResidentesDisponiveis = () => {
    if (!servicoSelecionado) {
      return residentes.filter(r => r.email !== user?.email);
    }

    // Encontrar o serviço selecionado para obter os dados necessários
    const servicoInfo = getServicosDoUsuario().find(s => s.id === servicoSelecionado);
    if (!servicoInfo) {
      return residentes.filter(r => r.email !== user?.email);
    }

    // Buscar a escala para obter os residentes já escalados
    const escala = todasEscalas.find(e => e.id === servicoInfo.escalaId);
    if (!escala) {
      return residentes.filter(r => r.email !== user?.email);
    }

    // Obter residentes já escalados no mesmo serviço, turno e dia
    const residentesJaEscalados = new Set<string>();
    const diaData = escala.dias[servicoInfo.dia as keyof typeof escala.dias];
    if (Array.isArray(diaData)) {
      diaData.forEach(servicoDia => {
        if (servicoDia.servicoId === servicoInfo.servicoId && 
            servicoDia.localId === servicoInfo.localId && 
            servicoDia.turno === servicoInfo.turno) {
          servicoDia.residentes.forEach(email => {
            residentesJaEscalados.add(email);
          });
        }
      });
    }

    // Filtrar residentes que não estão escalados no mesmo serviço
    return residentes.filter(r => 
      r.email !== user?.email && 
      !residentesJaEscalados.has(r.email)
    );
  };

  const handleSolicitarTroca = async () => {
    if (!servicoSelecionado || !residenteSelecionado || !user) {
      alert('Por favor, selecione um serviço e um residente para troca.');
      return;
    }

    setIsLoadingTroca(true);
    try {
      // Encontrar o serviço selecionado para obter os dados necessários
      const servicoInfo = getServicosDoUsuario().find(s => s.id === servicoSelecionado);
      if (!servicoInfo) {
        alert('Serviço não encontrado.');
        return;
      }

      // Buscar a escala para obter a data de início
      const escala = todasEscalas.find(e => e.id === servicoInfo.escalaId);
      if (!escala) {
        alert('Escala não encontrada.');
        return;
      }

      // Validar se a troca é permitida
      const validacao = UserService.validarDataTroca(escala.dataInicio, servicoInfo.dia);
      if (!validacao.valida) {
        alert(validacao.erro);
        return;
      }

      // Validar se o residente não está já escalado no mesmo serviço
      const validacaoResidente = await UserService.validarTrocaComResidente(
        servicoInfo.escalaId,
        servicoInfo.dia,
        servicoInfo.turno,
        servicoInfo.servicoId,
        servicoInfo.localId,
        residenteSelecionado
      );
      if (!validacaoResidente.valida) {
        alert(validacaoResidente.erro);
        return;
      }

      // Criar a solicitação de troca
      const trocaData = {
        solicitanteEmail: user.email || '',
        solicitadoEmail: residenteSelecionado,
        escalaId: servicoInfo.escalaId,
        dia: servicoInfo.dia,
        turno: servicoInfo.turno as 'manha' | 'tarde',
        servicoId: servicoInfo.servicoId,
        localId: servicoInfo.localId,
        status: 'pendente' as const,
        motivo: motivoTroca || undefined
      };

      await UserService.solicitarTroca(trocaData);
      alert('Solicitação de troca enviada com sucesso!');
      
      // Limpar formulário
      setServicoSelecionado('');
      setResidenteSelecionado('');
      setMotivoTroca('');
      
      // Recarregar trocas
      await loadTrocas();
    } catch (error) {
      console.error('Erro ao solicitar troca:', error);
      alert('Erro ao enviar solicitação de troca.');
    } finally {
      setIsLoadingTroca(false);
    }
  };

  const handleResponderSolicitacao = async (trocaId: string, aceita: boolean) => {
    try {
      await UserService.responderTroca(trocaId, aceita);
      
      if (aceita) {
        alert('Solicitação aceita com sucesso!');
      } else {
        alert('Solicitação rejeitada com sucesso!');
      }
      
      // Recarregar trocas
      await loadTrocas();
    } catch (error) {
      console.error('Erro ao responder solicitação:', error);
      alert('Erro ao processar resposta.');
    }
  };

  const handleCancelarTroca = async (trocaId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação de troca?')) {
      return;
    }

    try {
      await UserService.cancelarTroca(trocaId);
      alert('Solicitação cancelada com sucesso!');
      
      // Recarregar trocas
      await loadTrocas();
    } catch (error) {
      console.error('Erro ao cancelar troca:', error);
      alert('Erro ao cancelar solicitação.');
    }
  };

  const handleSolicitarFerias = async () => {
    // Prevenir duplo clique
    if (isSubmittingFerias) {
      return;
    }

    if (!user) {
      alert('Usuário não autenticado. Faça login novamente.');
      return;
    }

    // Validar campos obrigatórios
    if (!novaFerias.dataInicio || !novaFerias.dataFim) {
      alert('Por favor, preencha as datas de início e fim das férias.');
      return;
    }

    // Validar se as datas fazem sentido
    const inicio = new Date(novaFerias.dataInicio);
    const fim = new Date(novaFerias.dataFim);
    
    if (fim <= inicio) {
      alert('A data de fim deve ser posterior à data de início.');
      return;
    }

    // Validar se as datas não são no passado
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (inicio < hoje) {
      alert('Não é possível solicitar férias para datas passadas.');
      return;
    }

    // Calcular duração das férias
    const duracao = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    
    if (duracao > 30) {
      const confirmar = confirm(`Você está solicitando ${duracao} dias de férias. Deseja continuar?`);
      if (!confirmar) return;
    }

    setIsSubmittingFerias(true);
    try {
      await UserService.solicitarFerias(
        novaFerias.dataInicio,
        novaFerias.dataFim,
        novaFerias.motivo.trim(),
        user.email || ''
      );

      alert(`Solicitação de férias enviada com sucesso! Duração: ${duracao} dias`);
      
      // Fechar modal e limpar formulário
      setShowSolicitarFeriasModal(false);
      setNovaFerias({
        dataInicio: '',
        dataFim: '',
        motivo: ''
      });
      
      // Recarregar férias
      await loadFerias();
    } catch (error) {
      console.error('Erro ao solicitar férias:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('Dados obrigatórios') || 
          errorMessage.includes('data de fim') ||
          errorMessage.includes('datas passadas')) {
        alert(errorMessage);
      } else {
        alert('Erro ao enviar solicitação de férias. Tente novamente.');
      }
    } finally {
      setIsSubmittingFerias(false);
    }
  };

  const handleSalvarEdicaoFerias = async () => {
    // Prevenir duplo clique
    if (isSubmittingFerias) {
      return;
    }

    if (!user || !feriasEditando) {
      alert('Usuário não autenticado ou férias não encontrada.');
      return;
    }

    // Validar campos obrigatórios
    if (!editarFerias.dataInicio || !editarFerias.dataFim) {
      alert('Por favor, preencha as datas de início e fim das férias.');
      return;
    }

    // Validar se as datas fazem sentido
    const inicio = new Date(editarFerias.dataInicio);
    const fim = new Date(editarFerias.dataFim);
    
    if (fim <= inicio) {
      alert('A data de fim deve ser posterior à data de início.');
      return;
    }

    // Validar se as datas não são no passado
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (inicio < hoje) {
      alert('Não é possível solicitar férias para datas passadas.');
      return;
    }

    // Calcular duração das férias
    const duracao = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    
    if (duracao > 30) {
      const confirmar = confirm(`Você está solicitando ${duracao} dias de férias. Deseja continuar?`);
      if (!confirmar) return;
    }

    setIsSubmittingFerias(true);
    try {
      // Editar a férias existente
      await UserService.editarFerias(
        feriasEditando.id,
        editarFerias.dataInicio,
        editarFerias.dataFim,
        editarFerias.motivo.trim()
      );

      alert(`Férias editada com sucesso! Duração: ${duracao} dias. A solicitação voltou para status "Pendente" para nova aprovação.`);
      
      // Fechar modal e limpar formulário
      setShowEditarFeriasModal(false);
      setFeriasEditando(null);
      setEditarFerias({
        dataInicio: '',
        dataFim: '',
        motivo: ''
      });
      
      // Recarregar férias
      await loadFerias();
    } catch (error) {
      console.error('Erro ao editar férias:', error);
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('Dados obrigatórios') || 
          errorMessage.includes('data de fim') ||
          errorMessage.includes('datas passadas')) {
        alert(errorMessage);
      } else {
        alert('Erro ao editar férias. Tente novamente.');
      }
    } finally {
      setIsSubmittingFerias(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      aceita: { color: 'bg-blue-100 text-blue-800', text: 'Aceita' },
      rejeitada: { color: 'bg-red-100 text-red-800', text: 'Rejeitada' },
      aprovada: { color: 'bg-green-100 text-green-800', text: 'Aprovada' },
      cancelada: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200', text: 'Cancelada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const textoDepoimentoConclusao = (paciente?.planoTerapeutico as { conclusaoTratamento?: { depoimento?: string } } | undefined)?.conclusaoTratamento?.depoimento?.trim() ?? '';
  const mostrarIconeDepoimentoLeitura = textoDepoimentoConclusao.length > 0 && !!medicoResponsavel;
  const nomePacienteDepoimentoModal =
    (paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || '').trim() || 'Paciente';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden" style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}>
      {/* Notificação NPS */}
      {!npsJaRespondido && mostrarNotificacaoNPS && (
        <NPSNotification onResponder={() => setShowNPSModal(true)} />
      )}

      {/* Modal NPS */}
      {user?.uid && (
        <NPSModal
          isOpen={showNPSModal}
          onClose={handleNPSModalClose}
          tipo="paciente"
          userId={user.uid}
          medicoResponsavelId={paciente?.medicoResponsavelId || undefined}
        />
      )}

      {/* Modal depoimento — somente leitura (paciente vê o texto enviado na conclusão; mesmo padrão visual do metaadmin) */}
      {showDepoimentoLeituraModal && textoDepoimentoConclusao.length > 0 && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="depoimento-meta-paciente-titulo"
          onClick={() => setShowDepoimentoLeituraModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-amber-200 dark:border-amber-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-950/40">
              <h2 id="depoimento-meta-paciente-titulo" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 min-w-0 pr-2">
                <Quote className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0" />
                Depoimento
              </h2>
              <button
                type="button"
                onClick={() => setShowDepoimentoLeituraModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 self-start"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto max-h-[calc(85vh-8rem)]">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Paciente:{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{nomePacienteDepoimentoModal}</span>
              </p>
              {paciente?.id && medicoResponsavel?.id ? (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Avaliação do médico</p>
                  <div className="flex items-center gap-0.5" aria-hidden>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        className={
                          s <= (estrelasDepoimentoLeitura ?? 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="rounded-lg border border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-gray-900/50 p-4">
                <p className="text-xs font-medium text-amber-900/80 dark:text-amber-200/90 mb-2">Texto enviado pelo paciente</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">{textoDepoimentoConclusao}</p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex flex-wrap justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDepoimentoLeituraModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar - Desktop Only */}
        <div className={`hidden lg:block fixed inset-y-0 left-0 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`} style={{ zIndex: showProfileDropdown ? 9999 : 40, isolation: showProfileDropdown ? 'isolate' : 'auto' }}>
          <div className="flex flex-col h-full" style={{ isolation: 'isolate' }}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <div className="mb-4">
                {medicoResponsavel && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                      </p>
                      {medicoResponsavel.isVerificado ? (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    {mostrarIconeDepoimentoLeitura && activeMenu === 'estatisticas' && (
                      <button
                        type="button"
                        onClick={() => setShowDepoimentoLeituraModal(true)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg shrink-0 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60 transition-colors w-fit"
                        title="Ver depoimento"
                        aria-label="Ver depoimento que você enviou sobre o médico"
                      >
                        <Quote className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    )}
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      medicoResponsavel.isVerificado
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {medicoResponsavel.isVerificado ? (
                        <>
                          <ShieldCheck className="h-3 w-3" />
                          Verificado
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3" />
                          Não Verificado
                        </>
                      )}
                    </div>
                    {paciente?.dadosIdentificacao?.nomeCompleto && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Paciente: {paciente.dadosIdentificacao.nomeCompleto}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            <button
              onClick={() => setActiveMenu('estatisticas')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'estatisticas'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Estatísticas' : ''}
            >
              <BarChart3 className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Estatísticas'}
            </button>

            <button
              onClick={() => setActiveMenu('exames')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'exames'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Exames' : ''}
            >
              <FlaskConical className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Exames'}
            </button>

            <button
              onClick={() => setActiveMenu('aplicacoes')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'aplicacoes'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Aplicações' : ''}
            >
              <Syringe className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Aplicações'}
            </button>

            {/* Médicos sempre visível: Buscar Médico e Minhas Solicitações */}
            <button
              onClick={() => setActiveMenu('medicos')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'medicos'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Médicos' : ''}
            >
              <Stethoscope className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Médicos'}
            </button>

            <button
              onClick={() => setActiveMenu('nutri')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'nutri'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Nutri' : ''}
            >
              <UtensilsCrossed className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Nutri'}
            </button>

            <button
              onClick={() => setActiveMenu('personal')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'personal'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Personal' : ''}
            >
              <Dumbbell className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Personal'}
            </button>

            <button
              onClick={() => setActiveMenu('indicar')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'indicar'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Encaminhar' : ''}
            >
              <UserPlus className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Encaminhar'}
            </button>
              
            </nav>

          {/* Profile button with dropdown - Desktop */}
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
              title={sidebarCollapsed ? 'Perfil' : ''}
            >
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Foto do perfil" 
                  className={`w-8 h-8 rounded-full ${sidebarCollapsed ? '' : 'mr-3'}`}
                />
              ) : (
                <div className={`w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center ${sidebarCollapsed ? '' : 'mr-3'}`}>
                  <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
              )}
              {!sidebarCollapsed && (
                <span className="flex-1 text-left">{user?.displayName || 'Perfil'}</span>
              )}
              {!sidebarCollapsed && (
                <ChevronDown className={`w-4 h-4 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {/* Dropdown menu - Desktop (absolute, sem Portal) */}
            {showProfileDropdown && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 min-w-[280px]">
                {/* Header com foto, nome e email */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Foto do perfil" 
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {user?.displayName || 'Usuário'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {user?.email || ''}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Opções do menu */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveMenu('perfil');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <UserIcon className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                    Meu Perfil
                  </button>
                  <button
                    onClick={() => {
                      setActiveMenu('exames');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FlaskConical className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                    Meus Exames
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowRecomendacoesModal(true);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <AlertTriangle className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                    Recomendações
                  </button>
                  {medicoResponsavel && paciente?.statusTratamento === 'em_tratamento' && (
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowMensagensMedicoModal(true);
                        loadMensagensPacienteAtual();
                      }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
                    >
                      <MessageSquare className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                      Mensagens
                      {mensagensNaoLidasPaciente > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {mensagensNaoLidasPaciente > 9 ? '9+' : mensagensNaoLidasPaciente}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      gerarRelatorioCompleto();
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FileText className="w-5 h-5 mr-3 text-gray-600 dark:text-gray-400" />
                    Relatório Final
                  </button>
                </div>
                
                {/* Separador */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>
                
                {/* Sair */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sair
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
        
        {/* Main Content - Full width on mobile, with sidebar offset on desktop */}
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} overflow-x-hidden pb-20 lg:pb-0 bg-gray-50 dark:bg-gray-900`} style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none', width: '100%', maxWidth: '100%', zIndex: 1, position: 'relative' }}>
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col flex-1 min-w-0">
                {/* Médico - quando vinculado, info fica no header; botão para abrir Médicos ao lado do perfil */}
                {medicoResponsavel && (
                  <div className="flex items-center mb-1.5">
                    <Stethoscope className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div className="ml-2 min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <div className="text-sm font-bold text-gray-900 truncate">
                          {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                        </div>
                        {medicoResponsavel.isVerificado ? (
                          <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Shield className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => classificacaoMedico == null && paciente?.id && openModalClassificacao('medico', medicoResponsavel.id, `${medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoResponsavel.nome}`)}
                            className="flex items-center gap-0.5"
                            aria-label="Avaliar médico"
                          >
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={10} className={s <= (classificacaoMedico ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                            ))}
                          </button>
                          {classificacaoMedico == null && (
                            <RatingHint text="Avalie sua experiência com este médico. Sua opinião ajuda outros pacientes." />
                          )}
                        </div>
                      </div>
                      {mostrarIconeDepoimentoLeitura && activeMenu === 'estatisticas' && (
                        <button
                          type="button"
                          onClick={() => setShowDepoimentoLeituraModal(true)}
                          className="mt-1.5 inline-flex items-center justify-center p-1.5 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60 transition-colors shrink-0"
                          title="Ver depoimento"
                          aria-label="Ver depoimento que você enviou sobre o médico"
                        >
                          <Quote size={16} strokeWidth={2.25} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {/* Nutricionista: só na aba Nutri */}
                {activeMenu === 'nutri' && nutricionistaVinculado && (
                  <div className="flex items-center">
                    <UtensilsCrossed className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div className="ml-2 min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <div className="text-sm font-bold text-gray-900 truncate">
                          {nutricionistaVinculado.nome}
                        </div>
                        {nutricionistaVinculado.isVerificado !== undefined && (
                          nutricionistaVinculado.isVerificado ? (
                            <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <Shield className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )
                        )}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => classificacaoNutri == null && paciente?.id && openModalClassificacao('nutricionista', nutricionistaVinculado.id, nutricionistaVinculado.nome)}
                            className="flex items-center gap-0.5"
                            aria-label="Avaliar nutricionista"
                          >
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={10} className={s <= (classificacaoNutri ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                            ))}
                          </button>
                          {classificacaoNutri == null && (
                            <RatingHint text="Avalie sua experiência com este nutricionista. Sua opinião ajuda outros pacientes." />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Personal: só na aba Personal */}
                {activeMenu === 'personal' && personalVinculado && (
                  <div className="flex items-center">
                    <Dumbbell className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div className="ml-2 min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <div className="text-sm font-bold text-gray-900 truncate">
                          {personalVinculado.nome}
                        </div>
                        {personalVinculado.isVerificado !== undefined && (
                          personalVinculado.isVerificado ? (
                            <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <Shield className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )
                        )}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => classificacaoPersonal == null && paciente?.id && openModalClassificacao('personal', personalVinculado.id, personalVinculado.nome)}
                            className="flex items-center gap-0.5"
                            aria-label="Avaliar personal"
                          >
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={10} className={s <= (classificacaoPersonal ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                            ))}
                          </button>
                          {classificacaoPersonal == null && (
                            <RatingHint text="Avalie sua experiência com este personal. Sua opinião ajuda outros pacientes." />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* Botão Médicos no header — sempre visível */}
                <button
                  onClick={() => setActiveMenu('medicos')}
                  className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Médicos"
                >
                  <Stethoscope className="w-6 h-6 text-green-600" />
                </button>
                {/* Profile button with dropdown on mobile */}
                <div className="relative">
                  <button
                    ref={profileButtonMobileRef}
                    onClick={() => {
                      if (profileButtonMobileRef.current) {
                        const rect = profileButtonMobileRef.current.getBoundingClientRect();
                        setDropdownPosition({
                          top: rect.bottom + 8, // 8px abaixo do botão
                          right: window.innerWidth - rect.right // Distância da borda direita
                        });
                      }
                      setShowProfileDropdown(!showProfileDropdown);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Perfil"
                  >
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Foto do perfil" 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </button>
                  
                  {/* Dropdown mobile via portal apenas abaixo do breakpoint lg (1024px); matchMedia é síncrono */}
                  {showProfileDropdown &&
                  typeof window !== 'undefined' &&
                  !window.matchMedia('(min-width: 1024px)').matches
                    ? createPortal(
                    <>
                      <div 
                        className="fixed inset-0 z-[99998]" 
                        onClick={() => setShowProfileDropdown(false)}
                        style={{ backgroundColor: 'transparent' }}
                      />
                      <div 
                        className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden min-w-[280px]"
                        style={{ 
                          zIndex: 99999,
                          position: 'fixed',
                          top: `${dropdownPosition.top}px`,
                          right: `${dropdownPosition.right}px`,
                          maxWidth: 'calc(100vw - 2rem)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header com foto, nome e email */}
                        <div className="px-4 py-3 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
                          <div className="flex items-center gap-3">
                            {user?.photoURL ? (
                              <img 
                                src={user.photoURL} 
                                alt="Foto do perfil" 
                                className="w-12 h-12 rounded-full border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-gray-700" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {user?.displayName || 'Usuário'}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {user?.email || ''}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Opções do menu */}
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setActiveMenu('perfil');
                              setShowProfileDropdown(false);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <UserIcon className="w-5 h-5 mr-3 text-gray-600" />
                            Meu Perfil
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenu('exames');
                              setShowProfileDropdown(false);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <FlaskConical className="w-5 h-5 mr-3 text-gray-600" />
                            Meus Exames
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setShowRecomendacoesModal(true);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <AlertTriangle className="w-5 h-5 mr-3 text-gray-600" />
                            Recomendações
                          </button>
                          {medicoResponsavel && paciente?.statusTratamento === 'em_tratamento' && (
                            <button
                              onClick={() => {
                                setShowProfileDropdown(false);
                                setShowMensagensMedicoModal(true);
                                loadMensagensPacienteAtual();
                              }}
                              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors relative"
                            >
                              <MessageSquare className="w-5 h-5 mr-3 text-gray-600" />
                              Mensagens
                              {mensagensNaoLidasPaciente > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                  {mensagensNaoLidasPaciente > 9 ? '9+' : mensagensNaoLidasPaciente}
                                </span>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              gerarRelatorioCompleto();
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <FileText className="w-5 h-5 mr-3 text-gray-600" />
                            Relatório Final
                          </button>
                          {/* Encaminhar Paciente - apenas mobile */}
                          <button
                            onClick={() => {
                              setActiveMenu('indicar');
                              setShowProfileDropdown(false);
                            }}
                            className="lg:hidden w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <UserPlus className="w-5 h-5 mr-3 text-gray-600" />
                            Encaminhar Paciente
                          </button>
                        </div>
                        
                        {/* Separador */}
                        <div className="border-t border-gray-200"></div>
                        
                        {/* Sair */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sair
                        </button>
                      </div>
                    </>,
                    document.body
                  )
                    : null}
                </div>
              </div>
            </div>
          </div>
          
          <main className="p-6 bg-gray-50 dark:bg-gray-900 relative">
            {/* Barra: complete seus dados quando não tem médico nem solicitação em aberto, ou falta data de nascimento */}
            {paciente?.id && !searchParams.get('pacienteId') && (semMedicoNemSolicitacao || !paciente.dadosIdentificacao?.dataNascimento) && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/95 dark:bg-amber-900/20 dark:border-amber-700/50 px-4 py-2.5 shadow-sm">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Complete seus dados para um melhor acompanhamento.
                </p>
                <button
                  type="button"
                  onClick={() => openModalDadosPaciente()}
                  className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Preencher agora
                </button>
              </div>
            )}
            {/* Botão Add to Home Screen - topo esquerdo, acima do banner */}
            {canShowInstall && !isStandalone && activeMenu === 'estatisticas' && (
              <button
                onClick={async () => {
                  if (deferredPrompt) {
                    await deferredPrompt.prompt();
                  } else {
                    setShowInstallModal(true);
                  }
                }}
                className="absolute top-2 left-2 z-20 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-md border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Adicionar à tela inicial"
                aria-label="Adicionar à tela inicial"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            {/* Modal instruções iOS Add to Home Screen */}
            {showInstallModal && typeof window !== 'undefined' && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[99998] bg-black/50"
                  onClick={() => setShowInstallModal(false)}
                />
                <div
                  className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[99999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm mx-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setShowInstallModal(false)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      aria-label="Fechar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Share2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Adicionar à tela inicial</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Toque no botão <strong>Compartilhar</strong> (□↑) na barra inferior do Safari, 
                      depois em <strong>Adicionar à Tela de Início</strong>.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Assim o app abrirá direto nesta página quando você tocar no ícone.
                    </p>
                  </div>
                </div>
              </>,
              document.body
            )}
            {/* Banner em main só no layout customizado (modern/minimal/interactive); layout padrão renderiza ao lado do card de peso */}
            {activeMenu === 'estatisticas' && !loadingBanners && banners.length > 0 && !!(layoutParam || preferenciaLayout) && (
              <div 
                className="mb-6 rounded-lg overflow-hidden shadow-lg"
                style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
                onTouchStart={(e) => {
                  setTouchEnd(null);
                  setTouchStart(e.targetTouches[0].clientX);
                }}
                onTouchMove={(e) => {
                  setTouchEnd(e.targetTouches[0].clientX);
                }}
                onTouchEnd={() => {
                  if (!touchStart || !touchEnd) return;
                  
                  const distance = touchStart - touchEnd;
                  const isLeftSwipe = distance > 50;
                  const isRightSwipe = distance < -50;
                  
                  if (isLeftSwipe && currentBannerIndex < banners.length - 1) {
                    setCurrentBannerIndex(currentBannerIndex + 1);
                  }
                  if (isRightSwipe && currentBannerIndex > 0) {
                    setCurrentBannerIndex(currentBannerIndex - 1);
                  }
                }}
              >
                <div className="relative w-full overflow-hidden" style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}>
                  <div 
                    className="flex transition-transform duration-300 ease-in-out"
                    style={{ 
                      transform: `translateX(-${currentBannerIndex * (100 / banners.length)}%)`,
                      width: `${banners.length * 100}%`
                    }}
                  >
                    {banners.map((banner) => (
                      <Link
                        key={banner.id}
                        href={`/meta/banner/${banner.id}`}
                        prefetch
                        className="block relative flex-shrink-0"
                        style={{ width: `${100 / banners.length}%`, touchAction: 'manipulation' }}
                      >
                        <img
                          src={banner.imagemUrl}
                          alt={banner.titulo}
                          className="w-full h-48 md:h-64 object-contain select-none pointer-events-none"
                          draggable={false}
                        />
                      </Link>
                    ))}
                  </div>
                  {banners.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 pointer-events-none">
                      {banners.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCurrentBannerIndex(index);
                            setAutoRotateEnabled(false);
                            setTimeout(() => {
                              setAutoRotateEnabled(true);
                            }, 3000);
                          }}
                          className={`h-2 rounded-full transition-all pointer-events-auto ${
                            index === currentBannerIndex ? 'bg-white w-8' : 'bg-white/50 w-2'
                          }`}
                          aria-label={`Banner ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Alerta para ler recomendações - Só aparece na página de Estatísticas */}
            {activeMenu === 'estatisticas' && paciente && paciente.medicoResponsavelId && !paciente.recomendacoesLidas && (
              <div className="mb-4 bg-gradient-to-r from-orange-50 to-purple-50 dark:from-orange-900/20 dark:to-purple-900/20 border-l-4 border-orange-500 dark:border-orange-600 rounded-lg p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Importante: Leia as Recomendações</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      Para obter os melhores resultados com o tratamento, é essencial que você leia e compreenda as recomendações de alimentação e exercícios físicos.
                    </p>
                    <button
                      onClick={async () => {
                        setShowRecomendacoesModal(true);
                        if (!recomendacoesLidas && paciente) {
                          try {
                            setRecomendacoesLidas(true);
                            const pacienteAtualizado = {
                              ...paciente,
                              recomendacoesLidas: true,
                              dataLeituraRecomendacoes: new Date()
                            };
                            await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                            setPaciente(pacienteAtualizado);
                            try {
                              await fetch('/api/send-email-check-recomendacoes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pacienteId: paciente.id }),
                              });
                            } catch (emailError) {
                              console.error('Erro ao enviar e-mail de check recomendações:', emailError);
                            }
                          } catch (error) {
                            console.error('Erro ao marcar recomendações como lidas:', error);
                            setRecomendacoesLidas(false);
                          }
                        }
                      }}
                      className="bg-gradient-to-r from-purple-600 to-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-orange-700 transition-all shadow-sm hover:shadow-md"
                    >
                      Ler Recomendações
                    </button>
                  </div>
                </div>
              </div>
            )}
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Fixed at bottom, no logout button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 lg:hidden z-50">
        <div className="flex justify-around items-center py-1.5">
          <button
            onClick={() => setActiveMenu('estatisticas')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'estatisticas'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Home</span>
          </button>

          <button
            onClick={() => setActiveMenu('exames')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'exames'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <FlaskConical className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Exames</span>
          </button>

          <button
            onClick={() => setActiveMenu('aplicacoes')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'aplicacoes'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Syringe className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Aplicações</span>
          </button>

          {/* Médicos não aparece no menu inferior (mobile): fluxo é pelo modal de questionário / perfil */}
          <button
            onClick={() => setActiveMenu('nutri')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'nutri'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Nutri</span>
          </button>

          <button
            onClick={() => setActiveMenu('personal')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'personal'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Dumbbell className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Personal</span>
          </button>

        </div>
      </div>

      {/* Botão Flutuante para Selecionar Data dos Exames */}
      {(() => {
        const examesFlutuante = paciente?.examesLaboratoriais || [];
        
        if (activeMenu !== 'exames' || examesFlutuante.length === 0) {
          return null;
        }
        
        const safeDateToStringFlutuante = (date: any): string => {
          if (!date) return '';
          try {
            let d: Date;
            if (date instanceof Date) {
              d = date;
            } else if (typeof date === 'string') {
              d = new Date(date);
            } else if (date.toDate) {
              d = date.toDate();
            } else {
              d = new Date(date);
            }
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
          } catch {
            return '';
          }
        };
        
        const examesOrdenadosFlutuante = [...examesFlutuante].sort((a, b) => {
          const dateA = safeDateToStringFlutuante(a.dataColeta);
          const dateB = safeDateToStringFlutuante(b.dataColeta);
          return dateB.localeCompare(dateA);
        }).filter(e => safeDateToStringFlutuante(e.dataColeta));
        
        const dataInicialFlutuante = examesOrdenadosFlutuante.length > 0 
          ? safeDateToStringFlutuante(examesOrdenadosFlutuante[0].dataColeta)
          : '';
        
        const dataSelecionadaFlutuante = exameDataSelecionada || dataInicialFlutuante;
        
        return (
          <>
            {/* Botão flutuante */}
            <button
              onClick={() => setShowSeletorFlutuanteExames(!showSeletorFlutuanteExames)}
              className="fixed bottom-20 right-4 bg-green-600 text-white rounded-full w-14 h-14 shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center z-40"
            >
              <Calendar className="w-6 h-6" />
            </button>
            
            {/* Seletor flutuante */}
            {showSeletorFlutuanteExames && (
              <div className="fixed bottom-32 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-40 border border-gray-200 dark:border-gray-700 w-64">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selecionar Exame
                  </label>
                  <button
                    onClick={() => setShowSeletorFlutuanteExames(false)}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={18} />
                  </button>
                </div>
                <select
                  value={dataSelecionadaFlutuante}
                  onChange={(e) => {
                    setExameDataSelecionada(e.target.value);
                    setShowSeletorFlutuanteExames(false);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm"
                >
                  {examesOrdenadosFlutuante.map((exame, idx) => {
                    const dataExame = safeDateToStringFlutuante(exame.dataColeta);
                    let dataFormatada = '';
                    if (dataExame) {
                      try {
                        const d = new Date(dataExame);
                        if (!isNaN(d.getTime())) {
                          dataFormatada = d.toLocaleDateString('pt-BR');
                        }
                      } catch {}
                    }
                    
                    return (
                      <option key={idx} value={dataExame}>
                        {dataFormatada}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </>
        );
      })()}

      {/* Modal de Mensagens */}
      {showMensagensModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mensagens</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowEnviarMensagemModal(true)}
                  className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors flex items-center text-sm"
                >
                  <Plus size={16} className="mr-1" />
                  Enviar
                </button>
                {mensagensNaoLidas > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {mensagensNaoLidas} não lida{mensagensNaoLidas !== 1 ? 's' : ''}
                  </span>
                )}
                <RefreshCw 
                  className="h-5 w-5 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors" 
                  onClick={() => loadMensagens()}
                />
                <button
                  onClick={() => setShowMensagensModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Abas */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTabMensagens('recebidas')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTabMensagens === 'recebidas'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recebidas
                  {mensagensNaoLidas > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {mensagensNaoLidas}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTabMensagens('enviadas')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTabMensagens === 'enviadas'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Enviadas
                </button>
              </div>

              {/* Conteúdo das abas */}
              <div className="overflow-y-auto max-h-[60vh]">
                {activeTabMensagens === 'recebidas' ? (
                  loadingMensagens ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : mensagens.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma mensagem recebida</h4>
                      <p className="text-gray-500">Você ainda não recebeu nenhuma mensagem do admin.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mensagens.map((mensagem) => (
                        <div 
                          key={mensagem.id} 
                          className={`bg-white border rounded-lg p-4 shadow-sm cursor-pointer transition-colors ${
                            mensagem.lida 
                              ? 'border-gray-200 hover:border-gray-300' 
                              : 'border-green-200 bg-green-50 hover:border-green-300'
                          }`}
                          onClick={() => !mensagem.lida && marcarComoLida(mensagem.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className={`text-lg font-semibold ${mensagem.lida ? 'text-gray-900' : 'text-green-900'}`}>
                              {mensagem.titulo}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {!mensagem.lida && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Nova
                                </span>
                              )}
                              <div className="text-sm text-gray-500">
                                {mensagem.criadoEm.toLocaleDateString('pt-BR')} às {mensagem.criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          <p className={`${mensagem.lida ? 'text-gray-700' : 'text-green-800'}`}>
                            {mensagem.mensagem}
                          </p>
                          {mensagem.lida && mensagem.lidaEm && (
                            <div className="mt-2 text-xs text-gray-500">
                              Lida em {mensagem.lidaEm.toLocaleDateString('pt-BR')} às {mensagem.lidaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  loadingMensagensEnviadas ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                  ) : mensagensEnviadas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma mensagem enviada</h4>
                      <p className="text-gray-500">Suas mensagens enviadas para o admin aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mensagensEnviadas.map((mensagem) => (
                        <div 
                          key={mensagem.id} 
                          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {mensagem.titulo}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-gray-500">
                                {mensagem.criadoEm.toLocaleDateString('pt-BR')} às {mensagem.criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <button
                                onClick={() => handleDeletarMensagemEnviada(mensagem.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Deletar mensagem"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-700 mb-3">
                            {mensagem.mensagem}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>
                              {mensagem.anonima ? 'Enviada como anônima' : 'Enviada como ' + mensagem.residenteNome}
                            </span>
                            {mensagem.lida && (
                              <span className="text-green-600">
                                ✓ Lida pelo admin
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enviar Mensagem para Admin */}
      {showEnviarMensagemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Enviar Mensagem para Admin</h2>
              <button
                onClick={() => setShowEnviarMensagemModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={novaMensagemAdmin.titulo}
                  onChange={(e) => setNovaMensagemAdmin(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                  placeholder="Digite o título da mensagem"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Mensagem
                </label>
                <textarea
                  value={novaMensagemAdmin.mensagem}
                  onChange={(e) => setNovaMensagemAdmin(prev => ({ ...prev, mensagem: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black h-32 resize-none"
                  placeholder="Digite sua mensagem"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="anonima"
                  checked={novaMensagemAdmin.anonima}
                  onChange={(e) => setNovaMensagemAdmin(prev => ({ ...prev, anonima: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="anonima" className="text-sm text-black">
                  Enviar como anônimo
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowEnviarMensagemModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviarMensagemAdmin}
                  disabled={loading || !novaMensagemAdmin.titulo.trim() || !novaMensagemAdmin.mensagem.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Médico */}
      {showModalMedico && medicoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white w-full h-full md:rounded-lg md:w-auto md:h-auto md:max-w-2xl md:max-h-[85vh] overflow-y-auto flex flex-col relative shadow-xl">
            {/* Overlay de carregamento */}
            {loadingSolicitacaoMedico && (
              <div className="absolute inset-0 bg-white/95 md:rounded-lg flex flex-col items-center justify-center z-10">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
                <p className="text-gray-700 font-medium">Carregando e preparando o envio...</p>
                <p className="text-sm text-gray-500 mt-1">Por favor, aguarde.</p>
              </div>
            )}
            {/* Header */}
            <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 sticky top-0 bg-white z-10 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Solicitar Médico</h3>
              <button
                onClick={() => {
                  if (!loadingSolicitacaoMedico) {
                    setShowModalMedico(false);
                    setMedicoSelecionado(null);
                    setTelefonePaciente('');
                    setPesoPacienteModal('');
                    setAlturaPacienteModal('');
                    setIsDraggingIMCModal(false);
                    setPesoTemporarioIMCModal(null);
                    setImcTemporarioIMCModal(null);
                  }
                }}
                disabled={loadingSolicitacaoMedico}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-lg font-bold text-gray-900 mb-3">
                  {medicoSelecionado.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoSelecionado.nome}
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><span className="font-semibold">CRM:</span> {medicoSelecionado.crm.estado}-{medicoSelecionado.crm.numero}</p>
                  <p><span className="font-semibold">Localização:</span> {medicoSelecionado.localizacao.endereco}</p>
                  {medicoSelecionado.telefone && (
                    <p><span className="font-semibold">Telefone:</span> {medicoSelecionado.telefone}</p>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Cidades atendidas:</p>
                  <div className="flex flex-wrap gap-2">
                    {medicoSelecionado.cidades.map((c, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        {c.cidade}/{c.estado}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. Seu número de telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seu número de telefone *</label>
                <input
                  type="tel"
                  value={telefonePaciente}
                  onChange={(e) => setTelefonePaciente(e.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={loadingSolicitacaoMedico}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">O médico usará este número para entrar em contato com você</p>
              </div>

              {/* 2. Peso e Altura — só exibir se o paciente ainda não tiver esses dados cadastrados */}
              {(() => {
                const m = paciente?.dadosClinicos?.medidasIniciais;
                const pacienteTemPesoAltura = !!(m?.peso && Number(m.peso) > 0 && m?.altura && Number(m.altura) > 0);
                if (pacienteTemPesoAltura) return null;
                return (
                  <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="400"
                    value={pesoPacienteModal}
                    onChange={(e) => setPesoPacienteModal(e.target.value)}
                    placeholder="Ex: 85"
                    disabled={loadingSolicitacaoMedico}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm ou m)</label>
                  <input
                    type="number"
                    min="1"
                    max="250"
                    step="0.01"
                    value={alturaPacienteModal}
                    onChange={(e) => setAlturaPacienteModal(e.target.value)}
                    placeholder="Ex: 170 ou 1.70"
                    disabled={loadingSolicitacaoMedico}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* 3. Card IMC interativo */}
              {(() => {
                const alturaCm = alturaInputParaCm(alturaPacienteModal);
                const alturaMetros = alturaCm ? alturaCm / 100 : null;
                const pesoInput = parseFloat(pesoPacienteModal);
                let imcAtual: number | null = null;
                if (isDraggingIMCModal && imcTemporarioIMCModal !== null) {
                  imcAtual = imcTemporarioIMCModal;
                } else if (alturaMetros && pesoInput && pesoInput > 0) {
                  imcAtual = pesoInput / (alturaMetros * alturaMetros);
                }
                const pesoAtual = isDraggingIMCModal && pesoTemporarioIMCModal !== null
                  ? pesoTemporarioIMCModal
                  : (pesoInput && pesoInput > 0 ? pesoInput : null);

                const calcularGrauObesidadeModal = (imc: number | null | undefined): string | null => {
                  if (!imc || imc === 0) return null;
                  if (imc < 18.5) return 'Abaixo do peso';
                  if (imc < 25) return 'Peso normal';
                  if (imc < 30) return 'Sobrepeso';
                  if (imc < 35) return 'Obesidade Grau I';
                  if (imc < 40) return 'Obesidade Grau II';
                  return 'Obesidade Grau III';
                };
                const getCorGrauObesidadeModal = (grau: string | null): string => {
                  if (!grau) return 'text-gray-500';
                  if (grau.includes('Grau III')) return 'text-red-600 font-semibold';
                  if (grau.includes('Grau II')) return 'text-orange-600 font-semibold';
                  if (grau.includes('Grau I')) return 'text-yellow-600 font-semibold';
                  if (grau === 'Sobrepeso') return 'text-amber-600';
                  if (grau === 'Peso normal') return 'text-green-600';
                  return 'text-blue-600';
                };
                const classificarIMC = (imc: number | null | undefined): { icone: string } | null => {
                  if (!imc || imc === 0) return null;
                  if (imc < 18.5) return { icone: '😟' };
                  if (imc < 25) return { icone: '🙂' };
                  if (imc < 30) return { icone: '😐' };
                  return { icone: '😟' };
                };
                const calcularPosicaoMarcador = (imc: number | null | undefined): number => {
                  if (!imc || imc === 0) return 0;
                  if (imc < 18.5) return (imc / 18.5) * 25;
                  if (imc < 25) return 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
                  if (imc < 30) return 50 + ((imc - 25) / (30 - 25)) * 25;
                  return 75 + Math.min(((imc - 30) / 20) * 25, 25);
                };
                const pesoIdealSaudavel = alturaMetros ? 25 * (alturaMetros * alturaMetros) : null;
                const kgParaPerder = pesoAtual && pesoIdealSaudavel && imcAtual && imcAtual > 25
                  ? pesoAtual - pesoIdealSaudavel
                  : null;

                if (!alturaMetros || !pesoAtual || pesoAtual <= 0) return null;

                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <div className="text-xs text-blue-700 font-medium mb-1">Peso Atual</div>
                        <div className="text-sm font-semibold text-blue-900">{pesoAtual.toFixed(1)} kg</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-blue-700 font-medium mb-1">Altura</div>
                        <div className="text-sm font-semibold text-blue-900">{alturaMetros.toFixed(2)} m</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-blue-700 font-medium mb-1">IMC</div>
                        <div className="text-sm font-semibold text-blue-900">{imcAtual?.toFixed(1) || '-'}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="relative mb-1 h-4">
                        <span className="absolute text-xs text-gray-500" style={{ left: '25%', transform: 'translateX(-50%)' }}>18.5</span>
                        <span className="absolute text-xs text-gray-500" style={{ left: '50%', transform: 'translateX(-50%)' }}>25</span>
                        <span className="absolute text-xs text-gray-500" style={{ left: '75%', transform: 'translateX(-50%)' }}>30</span>
                      </div>
                      <div
                        ref={barraIMCRefModal}
                        className="relative rounded-full overflow-visible bg-gray-100"
                        style={{ height: '6px', borderRadius: '999px' }}
                      >
                        <div className="absolute left-0 top-0 h-full" style={{ width: '25%', backgroundColor: '#60a5fa' }} />
                        <div className="absolute left-1/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#34d399' }} />
                        <div className="absolute left-2/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#fbbf24' }} />
                        <div className="absolute left-3/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#f87171' }} />
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing"
                          style={{ left: `${calcularPosicaoMarcador(imcAtual)}%`, userSelect: 'none' }}
                          onMouseDown={(e) => { e.preventDefault(); setIsDraggingIMCModal(true); }}
                          onTouchStart={() => setIsDraggingIMCModal(true)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600 text-xs font-bold">&lt;</span>
                            <div className="bg-white border-2 border-gray-400 rounded-full shadow-lg flex items-center justify-center hover:scale-110" style={{ width: '24px', height: '24px' }}>
                              <span style={{ fontSize: '14px' }}>{classificarIMC(imcAtual)?.icone || '🙂'}</span>
                            </div>
                            <span className="text-gray-600 text-xs font-bold">&gt;</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-gray-500 text-[11px]">Baixo</span>
                        <span className="text-gray-500 text-[11px]">Saudável</span>
                        <span className="text-gray-500 text-[11px]">Alto</span>
                        <span className="text-gray-500 text-[11px]">Obeso</span>
                      </div>
                      <div className="mt-2 text-center">
                        <div className="text-xs text-blue-700 font-medium mb-1">Grau de Obesidade</div>
                        <div className={`text-sm font-semibold ${getCorGrauObesidadeModal(calcularGrauObesidadeModal(imcAtual))}`}>
                          {calcularGrauObesidadeModal(imcAtual) || '-'}
                        </div>
                        {kgParaPerder !== null && kgParaPerder > 0 && (
                          <p className="text-xs text-amber-700 mt-2 font-medium">
                            Para peso saudável (IMC 25): precisa perder ~{kgParaPerder.toFixed(1)} kg
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
                  </>
                );
              })()}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Ao enviar esta solicitação, o médico receberá uma notificação. Você poderá acompanhar o status da solicitação em suas notificações.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 flex-shrink-0">
              <button
                onClick={() => {
                  if (!loadingSolicitacaoMedico) {
                    setShowModalMedico(false);
                    setMedicoSelecionado(null);
                    setTelefonePaciente('');
                    setPesoPacienteModal('');
                    setAlturaPacienteModal('');
                  }
                }}
                disabled={loadingSolicitacaoMedico}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!user || !medicoSelecionado || loadingSolicitacaoMedico) return;
                  if (!telefonePaciente.trim()) {
                    alert('Por favor, informe seu número de telefone para que o médico possa entrar em contato.');
                    return;
                  }
                  if (paciente?.statusTratamento === 'em_tratamento') {
                    alert(`Você já está sendo acompanhado por ${medicoResponsavel?.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoResponsavel?.nome}. Não é possível solicitar um novo médico durante o tratamento.`);
                    return;
                  }
                  const m = paciente?.dadosClinicos?.medidasIniciais;
                  const pacienteTemPesoAltura = !!(m?.peso && Number(m.peso) > 0 && m?.altura && Number(m.altura) > 0);
                  if (!pacienteTemPesoAltura) {
                    const pesoVal = pesoTemporarioIMCModal ?? parseFloat(pesoPacienteModal);
                    const alturaVal = alturaInputParaCm(alturaPacienteModal);
                    if (!pesoVal || pesoVal <= 0 || !alturaVal || alturaVal <= 0) {
                      alert('Por favor, informe seu peso e altura.');
                      return;
                    }
                  }
                  if (hasSolicitacaoAberta) {
                    alert('Você já está com uma solicitação em aberto. Acompanhe em "Minhas Solicitações" ou cancele a anterior antes de enviar outra.');
                    return;
                  }
                  setShowConfirmacaoSolicitarMedico(true);
                }}
                disabled={loadingSolicitacaoMedico || !telefonePaciente.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loadingSolicitacaoMedico ? 'Enviando...' : 'Confirmar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação: Realmente deseja fazer a solicitação? */}
      {showConfirmacaoSolicitarMedico && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <p className="text-gray-900 font-medium text-center mb-6">
              Realmente deseja fazer a solicitação?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowConfirmacaoSolicitarMedico(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executarEnvioSolicitacaoMedico()}
                disabled={loadingSolicitacaoMedico}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviado — exibido após sucesso do envio da solicitação */}
      {showModalSolicitacaoEnviada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <p className="text-gray-900 font-semibold text-center mb-6">Enviado</p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowModalSolicitacaoEnviada(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Desistência */}
      {showModalDesistir && solicitacaoParaDesistir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Desistir da Solicitação</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                Você está prestes a desistir da solicitação de atendimento com <strong>{solicitacaoParaDesistir.medicoNome}</strong>.
              </p>
              <p className="text-sm text-gray-600">
                Esta ação irá cancelar o vínculo com este médico. Você poderá solicitar novamente no futuro.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da desistência *
                </label>
                <select
                  value={motivoDesistencia}
                  onChange={(e) => setMotivoDesistencia(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Selecione um motivo</option>
                  {MOTIVOS_DESISTENCIA.map((motivo) => (
                    <option key={motivo} value={motivo}>
                      {motivo}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-gray-500">
                * Seus dados serão compartilhados com o médico para melhorar o atendimento.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModalDesistir(false);
                  setSolicitacaoParaDesistir(null);
                  setMotivoDesistencia('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!motivoDesistencia) {
                    alert('Por favor, selecione um motivo da desistência.');
                    return;
                  }

                  try {
                    await SolicitacaoMedicoService.desistirSolicitacao(solicitacaoParaDesistir.id, motivoDesistencia);
                    
                    // Se estava aceita, excluir o registro do paciente
                    if (solicitacaoParaDesistir.status === 'aceita' && paciente?.id) {
                      await PacienteService.deletePaciente(paciente.id);
                      setPaciente(null);
                    }
                    
                    // Atualizar listas
                    await loadMinhasSolicitacoes();
                    await loadPaciente();
                    
                    alert('Solicitação cancelada com sucesso.');
                    setShowModalDesistir(false);
                    setSolicitacaoParaDesistir(null);
                    setMotivoDesistencia('');
                  } catch (error) {
                    console.error('Erro ao cancelar solicitação:', error);
                    alert('Erro ao cancelar solicitação');
                  }
                }}
                disabled={!motivoDesistencia}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Confirmar Desistência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mensagens Médico-Paciente */}
      {showMensagensMedicoModal && medicoResponsavel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mensagens com Médico</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowMensagensMedicoModal(false);
                    setAbaAtivaMensagens('recebidas');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setAbaAtivaMensagens('recebidas')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  abaAtivaMensagens === 'recebidas'
                    ? 'border-green-500 text-green-700 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mensagens Recebidas
                {mensagensNaoLidasPaciente > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {mensagensNaoLidasPaciente}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAbaAtivaMensagens('enviadas')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  abaAtivaMensagens === 'enviadas'
                    ? 'border-green-500 text-green-700 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mensagens Enviadas
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6">
              {abaAtivaMensagens === 'recebidas' ? (
                /* Mensagens Recebidas */
                <div className="space-y-4">
                  <div>
                    {loadingMensagensPaciente && mensagensPaciente.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Carregando mensagens...</div>
                    ) : mensagensPaciente.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        Nenhuma mensagem recebida ainda
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {mensagensPaciente.map((msg) => (
                          <div
                            key={msg.id}
                            className={`border rounded-lg p-4 ${msg.lida ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-gray-900">{msg.titulo}</span>
                                  <span className={`px-2 py-0.5 text-xs rounded-full bg-white border border-gray-300 capitalize ${
                                    msg.tipo === 'clinico' ? 'text-gray-900' : 'text-gray-600'
                                  }`}>
                                    {msg.tipo}
                                  </span>
                                  {!msg.lida && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                                      Nova
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">{msg.mensagem}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(msg.criadoEm).toLocaleDateString('pt-BR')} às {new Date(msg.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {!msg.lida && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await PacienteMensagemService.marcarComoLida(msg.id);
                                      await loadMensagensPacienteAtual();
                                    } catch (error) {
                                      console.error('Erro ao marcar como lida:', error);
                                    }
                                  }}
                                  className="ml-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  Marcar como lida
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Botão para ir para aba de enviadas */}
                  <div className="text-center pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setAbaAtivaMensagens('enviadas')}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      Enviar nova mensagem →
                    </button>
                  </div>
                </div>
              ) : (
                /* Mensagens Enviadas */
                <div className="space-y-4">
                  <div>
                    {loadingMensagensPaciente && mensagensEnviadasPaciente.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Carregando mensagens...</div>
                    ) : mensagensEnviadasPaciente.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-4">Nenhuma mensagem enviada ainda</p>
                        <button
                          onClick={() => setShowEnviarMensagemMedicoModal(true)}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1.5 mx-auto"
                        >
                          <Plus size={14} />
                          Nova Mensagem
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {mensagensEnviadasPaciente.map((msg) => (
                            <div
                              key={msg.id}
                              className="border rounded-lg p-4 bg-green-50 border-green-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-gray-900">{msg.titulo}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full bg-white border border-gray-300 capitalize ${
                                      msg.tipo === 'clinico' ? 'text-gray-900' : 'text-gray-600'
                                    }`}>
                                      {msg.tipo}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">{msg.mensagem}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(msg.criadoEm).toLocaleDateString('pt-BR')} às {new Date(msg.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return;
                                    
                                    setLoadingMensagensPaciente(true);
                                    try {
                                      await PacienteMensagemService.deletarMensagem(msg.id);
                                      await loadMensagensPacienteAtual();
                                      alert('Mensagem excluída com sucesso!');
                                    } catch (error) {
                                      console.error('Erro ao excluir mensagem:', error);
                                      alert('Erro ao excluir mensagem. Tente novamente.');
                                    } finally {
                                      setLoadingMensagensPaciente(false);
                                    }
                                  }}
                                  className="ml-3 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                                  title="Excluir mensagem"
                                >
                                  <Trash2 size={12} />
                                  Excluir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-center pt-3">
                          <button
                            onClick={() => setShowEnviarMensagemMedicoModal(true)}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1.5"
                          >
                            <Plus size={14} />
                            Nova Mensagem
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para Enviar Nova Mensagem ao Médico */}
      {showEnviarMensagemMedicoModal && medicoResponsavel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Enviar Mensagem ao Médico</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEnviarMensagemMedicoModal(false);
                    setNovaMensagemMedico({ titulo: '', mensagem: '', tipo: 'clinico' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={novaMensagemMedico.titulo}
                  onChange={(e) => setNovaMensagemMedico({ ...novaMensagemMedico, titulo: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Dúvida sobre medicação"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Mensagem</label>
                <select
                  value={novaMensagemMedico.tipo}
                  onChange={(e) => setNovaMensagemMedico({ ...novaMensagemMedico, tipo: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="clinico">Clínico</option>
                  <option value="alerta">Alerta</option>
                  <option value="orientacao">Orientação</option>
                  <option value="revisao">Revisão</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
                <textarea
                  value={novaMensagemMedico.mensagem}
                  onChange={(e) => setNovaMensagemMedico({ ...novaMensagemMedico, mensagem: e.target.value })}
                  rows={5}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Digite sua mensagem..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2 flex-shrink-0">
              <button
                onClick={() => {
                  setShowEnviarMensagemMedicoModal(false);
                  setNovaMensagemMedico({ titulo: '', mensagem: '', tipo: 'clinico' });
                }}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!novaMensagemMedico.titulo.trim() || !novaMensagemMedico.mensagem.trim()) {
                    alert('Título e mensagem são obrigatórios');
                    return;
                  }
                  if (!paciente || !medicoResponsavel || !user) {
                    alert('Erro ao enviar mensagem. Tente novamente.');
                    return;
                  }
                  
                  setLoadingMensagensPaciente(true);
                  try {
                    await PacienteMensagemService.criarMensagem({
                      pacienteId: paciente.id,
                      pacienteEmail: user.email || '',
                      medicoId: medicoResponsavel.id,
                      medicoEmail: medicoResponsavel.email,
                      titulo: novaMensagemMedico.titulo.trim(),
                      mensagem: novaMensagemMedico.mensagem.trim(),
                      tipo: novaMensagemMedico.tipo,
                      lida: false,
                      criadoPor: user.email || '',
                      direcao: 'paciente_para_medico',
                      pacienteNome: paciente.nome
                    });
                    setNovaMensagemMedico({ titulo: '', mensagem: '', tipo: 'clinico' });
                    setShowEnviarMensagemMedicoModal(false);
                    alert('Mensagem enviada com sucesso!');
                    await loadMensagensPacienteAtual();
                    // Atualizar aba para mostrar a nova mensagem
                    setAbaAtivaMensagens('enviadas');
                  } catch (error) {
                    console.error('Erro ao enviar mensagem:', error);
                    alert('Erro ao enviar mensagem. Tente novamente.');
                  } finally {
                    setLoadingMensagensPaciente(false);
                  }
                }}
                disabled={loadingMensagensPaciente || !novaMensagemMedico.titulo.trim() || !novaMensagemMedico.mensagem.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Send size={16} />
                {loadingMensagensPaciente ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Abandono de Tratamento */}
      {showModalAbandono && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Abandonar Tratamento</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                Você está prestes a abandonar seu tratamento com <strong>{medicoResponsavel?.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel?.nome}</strong>.
              </p>
              <p className="text-sm text-red-600 font-semibold">
                ⚠️ Esta ação é irreversível e o médico será notificado.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo do abandono *
                </label>
                <select
                  value={motivoAbandono}
                  onChange={(e) => setMotivoAbandono(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Selecione um motivo</option>
                  {MOTIVOS_ABANDONO_TRATAMENTO.map((motivo) => (
                    <option key={motivo} value={motivo}>
                      {motivo}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-gray-500">
                * Seus dados serão compartilhados com o médico para melhorar o atendimento.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModalAbandono(false);
                  setMotivoAbandono('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!motivoAbandono || !paciente?.id || !user?.email) {
                    alert('Por favor, selecione um motivo do abandono.');
                    return;
                  }

                  try {
                    // IMPORTANTE: Salvar o medicoResponsavelId ANTES de qualquer atualização
                    const medicoResponsavelIdOriginal = paciente.medicoResponsavelId || null;
                    console.log('💾 Médico responsável original salvo:', medicoResponsavelIdOriginal);
                    
                    // 1. Deletar todas as solicitações do paciente em solicitacoes_medico
                    await SolicitacaoMedicoService.deletarSolicitacoesPaciente(user.email);
                    
                    // 2. Mover paciente de pacientes_completos para pacientes_abandono
                    // A função moverParaAbandono vai buscar o documento ANTES de atualizar
                    // e salvar o medicoResponsavelAnteriorId corretamente
                    await PacienteService.moverParaAbandono(
                      paciente.id, 
                      motivoAbandono, 
                      medicoResponsavelIdOriginal // Passar o ID original salvo
                    );
                    
                    // Recarregar dados
                    await loadPaciente();
                    setMedicoResponsavel(null); // Limpar médico responsável do estado
                    
                    alert('Tratamento abandonado com sucesso.');
                    setShowModalAbandono(false);
                    setMotivoAbandono('');
                    setAbaAtivaMedicos('buscar');
                  } catch (error) {
                    console.error('Erro ao abandonar tratamento:', error);
                    alert('Erro ao abandonar tratamento');
                  }
                }}
                disabled={!motivoAbandono}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Confirmar Abandono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assistente Oftware (Gemini/OpenAI via /api/ia/chat) — canto inferior esquerdo */}
      {user && (
        <ChatIA
          userLabel={
            (paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || user.displayName || 'Paciente').split(
              /\s+/
            )[0] ?? 'Paciente'
          }
          floatPosition="left"
          roleHint="paciente"
          contextSurface="meta_paciente"
          chatNutriUpload={
            paciente?.id
              ? {
                  patientId: paciente.id,
                  dateKey: chatNutriDataSelecionada || new Date().toISOString().split('T')[0],
                }
              : null
          }
        />
      )}

      {/* Modal de Classificação do Profissional (1-5 estrelas) */}
      {showModalClassificacao && profissionalParaClassificar && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => !salvandoClassificacao && setShowModalClassificacao(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Avaliar profissional</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">{profissionalParaClassificar.nome}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {agregadoNoModal === null ? 'Carregando...' : agregadoNoModal.count === 0 ? 'Nenhuma avaliação ainda.' : `${agregadoNoModal.count} avaliação${agregadoNoModal.count !== 1 ? 'ões' : ''} • Média: ${agregadoNoModal.media.toFixed(1)}`}
            </p>
            <div className="flex items-center justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setVotoTemporario(s)}
                  className="p-1 hover:scale-110 transition-transform"
                  aria-label={`${s} estrela${s > 1 ? 's' : ''}`}
                >
                  <Star size={28} className={s <= votoTemporario ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => !salvandoClassificacao && setShowModalClassificacao(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarClassificacao}
                disabled={votoTemporario < 1 || salvandoClassificacao}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvandoClassificacao ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pagamentos / Vendas — detalhes de todas as vendas e parcelas */}
      {showModalPagamentos && (
        <div className="fixed inset-0 bg-black/30 z-[70] flex items-center justify-center p-4" onClick={() => setShowModalPagamentos(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-600" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pagamentos</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Detalhes das vendas e parcelas</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalPagamentos(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingPagamento ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Carregando pagamentos...</p>
                </div>
              ) : !pagamentoPaciente || !pagamentoPaciente.parcelas?.length || pagamentoPaciente.parcelas.every(p => (p.valor ?? 0) <= 0) ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <p className="font-medium">Nenhuma venda registrada</p>
                  <p className="text-sm mt-1">As vendas e parcelas aparecerão aqui quando forem cadastradas.</p>
                </div>
              ) : (() => {
                const toDate = (v: unknown): Date | null => {
                  if (!v) return null;
                  if (v instanceof Date) return v;
                  const t = (v as { toDate?: () => Date })?.toDate?.();
                  if (t) return t;
                  const d = new Date(v as string | number);
                  return isNaN(d.getTime()) ? null : d;
                };
                const parcelas = (pagamentoPaciente.parcelas || []).filter(p => (p.valor ?? 0) > 0);
                const dataVendaFallback = toDate(pagamentoPaciente.dataVenda) || toDate(pagamentoPaciente.dataUltimaAtualizacao) || new Date();
                type VendaComParcelas = { label: string; data: Date; valorTotal: number; parcelas: ParcelaPagamento[] };
                const vendas: VendaComParcelas[] = [];
                let i = 0;
                if (!parcelas[0]?.dataVenda) {
                  const grupo: ParcelaPagamento[] = [];
                  while (i < parcelas.length && !parcelas[i].dataVenda) {
                    grupo.push(parcelas[i]);
                    i++;
                  }
                  vendas.push({
                    label: 'Venda Inicial',
                    data: dataVendaFallback,
                    valorTotal: grupo.reduce((s, p) => s + (p.valor ?? 0), 0),
                    parcelas: grupo,
                  });
                }
                while (i < parcelas.length) {
                  const primeira = parcelas[i];
                  const dataVenda = primeira.dataVenda ? toDate(primeira.dataVenda) : null;
                  const data = dataVenda || dataVendaFallback;
                  const grupo: ParcelaPagamento[] = [];
                  grupo.push(primeira);
                  i++;
                  while (i < parcelas.length && !parcelas[i].dataVenda) {
                    grupo.push(parcelas[i]);
                    i++;
                  }
                  vendas.push({
                    label: `Venda ${vendas.length + 1}`,
                    data,
                    valorTotal: grupo.reduce((s, p) => s + (p.valor ?? 0), 0),
                    parcelas: grupo,
                  });
                }
                const totalGeral = vendas.reduce((s, v) => s + v.valorTotal, 0);
                return (
                  <div className="space-y-6">
                    {vendas.map((venda, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{venda.label}</h4>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Data da venda</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {venda.data.toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {venda.parcelas.map((parcela, pidx) => {
                            const dataVen = toDate(parcela.dataVencimento);
                            const dataPag = toDate(parcela.dataPagamento);
                            const pago = parcela.status === 'paga';
                            return (
                              <div key={pidx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Parcela {parcela.numero}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${pago ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                                    {pago ? 'Pago' : 'Pendente'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {pago && dataPag ? `Pago em ${dataPag.toLocaleDateString('pt-BR')}` : dataVen ? `Venc. ${dataVen.toLocaleDateString('pt-BR')}` : '—'}
                                  </p>
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    R$ {(parcela.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Total da venda: R$ {venda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 dark:text-white">Total vendido</span>
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                          R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dados do Paciente — um único modal; Home/Exames/Nutri/Personal/Meu Perfil são atalhos para abri-lo */}
      {showModalDadosPaciente && !searchParams.get('pacienteId') && (
        <div className="fixed inset-0 bg-black/30 z-[70] flex items-center justify-center p-4" onClick={() => { modalDadosPacienteFoiFechadoRef.current = true; setModalDadosPacienteFoiFechado(true); loadPaciente(); setShowModalDadosPaciente(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl h-[85vh] min-h-[520px] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {paciente ? (
              <ModalDadosPacienteChat
                paciente={paciente}
                setPaciente={setPaciente as React.Dispatch<React.SetStateAction<PacienteCompleto>>}
                onClose={() => { modalDadosPacienteFoiFechadoRef.current = true; setModalDadosPacienteFoiFechado(true); loadPaciente(); setShowModalDadosPaciente(false); }}
                onSave={async (closeAfter, pacienteAtualizado) => { const p = pacienteAtualizado ?? paciente; await PacienteService.createOrUpdatePaciente(p); await loadPaciente(); if (closeAfter) setShowModalDadosPaciente(false); }}
                saving={salvandoDadosPaciente}
                setSaving={setSalvandoDadosPaciente}
                onCreateSolicitacao={async (medico, pacienteAtualizado) => {
                  if (!user?.email) return;
                  const solicitacoesExistentes = await SolicitacaoMedicoService.getSolicitacoesPorPaciente(user.email);
                  const hasActive = solicitacoesExistentes.some(s => s.status === 'pendente' || s.status === 'aceita');
                  if (hasActive) {
                    alert('Você já possui uma solicitação ativa ou aceita. Cancele a solicitação anterior antes de fazer uma nova.');
                    return;
                  }
                  const pacienteNome = pacienteAtualizado.nome || pacienteAtualizado.dadosIdentificacao?.nomeCompleto || user.displayName || 'Paciente';
                  const pacienteTelefone = (pacienteAtualizado.dadosIdentificacao?.telefone as string)?.replace(/\D/g, '') || '';
                  await SolicitacaoMedicoService.criarSolicitacao({
                    pacienteId: pacienteAtualizado.id,
                    pacienteEmail: user.email,
                    pacienteNome,
                    pacienteTelefone,
                    medicoId: medico.id,
                    medicoNome: medico.nome,
                    status: 'pendente'
                  });
                  await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                  await loadPaciente();
                  await loadMinhasSolicitacoes();
                }}
                onCheckSolicitacaoAberta={user?.email ? async () => {
                  const data = await SolicitacaoMedicoService.getSolicitacoesPorPaciente(user.email!);
                  setMinhasSolicitacoes(data);
                  return data.some(s => s.status === 'pendente' || s.status === 'aceita');
                } : undefined}
                resumeAfterLoadTick={metaPacienteLoadTick}
              />
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 p-8 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Carregando...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Metas (peso + circunferência) — mesmo bloco do metaadmin */}
      {showModalMetasTratamento && paciente && (
        <div
          className="fixed inset-0 bg-black/50 z-[80] flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => {
            if (!salvandoMetasTratamento) setShowModalMetasTratamento(false);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 w-full max-h-[92dvh] sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-600 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Metas do tratamento</h2>
              <button
                type="button"
                disabled={salvandoMetasTratamento}
                onClick={() => setShowModalMetasTratamento(false)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
              <MetaadminPlanoTerapeuticoEditSections
                paciente={paciente}
                setPaciente={setPaciente}
                dataAplicacaoFocoRef={dataAplicacaoFocoMetasModalRef}
                mode="meta"
                hideMetaHeading
              />
            </div>
            <div className="flex-shrink-0 flex gap-2 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                type="button"
                disabled={salvandoMetasTratamento}
                onClick={() => setShowModalMetasTratamento(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoMetasTratamento}
                onClick={async () => {
                  setSalvandoMetasTratamento(true);
                  try {
                    await PacienteService.createOrUpdatePaciente(paciente);
                    await loadPaciente();
                    setShowModalMetasTratamento(false);
                  } catch (e) {
                    console.error(e);
                    alert('Não foi possível salvar as metas. Tente novamente.');
                  } finally {
                    setSalvandoMetasTratamento(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {salvandoMetasTratamento ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recomendações */}
      {showRecomendacoesModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowRecomendacoesModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gray-800 text-white p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Recomendações</h3>
                  <p className="text-sm text-white/80">Alimentação e Exercícios</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecomendacoesModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Carrossel */}
            <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
              <div 
                className="flex transition-transform duration-300 ease-in-out h-full"
                style={{ transform: `translateX(-${slideRecomendacoes * 100}%)` }}
              >
                {/* Slide 1: Alimentação */}
                <div className="min-w-full p-6 overflow-y-auto" style={{ maxHeight: '100%', height: '100%' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900">Alimentação</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-xl p-4 border-l-4 border-purple-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        A Tirzepatida é um medicamento que auxilia no controle do peso e da glicemia. Para obter os melhores resultados, é importante seguir cuidados específicos de alimentação e atividade física.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-600 font-bold text-xs">✓</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Priorize proteínas magras: ovos, frango, peixe, queijos leves, tofu.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-600 font-bold text-xs">✓</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Aumente a ingestão de vegetais e fibras: folhas verdes, legumes, chia, aveia, feijão.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-600 font-bold text-xs">✓</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Prefira carboidratos integrais e com baixo índice glicêmico.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-red-600 font-bold text-xs">✗</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Reduza açúcar, massas, pão branco e alimentos ultraprocessados.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 font-bold text-xs">💧</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Mantenha hidratação adequada: 2 a 3 litros de água por dia.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-orange-600 font-bold text-xs">⚡</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Faça refeições menores, com intervalos um pouco maiores – isso ajuda a controlar possíveis náuseas.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-red-600 font-bold text-xs">✗</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Evite álcool, especialmente nas primeiras semanas, pois pode piorar sintomas gastrointestinais.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 2: Exercícios */}
                <div className="min-w-full p-6 overflow-y-auto" style={{ maxHeight: '100%', height: '100%' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-orange-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900">Exercícios Físicos</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-xl p-4 border-l-4 border-orange-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        A prática regular de exercícios físicos é essencial para potencializar os resultados do tratamento com Tirzepatida.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-600 font-bold text-xs">✓</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Realize ao menos 150 minutos por semana de exercícios aeróbicos moderados: caminhada, bicicleta ou natação.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-600 font-bold text-xs">✓</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Inclua 2 treinos de força semanais (peso corporal já é suficiente).</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-yellow-600 font-bold text-xs">⚠</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Evite exercícios muito intensos nas primeiras 2 semanas de uso ou após aumentos de dose.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 font-bold text-xs">💡</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Tente fazer uma caminhada leve após as refeições, pois ajuda no controle glicêmico.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-orange-600 font-bold text-xs">⚡</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Caso tenha tonturas ou fraqueza, reduza a intensidade e hidrate-se bem.</p>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-purple-600 font-bold text-xs">💪</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Se estiver muito nauseado nesses dias, priorize exercícios leves ou alongamentos.</p>
                      </div>
                    </div>

                    {/* Aviso Importante */}
                    <div className="mt-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-900 mb-2">⚠️ Importante</p>
                          <ul className="text-sm text-red-800 space-y-1">
                            <li>• Náuseas podem ocorrer; pequenas adaptações na dieta ajudam</li>
                            <li>• Nunca aumente a dose por conta própria</li>
                            <li>• Em caso de dor abdominal intensa, vômitos persistentes ou sinais de desidratação, procure atendimento</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controles do Carrossel */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setSlideRecomendacoes(0)}
                disabled={slideRecomendacoes === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  slideRecomendacoes === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                <ChevronLeft size={20} />
                <span className="font-medium">Anterior</span>
              </button>

              {/* Indicadores */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSlideRecomendacoes(0)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    slideRecomendacoes === 0
                      ? 'bg-purple-600 w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label="Slide 1"
                />
                <button
                  onClick={() => setSlideRecomendacoes(1)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    slideRecomendacoes === 1
                      ? 'bg-orange-600 w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label="Slide 2"
                />
              </div>

              <button
                onClick={() => setSlideRecomendacoes(1)}
                disabled={slideRecomendacoes === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  slideRecomendacoes === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                <span className="font-medium">Próximo</span>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Layout */}
      {showLayoutModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowLayoutModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Escolha seu Layout</h3>
                  <p className="text-sm text-white/80">Selecione o estilo de visualização que melhor se adapta ao seu perfil</p>
                </div>
              </div>
              <button
                onClick={() => setShowLayoutModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Layout Cards */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: 'modern',
                    name: 'Layout Moderno',
                    description: 'Dashboard com cards grandes, gráficos em destaque e visualizações interativas',
                    icon: LayoutDashboard,
                    color: 'from-blue-500 to-purple-600',
                    features: [
                      'Cards de estatísticas grandes e visíveis',
                      'Gráficos interativos com animações',
                      'Visualização de progresso em tempo real',
                      'Design responsivo e moderno'
                    ]
                  },
                  {
                    id: 'minimal',
                    name: 'Layout Minimalista',
                    description: 'Design elegante e limpo, focado na apresentação clara dos dados',
                    icon: Sparkles,
                    color: 'from-emerald-500 to-teal-600',
                    features: [
                      'Interface limpa e organizada',
                      'Foco na clareza dos dados',
                      'Gráficos simplificados e elegantes',
                      'Experiência visual refinada'
                    ]
                  },
                  {
                    id: 'interactive',
                    name: 'Layout Interativo',
                    description: 'Visualizações avançadas com animações, comparações e insights detalhados',
                    icon: Zap,
                    color: 'from-orange-500 to-pink-600',
                    features: [
                      'Animações suaves e transições',
                      'Comparações visuais avançadas',
                      'Insights e recomendações',
                      'Gráficos interativos com zoom'
                    ]
                  }
                ].map((layout) => {
                  const Icon = layout.icon;
                  const isSelected = preferenciaLayout === layout.id;
                  
                  return (
                    <div
                      key={layout.id}
                      onClick={() => handleSelectLayout(layout.id)}
                      className={`
                        relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg 
                        border-2 transition-all duration-300 cursor-pointer
                        hover:shadow-2xl hover:scale-105
                        ${isSelected 
                          ? 'border-green-500 shadow-green-500/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      {/* Selected Badge */}
                      {isSelected && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                          <Check size={20} />
                        </div>
                      )}

                      {/* Icon Header */}
                      <div className={`bg-gradient-to-br ${layout.color} p-6 rounded-t-2xl`}>
                        <div className="flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl mb-4">
                          <Icon size={32} className="text-white" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {layout.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                          {layout.description}
                        </p>

                        {/* Features */}
                        <ul className="space-y-2 mb-4">
                          {layout.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Select Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectLayout(layout.id);
                          }}
                          className={`
                            w-full mt-4 py-3 rounded-lg font-semibold transition-all
                            ${isSelected
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                          `}
                        >
                          {isSelected ? 'Selecionado' : 'Selecionar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <MetaPageContent />
    </Suspense>
  );
}