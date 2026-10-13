'use client';

// ETAPA A2 - Nova estrutura de layout idêntica ao /metaadmin
// Home implementada com KPIs reais + modais principais

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { NutricionistaService } from '@/services/nutricionistaService';
import { buildOrganizacaoPublicUrl } from '@/lib/tenant/organizacaoPublicOrigin';
import OrganizationShellMobileMark from '@/components/organization/OrganizationShellMobileMark';
import { readOrganizationShellBrandingResponse } from '@/lib/organization/readOrganizationShellBrandingResponse';
import {
  organizationShellActiveClass,
  organizationShellBadgeClass,
  organizationShellCssVars,
  organizationShellForegroundClass,
  organizationShellIconButtonClass,
  organizationShellIdleClass,
  organizationShellSplashProps,
  resolveOrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';
import { resolveOrganizationShellLogoUrl } from '@/lib/organization/resolveOrganizationShellLogoUrl';
import { resolveAssinaturaLogoUrl } from '@/lib/pacienteMensagem/assinaturaMensagem';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { PagamentoService } from '@/services/pagamentoService';
import { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';
import { PacienteService } from '@/services/pacienteService';
import KpiCard from '@/components/KpiCard';
import { 
  UtensilsCrossed, 
  Home,
  LayoutDashboard, 
  Stethoscope, 
  Users, 
  DollarSign, 
  Calendar,
  Apple,
  Menu, 
  X, 
  UserCircle, 
  ChevronDown, 
  ChevronUp,
  LogOut,
  Link as LinkIcon,
  Shield,
  ShieldCheck,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Save,
  MapPin,
  RefreshCw,
  Search,
  Edit,
  Syringe,
  FlaskConical,
  Trash2,
  Send,
  XCircle,
  UserPlus,
  Kanban,
  FileText,
  MessageSquare,
  Mail,
  Phone,
  BarChart3,
  Plus,
  Pill,
  Activity,
  User as UserIcon,
  Dumbbell,
  Brain,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Printer,
  Star,
  Scale,
  MessageCircle,
  Building,
  HelpCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { LembreteService } from '@/services/lembreteService';
import type { Lembrete } from '@/types/lembrete';
import { LEMBRETE_TAGS_NUTRI } from '@/types/lembrete';
import { ClassificacaoProfissionalService, type DetalhamentoClassificacao } from '@/services/classificacaoProfissionalService';
import { estadosCidades, estadosList } from '@/data/cidades-brasil';
import { MedicoService } from '@/services/medicoService';
import { Medico } from '@/types/medico';
import { PacienteCompleto } from '@/types/obesidade';
import { PacienteVisivelNutri } from '@/services/pacienteNutricionistaService';
import { SolicitacaoNutricionistaService } from '@/services/solicitacaoNutricionistaService';
import { SolicitacaoNutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { SolicitacaoVinculoNutriMedicoService } from '@/services/solicitacaoVinculoNutriMedicoService';
import { SolicitacaoVinculoNutriMedicoDoc } from '@/features/metaNutri/metaNutri.types';
import { SOLICITACAO_STATUS } from '@/features/metaNutri/metaNutri.constants';
import WhatsappConnectionSection from '@/components/metaadmin/WhatsappConnectionSection';
import SolicitacoesPacientesCarousel from '@/components/metaadmin/SolicitacoesPacientesCarousel';
import OrganizacaoComunicacaoGmailPanel from '@/components/comunicacao/OrganizacaoComunicacaoGmailPanel';
import { loadDestinatariosMetanutri } from '@/lib/organizacaoMensagem/loadDestinatarios';
import type { OrganizacaoMensagemPacienteAnexo } from '@/lib/organizacaoMensagem/types';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import WhatsappConnectHintBalloon from '@/components/whatsapp/WhatsappConnectHintBalloon';
import WhatsappConnectPromptModal from '@/components/whatsapp/WhatsappConnectPromptModal';
import { useWhatsappConnectHint } from '@/hooks/useWhatsappConnectHint';
import MedicoFotoPerfilEditor from '@/components/metaadmin/MedicoFotoPerfilEditor';
import { InternationalPhoneInput } from '@/components/phone/InternationalPhoneInput';
import { isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';
import { professionalPhoneWriteFields, phoneFieldsFromProfessional } from '@/lib/whatsapp/resolveProfessionalPhone';
import MetanutriHomeLeadsPipeline from '@/components/metanutri/MetanutriHomeLeadsPipeline';
import MetanutriLeadsAgendaHub from '@/components/metanutri/agenda/MetanutriLeadsAgendaHub';
import { nutriAgendaAuthFetch } from '@/lib/nutri/agenda/nutriAgendaAuthFetch';
import type { ConsultaCalendarioItem } from '@/components/profissional/ProfissionalCalendarioSection';
import type { PacienteCompartilhadoCrmItem } from '@/components/crm/profissional/LeadsProfissionalCrmView';
import ModalNovoLembrete, {
  type ModalNovoLembreteInitialValues,
} from '@/components/metaadmin/ModalNovoLembrete';
import { LabRangeBar } from '@/components/LabRangeBar';
import { LabOptimizationBadge } from '@/components/LabOptimizationBadge';
import { LabSectionScoreBadge } from '@/components/LabSectionScoreBadge';
import { LabMetabolicSummarySection } from '@/components/LabMetabolicSummarySection';
import {
  LabResultCard,
  LabStatusLegend,
  LabPatientHeaderCard,
  LabCompactScore,
  labPatientInitials,
} from '@/components/LabResultCard';
import PacienteModalHeader from '@/components/metaadmin/paciente-modal/PacienteModalHeader';
import PacienteHeaderLembretes from '@/components/metaadmin/paciente-modal/PacienteHeaderLembretes';
import MetanutriPacienteWelcomeActions from '@/components/metanutri/MetanutriPacienteWelcomeActions';
import { applyLembretesMutation, type LembretesMutation } from '@/lib/metaadmin/lembretesMutation';
import ProfissionalVinculadosSplitView from '@/components/metaadmin/ProfissionalVinculadosSplitView';
import {
  MedicoAndamentoStatsBlock,
  VinculoFotoAvatar,
  VinculoMobilePacientesList,
} from '@/components/metaadmin/ProfissionalVinculoStats';
import { TratamentoPacienteMobileModal } from '@/components/metaadmin/TratamentoPacienteMobileModal';
import { PersonalPageContent } from '@/app/meta/personal/page';
import { PersonalPacienteSharePanel } from '@/components/metaadmin/paciente-modal/PersonalPacienteSharePanel';
import { bioTrendDir } from '@/utils/bioImpedanciaTrend';
import { calculateSectionMetabolicScore } from '@/lib/labExames/labSectionScore';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import { Sex } from '@/types/labRanges';
import { useLabOrderBySection } from '@/hooks/useLabOrderBySection';
import { LAB_SECTION_LABELS_PT } from '@/lib/labExames/labSectionLabels';
import { EXAME_LABORATORIAL_KEY_TO_FIELD } from '@/lib/metaadmin/exameLaboratorialFormFields';
import { buildPatientLabSectionsFromOrder } from '@/lib/labExames/buildPatientLabSectionsFromOrder';
import { getExameCampoNumerico } from '@/lib/labExames/exameCampoNumerico';
import { getLabRange } from '@/utils/labRangesFromJson';
import TrendLine from '@/components/TrendLine';
import { ParcelaPagamento } from '@/types/pagamento';
import { PrescricaoService } from '@/services/prescricaoService';
import { Prescricao, PrescricaoItem } from '@/types/prescricao';
import jsPDF from 'jspdf';
import NutriContent from '@/components/NutriContent';
import PsiquiatriaContent from '@/components/psiquiatria/PsiquiatriaContent';
import NutriAlimentosPanel from '@/components/nutri/NutriAlimentosPanel';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { SolicitacaoPersonalTrainerService } from '@/services/solicitacaoPersonalTrainerService';
import { SOLICITACAO_STATUS as SOLICITACAO_STATUS_PERSONAL } from '@/features/metaPersonal/metaPersonal.constants';
import { trainingSessionService } from '@/services/trainingSessionService';
import { BioImpedanciaDisplay } from '@/components/bodymap/BioImpedanciaDisplay';
import { salvarBioImpedanciaRegistros } from '@/services/bioImpedanciaService';
import MetaNutriPersonalWizard from '@/components/meta/MetaNutriPersonalWizard';
import ProfissionalCadastroGateModal from '@/components/meta/ProfissionalCadastroGateModal';
import CadastroVerificacaoScreen from '@/components/portal/CadastroVerificacaoScreen';
import ProfissionalFinanceiroSection from '@/components/profissional/ProfissionalFinanceiroSection';
import ProfissionalCalendarioSection from '@/components/profissional/ProfissionalCalendarioSection';
import { EvolucaoSeguimentoReadonlyView } from '@/components/profissional/EvolucaoSeguimentoReadonlyView';
import {
  ControleFinanceiroPacientePanel,
} from '@/components/profissional/ControleFinanceiroPacientePanel';
import { getStatusPagamentoPaciente } from '@/lib/metaadmin/buildFinanceiroRelatorioTransacoes';
import { ModalGraficoERegistrosPaciente } from '@/components/paciente/ModalGraficoERegistrosPaciente';
import { BarraFaixaAplicacoes } from '@/components/metaadmin/BarraFaixaAplicacoes';
import PatientDetailsMobileModal from '@/components/paciente/PatientDetailsMobileModal';
import {
  calcMetaProgressPct,
  countAplicacoesProgress,
  resolveMetaAbdominalCmLoss,
  resolveMetaPesoKgLoss,
} from '@/lib/paciente/metaProgresso';
import { buildPatientWhatsappUrl, buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import PrescricaoHistoricoTab from '@/components/prescricao/PrescricaoHistoricoTab';
import PrescricaoBuscaCampo from '@/components/prescricao/PrescricaoBuscaCampo';
import { montarFonteBuscaPrescricoes } from '@/lib/prescricao/prescricaoBusca';
import {
  PacienteCardMediaIcons,
  PacienteDepoimentoLeituraModal,
  useFotosCompartilhadasMedico,
  usePacienteFotosCarouselModal,
} from '@/components/profissional/pacienteMediaQuickActions';
import ProfissionalDashboardHome from '@/components/profissional/dashboard/ProfissionalDashboardHome';
import NutritionPortfolioOverview from '@/components/metanutri/NutritionPortfolioOverview';
import { ProntuarioNutriTab } from '@/app/metaadmin/components/paciente-modal/prontuario/ProntuarioNutriTab';
import { ExamesImagemPacientePanel } from '@/components/metaadmin/ExamesImagemPacientePanel';
import { PacienteIdentificacaoTabContent } from '@/components/metaadmin/paciente-modal/PacienteIdentificacaoTabContent';
import { PacienteDadosClinicosTabContent } from '@/components/metaadmin/paciente-modal/PacienteDadosClinicosTabContent';

type MenuNutri = 'home' | 'leads' | 'medicos' | 'pacientes' | 'financeiro' | 'calendario' | 'alimentos' | 'meu-perfil' | 'comunicacao';

function labelMedicoResponsavelPaciente(
  medicoId: string | null | undefined,
  medicos: Array<{ medicoId: string; nome: string; genero?: string }>,
  fallback?: { medicoId?: string; medicoNome?: string; medicoGenero?: 'M' | 'F' } | null
): string {
  const tryId = medicoId || fallback?.medicoId;
  if (tryId) {
    const medico = medicos.find((m) => m.medicoId === tryId);
    if (medico?.nome) {
      const titulo = medico.genero === 'F' ? 'Dra.' : 'Dr.';
      return `${titulo} ${medico.nome}`;
    }
  }
  const nome = fallback?.medicoNome?.trim();
  if (nome && nome !== 'Médico não encontrado') {
    if (/^dr[a]?\.?\s/i.test(nome)) return nome;
    const titulo = fallback?.medicoGenero === 'F' ? 'Dra.' : 'Dr.';
    return `${titulo} ${nome}`;
  }
  return '';
}

function MetaNutriPageV2() {
  const router = useRouter();
  const { labOrderBySection: labOrderBySecaoConfig, labLimitOverrides, labSectionLabels } = useLabOrderBySection();

  // Estados de navegação e layout (ETAPA A1)
  const [activeMenu, setActiveMenu] = useState<MenuNutri>('home');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('menu') === 'pacientes') {
      setActiveMenu('pacientes');
    }
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabletNavOpen, setTabletNavOpen] = useState(false);
  const [tabletPastasOpen, setTabletPastasOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMensagensComunicacaoModal, setShowMensagensComunicacaoModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  // Estados de autenticação e dados
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    showBalloon: showWhatsappConnectHint,
    showPrompt: showWhatsappConnectPrompt,
    dismissPrompt: dismissWhatsappConnectPrompt,
    dismissBalloon: dismissWhatsappConnectBalloon,
  } = useWhatsappConnectHint({
    apiBasePath: '/api/metanutri/whatsapp',
    ready: !!user,
    getAuthToken: async () => {
      const current = auth.currentUser ?? user;
      if (!current) return null;
      return current.getIdToken();
    },
  });
  const [nutricionista, setNutricionista] = useState<NutricionistaDoc | null>(null);
  const [agregadoNutri, setAgregadoNutri] = useState<{ count: number; media: number } | null>(null);
  const [showModalClassificacaoVisualizar, setShowModalClassificacaoVisualizar] = useState(false);
  const [detalhamentoVisualizar, setDetalhamentoVisualizar] = useState<DetalhamentoClassificacao | null>(null);
  const [loadingNutricionista, setLoadingNutricionista] = useState(true);
  const [salvandoCadastroNutri, setSalvandoCadastroNutri] = useState(false);
  const [criandoCadastroNutri, setCriandoCadastroNutri] = useState(false);
  const [metaNutriLoadTick, setMetaNutriLoadTick] = useState(0);
  const [organizationShellBranding, setOrganizationShellBranding] = useState<{
    publicName: string;
    logoMainUrl: string | null;
    logoDarkUrl: string | null;
    logoLightUrl: string | null;
    iconUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
  } | null>(null);
  const [organizationShellContext, setOrganizationShellContext] = useState<{
    organizationId: string | null;
    organizationMatch: boolean;
  }>({ organizationId: null, organizationMatch: true });
  
  // Estados para Home (KPIs)
  const [pacientesCompartilhados, setPacientesCompartilhados] = useState(0);
  const [medicosVinculados, setMedicosVinculados] = useState(0);
  const [receitaTotal, setReceitaTotal] = useState(0);
  const [receitaMes, setReceitaMes] = useState(0);
  const [loadingKPIs, setLoadingKPIs] = useState(false);
  
  // Estados para filtros de perda de peso
  const [filtroBaseDashboard, setFiltroBaseDashboard] = useState<'meus' | 'oftware'>('meus');
  const [filtroDosePerdaPeso, setFiltroDosePerdaPeso] = useState<string>('todas');
  const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState<string>('todas');
  const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState<string>('todos');
  
  // Estados para carregar todos os pacientes do Oftware
  const [todosPacientesOftware, setTodosPacientesOftware] = useState<PacienteCompleto[]>([]);
  const [loadingTodosPacientes, setLoadingTodosPacientes] = useState(false);
  
  // Estados para solicitações pendentes
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<SolicitacaoNutricionistaDoc[]>([]);
  const [loadingSolicitacoesPendentes, setLoadingSolicitacoesPendentes] = useState(false);
  const [aceitandoSolicitacaoId, setAceitandoSolicitacaoId] = useState<string | null>(null);
  const aceitandoSolicitacaoIdRef = useRef<string | null>(null);
  
  // Estados para modais
  const [meuPerfilAba, setMeuPerfilAba] = useState<'dados' | 'endereco' | 'cidades' | 'assinatura' | 'link' | 'whatsapp'>('dados');
  useEffect(() => {
    if (activeMenu === 'meu-perfil' && meuPerfilAba === 'whatsapp') {
      dismissWhatsappConnectPrompt();
      dismissWhatsappConnectBalloon();
    }
  }, [activeMenu, meuPerfilAba, dismissWhatsappConnectPrompt, dismissWhatsappConnectBalloon]);
  const [showVisualizarPacienteModal, setShowVisualizarPacienteModal] = useState(false);
  const [abrindoPacienteLoading, setAbrindoPacienteLoading] = useState(false);
  const abrindoPacienteLoadingRef = useRef(false);
  const [pacienteVisualizando, setPacienteVisualizando] = useState<PacienteCompleto | null>(null);
  /** Quando true, modal de visualização mostra 3 abas (Identificação, Anamnese, Prontuário), igual Metapersonal mobile */
  const [modalVisualizacaoEstiloPersonal, setModalVisualizacaoEstiloPersonal] = useState(false);
  /** Visualização do paciente na própria página (não modal), mantendo menu inferior no mobile */
  const [pacienteVisualizandoInline, setPacienteVisualizandoInline] = useState<PacienteCompleto | null>(null);
  const [pacientesVisiveis, setPacientesVisiveis] = useState<PacienteVisivelNutri[]>([]);
  const [pastaAtiva, setPastaAtiva] = useState(1); // Estado para controlar qual pasta está ativa no modal (1-10)
  const [showModalGraficoRegistros, setShowModalGraficoRegistros] = useState(false);
  const [pacienteParaGraficoRegistros, setPacienteParaGraficoRegistros] = useState<PacienteCompleto | null>(null);
  const pacienteIdsMedia = useMemo(
    () => pacientesVisiveis.map((p) => p.paciente.id).filter(Boolean),
    [pacientesVisiveis]
  );
  const { fotosPorPacienteId, marcarTemFoto } = useFotosCompartilhadasMedico(pacienteIdsMedia);
  const { abrirFotos, fotosModal } = usePacienteFotosCarouselModal(marcarTemFoto);
  const [depoimentoModalPaciente, setDepoimentoModalPaciente] = useState<{
    pacienteNome: string;
    paciente: PacienteCompleto;
  } | null>(null);
  const [showModalDetalheConclusao, setShowModalDetalheConclusao] = useState(false);
  const [registroConclusaoParaModal, setRegistroConclusaoParaModal] = useState<{ weekIndex: number; weekStart: Date; weekEnd: Date; peso?: number; pacienteNome?: string } | null>(null);
  
  // Estados para seção Médicos (ETAPA A3)
  const [abaAtivaMedicos, setAbaAtivaMedicos] = useState<'buscar' | 'solicitacoes' | 'vinculados'>('vinculados');
  
  // Estados para médicos vinculados
  const [medicosList, setMedicosList] = useState<Array<{
    medicoId: string;
    nome: string;
    email?: string;
    telefone?: string;
    genero?: string;
    crm?: { estado: string; numero: string };
    cidades?: { estado: string; cidade: string }[];
    fotoPerfilUrl?: string | null;
    instagramUsuario?: string | null;
    nomeLocal?: string;
    endereco?: string;
    countPacientes: number;
    pacienteIds: string[];
  }>>([]);
  const [loadingMedicosList, setLoadingMedicosList] = useState(false);

  const medicoResponsavelModalLabel = useMemo(() => {
    if (!pacienteVisualizando) return '';
    const itemVisivel = pacientesVisiveis.find(
      (p) => p.pacienteId === pacienteVisualizando.id || p.paciente?.id === pacienteVisualizando.id
    );
    return labelMedicoResponsavelPaciente(
      pacienteVisualizando.medicoResponsavelId,
      medicosList,
      itemVisivel
        ? {
            medicoId: itemVisivel.medicoId,
            medicoNome: itemVisivel.medicoNome,
            medicoGenero: itemVisivel.medicoGenero,
          }
        : null
    );
  }, [pacienteVisualizando, pacientesVisiveis, medicosList]);
  
  // Estados para busca de médicos disponíveis
  const [medicosDisponiveis, setMedicosDisponiveis] = useState<Medico[]>([]);
  const [loadingMedicosDisponiveis, setLoadingMedicosDisponiveis] = useState(false);
  const [estadoBuscaMedico, setEstadoBuscaMedico] = useState('');
  const [cidadeBuscaMedico, setCidadeBuscaMedico] = useState('');
  const [estadosComMedicosBusca, setEstadosComMedicosBusca] = useState<string[]>([]);
  const [cidadesComMedicosBusca, setCidadesComMedicosBusca] = useState<{ estado: string; cidade: string }[]>([]);
  const [loadingEstadosCidadesMedicos, setLoadingEstadosCidadesMedicos] = useState(false);
  
  // Estados para solicitações de vínculo
  const [solicitacoesVinculo, setSolicitacoesVinculo] = useState<SolicitacaoVinculoNutriMedicoDoc[]>([]);
  const [loadingSolicitacoesVinculo, setLoadingSolicitacoesVinculo] = useState(false);
  const [solicitacoesVinculoRecebidas, setSolicitacoesVinculoRecebidas] = useState<SolicitacaoVinculoNutriMedicoDoc[]>([]);
  const [loadingSolicitacoesVinculoRecebidas, setLoadingSolicitacoesVinculoRecebidas] = useState(false);
  const [aceitandoVinculoId, setAceitandoVinculoId] = useState<string | null>(null);
  const aceitandoVinculoIdRef = useRef<string | null>(null);
  
  const [medicoExpandidoId, setMedicoExpandidoId] = useState<string | null>(null);
  const [filtroMobileMedicosVinculados, setFiltroMobileMedicosVinculados] = useState<'todos' | 'pendente' | 'ativo'>('todos');
  useEffect(() => {
    setFiltroMobileMedicosVinculados('todos');
  }, [medicoExpandidoId]);
  const [medicoDisponivelExpandidoId, setMedicoDisponivelExpandidoId] = useState<string | null>(null);
  const [pacientesPorMedico, setPacientesPorMedico] = useState<Map<string, Array<{
    paciente: PacienteCompleto;
    dataCompartilhamento: Date;
  }>>>(new Map());
  const [loadingPacientesPorMedico, setLoadingPacientesPorMedico] = useState<Set<string>>(new Set());
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState<string | null>(null);
  const [vinculosCache, setVinculosCache] = useState<Array<{
    pacienteId: string;
    medicoId: string;
    dataCompartilhamento: Date;
  }>>([]);
  
  // Estados para perfil
  const [registroNumero, setRegistroNumero] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [telefoneDdiContato, setTelefoneDdiContato] = useState('');
  const [telefonePaisContato, setTelefonePaisContato] = useState('');
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<{ estado: string; cidade: string }[]>([]);
  const [estadoSelecionado, setEstadoSelecionado] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Campos de endereço e perfil extra
  const [perfilGenero, setPerfilGenero] = useState<'M' | 'F' | ''>('');
  const [perfilInstagram, setPerfilInstagram] = useState('');
  const [perfilCep, setPerfilCep] = useState('');
  const [perfilNomeLocal, setPerfilNomeLocal] = useState('');
  const [perfilEndereco, setPerfilEndereco] = useState('');
  const [perfilNumero, setPerfilNumero] = useState('');
  const [perfilPontoRef, setPerfilPontoRef] = useState('');
  const [perfilGoogleMaps, setPerfilGoogleMaps] = useState('');
  const [perfilFotoUrl, setPerfilFotoUrl] = useState<string | null>(null);
  const [buscandoCepPerfil, setBuscandoCepPerfil] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Auto-dismiss para mensagens de perfil
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => {
        setSaveMessage(null);
      }, 5000); // Desaparece após 5 segundos
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);
  
  // Estados para cidades disponíveis (apenas onde há médicos)
  const [estadosComMedicos, setEstadosComMedicos] = useState<string[]>([]);
  const [cidadesComMedicos, setCidadesComMedicos] = useState<{ estado: string; cidade: string }[]>([]);
  const [loadingCidadesMedicos, setLoadingCidadesMedicos] = useState(false);
  
  // Estados para link
  const [medicoSelecionadoReferral, setMedicoSelecionadoReferral] = useState('');
  const [linkReferralGerado, setLinkReferralGerado] = useState('');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [medicosVerificados, setMedicosVerificados] = useState<Medico[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  
  // Estados para seção Pacientes (ETAPA A4.1)
  const [loadingPacientesList, setLoadingPacientesList] = useState(false);
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [filtroMedicoPacientes, setFiltroMedicoPacientes] = useState<string>('');
  const [pagamentosPacientes, setPagamentosPacientes] = useState<Record<string, PagamentoPaciente>>({});
  const [pacienteCardExpandido, setPacienteCardExpandido] = useState<string | null>(null);
  const [showModalAplicacoes, setShowModalAplicacoes] = useState(false);
  const [pacienteAplicacoesSelecionado, setPacienteAplicacoesSelecionado] = useState<PacienteCompleto | null>(null);
  
  // Estados para controle do arraste da barra de IMC interativa nos cards de pacientes
  const [isDraggingIMC, setIsDraggingIMC] = useState(false);
  const [pacienteArrastandoIMC, setPacienteArrastandoIMC] = useState<string | null>(null);
  const [pesoTemporarioIMC, setPesoTemporarioIMC] = useState<number | null>(null);
  const [imcTemporarioIMC, setImcTemporarioIMC] = useState<number | null>(null);
  const barraIMCRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [showFireworks, setShowFireworks] = useState<{ [key: string]: boolean }>({});
  
  // Estados para modal de exames
  const [showModalExames, setShowModalExames] = useState(false);
  const [pacienteExamesSelecionado, setPacienteExamesSelecionado] = useState<PacienteCompleto | null>(null);
  /** Cache de photoURL do Firebase Auth (Google) por userId — via /api/user-photo. */
  const [patientPhotoByUserId, setPatientPhotoByUserId] = useState<Record<string, string | null>>({});

  const pacienteDetalhesMobileUserId = useMemo(() => {
    if (!pacienteCardExpandido) return undefined;
    const item = pacientesVisiveis.find((p) => p.pacienteId === pacienteCardExpandido);
    const uid = item?.paciente?.userId;
    return typeof uid === 'string' ? uid : undefined;
  }, [pacienteCardExpandido, pacientesVisiveis]);

  useEffect(() => {
    const userIds = [
      pacienteVisualizando?.userId,
      pacienteExamesSelecionado?.userId,
      pacienteDetalhesMobileUserId,
    ].filter((id): id is string => typeof id === 'string' && isValidFirebaseAuthUid(id));

    const missing = Array.from(new Set(userIds)).filter(
      (id) => !Object.prototype.hasOwnProperty.call(patientPhotoByUserId, id)
    );
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: missing }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { photos?: Record<string, string | null> };
        if (cancelled || !data.photos) return;
        setPatientPhotoByUserId((prev) => {
          const next = { ...prev };
          for (const id of missing) {
            next[id] = data.photos?.[id] ?? null;
          }
          return next;
        });
      } catch {
        if (cancelled) return;
        setPatientPhotoByUserId((prev) => {
          const next = { ...prev };
          for (const id of missing) {
            if (!Object.prototype.hasOwnProperty.call(next, id)) next[id] = null;
          }
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // patientPhotoByUserId intencionalmente omitido — evita loop; missing é derivado a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteVisualizando?.userId, pacienteExamesSelecionado?.userId, pacienteDetalhesMobileUserId]);

  const [showModalBioImpedancia, setShowModalBioImpedancia] = useState(false);
  const [pacienteBioImpedanciaSelecionado, setPacienteBioImpedanciaSelecionado] = useState<PacienteCompleto | null>(null);
  const [exameDataSelecionada, setExameDataSelecionada] = useState<string>('');
  const [exameDataSelecionadaNoModal, setExameDataSelecionadaNoModal] = useState<string>(''); // Para aba Exames no modal unificado
  const [examesNutriSubpasta, setExamesNutriSubpasta] = useState<'laboratoriais' | 'imagem'>('laboratoriais');
  const [secoesExpandidas, setSecoesExpandidas] = useState<Set<string>>(new Set());
  const [examesExpandidos, setExamesExpandidos] = useState<Set<string>>(new Set());
  const [secoesExamesPastaExpandidas, setSecoesExamesPastaExpandidas] = useState<Set<string>>(new Set());
  const [showAdicionarExameModalMobile, setShowAdicionarExameModalMobile] = useState(false);
  const [indiceExameEditandoMobile, setIndiceExameEditandoMobile] = useState<number | null>(null);
  const [novoExameDataMobile, setNovoExameDataMobile] = useState<{
    dataColeta: string;
    [key: string]: any;
  }>({
    dataColeta: new Date().toISOString().split('T')[0]
  });
  
  // Estados para mensagens não lidas
  const [mensagensNaoLidasPorPaciente, setMensagensNaoLidasPorPaciente] = useState<Record<string, number>>({});
  
  // Estados para pacientes com treinos (Personal Trainer)
  const [pacientesComTreinos, setPacientesComTreinos] = useState<Set<string>>(new Set());
  
  // Estados para modal de Prescrições
  const [showModalPrescricoes, setShowModalPrescricoes] = useState(false);
  const [pacientePrescricoesSelecionado, setPacientePrescricoesSelecionado] = useState<PacienteCompleto | null>(null);
  const [prescricoesModal, setPrescricoesModal] = useState<Prescricao[]>([]);
  const prescricoesBuscaFonteRef = useRef<Prescricao[]>([]);
  const [loadingPrescricoesModal, setLoadingPrescricoesModal] = useState(false);
  const [prescricaoSelecionadaModal, setPrescricaoSelecionadaModal] = useState<Prescricao | null>(null);
  const [prescricaoEditandoModal, setPrescricaoEditandoModal] = useState<Prescricao | null>(null);
  const [novaPrescricaoModal, setNovaPrescricaoModal] = useState({
    nome: '',
    descricao: '',
    itens: [] as PrescricaoItem[],
    observacoes: ''
  });
  const [abaPrescricoesModal, setAbaPrescricoesModal] = useState<'salvas' | 'historico' | 'descricao'>('salvas');
  const [historicoPrescricoesRefreshKey, setHistoricoPrescricoesRefreshKey] = useState(0);
  const [gruposPrescricoesExpandidosModal, setGruposPrescricoesExpandidosModal] = useState<Set<string>>(new Set());
  const [showModalGrupoNovaPrescricao, setShowModalGrupoNovaPrescricao] = useState(false);
  const [novaPrescricaoContexto, setNovaPrescricaoContexto] = useState<'desktop' | 'mobile' | null>(null);
  
  // Estados para modal Nutri (ver como paciente) — abre no mesmo contexto para manter barra inferior
  const [showModalNutri, setShowModalNutri] = useState(false);
  const [pacienteNutriSelecionado, setPacienteNutriSelecionado] = useState<PacienteCompleto | null>(null);
  // Estados para modal de Personal Trainer
  const [showModalPersonal, setShowModalPersonal] = useState(false);
  const [pacientePersonalSelecionado, setPacientePersonalSelecionado] = useState<PacienteCompleto | null>(null);
  const [personalTrainersElegiveis, setPersonalTrainersElegiveis] = useState<PersonalTrainerDoc[]>([]);
  const [loadingPersonalTrainersElegiveis, setLoadingPersonalTrainersElegiveis] = useState(false);
  const [personalTrainerSelecionadoCompartilhar, setPersonalTrainerSelecionadoCompartilhar] = useState('');
  const [enviandoCompartilhamentoPersonal, setEnviandoCompartilhamentoPersonal] = useState(false);
  const [vinculosAtivosPacientePersonal, setVinculosAtivosPacientePersonal] = useState<any[]>([]);
  const [solicitacoesCompartilhamentoPacientePersonal, setSolicitacoesCompartilhamentoPacientePersonal] = useState<any[]>([]);
  const [loadingSolicitacoesCompartilhamentoPersonal, setLoadingSolicitacoesCompartilhamentoPersonal] = useState(false);
  
  // Estados para modal de busca de personal trainers por estado/cidade
  const [showModalBuscarPersonalTrainer, setShowModalBuscarPersonalTrainer] = useState(false);
  const [estadoBuscaPersonalModal, setEstadoBuscaPersonalModal] = useState('');
  const [cidadeBuscaPersonalModal, setCidadeBuscaPersonalModal] = useState('');
  const [personalTrainersFiltrados, setPersonalTrainersFiltrados] = useState<PersonalTrainerDoc[]>([]);
  const [loadingPersonalTrainersFiltrados, setLoadingPersonalTrainersFiltrados] = useState(false);
  const [estadosComPersonalTrainers, setEstadosComPersonalTrainers] = useState<string[]>([]);
  const [cidadesComPersonalTrainers, setCidadesComPersonalTrainers] = useState<{ estado: string; cidade: string }[]>([]);
  
  // Estados para seção Financeiro
  const [showModalPagamento, setShowModalPagamento] = useState(false);
  const [pacientePagamentoSelecionado, setPacientePagamentoSelecionado] = useState<PacienteCompleto | null>(null);
  const [dadosPagamento, setDadosPagamento] = useState<PagamentoPaciente>({
    pacienteId: '',
    statusPagamento: 'negociacao',
    formaPagamento: null,
    valorTotal: 0,
    valorPago: 0,
    valorPendente: 0,
    parcelas: [],
    dataUltimaAtualizacao: new Date()
  });
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [consultasAgenda, setConsultasAgenda] = useState<ConsultaCalendarioItem[]>([]);
  const [showPipelineLembreteModal, setShowPipelineLembreteModal] = useState(false);
  const [pipelineLembreteDraft, setPipelineLembreteDraft] = useState<ModalNovoLembreteInitialValues | undefined>();
  
  // --- Prescrições: subtipos (runtime, sem alterar Firestore) ---
  type PrescricaoSubtipo =
    | 'Recibo Nutricionista'
    | 'Gastrointestinal'
    | 'Massa Magra & Performance'
    | 'Metabólico / Glicêmico'
    | 'Micronutrientes'
    | 'Sono & Comportamento'
    | 'Hepático / Cardiometabólico'
    | 'Outros';

  const SUBTIPOS_ORDER: PrescricaoSubtipo[] = [
    'Recibo Nutricionista',
    'Gastrointestinal',
    'Massa Magra & Performance',
    'Metabólico / Glicêmico',
    'Micronutrientes',
    'Sono & Comportamento',
    'Hepático / Cardiometabólico',
    'Outros',
  ];

  function normalizar(s?: string) {
    return (s || '').toLowerCase();
  }

  function getSubtipoPrescricao(p: {
    nome?: string;
    descricao?: string;
    observacoes?: string;
    tipoDocumento?: string;
  }): PrescricaoSubtipo {
    const rawNome = (p.nome || '').trim();
    if (rawNome.includes(' — ')) {
      const prefix = rawNome.split(' — ')[0].trim();
      const match = SUBTIPOS_ORDER.find((s) => s === prefix);
      if (match) return match;
    }

    const nome = normalizar(p.nome);
    const desc = normalizar(p.descricao);
    const obs = normalizar(p.observacoes);
    const txt = `${nome} ${desc} ${obs}`;

    if (p.tipoDocumento === 'recibo_medico' || txt.includes('recibo')) return 'Recibo Nutricionista';
    if (txt.includes('tirzepatida') || txt.includes('mounjaro') || txt.includes('zepbound') || txt.includes('base do tratamento')) return 'Outros';
    if (txt.includes('probiótico') || txt.includes('probiotico') || txt.includes('inulina') || txt.includes('fos') || txt.includes('constip') || txt.includes('náuse') || txt.includes('nause') || txt.includes('empach') || txt.includes('magnésio') || txt.includes('magnesio')) return 'Gastrointestinal';
    if (txt.includes('hmb') || txt.includes('whey') || txt.includes('leucina') || txt.includes('creatina') || txt.includes('massa magra') || txt.includes('sarcopen')) return 'Massa Magra & Performance';
    if (txt.includes('berberina') || txt.includes('cromo') || txt.includes('insulina') || txt.includes('resist') || txt.includes('glic') || txt.includes('homa')) return 'Metabólico / Glicêmico';
    if (txt.includes('vitamina d') || txt.includes('colecalciferol') || txt.includes('b12') || txt.includes('metilcobalamina') || txt.includes('zinco') || txt.includes('selênio') || txt.includes('selenio') || txt.includes('ferrit')) return 'Micronutrientes';
    if (txt.includes('sono') || txt.includes('insônia') || txt.includes('insonia') || txt.includes('melaton') || txt.includes('teanina') || txt.includes('glicina') || txt.includes('compuls')) return 'Sono & Comportamento';
    if (txt.includes('silimarina') || txt.includes('colina') || txt.includes('inositol') || txt.includes('esteat') || txt.includes('tgo') || txt.includes('tgp') || txt.includes('ggt') || txt.includes('omega') || txt.includes('coq10') || txt.includes('ldl') || txt.includes('hdl') || txt.includes('trig')) return 'Hepático / Cardiometabólico';
    return 'Outros';
  }

  function groupBySubtipo<T extends { nome?: string; descricao?: string; observacoes?: string; tipoDocumento?: string }>(arr: T[]) {
    const map = new Map<PrescricaoSubtipo, T[]>();
    for (const p of arr) {
      const subtipo = getSubtipoPrescricao(p);
      if (!map.has(subtipo)) map.set(subtipo, []);
      map.get(subtipo)!.push(p);
    }
    return SUBTIPOS_ORDER.map((s) => ({ subtipo: s, items: map.get(s) || [] })).filter((g) => g.items.length > 0);
  }

  /** Título para exibição na lista: remove prefixo "SUBTIPO — " quando existir. */
  function getTituloExibicao(nome: string): string {
    const n = (nome || '').trim();
    if (n.includes(' — ')) return n.split(' — ')[1]?.trim() || n;
    return n;
  }

  // Funções helper para calcular grau de obesidade
  const calcularGrauObesidade = (imc: number | null | undefined): string | null => {
    if (!imc || imc === 0) return null;
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    if (imc < 35) return 'Obesidade Grau I';
    if (imc < 40) return 'Obesidade Grau II';
    return 'Obesidade Grau III';
  };

  const getCorGrauObesidade = (grau: string | null): string => {
    if (!grau) return 'text-gray-500';
    if (grau.includes('Grau III')) return 'text-red-600 font-semibold';
    if (grau.includes('Grau II')) return 'text-orange-600 font-semibold';
    if (grau.includes('Grau I')) return 'text-yellow-600 font-semibold';
    if (grau === 'Sobrepeso') return 'text-amber-600';
    if (grau === 'Peso normal') return 'text-green-600';
    return 'text-blue-600';
  };

  // Detectar se é mobile (ETAPA A1)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Event listeners para arrastar o marcador de IMC (mouse)
  useEffect(() => {
    if (!isDraggingIMC || !pacienteArrastandoIMC) return;

    const handleMouseMove = (e: MouseEvent) => {
      const barraRef = barraIMCRef.current[pacienteArrastandoIMC];
      if (!barraRef) return;
      
      const rect = barraRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      // Trava nas extremidades: limitar entre 0% e 100%
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      // Buscar dados do paciente
      const pacienteItem = pacientesVisiveis.find(p => p.pacienteId === pacienteArrastandoIMC);
      if (!pacienteItem) return;
      
      const paciente = pacienteItem.paciente;
      const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
      const alturaCm = medidasIniciais?.altura;
      const alturaMetros = alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;
      
      if (!alturaMetros || alturaMetros <= 0) {
        setIsDraggingIMC(false);
        setPacienteArrastandoIMC(null);
        return;
      }

      const percentualParaIMC = (percent: number): number => {
        const p = Math.max(0, Math.min(100, percent));
        if (p <= 25) return (p / 25) * 18.5;
        if (p <= 50) {
          const percentualNaFaixa = (p - 25) / 25;
          return 18.5 + (percentualNaFaixa * (25 - 18.5));
        }
        if (p <= 75) {
          const percentualNaFaixa = (p - 50) / 25;
          return 25 + (percentualNaFaixa * (30 - 25));
        }
        const percentualNaFaixa = (p - 75) / 25;
        return 30 + (percentualNaFaixa * 20);
      };

      const imcParaPeso = (imc: number): number => {
        return imc * (alturaMetros * alturaMetros);
      };

      const novoIMC = percentualParaIMC(percentual);
      const novoPeso = imcParaPeso(novoIMC);
      
      setImcTemporarioIMC(novoIMC);
      setPesoTemporarioIMC(novoPeso);
    };

    const handleMouseUp = () => {
      setIsDraggingIMC(false);
      setPacienteArrastandoIMC(null);
      setPesoTemporarioIMC(null);
      setImcTemporarioIMC(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingIMC, pacienteArrastandoIMC, pacientesVisiveis]);

  // Event listeners para arrastar o marcador de IMC (touch)
  useEffect(() => {
    if (!isDraggingIMC || !pacienteArrastandoIMC) return;

    const handleTouchMove = (e: TouchEvent) => {
      const barraRef = barraIMCRef.current[pacienteArrastandoIMC];
      if (!barraRef) return;
      
      // Só prevenir default se o evento for cancelável
      if (e.cancelable) {
        e.preventDefault();
      }
      
      const rect = barraRef.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      // Trava nas extremidades: limitar entre 0% e 100%
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      // Buscar dados do paciente
      const pacienteItem = pacientesVisiveis.find(p => p.pacienteId === pacienteArrastandoIMC);
      if (!pacienteItem) return;
      
      const paciente = pacienteItem.paciente;
      const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
      const alturaCm = medidasIniciais?.altura;
      const alturaMetros = alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;
      
      if (!alturaMetros || alturaMetros <= 0) {
        setIsDraggingIMC(false);
        setPacienteArrastandoIMC(null);
        return;
      }

      const percentualParaIMC = (percent: number): number => {
        const p = Math.max(0, Math.min(100, percent));
        if (p <= 25) return (p / 25) * 18.5;
        if (p <= 50) {
          const percentualNaFaixa = (p - 25) / 25;
          return 18.5 + (percentualNaFaixa * (25 - 18.5));
        }
        if (p <= 75) {
          const percentualNaFaixa = (p - 50) / 25;
          return 25 + (percentualNaFaixa * (30 - 25));
        }
        const percentualNaFaixa = (p - 75) / 25;
        return 30 + (percentualNaFaixa * 20);
      };

      const imcParaPeso = (imc: number): number => {
        return imc * (alturaMetros * alturaMetros);
      };

      const novoIMC = percentualParaIMC(percentual);
      const novoPeso = imcParaPeso(novoIMC);
      
      setImcTemporarioIMC(novoIMC);
      setPesoTemporarioIMC(novoPeso);
    };

    const handleTouchEnd = () => {
      setIsDraggingIMC(false);
      setPacienteArrastandoIMC(null);
      setPesoTemporarioIMC(null);
      setImcTemporarioIMC(null);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingIMC, pacienteArrastandoIMC, pacientesVisiveis]);

  // Efeito para mostrar fogos quando IMC entrar na faixa saudável
  useEffect(() => {
    if (!isDraggingIMC || !pacienteArrastandoIMC || imcTemporarioIMC === null) {
      // Limpar fogos quando não estiver arrastando
      if (!isDraggingIMC && pacienteArrastandoIMC) {
        setShowFireworks(prev => {
          const newState = { ...prev };
          delete newState[pacienteArrastandoIMC];
          return newState;
        });
      }
      return;
    }

    // Verificar se está na faixa saudável (18.5 a 25)
    const isSaudavel = imcTemporarioIMC >= 18.5 && imcTemporarioIMC < 25;
    
    if (isSaudavel) {
      // Ativar fogos para este paciente
      setShowFireworks(prev => ({
        ...prev,
        [pacienteArrastandoIMC]: true
      }));
      
      // Desativar após 3 segundos
      const timer = setTimeout(() => {
        setShowFireworks(prev => {
          const newState = { ...prev };
          delete newState[pacienteArrastandoIMC];
          return newState;
        });
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      // Desativar fogos se sair da faixa saudável
      setShowFireworks(prev => {
        const newState = { ...prev };
        delete newState[pacienteArrastandoIMC];
        return newState;
      });
    }
  }, [isDraggingIMC, pacienteArrastandoIMC, imcTemporarioIMC]);

  // Verificar autenticação e carregar nutricionista
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setNutricionista(null);
        setRegistroNumero('');
        setTelefoneContato('');
        setTelefoneDdiContato('');
        setTelefonePaisContato('');
        setCidadesSelecionadas([]);
        setLoadingNutricionista(false);
        setLoading(false);
        router.push('/');
        return;
      }

      setUser(firebaseUser);
      setLoadingNutricionista(true);

      try {
        let nutriDoc: NutricionistaDoc | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            nutriDoc = await NutricionistaService.getNutricionistaByUserId(firebaseUser.uid);
            break;
          } catch (error) {
            if (attempt === 1) throw error;
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }

        setNutricionista(nutriDoc);
        setRegistroNumero(nutriDoc?.registroNumero || '');
        setTelefoneContato(nutriDoc?.telefone || '');
        setTelefoneDdiContato(nutriDoc?.telefoneDdi || '');
        setTelefonePaisContato(nutriDoc?.telefonePais || '');
        setCidadesSelecionadas(nutriDoc?.cidades || []);
        setPerfilGenero((nutriDoc?.genero as 'M' | 'F' | '') || '');
        setPerfilInstagram(nutriDoc?.instagramUsuario || '');
        setPerfilCep(nutriDoc?.cep || '');
        setPerfilNomeLocal(nutriDoc?.nomeLocal || '');
        setPerfilEndereco(nutriDoc?.endereco || '');
        setPerfilNumero(nutriDoc?.numero || '');
        setPerfilPontoRef(nutriDoc?.pontoReferencia || '');
        setPerfilGoogleMaps(nutriDoc?.googleMapsUrl || '');
        setPerfilFotoUrl(nutriDoc?.fotoPerfilUrl || firebaseUser.photoURL || null);
        
        // Carregar médicos verificados
        if (nutriDoc?.isVerificado) {
          loadMedicosVerificados();
        }
      } catch (error) {
        console.error('Erro ao carregar nutricionista:', error);
      } finally {
        setLoadingNutricionista(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleConfirmarCadastroNutri = useCallback(async () => {
    if (!user) return;
    setCriandoCadastroNutri(true);
    try {
      const nutriDoc = await NutricionistaService.createOrUpdateNutricionista(
        user.uid,
        user.email || '',
        user.displayName || ''
      );
      setNutricionista(nutriDoc);
      setRegistroNumero(nutriDoc.registroNumero || '');
      setTelefoneContato(nutriDoc.telefone || '');
      setTelefoneDdiContato(nutriDoc.telefoneDdi || '');
      setTelefonePaisContato(nutriDoc.telefonePais || '');
      setCidadesSelecionadas(nutriDoc.cidades || []);
    } catch (error) {
      console.error('Erro ao iniciar cadastro de nutricionista:', error);
      alert('Nao foi possivel iniciar seu cadastro agora. Tente novamente.');
    } finally {
      setCriandoCadastroNutri(false);
    }
  }, [user]);

  const handleRecusarCadastroNutri = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = 'https://www.oftware.com.br';
      return;
    }
    router.push('/');
  }, [router]);

  // Carregar agregado de classificação do nutricionista
  useEffect(() => {
    const id = nutricionista?.userId || nutricionista?.id;
    if (!id) { setAgregadoNutri(null); return; }
    ClassificacaoProfissionalService.getAgregado('nutricionista', id).then(setAgregadoNutri);
  }, [nutricionista?.userId, nutricionista?.id]);

  // Carregar médicos verificados
  const loadMedicosVerificados = async () => {
    setLoadingMedicos(true);
    try {
      const todosMedicos = await MedicoService.getAllMedicos();
      const verificados = todosMedicos.filter(m => m.isVerificado && m.status === 'ativo');
      setMedicosVerificados(verificados);
      
      // Extrair estados e cidades únicos onde existem médicos
      const estadosComMed = new Set<string>();
      const cidadesComMed: { estado: string; cidade: string }[] = [];
      
      verificados.forEach(medico => {
        // Verificar se cidades existe e é um array antes de iterar
        if (medico.cidades && Array.isArray(medico.cidades)) {
        medico.cidades.forEach(cidade => {
          estadosComMed.add(cidade.estado);
          // Adicionar cidade se ainda não existir para este estado
          if (!cidadesComMed.some(c => c.estado === cidade.estado && c.cidade === cidade.cidade)) {
            cidadesComMed.push({
              estado: cidade.estado,
              cidade: cidade.cidade
            });
          }
        });
        }
      });
      
      setEstadosComMedicos(Array.from(estadosComMed).sort());
      setCidadesComMedicos(cidadesComMed);
    } catch (error) {
      console.error('Erro ao carregar médicos:', error);
    } finally {
      setLoadingMedicos(false);
    }
  };
  
  // Carregar cidades da coleção medicos (para o modal de perfil - todas as cidades cadastradas nos médicos)
  const loadCidadesDosMedicos = useCallback(async () => {
    setLoadingCidadesMedicos(true);
    try {
      const todosMedicos = await MedicoService.getAllMedicos();
      const estadosComMed = new Set<string>();
      const cidadesComMed: { estado: string; cidade: string }[] = [];

      todosMedicos.forEach(medico => {
        if (medico.cidades && Array.isArray(medico.cidades)) {
          medico.cidades.forEach(cidade => {
            estadosComMed.add(cidade.estado);
            if (!cidadesComMed.some(c => c.estado === cidade.estado && c.cidade === cidade.cidade)) {
              cidadesComMed.push({
                estado: cidade.estado,
                cidade: cidade.cidade
              });
            }
          });
        }
      });

      setEstadosComMedicos(Array.from(estadosComMed).sort());
      setCidadesComMedicos(cidadesComMed);
    } catch (error) {
      console.error('Erro ao carregar cidades dos médicos:', error);
    } finally {
      setLoadingCidadesMedicos(false);
    }
  }, []);

  // Carregar dados do perfil quando nutricionista for carregado
  useEffect(() => {
    if (nutricionista) {
      setRegistroNumero(nutricionista.registroNumero || '');
      setTelefoneContato(nutricionista.telefone || '');
      setTelefoneDdiContato(nutricionista.telefoneDdi || '');
      setTelefonePaisContato(nutricionista.telefonePais || '');
      setCidadesSelecionadas(nutricionista.cidades || []);
      setPerfilGenero((nutricionista.genero as 'M' | 'F' | '') || '');
      setPerfilInstagram(nutricionista.instagramUsuario || '');
      setPerfilCep(nutricionista.cep || '');
      setPerfilNomeLocal(nutricionista.nomeLocal || '');
      setPerfilEndereco(nutricionista.endereco || '');
      setPerfilNumero(nutricionista.numero || '');
      setPerfilPontoRef(nutricionista.pontoReferencia || '');
      setPerfilGoogleMaps(nutricionista.googleMapsUrl || '');
      setPerfilFotoUrl(nutricionista.fotoPerfilUrl || user?.photoURL || null);
    }
  }, [nutricionista, user?.photoURL]);

  // Carregar cidades disponíveis quando abrir o modal de perfil
  // Carrega cidades da coleção medicos (todas as cidades cadastradas nos médicos)
  useEffect(() => {
    if (activeMenu === 'meu-perfil') {
      loadCidadesDosMedicos();
    }
  }, [activeMenu, loadCidadesDosMedicos]);

  // Carregar médicos verificados quando navegar para aba link do perfil
  useEffect(() => {
    if (meuPerfilAba === 'link' && nutricionista && medicosVerificados.length === 0) {
      loadMedicosVerificados();
    }
  }, [meuPerfilAba, nutricionista, medicosVerificados.length, loadMedicosVerificados]);

  useEffect(() => {
    if (!user) {
      setOrganizationShellBranding(null);
      setOrganizationShellContext({ organizationId: null, organizationMatch: true });
      return;
    }

    let cancelled = false;
    setOrganizationShellBranding(null);
    setOrganizationShellContext({ organizationId: null, organizationMatch: true });
    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/metanutri/organization-branding', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = readOrganizationShellBrandingResponse(res.ok ? await res.json() : null);
        if (!cancelled) {
          setOrganizationShellContext({
            organizationId: parsed.organizationId,
            organizationMatch: parsed.organizationMatch,
          });
          setOrganizationShellBranding(parsed.branding);
        }
      } catch {
        if (!cancelled) {
          setOrganizationShellBranding(null);
          setOrganizationShellContext({ organizationId: null, organizationMatch: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const shellChrome = useMemo(
    () =>
      resolveOrganizationShellChrome({
        organizationId: organizationShellContext.organizationId,
        branding: organizationShellBranding,
      }),
    [organizationShellBranding, organizationShellContext.organizationId],
  );
  const shellSplash = organizationShellSplashProps(shellChrome);
  const sidebarOrganizationLogoSrc = useMemo(
    () =>
      resolveOrganizationShellLogoUrl(organizationShellBranding, {
        backgroundColor: shellChrome.secondaryColor,
      }),
    [organizationShellBranding, shellChrome.secondaryColor],
  );
  const headerOrganizationLogoSrc = useMemo(
    () =>
      resolveOrganizationShellLogoUrl(organizationShellBranding, {
        darkBackground: false,
      }),
    [organizationShellBranding],
  );
  const sidebarOrganizationLogoAlt = organizationShellBranding?.publicName?.trim() || 'Oftware';

  // Carregar KPIs da Home
  const loadKPIs = useCallback(async () => {
    if (!user || !nutricionista) return;
    
    setLoadingKPIs(true);
    try {
      // 1. Contar pacientes compartilhados
      const vinculos = await PacienteNutricionistaService.listActiveVinculosByNutri(user.uid);
      setPacientesCompartilhados(vinculos.length);
      
      // 2. Contar médicos vinculados
      setMedicosVinculados(nutricionista.medicoVinculadoIds.length);
      
      // 3. Calcular receita total e do mês (apenas dos pacientes compartilhados - relação nutricionista-paciente)
      if (vinculos.length > 0) {
        // Buscar pagamentos da relação nutricionista-paciente
        const pagamentosNutricionista = await PagamentoService.getAllPagamentosNutricionista(user.uid);
        const pacientesIds = vinculos.map(v => v.pacienteId);
        
        let total = 0;
        let mesAtual = 0;
        const hoje = new Date();
        const mesAtualNum = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        pacientesIds.forEach(pacienteId => {
          const pagamento = pagamentosNutricionista[pacienteId];
          if (pagamento) {
            total += pagamento.valorPago || 0;
            
            // Receita do mês atual (verificar parcelas pagas este mês)
            if (pagamento.parcelas && Array.isArray(pagamento.parcelas)) {
              pagamento.parcelas.forEach(parcela => {
                if (parcela.status === 'paga' && parcela.dataPagamento) {
                  const dataPagamento = parcela.dataPagamento instanceof Date 
                    ? parcela.dataPagamento 
                    : new Date(parcela.dataPagamento);
                  if (dataPagamento.getMonth() === mesAtualNum && dataPagamento.getFullYear() === anoAtual) {
                    mesAtual += parcela.valor || 0;
                  }
                }
              });
            }
            
            // Também verificar pagamento único do mês atual
            if (pagamento.dataPagamento && pagamento.statusPagamento === 'pago') {
              const dataPagamento = pagamento.dataPagamento instanceof Date 
                ? pagamento.dataPagamento 
                : new Date(pagamento.dataPagamento);
              if (dataPagamento.getMonth() === mesAtualNum && dataPagamento.getFullYear() === anoAtual) {
                mesAtual += pagamento.valorPago || 0;
              }
            }
          }
        });
        
        setReceitaTotal(total);
        setReceitaMes(mesAtual);
      } else {
        setReceitaTotal(0);
        setReceitaMes(0);
      }
      
      // Carregar pacientes visíveis para modais
      if (nutricionista.isVerificado && nutricionista.medicoVinculadoIds.length > 0) {
        const pacientes = await PacienteNutricionistaService.listPacientesVisiveisByNutri(user.uid);
        setPacientesVisiveis(pacientes);
      }
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    } finally {
      setLoadingKPIs(false);
    }
  }, [user, nutricionista]);

  // Carregar KPIs quando nutricionista mudar
  useEffect(() => {
    if (user && nutricionista && activeMenu === 'home') {
      loadKPIs();
    }
  }, [user, nutricionista, activeMenu, loadKPIs]);

  // Carregar estados e cidades com médicos para busca (DEPRECATED - usar loadEstadosCidadesMedicosDisponiveis)
  // Mantida apenas para compatibilidade, mas não deve ser usada

  // Carregar médicos vinculados (ETAPA A3) - Otimizado para mostrar TODOS os médicos vinculados
  const loadMedicosVinculados = useCallback(async () => {
    if (!user || !nutricionista || !nutricionista.isVerificado) return;
    
    // Se não há médicos vinculados, limpar lista
    if (!nutricionista.medicoVinculadoIds || nutricionista.medicoVinculadoIds.length === 0) {
      setMedicosList([]);
      return;
    }
    
    setLoadingMedicosList(true);
    try {
      // Passo A: Buscar vínculos ativos do nutri em paralelo com dados dos médicos
      const [vinculos, medicosData] = await Promise.all([
        PacienteNutricionistaService.listActiveVinculosByNutri(user.uid),
        Promise.all(
          nutricionista.medicoVinculadoIds.map(id => MedicoService.getMedicoById(id))
        )
      ]);

      // Passo B: Agregar pacientes por médico (a partir dos vínculos)
      const medicoPacientesMap = new Map<string, string[]>();
      vinculos.forEach(vinculo => {
        if (!medicoPacientesMap.has(vinculo.medicoId)) {
          medicoPacientesMap.set(vinculo.medicoId, []);
        }
        medicoPacientesMap.get(vinculo.medicoId)!.push(vinculo.pacienteId);
      });

      // Passo C: Montar lista final com TODOS os médicos vinculados
      // Mesmo aqueles que não têm pacientes compartilhados ainda aparecem (com countPacientes = 0)
      const medicosListData = medicosData
        .filter((medico): medico is Medico => medico !== null)
        .filter(medico => 
          medico.isVerificado && 
          medico.status === 'ativo'
        )
        .map(medico => ({
          medicoId: medico.id,
          nome: medico.nome,
          email: medico.email,
          telefone: medico.telefone,
          genero: medico.genero,
          crm: medico.crm,
          cidades: medico.cidades || [],
          fotoPerfilUrl: medico.fotoPerfilUrl ?? null,
          instagramUsuario: medico.instagramUsuario ?? null,
          nomeLocal: medico.localizacao?.nomeLocal,
          endereco: medico.localizacao?.endereco,
          countPacientes: medicoPacientesMap.get(medico.id)?.length || 0,
          pacienteIds: medicoPacientesMap.get(medico.id) || [],
        }))
        .sort((a, b) => {
          // Ordenar: primeiro por quantidade de pacientes (maior para menor)
          // Depois por nome (alfabético)
          if (b.countPacientes !== a.countPacientes) {
            return b.countPacientes - a.countPacientes;
          }
          return a.nome.localeCompare(b.nome);
        });

      setMedicosList(medicosListData);
      
      // Cachear vínculos para uso no modal
      setVinculosCache(vinculos.map(v => ({
        pacienteId: v.pacienteId,
        medicoId: v.medicoId,
        dataCompartilhamento: v.dataCompartilhamento,
      })));
    } catch (error) {
      console.error('Erro ao carregar médicos vinculados:', error);
      setMedicosList([]);
    } finally {
      setLoadingMedicosList(false);
    }
  }, [user, nutricionista]);

  // Carregar apenas estados e cidades disponíveis (sem carregar todos os registros completos)
  const loadEstadosCidadesMedicosDisponiveis = useCallback(async () => {
    console.log('🔍 Carregando estados e cidades de médicos disponíveis...');
    setLoadingEstadosCidadesMedicos(true);
    try {
      const todosMedicos = await MedicoService.getAllMedicos();
      console.log('📊 Total de médicos encontrados:', todosMedicos.length);
      
      // Filtrar apenas verificados e ativos
      const disponiveis = todosMedicos.filter(medico => 
        medico.isVerificado && medico.status === 'ativo'
      );
      console.log('✅ Médicos verificados e ativos:', disponiveis.length);
      
      // Extrair estados e cidades únicos
      const estadosComMed = new Set<string>();
      const cidadesComMed: { estado: string; cidade: string }[] = [];
      
      disponiveis.forEach(medico => {
        if (medico.cidades && Array.isArray(medico.cidades)) {
          medico.cidades.forEach(cidade => {
            estadosComMed.add(cidade.estado);
            if (!cidadesComMed.some(c => c.estado === cidade.estado && c.cidade === cidade.cidade)) {
              cidadesComMed.push({
                estado: cidade.estado,
                cidade: cidade.cidade
              });
            }
          });
        }
      });
      
      const estadosArray = Array.from(estadosComMed).sort();
      console.log('📍 Estados encontrados:', estadosArray);
      console.log('📍 Total de cidades:', cidadesComMed.length);
      console.log('📍 Primeiras cidades:', cidadesComMed.slice(0, 5));
      
      setEstadosComMedicosBusca(estadosArray);
      setCidadesComMedicosBusca(cidadesComMed);
      
      console.log('✅ Estados e cidades setados no estado');
    } catch (error) {
      console.error('❌ Erro ao carregar estados e cidades de médicos:', error);
    } finally {
      setLoadingEstadosCidadesMedicos(false);
    }
  }, []); // Não depende de user ou nutricionista, apenas busca todos os médicos

  // Carregar médicos disponíveis para criar vínculo (filtrado por estado e cidade)
  const loadMedicosDisponiveis = useCallback(async (estado?: string, cidade?: string) => {
    if (!user || !nutricionista || !nutricionista.isVerificado) return;
    
    if (!estado || !cidade) {
      alert('Selecione estado e cidade para buscar.');
      return;
    }

    setLoadingMedicosDisponiveis(true);
    try {
      const todosMedicos = await MedicoService.getAllMedicos();
      
      // Filtrar: verificados, ativos E que atendem na cidade selecionada
      const disponiveis = todosMedicos.filter(medico => {
        if (!medico.isVerificado || medico.status !== 'ativo') {
          return false;
        }
        
        // Verificar se o médico atende na cidade selecionada
        if (!medico.cidades || !Array.isArray(medico.cidades) || medico.cidades.length === 0) {
          return false;
        }
        
        // Normalizar cidade para comparação
        const normalizarCidade = (c: string): string => {
          return c.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
        };
        
        const cidadeBuscaNormalizada = normalizarCidade(cidade);
        
        return medico.cidades.some(c => {
          const cidadeNormalizada = normalizarCidade(c.cidade);
          return c.estado === estado && cidadeNormalizada === cidadeBuscaNormalizada;
        });
      });
      
      setMedicosDisponiveis(disponiveis);
    } catch (error) {
      console.error('Erro ao carregar médicos disponíveis:', error);
    } finally {
      setLoadingMedicosDisponiveis(false);
    }
  }, [user, nutricionista]);

  // Carregar solicitações de vínculo ENVIADAS pelo nutricionista
  const loadSolicitacoesVinculo = useCallback(async () => {
    if (!user || !nutricionista) return;
    
    setLoadingSolicitacoesVinculo(true);
    try {
      const solicitacoes = await SolicitacaoVinculoNutriMedicoService.listSentVinculoRequestsByNutri(user.uid);
      setSolicitacoesVinculo(solicitacoes);
    } catch (error) {
      console.error('Erro ao carregar solicitações de vínculo:', error);
    } finally {
      setLoadingSolicitacoesVinculo(false);
    }
  }, [user, nutricionista]);
  
  // Carregar solicitações de vínculo RECEBIDAS pelo nutricionista (que o médico fez)
  const loadSolicitacoesVinculoRecebidas = useCallback(async () => {
    if (!user || !nutricionista) return;
    
    setLoadingSolicitacoesVinculoRecebidas(true);
    try {
      console.log('🔍 [DEBUG] Iniciando busca de solicitações recebidas:', {
        userUid: user.uid,
        nutricionistaId: nutricionista.id,
        nutricionistaUserId: nutricionista.userId,
        'sãoIguais?': {
          'user.uid === nutricionista.id': user.uid === nutricionista.id,
          'user.uid === nutricionista.userId': user.uid === nutricionista.userId,
          'nutricionista.id === nutricionista.userId': nutricionista.id === nutricionista.userId
        }
      });
      
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { COL_SOLICITACOES_VINCULO_NUTRI_MEDICO } = await import('@/features/metaNutri/metaNutri.constants');

      // IDs possíveis do nutricionista atual
      const idsPossiveisNutri = [user.uid, nutricionista.id, nutricionista.userId].filter(Boolean);

      // Buscar apenas as solicitações recebidas pendentes do nutricionista atual.
      const snapshots = await Promise.all(
        idsPossiveisNutri.map((nutriId) =>
          getDocs(
            query(
              collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
              where('nutricionistaId', '==', nutriId),
              where('status', '==', SOLICITACAO_STATUS.PENDENTE),
              where('solicitadoPor', '==', 'medico')
            )
          )
        )
      );

      const dedupe = new Map<string, any>();
      snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          if (dedupe.has(docSnap.id)) return;
          const data = docSnap.data();
          dedupe.set(docSnap.id, {
            id: docSnap.id,
            nutricionistaId: data.nutricionistaId,
            medicoId: data.medicoId,
            solicitadoPor: data.solicitadoPor || 'nutricionista',
            status: data.status,
            criadoEm: data.criadoEm?.toDate() || new Date(),
            aceitoEm: data.aceitoEm?.toDate(),
            rejeitadoEm: data.rejeitadoEm?.toDate(),
            canceladoEm: data.canceladoEm?.toDate(),
            motivoRejeicao: data.motivoRejeicao,
            motivoCancelamento: data.motivoCancelamento,
            nutricionistaNome: data.nutricionistaNome,
            nutricionistaEmail: data.nutricionistaEmail,
            medicoNome: data.medicoNome,
          });
        });
      });
      const solicitacoesRecebidas = Array.from(dedupe.values());
      
      console.log('🔍 [DEBUG] Solicitações recebidas filtradas:', {
        total: solicitacoesRecebidas.length,
        solicitacoes: solicitacoesRecebidas.map(s => ({
          id: s.id,
          nutricionistaId: s.nutricionistaId,
          solicitadoPor: s.solicitadoPor,
          status: s.status
        }))
      });
      
      // Enriquecer com dados completos do médico (incluindo CRM)
      const solicitacoesEnriquecidas = await Promise.all(
        solicitacoesRecebidas.map(async (solicitacao) => {
          try {
            const medico = await MedicoService.getMedicoById(solicitacao.medicoId);
            const crmFormatado = medico?.crm 
              ? `${medico.crm.numero}${medico.crm.estado ? `/${medico.crm.estado}` : ''}`
              : '';
            return {
              ...solicitacao,
              medicoNome: medico?.nome || solicitacao.medicoNome || 'Médico',
              medicoCrm: crmFormatado,
            };
          } catch (error) {
            console.error('Erro ao buscar dados do médico:', error);
            return {
              ...solicitacao,
              medicoNome: solicitacao.medicoNome || 'Médico',
              medicoCrm: '',
            };
          }
        })
      );
      
      setSolicitacoesVinculoRecebidas(solicitacoesEnriquecidas);
    } catch (error) {
      console.error('Erro ao carregar solicitações recebidas:', error);
    } finally {
      setLoadingSolicitacoesVinculoRecebidas(false);
    }
  }, [user, nutricionista]);

  // Solicitar vínculo com médico
  const handleSolicitarVinculo = useCallback(async (medicoId: string) => {
    if (!user || !nutricionista) return;
    
    try {
      await SolicitacaoVinculoNutriMedicoService.createVinculoRequest(
        user.uid,
        medicoId,
        'nutricionista', // Nutricionista está solicitando o médico
        {
          nutricionistaNome: nutricionista.nome,
          nutricionistaEmail: nutricionista.email,
        }
      );
      // Enviar e-mail ao médico (nutri pediu vínculo) — instantâneo
      try {
        await fetch('/api/send-email-nutri-pediu-vinculo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicoId, nutricionistaId: user.uid }),
        });
      } catch (e) {
        console.error('Erro ao enviar e-mail nutri pediu vínculo:', e);
      }
      // Recarregar apenas solicitações (médicos disponíveis só carregam quando buscar)
      await loadSolicitacoesVinculo();
      
      // Mudar para aba de solicitações
      setAbaAtivaMedicos('solicitacoes');
    } catch (error: any) {
      console.error('Erro ao solicitar vínculo:', error);
      alert(error.message || 'Erro ao solicitar vínculo. Tente novamente.');
    }
  }, [user, nutricionista, loadSolicitacoesVinculo, loadMedicosDisponiveis]);

  // Cancelar solicitação de vínculo
  const handleCancelarSolicitacao = useCallback(async (solicitacaoId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação?')) return;
    
    try {
      await SolicitacaoVinculoNutriMedicoService.cancelVinculoRequest(solicitacaoId);
      
      // Recarregar solicitações
      await loadSolicitacoesVinculo();
      
      alert('Solicitação cancelada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao cancelar solicitação:', error);
      alert(error.message || 'Erro ao cancelar solicitação. Tente novamente.');
    }
  }, [loadSolicitacoesVinculo]);

  // Aprovar solicitação de vínculo recebida
  const handleAceitarVinculo = useCallback(async (requestId: string) => {
    if (!user) return;
    if (aceitandoVinculoIdRef.current) return;
    aceitandoVinculoIdRef.current = requestId;
    setAceitandoVinculoId(requestId);

    try {
      await SolicitacaoVinculoNutriMedicoService.approveVinculoRequest(requestId);
      alert('Vínculo aceito com sucesso!');
      
      // Recarregar nutricionista para atualizar medicoVinculadoIds
      const nutriDoc = await NutricionistaService.getNutricionistaByUserId(user.uid);
      if (nutriDoc) {
        setNutricionista(nutriDoc);
      }
      
      await loadSolicitacoesVinculoRecebidas();
      await loadMedicosVinculados();
    } catch (error: any) {
      console.error('Erro ao aceitar vínculo:', error);
      alert(error.message || 'Erro ao aceitar vínculo.');
    } finally {
      aceitandoVinculoIdRef.current = null;
      setAceitandoVinculoId(null);
    }
  }, [user]);

  // Rejeitar solicitação de vínculo recebida
  const handleRejeitarVinculo = useCallback(async (requestId: string) => {
    if (!confirm('Tem certeza que deseja rejeitar esta solicitação de vínculo?')) return;
    
    try {
      setLoading(true);
      await SolicitacaoVinculoNutriMedicoService.rejectVinculoRequest(requestId);
      alert('Solicitação rejeitada.');
      await loadSolicitacoesVinculoRecebidas();
    } catch (error: any) {
      console.error('Erro ao rejeitar vínculo:', error);
      alert(error.message || 'Erro ao rejeitar vínculo.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Excluir solicitação de vínculo (recebida ou enviada)
  const handleExcluirSolicitacaoVinculo = useCallback(async (requestId: string, tipo: 'recebida' | 'enviada') => {
    if (!user || !nutricionista) return;
    
    if (!confirm('Tem certeza que deseja excluir esta solicitação?\n\nEsta ação irá remover completamente a solicitação do sistema e não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      await SolicitacaoVinculoNutriMedicoService.deleteVinculoRequest(requestId);
      alert('Solicitação excluída com sucesso!');
      
      // Recarregar nutricionista para atualizar medicoVinculadoIds se necessário
      const nutriDoc = await NutricionistaService.getNutricionistaByUserId(user.uid);
      if (nutriDoc) {
        setNutricionista(nutriDoc);
      }
      
      // Recarregar todas as listas para atualizar o estado
      if (tipo === 'recebida') {
        await loadSolicitacoesVinculoRecebidas();
      } else {
        await loadSolicitacoesVinculo();
      }
      
      // Recarregar médicos vinculados para atualizar a lista
      await loadMedicosVinculados();
    } catch (error: any) {
      console.error('Erro ao excluir solicitação:', error);
      alert(error.message || 'Erro ao excluir solicitação.');
    } finally {
      setLoading(false);
    }
  }, [user, nutricionista, loadSolicitacoesVinculoRecebidas, loadSolicitacoesVinculo, loadMedicosVinculados]);

  // Carregar solicitações recebidas ao abrir a aba "Solicitações" em Médicos
  useEffect(() => {
    if (activeMenu === 'medicos' && abaAtivaMedicos === 'solicitacoes') {
      loadSolicitacoesVinculoRecebidas();
    }
  }, [activeMenu, abaAtivaMedicos, loadSolicitacoesVinculoRecebidas]);

  // Excluir vínculo completo com médico
  const handleExcluirVinculoMedico = useCallback(async (medicoId: string) => {
    if (!user || !nutricionista) return;

    const medicoEncontrado = medicosList.find(m => m.medicoId === medicoId);
    const nomeMedico = medicoEncontrado?.nome || 'este médico';

    if (!confirm(
      `Tem certeza que deseja excluir o vínculo com ${nomeMedico}?\n\n` +
      `Esta ação irá:\n` +
      `- Remover o vínculo entre você e o médico\n` +
      `- Deletar todas as solicitações relacionadas\n` +
      `- Deletar todos os vínculos de pacientes compartilhados\n` +
      `- Permitir que você envie uma nova solicitação no futuro\n\n` +
      `Esta ação não pode ser desfeita.`
    )) {
      return;
    }

    try {
      setLoading(true);
      await SolicitacaoVinculoNutriMedicoService.removeVinculoCompleto(
        medicoId,
        user.uid
      );
      alert('Vínculo excluído com sucesso!');
      // Recarregar médicos vinculados
      if (nutricionista.isVerificado && nutricionista.medicoVinculadoIds && nutricionista.medicoVinculadoIds.length > 0) {
        const [vinculos, medicosData] = await Promise.all([
          PacienteNutricionistaService.listActiveVinculosByNutri(user.uid),
          Promise.all(
            nutricionista.medicoVinculadoIds.map(id => MedicoService.getMedicoById(id))
          )
        ]);
        const medicoPacientesMap = new Map<string, string[]>();
        vinculos.forEach(vinculo => {
          if (!medicoPacientesMap.has(vinculo.medicoId)) {
            medicoPacientesMap.set(vinculo.medicoId, []);
          }
          medicoPacientesMap.get(vinculo.medicoId)!.push(vinculo.pacienteId);
        });
        const medicosListData = medicosData
          .filter((medico): medico is Medico => medico !== null)
          .filter(medico => 
            medico.isVerificado && 
            medico.status === 'ativo'
          )
          .map(medico => ({
            medicoId: medico.id,
            nome: medico.nome,
            email: medico.email,
            telefone: medico.telefone,
            genero: medico.genero,
            crm: medico.crm,
            cidades: medico.cidades,
            countPacientes: medicoPacientesMap.get(medico.id)?.length || 0,
            pacienteIds: medicoPacientesMap.get(medico.id) || [],
          }));
        setMedicosList(medicosListData);
      } else {
        setMedicosList([]);
      }
      // Recarregar solicitações enviadas
      if (user && nutricionista) {
        const solicitacoes = await SolicitacaoVinculoNutriMedicoService.listSentVinculoRequestsByNutri(user.uid);
        setSolicitacoesVinculo(solicitacoes);
      }
    } catch (error: any) {
      console.error('Erro ao excluir vínculo:', error);
      alert(error.message || 'Erro ao excluir vínculo.');
    } finally {
      setLoading(false);
    }
  }, [user, nutricionista, medicosList]);

  // Carregar dados quando entrar na seção ou mudar aba
  useEffect(() => {
    console.log('🔄 useEffect médicos:', {
      user: !!user,
      nutricionista: !!nutricionista,
      isVerificado: nutricionista?.isVerificado,
      activeMenu,
      abaAtivaMedicos
    });
    
    if (user && nutricionista && activeMenu === 'medicos' && nutricionista.isVerificado) {
      if (abaAtivaMedicos === 'buscar') {
        // Carregar apenas estados e cidades disponíveis (sem carregar todos os registros)
        console.log('✅ Chamando loadEstadosCidadesMedicosDisponiveis...');
        loadEstadosCidadesMedicosDisponiveis();
      } else if (abaAtivaMedicos === 'solicitacoes') {
        loadSolicitacoesVinculo();
      } else if (abaAtivaMedicos === 'vinculados') {
      loadMedicosVinculados();
    }
    } else {
      console.log('⚠️ Condições não atendidas para carregar estados/cidades');
    }
  }, [user, nutricionista, activeMenu, abaAtivaMedicos, loadSolicitacoesVinculo, loadMedicosVinculados, loadEstadosCidadesMedicosDisponiveis]);

  // Carregar solicitações pendentes (correção de compartilhamento) - DEFINIR ANTES DE USAR
  const loadSolicitacoesPendentes = useCallback(async () => {
    if (!user || !nutricionista || !nutricionista.isVerificado) return;
    
    setLoadingSolicitacoesPendentes(true);
    try {
      // IMPORTANTE: usar user.uid (Firebase Auth UID) como nutricionistaId
      const solicitacoes = await SolicitacaoNutricionistaService.listPendingRequestsByNutri(user.uid);
      setSolicitacoesPendentes(solicitacoes);
    } catch (error) {
      console.error('Erro ao carregar solicitações pendentes:', error);
      setSolicitacoesPendentes([]);
    } finally {
      setLoadingSolicitacoesPendentes(false);
    }
  }, [user, nutricionista]);

  // Carregar pagamentos dos pacientes compartilhados (relação nutricionista-paciente)
  const loadPagamentos = useCallback(async (pacientesParaUsar: PacienteCompleto[]) => {
    if (!nutricionista || !user || pacientesParaUsar.length === 0) return;
    
    try {
      console.log('💰 Financeiro Nutri: Carregando pagamentos nutricionista-paciente para', pacientesParaUsar.length, 'pacientes');
      
      // Buscar pagamentos específicos da relação nutricionista-paciente
      const pagamentosNutricionista = await PagamentoService.getAllPagamentosNutricionista(user.uid);
      console.log('💰 Financeiro Nutri: Pagamentos nutricionista-paciente encontrados:', Object.keys(pagamentosNutricionista).length);
      
      // Filtrar apenas pagamentos dos pacientes visíveis
      const pacientesIds = pacientesParaUsar.map(p => p.id);
      const pagamentosFiltrados: Record<string, PagamentoPaciente> = {};
      
      Object.entries(pagamentosNutricionista).forEach(([pacienteId, pagamento]) => {
        if (pacientesIds.includes(pacienteId)) {
          pagamentosFiltrados[pacienteId] = pagamento;
        }
      });
      
      console.log('💰 Financeiro Nutri: Pagamentos filtrados encontrados:', Object.keys(pagamentosFiltrados).length);
      setPagamentosPacientes(pagamentosFiltrados);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  }, [nutricionista, user]);

  const abrirControleFinanceiroPaciente = useCallback(
    (paciente: PacienteCompleto) => {
      setPacientePagamentoSelecionado(paciente);
      const pagamento = pagamentosPacientes[paciente.id];
      const dataVenda = paciente.dadosIdentificacao?.dataCadastro ?? paciente.dataCadastro;
      if (pagamento) {
        setDadosPagamento({
          ...pagamento,
          dataVenda: pagamento.dataVenda ?? dataVenda,
        });
      } else {
        setDadosPagamento({
          pacienteId: paciente.id,
          statusPagamento: 'em_aberto',
          formaPagamento: null,
          valorTotal: 0,
          valorPago: 0,
          valorPendente: 0,
          parcelas: [],
          dataVenda,
          dataUltimaAtualizacao: new Date(),
        });
      }
      setShowModalPagamento(true);
    },
    [pagamentosPacientes]
  );

  // Carregar pacientes quando entrar na seção (ETAPA A4.1)
  const loadPacientesList = useCallback(async () => {
    if (!user || !nutricionista || !nutricionista.isVerificado) return;
    
    setLoadingPacientesList(true);
    try {
      // ==========================================
      // FASE 1: CARREGAR DADOS ESSENCIAIS (RÁPIDO)
      // ==========================================
      console.log('Carregando pacientes para nutricionista ID:', user.uid);
      const pacientes = await PacienteNutricionistaService.listPacientesVisiveisByNutri(user.uid);
      console.log('Pacientes encontrados:', pacientes.length);
      
      // Renderizar pacientes imediatamente (sem esperar dados secundários)
      setPacientesVisiveis(pacientes);
      
      // ==========================================
      // FASE 2: CARREGAR DADOS SECUNDÁRIOS EM BACKGROUND
      // ==========================================
      // Carregar pagamentos em background sem bloquear a renderização
      if (pacientes.length > 0) {
        // Não usar await aqui - deixar carregar em background
        loadPagamentos(pacientes.map(p => p.paciente)).catch(error => {
          console.error('Erro ao carregar pagamentos em background:', error);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar lista de pacientes:', error);
      setPacientesVisiveis([]);
    } finally {
      setLoadingPacientesList(false);
    }
  }, [user, nutricionista, loadPagamentos]);

  // Carregar todos os pacientes do Oftware
  const loadTodosPacientesOftware = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Se já carregou, não precisa carregar novamente
    if (todosPacientesOftware.length > 0) return;
    
    setLoadingTodosPacientes(true);
    try {
      console.log('Carregando todos os pacientes da base Oftware...');
      const todosPacientes = await PacienteService.getAllPacientes();
      console.log(`✅ ${todosPacientes.length} pacientes carregados da base Oftware`);
      setTodosPacientesOftware(todosPacientes);
    } catch (error) {
      console.error('Erro ao carregar todos os pacientes:', error);
    } finally {
      setLoadingTodosPacientes(false);
    }
  }, [todosPacientesOftware.length]);

  // Carregar todos os pacientes quando o filtro mudar para "Base Oftware"
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (filtroBaseDashboard === 'oftware' && todosPacientesOftware.length === 0 && !loadingTodosPacientes) {
      loadTodosPacientesOftware();
    }
  }, [filtroBaseDashboard, todosPacientesOftware.length, loadingTodosPacientes, loadTodosPacientesOftware]);

  // Carregar dados quando entrar na seção home ou leads
  useEffect(() => {
    if (user && nutricionista && (activeMenu === 'home' || activeMenu === 'leads')) {
      loadPacientesList();
    }
  }, [user, nutricionista, activeMenu, loadPacientesList]);

  useEffect(() => {
    if (user && nutricionista && activeMenu === 'pacientes') {
      loadPacientesList();
      loadSolicitacoesPendentes();
    }
  }, [user, nutricionista, activeMenu, loadPacientesList, loadSolicitacoesPendentes]);

  // Carregar dados quando entrar na seção financeiro
  useEffect(() => {
    if (user && nutricionista && activeMenu === 'financeiro') {
      loadPacientesList();
    }
  }, [user, nutricionista, activeMenu, loadPacientesList]);

  // Comunicação: pacientes compartilhados + médicos vinculados
  useEffect(() => {
    if (user && nutricionista && activeMenu === 'comunicacao') {
      void loadPacientesList();
      void loadMedicosVinculados();
    }
  }, [user, nutricionista, activeMenu, loadPacientesList, loadMedicosVinculados]);

  // Carregar pagamentos quando pacientes mudarem no menu financeiro
  useEffect(() => {
    if (user && nutricionista && activeMenu === 'financeiro' && pacientesVisiveis.length > 0 && !loadingPacientesList) {
      loadPagamentos(pacientesVisiveis.map(p => p.paciente));
    }
  }, [user, nutricionista, activeMenu, loadingPacientesList, pacientesVisiveis, loadPagamentos]);

  const loadLembretes = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const data = await LembreteService.getLembretesPorNutricionista(user.uid);
      setLembretes(data);
    } catch (error) {
      console.error('[Metanutri] Erro ao carregar lembretes:', error);
    }
  }, [user?.uid]);

  const mutateLembretes = useCallback((mutation: LembretesMutation) => {
    setLembretes((prev) => applyLembretesMutation(prev, mutation));
  }, []);

  const loadConsultasAgenda = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metanutri/agenda/meetings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        meetings?: Array<{
          id: string;
          date: string;
          startTime: string;
          endTime: string;
          pacienteNome?: string;
          pacienteId?: string;
          observacoes?: string;
          realizada?: boolean;
        }>;
      };
      if (!res.ok) return;
      setConsultasAgenda(
        (data.meetings || []).map((m) => ({
          id: m.id,
          date: m.date,
          startTime: m.startTime,
          endTime: m.endTime,
          pacienteNome: m.pacienteNome || 'Paciente',
          pacienteId: m.pacienteId,
          observacoes: m.observacoes,
          realizada: m.realizada === true,
        }))
      );
    } catch (error) {
      console.error('[Metanutri] Erro ao carregar consultas agendadas:', error);
    }
  }, [user]);

  // Carregar dados quando entrar na seção calendário, home (pipeline) ou pacientes
  useEffect(() => {
    if (
      user &&
      nutricionista &&
      (activeMenu === 'calendario' ||
        activeMenu === 'home' ||
        activeMenu === 'leads' ||
        activeMenu === 'pacientes' ||
        showVisualizarPacienteModal)
    ) {
      if (activeMenu === 'calendario') {
        loadPacientesList();
        void loadConsultasAgenda();
      }
      void loadLembretes();
    }
  }, [
    user,
    nutricionista,
    activeMenu,
    showVisualizarPacienteModal,
    loadPacientesList,
    loadLembretes,
    loadConsultasAgenda,
  ]);

  // Handler para aceitar solicitação
  const handleAceitarSolicitacao = async (requestId: string) => {
    if (aceitandoSolicitacaoIdRef.current) return;
    aceitandoSolicitacaoIdRef.current = requestId;
    setAceitandoSolicitacaoId(requestId);
    try {
      await SolicitacaoNutricionistaService.approveShareRequest(requestId);
      // Enviar e-mail de boas-vindas ao paciente (instantâneo)
      try {
        const emailRes = await fetch('/api/send-email-solicitado-nutri', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitacaoId: requestId }),
        });
        const emailResult = await emailRes.json();
        if (!emailRes.ok) console.error('E-mail boas-vindas nutri:', emailResult);
        else if (!emailResult.jaEnviado) console.log('E-mail de boas-vindas (nutri) enviado.');
      } catch (e) {
        console.error('Erro ao enviar e-mail de boas-vindas:', e);
      }
      // WhatsApp: médico → paciente + nutricionista → paciente
      try {
        const waRes = await fetch('/api/send-whatsapp-compartilhamento-aceite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitacaoId: requestId, role: 'nutricionista' }),
        });
        const waText = await waRes.text();
        let waResult: any = null;
        try {
          waResult = waText ? JSON.parse(waText) : null;
        } catch {
          waResult = { error: waText?.slice(0, 200) || `HTTP ${waRes.status}` };
        }
        if (!waRes.ok || waResult?.success === false) {
          console.error('WhatsApp aceite nutri:', waRes.status, waResult);
        } else if (!waResult?.jaEnviado) {
          console.log('WhatsApp de aceite (nutri) enviado.', waResult);
        }
      } catch (e) {
        console.error('Erro ao enviar WhatsApp de aceite:', e);
      }
      // Recarregar solicitações e pacientes
      await loadSolicitacoesPendentes();
      await loadPacientesList();
    } catch (error: any) {
      console.error('Erro ao aceitar solicitação:', error);
      alert(error.message || 'Erro ao aceitar solicitação');
    } finally {
      aceitandoSolicitacaoIdRef.current = null;
      setAceitandoSolicitacaoId(null);
    }
  };

  // Handler para rejeitar solicitação
  const handleRejeitarSolicitacao = async (requestId: string) => {
    const motivo = prompt('Motivo da rejeição (opcional):');
    try {
      await SolicitacaoNutricionistaService.rejectShareRequest(requestId, motivo || undefined);
      await loadSolicitacoesPendentes();
    } catch (error: any) {
      console.error('Erro ao rejeitar solicitação:', error);
      alert(error.message || 'Erro ao rejeitar solicitação');
    }
  };

  // Handler para visualizar paciente (desktop: 11 abas; mobile estilo personal: 3 abas)
  // abaInicial: 1=Identificação, 2=Anamnese, 3=Prontuário, 4=Exames, 5=Bio, 6=Evolução, 7=Prescrições, 8=Nutrologia, 9=Personal, 10=Pagamento
  // estiloPersonal: true = modal com Identificação + Anamnese + Prontuário
  const handleVisualizarPaciente = async (paciente: PacienteCompleto, abaInicial: number = 1, estiloPersonal?: boolean) => {
    if (abrindoPacienteLoadingRef.current) return;
    abrindoPacienteLoadingRef.current = true;
    setAbrindoPacienteLoading(true);
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      setPacienteVisualizandoInline(null);
      setPacienteVisualizando(paciente);
      setModalVisualizacaoEstiloPersonal(estiloPersonal ?? false);
      setPastaAtiva(estiloPersonal ? Math.min(abaInicial, 3) : abaInicial);
      setShowVisualizarPacienteModal(true);
      // Inicializar data de exame para aba Exames (id 4) quando abrir nela
      if (abaInicial === 4) {
        const exames = paciente.examesLaboratoriais || [];
        if (exames.length > 0) {
          const ordenados = [...exames].sort((a, b) => {
            const dA = a.dataColeta instanceof Date ? a.dataColeta.toISOString().split('T')[0] : (a.dataColeta?.toDate ? a.dataColeta.toDate().toISOString().split('T')[0] : '');
            const dB = b.dataColeta instanceof Date ? b.dataColeta.toISOString().split('T')[0] : (b.dataColeta?.toDate ? b.dataColeta.toDate().toISOString().split('T')[0] : '');
            return (dB || '').localeCompare(dA || '');
          });
          const maisRecente = ordenados[0];
          const dataStr = maisRecente?.dataColeta instanceof Date ? maisRecente.dataColeta.toISOString().split('T')[0] : (maisRecente?.dataColeta?.toDate ? maisRecente.dataColeta.toDate().toISOString().split('T')[0] : '');
          setExameDataSelecionadaNoModal(dataStr || '');
        } else {
          setExameDataSelecionadaNoModal('');
        }
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
    } finally {
      abrindoPacienteLoadingRef.current = false;
      setAbrindoPacienteLoading(false);
    }
  };

  const abrirProntuarioDoCalendario = useCallback(
    async (pacienteId: string) => {
      const id = pacienteId.trim();
      if (!id) throw new Error('Consulta sem paciente vinculado.');

      let paciente =
        pacientesVisiveis.find(
          (item) =>
            item.pacienteId === id || item.paciente?.id === id || item.paciente?.userId === id
        )?.paciente ?? null;

      if (!paciente) {
        paciente =
          (await PacienteService.getPacienteById(id)) ||
          (await PacienteService.getPacienteByUserId(id));
      }
      if (!paciente) {
        throw new Error('Paciente não encontrado para abrir o prontuário.');
      }

      await handleVisualizarPaciente(paciente, 3, isMobile);
    },
    [handleVisualizarPaciente, isMobile, pacientesVisiveis]
  );

  const abrirPacienteCompletoDoCalendario = useCallback(
    async (pacienteId: string) => {
      const id = pacienteId.trim();
      if (!id) throw new Error('Consulta sem paciente vinculado.');

      let paciente =
        pacientesVisiveis.find(
          (item) =>
            item.pacienteId === id || item.paciente?.id === id || item.paciente?.userId === id
        )?.paciente ?? null;

      if (!paciente) {
        paciente =
          (await PacienteService.getPacienteById(id)) ||
          (await PacienteService.getPacienteByUserId(id));
      }
      if (!paciente) {
        throw new Error('Paciente não encontrado.');
      }

      await handleVisualizarPaciente(paciente);
    },
    [handleVisualizarPaciente, pacientesVisiveis]
  );

  /** Calendário (mobile): vai para Pacientes e abre o PatientDetailsMobileModal. */
  const irParaDetalhePacienteNaListaMobile = (paciente: PacienteCompleto) => {
    const item = pacientesVisiveis.find(
      (p) =>
        p.pacienteId === paciente.id ||
        p.paciente?.id === paciente.id ||
        (!!paciente.userId &&
          (p.pacienteId === paciente.userId || p.paciente?.userId === paciente.userId))
    );
    if (!item) {
      void handleVisualizarPaciente(paciente, 1, true);
      return;
    }
    const nome = (
      item.paciente.dadosIdentificacao?.nomeCompleto ||
      item.paciente.nome ||
      paciente.dadosIdentificacao?.nomeCompleto ||
      paciente.nome ||
      ''
    ).trim();
    setBuscaPaciente(nome);
    setFiltroMedicoPacientes('');
    setPacienteCardExpandido(item.pacienteId);
    setShowVisualizarPacienteModal(false);
    setPacienteVisualizando(null);
    setPacienteVisualizandoInline(null);
    setActiveMenu('pacientes');
    setTabletNavOpen(false);
  };

  const irParaDetalhePacienteNaListaMobileById = async (pacienteId: string) => {
    const id = pacienteId.trim();
    if (!id) throw new Error('Consulta sem paciente vinculado.');
    const item = pacientesVisiveis.find(
      (p) => p.pacienteId === id || p.paciente?.id === id || p.paciente?.userId === id
    );
    const paciente =
      item?.paciente ??
      (await PacienteService.getPacienteById(id)) ??
      (await PacienteService.getPacienteByUserId(id));
    if (!paciente) throw new Error('Paciente não encontrado.');
    irParaDetalhePacienteNaListaMobile(paciente);
  };

  const fecharVisualizarPacienteModal = useCallback(() => {
    setShowVisualizarPacienteModal(false);
    setPacienteVisualizando(null);
    setPacienteVisualizandoInline(null);
    setPastaAtiva(1);
    setModalVisualizacaoEstiloPersonal(false);
    setTabletPastasOpen(false);
  }, []);

  const abrirPacienteAnexoComunicacao = useCallback(
    async (anexo: OrganizacaoMensagemPacienteAnexo) => {
      const pacienteId = String(anexo.pacienteId || '').trim();
      if (!pacienteId) {
        alert('Paciente anexado inválido.');
        return;
      }
      setShowMensagensComunicacaoModal(false);
      try {
        const p = await PacienteService.getPacienteById(pacienteId);
        if (!p) {
          alert('Paciente não encontrado.');
          return;
        }
        await handleVisualizarPaciente(p, 1, true);
      } catch (e) {
        console.error(e);
        alert('Erro ao abrir paciente anexado.');
      }
    },
    [handleVisualizarPaciente]
  );

  /** Navega no menu principal e fecha o painel do paciente, se estiver aberto. */
  const navegarMenuPrincipal = useCallback(
    (menu: MenuNutri) => {
      fecharVisualizarPacienteModal();
      setActiveMenu(menu);
      setTabletNavOpen(false);
    },
    [fecharVisualizarPacienteModal]
  );

  // Inicializar/resetar data de exame quando paciente muda ou data selecionada não é válida
  useEffect(() => {
    if (!showVisualizarPacienteModal || !pacienteVisualizando || pastaAtiva !== 4) return;
    const safeDate = (d: any) => {
      if (!d) return '';
      try {
        const x = d instanceof Date ? d : d?.toDate ? (d as any).toDate() : new Date(d);
        return isNaN(x.getTime()) ? '' : x.toISOString().split('T')[0];
      } catch { return ''; }
    };
    const exames = pacienteVisualizando.examesLaboratoriais || [];
    const datasDisponiveis = exames.map(e => safeDate(e.dataColeta)).filter(Boolean);
    const dataValida = datasDisponiveis.includes(exameDataSelecionadaNoModal);
    if (!dataValida && exames.length > 0) {
      const ordenados = [...exames].sort((a, b) => (safeDate(b.dataColeta) || '').localeCompare(safeDate(a.dataColeta) || ''));
      setExameDataSelecionadaNoModal(safeDate(ordenados[0]?.dataColeta) || '');
    } else if (exames.length === 0) {
      setExameDataSelecionadaNoModal('');
    }
  }, [showVisualizarPacienteModal, pacienteVisualizando?.id, pastaAtiva, exameDataSelecionadaNoModal]);

  // Sincronizar pagamento quando usuário abre aba 9 no modal
  useEffect(() => {
    if (showVisualizarPacienteModal && pacienteVisualizando && pastaAtiva === 10) {
      setPacientePagamentoSelecionado(pacienteVisualizando);
      const pag = pagamentosPacientes[pacienteVisualizando.id];
      if (pag) setDadosPagamento(pag);
      else setDadosPagamento({ pacienteId: pacienteVisualizando.id, statusPagamento: 'em_aberto', formaPagamento: null, valorTotal: 0, valorPago: 0, valorPendente: 0, parcelas: [], dataUltimaAtualizacao: new Date() });
    }
  }, [showVisualizarPacienteModal, pacienteVisualizando?.id, pastaAtiva, pagamentosPacientes]);

  // Handler para cancelar compartilhamento (botão Excluir no mobile)
  const handleCancelarCompartilhamento = async (item: PacienteVisivelNutri) => {
    if (!user || !nutricionista) return;
    
    // Buscar nome do paciente para a mensagem de confirmação
    const nomePaciente = item.paciente.dadosIdentificacao?.nomeCompleto || item.paciente.nome || 'este paciente';
    const nomeMedico = item.medicoNome || 'o médico';
    
    // Confirmação
    const confirmar = confirm(
      `Tem certeza que deseja cancelar o compartilhamento de ${nomePaciente} com ${nomeMedico}?\n\n` +
      `Esta ação irá:\n` +
      `- Encerrar o compartilhamento ativo\n` +
      `- Deletar o histórico na coleção de solicitações\n\n` +
      `Esta ação não pode ser desfeita.`
    );
    
    if (!confirmar) return;
    
    try {
      await SolicitacaoNutricionistaService.endCompartilhamento(
        item.pacienteId,
        user.uid,
        item.medicoId
      );
      
      // Recarregar lista de pacientes
      await loadPacientesList();
      
      // Mostrar mensagem de sucesso (pode ser toast no futuro)
      alert('Compartilhamento cancelado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao cancelar compartilhamento:', error);
      alert(error.message || 'Erro ao cancelar compartilhamento.');
    }
  };

  // Catálogo (Prescrições Salvas): templates + docs sem pacienteId. Histórico carrega à parte.
  const loadPrescricoesModal = useCallback(async (_paciente?: PacienteCompleto) => {
    if (!nutricionista) return;
    try {
      setLoadingPrescricoesModal(true);
      await PrescricaoService.criarPrescricoesPadraoGlobais();
      const [templates, prescricoesNutri] = await Promise.all([
        PrescricaoService.getPrescricoesTemplate(),
        PrescricaoService.getPrescricoesByMedico(nutricionista.userId)
      ]);
      const catalogo = [
        ...templates,
        ...prescricoesNutri.filter((x) => !x.pacienteId),
      ];
      prescricoesBuscaFonteRef.current = montarFonteBuscaPrescricoes(templates, prescricoesNutri);
      setPrescricoesModal((prev) => {
        const temp = prev.find((x) => x.id === 'temp-new');
        return temp ? [temp, ...catalogo.filter((x) => x.id !== 'temp-new')] : catalogo;
      });
    } catch (error) {
      console.error('Erro ao carregar prescrições (modal):', error);
    } finally {
      setLoadingPrescricoesModal(false);
    }
  }, [nutricionista]);

  const abrirPrescricaoDoHistoricoParaEditar = useCallback((p: Prescricao) => {
    setPrescricaoSelecionadaModal(p);
    setPrescricaoEditandoModal(p);
    setNovaPrescricaoModal({
      nome: p.nome,
      descricao: p.descricao || '',
      itens: p.itens || [],
      observacoes: p.observacoes || '',
    });
    if (isMobile) setAbaPrescricoesModal('descricao');
  }, [isMobile]);

  const abrirPrescricaoDoHistoricoComoNova = useCallback((p: Prescricao, paciente: PacienteCompleto) => {
    const temp: Prescricao = {
      ...p,
      id: 'temp-new',
      pacienteId: paciente.id,
      pacienteNome: paciente.dadosIdentificacao?.nomeCompleto || paciente.nome,
      isTemplate: false,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      criadoPor: user?.email || p.criadoPor || '',
    };
    setPrescricoesModal((prev) => [temp, ...prev.filter((x) => x.id !== 'temp-new')]);
    setPrescricaoSelecionadaModal(temp);
    setPrescricaoEditandoModal(null);
    setNovaPrescricaoModal({
      nome: p.nome,
      descricao: p.descricao || '',
      itens: [...(p.itens || [])],
      observacoes: p.observacoes || '',
    });
    if (isMobile) setAbaPrescricoesModal('descricao');
  }, [user?.email, isMobile]);

  const abrirPrescricaoDaBusca = useCallback(
    (p: Prescricao) => {
      const paciente = pacienteVisualizando || pacientePrescricoesSelecionado;
      if (!paciente) return;
      abrirPrescricaoDoHistoricoComoNova(p, paciente);
    },
    [pacienteVisualizando, pacientePrescricoesSelecionado, abrirPrescricaoDoHistoricoComoNova]
  );

  const irParaDescricaoSeMobile = useCallback(() => {
    if (!isMobile) return;
    setAbaPrescricoesModal('descricao');
  }, [isMobile]);

  const aposSalvarPrescricaoPaciente = useCallback(async (paciente: PacienteCompleto) => {
    setPrescricoesModal((prev) => prev.filter((x) => x.id !== 'temp-new'));
    await loadPrescricoesModal(paciente);
    setHistoricoPrescricoesRefreshKey((k) => k + 1);
    setAbaPrescricoesModal('historico');
    setPrescricaoSelecionadaModal(null);
    setPrescricaoEditandoModal(null);
    setNovaPrescricaoModal({ nome: '', descricao: '', itens: [], observacoes: '' });
  }, [loadPrescricoesModal]);

  // Carregar prescrições e sincronizar paciente quando usuário abre aba 5 no modal
  useEffect(() => {
    if (showVisualizarPacienteModal && pacienteVisualizando && pastaAtiva === 7 && nutricionista) {
      setPacientePrescricoesSelecionado(pacienteVisualizando);
      loadPrescricoesModal(pacienteVisualizando);
    }
  }, [showVisualizarPacienteModal, pacienteVisualizando?.id, pastaAtiva, nutricionista, loadPrescricoesModal]);

  // Função para carregar personal trainers elegíveis (verificados e ativos)
  // Nota: PersonalTrainerDoc não tem nutricionistaVinculadoIds, então buscamos todos verificados e ativos
  const loadPersonalTrainersElegiveis = useCallback(async () => {
    if (!nutricionista?.userId) return;
    
    setLoadingPersonalTrainersElegiveis(true);
    try {
      const todosPersonais = await PersonalTrainerService.getAllPersonalTrainers();
      // Filtrar: verificados e ativos (não há campo nutricionistaVinculadoIds)
      const elegiveis = todosPersonais.filter(personal => 
        personal.isVerificado && 
        personal.status === 'ativo'
      );
      setPersonalTrainersElegiveis(elegiveis);
      
      // Para o modal de busca, extrair estados e cidades de TODOS os personal trainers verificados e ativos
      const todosVerificadosAtivos = todosPersonais.filter(personal => 
        personal.isVerificado && personal.status === 'ativo'
      );
      
      const estadosComPersonal = new Set<string>();
      const cidadesComPersonal: { estado: string; cidade: string }[] = [];
      
      todosVerificadosAtivos.forEach(personal => {
        if (personal.cidades && Array.isArray(personal.cidades)) {
          personal.cidades.forEach(cidade => {
            estadosComPersonal.add(cidade.estado);
            if (!cidadesComPersonal.some(c => c.estado === cidade.estado && c.cidade === cidade.cidade)) {
              cidadesComPersonal.push({
                estado: cidade.estado,
                cidade: cidade.cidade
              });
            }
          });
        }
      });
      
      setEstadosComPersonalTrainers(Array.from(estadosComPersonal).sort());
      setCidadesComPersonalTrainers(cidadesComPersonal);
    } catch (error) {
      console.error('Erro ao carregar personal trainers elegíveis:', error);
    } finally {
      setLoadingPersonalTrainersElegiveis(false);
    }
  }, [nutricionista]);

  // Função para buscar personal trainers por estado e cidade
  const buscarPersonalTrainersPorLocalizacao = useCallback(async () => {
    if (!estadoBuscaPersonalModal || !cidadeBuscaPersonalModal || !nutricionista?.userId) return;
    
    setLoadingPersonalTrainersFiltrados(true);
    try {
      const todosPersonais = await PersonalTrainerService.getAllPersonalTrainers();
      const normalizarCidade = (cidade: string): string => {
        return cidade
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ');
      };
      
      const cidadeBuscaNormalizada = normalizarCidade(cidadeBuscaPersonalModal);
      
      const filtrados = todosPersonais.filter(personal => {
        if (!personal.isVerificado || personal.status !== 'ativo') {
          return false;
        }
        
        if (!personal.cidades || !Array.isArray(personal.cidades) || personal.cidades.length === 0) {
          return false;
        }
        
        return personal.cidades.some(c => {
          const cidadeNormalizada = normalizarCidade(c.cidade);
          return c.estado === estadoBuscaPersonalModal && cidadeNormalizada === cidadeBuscaNormalizada;
        });
      });
      
      setPersonalTrainersFiltrados(filtrados);
    } catch (error) {
      console.error('Erro ao buscar personal trainers:', error);
    } finally {
      setLoadingPersonalTrainersFiltrados(false);
    }
  }, [estadoBuscaPersonalModal, cidadeBuscaPersonalModal, nutricionista]);

  // Função para carregar status completo de compartilhamento com Personal Trainer
  // Nota: O sistema atual usa medicoId, então vamos buscar vínculos do paciente e filtrar por médico vinculado ao nutricionista
  const loadStatusCompartilhamentoPersonal = useCallback(async (pacienteId: string) => {
    if (!nutricionista?.userId || !pacienteId) return;
    
    setLoadingSolicitacoesCompartilhamentoPersonal(true);
    try {
      // Buscar vínculos ativos do paciente (sistema atual usa medicoId)
      const { COL_PACIENTE_PERSONAL_TRAINER } = await import('@/features/metaPersonal/metaPersonal.constants');
      const { db } = await import('@/lib/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const q = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('pacienteId', '==', pacienteId),
        where('status', '==', 'ativo')
      );
      
      const querySnapshot = await getDocs(q);
      const vinculos = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId, // Sistema atual usa medicoId
          dataCompartilhamento: data.dataCompartilhamento?.toDate() || new Date(),
          status: data.status || 'ativo',
        };
      });
      
      // Filtrar vínculos onde o médico está vinculado ao nutricionista
      // Ou mostrar todos os vínculos do paciente (já que o paciente pode ter sido compartilhado por diferentes médicos)
      const vinculosFiltrados = vinculos.filter(v => {
        // Se o nutricionista tem médicos vinculados, verificar se o médico do vínculo está na lista
        if (nutricionista.medicoVinculadoIds && nutricionista.medicoVinculadoIds.length > 0) {
          return nutricionista.medicoVinculadoIds.includes(v.medicoId);
        }
        // Se não tem médicos vinculados, não mostrar vínculos (ou mostrar todos - decidir conforme regra de negócio)
        return false;
      });
      
      setVinculosAtivosPacientePersonal(vinculosFiltrados);
      
      // Buscar solicitações pendentes (sistema atual usa medicoId)
      const solicitacoes = await SolicitacaoPersonalTrainerService.getShareRequestsByPaciente(pacienteId);
      // Filtrar solicitações onde o médico está vinculado ao nutricionista
      const solicitacoesFiltradas = solicitacoes.filter(s => {
        if (nutricionista.medicoVinculadoIds && nutricionista.medicoVinculadoIds.length > 0) {
          return nutricionista.medicoVinculadoIds.includes(s.medicoId);
        }
        return false;
      });
      setSolicitacoesCompartilhamentoPacientePersonal(solicitacoesFiltradas);
    } catch (error) {
      console.error('Erro ao carregar status de compartilhamento personal:', error);
    } finally {
      setLoadingSolicitacoesCompartilhamentoPersonal(false);
    }
  }, [nutricionista]);

  // Carregar "tem treinos" por paciente (ícone Personal rosa só quando há ao menos 1 treino)
  // trainingSessions usa patientId = Firebase UID; pacientes_completos.userId pode ser "uid_timestamp"
  useEffect(() => {
    if (activeMenu !== 'pacientes' || pacientesVisiveis.length === 0) return;
    let cancelled = false;
    (async () => {
      const ids = new Set<string>();
      const BATCH = 10;
      const opts = { startDate: '2020-01-01' as const, endDate: '2030-12-31' as const };
      for (let i = 0; i < pacientesVisiveis.length; i += BATCH) {
        if (cancelled) return;
        const batch = pacientesVisiveis.map(item => item.paciente).slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async (p) => {
            let has = false;
            const toTry: string[] = [];
            if (p.userId) toTry.push(p.userId);
            const prefix = /^(.+)_\d+$/.exec(p.userId || '')?.[1];
            if (prefix) toTry.push(prefix);
            if (p.id) toTry.push(p.id);
            for (const id of toTry) {
              if (has) break;
              try {
                const s = await trainingSessionService.getPatientSessions(id, opts);
                has = s.length > 0;
              } catch { /* ignore */ }
            }
            return { userId: p.userId, id: p.id, has };
          })
        );
        results.forEach((r, idx) => {
          if (r.has) {
            const p = batch[idx];
            if (p.userId) ids.add(p.userId);
            if (p.id) ids.add(p.id);
          }
        });
      }
      if (!cancelled) setPacientesComTreinos(ids);
    })();
    return () => { cancelled = true; };
  }, [activeMenu, pacientesVisiveis]);

  // Carregar pacientes em comum com um médico específico
  const loadPacientesComum = useCallback(async (medicoId: string, pacienteIds: string[]) => {
    if (pacienteIds.length === 0) {
      setPacientesPorMedico(prev => {
        const newMap = new Map(prev);
        newMap.set(medicoId, []);
        return newMap;
      });
      return;
    }

    // Verificar cache usando forma funcional do setter
    let shouldLoad = true;
    setPacientesPorMedico(prev => {
      if (prev.has(medicoId)) {
        shouldLoad = false;
      }
      return prev; // Não altera o estado, só verifica
    });

    if (!shouldLoad) {
      console.log('✅ Cache encontrado, não precisa carregar');
      return;
    }

    console.log('📥 Iniciando carregamento de pacientes...');
    console.log('📋 IDs recebidos:', pacienteIds);
    setLoadingPacientesPorMedico(prev => new Set(prev).add(medicoId));
    try {
      // Buscar pacientes em lote
      const pacientesData = await Promise.all(
        pacienteIds.map(id => PacienteService.getPacienteById(id))
      );
      console.log('📦 Dados brutos retornados:', pacientesData.length, pacientesData.map(p => p ? { id: p.id, nome: p.nome || p.dadosIdentificacao?.nomeCompleto } : null));

      // Usar cache de vínculos (já carregados em loadMedicosVinculados)
      const vinculosMap = new Map<string, Date>();
      vinculosCache.forEach(v => {
        if (v.medicoId === medicoId) {
          vinculosMap.set(v.pacienteId, v.dataCompartilhamento);
        }
      });
      console.log('🔗 Vínculos mapeados:', Array.from(vinculosMap.entries()));

      // Se cache vazio, buscar vínculos (fallback)
      if (vinculosCache.length === 0 && user) {
        console.log('⚠️ Cache de vínculos vazio, buscando novamente...');
        const vinculos = await PacienteNutricionistaService.listActiveVinculosByNutri(user.uid);
        vinculos.forEach(v => {
          if (v.medicoId === medicoId) {
            vinculosMap.set(v.pacienteId, v.dataCompartilhamento);
          }
        });
        console.log('🔗 Vínculos após busca:', Array.from(vinculosMap.entries()));
      }

      const pacientesFiltrados = pacientesData.filter((p): p is PacienteCompleto => p !== null);
      console.log('✅ Pacientes após filtro:', pacientesFiltrados.length, pacientesFiltrados.map(p => ({ id: p.id, nome: p.nome || p.dadosIdentificacao?.nomeCompleto })));

      const pacientesComumData = pacientesFiltrados
        .map(paciente => ({
          paciente,
          dataCompartilhamento: vinculosMap.get(paciente.id) || new Date(),
        }))
        .sort((a, b) => b.dataCompartilhamento.getTime() - a.dataCompartilhamento.getTime());

      console.log('✅ Pacientes finais processados:', pacientesComumData.length, pacientesComumData.map(p => ({ id: p.paciente.id, nome: p.paciente.nome || p.paciente.dadosIdentificacao?.nomeCompleto })));

      setPacientesPorMedico(prev => {
        const newMap = new Map(prev);
        newMap.set(medicoId, pacientesComumData);
        console.log('💾 Estado atualizado, total médicos no cache:', newMap.size);
        return newMap;
      });
    } catch (error) {
      console.error('Erro ao carregar pacientes em comum:', error);
      setPacientesPorMedico(prev => {
        const newMap = new Map(prev);
        newMap.set(medicoId, []);
        return newMap;
      });
    } finally {
      setLoadingPacientesPorMedico(prev => {
        const newSet = new Set(prev);
        newSet.delete(medicoId);
        return newSet;
      });
    }
  }, [vinculosCache, user]);

  // Handler para expandir/contrair pacientes de um médico
  const handleToggleMedicoExpandido = async (medico: typeof medicosList[0]) => {
    if (medicoExpandidoId === medico.medicoId) {
      // Contrair
      setMedicoExpandidoId(null);
    } else {
      // Expandir
      console.log('🔍 Expandindo médico:', medico.medicoId);
      console.log('📋 IDs de pacientes:', medico.pacienteIds);
      console.log('📦 Count pacientes:', medico.countPacientes);
      console.log('💾 Cache de vínculos:', vinculosCache.length, vinculosCache);
      setMedicoExpandidoId(medico.medicoId);
      await loadPacientesComum(medico.medicoId, medico.pacienteIds);
    }
  };

  useEffect(() => {
    if (activeMenu !== 'medicos' || abaAtivaMedicos !== 'vinculados') return;
    if (medicosList.length === 0) return;
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) return;
    for (const medico of medicosList) {
      void loadPacientesComum(medico.medicoId, medico.pacienteIds);
    }
  }, [activeMenu, abaAtivaMedicos, medicosList, loadPacientesComum]);

  // Encerrar compartilhamento de paciente com médico
  const handleEncerrarCompartilhamento = useCallback(async (pacienteId: string, medicoId: string) => {
    if (!user || !nutricionista) return;
    
    // Buscar nome do paciente para a mensagem de confirmação
    const pacientesList = pacientesPorMedico.get(medicoId) || [];
    const pacienteItem = pacientesList.find(p => p.paciente.id === pacienteId);
    const nomePaciente = pacienteItem?.paciente.dadosIdentificacao?.nomeCompleto || pacienteItem?.paciente.nome || 'este paciente';
    
    // Buscar nome do médico
    const medicoEncontrado = medicosList.find(m => m.medicoId === medicoId);
    const nomeMedico = medicoEncontrado?.nome || 'o médico';
    
    // Confirmação
    const confirmar = confirm(
      `Tem certeza que deseja cancelar o compartilhamento de ${nomePaciente} com ${nomeMedico}?\n\n` +
      `Esta ação irá:\n` +
      `- Encerrar o compartilhamento ativo\n` +
      `- Deletar o histórico na coleção de solicitações\n\n` +
      `Esta ação não pode ser desfeita.`
    );
    
    if (!confirmar) return;
    
    setLoading(true);
    try {
      await SolicitacaoNutricionistaService.endCompartilhamento(
        pacienteId,
        user.uid,
        medicoId
      );
      alert('Compartilhamento encerrado com sucesso!');
      
      // Remover paciente da lista
      setPacientesPorMedico(prev => {
        const newMap = new Map(prev);
        const pacientesList = newMap.get(medicoId) || [];
        const updatedList = pacientesList.filter(p => p.paciente.id !== pacienteId);
        newMap.set(medicoId, updatedList);
        return newMap;
      });
      
      // Atualizar contagem de pacientes do médico
      setMedicosList(prev => prev.map(m => 
        m.medicoId === medicoId 
          ? { ...m, countPacientes: Math.max(0, m.countPacientes - 1), pacienteIds: m.pacienteIds.filter(id => id !== pacienteId) }
          : m
      ));
      
      // Recarregar médicos vinculados para atualizar contagens
      if (nutricionista.isVerificado && nutricionista.medicoVinculadoIds && nutricionista.medicoVinculadoIds.length > 0) {
        const [vinculos, medicosData] = await Promise.all([
          PacienteNutricionistaService.listActiveVinculosByNutri(user.uid),
          Promise.all(
            nutricionista.medicoVinculadoIds.map(id => MedicoService.getMedicoById(id))
          )
        ]);
        const medicoPacientesMap = new Map<string, string[]>();
        vinculos.forEach(vinculo => {
          if (!medicoPacientesMap.has(vinculo.medicoId)) {
            medicoPacientesMap.set(vinculo.medicoId, []);
          }
          medicoPacientesMap.get(vinculo.medicoId)!.push(vinculo.pacienteId);
        });
        const medicosListData = medicosData
          .filter((medico): medico is Medico => medico !== null)
          .filter(medico => 
            medico.isVerificado && 
            medico.status === 'ativo'
          )
          .map(medico => ({
            medicoId: medico.id,
            nome: medico.nome,
            email: medico.email,
            telefone: medico.telefone,
            genero: medico.genero,
            crm: medico.crm,
            cidades: medico.cidades,
            countPacientes: medicoPacientesMap.get(medico.id)?.length || 0,
            pacienteIds: medicoPacientesMap.get(medico.id) || [],
          }));
        setMedicosList(medicosListData);
      }
    } catch (error: any) {
      console.error('Erro ao encerrar compartilhamento:', error);
      alert(error.message || 'Erro ao encerrar compartilhamento.');
    } finally {
      setLoading(false);
    }
  }, [user, nutricionista, pacientesPorMedico, medicosList]);

  // Handler para navegar para página Pacientes e selecionar paciente
  const handleVerPacienteNaPaginaPacientes = async (paciente: PacienteCompleto) => {
    // Verificar acesso antes de navegar
    if (!user) return;
    
    try {
      const hasAccess = await PacienteNutricionistaService.hasAccessToPaciente(
        user.uid,
        paciente.id
      );
      
      if (!hasAccess) {
        setSaveMessage({ type: 'error', text: 'Acesso negado a este paciente.' });
        return;
      }
      
      // Navegar para a página Pacientes com o paciente selecionado
      router.push(`/metanutri?pacienteId=${paciente.id}`);
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao abrir paciente.' });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Handlers
  const handleAddCidade = () => {
    if (!estadoSelecionado || !cidadeSelecionada) return;
    const existe = cidadesSelecionadas.some(
      c => c.estado === estadoSelecionado && c.cidade === cidadeSelecionada
    );
    if (existe) {
      setSaveMessage({ type: 'error', text: 'Esta cidade já foi adicionada.' });
      return;
    }
    setCidadesSelecionadas([
      ...cidadesSelecionadas,
      { estado: estadoSelecionado, cidade: cidadeSelecionada }
    ]);
    setEstadoSelecionado('');
    setCidadeSelecionada('');
  };

  const handleRemoveCidade = (index: number) => {
    setCidadesSelecionadas(cidadesSelecionadas.filter((_, i) => i !== index));
  };

  // Validação para permitir salvar perfil: registro (apenas números), pelo menos 1 cidade, telefone
  const registroSoNumeros = registroNumero.replace(/\D/g, '');
  const phoneWritePerfil = professionalPhoneWriteFields({
    telefone: telefoneContato,
    telefoneDdi: telefoneDdiContato,
    telefonePais: telefonePaisContato,
  });
  const canSavePerfil = registroSoNumeros.length > 0 &&
    cidadesSelecionadas.length >= 1 &&
    isValidIdentificacaoPhone({
      telefone: telefoneContato,
      telefoneDdi: telefoneDdiContato,
      telefonePais: telefonePaisContato,
    });

  const handleSavePerfil = async () => {
    if (!user || !nutricionista) return;
    if (!registroSoNumeros) {
      setSaveMessage({ type: 'error', text: 'Preencha o número do registro (apenas números).' });
      return;
    }
    if (cidadesSelecionadas.length < 1) {
      setSaveMessage({ type: 'error', text: 'Adicione pelo menos uma cidade atendida.' });
      return;
    }
    if (!isValidIdentificacaoPhone({
      telefone: telefoneContato,
      telefoneDdi: telefoneDdiContato,
      telefonePais: telefonePaisContato,
    })) {
      setSaveMessage({ type: 'error', text: 'Preencha o telefone para contato.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await NutricionistaService.updatePerfil(
        user.uid,
        registroSoNumeros,
        phoneWritePerfil.telefone,
        cidadesSelecionadas,
        {
          genero: perfilGenero,
          instagramUsuario: perfilInstagram.trim(),
          cep: perfilCep,
          nomeLocal: perfilNomeLocal.trim(),
          endereco: perfilEndereco.trim(),
          numero: perfilNumero.trim(),
          pontoReferencia: perfilPontoRef.trim(),
          googleMapsUrl: perfilGoogleMaps.trim(),
          fotoPerfilUrl: perfilFotoUrl?.trim() ? perfilFotoUrl.trim() : null,
          ...(phoneWritePerfil.telefoneDdi
            ? { telefoneDdi: phoneWritePerfil.telefoneDdi, telefonePais: phoneWritePerfil.telefonePais }
            : {}),
        }
      );
      setNutricionista({
        ...nutricionista,
        registroNumero: registroSoNumeros,
        telefone: phoneWritePerfil.telefone,
        ...(phoneWritePerfil.telefoneDdi
          ? { telefoneDdi: phoneWritePerfil.telefoneDdi, telefonePais: phoneWritePerfil.telefonePais }
          : {}),
        cidades: cidadesSelecionadas,
        genero: perfilGenero,
        instagramUsuario: perfilInstagram.trim(),
        cep: perfilCep,
        nomeLocal: perfilNomeLocal.trim(),
        endereco: perfilEndereco.trim(),
        numero: perfilNumero.trim(),
        pontoReferencia: perfilPontoRef.trim(),
        googleMapsUrl: perfilGoogleMaps.trim(),
        fotoPerfilUrl: perfilFotoUrl?.trim() ? perfilFotoUrl.trim() : null,
      });
      setSaveMessage({ type: 'success', text: 'Perfil salvo com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao salvar perfil. Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  const buscarEnderecoPorCepNutri = async (cep: string) => {
    if (cep.length !== 8) return;
    setBuscandoCepPerfil(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const rua = [data.logradouro, data.bairro, `${data.localidade}/${data.uf}`].filter(Boolean).join(', ');
        setPerfilEndereco(rua);
      }
    } catch {
      // silencioso
    } finally {
      setBuscandoCepPerfil(false);
    }
  };

  // Filtrar cidades do estado selecionado para mostrar apenas onde há médicos
  const cidadesDoEstado = estadoSelecionado
    ? cidadesComMedicos
        .filter(c => c.estado === estadoSelecionado)
        .map(c => c.cidade)
        .sort()
    : [];

  // Função renderContent - ETAPA A2 (Home implementada)
  const renderContent = () => {
    const compartilhadosCrm: PacienteCompartilhadoCrmItem[] = pacientesVisiveis.map((item) => ({
      vinculoId: item.vinculoId,
      pacienteId: item.pacienteId,
      paciente: item.paciente,
      medicoId: item.medicoId,
      medicoNome: item.medicoNome,
      dataCompartilhamento: item.dataCompartilhamento,
    }));
    const renderLeadsPipeline = () => (
      <MetanutriHomeLeadsPipeline
        nutricionistaId={user?.uid}
        userEmail={user?.email}
        compartilhados={compartilhadosCrm}
        lembretes={lembretes}
        onOpenAbaNutri={(pacienteId) => {
          const item = pacientesVisiveis.find(
            (p) => p.pacienteId === pacienteId || p.paciente?.id === pacienteId
          );
          const paciente = item?.paciente;
          if (!paciente) return;
          setActiveMenu('pacientes');
          if (isMobile) {
            setPacienteNutriSelecionado(paciente);
            setShowModalNutri(true);
          } else {
            handleVisualizarPaciente(paciente, 8);
          }
        }}
        onCreateReminder={(pacienteId, pacienteNome) => {
          const now = new Date();
          const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          setPipelineLembreteDraft({
            pacienteId,
            pacienteNome,
            data: ymd,
          });
          setShowPipelineLembreteModal(true);
        }}
      />
    );

    switch (activeMenu) {
      case 'comunicacao': {
        if (!user || !nutricionista) {
          return (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Carregando perfil…
            </div>
          );
        }
        return (
          <div className="hidden min-w-0 w-full md:block">
            <OrganizacaoComunicacaoGmailPanel
              organizationId={METODO_ORGANIZATION_ID}
              currentUser={{
                userId: user.uid,
                role: 'nutricionista',
                profileId: nutricionista.id || user.uid,
                nome: nutricionista.nome || user.displayName || 'Nutricionista',
                email: user.email || nutricionista.email || '',
                fotoUrl: nutricionista.fotoPerfilUrl || perfilFotoUrl || null,
                subtitle: nutricionista.registroNumero
                  ? `CRN ${nutricionista.registroNumero}`
                  : null,
              }}
              loadDestinatarios={() =>
                loadDestinatariosMetanutri({
                  nutricionistaUserId: user.uid,
                  nutricionistaProfileId: nutricionista.id || user.uid,
                  pacientes: pacientesVisiveis.map((p) => p.paciente),
                  pacientesPorMedicoId: Object.fromEntries(
                    pacientesVisiveis
                      .filter((p) => p.paciente?.id && p.medicoId)
                      .map((p) => [p.paciente.id, p.medicoId])
                  ),
                  medicosVinculados: medicosList,
                  medicoVinculadoIds: nutricionista.medicoVinculadoIds || [],
                  organizationId: nutricionista.organizationId || METODO_ORGANIZATION_ID,
                })
              }
              assinaturaDefaults={{
                role: 'nutricionista',
                displayName: nutricionista.nome || user.displayName || 'Nutricionista',
                registro: nutricionista.registroNumero
                  ? `CRN ${nutricionista.registroNumero}`
                  : null,
                telefone: nutricionista.telefone || null,
                email: nutricionista.email || user.email || null,
                logoUrl: resolveAssinaturaLogoUrl({
                  logoMainUrl: organizationShellBranding?.logoMainUrl,
                  shellLogoUrl: sidebarOrganizationLogoSrc,
                }),
              }}
              onNotify={(msg) => alert(msg)}
              onAbrirPacienteAnexo={(anexo) => void abrirPacienteAnexoComunicacao(anexo)}
            />
          </div>
        );
      }
      case 'home': {
        const pacientes = pacientesVisiveis.map((p) => p.paciente);
        const pagamentosLista = Object.values(pagamentosPacientes || {});
        return (
          <ProfissionalDashboardHome
            pacientesOwn={pacientes}
            todosPacientesOftware={todosPacientesOftware}
            loadingTodosPacientes={loadingTodosPacientes}
            filtroBase={filtroBaseDashboard}
            onFiltroBaseChange={setFiltroBaseDashboard}
            organizationName={organizationShellBranding?.publicName?.trim() || 'Oftware'}
            navyColor={shellChrome.secondaryColor}
            chrome={shellChrome}
            filtroDose={filtroDosePerdaPeso}
            filtroFaixaEtaria={filtroFaixaEtariaPerdaPeso}
            filtroSexo={filtroSexoPerdaPeso}
            onDoseChange={setFiltroDosePerdaPeso}
            onFaixaChange={setFiltroFaixaEtariaPerdaPeso}
            onSexoChange={setFiltroSexoPerdaPeso}
            onOpenPaciente={(pacienteId) => {
              const item = pacientesVisiveis.find(
                (p) => p.paciente.id === pacienteId || p.paciente.userId === pacienteId
              );
              if (item) void handleVisualizarPaciente(item.paciente);
            }}
            medicosVinculados={medicosVinculados}
            financial={{
              recebido: pagamentosLista.reduce((sum, p) => sum + (p.valorPago || 0), 0),
              emAberto: pagamentosLista.reduce((sum, p) => sum + (p.valorPendente || 0), 0),
              previsto: pagamentosLista.reduce((sum, p) => sum + (p.valorTotal || 0), 0),
            }}
            afterStatusKpis={
              <NutritionPortfolioOverview
                nutritionistId={nutricionista?.userId || nutricionista?.id || user?.uid || ''}
                nutritionistName={nutricionista?.nome || user?.displayName || undefined}
                patients={pacientesVisiveis}
                loadingPatients={loadingPacientesList}
                onOpenCalendar={() => navegarMenuPrincipal('calendario')}
              />
            }
          />
        );
      }

      case 'leads':
        return (
          <div className="space-y-6">
            <MetanutriLeadsAgendaHub leadsContent={renderLeadsPipeline()} />
          </div>
        );

      case 'medicos':
        // Debug: verificar estados disponíveis
        console.log('🔍 Render médicos - estadosComMedicosBusca:', estadosComMedicosBusca);
        console.log('🔍 Render médicos - cidadesComMedicosBusca:', cidadesComMedicosBusca.length);
        
        const medicosDisponiveisFiltrados = medicosDisponiveis;

        // Obter cidades do estado selecionado para o dropdown (apenas cidades que têm médicos disponíveis)
        const cidadesDoEstadoSelecionado = estadoBuscaMedico
          ? cidadesComMedicosBusca
              .filter(c => c.estado === estadoBuscaMedico)
              .map(c => c.cidade)
              .sort()
          : [];

        // Filtrar médicos vinculados por estado e cidade (aba Vinculados)
        const medicosFiltrados = medicosList.filter(m => {
          const matchEstado = !estadoBuscaMedico || (m.cidades && Array.isArray(m.cidades) && m.cidades.some(c => c.estado === estadoBuscaMedico));
          const matchCidade = !cidadeBuscaMedico || (m.cidades && Array.isArray(m.cidades) && m.cidades.some(c => 
            c.estado === estadoBuscaMedico && c.cidade.toLowerCase() === cidadeBuscaMedico.toLowerCase()
          ));
          return matchEstado && matchCidade;
        });

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Médicos</h1>
              
              {/* Abas */}
              <div className="border-b border-gray-200 mb-6 overflow-x-auto">
                <nav className="flex min-w-max space-x-4" aria-label="Tabs">
                  <button
                    onClick={() => setAbaAtivaMedicos('vinculados')}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'vinculados'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Médicos Vinculados
                  </button>
                  <button
                    onClick={() => setAbaAtivaMedicos('solicitacoes')}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'solicitacoes'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Solicitações
                    {solicitacoesVinculo.filter(s => s.status === 'pendente').length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        {solicitacoesVinculo.filter(s => s.status === 'pendente').length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAbaAtivaMedicos('buscar')}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'buscar'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Buscar Médicos
                  </button>
                </nav>
              </div>

              {/* Conteúdo das Abas */}
              {!nutricionista.isVerificado ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                  <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Aguardando verificação</h3>
                  <p className="text-yellow-700">Você precisa ser verificado pelo administrador para acessar esta seção.</p>
                </div>
              ) : (
                <>
                  {/* ABA: Buscar Médicos */}
                  {abaAtivaMedicos === 'buscar' && (
                    <div className="space-y-6">
                      {/* Busca e Filtros */}
              <div className="mb-6 space-y-4">
                {/* Estado e Cidade lado a lado (Estado é só sigla) */}
                <div className="grid grid-cols-[120px_1fr] gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <select
                      value={estadoBuscaMedico}
                      onChange={(e) => {
                        setEstadoBuscaMedico(e.target.value);
                        setCidadeBuscaMedico('');
                      }}
                      disabled={loadingEstadosCidadesMedicos}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Estado</option>
                      {loadingEstadosCidadesMedicos ? (
                        <option value="">Carregando...</option>
                      ) : (
                        estadosComMedicosBusca.map((estado) => {
                          const estadoInfo = estadosList.find(e => e.sigla === estado);
                          return (
                            <option key={estado} value={estado}>
                              {estadoInfo?.sigla || estado}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                    <select
                      value={cidadeBuscaMedico}
                      onChange={(e) => setCidadeBuscaMedico(e.target.value)}
                      disabled={!estadoBuscaMedico}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesDoEstadoSelecionado.map((cidade) => (
                        <option key={cidade} value={cidade}>
                          {cidade}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botão Buscar */}
                <div>
                  <button
                    onClick={() => loadMedicosDisponiveis(estadoBuscaMedico, cidadeBuscaMedico)}
                    disabled={!estadoBuscaMedico || !cidadeBuscaMedico || loadingMedicosDisponiveis}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Search size={18} />
                    Buscar
                  </button>
                </div>
              </div>

              {/* Loading */}
                      {loadingMedicosDisponiveis ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                          <p className="mt-4 text-gray-600">Carregando médicos disponíveis...</p>
                        </div>
                      ) : medicosDisponiveisFiltrados.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum médico encontrado</h3>
                          <p className="text-gray-600">Nenhum médico disponível corresponde à sua busca.</p>
                </div>
              ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {medicosDisponiveisFiltrados.map((medico) => {
                            const jaVinculado = nutricionista?.medicoVinculadoIds?.includes(medico.id);
                            const jaSolicitado = solicitacoesVinculo.some(s => 
                              s.medicoId === medico.id && 
                              (s.status === SOLICITACAO_STATUS.PENDENTE || s.status === SOLICITACAO_STATUS.ACEITA)
                            );
                            
                            // Primeira cidade para exibição compacta
                            const primeiraCidade = medico.cidades && medico.cidades.length > 0 
                              ? `${medico.cidades[0].cidade}, ${medico.cidades[0].estado}`
                              : null;
                            const outrasCidades = medico.cidades && medico.cidades.length > 1 
                              ? medico.cidades.length - 1 
                              : 0;
                            
                            const isExpanded = medicoDisponivelExpandidoId === medico.id;
                            
                            return (
                              <div key={medico.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                {/* Header - Mobile: nome + botão ao lado | Desktop: layout completo */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                      <Stethoscope className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                                        {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                                      </h3>
                                      {medico.crm && (
                                        <p className="text-xs text-gray-500">
                                          CRM {medico.crm.estado} {medico.crm.numero}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Botão de ação e detalhes - Mobile: ao lado do nome */}
                                  <div className="flex items-center gap-1.5 flex-shrink-0 lg:hidden">
                                    {jaVinculado ? (
                                      <span className="px-2 py-1 text-[10px] font-medium bg-green-600 text-white rounded-full whitespace-nowrap">
                                        Vinculado
                                      </span>
                                    ) : jaSolicitado ? (
                                      <span className="px-2 py-1 text-[10px] font-medium bg-yellow-100 text-yellow-700 rounded-full whitespace-nowrap">
                                        Pendente
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleSolicitarVinculo(medico.id)}
                                        disabled={loading}
                                        className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-medium flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                                      >
                                        <UserPlus size={11} />
                                        Solicitar
                                      </button>
                                    )}
                                    {/* Botão de detalhes - Mobile (sempre visível se tiver info) */}
                                    {(primeiraCidade || medico.email || medico.telefone) && (
                                      <button
                                        onClick={() => setMedicoDisponivelExpandidoId(isExpanded ? null : medico.id)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                                        title={isExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                                      >
                                        <ChevronDown
                                          size={16}
                                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Botão de detalhes - Desktop (sempre visível se tiver info) */}
                                  {(primeiraCidade || medico.email || medico.telefone) && (
                                    <button
                                      onClick={() => setMedicoDisponivelExpandidoId(isExpanded ? null : medico.id)}
                                      className="hidden lg:flex p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                                      title={isExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                                    >
                                      <ChevronDown
                                        size={18}
                                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                      />
                                    </button>
                                  )}
                                </div>
                                
                                {/* Informações detalhadas - Mobile: só aparece quando expandido | Desktop: sempre visível */}
                                {(primeiraCidade || medico.email || medico.telefone) && (
                                  <>
                                    {/* Versão Mobile - só aparece quando expandido */}
                                    {isExpanded && (
                                      <div className="lg:hidden space-y-1.5 mb-3 pt-2 border-t border-gray-100">
                                        {/* Todas as Cidades */}
                                        {medico.cidades && medico.cidades.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-700 mb-1.5">Cidades de Atendimento:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {medico.cidades.map((cidade, idx) => (
                                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                  {cidade.cidade}, {cidade.estado}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Email */}
                                        {medico.email && (
                                          <div className="flex items-center gap-1.5 text-xs text-gray-600 pt-1">
                                            <MessageSquare size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="truncate">{medico.email}</span>
                                          </div>
                                        )}
                                        
                                        {/* Telefone/WhatsApp */}
                                        {medico.telefone && (
                                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                            <Phone size={12} className="text-gray-400 flex-shrink-0" />
                                            <a 
                                              href={buildWhatsappUrl(phoneFieldsFromProfessional(medico)) ?? '#'}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-green-600 hover:text-green-700 truncate"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {medico.telefone}
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Versão Desktop - sempre visível */}
                                    <div className="hidden lg:block space-y-1.5 mb-3">
                                      {/* Todas as Cidades */}
                                      {medico.cidades && medico.cidades.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-700 mb-1.5">Cidades de Atendimento:</p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {medico.cidades.map((cidade, idx) => (
                                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {cidade.cidade}, {cidade.estado}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Email */}
                                      {medico.email && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 pt-1">
                                          <MessageSquare size={12} className="text-gray-400 flex-shrink-0" />
                                          <span className="truncate">{medico.email}</span>
                                        </div>
                                      )}
                                      
                                      {/* Telefone/WhatsApp */}
                                      {medico.telefone && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                          <Phone size={12} className="text-gray-400 flex-shrink-0" />
                                          <a 
                                            href={buildWhatsappUrl(phoneFieldsFromProfessional(medico)) ?? '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-600 hover:text-green-700 truncate"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {medico.telefone}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                                
                                {/* Botão de ação - Desktop: sempre visível embaixo */}
                                <div className="hidden lg:block pt-2.5 border-t border-gray-100">
                                  {jaVinculado ? (
                                    <div className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-center text-xs font-medium">
                                      Já Vinculado
                                    </div>
                                  ) : jaSolicitado ? (
                                    <div className="w-full px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-center text-xs font-medium">
                                      Solicitação Enviada
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleSolicitarVinculo(medico.id)}
                                      disabled={loading}
                                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                      <UserPlus size={12} />
                                      Solicitar Vínculo
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ABA: Solicitações */}
                  {abaAtivaMedicos === 'solicitacoes' && (
                    <div className="space-y-6">
                      {/* Solicitações Recebidas */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-yellow-600" />
                            Solicitações Recebidas
                          </h3>

                          {loadingSolicitacoesVinculoRecebidas ? (
                            <div className="text-center py-8">
                              <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                              <p className="mt-2 text-gray-600">Carregando solicitações...</p>
                            </div>
                          ) : solicitacoesVinculoRecebidas.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                              <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <p className="text-gray-600">Nenhuma solicitação de vínculo pendente.</p>
                            </div>
                          ) : (
                            <>
                              {/* Versão Mobile - Cards */}
                              <div className="md:hidden space-y-4">
                                {solicitacoesVinculoRecebidas.map((solicitacao) => {
                                  const statusColors = {
                                    'pendente': 'bg-yellow-100 text-yellow-800',
                                    'aceita': 'bg-green-600 text-white',
                                    'rejeitada': 'bg-red-100 text-red-800',
                                    'cancelada': 'bg-gray-100 text-gray-800'
                                  };
                                  const statusLabels = {
                                    'pendente': 'Pendente',
                                    'aceita': 'Aceita',
                                    'rejeitada': 'Rejeitada',
                                    'cancelada': 'Cancelada'
                                  };
                                  const status = solicitacao.status || 'pendente';
                                  
                                  const isAceita = status === 'aceita';
                                  return (
                                    <div key={solicitacao.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <h3 className="text-base font-semibold text-gray-900">
                                            {solicitacao.medicoNome || 'Médico'}
                                          </h3>
                                          {!isAceita && (solicitacao as any).medicoCrm && (
                                            <p className="text-sm text-gray-500 mb-1">
                                              CRM: {(solicitacao as any).medicoCrm}
                                            </p>
                                          )}
                                          {!isAceita && (
                                            <p className="text-xs text-gray-500 mt-2">
                                              Solicitado em: {solicitacao.criadoEm?.toLocaleDateString('pt-BR') || '-'}
                                            </p>
                                          )}
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.pendente}`}>
                                          {statusLabels[status as keyof typeof statusLabels] || 'Pendente'}
                                        </span>
                                      </div>
                                      <div className={`flex flex-wrap gap-2 ${isAceita ? '' : 'pt-3 border-t border-gray-200'}`}>
                                        {status === 'pendente' && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleAceitarVinculo(solicitacao.id)}
                                              disabled={!!aceitandoVinculoId || loading}
                                              className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                            >
                                              {aceitandoVinculoId === solicitacao.id ? (
                                                <>
                                                  <Loader2 size={14} className="animate-spin" />
                                                  Aceitando
                                                </>
                                              ) : (
                                                <>
                                                  <CheckCircle size={14} />
                                                  Aceitar
                                                </>
                                              )}
                                            </button>
                                            <button
                                              onClick={() => handleRejeitarVinculo(solicitacao.id)}
                                              disabled={loading}
                                              className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                            >
                                              <XCircle size={14} />
                                              Rejeitar
                                            </button>
                                          </>
                                        )}
                                        <button
                                          onClick={() => handleExcluirSolicitacaoVinculo(solicitacao.id, 'recebida')}
                                          disabled={loading}
                                          className="px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                                          title="Excluir solicitação"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Versão Desktop - Tabela */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRM</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {solicitacoesVinculoRecebidas.map((solicitacao) => {
                                      const statusColors = {
                                        'pendente': 'bg-yellow-100 text-yellow-800',
                                        'aceita': 'bg-green-600 text-white',
                                        'rejeitada': 'bg-red-100 text-red-800',
                                        'cancelada': 'bg-gray-100 text-gray-800'
                                      };
                                      const statusLabels = {
                                        'pendente': 'Pendente',
                                        'aceita': 'Aceita',
                                        'rejeitada': 'Rejeitada',
                                        'cancelada': 'Cancelada'
                                      };
                                      const status = solicitacao.status || 'pendente';
                                      
                                      return (
                                        <tr key={solicitacao.id} className="hover:bg-gray-50">
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {solicitacao.medicoNome || 'Médico'}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {status === 'aceita' ? '-' : ((solicitacao as any).medicoCrm || '-')}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {status === 'aceita' ? '-' : (solicitacao.criadoEm?.toLocaleDateString('pt-BR') || '-')}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                              {status === 'pendente' && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleAceitarVinculo(solicitacao.id)}
                                                    disabled={!!aceitandoVinculoId || loading}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                  >
                                                    {aceitandoVinculoId === solicitacao.id ? (
                                                      <>
                                                        <Loader2 size={14} className="animate-spin" />
                                                        Aceitando
                                                      </>
                                                    ) : (
                                                      <>
                                                        <CheckCircle size={14} />
                                                        Aceitar
                                                      </>
                                                    )}
                                                  </button>
                                                  <button
                                                    onClick={() => handleRejeitarVinculo(solicitacao.id)}
                                                    disabled={loading}
                                                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                  >
                                                    <XCircle size={14} />
                                                    Rejeitar
                                                  </button>
                                                </>
                                              )}
                                              {status !== 'pendente' && (
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.pendente}`}>
                                                  {statusLabels[status as keyof typeof statusLabels] || 'Pendente'}
                                                </span>
                                              )}
                                              <button
                                                onClick={() => handleExcluirSolicitacaoVinculo(solicitacao.id, 'recebida')}
                                                disabled={loading}
                                                className="px-2 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                                                title="Excluir solicitação"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Solicitações Enviadas */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Send size={20} className="text-blue-600" />
                            Minhas Solicitações Enviadas
                          </h3>

                          {loadingSolicitacoesVinculo ? (
                            <div className="text-center py-8">
                              <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                              <p className="mt-2 text-gray-600">Carregando solicitações enviadas...</p>
                            </div>
                          ) : solicitacoesVinculo.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                              <Send className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <p className="text-gray-600">Você ainda não enviou nenhuma solicitação de vínculo.</p>
                            </div>
                          ) : (
                            <>
                              {/* Versão Mobile - Cards */}
                              <div className="md:hidden space-y-4">
                                {solicitacoesVinculo.map((solicitacao) => {
                                  const statusColors = {
                                    'pendente': 'bg-yellow-100 text-yellow-800',
                                    'aceita': 'bg-green-600 text-white',
                                    'rejeitada': 'bg-red-100 text-red-800',
                                    'cancelada': 'bg-gray-100 text-gray-800'
                                  };
                                  const statusLabels = {
                                    'pendente': 'Pendente',
                                    'aceita': 'Aceita',
                                    'rejeitada': 'Rejeitada',
                                    'cancelada': 'Cancelada'
                                  };

                                  return (
                                    <div key={solicitacao.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <h3 className="text-base font-semibold text-gray-900 mb-1">
                                            {solicitacao.medicoNome || 'Médico'}
                                          </h3>
                                          <p className="text-xs text-gray-500 mt-2">
                                            Solicitado em: {solicitacao.criadoEm?.toLocaleDateString('pt-BR') || '-'}
                                          </p>
                                          {(solicitacao.aceitoEm || solicitacao.rejeitadoEm || solicitacao.canceladoEm) && (
                                            <p className="text-xs text-gray-500">
                                              Última atualização: {(solicitacao.aceitoEm || solicitacao.rejeitadoEm || solicitacao.canceladoEm)?.toLocaleDateString('pt-BR') || '-'}
                                            </p>
                                          )}
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${solicitacao.status === 'aceita' ? 'bg-green-600 text-white' : (statusColors[solicitacao.status as keyof typeof statusColors] || statusColors.cancelada)}`}>
                                          {statusLabels[solicitacao.status as keyof typeof statusLabels] || 'Desconhecido'}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                                        {solicitacao.status === 'pendente' && (
                                          <button
                                            onClick={() => handleCancelarSolicitacao(solicitacao.id)}
                                            disabled={loading}
                                            className="px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                          >
                                            <X size={14} />
                                            Cancelar
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleExcluirSolicitacaoVinculo(solicitacao.id, 'enviada')}
                                          disabled={loading}
                                          className="px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                                          title="Excluir solicitação"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Versão Desktop - Tabela */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data da Solicitação</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Atualização</th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {solicitacoesVinculo.map((solicitacao) => {
                                      const statusColors = {
                                        'pendente': 'bg-yellow-100 text-yellow-800',
                                        'aceita': 'bg-green-600 text-white',
                                        'rejeitada': 'bg-red-100 text-red-800',
                                        'cancelada': 'bg-gray-100 text-gray-800'
                                      };
                                      const statusLabels = {
                                        'pendente': 'Pendente',
                                        'aceita': 'Aceita',
                                        'rejeitada': 'Rejeitada',
                                        'cancelada': 'Cancelada'
                                      };

                                      return (
                                        <tr key={solicitacao.id} className="hover:bg-gray-50">
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {solicitacao.medicoNome || 'Médico'}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${solicitacao.status === 'aceita' ? 'bg-green-600 text-white' : (statusColors[solicitacao.status as keyof typeof statusColors] || statusColors.cancelada)}`}>
                                              {statusLabels[solicitacao.status as keyof typeof statusLabels] || 'Desconhecido'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {solicitacao.criadoEm?.toLocaleDateString('pt-BR') || '-'}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {(solicitacao.aceitoEm || solicitacao.rejeitadoEm || solicitacao.canceladoEm)?.toLocaleDateString('pt-BR') || '-'}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                              {solicitacao.status === 'pendente' && (
                                                <button
                                                  onClick={() => handleCancelarSolicitacao(solicitacao.id)}
                                                  disabled={loading}
                                                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                >
                                                  <X size={14} />
                                                  Cancelar
                                                </button>
                                              )}
                                              <button
                                                onClick={() => handleExcluirSolicitacaoVinculo(solicitacao.id, 'enviada')}
                                                disabled={loading}
                                                className="px-2 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                                                title="Excluir solicitação"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABA: Médicos Vinculados */}
                  {abaAtivaMedicos === 'vinculados' && (
                    <div className="space-y-6">
                      {/* Busca e Filtros */}
                      <div className="mb-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                            <select
                              value={estadoBuscaMedico}
                              onChange={(e) => {
                                setEstadoBuscaMedico(e.target.value);
                                setCidadeBuscaMedico('');
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="">Todos os estados</option>
                              {estadosComMedicosBusca.map((estado) => {
                                const estadoInfo = estadosList.find(e => e.sigla === estado);
                                return (
                                  <option key={estado} value={estado}>
                                    {estadoInfo?.nome || estado}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                            <select
                              value={cidadeBuscaMedico}
                              onChange={(e) => setCidadeBuscaMedico(e.target.value)}
                              disabled={!estadoBuscaMedico}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Todas as cidades</option>
                              {estadoBuscaMedico && cidadesComMedicosBusca
                                .filter(c => c.estado === estadoBuscaMedico)
                                .map((c) => (
                                  <option key={c.cidade} value={c.cidade}>
                                    {c.cidade}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Loading */}
                      {loadingMedicosList ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                          <p className="mt-4 text-gray-600">Carregando médicos...</p>
                        </div>
                      ) : medicosList.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                          <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum médico vinculado ainda</h3>
                          <p className="text-gray-600">Você ainda não possui vínculos com médicos.</p>
                        </div>
                      ) : medicosFiltrados.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum médico encontrado</h3>
                          <p className="text-gray-600">Nenhum médico corresponde à sua busca.</p>
                        </div>
                      ) : (
                        <>
                      <ProfissionalVinculadosSplitView
                        kind="nutricionista"
                        listKind="medico"
                        professionals={medicosFiltrados.map((medico) => ({
                          id: medico.medicoId,
                          nome: `${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${medico.nome}`,
                          email: medico.email,
                          telefone: medico.telefone,
                          registroNumero: medico.crm
                            ? `${medico.crm.estado} ${medico.crm.numero}`
                            : undefined,
                          fotoPerfilUrl: medico.fotoPerfilUrl,
                          cidades: medico.cidades,
                          instagramUsuario: medico.instagramUsuario ?? undefined,
                          nomeLocal: medico.nomeLocal,
                          endereco: medico.endereco,
                          qtdPacientes: medico.countPacientes,
                        }))}
                        selectedId={medicoExpandidoId}
                        onSelect={(id) => {
                          setMedicoExpandidoId(id);
                          const medico = medicosList.find((m) => m.medicoId === id);
                          if (medico) void loadPacientesComum(medico.medicoId, medico.pacienteIds);
                        }}
                        patients={
                          medicoExpandidoId
                            ? (pacientesPorMedico.get(medicoExpandidoId) || []).map((item) => ({
                                ...item,
                                status: 'ativo',
                              }))
                            : []
                        }
                        loadingPatients={Boolean(
                          medicoExpandidoId && loadingPacientesPorMedico.has(medicoExpandidoId)
                        )}
                        patientPhotoByUserId={patientPhotoByUserId}
                        onViewPatient={(paciente) => {
                          void handleVisualizarPaciente(paciente, 8);
                        }}
                        onEndShare={handleEncerrarCompartilhamento}
                        loadingAction={loading}
                        patientsByProfessional={pacientesPorMedico}
                        onEnsurePatients={(id) => {
                          const medico = medicosList.find((m) => m.medicoId === id);
                          if (medico) void loadPacientesComum(medico.medicoId, medico.pacienteIds);
                        }}
                      />
                      {/* Versão Desktop - Tabela */}
                      <div className="hidden bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Médico
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Pacientes em Comum
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status do Vínculo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Ação
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {medicosFiltrados.map((medico) => {
                                const isExpanded = medicoExpandidoId === medico.medicoId;
                                const pacientesList = pacientesPorMedico.get(medico.medicoId) || [];
                                const isLoadingPacientes = loadingPacientesPorMedico.has(medico.medicoId);
                                
                                return (
                                  <>
                                    <tr key={medico.medicoId} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <Stethoscope className="h-5 w-5 text-green-600" />
                                          </div>
                                          <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                              {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                                            </div>
                                            {medico.crm && (
                                              <div className="text-sm text-gray-500">
                                                CRM {medico.crm.estado} {medico.crm.numero}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">
                                          {medico.countPacientes}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {medico.countPacientes === 1 ? 'paciente' : 'pacientes'}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                            Ativo
                                          </span>
                                          {medico.telefone && (
                                            <a 
                                              href={buildWhatsappUrl(phoneFieldsFromProfessional(medico)) ?? '#'}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-green-600 hover:text-green-800 flex items-center gap-1"
                                              title={`WhatsApp: ${medico.telefone}`}
                                            >
                                              <Phone size={16} />
                                            </a>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                          onClick={() => handleToggleMedicoExpandido(medico)}
                                          disabled={medico.countPacientes === 0}
                                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          title={isExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                                        >
                                          <ChevronDown 
                                            size={20} 
                                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                          />
                                        </button>
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={4} className="px-6 py-4 bg-gray-50">
                                          {isLoadingPacientes ? (
                                            <div className="text-center py-4">
                                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                                              <p className="mt-2 text-sm text-gray-600">Carregando pacientes...</p>
                                            </div>
                                          ) : pacientesList.length === 0 ? (
                                            <div className="text-center py-4 text-sm text-gray-500">
                                              Nenhum paciente compartilhado
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              {pacientesList.map((item) => {
                                                const nomePaciente = item.paciente.dadosIdentificacao?.nomeCompleto || item.paciente.nome || 'Paciente sem nome';
                                                return (
                                                  <div
                                                    key={item.paciente.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => { void handleVisualizarPaciente(item.paciente, 8); }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        void handleVisualizarPaciente(item.paciente, 8);
                                                      }
                                                    }}
                                                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer"
                                                  >
                                                    <div className="flex-1">
                                                      <h4 className="text-sm font-medium text-gray-900">{nomePaciente}</h4>
                                                      <p className="text-xs text-gray-500 mt-1">
                                                        Compartilhado em: {item.dataCompartilhamento.toLocaleDateString('pt-BR')}
                                                      </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-4">
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleEncerrarCompartilhamento(item.paciente.id, medico.medicoId);
                                                        }}
                                                        disabled={loading}
                                                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                        title="Encerrar compartilhamento"
                                                      >
                                                        <Trash2 size={16} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })}
                            </tbody>
                          </table>
                            </div>
                          </div>

                          {/* Versão Mobile - Cards */}
                          <div className="lg:hidden space-y-3">
                            {medicosFiltrados.map((medico) => {
                              const isExpanded = medicoExpandidoId === medico.medicoId;
                              const pacientesList = pacientesPorMedico.get(medico.medicoId) || [];
                              const isLoadingPacientes = loadingPacientesPorMedico.has(medico.medicoId);
                              
                              return (
                                <div key={medico.medicoId} className="rounded-xl border border-gray-200 bg-white p-3">
                                  <div className="flex items-start gap-3">
                                    <VinculoFotoAvatar
                                      name={`${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${medico.nome}`}
                                      photoUrl={medico.fotoPerfilUrl}
                                      tone="medico"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <h3 className="truncate text-sm font-semibold text-gray-900">
                                        {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                                      </h3>
                                      {medico.crm ? (
                                        <p className="mt-0.5 text-xs text-gray-500">
                                          CRM {medico.crm.estado} {medico.crm.numero}
                                        </p>
                                      ) : null}
                                      <MedicoAndamentoStatsBlock
                                        kind="nutricionista"
                                        patients={isExpanded ? pacientesPorMedico.get(medico.medicoId) : undefined}
                                        totalFallback={medico.countPacientes}
                                      />
                                    </div>
                                    <div className="flex shrink-0 items-center">
                                        <button
                                          onClick={() => handleToggleMedicoExpandido(medico)}
                                          disabled={medico.countPacientes === 0}
                                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          title={isExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                                        >
                                          <ChevronDown 
                                            size={20} 
                                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                          />
                                        </button>
                                        <button
                                          onClick={() => handleExcluirVinculoMedico(medico.medicoId)}
                                          disabled={loading}
                                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                          title="Excluir vínculo"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                    </div>
                                  </div>
                                  
                                  {/* Lista de pacientes expandida */}
                                  {isExpanded && (
                                    <div className="mt-2 border-t border-gray-100 pt-2">
                                      {isLoadingPacientes ? (
                                        <div className="text-center py-4">
                                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                                          <p className="mt-2 text-sm text-gray-600">Carregando pacientes...</p>
                                        </div>
                                      ) : pacientesList.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-gray-500">
                                          Nenhum paciente compartilhado
                                        </div>
                                      ) : (
                                        <VinculoMobilePacientesList
                                          kind="nutricionista"
                                          patients={pacientesList}
                                          filtro={filtroMobileMedicosVinculados}
                                          onFiltroChange={setFiltroMobileMedicosVinculados}
                                          renderItem={(item) => {
                                            const nomePaciente = item.paciente.dadosIdentificacao?.nomeCompleto || item.paciente.nome || 'Paciente sem nome';
                                            return (
                                              <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => { void handleVisualizarPaciente(item.paciente, 8); }}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    void handleVisualizarPaciente(item.paciente, 8);
                                                  }
                                                }}
                                                className="flex cursor-pointer items-center justify-between py-2"
                                              >
                                                <div className="flex-1 min-w-0">
                                                  <h4 className="text-sm font-medium text-gray-900 truncate">{nomePaciente}</h4>
                                                  <p className="text-xs text-gray-500 mt-1">
                                                    Compartilhado em: {item.dataCompartilhamento.toLocaleDateString('pt-BR')}
                                                  </p>
                                                </div>
                                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleEncerrarCompartilhamento(item.paciente.id, medico.medicoId);
                                                    }}
                                                    disabled={loading}
                                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                    title="Encerrar compartilhamento"
                                                  >
                                                    <Trash2 size={16} />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          }}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );

      case 'pacientes': {
        // Médicos únicos (vinculados) para o filtro
        const medicosUnicosPacientes = (() => {
          const map = new Map<string, { nome: string; genero?: 'M' | 'F' }>();
          pacientesVisiveis.forEach(p => {
            if (p.medicoId && p.medicoNome && !map.has(p.medicoId)) {
              map.set(p.medicoId, { nome: p.medicoNome, genero: p.medicoGenero });
            }
          });
          return Array.from(map.entries()).map(([id, { nome, genero }]) => ({ id, nome, genero })).sort((a, b) => a.nome.localeCompare(b.nome));
        })();

        // Filtrar pacientes por busca e por médico vinculado
        const pacientesFiltrados = pacientesVisiveis.filter(p => {
          const matchBusca = !buscaPaciente.trim() ||
            p.paciente.dadosIdentificacao?.nomeCompleto?.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
            p.paciente.email?.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
            p.paciente.nome?.toLowerCase().includes(buscaPaciente.toLowerCase());
          const matchMedico = !filtroMedicoPacientes || p.medicoId === filtroMedicoPacientes;
          return matchBusca && matchMedico;
        });

        // Ordenar por nome (alfabético)
        const pacientesOrdenados = [...pacientesFiltrados].sort((a, b) => {
          const nomeA = a.paciente.dadosIdentificacao?.nomeCompleto || a.paciente.nome || '';
          const nomeB = b.paciente.dadosIdentificacao?.nomeCompleto || b.paciente.nome || '';
          return nomeA.localeCompare(nomeB);
        });

        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Pacientes</h1>
              <p className="text-gray-600 mb-6">Pacientes compartilhados com você</p>

              {/* Solicitações Pendentes */}
              {solicitacoesPendentes.length > 0 && (
                <div className="mb-6 bg-white shadow rounded-lg p-4 sm:p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Solicitações Pendentes
                    <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                      {solicitacoesPendentes.length}
                    </span>
                  </h3>
                  <SolicitacoesPacientesCarousel
                    items={solicitacoesPendentes.map((solicitacao) => ({
                      id: solicitacao.id,
                      nome:
                        solicitacao.pacienteNome ||
                        `Paciente ${solicitacao.pacienteId.substring(0, 8)}...`,
                      criadoEm: solicitacao.criadoEm,
                      chips: solicitacao.medicoNome
                        ? [
                            {
                              id: `medico-${solicitacao.id}`,
                              label: solicitacao.medicoNome,
                              variant: 'slate' as const,
                              icon: 'medico' as const,
                            },
                          ]
                        : undefined,
                    }))}
                    onAceitar={(id) => void handleAceitarSolicitacao(id)}
                    onRejeitar={(id) => void handleRejeitarSolicitacao(id)}
                    aceitandoId={aceitandoSolicitacaoId}
                  />
                </div>
              )}

              {/* Busca e filtro por médico */}
              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar paciente por nome ou email..."
                    value={buscaPaciente}
                    onChange={(e) => setBuscaPaciente(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                {medicosUnicosPacientes.length > 0 && (
                  <div className="sm:w-56">
                    <select
                      value={filtroMedicoPacientes}
                      onChange={(e) => setFiltroMedicoPacientes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    >
                      <option value="">Todos os médicos</option>
                      {medicosUnicosPacientes.map(({ id, nome, genero }) => {
                        const titulo = genero === 'F' ? 'Dra.' : 'Dr.';
                        return <option key={id} value={id}>{titulo} {nome}</option>;
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* Loading */}
              {loadingPacientesList ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando pacientes...</p>
                </div>
              ) : (
                <>
                  {/* Empty states */}
                  {!nutricionista.isVerificado ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                      <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-yellow-900 mb-2">Aguardando verificação</h3>
                      <p className="text-yellow-700">Você precisa ser verificado pelo administrador para ver pacientes compartilhados.</p>
                    </div>
                  ) : pacientesVisiveis.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum paciente compartilhado</h3>
                      <p className="text-gray-600">Você ainda não possui pacientes compartilhados com você.</p>
                    </div>
                  ) : pacientesOrdenados.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum paciente encontrado</h3>
                      <p className="text-gray-600">Nenhum paciente corresponde à sua busca.</p>
                    </div>
                  ) : (
                    <>
                      {/* Versão Desktop - Tabela */}
                      <div className="hidden lg:block bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Item
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Data de Cadastro
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Nome
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Médico
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Telefone
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Perda Peso
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Semanas
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Ações
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {pacientesOrdenados.map((item, index) => {
                                const paciente = item.paciente;
                                const nomeCompleto = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Sem nome';
                                
                                // Calcular perda de peso
                                const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
                                const evolucao = paciente.evolucaoSeguimento || [];
                                const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
                                const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
                                
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
                                
                                const perdaPesoTotal = ultimoPeso && baselineWeight > 0 ? ultimoPeso - baselineWeight : null;
                                
                                // Semanas da barra: protocolo ativo (não soma ciclos anteriores)
                                const { posicao: semanasAplicadas, total: totalSemanas, segmentos: segmentosAplicacoes } =
                                  countAplicacoesProgress(paciente);
                                
                                // Formatar telefone
                                const telefone = paciente.dadosIdentificacao?.telefone || '';
                                const telefoneWhatsApp = telefone.replace(/\D/g, '');
                                const linkWhatsApp = buildPatientWhatsappUrl(paciente) ?? '#';
                                
                                // Obter pagamento
                                const pagamento = pagamentosPacientes[paciente.id];
                                
                                return (
                                  <tr
                                    key={item.pacienteId}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => { void handleVisualizarPaciente(paciente); }}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{index + 1}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-500">
                                        {paciente.dataCadastro?.toLocaleDateString ? 
                                          (paciente.dataCadastro instanceof Date 
                                            ? paciente.dataCadastro.toLocaleDateString('pt-BR')
                                            : new Date(paciente.dataCadastro).toLocaleDateString('pt-BR'))
                                          : '-'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{nomeCompleto}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-700">
                                        {labelMedicoResponsavelPaciente(
                                          item.medicoId || paciente.medicoResponsavelId,
                                          medicosList,
                                          {
                                            medicoId: item.medicoId,
                                            medicoNome: item.medicoNome,
                                            medicoGenero: item.medicoGenero,
                                          }
                                        ) || '—'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                      {telefoneWhatsApp ? (
                                        <a 
                                          href={linkWhatsApp} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
                                        >
                                          <MessageSquare size={14} />
                                          {telefone}
                                        </a>
                                      ) : (
                                        <div className="text-sm text-gray-500">-</div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        (paciente.statusTratamento || 'pendente') === 'em_tratamento'
                                          ? 'bg-green-100 text-green-800'
                                          : (paciente.statusTratamento || 'pendente') === 'concluido'
                                          ? 'bg-blue-100 text-blue-800'
                                          : (paciente.statusTratamento || 'pendente') === 'abandono'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {(paciente.statusTratamento || 'pendente') === 'em_tratamento'
                                          ? 'Em Tratamento'
                                          : (paciente.statusTratamento || 'pendente') === 'concluido'
                                          ? 'Concluído'
                                          : (paciente.statusTratamento || 'pendente') === 'abandono'
                                          ? 'Abandono'
                                          : 'Pendente'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {perdaPesoTotal !== null ? `${perdaPesoTotal > 0 ? '+' : ''}${perdaPesoTotal.toFixed(1)} kg` : '-'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {totalSemanas > 0 ? `${semanasAplicadas} de ${totalSemanas}` : '-'}
                                        </div>
                                        {totalSemanas > 0 && (
                                          <BarraFaixaAplicacoes
                                            segmentos={segmentosAplicacoes}
                                            className="h-2"
                                            trackClassName="bg-gray-200"
                                          />
                                        )}
                                      </div>
                                    </td>
                                    <td
                                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => { void handleVisualizarPaciente(paciente); }}
                                          className="p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                          title="Editar"
                                        >
                                          <Edit size={18} />
                                        </button>
                                        <button
                                          onClick={() => handleCancelarCompartilhamento(item)}
                                          className="p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                          title="Excluir"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Versão Mobile - Cards */}
                      <div className="lg:hidden space-y-3">
                        {pacientesOrdenados.map((item) => {
                          const paciente = item.paciente;
                          const nomeCompleto = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Sem nome';
                          
                          // Calcular perda de peso / circunferência abdominal
                          const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
                          const evolucao = paciente.evolucaoSeguimento || [];
                          const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
                          const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
                          const baselineCompAbdominal =
                            (primeiroRegistro?.circunferenciaAbdominal != null &&
                            primeiroRegistro.circunferenciaAbdominal > 0
                              ? primeiroRegistro.circunferenciaAbdominal
                              : null) ??
                            (medidasIniciais?.circunferenciaAbdominal != null &&
                            medidasIniciais.circunferenciaAbdominal > 0
                              ? medidasIniciais.circunferenciaAbdominal
                              : 0);
                          
                          let ultimoPeso: number | null = null;
                          let ultimoCompAbdominal: number | null = null;
                          if (evolucao.length > 0) {
                            const evolucaoOrdenada = [...evolucao].sort((a, b) => {
                              const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
                              const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
                              return dataB - dataA;
                            });
                            const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
                            ultimoPeso = ultimoRegistroComPeso?.peso || null;
                            const ultimoRegistroComComp = evolucaoOrdenada.find(
                              (s) => s.circunferenciaAbdominal != null && s.circunferenciaAbdominal > 0
                            );
                            ultimoCompAbdominal = ultimoRegistroComComp?.circunferenciaAbdominal ?? null;
                          }
                          
                          const perdaPesoTotal = ultimoPeso && baselineWeight > 0 ? ultimoPeso - baselineWeight : null;
                          const perdaCompAbdominalTotal =
                            ultimoCompAbdominal != null && baselineCompAbdominal > 0
                              ? ultimoCompAbdominal - baselineCompAbdominal
                              : null;
                          
                          // Calcular IMC
                          const calcularIMC = (): { imc: number | null; emoji: string; corBorda: string } => {
                            let imc: number | null = null;
                            if (medidasIniciais?.imc) {
                              imc = medidasIniciais.imc;
                            } else if (medidasIniciais?.altura && ultimoPeso) {
                              const alturaMetros = medidasIniciais.altura / 100;
                              imc = ultimoPeso / (alturaMetros * alturaMetros);
                            } else if (medidasIniciais?.altura && medidasIniciais?.peso) {
                              const alturaMetros = medidasIniciais.altura / 100;
                              imc = medidasIniciais.peso / (alturaMetros * alturaMetros);
                            }
                            
                            if (!imc || imc === 0) {
                              return { imc: null, emoji: '🙂', corBorda: '#9ca3af' };
                            }
                            if (imc < 18.5) {
                              return { imc, emoji: '😟', corBorda: '#60a5fa' };
                            } else if (imc < 25) {
                              return { imc, emoji: '🙂', corBorda: '#34d399' };
                            } else if (imc < 30) {
                              return { imc, emoji: '😐', corBorda: '#fbbf24' };
                            } else {
                              return { imc, emoji: '😟', corBorda: '#f87171' };
                            }
                          };
                          
                          const imcData = calcularIMC();
                          const statusTratamento = paciente.statusTratamento || 'pendente';
                          
                          // Semanas da barra: protocolo ativo (não soma ciclos anteriores)
                          const { posicao: semanasAplicadas, total: totalSemanas, segmentos: segmentosAplicacoes } =
                            countAplicacoesProgress(paciente);
                          
                          // Obter pagamento
                          const pagamento = pagamentosPacientes[paciente.id];
                          
                          // Formatar telefone para WhatsApp
                          const telefone = paciente.dadosIdentificacao?.telefone || '';
                          const telefoneWhatsApp = telefone.replace(/\D/g, '');
                          const linkWhatsApp = buildPatientWhatsappUrl(paciente) ?? '#';
                          
                          // Estado de expansão
                          const isExpanded = pacienteCardExpandido === item.pacienteId;
                          const isAplicacoesModalAberto =
                            showModalAplicacoes && pacienteAplicacoesSelecionado?.id === paciente.id;
                          const isSelecionado = isExpanded || isAplicacoesModalAberto;
                          
                          return (
                            <div key={item.pacienteId} className={`shadow rounded-lg transition-all overflow-hidden ${
                              isSelecionado 
                                ? 'p-[2px] bg-gradient-to-r from-purple-500 to-orange-500' 
                                : 'border border-gray-200 bg-white'
                            }`}>
                              <div className={`rounded-lg ${
                                isSelecionado ? 'bg-white' : ''
                              }`}>
                                {/* Borda superior: semanas de aplicação */}
                                <div className="w-full rounded-t-lg relative overflow-hidden bg-gray-100">
                                  {totalSemanas > 0 ? (
                                    <BarraFaixaAplicacoes
                                      segmentos={segmentosAplicacoes}
                                      className="absolute left-0 top-0 h-[1.5px] rounded-none"
                                      trackClassName="bg-transparent"
                                    />
                                  ) : null}
                                  {/* Texto centralizado */}
                                  <div className="relative z-10 py-0.5 text-center text-xs font-semibold text-gray-700">
                                    {totalSemanas > 0 ? `${semanasAplicadas} de ${totalSemanas}` : '–'}
                                  </div>
                                </div>
                                <div className="p-4 pt-3">
                                {/* Cabeçalho */}
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <button
                                        type="button"
                                        onClick={() => abrirControleFinanceiroPaciente(paciente)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-opacity hover:opacity-90 active:opacity-80 ${
                                          getStatusPagamentoPaciente(pagamento) === 'pago'
                                            ? 'border-green-400 text-green-700 bg-green-50'
                                            : getStatusPagamentoPaciente(pagamento) === 'iniciou_pagamento'
                                              ? 'border-yellow-400 text-yellow-700 bg-yellow-50'
                                              : 'border-red-400 text-red-700 bg-red-50'
                                        }`}
                                        title="Controle financeiro"
                                        aria-label="Controle financeiro"
                                      >
                                        <DollarSign size={16} />
                                      </button>
                                      <h3 className="flex-1 min-w-0 text-base font-semibold text-gray-900 truncate">{nomeCompleto}</h3>
                                      {mensagensNaoLidasPorPaciente[paciente.id] > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0" title={`${mensagensNaoLidasPorPaciente[paciente.id]} mensagem(ns) não lida(s)`}>
                                          <MessageSquare size={10} className="mr-1" />
                                          {mensagensNaoLidasPorPaciente[paciente.id]}
                                        </span>
                                      )}
                                      <PacienteCardMediaIcons
                                        paciente={paciente}
                                        temFoto={!!fotosPorPacienteId[paciente.id]}
                                        onOpenGrafico={() => {
                                          setPacienteParaGraficoRegistros(paciente);
                                          setShowModalGraficoRegistros(true);
                                        }}
                                        onOpenFotos={() => abrirFotos(paciente)}
                                        onOpenDepoimento={() =>
                                          setDepoimentoModalPaciente({
                                            pacienteNome: nomeCompleto,
                                            paciente,
                                          })
                                        }
                                      />
                                      <button
                                        onClick={() => {
                                          const novoEstado = isExpanded ? null : item.pacienteId;
                                          setPacienteCardExpandido(novoEstado);
                                        }}
                                        className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors -mr-1"
                                        aria-label={isExpanded ? 'Fechar detalhes' : 'Abrir detalhes'}
                                      >
                                        <ChevronDown 
                                          size={20} 
                                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        statusTratamento === 'em_tratamento'
                                          ? 'bg-green-100 text-green-800'
                                          : statusTratamento === 'concluido'
                                          ? 'bg-blue-100 text-blue-800'
                                          : statusTratamento === 'abandono'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {statusTratamento === 'em_tratamento'
                                          ? 'Em Tratamento'
                                          : statusTratamento === 'concluido'
                                          ? 'Concluído'
                                          : statusTratamento === 'abandono'
                                          ? 'Abandono'
                                          : 'Pendente'}
                                      </span>
                                      {/* Perda de Peso */}
                                      {perdaPesoTotal !== null && (
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          perdaPesoTotal < 0
                                            ? 'bg-green-100 text-green-800'
                                            : perdaPesoTotal > 0
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {perdaPesoTotal !== 0 ? (perdaPesoTotal < 0 ? '-' : '+') : ''}{Math.abs(perdaPesoTotal).toFixed(1)} kg
                                        </span>
                                      )}
                                      {/* Perda comprimento abdominal */}
                                      {perdaCompAbdominalTotal !== null && (
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          perdaCompAbdominalTotal < 0
                                            ? 'bg-green-100 text-green-800'
                                            : perdaCompAbdominalTotal > 0
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {perdaCompAbdominalTotal !== 0 ? (perdaCompAbdominalTotal < 0 ? '-' : '+') : ''}{Math.abs(perdaCompAbdominalTotal).toFixed(1)} cm
                                        </span>
                                      )}
                                    </div>
                                </div>
                                
                                {/* Botões de ação - Editar, Aplicações, Exames, Prescrições, Nutri, Personal, Excluir */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {/* Botão Editar — modal tela cheia (igual metaadmin mobile) */}
                                    <button
                                      onClick={() => handleVisualizarPaciente(paciente, 1, true)}
                                      className="p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                      title="Editar"
                                    >
                                      <UserIcon size={18} />
                                    </button>
                                    {/* Botão Aplicações — modal tela cheia (somente leitura) */}
                                    {(() => {
                                      const temAplicacoes = (paciente.evolucaoSeguimento || []).length > 0;
                                      return (
                                        <button
                                          onClick={() => {
                                            setPacienteAplicacoesSelecionado(paciente);
                                            setShowModalAplicacoes(true);
                                            setPacienteCardExpandido(null);
                                          }}
                                          className={`p-2 rounded-md transition-colors ${
                                            isAplicacoesModalAberto
                                              ? 'bg-blue-600 text-white'
                                              : temAplicacoes
                                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                          }`}
                                          title="Aplicações"
                                        >
                                          <Syringe size={18} />
                                        </button>
                                      );
                                    })()}
                                    {/* Botão Exames */}
                                    {(() => {
                                      const temExames = (paciente.examesLaboratoriais || []).length > 0;
                                      return (
                                        <button
                                          onClick={() => {
                                            setPacienteExamesSelecionado(paciente);
                                            setShowModalExames(true);
                                            const exames = paciente.examesLaboratoriais || [];
                                            if (exames.length > 0) {
                                              const examesOrdenados = [...exames].sort((a, b) => {
                                                const dateA = a.dataColeta instanceof Date ? a.dataColeta.toISOString().split('T')[0] : (a.dataColeta?.toDate ? a.dataColeta.toDate().toISOString().split('T')[0] : '');
                                                const dateB = b.dataColeta instanceof Date ? b.dataColeta.toISOString().split('T')[0] : (b.dataColeta?.toDate ? b.dataColeta.toDate().toISOString().split('T')[0] : '');
                                                return dateB.localeCompare(dateA);
                                              });
                                              if (examesOrdenados.length > 0) {
                                                const dataMaisRecente = examesOrdenados[0].dataColeta instanceof Date
                                                  ? examesOrdenados[0].dataColeta.toISOString().split('T')[0]
                                                  : examesOrdenados[0].dataColeta?.toDate
                                                  ? examesOrdenados[0].dataColeta.toDate().toISOString().split('T')[0]
                                                  : '';
                                                setExameDataSelecionada(dataMaisRecente);
                                              }
                                            } else {
                                              setExameDataSelecionada('');
                                            }
                                          }}
                                          className={`p-2 rounded-md transition-colors ${
                                            temExames
                                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                          }`}
                                          title="Exames"
                                        >
                                          <FlaskConical size={18} />
                                        </button>
                                      );
                                    })()}
                                    {/* Botão Bio Impedância */}
                                    <button
                                      onClick={() => {
                                        setPacienteBioImpedanciaSelecionado(paciente);
                                        setShowModalBioImpedancia(true);
                                      }}
                                      className="p-2 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                                      title="Bio Impedância"
                                    >
                                      <Scale size={18} />
                                    </button>
                                    {/* Botão Prescrições */}
                                    <button
                                      onClick={() => {
                                        setPacientePrescricoesSelecionado(paciente);
                                        setShowModalPrescricoes(true);
                                        loadPrescricoesModal(paciente);
                                      }}
                                      className="p-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                                      title="Prescrições"
                                    >
                                      <ClipboardList size={18} />
                                    </button>
                                    {/* Botão Nutri - abre modal (mantém barra inferior no mobile) */}
                                    <button
                                      onClick={() => {
                                        setPacienteNutriSelecionado(paciente);
                                        setShowModalNutri(true);
                                      }}
                                      className="p-2 rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                                      title="Ver como paciente (Nutri)"
                                    >
                                      <UtensilsCrossed size={18} />
                                    </button>
                                    {/* Botão Personal Trainer — abre modal só leitura (igual metaadmin para o médico) */}
                                    {(() => {
                                      const temPersonal = !!(paciente.userId && pacientesComTreinos.has(paciente.userId)) || !!(paciente.id && pacientesComTreinos.has(paciente.id));
                                      return (
                                        <button
                                          onClick={() => {
                                            setPacientePersonalSelecionado(paciente);
                                            setShowModalPersonal(true);
                                          }}
                                          className={`p-2 rounded-md transition-colors ${
                                            temPersonal
                                              ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                          }`}
                                          title="Ver treinos (Personal Trainer)"
                                        >
                                          <Dumbbell size={18} />
                                        </button>
                                      );
                                    })()}
                                    {/* Botão Excluir (cancelar compartilhamento) */}
                                    <button
                                      onClick={() => handleCancelarCompartilhamento(item)}
                                      className="p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Detalhes do paciente: modal full-screen no mobile (cards já são lg:hidden) */}
                                {isExpanded && (() => {
                                  const medidasIniciaisCard = paciente.dadosClinicos?.medidasIniciais;
                                  const alturaCm = medidasIniciaisCard?.altura;
                                  const alturaMetros = alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;
                                  let imcAtual: number | null = null;
                                  if (pacienteArrastandoIMC === item.pacienteId && imcTemporarioIMC !== null) {
                                    imcAtual = imcTemporarioIMC;
                                  } else if (alturaMetros && ultimoPeso && ultimoPeso > 0) {
                                    imcAtual = ultimoPeso / (alturaMetros * alturaMetros);
                                  } else if (medidasIniciaisCard?.imc) {
                                    imcAtual = medidasIniciaisCard.imc;
                                  }
                                  const pesoAtual = pacienteArrastandoIMC === item.pacienteId && pesoTemporarioIMC !== null
                                    ? pesoTemporarioIMC
                                    : (ultimoPeso || medidasIniciaisCard?.peso || null);

                                  const calcularPosicaoMarcador = (imc: number | null | undefined): number => {
                                    if (!imc || imc === 0) return 0;
                                    if (imc < 18.5) return (imc / 18.5) * 25;
                                    if (imc < 25) return 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
                                    if (imc < 30) return 50 + ((imc - 25) / (30 - 25)) * 25;
                                    return 75 + Math.min(((imc - 30) / 20) * 25, 25);
                                  };

                                  const statusLabel =
                                    statusTratamento === 'em_tratamento'
                                      ? 'Em Tratamento'
                                      : statusTratamento === 'concluido'
                                      ? 'Concluído'
                                      : statusTratamento === 'abandono'
                                      ? 'Abandono'
                                      : 'Pendente';
                                  const statusClassName =
                                    statusTratamento === 'em_tratamento'
                                      ? 'bg-green-100 text-green-800'
                                      : statusTratamento === 'concluido'
                                      ? 'bg-blue-100 text-blue-800'
                                      : statusTratamento === 'abandono'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800';

                                  const cadastroLabel = paciente.dataCadastro
                                    ? (paciente.dataCadastro instanceof Date
                                        ? paciente.dataCadastro.toLocaleDateString('pt-BR')
                                        : new Date(paciente.dataCadastro).toLocaleDateString('pt-BR'))
                                    : '-';

                                  let sexoLabel: string | null = null;
                                  if (paciente.dadosIdentificacao?.sexoBiologico) {
                                    sexoLabel =
                                      paciente.dadosIdentificacao.sexoBiologico === 'M'
                                        ? 'Masculino'
                                        : paciente.dadosIdentificacao.sexoBiologico === 'F'
                                        ? 'Feminino'
                                        : 'Outro';
                                  }

                                  let dataNascimentoLabel = '-';
                                  let idadeLabel: string | null = null;
                                  const dataNasc = paciente.dadosIdentificacao?.dataNascimento;
                                  if (dataNasc) {
                                    let dataNascimento: Date;
                                    if (dataNasc instanceof Date) {
                                      dataNascimento = dataNasc;
                                    } else if (dataNasc?.toDate) {
                                      dataNascimento = dataNasc.toDate();
                                    } else {
                                      dataNascimento = new Date(dataNasc);
                                    }
                                    dataNascimentoLabel = dataNascimento.toLocaleDateString('pt-BR');
                                    const hoje = new Date();
                                    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
                                    const mesAtual = hoje.getMonth();
                                    const diaAtual = hoje.getDate();
                                    const mesNasc = dataNascimento.getMonth();
                                    const diaNasc = dataNascimento.getDate();
                                    if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) {
                                      idade--;
                                    }
                                    idadeLabel = `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
                                  }

                                  const valorTotalNode =
                                    pagamento && pagamento.valorTotal > 0 ? (
                                      <span>
                                        R$ {pagamento.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        {pagamento.parcelas && pagamento.parcelas.length > 0 && (
                                          <span className="text-gray-500 ml-1">
                                            ({pagamento.parcelas.length} {pagamento.parcelas.length === 1 ? 'parcela' : 'parcelas'})
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span>-</span>
                                    );

                                  let baselineImc: number | null = null;
                                  if (medidasIniciaisCard?.imc && medidasIniciaisCard.imc > 0) {
                                    baselineImc = medidasIniciaisCard.imc;
                                  } else if (alturaMetros && baselineWeight > 0) {
                                    baselineImc = baselineWeight / (alturaMetros * alturaMetros);
                                  }
                                  const perdaImcTotal =
                                    imcAtual != null && imcAtual > 0 && baselineImc != null && baselineImc > 0
                                      ? imcAtual - baselineImc
                                      : null;
                                  // Durante o arraste da barra, o peso temporário também atualiza a perda exibida
                                  const perdaPesoExibida =
                                    pesoAtual != null && pesoAtual > 0 && baselineWeight > 0
                                      ? pesoAtual - baselineWeight
                                      : perdaPesoTotal;

                                  const metaPesoKgLoss = resolveMetaPesoKgLoss(paciente, baselineWeight);
                                  const metaAbdominalCmLoss = resolveMetaAbdominalCmLoss(paciente);
                                  const metaProgressPesoPct = calcMetaProgressPct(
                                    perdaPesoExibida,
                                    metaPesoKgLoss
                                  );
                                  const metaProgressAbdominalPct = calcMetaProgressPct(
                                    perdaCompAbdominalTotal,
                                    metaAbdominalCmLoss
                                  );
                                  const metaPesoValorLabel =
                                    metaPesoKgLoss != null && metaPesoKgLoss > 0
                                      ? `${metaPesoKgLoss.toFixed(1).replace(/\.0$/, '')} kg`
                                      : null;
                                  const metaAbdominalValorLabel =
                                    metaAbdominalCmLoss != null && metaAbdominalCmLoss > 0
                                      ? `${metaAbdominalCmLoss.toFixed(1).replace(/\.0$/, '')} cm`
                                      : null;
                                  const {
                                    posicao: aplicacoesFeitas,
                                    total: aplicacoesTotal,
                                    segmentos: segmentosAplicacoes,
                                  } = countAplicacoesProgress(paciente);

                                  const photoUrl =
                                    paciente.userId && Object.prototype.hasOwnProperty.call(patientPhotoByUserId, paciente.userId)
                                      ? patientPhotoByUserId[paciente.userId]
                                      : null;

                                  const atalhos = (
                                    <>
                                      <button
                                        onClick={() => handleVisualizarPaciente(paciente, 1, true)}
                                        className="p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                        title="Editar"
                                      >
                                        <UserIcon size={18} />
                                      </button>
                                      {(() => {
                                        const temAplicacoes = (paciente.evolucaoSeguimento || []).length > 0;
                                        return (
                                          <button
                                            onClick={() => {
                                              setPacienteAplicacoesSelecionado(paciente);
                                              setShowModalAplicacoes(true);
                                            }}
                                            className={`p-2 rounded-md transition-colors ${
                                              temAplicacoes
                                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                            }`}
                                            title="Aplicações"
                                          >
                                            <Syringe size={18} />
                                          </button>
                                        );
                                      })()}
                                      {(() => {
                                        const temExames = (paciente.examesLaboratoriais || []).length > 0;
                                        return (
                                          <button
                                            onClick={() => {
                                              setPacienteExamesSelecionado(paciente);
                                              setShowModalExames(true);
                                              const exames = paciente.examesLaboratoriais || [];
                                              if (exames.length > 0) {
                                                const examesOrdenados = [...exames].sort((a, b) => {
                                                  const dateA = a.dataColeta instanceof Date ? a.dataColeta.toISOString().split('T')[0] : (a.dataColeta?.toDate ? a.dataColeta.toDate().toISOString().split('T')[0] : '');
                                                  const dateB = b.dataColeta instanceof Date ? b.dataColeta.toISOString().split('T')[0] : (b.dataColeta?.toDate ? b.dataColeta.toDate().toISOString().split('T')[0] : '');
                                                  return dateB.localeCompare(dateA);
                                                });
                                                if (examesOrdenados.length > 0) {
                                                  const dataMaisRecente = examesOrdenados[0].dataColeta instanceof Date
                                                    ? examesOrdenados[0].dataColeta.toISOString().split('T')[0]
                                                    : examesOrdenados[0].dataColeta?.toDate
                                                    ? examesOrdenados[0].dataColeta.toDate().toISOString().split('T')[0]
                                                    : '';
                                                  setExameDataSelecionada(dataMaisRecente);
                                                }
                                              } else {
                                                setExameDataSelecionada('');
                                              }
                                            }}
                                            className={`p-2 rounded-md transition-colors ${
                                              temExames
                                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                            }`}
                                            title="Exames"
                                          >
                                            <FlaskConical size={18} />
                                          </button>
                                        );
                                      })()}
                                      <button
                                        onClick={() => {
                                          setPacienteBioImpedanciaSelecionado(paciente);
                                          setShowModalBioImpedancia(true);
                                        }}
                                        className="p-2 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                                        title="Bio Impedância"
                                      >
                                        <Scale size={18} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setPacientePrescricoesSelecionado(paciente);
                                          setShowModalPrescricoes(true);
                                          loadPrescricoesModal(paciente);
                                        }}
                                        className="p-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                                        title="Prescrições"
                                      >
                                        <ClipboardList size={18} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setPacienteNutriSelecionado(paciente);
                                          setShowModalNutri(true);
                                        }}
                                        className="p-2 rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                                        title="Ver como paciente (Nutri)"
                                      >
                                        <UtensilsCrossed size={18} />
                                      </button>
                                      {(() => {
                                        const temPersonal = !!(paciente.userId && pacientesComTreinos.has(paciente.userId)) || !!(paciente.id && pacientesComTreinos.has(paciente.id));
                                        return (
                                          <button
                                            onClick={() => {
                                              setPacientePersonalSelecionado(paciente);
                                              setShowModalPersonal(true);
                                            }}
                                            className={`p-2 rounded-md transition-colors ${
                                              temPersonal
                                                ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                            }`}
                                            title="Ver treinos (Personal Trainer)"
                                          >
                                            <Dumbbell size={18} />
                                          </button>
                                        );
                                      })()}
                                      <button
                                        onClick={() => abrirControleFinanceiroPaciente(paciente)}
                                        className={`p-2 rounded-md transition-colors ${
                                          getStatusPagamentoPaciente(pagamento) === 'pago'
                                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                            : getStatusPagamentoPaciente(pagamento) === 'iniciou_pagamento'
                                              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                                        }`}
                                        title="Controle financeiro"
                                      >
                                        <DollarSign size={18} />
                                      </button>
                                      <button
                                        onClick={() => handleCancelarCompartilhamento(item)}
                                        className="p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                        title="Excluir"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </>
                                  );

                                  return (
                                    <PatientDetailsMobileModal
                                      open
                                      onClose={() => {
                                        setPacienteCardExpandido(null);
                                        if (pacienteArrastandoIMC === item.pacienteId) {
                                          setIsDraggingIMC(false);
                                          setPacienteArrastandoIMC(null);
                                          setPesoTemporarioIMC(null);
                                          setImcTemporarioIMC(null);
                                        }
                                      }}
                                      patientName={nomeCompleto}
                                      photoUrl={photoUrl}
                                      statusLabel={statusLabel}
                                      statusClassName={statusClassName}
                                      perdaPesoTotal={perdaPesoExibida}
                                      perdaCompAbdominalTotal={perdaCompAbdominalTotal}
                                      perdaImcTotal={perdaImcTotal}
                                      metaProgressPesoPct={metaProgressPesoPct}
                                      metaProgressAbdominalPct={metaProgressAbdominalPct}
                                      metaPesoValorLabel={metaPesoValorLabel}
                                      metaAbdominalValorLabel={metaAbdominalValorLabel}
                                      aplicacoesFeitas={aplicacoesFeitas}
                                      aplicacoesTotal={aplicacoesTotal}
                                      segmentosAplicacoes={segmentosAplicacoes}
                                      headerMedia={
                                        <PacienteCardMediaIcons
                                          paciente={paciente}
                                          temFoto={!!fotosPorPacienteId[paciente.id]}
                                          onOpenGrafico={() => {
                                          setPacienteParaGraficoRegistros(paciente);
                                          setShowModalGraficoRegistros(true);
                                          }}
                                          onOpenFotos={() => abrirFotos(paciente)}
                                          onOpenDepoimento={() =>
                                            setDepoimentoModalPaciente({
                                              pacienteNome: nomeCompleto,
                                              paciente,
                                            })
                                          }
                                        />
                                      }
                                      shortcuts={atalhos}
                                      pesoAtual={pesoAtual}
                                      compAbdominalAtual={ultimoCompAbdominal}
                                      alturaMetros={alturaMetros}
                                      imcAtual={imcAtual}
                                      grauObesidadeLabel={calcularGrauObesidade(imcAtual)}
                                      grauObesidadeClassName={getCorGrauObesidade(calcularGrauObesidade(imcAtual))}
                                      imcMarkerPercent={calcularPosicaoMarcador(imcAtual)}
                                      imcBarRef={(el) => {
                                        if (el) barraIMCRef.current[item.pacienteId] = el;
                                      }}
                                      onImcMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsDraggingIMC(true);
                                        setPacienteArrastandoIMC(item.pacienteId);
                                      }}
                                      onImcTouchStart={() => {
                                        setIsDraggingIMC(true);
                                        setPacienteArrastandoIMC(item.pacienteId);
                                      }}
                                      cadastroLabel={cadastroLabel}
                                      telefone={telefone}
                                      telefoneWhatsApp={telefoneWhatsApp}
                                      linkWhatsApp={linkWhatsApp}
                                      cidade={paciente.dadosIdentificacao?.endereco?.cidade || '-'}
                                      sexoLabel={sexoLabel}
                                      dataNascimentoLabel={dataNascimentoLabel}
                                      idadeLabel={idadeLabel}
                                      valorTotalNode={valorTotalNode}
                                      npsNode={<span className="text-gray-500 italic">Em breve</span>}
                                    />
                                  );
                                })()}

                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }

      case 'financeiro': {
        return (
          <ProfissionalFinanceiroSection
            pacientes={pacientesVisiveis.map((p) => p.paciente)}
            pagamentosPacientes={pagamentosPacientes}
            isMobile={isMobile}
            accentClassName="text-green-700 hover:text-green-900"
            onGerenciarPaciente={(paciente) => {
              abrirControleFinanceiroPaciente(paciente);
            }}
          />
        );
      }

      case 'calendario': {
        return (
          <ProfissionalCalendarioSection
            pacientes={pacientesVisiveis.map((p) => p.paciente)}
            pagamentosPacientes={pagamentosPacientes}
            lembretes={lembretes}
            consultas={consultasAgenda}
            tags={LEMBRETE_TAGS_NUTRI}
            isMobile={isMobile}
            loading={loadingPacientesList}
            defaultTelefoneAviso={telefoneContato || nutricionista?.telefone}
            defaultTelefoneAvisoDdi={telefoneDdiContato || nutricionista?.telefoneDdi}
            defaultTelefoneAvisoPais={telefonePaisContato || nutricionista?.telefonePais}
            avisoAudience="nutricionista"
            enableWeeklyNutritionCheckIns
            enableHydrationAdherenceAlerts
            weeklyCheckInNutritionistId={nutricionista?.userId || nutricionista?.id || user?.uid}
            weeklyCheckInAuthorName={nutricionista?.nome || user?.displayName || undefined}
            onRefresh={async () => {
              await loadPacientesList();
              await loadPagamentos(pacientesVisiveis.map((p) => p.paciente));
              await loadLembretes();
              await loadConsultasAgenda();
            }}
            onSaveConsulta={async (input) => {
              const res = await nutriAgendaAuthFetch('/api/metanutri/agenda/meetings/update', {
                method: 'POST',
                body: JSON.stringify(input),
              });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(data.error || 'Falha ao salvar consulta.');
              await loadConsultasAgenda();
              await loadLembretes();
            }}
            onDeleteConsulta={async (id) => {
              const res = await nutriAgendaAuthFetch('/api/metanutri/agenda/meetings/update', {
                method: 'POST',
                body: JSON.stringify({ id, delete: true }),
              });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(data.error || 'Falha ao apagar consulta.');
              await loadConsultasAgenda();
              await loadLembretes();
            }}
            onToggleConsultaRealizada={async (id, realizada) => {
              const res = await nutriAgendaAuthFetch('/api/metanutri/agenda/meetings/update', {
                method: 'POST',
                body: JSON.stringify({ id, realizada }),
              });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(data.error || 'Falha ao atualizar a consulta.');
              await loadConsultasAgenda();
            }}
            onOpenPaciente={(p) => {
              if (isMobile) {
                irParaDetalhePacienteNaListaMobile(p);
                return;
              }
              void handleVisualizarPaciente(p);
            }}
            onOpenProntuario={(pacienteId) => abrirProntuarioDoCalendario(pacienteId)}
            onOpenPacienteCompleto={(pacienteId) =>
              isMobile
                ? irParaDetalhePacienteNaListaMobileById(pacienteId)
                : abrirPacienteCompletoDoCalendario(pacienteId)
            }
            onOpenGrafico={(p) => {
              setPacienteParaGraficoRegistros(p);
              setShowModalGraficoRegistros(true);
            }}
            onOpenPagamento={(paciente) => {
              abrirControleFinanceiroPaciente(paciente);
            }}
            onSalvarLembrete={async (dados) => {
              if (!user?.uid) return;
              await LembreteService.criarLembrete({
                nutricionistaId: user.uid,
                pacienteId: dados.pacienteId,
                pacienteNome: dados.pacienteNome,
                data: dados.data,
                horario: dados.horario,
                avisoWhatsApp: dados.avisoWhatsApp,
                telefoneAviso: dados.telefoneAviso,
                telefoneAvisoDdi: dados.telefoneAvisoDdi,
                telefoneAvisoPais: dados.telefoneAvisoPais,
                notificarPaciente: dados.notificarPaciente,
                texto: dados.texto,
                tag: dados.tag,
                concluido: false,
              });
              await loadLembretes();
            }}
            onAtualizarLembrete={async (id, dados) => {
              await LembreteService.atualizarLembrete(id, dados);
              await loadLembretes();
            }}
            onDeletarLembrete={async (id) => {
              await LembreteService.deletarLembrete(id);
              await loadLembretes();
            }}
            onToggleLembrete={async (id, concluido) => {
              await LembreteService.toggleConcluido(id, concluido);
              await loadLembretes();
            }}
          />
        );
      }

      case 'alimentos':
        return (
          <div className="w-full max-w-none">
            <NutriAlimentosPanel />
          </div>
        );

      case 'meu-perfil':
        return (
          <div className="w-full max-w-none space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Cabeçalho */}
            <div className="flex items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-600 to-teal-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center overflow-hidden shrink-0">
                  {perfilFotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={perfilFotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-7 w-7 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-green-100 text-xs font-medium uppercase tracking-wider">Meu Perfil</p>
                  <h2 className="text-white font-bold">{nutricionista?.nome || user?.displayName || 'Nutricionista'}</h2>
                </div>
              </div>
            </div>

            {/* Abas de navegação */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
              <nav className="flex flex-wrap gap-1.5" aria-label="Pastas do perfil">
                {([
                  { id: 'dados', label: 'Dados Iniciais', short: 'Dados', Icon: UserCircle },
                  { id: 'endereco', label: 'Endereço de Atendimento', short: 'Endereço', Icon: MapPin },
                  { id: 'cidades', label: 'Cidade de Atendimento', short: 'Cidades', Icon: Building },
                  { id: 'assinatura', label: 'Assinatura Digital', short: 'Assinatura', Icon: ShieldCheck },
                  { id: 'link', label: 'Meu Link', short: 'Link', Icon: LinkIcon },
                  { id: 'whatsapp', label: 'WhatsApp', short: 'WhatsApp', Icon: MessageCircle },
                ] as const).map(({ id, label, short, Icon }) => {
                  const ativa = meuPerfilAba === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMeuPerfilAba(id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        ativa
                          ? 'bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 shadow-md ring-1 ring-green-500/20'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-800/60 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${ativa ? 'text-green-600' : ''}`} />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{short}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Conteúdo da aba */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* --- ABA: Dados Iniciais --- */}
              {meuPerfilAba === 'dados' && (
                <div className="space-y-5">
                  {/* Status badge */}
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${nutricionista.isVerificado ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    {nutricionista.isVerificado ? <ShieldCheck size={16} className="text-green-600" /> : <Clock size={16} className="text-yellow-600" />}
                    <span className={`text-sm font-semibold ${nutricionista.isVerificado ? 'text-green-900' : 'text-yellow-900'}`}>
                      {nutricionista.isVerificado ? 'Perfil verificado' : 'Aguardando verificação'}
                    </span>
                    {nutricionista.isVerificado && (
                      <span className="ml-auto text-xs text-green-700">{nutricionista.medicoVinculadoIds.length} médico(s) vinculado(s)</span>
                    )}
                  </div>

                  <div className="rounded-2xl border border-dashed border-green-200 bg-green-50/30 p-5">
                    <MedicoFotoPerfilEditor
                      currentUrl={perfilFotoUrl}
                      onUrlChange={(url) => {
                        setPerfilFotoUrl(url);
                        if (!user?.uid) return;
                        void NutricionistaService.updateFotoPerfil(user.uid, url)
                          .then(() => {
                            setNutricionista((prev) =>
                              prev ? { ...prev, fotoPerfilUrl: url } : prev
                            );
                          })
                          .catch((err) => {
                            console.error('Erro ao salvar foto de perfil do nutricionista:', err);
                          });
                      }}
                      disabled={isSaving || loadingNutricionista}
                      profissao="nutricionista"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <UserCircle className="h-4 w-4 text-green-600" />
                        Gênero
                      </label>
                      <select
                        value={perfilGenero}
                        onChange={(e) => setPerfilGenero(e.target.value as 'M' | 'F' | '')}
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                        Nº do Registro (CRN) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={registroNumero}
                        onChange={(e) => setRegistroNumero(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 312345"
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Phone className="h-4 w-4 text-green-600" />
                        Telefone para contato *
                      </label>
                      <InternationalPhoneInput
                        id="metanutri-perfil-telefone"
                        value={{
                          telefone: telefoneContato,
                          telefoneDdi: telefoneDdiContato,
                          telefonePais: telefonePaisContato,
                        }}
                        onChange={(next) => {
                          setTelefoneContato(next.telefone);
                          setTelefoneDdiContato(next.telefoneDdi);
                          setTelefonePaisContato(next.telefonePais);
                        }}
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <LinkIcon className="h-4 w-4 text-green-600" />
                        Instagram (@)
                      </label>
                      <input
                        type="text"
                        value={perfilInstagram}
                        onChange={(e) => setPerfilInstagram(e.target.value)}
                        placeholder="@usuario"
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --- ABA: Endereço de Atendimento --- */}
              {meuPerfilAba === 'endereco' && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <MapPin className="h-4 w-4 text-green-600" />
                      CEP
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={perfilCep.replace(/(\d{5})(\d{1,3})/, '$1-$2')}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                          setPerfilCep(v);
                          if (v.length === 8) void buscarEnderecoPorCepNutri(v);
                        }}
                        placeholder="00000-000"
                        maxLength={9}
                        className="flex-1 block rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                      />
                      <button
                        type="button"
                        onClick={() => void buscarEnderecoPorCepNutri(perfilCep)}
                        disabled={perfilCep.length !== 8 || buscandoCepPerfil}
                        className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                      >
                        {buscandoCepPerfil ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Building className="h-4 w-4 text-green-600" />
                      Nome do local ou clínica
                    </label>
                    <input
                      type="text"
                      value={perfilNomeLocal}
                      onChange={(e) => setPerfilNomeLocal(e.target.value)}
                      placeholder="Ex: Clínica Saúde Plena"
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-800">Logradouro</label>
                      <input
                        type="text"
                        value={perfilEndereco}
                        onChange={(e) => setPerfilEndereco(e.target.value)}
                        placeholder="Preenchido pelo CEP ou digite: rua, bairro — cidade/UF"
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-800">Número</label>
                      <input
                        type="text"
                        value={perfilNumero}
                        onChange={(e) => setPerfilNumero(e.target.value)}
                        placeholder="Ex: 1200"
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-800">Ponto de referência</label>
                    <input
                      type="text"
                      value={perfilPontoRef}
                      onChange={(e) => setPerfilPontoRef(e.target.value)}
                      placeholder="Ex: Próximo ao shopping, 3º andar"
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <LinkIcon className="h-4 w-4 text-green-600" />
                      URL do Google Maps
                    </label>
                    <input
                      type="url"
                      value={perfilGoogleMaps}
                      onChange={(e) => setPerfilGoogleMaps(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                    />
                    <p className="text-xs text-gray-500">No Google Maps, abra o local → Compartilhar → Copiar link e cole aqui.</p>
                    {perfilGoogleMaps.trim() && (
                      <a href={perfilGoogleMaps.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700">
                        <MapPin className="h-4 w-4" /> Testar link no Maps
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* --- ABA: Cidades de Atendimento --- */}
              {meuPerfilAba === 'cidades' && (
                <div className="space-y-5">
                  <p className="text-sm font-medium text-gray-700">Adicione pelo menos uma cidade *</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={estadoSelecionado}
                      onChange={(e) => { setEstadoSelecionado(e.target.value); setCidadeSelecionada(''); }}
                      disabled={loadingCidadesMedicos}
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow disabled:opacity-50"
                    >
                      <option value="">Selecione o estado</option>
                      {estadosComMedicos.map((estado) => {
                        const info = estadosList.find(e => e.sigla === estado);
                        return <option key={estado} value={estado}>{info?.nome || estado}</option>;
                      })}
                    </select>
                    <select
                      value={cidadeSelecionada}
                      onChange={(e) => setCidadeSelecionada(e.target.value)}
                      disabled={!estadoSelecionado}
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow disabled:opacity-50"
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesDoEstado.map((cidade) => <option key={cidade} value={cidade}>{cidade}</option>)}
                    </select>
                    <button
                      onClick={handleAddCidade}
                      disabled={!estadoSelecionado || !cidadeSelecionada}
                      className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium shrink-0"
                    >
                      <MapPin size={16} /> Adicionar
                    </button>
                  </div>

                  {cidadesSelecionadas.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma cidade adicionada ainda</p>
                  ) : (
                    <div className="space-y-2">
                      {cidadesSelecionadas.map((cidade, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-200">
                              {cidade.cidade}, {estadosCidades[cidade.estado as keyof typeof estadosCidades]?.nome || cidade.estado}
                            </span>
                          </div>
                          <button onClick={() => handleRemoveCidade(index)} className="text-red-500 hover:text-red-700 text-xs font-medium">Remover</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* --- ABA: Assinatura Digital --- */}
              {meuPerfilAba === 'assinatura' && (
                <div className="flex gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-5">
                  <HelpCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Assinatura Digital</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      A integração de assinatura digital para nutricionistas está disponível mediante configuração pelo administrador da plataforma.
                      Entre em contato com <strong>suporte@oftware.com.br</strong> para ativar este recurso.
                    </p>
                  </div>
                </div>
              )}

              {/* --- ABA: Meu Link --- */}
              {meuPerfilAba === 'link' && (
                <div className="space-y-5">
                  {linkReferralGerado ? (
                    <>
                      <div className="rounded-xl bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-100 dark:border-green-800/40 p-5">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-300 mb-3">
                          <LinkIcon className="h-5 w-5" />
                          <span className="font-semibold text-sm">Link público do nutricionista</span>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-inner border border-green-100 dark:border-gray-700 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={linkReferralGerado}
                            readOnly
                            className="flex-1 text-sm text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none min-w-0 font-mono"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(linkReferralGerado);
                                setLinkCopiado(true);
                                setTimeout(() => setLinkCopiado(false), 2000);
                              } catch {
                                setSaveMessage({ type: 'error', text: 'Erro ao copiar link.' });
                              }
                            }}
                            className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
                          >
                            {linkCopiado ? <><CheckCircle2 size={16} /> Copiado!</> : <><Copy size={16} /> Copiar link</>}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4">
                        <HelpCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-900 dark:text-blue-200">
                          Compartilhe via WhatsApp, e-mail ou redes sociais. O paciente acessa e pode solicitar atendimento diretamente com você.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Selecione um médico vinculado para gerar seu link público.</p>
                  )}

                  {/* Seletor de médico para gerar link */}
                  {medicosVerificados.length > 0 && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <LinkIcon className="h-4 w-4 text-green-600" />
                        Gerar link associado ao médico
                      </label>
                      <select
                        value={medicoSelecionadoReferral}
                        onChange={(e) => {
                          setMedicoSelecionadoReferral(e.target.value);
                          const medico = medicosVerificados.find(m => m.id === e.target.value);
                          if (medico && nutricionista) {
                            const gerarSlug = (nome: string) => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-');
                            const slugMedico = gerarSlug(medico.nome);
                            const slugNutricionista = gerarSlug(nutricionista.nome);
                            const link = buildOrganizacaoPublicUrl(`/dr/${slugMedico}/${slugNutricionista}`);
                            setLinkReferralGerado(link);
                          } else {
                            setLinkReferralGerado('');
                          }
                        }}
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow"
                      >
                        <option value="">Selecione o médico</option>
                        {medicosVerificados
                          .filter(m => nutricionista?.medicoVinculadoIds?.includes(m.id))
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.genero === 'F' ? 'Dra.' : 'Dr.'} {m.nome} — CRM {m.crm?.estado} {m.crm?.numero}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* --- ABA: WhatsApp --- */}
              {meuPerfilAba === 'whatsapp' && (
                <WhatsappConnectionSection
                  medicoId={nutricionista?.id || nutricionista?.userId || user?.uid || null}
                  disabled={loadingNutricionista}
                  apiBasePath="/api/metanutri/whatsapp"
                  profileMissingMessage="Perfil do nutricionista não carregado. Recarregue a página e tente novamente."
                  getAuthToken={async () => {
                    const current = auth.currentUser ?? user;
                    if (!current) return null;
                    return current.getIdToken();
                  }}
                  onNotify={(msg) => alert(msg)}
                />
              )}
            </div>

            {/* Rodapé com botão Salvar (não aparece na aba WhatsApp) */}
            {meuPerfilAba !== 'whatsapp' && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center gap-3">
                {saveMessage && (
                  <div className={`flex-1 flex items-center gap-2 text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {saveMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {saveMessage.text}
                  </div>
                )}
                {meuPerfilAba !== 'assinatura' && meuPerfilAba !== 'link' && (
                  <button
                    onClick={handleSavePerfil}
                    disabled={isSaving || (meuPerfilAba === 'dados' || meuPerfilAba === 'cidades' ? !canSavePerfil : false)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4" /> Salvar Perfil</>}
                  </button>
                )}
              </div>
            )}
          </div>
          </div>
        );


      default:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Seção não encontrada</h2>
            </div>
          </div>
        );
    }
  };

  if (loading || loadingNutricionista) {
    return (
      <div style={organizationShellCssVars(shellChrome)}>
        <CadastroVerificacaoScreen
          backgroundColor={shellSplash.backgroundColor}
          spinnerClassName={shellSplash.spinnerClassName}
          messageClassName={shellSplash.messageClassName}
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  if (!nutricionista) {
    return (
      <ProfissionalCadastroGateModal
        tipo="nutri"
        loading={criandoCadastroNutri}
        onConfirm={handleConfirmarCadastroNutri}
        onDecline={handleRecusarCadastroNutri}
      />
    );
  }

  const telaBloqueioVerificacaoNutri =
    !!user?.uid &&
    !loading &&
    !loadingNutricionista &&
    !!nutricionista &&
    nutricionista.isVerificado !== true;

  return (
    <>
      {!telaBloqueioVerificacaoNutri &&
      showWhatsappConnectPrompt &&
      !(activeMenu === 'meu-perfil' && meuPerfilAba === 'whatsapp') ? (
        <WhatsappConnectPromptModal
          onConnect={() => {
            dismissWhatsappConnectPrompt();
            fecharVisualizarPacienteModal();
            setMeuPerfilAba('whatsapp');
            setActiveMenu('meu-perfil');
            setTabletNavOpen(false);
          }}
          onDismiss={dismissWhatsappConnectPrompt}
        />
      ) : null}
      {telaBloqueioVerificacaoNutri && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-black/50"
          aria-modal="true"
          role="dialog"
          aria-labelledby="metanutri-bloqueio-verificacao-titulo"
        >
          <span id="metanutri-bloqueio-verificacao-titulo" className="sr-only">
            Verificação obrigatória — cadastro de nutricionista
          </span>
          <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-white shadow-none dark:bg-gray-800">
            <MetaNutriPersonalWizard
              tipo="nutri"
              profissional={nutricionista}
              setProfissional={setNutricionista}
              userDisplayName={user.displayName}
              userId={user.uid}
              onSave={async (_closeAfter, m) => {
                if (!m?.userId) return;
                await NutricionistaService.updateCadastroVerificacao(m.userId, {
                  nome: m.nome,
                  telefone: m.telefone,
                  registroNumero: m.registroNumero,
                  cidades: m.cidades,
                  docVerificacaoCnhUrl: m.docVerificacaoCnhUrl ?? null,
                  docVerificacaoSelfieUrl: m.docVerificacaoSelfieUrl ?? null,
                  docVerificacaoRegistroUrl: m.docVerificacaoRegistroUrl ?? null,
                  ...(m.telefoneDdi?.trim()
                    ? { telefoneDdi: m.telefoneDdi.trim(), telefonePais: m.telefonePais?.trim() }
                    : {}),
                });
                const fresh = await NutricionistaService.getNutricionistaByUserId(user.uid);
                if (fresh) {
                  setNutricionista(fresh);
                  setMetaNutriLoadTick((t) => t + 1);
                }
              }}
              saving={salvandoCadastroNutri}
              setSaving={setSalvandoCadastroNutri}
              resumeAfterLoadTick={metaNutriLoadTick}
            />
          </div>
        </div>
      )}
    <div className="flex min-w-0 w-full max-w-full" style={organizationShellCssVars(shellChrome)}>
      {tabletNavOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:block xl:hidden"
          aria-hidden="true"
          onClick={() => setTabletNavOpen(false)}
        />
      ) : null}
      {/* Sidebar: no tablet (md–xl) fica recolhida; hamburger abre overlay. Desktop (xl+) inalterado. */}
      <div
        data-mn-nav-open={tabletNavOpen ? '' : undefined}
        data-organization-id={organizationShellContext.organizationId || undefined}
        data-organization-match={organizationShellContext.organizationMatch ? 'true' : 'false'}
        className={`mn-sidebar hidden md:block fixed inset-y-0 left-0 z-40 shadow-lg transition-all duration-300 border-r border-white/10 w-16 ${sidebarCollapsed ? 'xl:w-16' : 'xl:w-64'}`}
        style={{ backgroundColor: shellChrome.secondaryColor, ...organizationShellCssVars(shellChrome) }}
      >
        <div className="flex flex-col h-full">
          {/* Logo e botão de toggle */}
          <div className="mn-sidebar-top flex items-center justify-between h-16 px-2 xl:px-4 border-b border-white/10">
            <div className={`mn-sidebar-label flex items-center ${sidebarCollapsed ? 'xl:hidden' : ''}`}>
              <img
                src={sidebarOrganizationLogoSrc}
                alt={`${sidebarOrganizationLogoAlt} Logo`}
                className="h-6 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`p-2 rounded-md transition-colors xl:hidden ${organizationShellIconButtonClass(shellChrome, 'text-[#E8EDED] hover:bg-white/10')}`}
                onClick={() => setTabletNavOpen((open) => !open)}
                aria-label={tabletNavOpen ? 'Fechar menu' : 'Abrir menu'}
                title="Menu"
              >
                {tabletNavOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <button
                type="button"
                className={`hidden xl:flex p-2 rounded-md transition-colors ${organizationShellIconButtonClass(shellChrome, 'text-[#E8EDED] hover:bg-white/10')}`}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {sidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
              </button>
            </div>
          </div>

          {/* User info */}
          <div className={`mn-sidebar-label px-4 py-4 border-b border-white/10 ${sidebarCollapsed ? 'xl:hidden' : ''}`}>
              <div className="mb-2">
                <p className={organizationShellForegroundClass(shellChrome, 'text-sm font-semibold text-[#E8EDED]')}>Bem-vindo,</p>
                <div className="flex items-center gap-2">
                  <p className={organizationShellForegroundClass(shellChrome, 'text-sm font-semibold text-[#E8EDED]')}>
                    {nutricionista?.nome || user?.displayName || 'Nutricionista'}
                  </p>
                  {nutricionista && (
                    nutricionista.isVerificado ? (
                      <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Shield className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={organizationShellBadgeClass(shellChrome, 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#4CCB7A]/20 text-[#4CCB7A] border border-[#4CCB7A]/40')}>Nutricionista</span>
                {agregadoNutri && agregadoNutri.count > 0 && (
                  <button
                    onClick={async () => {
                      const id = nutricionista?.userId || nutricionista?.id;
                      if (!id) return;
                      setDetalhamentoVisualizar(null);
                      setShowModalClassificacaoVisualizar(true);
                      const det = await ClassificacaoProfissionalService.getDetalhamento('nutricionista', id);
                      setDetalhamentoVisualizar(det);
                    }}
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                    title="Ver detalhes das avaliações"
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} className={s <= Math.round(agregadoNutri.media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    ))}
                    <span className={organizationShellForegroundClass(shellChrome, 'text-xs text-[#E8EDED]/70')}>{agregadoNutri.count} • {agregadoNutri.media.toFixed(1)}</span>
                  </button>
                )}
              </div>
            </div>

          {/* Navigation */}
          <nav className={`mn-sidebar-nav flex-1 py-4 space-y-2 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            <button
              onClick={() => navegarMenuPrincipal('home')}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'home'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Dashboard"
            >
              <LayoutDashboard size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Dashboard</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('leads')}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'leads'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Leads"
            >
              <Kanban size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Leads</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('medicos')}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'medicos'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Médicos"
            >
              <Stethoscope size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Médicos</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('pacientes')}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors relative ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'pacientes'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Pacientes"
            >
              <Users size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Pacientes</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('financeiro')}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'financeiro'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Financeiro"
            >
              <DollarSign size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Financeiro</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('calendario')}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'calendario'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Calendário"
            >
              <Calendar size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Calendário</span>
            </button>
            <button
              onClick={() => {
                navegarMenuPrincipal('comunicacao');
                void loadPacientesList();
                void loadMedicosVinculados();
              }}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'comunicacao'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Comunicação"
            >
              <Mail size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Comunicação</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('alimentos')}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'alimentos'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Alimentos"
            >
              <Apple size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Alimentos</span>
            </button>
            <div className="relative overflow-visible">
              <button
              onClick={() => {
                fecharVisualizarPacienteModal();
                setMeuPerfilAba('whatsapp');
                setActiveMenu('meu-perfil');
                setTabletNavOpen(false);
              }}
              className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'meu-perfil' && meuPerfilAba === 'whatsapp'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="WhatsApp"
            >
              <MessageCircle size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>WhatsApp</span>
            </button>
              {showWhatsappConnectHint ? (
                <WhatsappConnectHintBalloon align={sidebarCollapsed ? 'center' : 'start'} />
              ) : null}
            </div>
          </nav>

          {/* Profile button */}
          <div className={`mn-sidebar-footer py-4 border-t border-white/10 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={`mn-sidebar-item w-full flex items-center py-2 text-sm font-medium ${organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')} rounded-md transition-colors ${
                  sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                }`}
                title="Perfil"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className={`mn-sidebar-item-icon w-8 h-8 rounded-full flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`}
                  />
                ) : (
                  <UserCircle size={sidebarCollapsed ? 24 : 20} className={`mn-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                )}
                <span className={`mn-sidebar-label flex flex-1 items-center ${sidebarCollapsed ? 'xl:hidden' : ''}`}>
                  <span className="flex-1 text-left">Perfil</span>
                  <ChevronDown size={16} className={showProfileDropdown ? 'rotate-180' : ''} />
                </span>
              </button>
              {showProfileDropdown && (
                <div className={`mn-profile-dropdown absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[280px] ${
                  sidebarCollapsed ? 'xl:left-full xl:right-auto xl:bottom-0 xl:mb-0 xl:ml-2' : ''
                }`}>
                  {/* Header com foto, nome e email */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <UserCircle size={24} className="text-gray-600 dark:text-gray-300" />
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
                        fecharVisualizarPacienteModal();
                        setMeuPerfilAba('dados'); setActiveMenu('meu-perfil');
                        setShowProfileDropdown(false);
                        setTabletNavOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <UserCircle size={16} className="text-gray-600 dark:text-gray-400" />
                      Meu Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowLinkModal(true);
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <LinkIcon size={16} className="text-gray-600 dark:text-gray-400" />
                      Meu Link
                    </button>
                  </div>
                  
                  {/* Separador */}
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>
                  
                  {/* Sair */}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div
        className={`flex-1 min-w-0 max-w-full transition-all duration-300 pb-20 md:pb-0 md:pl-16 bg-gray-50 dark:bg-gray-900 ${
          sidebarCollapsed ? 'xl:pl-16' : 'xl:pl-64'
        }`}
      >
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1 min-w-0">
              {/* Logo nutricionista, logo verificação, nome e tipo */}
              {nutricionista && (
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-2">
                    <OrganizationShellMobileMark
                      organizationId={organizationShellContext.organizationId}
                      logoSrc={headerOrganizationLogoSrc}
                      alt={sidebarOrganizationLogoAlt}
                    >
                      <UtensilsCrossed className="h-6 w-6 text-green-600 flex-shrink-0" />
                    </OrganizationShellMobileMark>
                    {nutricionista.isVerificado ? (
                      <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <Shield className="h-4 w-4 text-red-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {nutricionista.nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-white truncate">Nutricionista</span>
                      {agregadoNutri && agregadoNutri.count > 0 && (
                        <button
                          onClick={async () => {
                            const id = nutricionista?.userId || nutricionista?.id;
                            if (!id) return;
                            setDetalhamentoVisualizar(null);
                            setShowModalClassificacaoVisualizar(true);
                            const det = await ClassificacaoProfissionalService.getDetalhamento('nutricionista', id);
                            setDetalhamentoVisualizar(det);
                          }}
                          className="flex items-center gap-0.5 cursor-pointer hover:opacity-80"
                          title="Ver detalhes das avaliações"
                        >
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={10} className={s <= Math.round(agregadoNutri.media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                          ))}
                          <span className="text-xs text-gray-500 ml-0.5">{agregadoNutri.media.toFixed(1)} ({agregadoNutri.count})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="relative overflow-visible">
                <button
                  type="button"
                  onClick={() => {
                    fecharVisualizarPacienteModal();
                    setMeuPerfilAba('whatsapp');
                setActiveMenu('meu-perfil');
                  }}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-6 w-6" />
                </button>
                {showWhatsappConnectHint ? (
                  <WhatsappConnectHintBalloon align="end" />
                ) : null}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <UserCircle className="h-6 w-6" />
                  )}
                </button>
                {showProfileDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 min-w-[280px]">
                      {/* Header com foto, nome e email */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                          {user?.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="Profile"
                              className="w-12 h-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <UserCircle size={24} className="text-gray-600 dark:text-gray-300" />
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
                            fecharVisualizarPacienteModal();
                            setMeuPerfilAba('dados'); setActiveMenu('meu-perfil');
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <UserCircle size={16} className="text-gray-600 dark:text-gray-400" />
                          Meu Perfil
                        </button>
                        <button
                          onClick={() => {
                            fecharVisualizarPacienteModal();
                            navegarMenuPrincipal('medicos');
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 lg:hidden"
                        >
                          <Stethoscope size={16} className="text-gray-600 dark:text-gray-400" />
                          Médicos
                        </button>
                        <button
                          onClick={() => {
                            setShowMensagensComunicacaoModal(true);
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 lg:hidden"
                        >
                          <Mail size={16} className="text-gray-600 dark:text-gray-400" />
                          Mensagens
                        </button>
                        <button
                          onClick={() => {
                            setShowLinkModal(true);
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <LinkIcon size={16} className="text-gray-600 dark:text-gray-400" />
                          Meu Link
                        </button>
                      </div>
                      
                      {/* Separador */}
                      <div className="border-t border-gray-200 dark:border-gray-700"></div>
                      
                      {/* Sair */}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Notificação de Perfil Incompleto */}
        {nutricionista && (() => {
          const perfilIncompleto = !nutricionista.registroNumero ||
                                   !nutricionista.registroNumero.trim() ||
                                   !nutricionista.telefone ||
                                   !nutricionista.telefone.trim() ||
                                   (nutricionista.cidades?.length ?? 0) < 1;
          const semVinculo = !nutricionista.medicoVinculadoIds || 
                            nutricionista.medicoVinculadoIds.length === 0;
          
          if (perfilIncompleto || semVinculo) {
            return (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-6 mb-0">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Complete seu perfil para começar
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        {perfilIncompleto && (
                          <li>
                            <button
                              onClick={() => {
                                fecharVisualizarPacienteModal();
                                setMeuPerfilAba('dados');
                                setActiveMenu('meu-perfil');
                              }}
                              className="underline hover:text-yellow-900 font-medium"
                            >
                              Edite seu perfil
                            </button>
                            {' '}e adicione seu registro e cidades de atendimento
                          </li>
                        )}
                        {semVinculo && (
                          <li>
                            <button
                              onClick={() => {
                                navegarMenuPrincipal('medicos');
                                setAbaAtivaMedicos('buscar');
                              }}
                              className="underline hover:text-yellow-900 font-medium"
                            >
                              Vincule-se a um médico
                            </button>
                            {' '}para receber pacientes compartilhados
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}
        
        {/* Content Area */}
        <main className={`${['home', 'pacientes', 'leads', 'financeiro', 'calendario'].includes(activeMenu) ? 'px-2 py-6 sm:p-6' : 'p-6'} bg-gray-50 dark:bg-gray-900`}>
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Fixed at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50"
        style={organizationShellCssVars(shellChrome)}
      >
        <div className="flex items-center justify-around py-2 px-1">
          <button
            onClick={() => navegarMenuPrincipal('home')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'home'
                ? organizationShellActiveClass(shellChrome, 'bg-green-100 text-green-700', 'light')
                : 'text-gray-600'
            }`}
          >
            <Home className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => navegarMenuPrincipal('leads')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'leads'
                ? organizationShellActiveClass(shellChrome, 'bg-green-100 text-green-700', 'light')
                : 'text-gray-600'
            }`}
          >
            <Kanban className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Leads</span>
          </button>

          <button
            onClick={() => navegarMenuPrincipal('pacientes')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'pacientes'
                ? organizationShellActiveClass(shellChrome, 'bg-green-100 text-green-700', 'light')
                : 'text-gray-600'
            }`}
          >
            <Users className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Pacientes</span>
          </button>

          <button
            onClick={() => navegarMenuPrincipal('financeiro')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'financeiro'
                ? organizationShellActiveClass(shellChrome, 'bg-green-100 text-green-700', 'light')
                : 'text-gray-600'
            }`}
          >
            <DollarSign className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Financeiro</span>
          </button>

          <button
            onClick={() => navegarMenuPrincipal('calendario')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'calendario'
                ? organizationShellActiveClass(shellChrome, 'bg-green-100 text-green-700', 'light')
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Calendário</span>
          </button>
        </div>
      </div>

      {/* Modal Meu Link */}
      {/* Modal Mensagens (mobile — mesmo canal da Comunicação desktop) */}
      {showMensagensComunicacaoModal && nutricionista && user && (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/50 lg:items-center lg:p-4">
          <div className="flex h-full w-full flex-col overflow-hidden bg-white lg:h-[min(90vh,820px)] lg:max-w-5xl lg:rounded-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-gray-900">Mensagens</h2>
                <p className="truncate text-sm text-gray-500">
                  Médicos, pacientes e personais vinculados
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMensagensComunicacaoModal(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-2 sm:p-3">
              <OrganizacaoComunicacaoGmailPanel
                organizationId={METODO_ORGANIZATION_ID}
                currentUser={{
                  userId: user.uid,
                  role: 'nutricionista',
                  profileId: nutricionista.id || user.uid,
                  nome: nutricionista.nome || user.displayName || 'Nutricionista',
                  email: user.email || nutricionista.email || '',
                  fotoUrl: nutricionista.fotoPerfilUrl || perfilFotoUrl || null,
                  subtitle: nutricionista.registroNumero
                    ? `CRN ${nutricionista.registroNumero}`
                    : null,
                }}
                loadDestinatarios={() =>
                  loadDestinatariosMetanutri({
                    nutricionistaUserId: user.uid,
                    nutricionistaProfileId: nutricionista.id || user.uid,
                    pacientes: pacientesVisiveis.map((p) => p.paciente),
                    pacientesPorMedicoId: Object.fromEntries(
                      pacientesVisiveis
                        .filter((p) => p.paciente?.id && p.medicoId)
                        .map((p) => [p.paciente.id, p.medicoId])
                    ),
                    medicosVinculados: medicosList,
                    medicoVinculadoIds: nutricionista.medicoVinculadoIds || [],
                    organizationId: nutricionista.organizationId || METODO_ORGANIZATION_ID,
                  })
                }
                assinaturaDefaults={{
                  role: 'nutricionista',
                  displayName: nutricionista.nome || user.displayName || 'Nutricionista',
                  registro: nutricionista.registroNumero
                    ? `CRN ${nutricionista.registroNumero}`
                    : null,
                  telefone: nutricionista.telefone || null,
                  email: nutricionista.email || user.email || null,
                  logoUrl: resolveAssinaturaLogoUrl({
                    logoMainUrl: organizationShellBranding?.logoMainUrl,
                    shellLogoUrl: sidebarOrganizationLogoSrc,
                  }),
                }}
                onNotify={(msg) => alert(msg)}
                onAbrirPacienteAnexo={(anexo) => void abrirPacienteAnexoComunicacao(anexo)}
                hideHeaderTitle
                className="h-full min-h-0 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <LinkIcon size={20} className="text-green-600" />
                Meu Link
              </h3>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkReferralGerado('');
                  setMedicoSelecionadoReferral('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-700">
                Gere um link para indicar pacientes a um médico. O paciente será redirecionado para solicitar acompanhamento com o médico escolhido.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione um médico para indicação
                </label>
                {loadingMedicos ? (
                  <div className="text-sm text-gray-500">Carregando médicos...</div>
                ) : (
                  <select
                    value={medicoSelecionadoReferral}
                    onChange={(e) => {
                      setMedicoSelecionadoReferral(e.target.value);
                      setLinkReferralGerado('');
                      setLinkCopiado(false);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Selecione um médico</option>
                    {medicosVerificados
                      .filter(m => nutricionista.medicoVinculadoIds.includes(m.id))
                      .map((medico) => (
                        <option key={medico.id} value={medico.id}>
                          {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome} - CRM {medico.crm.estado} {medico.crm.numero}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {medicoSelecionadoReferral && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (!user || !medicoSelecionadoReferral || !nutricionista) return;
                      
                      // Buscar o médico selecionado
                      const medicoSelecionado = medicosVerificados.find(m => m.id === medicoSelecionadoReferral);
                      if (!medicoSelecionado) return;

                      // Função para gerar slug do nome
                      const gerarSlug = (nome: string): string => {
                        const normalizar = (str: string) => {
                          return str
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                            .toLowerCase()
                            .trim();
                        };
                        
                        const partesNome = nome.trim().split(/\s+/).filter(p => p.length > 0);
                        // Pegar primeiro nome e último sobrenome
                        return partesNome.length > 1
                          ? `${normalizar(partesNome[0])}-${normalizar(partesNome[partesNome.length - 1])}`
                          : normalizar(partesNome[0]);
                      };

                      const slugMedico = gerarSlug(medicoSelecionado.nome);
                      const slugNutricionista = gerarSlug(nutricionista.nome);
                      
                      const link = buildOrganizacaoPublicUrl(`/dr/${slugMedico}/${slugNutricionista}`);
                      setLinkReferralGerado(link);
                      setLinkCopiado(false);
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <LinkIcon size={18} />
                    Gerar Link
                  </button>

                  {linkReferralGerado && (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={linkReferralGerado}
                          readOnly
                          className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-700 min-w-0"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(linkReferralGerado);
                                setLinkCopiado(true);
                                setTimeout(() => setLinkCopiado(false), 2000);
                              } catch (error) {
                                console.error('Erro ao copiar link:', error);
                                setSaveMessage({ type: 'error', text: 'Erro ao copiar link.' });
                              }
                            }}
                            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                          >
                            <Copy size={18} className="flex-shrink-0" />
                            <span className="hidden sm:inline">{linkCopiado ? 'Copiado!' : 'Copiar'}</span>
                            <span className="sm:hidden">{linkCopiado ? '✓' : 'Copiar'}</span>
                          </button>
                          <button
                            onClick={() => {
                              window.open(linkReferralGerado, '_blank');
                            }}
                            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                          >
                            <ExternalLink size={18} className="flex-shrink-0" />
                            <span className="hidden sm:inline">Abrir</span>
                          </button>
                        </div>
                      </div>
                      {linkCopiado && (
                        <p className="text-sm text-green-600 text-center">Link copiado para a área de transferência!</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {abrindoPacienteLoading && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 backdrop-blur-[1px]" role="status" aria-live="polite" aria-label="Abrindo paciente">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-xl">
            <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            <span className="text-sm font-medium text-gray-800">Abrindo paciente...</span>
          </div>
        </div>
      )}

      {/* Modal Visualizar Paciente.
          Desktop: preenche a área de conteúdo (ao lado da sidebar), sem overlay.
          Mobile / estilo personal: tela cheia com abas horizontais. */}
      {showVisualizarPacienteModal && pacienteVisualizando && (() => {
        const modalPacienteTelaCheia = isMobile || modalVisualizacaoEstiloPersonal;
        const pastasModal = modalVisualizacaoEstiloPersonal
          ? [
              { id: 1, nome: 'Identificação', Icon: UserIcon },
              { id: 2, nome: 'Anamnese', Icon: ClipboardList },
              { id: 3, nome: 'Prontuário', Icon: FileText },
            ]
          : [
              { id: 1, nome: 'Identificação', Icon: UserIcon },
              { id: 2, nome: 'Anamnese', Icon: ClipboardList },
              { id: 3, nome: 'Prontuário', Icon: FileText },
              { id: 4, nome: 'Exames', Icon: FlaskConical },
              { id: 5, nome: 'Bio Impedância', Icon: Scale },
              { id: 6, nome: 'Evolução/Seguimento', Icon: Syringe },
              { id: 7, nome: 'Prescrições', Icon: Pill },
              { id: 8, nome: 'Nutrologia', Icon: UtensilsCrossed },
              { id: 14, nome: 'Psiquiatria', Icon: Brain },
              { id: 9, nome: 'Personal Trainer', Icon: Dumbbell },
              { id: 10, nome: 'Financeiro', Icon: DollarSign },
            ];
        return (
        <div
          className={
            modalPacienteTelaCheia
              ? 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-0'
              : `fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 md:bg-transparent md:p-0 md:items-stretch md:justify-start md:transition-[left] md:duration-300 md:left-16 ${
                  sidebarCollapsed ? 'xl:left-16' : 'xl:left-64'
                }`
          }
          role="dialog"
          aria-modal="true"
          aria-label="Detalhes do paciente"
        >
          <div
            className={
              modalPacienteTelaCheia
                ? 'bg-white w-full h-full overflow-hidden flex flex-col shadow-xl'
                : 'bg-white rounded-lg w-full min-w-0 max-w-7xl h-[90vh] overflow-hidden flex flex-col shadow-xl md:rounded-none md:max-w-none md:h-full md:w-full md:shadow-none md:border-l md:border-gray-200'
            }
          >
            <PacienteModalHeader
              compact={modalPacienteTelaCheia}
              className={modalPacienteTelaCheia ? 'sticky top-0 z-10' : ''}
              patientName={
                pacienteVisualizando.dadosIdentificacao?.nomeCompleto ||
                pacienteVisualizando.nome ||
                'Paciente'
              }
              patientPhotoUrl={
                pacienteVisualizando.userId
                  ? patientPhotoByUserId[pacienteVisualizando.userId]
                  : null
              }
              dataNascimento={pacienteVisualizando.dadosIdentificacao?.dataNascimento}
              cidade={pacienteVisualizando.dadosIdentificacao?.endereco?.cidade}
              estado={pacienteVisualizando.dadosIdentificacao?.endereco?.estado}
              statusTratamento={pacienteVisualizando.statusTratamento}
              relatorioPacienteId={pacienteVisualizando.id || null}
              medicoLabel={medicoResponsavelModalLabel}
              beforeStatusDesktopOnly={false}
              beforeStatus={
                pacienteVisualizando.id ? (
                  modalPacienteTelaCheia ? (
                    <MetanutriPacienteWelcomeActions
                      pacienteId={pacienteVisualizando.id}
                      phone={pacienteVisualizando.dadosIdentificacao?.telefone}
                      telefoneDdi={pacienteVisualizando.dadosIdentificacao?.telefoneDdi}
                      telefoneE164={pacienteVisualizando.dadosIdentificacao?.telefoneE164}
                      iconOnly
                    />
                  ) : (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {user?.uid ? (
                        <PacienteHeaderLembretes
                          pacienteId={pacienteVisualizando.id}
                          pacienteNome={
                            pacienteVisualizando.dadosIdentificacao?.nomeCompleto ||
                            pacienteVisualizando.nome ||
                            'Paciente'
                          }
                          lembretes={lembretes}
                          pacientes={pacientesVisiveis.map((p) => p.paciente)}
                          nutricionistaId={user.uid}
                          audience="nutricionista"
                          tags={LEMBRETE_TAGS_NUTRI}
                          defaultTelefoneAviso={telefoneContato || nutricionista?.telefone}
                          defaultTelefoneAvisoDdi={telefoneDdiContato || nutricionista?.telefoneDdi}
                          defaultTelefoneAvisoPais={telefonePaisContato || nutricionista?.telefonePais}
                          elevatedZIndex
                          onMutate={mutateLembretes}
                        />
                      ) : null}
                      <MetanutriPacienteWelcomeActions
                        pacienteId={pacienteVisualizando.id}
                        phone={pacienteVisualizando.dadosIdentificacao?.telefone}
                        telefoneDdi={pacienteVisualizando.dadosIdentificacao?.telefoneDdi}
                        telefoneE164={pacienteVisualizando.dadosIdentificacao?.telefoneE164}
                      />
                    </div>
                  )
                ) : null
              }
              onClose={fecharVisualizarPacienteModal}
            />

            <div className="flex flex-1 min-h-0 overflow-hidden relative">
              {/* Menu lateral das pastas: no tablet (lg–xl) só ícones + sanduíche; no desktop (xl+) completo */}
              {!modalPacienteTelaCheia && (
                <>
                  {tabletPastasOpen ? (
                    <div
                      className="absolute inset-0 z-10 bg-black/20 hidden lg:block xl:hidden"
                      aria-hidden="true"
                      onClick={() => setTabletPastasOpen(false)}
                    />
                  ) : null}
                  <aside
                    data-mn-pastas-open={tabletPastasOpen ? '' : undefined}
                    className="mn-pastas hidden lg:flex w-16 xl:w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white relative z-20"
                  >
                    <div className="mn-pastas-top flex items-center justify-center h-12 px-2 border-b border-gray-200 xl:hidden">
                      <button
                        type="button"
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                        onClick={() => setTabletPastasOpen((open) => !open)}
                        aria-label={tabletPastasOpen ? 'Fechar pastas' : 'Abrir pastas'}
                        title="Pastas"
                      >
                        {tabletPastasOpen ? <X size={20} /> : <Menu size={20} />}
                      </button>
                    </div>
                    <nav className="mn-pastas-nav flex-1 py-2 xl:py-4 px-2 xl:px-3 space-y-1 overflow-y-auto">
                      {pastasModal.map(({ id, nome, Icon }) => {
                        const ativa = pastaAtiva === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            title={nome}
                            aria-label={nome}
                            aria-current={ativa ? 'page' : undefined}
                            onClick={() => {
                              setPastaAtiva(id);
                              setTabletPastasOpen(false);
                            }}
                            className={`mn-pastas-item w-full flex items-center justify-center xl:justify-start min-h-11 px-0 xl:px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              ativa
                                ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon size={18} className="mn-pastas-item-icon flex-shrink-0 xl:mr-3" />
                            <span className="mn-pastas-label hidden xl:inline truncate text-left">{nome}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </aside>
                </>
              )}

              <div className="flex flex-1 min-h-0 flex-col overflow-hidden min-w-0">
                {/* Tabs horizontais: mobile / estilo personal; no desktop embutido ficam ocultas (menu lateral) */}
                <div
                  className={`flex border-b border-gray-200 flex-shrink-0 bg-white w-full ${
                    modalVisualizacaoEstiloPersonal ? '' : 'overflow-x-auto'
                  } ${modalPacienteTelaCheia ? '' : 'lg:hidden'}`}
                >
                  {pastasModal.map(({ id, nome }) => (
                    <button
                      key={id}
                      onClick={() => setPastaAtiva(id)}
                      className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                        modalVisualizacaoEstiloPersonal
                          ? 'flex-1 min-w-0 px-2 text-center'
                          : 'px-4 whitespace-nowrap'
                      } ${
                        pastaAtiva === id
                          ? 'border-green-500 text-green-700 bg-green-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {nome}
                    </button>
                  ))}
                </div>

            {/* Conteúdo da Pasta Ativa */}
            <div
              className={`flex-1 min-h-0 ${
                (pastaAtiva === 3 || pastaAtiva === 4 || pastaAtiva === 7 || pastaAtiva === 8 || pastaAtiva === 9 || pastaAtiva === 10 || pastaAtiva === 14) && !modalPacienteTelaCheia
                  ? 'overflow-y-auto lg:overflow-hidden p-4 flex flex-col'
                  : modalPacienteTelaCheia
                    ? 'overflow-y-auto p-4'
                    : 'overflow-y-auto p-6'
              }`}
            >
              {pastaAtiva === 1 && (
                <PacienteIdentificacaoTabContent
                  paciente={pacienteVisualizando}
                  medicoResponsavelLabel={medicoResponsavelModalLabel}
                />
              )}

              {pastaAtiva === 2 && (
                <PacienteDadosClinicosTabContent
                  paciente={pacienteVisualizando}
                  allowGerarAnaliseInteligente={false}
                />
              )}

              {pastaAtiva === 3 && pacienteVisualizando && (
                <ProntuarioNutriTab
                  paciente={pacienteVisualizando}
                  pacienteId={pacienteVisualizando.id}
                  nutricionistaId={nutricionista?.userId || nutricionista?.id}
                  fillHeight={!modalPacienteTelaCheia}
                  mobileMode={modalPacienteTelaCheia}
                  onIrParaAba={(aba) => {
                    setPastaAtiva(aba);
                    if (aba === 4) setExamesNutriSubpasta('laboratoriais');
                  }}
                />
              )}

              {/* Aba 4: Exames (Laboratoriais + Imagem) — desktop: datas | resultados */}
              {pastaAtiva === 4 && pacienteVisualizando && (() => {
                const pExames = pacienteVisualizando;
                const exames = pExames.examesLaboratoriais || [];
                const safeDateToString = (date: any): string => {
                  if (!date) return '';
                  try {
                    let d: Date;
                    if (date instanceof Date) d = date;
                    else if (typeof date === 'string') d = new Date(date);
                    else if ((date as any).toDate) d = (date as any).toDate();
                    else d = new Date(date);
                    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
                  } catch { return ''; }
                };
                const formatExameDateLabel = (dateKey: string): string => {
                  const [y, m, d] = dateKey.split('-').map(Number);
                  if (!y || !m || !d) return dateKey;
                  const date = new Date(y, m - 1, d);
                  return date
                    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
                    .replace(/\./g, '')
                    .replace(/\s+/g, ' ');
                };
                const formatExameDateLong = (dateKey: string): string => {
                  const [y, m, d] = dateKey.split('-').map(Number);
                  if (!y || !m || !d) return dateKey;
                  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });
                };
                const examesOrdenados = [...exames].sort((a, b) => {
                  const dA = safeDateToString(a.dataColeta);
                  const dB = safeDateToString(b.dataColeta);
                  return dB.localeCompare(dA);
                }).filter(e => safeDateToString(e.dataColeta));
                const dataInicial = examesOrdenados[0] ? safeDateToString(examesOrdenados[0].dataColeta) : '';
                const dataSelecionada = exameDataSelecionadaNoModal || dataInicial;
                const exameRaw = exames.find((e: any) => safeDateToString(e.dataColeta) === dataSelecionada) || examesOrdenados[0] || {};
                const getHemogramaVal = (ex: any, f: string) => (ex?.hemogramaCompleto?.[f] ?? ex?.[f]) || null;
                const exameSelecionado = {
                  ...exameRaw,
                  hemoglobina: getHemogramaVal(exameRaw, 'hemoglobina'),
                  plaquetas: getHemogramaVal(exameRaw, 'plaquetas'),
                  leucocitos: getHemogramaVal(exameRaw, 'leucocitos')
                };
                const pacienteSex = pacienteVisualizando.dadosIdentificacao?.sexoBiologico as Sex;
                const patientLabSections = buildPatientLabSectionsFromOrder(
                  labOrderBySecaoConfig,
                  EXAME_LABORATORIAL_KEY_TO_FIELD,
                  labLimitOverrides,
                  labSectionLabels
                );
                const dadosGrafico = examesOrdenados.map((exame: any) => {
                  const dataExame = safeDateToString(exame.dataColeta);
                  const base: Record<string, unknown> = { data: dataExame };
                  const er = exame as Record<string, unknown>;
                  for (const sec of patientLabSections) {
                    for (const campo of sec.fields) {
                      base[campo.field] = getExameCampoNumerico(er, campo.field);
                    }
                  }
                  return base;
                }).reverse();
                const campoTemAlgumValor = (fieldKey: string) => {
                  return exames.some((exame: any) => {
                    let v;
                    if (['hemoglobina', 'plaquetas', 'leucocitos'].includes(fieldKey)) v = exame.hemogramaCompleto?.[fieldKey] ?? exame[fieldKey];
                    else v = exame[fieldKey];
                    return v !== null && v !== undefined && v !== '';
                  });
                };
                return (
                  <div className="flex flex-col gap-4 min-h-0 h-full w-full">
                    <div className="flex w-full justify-center gap-3 sm:gap-4 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExamesNutriSubpasta('laboratoriais')}
                        className={`flex-1 min-h-[3.25rem] sm:min-h-[3.5rem] flex items-center justify-center text-center px-3 sm:px-6 py-3 text-sm sm:text-base font-bold rounded-xl border-2 transition-colors shadow-sm ${
                          examesNutriSubpasta === 'laboratoriais'
                            ? 'border-green-600 bg-green-100 text-green-900 ring-2 ring-green-300/70'
                            : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Exames Laboratoriais
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamesNutriSubpasta('imagem')}
                        className={`flex-1 min-h-[3.25rem] sm:min-h-[3.5rem] flex items-center justify-center text-center px-3 sm:px-6 py-3 text-sm sm:text-base font-bold rounded-xl border-2 transition-colors shadow-sm ${
                          examesNutriSubpasta === 'imagem'
                            ? 'border-green-600 bg-green-100 text-green-900 ring-2 ring-green-300/70'
                            : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Exames de Imagem
                      </button>
                    </div>

                    {examesNutriSubpasta === 'imagem' && (
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <ExamesImagemPacientePanel
                          pacienteId={pExames.id}
                          nomePacienteProntuario={
                            pExames.dadosIdentificacao?.nomeCompleto || pExames.nome || ''
                          }
                          examesDeImagem={pExames.examesDeImagem}
                          onAdicionarExame={() => {}}
                          onRemoverExame={() => {}}
                          confirmarNomePacienteDoAnexo={async () => true}
                          somenteLeitura
                          layout="datesSplit"
                        />
                      </div>
                    )}

                    {examesNutriSubpasta === 'laboratoriais' && (
                      examesOrdenados.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                            <div>
                              <h4 className="text-lg font-semibold text-amber-900 mb-2">Nenhum exame cadastrado</h4>
                              <p className="text-sm text-amber-800">Os exames laboratoriais do paciente aparecerão aqui quando forem registrados pelo médico responsável.</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(9rem,0.5fr)_minmax(0,1.5fr)] gap-4 lg:gap-5 lg:items-stretch min-w-0 flex-1 min-h-0">
                          {/* Coluna: datas */}
                          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col lg:min-h-[28rem] max-h-[min(40vh,22rem)] lg:max-h-none">
                            <div className="shrink-0 border-b border-gray-200 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 px-4 py-3">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Datas dos exames
                              </p>
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                {examesOrdenados.length} registro{examesOrdenados.length === 1 ? '' : 's'}
                              </p>
                            </div>
                            <nav
                              className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-2 px-2 space-y-0.5"
                              aria-label="Datas de exames laboratoriais"
                            >
                              {examesOrdenados.map((exame: any, idx: number) => {
                                const dataExame = safeDateToString(exame.dataColeta);
                                const ativo = dataExame === dataSelecionada;
                                return (
                                  <button
                                    key={`lab-date-${dataExame}-${idx}`}
                                    type="button"
                                    onClick={() => setExameDataSelecionadaNoModal(dataExame)}
                                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                                      ativo
                                        ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-500/30'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <span className="block text-sm font-medium capitalize leading-tight">
                                      {formatExameDateLabel(dataExame)}
                                    </span>
                                    <span className="block text-[10px] text-gray-500 mt-0.5 tabular-nums">
                                      {dataExame.split('-').reverse().join('/')}
                                    </span>
                                  </button>
                                );
                              })}
                            </nav>
                          </div>

                          {/* Coluna: resultados */}
                          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col lg:min-h-[28rem]">
                            <div className="shrink-0 border-b border-gray-200 bg-gradient-to-r from-teal-50/50 via-white to-emerald-50/40 px-4 py-3">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Resultados
                              </p>
                              <p className="text-sm font-semibold text-gray-900 mt-0.5 capitalize">
                                {dataSelecionada ? formatExameDateLong(dataSelecionada) : 'Selecione uma data'}
                              </p>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-1.5 text-sm">
                              {(() => {
                                const idxAtual = examesOrdenados.findIndex(
                                  (e: any) => safeDateToString(e.dataColeta) === dataSelecionada
                                );
                                const exameAnterior =
                                  idxAtual >= 0 && idxAtual < examesOrdenados.length - 1
                                    ? examesOrdenados[idxAtual + 1]
                                    : null;
                                const campoTemValorNaDataSelecionada = (fieldKey: string) => {
                                  const er = exameSelecionado as Record<string, unknown>;
                                  let v: unknown;
                                  if (['hemoglobina', 'plaquetas', 'leucocitos'].includes(fieldKey)) {
                                    v = (exameRaw as any)?.hemogramaCompleto?.[fieldKey] ?? er[fieldKey];
                                  } else {
                                    v = er[fieldKey];
                                  }
                                  return v !== null && v !== undefined && v !== '';
                                };
                                const toggleSecaoExamesPasta = (secaoId: string) => {
                                  setSecoesExamesPastaExpandidas((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(secaoId)) next.delete(secaoId);
                                    else next.add(secaoId);
                                    return next;
                                  });
                                };
                                const allScores = patientLabSections.map((secao) =>
                                  calculateSectionMetabolicScore({
                                    sectionKey: secao.sectionId,
                                    examKeys: secao.fields.map((f) => f.key),
                                    labValues: exameSelecionado as Record<string, unknown>,
                                    sex: pacienteSex,
                                    dob: pacienteVisualizando?.dadosIdentificacao?.dataNascimento,
                                    limitOverrides: labLimitOverrides,
                                    sectionLabel: secao.section,
                                  })
                                );
                                const scoredSections = allScores.filter((s) => s.score !== null);
                                const globalAvg =
                                  scoredSections.length > 0
                                    ? Math.round(
                                        scoredSections.reduce((sum, s) => sum + (s.score ?? 0), 0) /
                                          scoredSections.length
                                      )
                                    : null;
                                const patientName =
                                  pacienteVisualizando?.dadosIdentificacao?.nomeCompleto ||
                                  pacienteVisualizando?.nome ||
                                  'Paciente';
                                return (
                                  <>
                                    <LabPatientHeaderCard
                                      patientName={patientName}
                                      dateLabel={
                                        dataSelecionada ? formatExameDateLong(dataSelecionada) : null
                                      }
                                      score={globalAvg}
                                      patientPhotoUrl={
                                        pacienteVisualizando?.userId
                                          ? patientPhotoByUserId[pacienteVisualizando.userId]
                                          : null
                                      }
                                    />
                                    <LabMetabolicSummarySection scores={allScores} />

                                    {patientLabSections.map((secao) => {
                                      const camposComValor = secao.fields.filter((c) =>
                                        campoTemValorNaDataSelecionada(c.field)
                                      );
                                      if (camposComValor.length === 0) return null;

                                      const isColapsada = !secoesExamesPastaExpandidas.has(secao.sectionId);
                                      const secaoComExameForaDaFaixa = camposComValor.some((campo) => {
                                        const rangeToUse = getLabRange(
                                          campo.key as string,
                                          pacienteSex,
                                          pacienteVisualizando?.dadosIdentificacao?.dataNascimento,
                                          labLimitOverrides
                                        );
                                        if (!rangeToUse) return false;
                                        const min = Number(rangeToUse.min);
                                        const max = Number(rangeToUse.max);
                                        if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
                                        const valor = Number(
                                          (exameSelecionado as Record<string, unknown>)[campo.field]
                                        );
                                        if (!Number.isFinite(valor)) return false;
                                        return valor < min || valor > max;
                                      });
                                      const sectionScore = calculateSectionMetabolicScore({
                                        sectionKey: secao.sectionId,
                                        examKeys: secao.fields.map((f) => f.key),
                                        labValues: exameSelecionado as Record<string, unknown>,
                                        sex: pacienteSex,
                                        dob: pacienteVisualizando?.dadosIdentificacao?.dataNascimento,
                                        limitOverrides: labLimitOverrides,
                                        sectionLabel: secao.section,
                                      });

                                      return (
                                        <div
                                          key={secao.sectionId}
                                          className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/80 text-sm"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => toggleSecaoExamesPasta(secao.sectionId)}
                                            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 gap-y-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-emerald-50/40 px-3 py-2.5 text-left transition-colors hover:from-slate-50 hover:to-emerald-50/60"
                                          >
                                            <span
                                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                                secaoComExameForaDaFaixa
                                                  ? 'bg-red-50 text-red-500'
                                                  : 'bg-emerald-50 text-emerald-600'
                                              }`}
                                              aria-hidden
                                            >
                                              <Activity className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 whitespace-normal text-[15px] font-semibold leading-tight text-slate-800">
                                              {secao.section}
                                            </span>
                                            <LabSectionScoreBadge
                                              score={sectionScore.score}
                                              color={sectionScore.color}
                                            />
                                            {isColapsada ? (
                                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                                            )}
                                          </button>

                                          {!isColapsada && (
                                            <div className="space-y-3 p-2.5 sm:p-3">
                                              {camposComValor.map((campo) => {
                                                const rangeToUse = getLabRange(
                                                  campo.key as string,
                                                  pacienteSex,
                                                  pacienteVisualizando?.dadosIdentificacao?.dataNascimento,
                                                  labLimitOverrides
                                                );
                                                if (
                                                  !rangeToUse ||
                                                  !rangeToUse.label ||
                                                  rangeToUse.min === undefined ||
                                                  rangeToUse.max === undefined
                                                ) {
                                                  return null;
                                                }
                                                const value = (exameSelecionado as Record<string, unknown>)[
                                                  campo.field
                                                ] as number | undefined;
                                                const valorAtualTrend = getExameCampoNumerico(
                                                  exameRaw as Record<string, unknown>,
                                                  campo.field
                                                );
                                                const valorAnteriorTrend = exameAnterior
                                                  ? getExameCampoNumerico(
                                                      exameAnterior as Record<string, unknown>,
                                                      campo.field
                                                    )
                                                  : null;
                                                const labTrendDir =
                                                  valorAtualTrend != null && valorAnteriorTrend != null
                                                    ? bioTrendDir(valorAtualTrend, valorAnteriorTrend)
                                                    : 'none';

                                                return (
                                                  <LabResultCard
                                                    key={campo.field}
                                                    name={rangeToUse.label}
                                                    value={value ?? null}
                                                    unit={rangeToUse.unit}
                                                    examKey={campo.key}
                                                    range={rangeToUse}
                                                    trendDir={labTrendDir}
                                                    footer={
                                                      <>
                                                        {campo.key === 'egfr' && value != null && value < 15 && (
                                                          <p className="text-sm text-red-600">
                                                            ⚠️ Alerta crítico: eGFR &lt; 15
                                                          </p>
                                                        )}
                                                        {campo.key === 'calcitonin' &&
                                                          rangeToUse &&
                                                          value != null &&
                                                          value > rangeToUse.max && (
                                                            <p className="text-sm text-red-600">
                                                              ⚠️ Alerta MEN2: calcitonina elevada
                                                            </p>
                                                          )}
                                                        {['amylase', 'lipase'].includes(campo.key) &&
                                                          rangeToUse &&
                                                          value != null &&
                                                          value > rangeToUse.max && (
                                                            <p className="text-sm text-red-600">
                                                              ⚠️ Alerta: valor acima do máximo
                                                            </p>
                                                          )}
                                                      </>
                                                    }
                                                  >
                                                    {dadosGrafico.length > 0 &&
                                                    dadosGrafico.some((d: any) => d[campo.field] != null) ? (
                                                      <TrendLine
                                                        data={dadosGrafico}
                                                        dataKeys={[
                                                          {
                                                            key: campo.field,
                                                            name: rangeToUse.label,
                                                            stroke: '#10b981',
                                                            dot: true,
                                                          },
                                                        ]}
                                                        xKey="data"
                                                        height={180}
                                                        showLegend={false}
                                                        showValueLabels
                                                        premium
                                                        unitLabel={rangeToUse.unit || ''}
                                                        referenceBand={{
                                                          min: rangeToUse.min,
                                                          max: rangeToUse.max,
                                                        }}
                                                        formatter={(v: any) =>
                                                          v != null ? `${parseFloat(v).toFixed(1)}` : 'N/A'
                                                        }
                                                        referenceLines={[
                                                          {
                                                            value: rangeToUse.min,
                                                            label: `Min: ${rangeToUse.min}`,
                                                            stroke: '#94a3b8',
                                                            strokeDasharray: '4 6',
                                                          },
                                                          {
                                                            value: rangeToUse.max,
                                                            label: `Max: ${rangeToUse.max}`,
                                                            stroke: '#94a3b8',
                                                            strokeDasharray: '4 6',
                                                          },
                                                        ]}
                                                      />
                                                    ) : (
                                                      <div className="h-[120px] flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
                                                        <p className="text-xs text-gray-500">
                                                          Sem dados históricos
                                                        </p>
                                                      </div>
                                                    )}
                                                  </LabResultCard>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {exameSelecionado ? <LabStatusLegend className="mt-2" /> : null}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })()}

                            {/* Aba 5: Bio Impedância - padrão Exames: seções, Detalhes, Novo Registro */}
              {pastaAtiva === 5 && pacienteVisualizando && (() => {
                const p = pacienteVisualizando;
                const registros = p?.bioimpedanciaRegistros || [];
                const sexoBiologico = p?.dadosIdentificacao?.sexoBiologico ?? (p as any)?.dadosidentificacao?.sexobiologico;
                const imagemSrc = sexoBiologico === 'F' ? '/bioimpedancia/mulher-frente.png' : '/bioimpedancia/homem-frente.png';
                const imageAlt = sexoBiologico === 'F' ? 'Body map feminino' : 'Body map masculino';
                return (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bio Impedância</h3>
                    <BioImpedanciaDisplay
                      paciente={p}
                      registros={registros}
                      imagemSrc={imagemSrc}
                      imageAlt={imageAlt}
                      modoNutricionista
                      isMobile={isMobile}
                      formularioEmModal
                      onSalvo={async (novos) => {
                        await salvarBioImpedanciaRegistros(p.id, novos);
                        setPacienteVisualizando(prev => prev ? { ...prev, bioimpedanciaRegistros: novos } : null);
                        setPacientesVisiveis(prev => prev.map(item => item.paciente.id === p.id ? { ...item, paciente: { ...item.paciente, bioimpedanciaRegistros: novos } } : item));
                      }}
                    />
                  </div>
                );
              })()}

              {/* Aba Evolução/Seguimento — layout espelhado do metaadmin (somente leitura) */}
              {pastaAtiva === 6 && pacienteVisualizando && (
                <EvolucaoSeguimentoReadonlyView
                  paciente={pacienteVisualizando}
                  onOpenConclusao={(payload) => {
                    setRegistroConclusaoParaModal(payload);
                    setShowModalDetalheConclusao(true);
                  }}
                  onOpenGrafico={(p) => {
                    setPacienteParaGraficoRegistros(p);
                    setShowModalGraficoRegistros(true);
                  }}
                  onOpenFotos={(p) => abrirFotos(p)}
                  temFoto={!!fotosPorPacienteId[pacienteVisualizando.id]}
                />
              )}

              {/* Aba 6: Prescrições - usa pacientePrescricoesSelecionado (sincronizado com pacienteVisualizando na aba 6) */}
              {pastaAtiva === 7 && pacienteVisualizando && nutricionista && (
                <div className="flex flex-col flex-1 min-h-0 gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex-shrink-0">Prescrições</h3>
                  <PrescricaoBuscaCampo
                    itensRef={prescricoesBuscaFonteRef}
                    loading={loadingPrescricoesModal}
                    accent="green"
                    onSelect={abrirPrescricaoDaBusca}
                    className="flex-shrink-0"
                    actions={
                      <>
                        <button
                          type="button"
                          onClick={() => { setNovaPrescricaoContexto('desktop'); setShowModalGrupoNovaPrescricao(true); }}
                          className="flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700"
                        >
                          <Plus size={16} />
                          Nova
                        </button>
                        <button
                          type="button"
                          onClick={() => loadPrescricoesModal(pacienteVisualizando)}
                          className="flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
                        >
                          <RefreshCw size={16} />
                          Atualizar
                        </button>
                      </>
                    }
                  />
                  <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-lg overflow-hidden flex-shrink-0">
                    {(
                      [
                        { id: 'salvas' as const, label: 'Prescrições Salvas' },
                        { id: 'historico' as const, label: 'Histórico' },
                        { id: 'descricao' as const, label: 'Descrição', mobileOnly: true },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAbaPrescricoesModal(tab.id)}
                        className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                          'mobileOnly' in tab && tab.mobileOnly ? 'lg:hidden' : ''
                        } ${
                          abaPrescricoesModal === tab.id
                            ? 'border-b-2 border-emerald-500 text-emerald-700 bg-white'
                            : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-1 min-h-0 flex-col lg:flex-row lg:border lg:border-gray-200 lg:rounded-lg lg:overflow-hidden">
                    <div
                      className={`${
                        abaPrescricoesModal === 'descricao' ? 'hidden' : 'flex'
                      } lg:flex flex-col min-h-0 flex-1 lg:w-1/2 lg:border-r lg:border-gray-200 overflow-hidden`}
                    >
                  {loadingPrescricoesModal && abaPrescricoesModal !== 'historico' ? (
                    <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div><p className="mt-2 text-gray-600">Carregando prescrições...</p></div>
                  ) : abaPrescricoesModal === 'historico' ? (
                    <PrescricaoHistoricoTab
                      pacienteId={pacienteVisualizando.id}
                      accent="green"
                      refreshKey={historicoPrescricoesRefreshKey}
                      onEdit={abrirPrescricaoDoHistoricoParaEditar}
                      onReplicate={(p) => abrirPrescricaoDoHistoricoComoNova(p, pacienteVisualizando)}
                      className="flex-1 min-h-0 p-2 overflow-hidden flex flex-col"
                      maxHeightClassName="flex-1 min-h-0 max-h-none"
                    />
                  ) : (
                    <div className="space-y-2 flex-1 min-h-0 overflow-y-auto p-2">
                      {(!prescricoesModal || prescricoesModal.length === 0) ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500">Nenhuma prescrição no catálogo. Clique em &quot;Nova Prescrição&quot;.</p>
                        </div>
                      ) : (
                        groupBySubtipo(prescricoesModal || []).map(({ subtipo, items }) => (
                          <div key={subtipo} className="space-y-1">
                            <button type="button" onClick={() => setGruposPrescricoesExpandidosModal(prev => { const n = new Set(prev); if (n.has(subtipo)) n.delete(subtipo); else n.add(subtipo); return n; })} className="flex items-center gap-2 w-full text-left mt-3 mb-1 px-2 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 group">
                              {gruposPrescricoesExpandidosModal.has(subtipo) ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                              <span className="text-xs font-semibold text-gray-600">{subtipo} ({items.length})</span>
                            </button>
                            {gruposPrescricoesExpandidosModal.has(subtipo) && (
                              <div className="space-y-2">
                                {items.map((p) => {
                                  const isSelected = prescricaoSelecionadaModal?.id === p.id;
                                  const isTemp = p.id === 'temp-new';
                                  return (
                                    <button key={p.id} onClick={async () => {
                                      let paraEditar = p;
                                      if (p.isTemplate && pacienteVisualizando) {
                                        const peso = pacienteVisualizando.dadosClinicos?.medidasIniciais?.peso ?? pacienteVisualizando.evolucaoSeguimento?.[(pacienteVisualizando.evolucaoSeguimento?.length ?? 0) - 1]?.peso;
                                        if (!peso) { alert('Cadastre o peso do paciente.'); return; }
                                        const itensRecalculados = (p.itens || []).map((item) => {
                                          if (item.medicamento === 'Whey Protein') {
                                            const total = (peso * 1.6).toFixed(1), porRef = (peso * 1.6 / 3).toFixed(1);
                                            return { ...item, dosagem: `${total}g por dia (1,6g por kg)`, instrucoes: `Tomar ~${porRef}g 3x ao dia (total ${total}g/dia).`, quantidade: `${total}g/dia` };
                                          }
                                          if (item.medicamento === 'Creatina MAX' || (item.medicamento || '').includes('Creatina'))
                                            return { ...item, dosagem: '3,5g por dia', instrucoes: '3,5g/dia em 200ml de água.', quantidade: '3,5g/dia' };
                                          return item;
                                        });
                                        paraEditar = { ...p, itens: itensRecalculados, pesoPaciente: peso };
                                      }
                                      setPrescricaoSelecionadaModal(paraEditar);
                                      setPrescricaoEditandoModal(
                                        !paraEditar.isTemplate && !!paraEditar.pacienteId
                                          ? paraEditar
                                          : null
                                      );
                                      setNovaPrescricaoModal({ nome: paraEditar.nome, descricao: paraEditar.descricao || '', itens: paraEditar.itens || [], observacoes: paraEditar.observacoes || '' });
                                      irParaDescricaoSeMobile();
                                    }} className={`w-full text-left px-3 py-3 rounded-xl border shadow-sm transition-all ${isSelected ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : isTemp ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50/80' : p.isTemplate ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/80' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
                                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-green-900' : 'text-gray-900'}`}>{getTituloExibicao(p.nome)}</p>
                                      {isTemp && <p className="text-xs text-amber-600 mt-1">✏️ Em edição</p>}
                                      {p.isTemplate && !isTemp && <p className="text-xs text-blue-600 mt-1">📋 Padrão</p>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                    </div>
                    <div
                      className={`${
                        abaPrescricoesModal === 'descricao' ? 'flex' : 'hidden'
                      } lg:flex flex-col min-h-0 flex-1 overflow-y-auto p-4 lg:p-5`}
                    >
                    {prescricaoSelecionadaModal ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-6 lg:border-0 lg:rounded-none lg:p-0">
                        {prescricaoSelecionadaModal.id === 'temp-new' && (
                          <div className="mb-4 px-3 py-2 bg-yellow-100 border border-yellow-200 rounded-md">
                            <p className="text-xs font-medium text-yellow-800">✏️ Prescrição temporária - Preencha os dados e salve para criar</p>
                          </div>
                        )}
                        {prescricaoSelecionadaModal.isTemplate && prescricaoSelecionadaModal.id !== 'temp-new' && (
                          <div className="mb-4 px-3 py-2 bg-blue-100 border border-blue-200 rounded-md">
                            <p className="text-xs font-medium text-blue-800">📋 Prescrição Padrão</p>
                          </div>
                        )}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Prescrição *</label>
                          <input type="text" value={novaPrescricaoModal.nome} onChange={e => setNovaPrescricaoModal(prev => ({ ...prev, nome: e.target.value }))} readOnly={!!prescricaoSelecionadaModal.isTemplate} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500" />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                          <textarea value={novaPrescricaoModal.descricao} onChange={e => setNovaPrescricaoModal(prev => ({ ...prev, descricao: e.target.value }))} readOnly={!!prescricaoSelecionadaModal.isTemplate} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500" rows={2} />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Itens da Prescrição *</label>
                          <div className="space-y-3">
                            {(novaPrescricaoModal.itens || []).map((it, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-sm font-medium text-gray-900 mb-2">Item {idx + 1}</p>
                                <p className="text-sm"><strong>Medicamento:</strong> {it.medicamento}</p>
                                <p className="text-sm"><strong>Dosagem:</strong> {it.dosagem}</p>
                                <p className="text-sm"><strong>Frequência:</strong> {it.frequencia}</p>
                                <p className="text-sm"><strong>Instruções:</strong> {it.instrucoes}</p>
                                {it.quantidade && <p className="text-sm"><strong>Quantidade:</strong> {it.quantidade}</p>}
                              </div>
                            ))}
                            {(!novaPrescricaoModal.itens || novaPrescricaoModal.itens.length === 0) && <p className="text-sm text-gray-500">Nenhum item nesta prescrição.</p>}
                          </div>
                        </div>
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                          <textarea value={novaPrescricaoModal.observacoes} onChange={e => setNovaPrescricaoModal(prev => ({ ...prev, observacoes: e.target.value }))} readOnly={!!prescricaoSelecionadaModal.isTemplate} className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500" rows={2} />
                        </div>
                        {!prescricaoSelecionadaModal.isTemplate && (
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              if (!novaPrescricaoModal.nome.trim()) { alert('Nome obrigatório'); return; }
                              if (!novaPrescricaoModal.itens?.length) { alert('Adicione pelo menos um item'); return; }
                              try {
                                const isTemp = prescricaoSelecionadaModal?.id === 'temp-new';
                                const peso = pacienteVisualizando?.dadosClinicos?.medidasIniciais?.peso ?? pacienteVisualizando?.evolucaoSeguimento?.[(pacienteVisualizando?.evolucaoSeguimento?.length ?? 0) - 1]?.peso;
                                const pacienteIdCtx = (pacienteVisualizando?.id || '').trim();
                                if (!pacienteIdCtx) { alert('Paciente inválido'); return; }
                                const atualizarHistorico = Boolean(
                                  prescricaoEditandoModal &&
                                    !prescricaoEditandoModal.isTemplate &&
                                    !isTemp &&
                                    (prescricaoEditandoModal.pacienteId || '').trim() === pacienteIdCtx
                                );
                                const data: any = atualizarHistorico
                                  ? { ...prescricaoEditandoModal, pacienteId: pacienteIdCtx, pacienteNome: pacienteVisualizando?.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, atualizadoEm: new Date() }
                                  : { medicoId: nutricionista.userId, pacienteId: pacienteIdCtx, pacienteNome: pacienteVisualizando?.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, criadoEm: new Date(), atualizadoEm: new Date(), criadoPor: user?.email || '', isTemplate: false, pesoPaciente: peso };
                                await PrescricaoService.createOrUpdatePrescricao(data);
                                if (pacienteVisualizando) await aposSalvarPrescricaoPaciente(pacienteVisualizando);
                                alert('Prescrição salva no histórico!');
                              } catch (e) { console.error(e); alert('Erro ao salvar'); }
                            }} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"><Save size={16} /> Salvar</button>
                            <button onClick={async () => { if (!pacienteVisualizando || !novaPrescricaoModal.itens?.length || !nutricionista) return; try { const pesoReal = pacienteVisualizando.dadosClinicos?.medidasIniciais?.peso ?? pacienteVisualizando.evolucaoSeguimento?.[(pacienteVisualizando.evolucaoSeguimento?.length ?? 0) - 1]?.peso; let itensPrint = novaPrescricaoModal.itens || []; if (prescricaoSelecionadaModal?.isTemplate && pesoReal) { itensPrint = itensPrint.map((item) => { if (item.medicamento === 'Whey Protein') { const total = (pesoReal * 1.6).toFixed(1), porRef = (pesoReal * 1.6 / 3).toFixed(1); return { ...item, dosagem: `${total}g por dia (1,6g por kg)`, instrucoes: `Tomar ~${porRef}g 3x ao dia (total ${total}g/dia).`, quantidade: `${total}g/dia` }; } if (item.medicamento === 'Creatina MAX' || (item.medicamento || '').includes('Creatina')) return { ...item, dosagem: '3,5g por dia', instrucoes: '3,5g/dia em 200ml de água.', quantidade: '3,5g/dia' }; return item; }); } const doc = new jsPDF(); const dark = [44, 62, 80]; const titulo = (nutricionista as any).genero === 'F' ? 'Dra.' : 'Dr.'; doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark); doc.text(`${titulo} ${nutricionista.nome || 'Nutricionista'}`, 20, 15); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`CRN-${(nutricionista as any).registroNumero || '00000'}`, 20, 22); doc.setDrawColor(200, 200, 200); doc.line(20, 28, 190, 28); let y = 40; doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('PRESCRIÇÃO NUTRICIONAL', 20, y); y += 10; doc.setFontSize(10); doc.setFont('helvetica', 'normal'); const pacNome = pacienteVisualizando.dadosIdentificacao?.nomeCompleto || pacienteVisualizando.nome || 'Paciente'; doc.text(`Paciente: ${pacNome}`, 20, y); y += 6; if (pesoReal) { doc.text(`Peso: ${pesoReal.toFixed(1)} kg`, 20, y); y += 6; } y += 5; doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(novaPrescricaoModal.nome, 20, y); y += 8; if (novaPrescricaoModal.descricao) { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); const dl = doc.splitTextToSize(novaPrescricaoModal.descricao, 170); doc.text(dl, 20, y); y += dl.length * 5 + 5; } doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('MEDICAMENTOS/SUPLEMENTOS:', 20, y); y += 8; itensPrint.forEach((item) => { if (y > 270) { doc.addPage(); y = 20; } doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(`${item.medicamento}`, 25, y); y += 6; doc.setFont('helvetica', 'normal'); doc.text(`   Dosagem: ${item.dosagem}`, 25, y); y += 5; doc.text(`   Frequência: ${item.frequencia}`, 25, y); const il = doc.splitTextToSize(`   ${item.instrucoes}`, 165); doc.text(il, 25, y); y += il.length * 5 + 3; if (item.quantidade) { doc.text(`   Quantidade: ${item.quantidade}`, 25, y); y += 5; } y += 3; }); if (novaPrescricaoModal.observacoes) { if (y > 250) { doc.addPage(); y = 20; } y += 5; doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('OBSERVAÇÕES:', 20, y); y += 6; doc.setFont('helvetica', 'normal'); const obsLines = doc.splitTextToSize(novaPrescricaoModal.observacoes, 170); doc.text(obsLines, 20, y); y += obsLines.length * 5; } doc.save(`prescricao_${pacNome}_${new Date().toISOString().split('T')[0]}.pdf`); } catch (er) { console.error(er); alert('Erro ao gerar PDF'); } }} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"><Printer size={16} /> Imprimir</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 lg:p-12 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2 hidden lg:block">Selecione uma prescrição à esquerda para ver os detalhes.</p>
                        <p className="text-gray-600 mb-2 lg:hidden">Selecione uma prescrição em Prescrições Salvas ou no Histórico.</p>
                        <button type="button" onClick={() => setAbaPrescricoesModal('salvas')} className="mt-2 text-sm text-emerald-700 font-medium hover:underline lg:hidden">Ir para Prescrições Salvas</button>
                      </div>
                    )
                    }
                    </div>
                  </div>
                </div>
              )}

              {/* Aba 7: Nutrologia - área do nutricionista */}
              {pastaAtiva === 8 && pacienteVisualizando && (
                <div className="flex-1 min-h-0 flex flex-col -m-4 lg:m-0 overflow-hidden">
                  {/* Header compacto — só mobile; no desktop o NutriContent já tem menu lateral */}
                  <div className="lg:hidden flex flex-wrap items-center justify-between gap-3 px-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                        <UtensilsCrossed size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">Nutrologia</h3>
                        <p className="text-xs text-emerald-100">Cardápio, check-ins e acompanhamento</p>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white/15 text-sm font-medium">
                      {pacienteVisualizando.nome || pacienteVisualizando.dadosIdentificacao?.nomeCompleto || 'Paciente'}
                    </div>
                  </div>
                  <div className="flex flex-1 min-h-0 flex-col overflow-hidden px-2 lg:p-0">
                    <div className="h-full min-h-0 flex-1 overflow-hidden">
                      <NutriContent
                        paciente={pacienteVisualizando}
                        setPaciente={(p: PacienteCompleto) => setPacienteVisualizando(p)}
                        modoNutricionista
                        embedded
                        habilitarPlanosTemplates
                        chatNutriAuthorKind="nutritionist"
                        chatNutriAuthorName={nutricionista?.nome || user?.displayName || undefined}
                        chatNutriAuthorId={nutricionista?.userId || nutricionista?.id || user?.uid}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Aba Psiquiatria — visualização readonly (sem administrar share) */}
              {pastaAtiva === 14 && pacienteVisualizando && (
                <div className="space-y-4">
                  <PsiquiatriaContent
                    pacienteId={pacienteVisualizando.id}
                    mode="readonly"
                  />
                </div>
              )}

              {/* Aba Personal Trainer — mesmo quadro do metaadmin, só consulta */}
              {pastaAtiva === 9 && pacienteVisualizando && (
                <div className="flex min-h-0 h-full flex-1 flex-col -m-4 lg:m-0 overflow-hidden">
                  <PersonalPacienteSharePanel
                    key={`personal-tab-${pacienteVisualizando.id}`}
                    paciente={pacienteVisualizando}
                    medicoId={pacienteVisualizando.medicoResponsavelId || ''}
                    canManageLink={false}
                  />
                </div>
              )}

              {/* Aba Financeiro — Controle Financeiro (nutri ↔ paciente) */}
              {pastaAtiva === 10 && pacienteVisualizando && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden -m-4 sm:-m-6 h-full min-h-[28rem]">
                  <ControleFinanceiroPacientePanel
                    open
                    mode="embedded"
                    paciente={pacienteVisualizando}
                    pagamentoInicial={
                      dadosPagamento.pacienteId === pacienteVisualizando.id
                        ? dadosPagamento
                        : pagamentosPacientes[pacienteVisualizando.id] || {
                            pacienteId: pacienteVisualizando.id,
                            statusPagamento: 'em_aberto',
                            formaPagamento: null,
                            valorTotal: 0,
                            valorPago: 0,
                            valorPendente: 0,
                            parcelas: [],
                            dataUltimaAtualizacao: new Date(),
                          }
                    }
                    onClose={() => {}}
                    onSave={async (pagamento) => {
                      if (!user) throw new Error('Usuário não autenticado');
                      const { pacienteId: _pid, ...rest } = pagamento;
                      await PagamentoService.salvarPagamentoNutricionistaPaciente(
                        user.uid,
                        pacienteVisualizando.id,
                        rest
                      );
                      setDadosPagamento(pagamento);
                      await loadPagamentos(pacientesVisiveis.map((p) => p.paciente));
                    }}
                    onFeedback={(msg) => alert(msg)}
                  />
                </div>
              )}

            </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {fotosModal}
      <PacienteDepoimentoLeituraModal
        state={depoimentoModalPaciente}
        onFechar={() => setDepoimentoModalPaciente(null)}
      />

      <ModalGraficoERegistrosPaciente
        open={showModalGraficoRegistros}
        paciente={pacienteParaGraficoRegistros}
        onClose={() => {
          setShowModalGraficoRegistros(false);
          setPacienteParaGraficoRegistros(null);
        }}
        isMobile={isMobile}
        allowEditDelete={false}
      />

      {/* Modal de Tratamento/Aplicações — tela cheia, somente leitura */}
      <TratamentoPacienteMobileModal
        open={showModalAplicacoes}
        paciente={pacienteAplicacoesSelecionado}
        onClose={() => {
          setShowModalAplicacoes(false);
          setPacienteAplicacoesSelecionado(null);
        }}
        readOnly
        patientPhotoUrl={
          pacienteAplicacoesSelecionado?.userId
            ? patientPhotoByUserId[pacienteAplicacoesSelecionado.userId]
            : null
        }
        temFoto={
          !!pacienteAplicacoesSelecionado &&
          !!fotosPorPacienteId[pacienteAplicacoesSelecionado.id]
        }
        onOpenGrafico={(p) => {
          setPacienteParaGraficoRegistros(p);
          setShowModalGraficoRegistros(true);
        }}
        onOpenFotos={(p) => abrirFotos(p)}
        medicoId={pacienteAplicacoesSelecionado?.medicoResponsavelId || undefined}
      />

      {/* Modal de Exames - Tela Cheia */}
      {showModalExames && pacienteExamesSelecionado && (() => {
        const exames = pacienteExamesSelecionado.examesLaboratoriais || [];
        
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
        
        const getHemogramaVal = (ex: any, f: string) =>
          (ex?.hemogramaCompleto?.[f] ?? ex?.[f]) || null;
        // Mapear exame selecionado
        const exameSelecionado = {
          ...exameOriginal,
          hemoglobina: getHemogramaVal(exameOriginal, 'hemoglobina'),
          plaquetas: getHemogramaVal(exameOriginal, 'plaquetas'),
          leucocitos: getHemogramaVal(exameOriginal, 'leucocitos'),
        } as Record<string, unknown>;

        const pacienteSex = pacienteExamesSelecionado.dadosIdentificacao?.sexoBiologico as Sex;

        const patientLabSections = buildPatientLabSectionsFromOrder(
          labOrderBySecaoConfig,
          EXAME_LABORATORIAL_KEY_TO_FIELD,
          labLimitOverrides,
          labSectionLabels
        );

        const dadosGrafico = examesOrdenados.map((exame) => {
          const dataExame = safeDateToString(exame.dataColeta);
          const base: Record<string, unknown> = { data: dataExame };
          const er = exame as Record<string, unknown>;
          for (const sec of patientLabSections) {
            for (const campo of sec.fields) {
              base[campo.field] = getExameCampoNumerico(er, campo.field);
            }
          }
          return base;
        }).reverse();

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

        const mobileHeaderScores = patientLabSections.map((secao) =>
          calculateSectionMetabolicScore({
            sectionKey: secao.sectionId,
            examKeys: secao.fields.map((f) => f.key),
            labValues: exameSelecionado as Record<string, unknown>,
            sex: pacienteSex,
            dob: pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento,
            limitOverrides: labLimitOverrides,
            sectionLabel: secao.section,
          })
        );
        const mobileScoredSections = mobileHeaderScores.filter((s) => s.score !== null);
        const globalAvgMobile =
          mobileScoredSections.length > 0
            ? Math.round(
                mobileScoredSections.reduce((sum, s) => sum + (s.score ?? 0), 0) /
                  mobileScoredSections.length
              )
            : null;

        return (
          <div className="fixed inset-0 bg-white z-[70] flex flex-col overflow-hidden">
            <PacienteModalHeader
              compact
              className="flex-shrink-0"
              patientName={
                pacienteExamesSelecionado.dadosIdentificacao?.nomeCompleto ||
                pacienteExamesSelecionado.nome ||
                'Paciente'
              }
              patientPhotoUrl={
                pacienteExamesSelecionado.userId
                  ? patientPhotoByUserId[pacienteExamesSelecionado.userId]
                  : null
              }
              dataNascimento={pacienteExamesSelecionado.dadosIdentificacao?.dataNascimento}
              cidade={pacienteExamesSelecionado.dadosIdentificacao?.endereco?.cidade}
              estado={pacienteExamesSelecionado.dadosIdentificacao?.endereco?.estado}
              statusTratamento={pacienteExamesSelecionado.statusTratamento}
              recomendacoesLidas={Boolean(pacienteExamesSelecionado.recomendacoesLidas)}
              dataLeituraRecomendacoes={pacienteExamesSelecionado.dataLeituraRecomendacoes}
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setShowModalExames(false);
                    setPacienteExamesSelecionado(null);
                    setExameDataSelecionada('');
                    setSecoesExpandidas(new Set());
                    setExamesExpandidos(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
              }
            />

            {/* Toolbar: data + score geral (sem botões de editar/novo/solicitar) */}
            <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-6">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto py-0.5 [-webkit-overflow-scrolling:touch]">
                {examesOrdenados.length > 0 && (
                  <select
                    value={dataSelecionada}
                    onChange={(e) => {
                      setExameDataSelecionada(e.target.value);
                    }}
                    aria-label="Data do exame"
                    className="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[9.25rem]"
                  >
                    {examesOrdenados.map((exame, idx) => {
                      const dataExame = safeDateToString(exame.dataColeta);
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
                )}
                {globalAvgMobile != null ? (
                  <div className="ml-auto shrink-0">
                    <LabCompactScore score={globalAvgMobile} />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
              {exames.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center">
                  <FlaskConical className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-black mb-2">Nenhum exame registrado</h3>
                  <p className="text-black">Os exames laboratoriais aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-3 pb-3 text-sm">
                  {patientLabSections.map((secao) => {
                    const camposComValor = secao.fields.filter((campo) =>
                      campoTemAlgumValor(campo.field)
                    );

                    if (camposComValor.length === 0) return null;

                    const secaoKey = `secao-${secao.sectionId}`;
                    const isSecaoExpandida = secoesExpandidas.has(secaoKey);
                    const secaoComExameForaDaFaixa = camposComValor.some((campo) => {
                      const range = (getLabRange as any)(
                        campo.key as string,
                        pacienteSex,
                        pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento,
                        labLimitOverrides
                      );
                      if (!range) return false;
                      const min = Number(range.min);
                      const max = Number(range.max);
                      if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
                      const valor = Number((exameSelecionado as Record<string, unknown>)[campo.field]);
                      if (!Number.isFinite(valor)) return false;
                      return valor < min || valor > max;
                    });

                    const sectionScoreNutriMobile = calculateSectionMetabolicScore({
                      sectionKey: secao.sectionId,
                      examKeys: secao.fields.map((f) => f.key),
                      labValues: exameSelecionado as Record<string, unknown>,
                      sex: pacienteSex,
                      dob: pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento,
                      limitOverrides: labLimitOverrides,
                      sectionLabel: secao.section,
                    });

                    return (
                      <div
                        key={secao.sectionId}
                        className="overflow-hidden rounded-[16px] border border-slate-200/80 bg-white/70"
                      >
                        {/* Cabeçalho da seção */}
                        <button
                          onClick={() => toggleSecao(secaoKey)}
                          className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-emerald-50/40 px-3 py-2.5 text-left transition-colors hover:from-slate-50 hover:to-emerald-50/60"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                              secaoComExameForaDaFaixa
                                ? 'bg-red-50 text-red-500'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                            aria-hidden
                          >
                            <Activity className="h-4 w-4" />
                          </span>
                          <h4 className="min-w-0 whitespace-normal text-[15px] font-semibold leading-tight text-slate-800">
                            {secao.section}
                          </h4>
                          <LabSectionScoreBadge score={sectionScoreNutriMobile.score} color={sectionScoreNutriMobile.color} />
                          {isSecaoExpandida ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                        </button>
                        
                        {/* Conteúdo da seção */}
                        {isSecaoExpandida && (
                          <div className="space-y-3 p-2.5">
                            {camposComValor.map((campo) => {
                              const range = getLabRange(campo.key as string, pacienteSex, pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento, labLimitOverrides);
                              if (!range) return null;
                              
                              const value = exameSelecionado[campo.field] as number | undefined;
                              const exameKey = `${secaoKey}-${campo.field}`;
                              const isExameExpandido = examesExpandidos.has(exameKey);

                              return (
                                <div key={campo.field} className="min-w-0 space-y-1.5">
                                  <LabResultCard
                                    name={range.label}
                                    value={value ?? null}
                                    unit={range.unit}
                                    examKey={campo.key}
                                    range={range}
                                  >
                                    {isExameExpandido ? (
                                      dadosGrafico.length > 0 &&
                                      dadosGrafico.some((d) => {
                                        const fieldValue = d[campo.field as keyof typeof d];
                                        return fieldValue !== null && fieldValue !== undefined;
                                      }) ? (
                                        <TrendLine
                                          data={dadosGrafico}
                                          dataKeys={[
                                            {
                                              key: campo.field,
                                              name: range.label,
                                              stroke: '#10b981',
                                              dot: true,
                                            },
                                          ]}
                                          xKey="data"
                                          height={200}
                                          showLegend={false}
                                          showValueLabels
                                          premium
                                          unitLabel={range.unit || ''}
                                          referenceBand={{
                                            min: range.min,
                                            max: range.max,
                                          }}
                                          formatter={(value: any) =>
                                            value !== null ? `${parseFloat(value).toFixed(1)}` : 'N/A'
                                          }
                                          referenceLines={[
                                            {
                                              value: range.min,
                                              label: `Min: ${range.min}`,
                                              stroke: '#94a3b8',
                                              strokeDasharray: '4 6',
                                            },
                                            {
                                              value: range.max,
                                              label: `Max: ${range.max}`,
                                              stroke: '#94a3b8',
                                              strokeDasharray: '4 6',
                                            },
                                          ]}
                                        />
                                      ) : (
                                        <div className="flex h-[100px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
                                          <p className="text-xs text-black">Sem dados históricos</p>
                                        </div>
                                      )
                                    ) : null}
                                  </LabResultCard>
                                  <button
                                    type="button"
                                    onClick={() => toggleExame(exameKey)}
                                    className="w-full rounded-[14px] border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
                                  >
                                    {isExameExpandido
                                      ? 'Ocultar evolução temporal'
                                      : 'Ver evolução temporal'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Resumo Metabólico Mobile */}
                  {exameSelecionado && (() => {
                    const allNutriMobileScores = patientLabSections.map((secao) =>
                      calculateSectionMetabolicScore({
                        sectionKey: secao.sectionId,
                        examKeys: secao.fields.map((f) => f.key),
                        labValues: exameSelecionado as Record<string, unknown>,
                        sex: pacienteSex,
                        dob: pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento,
                        limitOverrides: labLimitOverrides,
                        sectionLabel: secao.section,
                      })
                    );
                    return (
                      <>
                        <LabMetabolicSummarySection scores={allNutriMobileScores} />
                        <LabStatusLegend />
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal de Bio Impedância - Tela Cheia (mobile: mantém barra de menu inferior) */}
      {showModalBioImpedancia && pacienteBioImpedanciaSelecionado && (
        <div className="fixed top-0 left-0 right-0 bottom-16 lg:bottom-0 bg-white z-[70] flex flex-col overflow-hidden">
          <PacienteModalHeader
            compact
            className="flex-shrink-0"
            patientName={
              pacienteBioImpedanciaSelecionado.dadosIdentificacao?.nomeCompleto ||
              pacienteBioImpedanciaSelecionado.nome ||
              'Paciente'
            }
            patientPhotoUrl={
              pacienteBioImpedanciaSelecionado.userId
                ? patientPhotoByUserId[pacienteBioImpedanciaSelecionado.userId]
                : null
            }
            dataNascimento={pacienteBioImpedanciaSelecionado.dadosIdentificacao?.dataNascimento}
            cidade={pacienteBioImpedanciaSelecionado.dadosIdentificacao?.endereco?.cidade}
            estado={pacienteBioImpedanciaSelecionado.dadosIdentificacao?.endereco?.estado}
            statusTratamento={pacienteBioImpedanciaSelecionado.statusTratamento}
            recomendacoesLidas={Boolean(pacienteBioImpedanciaSelecionado.recomendacoesLidas)}
            dataLeituraRecomendacoes={pacienteBioImpedanciaSelecionado.dataLeituraRecomendacoes}
            metaExtra={
              <span className="text-xs font-medium text-slate-500">Bio Impedância</span>
            }
            actions={
              <button
                type="button"
                onClick={() => {
                  setShowModalBioImpedancia(false);
                  setPacienteBioImpedanciaSelecionado(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            }
          />
          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 sm:p-6 bg-gray-50">
            {pacienteBioImpedanciaSelecionado && (() => {
              const p = pacienteBioImpedanciaSelecionado;
              const registros = p?.bioimpedanciaRegistros || [];
              const sexoBiologico = p?.dadosIdentificacao?.sexoBiologico ?? (p as any)?.dadosidentificacao?.sexobiologico;
              const imagemSrc = sexoBiologico === 'F' ? '/bioimpedancia/mulher-frente.png' : '/bioimpedancia/homem-frente.png';
              const imageAlt = sexoBiologico === 'F' ? 'Body map feminino' : 'Body map masculino';
              return (
                <BioImpedanciaDisplay
                  paciente={p}
                  registros={registros}
                  imagemSrc={imagemSrc}
                  imageAlt={imageAlt}
                  modoNutricionista
                  isMobile={isMobile}
                  formularioEmModal
                  onSalvo={async (novos) => {
                    await salvarBioImpedanciaRegistros(p.id, novos);
                    setPacienteBioImpedanciaSelecionado(prev => prev ? { ...prev, bioimpedanciaRegistros: novos } : null);
                    setPacienteVisualizando(prev => (prev?.id === p.id ? { ...prev, bioimpedanciaRegistros: novos } : prev));
                    setPacientesVisiveis(prev => prev.map(item => item.paciente.id === p.id ? { ...item, paciente: { ...item.paciente, bioimpedanciaRegistros: novos } } : item));
                  }}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de Adicionar Exame Mobile */}
      {showAdicionarExameModalMobile && pacienteExamesSelecionado && (() => {
        const pacienteSex = pacienteExamesSelecionado.dadosIdentificacao?.sexoBiologico as Sex;
        const keyToField: Record<string, string> = {
          fastingGlucose: 'glicemiaJejum', hba1c: 'hemoglobinaGlicada', fastingInsulin: 'insulinaJejum',
          urea: 'ureia', creatinine: 'creatinina', egfr: 'taxaFiltracaoGlomerular', sodium: 'sodio', potassium: 'potassio',
          alt: 'tgp', ast: 'tgo', ggt: 'ggt', alp: 'fosfataseAlcalina',
          amylase: 'amilase', lipase: 'lipase',
          cholTotal: 'colesterolTotal', ldl: 'ldl', hdl: 'hdl', tg: 'triglicerides',
          tsh: 'tsh', calcitonin: 'calcitonina', ft4: 't4Livre',
          t3Livre: 't3Livre', antiTPO: 'antiTPO', antiTg: 'antiTg',
          hgb: 'hemoglobina', wbc: 'leucocitos', platelets: 'plaquetas',
          ferritin: 'ferritina', iron: 'ferroSerico', b12: 'vitaminaB12', vitaminD: 'vitaminaD',
          albumin: 'albumina',
          testosteronaTotal: 'testosteronaTotal', testosteronaLivre: 'testosteronaLivre', shbg: 'shbg',
          lh: 'lh', fsh: 'fsh', estradiol: 'estradiol', dht: 'dht', dheas: 'dheas',
          prolactina: 'prolactina', psa: 'psa',
          progesterona: 'progesterona', oh17Progesterona: 'oh17Progesterona', amh: 'amh',
          cortisol8h: 'cortisol8h', cortisol16h: 'cortisol16h', acth: 'acth',
          homaIr: 'homaIr', leptina: 'leptina', adiponectina: 'adiponectina', igf1: 'igf1', pcrUltra: 'pcrUltra'
        };
        return (
          <div className="fixed inset-0 bg-white z-[80] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {indiceExameEditandoMobile !== null ? 'Editar Exame Laboratorial' : 'Adicionar Novo Exame Laboratorial'}
              </h2>
              <button
                onClick={() => {
                  setShowAdicionarExameModalMobile(false);
                  setIndiceExameEditandoMobile(null);
                  setNovoExameDataMobile({ dataColeta: new Date().toISOString().split('T')[0] });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Data de Coleta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {indiceExameEditandoMobile !== null ? 'Data de Coleta (não editável)' : 'Data de Coleta *'}
                </label>
                <input
                  type="date"
                  value={novoExameDataMobile.dataColeta}
                  onChange={(e) => {
                    if (indiceExameEditandoMobile === null) {
                      setNovoExameDataMobile({ ...novoExameDataMobile, dataColeta: e.target.value });
                    }
                  }}
                  disabled={indiceExameEditandoMobile !== null}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 ${
                    indiceExameEditandoMobile !== null ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Campos de Exame - organizados por sistema */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {Object.entries(labOrderBySecaoConfig).map(([secaoKey, campoKeys]) => (
                  <div key={secaoKey} className="border border-gray-200 rounded-lg p-2.5 bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-2 text-xs">{LAB_SECTION_LABELS_PT[secaoKey] || labSectionLabels[secaoKey] || secaoKey}</h4>
                    <div className="space-y-2">
                      {campoKeys.map((campoKey) => {
                        const field = keyToField[campoKey] || campoKey;
                        const rangeToUse = getLabRange(campoKey, pacienteSex, pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento, labLimitOverrides);
                        if (!rangeToUse || !rangeToUse.label || rangeToUse.min === undefined || rangeToUse.max === undefined) return null;
                        const sexDependentKeys = ['ferritin', 'iron', 'hgb', 'testosteronaTotal', 'testosteronaLivre', 'shbg', 'lh', 'fsh', 'estradiol', 'dht', 'dheas', 'prolactina', 'leptina'];
                        const precisaSexo = sexDependentKeys.includes(campoKey) && !pacienteSex;
                        const temValor = novoExameDataMobile[field] !== undefined && novoExameDataMobile[field] !== null && novoExameDataMobile[field] !== '';
                        return (
                          <div key={field}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {rangeToUse.label}
                              {precisaSexo && <span className="ml-1 text-amber-600">(⚠️ defina sexo)</span>}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                value={novoExameDataMobile[field] || ''}
                                onChange={(e) => {
                                  const numValue = parseFloat(e.target.value) || 0;
                                  setNovoExameDataMobile({ ...novoExameDataMobile, [field]: numValue > 0 ? numValue : undefined });
                                }}
                                className={`flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 ${precisaSexo ? 'border-amber-300 bg-amber-50' : ''}`}
                                placeholder={`${rangeToUse.min}-${rangeToUse.max} ${rangeToUse.unit}`}
                              />
                              {temValor && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const novoData = { ...novoExameDataMobile };
                                    delete novoData[field];
                                    setNovoExameDataMobile(novoData);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                                  title={`Remover ${rangeToUse.label}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                            {novoExameDataMobile[field] && rangeToUse && (
                              <div className="mt-1">
                                <LabRangeBar range={rangeToUse} value={novoExameDataMobile[field]} />
                                <LabOptimizationBadge examKey={campoKey} value={novoExameDataMobile[field]} range={rangeToUse} compact />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              {/* Botão Deletar Exame (só aparece em modo edição) */}
              {indiceExameEditandoMobile !== null && (
                <button
                  onClick={async () => {
                    if (!pacienteExamesSelecionado || !novoExameDataMobile.dataColeta) return;
                    
                    if (!confirm('Tem certeza que deseja deletar todos os exames desta data?')) return;
                    
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
                    
                    // Deletar todos os exames da data selecionada
                    const examesExistentes = pacienteExamesSelecionado.examesLaboratoriais || [];
                    const examesAtualizados = examesExistentes.filter(exame => {
                      const dataExame = safeDateToString(exame.dataColeta);
                      return dataExame !== novoExameDataMobile.dataColeta;
                    });
                    
                    // Ajustar data selecionada
                    if (examesAtualizados.length === 0) {
                      setExameDataSelecionada('');
                    } else {
                      const examesOrdenados = [...examesAtualizados].sort((a, b) => {
                        const dateA = safeDateToString(a.dataColeta);
                        const dateB = safeDateToString(b.dataColeta);
                        return dateB.localeCompare(dateA);
                      });
                      const proximaData = safeDateToString(examesOrdenados[0]?.dataColeta);
                      setExameDataSelecionada(proximaData || '');
                    }
                    
                    const pacienteAtualizado = {
                      ...pacienteExamesSelecionado,
                      examesLaboratoriais: examesAtualizados
                    };
                    
                    try {
                      if (pacienteAtualizado.id) {
                        await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                        setPacienteExamesSelecionado(pacienteAtualizado);
                      }
                      setShowAdicionarExameModalMobile(false);
                      setIndiceExameEditandoMobile(null);
                      setNovoExameDataMobile({ dataColeta: new Date().toISOString().split('T')[0] });
                    } catch (error) {
                      console.error('Erro ao deletar exame:', error);
                      alert('Erro ao deletar exame. Tente novamente.');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Deletar Exame
                </button>
              )}
              
              <div className="flex justify-end space-x-3 ml-auto">
                <button
                  onClick={() => {
                    setShowAdicionarExameModalMobile(false);
                    setIndiceExameEditandoMobile(null);
                    setNovoExameDataMobile({ dataColeta: new Date().toISOString().split('T')[0] });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!pacienteExamesSelecionado || !novoExameDataMobile.dataColeta) return;
                    
                    try {
                      const camposValores = Object.fromEntries(
                        Object.entries(novoExameDataMobile).filter(
                          ([key, value]) => key !== 'dataColeta' && value !== undefined && value !== ''
                        )
                      );

                      const temAlgumValor = Object.keys(camposValores).length > 0;
                      const examesExistentes = pacienteExamesSelecionado.examesLaboratoriais || [];
                      let examesAtualizados = [...examesExistentes];

                      if (indiceExameEditandoMobile !== null && indiceExameEditandoMobile >= 0 && indiceExameEditandoMobile < examesAtualizados.length) {
                        // Modo edição
                        if (!temAlgumValor) {
                          // Nenhum valor preenchido: remover exame
                          examesAtualizados.splice(indiceExameEditandoMobile, 1);

                          // Ajustar data selecionada
                          if (examesAtualizados.length === 0) {
                            setExameDataSelecionada('');
                          } else {
                            const restante = examesAtualizados[examesAtualizados.length - 1];
                            const dataRestante =
                              restante?.dataColeta instanceof Date
                                ? restante.dataColeta.toISOString().split('T')[0]
                                : restante?.dataColeta
                                ? new Date(restante.dataColeta).toISOString().split('T')[0]
                                : '';
                            setExameDataSelecionada(dataRestante);
                          }
                        } else {
                          // Atualizar exame existente
                          examesAtualizados[indiceExameEditandoMobile] = {
                            ...examesAtualizados[indiceExameEditandoMobile],
                            dataColeta: new Date(novoExameDataMobile.dataColeta),
                            ...camposValores
                          };
                          setExameDataSelecionada(novoExameDataMobile.dataColeta);
                        }
                      } else {
                        // Modo adição
                        if (!temAlgumValor) {
                          alert('Por favor, preencha pelo menos um valor de exame.');
                          return;
                        }
                        const novoExame = {
                          id: 'temp-' + Date.now(),
                          dataColeta: new Date(novoExameDataMobile.dataColeta),
                          ...camposValores
                        };
                        examesAtualizados = [...examesAtualizados, novoExame];
                        setExameDataSelecionada(novoExameDataMobile.dataColeta);
                      }
                      
                      const pacienteAtualizado = {
                        ...pacienteExamesSelecionado,
                        examesLaboratoriais: examesAtualizados
                      };

                      // Salvar no Firebase
                      if (pacienteAtualizado.id) {
                        await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                        setPacienteExamesSelecionado(pacienteAtualizado);
                      }
                    
                      // Fechar modal e limpar
                      setShowAdicionarExameModalMobile(false);
                      setIndiceExameEditandoMobile(null);
                      setNovoExameDataMobile({ dataColeta: new Date().toISOString().split('T')[0] });
                    } catch (error) {
                      console.error('Erro ao salvar exame:', error);
                      alert('Erro ao salvar exame. Tente novamente.');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Salvar Exame
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Controle Financeiro (nutri ↔ paciente) */}
      {showModalPagamento && pacientePagamentoSelecionado && (
        <ControleFinanceiroPacientePanel
          open
          mode="modal"
          paciente={pacientePagamentoSelecionado}
          pagamentoInicial={dadosPagamento}
          onClose={() => {
            setShowModalPagamento(false);
            setPacientePagamentoSelecionado(null);
          }}
          onSave={async (pagamento) => {
            if (!user) throw new Error('Usuário não autenticado');
            const { pacienteId: _pid, ...rest } = pagamento;
            await PagamentoService.salvarPagamentoNutricionistaPaciente(
              user.uid,
              pacientePagamentoSelecionado.id,
              rest
            );
            setDadosPagamento(pagamento);
            await loadPagamentos(pacientesVisiveis.map((p) => p.paciente));
          }}
          onFeedback={(msg) => alert(msg)}
        />
      )}


      {/* Modal: escolher grupo para nova prescrição (desktop + mobile) */}
      {showModalGrupoNovaPrescricao && novaPrescricaoContexto && nutricionista && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowModalGrupoNovaPrescricao(false); setNovaPrescricaoContexto(null); }} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Em qual grupo inserir a nova prescrição?</h3>
              <p className="text-sm text-gray-500 mt-1">Selecione o grupo para que a prescrição não fique avulsa.</p>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {SUBTIPOS_ORDER.map((subtipo) => (
                <button
                  key={subtipo}
                  type="button"
                  onClick={() => {
                    const nome = `${subtipo} — Nova Prescrição`;
                    const prescricaoTemporaria: Prescricao = {
                      id: 'temp-new',
                      medicoId: nutricionista.userId,
                      pacienteId: pacientePrescricoesSelecionado?.id || '',
                      pacienteNome: pacientePrescricoesSelecionado?.nome || '',
                      nome,
                      descricao: '',
                      itens: [],
                      observacoes: '',
                      criadoEm: new Date(),
                      atualizadoEm: new Date(),
                      criadoPor: user?.email || '',
                      isTemplate: false
                    };
                    if (novaPrescricaoContexto === 'desktop') {
                      setPrescricoesModal((prev) => [prescricaoTemporaria, ...prev.filter((x) => x.id !== 'temp-new')]);
                      setPrescricaoSelecionadaModal(prescricaoTemporaria);
                      setPrescricaoEditandoModal(null);
                      setNovaPrescricaoModal({ nome, descricao: '', itens: [], observacoes: '' });
                      setGruposPrescricoesExpandidosModal((prev) => new Set([...prev, subtipo]));
                    } else {
                      setPrescricoesModal((prev) => [prescricaoTemporaria, ...prev]);
                      setPrescricaoSelecionadaModal(prescricaoTemporaria);
                      setPrescricaoEditandoModal(null);
                      setNovaPrescricaoModal({ nome, descricao: '', itens: [], observacoes: '' });
                      setAbaPrescricoesModal('descricao');
                      setGruposPrescricoesExpandidosModal((prev) => new Set([...prev, subtipo]));
                    }
                    setShowModalGrupoNovaPrescricao(false);
                    setNovaPrescricaoContexto(null);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 shadow-sm transition-all duration-200 flex items-center justify-between group"
                >
                  <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{subtipo}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowModalGrupoNovaPrescricao(false); setNovaPrescricaoContexto(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prescrições (mobile) - tela cheia */}
      {showModalPrescricoes && pacientePrescricoesSelecionado && nutricionista && (
        <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden">
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModalPrescricoes(false)} aria-hidden="true" />
          <div className="relative z-10 w-full h-screen flex flex-col overflow-hidden bg-white">
              <PacienteModalHeader
                compact
                className="flex-shrink-0"
                patientName={
                  pacientePrescricoesSelecionado.dadosIdentificacao?.nomeCompleto ||
                  pacientePrescricoesSelecionado.nome ||
                  'Paciente'
                }
                patientPhotoUrl={
                  pacientePrescricoesSelecionado.userId
                    ? patientPhotoByUserId[pacientePrescricoesSelecionado.userId]
                    : null
                }
                dataNascimento={pacientePrescricoesSelecionado.dadosIdentificacao?.dataNascimento}
                cidade={pacientePrescricoesSelecionado.dadosIdentificacao?.endereco?.cidade}
                estado={pacientePrescricoesSelecionado.dadosIdentificacao?.endereco?.estado}
                statusTratamento={pacientePrescricoesSelecionado.statusTratamento}
                recomendacoesLidas={Boolean(pacientePrescricoesSelecionado.recomendacoesLidas)}
                dataLeituraRecomendacoes={pacientePrescricoesSelecionado.dataLeituraRecomendacoes}
                actions={
                  <button
                    type="button"
                    onClick={() => setShowModalPrescricoes(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                    aria-label="Fechar"
                  >
                    <X size={24} />
                  </button>
                }
              />
              <div className="bg-white px-4 py-2.5 border-b border-gray-200 flex-shrink-0 sm:px-6">
                <PrescricaoBuscaCampo
                  itensRef={prescricoesBuscaFonteRef}
                  loading={loadingPrescricoesModal}
                  accent="purple"
                  onSelect={abrirPrescricaoDaBusca}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setNovaPrescricaoContexto('mobile');
                          setShowModalGrupoNovaPrescricao(true);
                        }}
                        className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700"
                        aria-label="Novo"
                        title="Novo"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => pacientePrescricoesSelecionado && loadPrescricoesModal(pacientePrescricoesSelecionado)}
                        className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                        aria-label="Atualizar"
                        title="Atualizar"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </>
                  }
                />
              </div>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 flex-shrink-0 bg-gray-50">
                <button
                  onClick={() => setAbaPrescricoesModal('salvas')}
                  className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors ${
                    abaPrescricoesModal === 'salvas'
                      ? 'border-b-2 border-purple-500 text-purple-700 bg-white'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Prescrições Salvas
                </button>
                <button
                  onClick={() => setAbaPrescricoesModal('historico')}
                  className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors ${
                    abaPrescricoesModal === 'historico'
                      ? 'border-b-2 border-purple-500 text-purple-700 bg-white'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Histórico
                </button>
                <button
                  onClick={() => setAbaPrescricoesModal('descricao')}
                  className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors ${
                    abaPrescricoesModal === 'descricao'
                      ? 'border-b-2 border-purple-500 text-purple-700 bg-white'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Descrição
                </button>
              </div>
              {/* Body - scrollável: altura fixa, largura total do modal */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full px-4 py-4 overscroll-contain">
                {loadingPrescricoesModal && abaPrescricoesModal === 'salvas' ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando prescrições...</p>
                  </div>
                ) : abaPrescricoesModal === 'historico' ? (
                  <PrescricaoHistoricoTab
                    pacienteId={pacientePrescricoesSelecionado.id}
                    accent="purple"
                    refreshKey={historicoPrescricoesRefreshKey}
                    onEdit={abrirPrescricaoDoHistoricoParaEditar}
                    onReplicate={(p) => abrirPrescricaoDoHistoricoComoNova(p, pacientePrescricoesSelecionado)}
                    maxHeightClassName="max-h-[min(60vh,480px)]"
                  />
                ) : abaPrescricoesModal === 'salvas' ? (
                  /* Aba Prescrições Salvas: lista agrupada por subtipo (mobile: maior, largura total) */
                  <div className="w-full space-y-3">
                    {(!prescricoesModal || prescricoesModal.length === 0) ? (
                      <p className="text-base text-gray-500 text-center py-8">Nenhuma prescrição cadastrada. Clique em &quot;Novo&quot; para criar.</p>
                    ) : (() => {
                      const gruposModal = groupBySubtipo(prescricoesModal || []);
                      const renderBtnModal = (p: Prescricao) => {
                        const isSel = prescricaoSelecionadaModal?.id === p.id;
                        const isTemp = p.id === 'temp-new';
                        const isTpl = p.isTemplate;
                        return (
                          <button
                            key={p.id}
                            onClick={async () => {
                              if (isTemp) {
                                setPrescricaoSelecionadaModal(p);
                                setPrescricaoEditandoModal(null);
                                setNovaPrescricaoModal({ nome: p.nome, descricao: p.descricao || '', itens: p.itens || [], observacoes: p.observacoes || '' });
                                setAbaPrescricoesModal('descricao');
                                return;
                              }
                              let paraEditar = p;
                              if (isTpl && pacientePrescricoesSelecionado) {
                                const peso = pacientePrescricoesSelecionado.dadosClinicos?.medidasIniciais?.peso ?? pacientePrescricoesSelecionado.evolucaoSeguimento?.[(pacientePrescricoesSelecionado.evolucaoSeguimento?.length ?? 0) - 1]?.peso;
                                if (!peso) {
                                  alert('Cadastre o peso do paciente (Dados Clínicos ou Evolução).');
                                  return;
                                }
                                const itensRecalculados = (p.itens || []).map((item) => {
                                  if (item.medicamento === 'Whey Protein') {
                                    const total = (peso * 1.6).toFixed(1);
                                    const porRef = (peso * 1.6 / 3).toFixed(1);
                                    return { ...item, dosagem: `${total}g por dia (1,6g por kg)`, instrucoes: `Tomar ~${porRef}g 3x ao dia (total ${total}g/dia).`, quantidade: `${total}g/dia` };
                                  }
                                  if (item.medicamento === 'Creatina MAX' || (item.medicamento || '').includes('Creatina')) {
                                    return { ...item, dosagem: '3,5g por dia', instrucoes: '3,5g/dia em 200ml de água. Preferencialmente pós-treino.', quantidade: '3,5g/dia' };
                                  }
                                  return item;
                                });
                                paraEditar = { ...p, itens: itensRecalculados, pesoPaciente: peso };
                              }
                              setPrescricaoSelecionadaModal(paraEditar);
                              setPrescricaoEditandoModal(
                                !paraEditar.isTemplate && !!paraEditar.pacienteId ? paraEditar : null
                              );
                              setNovaPrescricaoModal({ nome: paraEditar.nome, descricao: paraEditar.descricao || '', itens: paraEditar.itens || [], observacoes: paraEditar.observacoes || '' });
                              setAbaPrescricoesModal('descricao');
                            }}
                            className={`w-full text-left px-4 py-3.5 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99] text-base ${
                              isSel
                                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                                : isTemp
                                  ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50/80 hover:border-yellow-400'
                                  : isTpl
                                    ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/80 hover:border-blue-300'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-base font-medium text-gray-900">{getTituloExibicao(p.nome)}</span>
                            {isTemp && <span className="block text-sm text-amber-600 mt-1">✏️ Em edição</span>}
                            {isTpl && !isTemp && <span className="block text-sm text-blue-600 mt-1">📋 Padrão</span>}
                          </button>
                        );
                      };
                      const toggleGrupoModal = (k: string) => {
                        setGruposPrescricoesExpandidosModal((prev) => {
                          const n = new Set(prev);
                          if (n.has(k)) n.delete(k); else n.add(k);
                          return n;
                        });
                      };
                      return (
                        <>
                          {gruposModal.map(({ subtipo, items }) => {
                            const expandedModal = gruposPrescricoesExpandidosModal.has(subtipo);
                            return (
                              <div key={subtipo} className="space-y-2 w-full">
                                <button
                                  type="button"
                                  onClick={() => toggleGrupoModal(subtipo)}
                                  className="flex items-center gap-3 w-full text-left py-3 px-4 mt-2 mb-1 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 group"
                                >
                                  {expandedModal ? <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                                  <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{subtipo} ({items.length})</span>
                                </button>
                                {expandedModal && <div className="space-y-3 w-full">{items.map((px) => renderBtnModal(px))}</div>}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  /* Aba Descrição: editor ou "selecione uma" */
                  prescricaoSelecionadaModal ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                        {prescricaoSelecionadaModal.id === 'temp-new' && (
                          <div className="px-3 py-2 bg-yellow-100 border border-yellow-200 rounded-md text-xs text-yellow-800">Prescrição temporária. Preencha e salve para criar.</div>
                        )}
                        {prescricaoSelecionadaModal.isTemplate && prescricaoSelecionadaModal.id !== 'temp-new' && (
                          <div className="px-3 py-2 bg-blue-100 border border-blue-200 rounded-md text-xs text-blue-800">Prescrição Padrão.</div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                          <input
                            type="text"
                            value={novaPrescricaoModal.nome}
                            onChange={(e) => setNovaPrescricaoModal(prev => ({ ...prev, nome: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Ex: Prescrição Suplementar"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                          <textarea
                            value={novaPrescricaoModal.descricao}
                            onChange={(e) => setNovaPrescricaoModal(prev => ({ ...prev, descricao: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                            rows={2}
                            placeholder="Descrição..."
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700">Itens *</label>
                            <button
                              type="button"
                              onClick={() => setNovaPrescricaoModal(prev => ({
                                ...prev,
                                itens: [...prev.itens, { medicamento: '', dosagem: '', frequencia: '', instrucoes: '' }]
                              }))}
                              className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <Plus size={14} /> Adicionar
                            </button>
                          </div>
                          <div className="space-y-3">
                            {(novaPrescricaoModal.itens || []).map((item, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex justify-between mb-2">
                                  <span className="font-medium text-gray-900 text-sm">Item {idx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => setNovaPrescricaoModal(prev => ({ ...prev, itens: (prev.itens || []).filter((_, i) => i !== idx) }))}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input placeholder="Medicamento *" value={item.medicamento} onChange={(e) => {
                                    const it = [...(novaPrescricaoModal.itens || [])];
                                    it[idx] = { ...it[idx], medicamento: e.target.value };
                                    setNovaPrescricaoModal(prev => ({ ...prev, itens: it }));
                                  }} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                  <input placeholder="Dosagem *" value={item.dosagem} onChange={(e) => {
                                    const it = [...(novaPrescricaoModal.itens || [])];
                                    it[idx] = { ...it[idx], dosagem: e.target.value };
                                    setNovaPrescricaoModal(prev => ({ ...prev, itens: it }));
                                  }} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                  <input placeholder="Frequência *" value={item.frequencia} onChange={(e) => {
                                    const it = [...(novaPrescricaoModal.itens || [])];
                                    it[idx] = { ...it[idx], frequencia: e.target.value };
                                    setNovaPrescricaoModal(prev => ({ ...prev, itens: it }));
                                  }} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                  <input placeholder="Quantidade (opc.)" value={item.quantidade || ''} onChange={(e) => {
                                    const it = [...(novaPrescricaoModal.itens || [])];
                                    it[idx] = { ...it[idx], quantidade: e.target.value };
                                    setNovaPrescricaoModal(prev => ({ ...prev, itens: it }));
                                  }} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                </div>
                                <textarea placeholder="Instruções *" value={item.instrucoes} onChange={(e) => {
                                  const it = [...(novaPrescricaoModal.itens || [])];
                                  it[idx] = { ...it[idx], instrucoes: e.target.value };
                                  setNovaPrescricaoModal(prev => ({ ...prev, itens: it }));
                                }} className="mt-2 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={2} />
                              </div>
                            ))}
                          </div>
                          {(!novaPrescricaoModal.itens || novaPrescricaoModal.itens.length === 0) && (
                            <p className="text-sm text-gray-500 text-center py-2">Nenhum item. Clique em Adicionar.</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                          <textarea
                            value={novaPrescricaoModal.observacoes}
                            onChange={(e) => setNovaPrescricaoModal(prev => ({ ...prev, observacoes: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-purple-500 focus:border-purple-500"
                            rows={2}
                            placeholder="Observações..."
                          />
                        </div>
                        {/* Botões Salvar/Excluir/Imprimir movidos para o footer */}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-1">Nenhuma prescrição selecionada</p>
                        <p className="text-sm text-gray-500 mb-4">Selecione uma prescrição em Prescrições Salvas ou no Histórico.</p>
                        <button
                          onClick={() => setAbaPrescricoesModal('salvas')}
                          className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 flex items-center gap-2 mx-auto"
                        >
                          <ChevronLeft size={16} /> Voltar para Prescrições Salvas
                        </button>
                      </div>
                    )
                )}
              </div>
              {/* Footer: Voltar + Salvar/Excluir/Imprimir quando Descrição com seleção; senão só Fechar */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0 flex flex-wrap items-center gap-2">
                {abaPrescricoesModal === 'descricao' && prescricaoSelecionadaModal ? (
                  <>
                    <button
                      onClick={() => setAbaPrescricoesModal('salvas')}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={async () => {
                              if (!novaPrescricaoModal.nome.trim()) { alert('Nome obrigatório'); return; }
                              if (!novaPrescricaoModal.itens?.length) { alert('Adicione pelo menos um item'); return; }
                              for (const it of (novaPrescricaoModal.itens || [])) {
                                if (!it.medicamento?.trim() || !it.dosagem?.trim() || !it.frequencia?.trim() || !it.instrucoes?.trim()) {
                                  alert('Preencha todos os campos dos itens'); return;
                                }
                              }
                              try {
                                const isTemp = prescricaoSelecionadaModal?.id === 'temp-new';
                                const peso = pacientePrescricoesSelecionado.dadosClinicos?.medidasIniciais?.peso ?? pacientePrescricoesSelecionado.evolucaoSeguimento?.[(pacientePrescricoesSelecionado.evolucaoSeguimento?.length ?? 0) - 1]?.peso;
                                const pacienteIdCtx = (pacientePrescricoesSelecionado.id || '').trim();
                                if (!pacienteIdCtx) { alert('Paciente inválido'); return; }
                                const atualizarHistorico = Boolean(
                                  prescricaoEditandoModal &&
                                    !prescricaoEditandoModal.isTemplate &&
                                    !isTemp &&
                                    (prescricaoEditandoModal.pacienteId || '').trim() === pacienteIdCtx
                                );
                                const data: Omit<Prescricao, 'id'> | Prescricao = atualizarHistorico
                                  ? { ...prescricaoEditandoModal!, pacienteId: pacienteIdCtx, pacienteNome: pacientePrescricoesSelecionado.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, atualizadoEm: new Date() }
                                  : { medicoId: nutricionista.userId, pacienteId: pacienteIdCtx, pacienteNome: pacientePrescricoesSelecionado.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, criadoEm: new Date(), atualizadoEm: new Date(), criadoPor: user?.email || '', isTemplate: false, pesoPaciente: peso ?? undefined };
                                await PrescricaoService.createOrUpdatePrescricao(data);
                                await aposSalvarPrescricaoPaciente(pacientePrescricoesSelecionado);
                                alert('Prescrição salva no histórico!');
                              } catch (e) {
                                console.error(e);
                                alert('Erro ao salvar prescrição');
                              }
                            }}
                            className="p-2 text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center justify-center"
                            title="Salvar"
                          >
                            <Save size={18} />
                          </button>
                          {prescricaoEditandoModal && !prescricaoEditandoModal.isTemplate && (
                            <button
                              onClick={async () => {
                                if (!confirm('Excluir esta prescrição?')) return;
                                try {
                                  await PrescricaoService.deletePrescricao(prescricaoEditandoModal.id);
                                  await loadPrescricoesModal(pacientePrescricoesSelecionado!);
                                  setPrescricaoSelecionadaModal(null);
                                  setPrescricaoEditandoModal(null);
                                  setNovaPrescricaoModal({ nome: '', descricao: '', itens: [], observacoes: '' });
                                  alert('Prescrição excluída');
                                } catch (e) {
                                  console.error(e);
                                  alert('Erro ao excluir');
                                }
                              }}
                              className="p-2 text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center justify-center"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!prescricaoSelecionadaModal || !pacientePrescricoesSelecionado) return;
                              const pesoReal = pacientePrescricoesSelecionado.dadosClinicos?.medidasIniciais?.peso ?? pacientePrescricoesSelecionado.evolucaoSeguimento?.[(pacientePrescricoesSelecionado.evolucaoSeguimento?.length ?? 0) - 1]?.peso;
                              if (!pesoReal) {
                                alert('Cadastre o peso do paciente.');
                                return;
                              }
                              let itensPrint = novaPrescricaoModal.itens || [];
                              if (prescricaoSelecionadaModal.isTemplate) {
                                itensPrint = itensPrint.map((item) => {
                                  if (item.medicamento === 'Whey Protein') {
                                    const total = (pesoReal * 1.6).toFixed(1);
                                    const porRef = (pesoReal * 1.6 / 3).toFixed(1);
                                    return { ...item, dosagem: `${total}g por dia (1,6g por kg)`, instrucoes: `Tomar ~${porRef}g 3x ao dia (total ${total}g/dia).`, quantidade: `${total}g/dia` };
                                  }
                                  if (item.medicamento === 'Creatina MAX' || (item.medicamento || '').includes('Creatina')) {
                                    return { ...item, dosagem: '3,5g por dia', instrucoes: '3,5g/dia em 200ml de água.', quantidade: '3,5g/dia' };
                                  }
                                  return item;
                                });
                              }
                              const prescPrint = { ...prescricaoSelecionadaModal, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: itensPrint, observacoes: novaPrescricaoModal.observacoes, pesoPaciente: pesoReal };
                              const doc = new jsPDF();
                              const dark = [44, 62, 80];
                              const titulo = nutricionista.genero === 'F' ? 'Dra.' : 'Dr.';
                              const nutriNome = `${titulo} ${nutricionista.nome || 'Nutricionista'}`;
                              doc.setFontSize(18);
                              doc.setFont('helvetica', 'bold');
                              doc.setTextColor(...dark);
                              doc.text(nutriNome, 20, 15);
                              doc.setFontSize(9);
                              doc.setFont('helvetica', 'normal');
                              doc.text(`CRN-${nutricionista.registroNumero || '00000'}`, 20, 22);
                              try {
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                await new Promise<void>((res) => {
                                  img.onload = () => { try { doc.addImage(img, 'PNG', 155, 8, 25, 25); } catch { doc.text('Oftware', 180, 15, { align: 'right' }); } res(); };
                                  img.onerror = () => { doc.text('Oftware', 180, 15, { align: 'right' }); res(); };
                                  img.src = '/icones/oftware.png';
                                });
                              } catch { doc.text('Oftware', 180, 15, { align: 'right' }); }
                              doc.setDrawColor(200, 200, 200);
                              doc.line(20, 28, 190, 28);
                              let y = 40;
                              doc.setFontSize(16);
                              doc.setFont('helvetica', 'bold');
                              doc.text('PRESCRIÇÃO NUTRICIONAL', 20, y);
                              y += 10;
                              doc.setFontSize(10);
                              doc.setFont('helvetica', 'normal');
                              const pacNome = pacientePrescricoesSelecionado.dadosIdentificacao?.nomeCompleto || pacientePrescricoesSelecionado.nome || 'Paciente';
                              doc.text(`Paciente: ${pacNome}`, 20, y); y += 6;
                              if (pacientePrescricoesSelecionado.dadosIdentificacao?.cpf) { doc.text(`CPF: ${pacientePrescricoesSelecionado.dadosIdentificacao.cpf}`, 20, y); y += 6; }
                              if (pesoReal) { doc.text(`Peso: ${pesoReal.toFixed(1)} kg`, 20, y); y += 6; }
                              y += 5;
                              doc.setFontSize(12);
                              doc.setFont('helvetica', 'bold');
                              doc.text(prescPrint.nome, 20, y); y += 8;
                              if (prescPrint.descricao) {
                                doc.setFontSize(10);
                                doc.setFont('helvetica', 'normal');
                                const dl = doc.splitTextToSize(prescPrint.descricao, 170);
                                doc.text(dl, 20, y); y += dl.length * 5 + 5;
                              }
                              doc.setFontSize(11);
                              doc.setFont('helvetica', 'bold');
                              doc.text('MEDICAMENTOS/SUPLEMENTOS:', 20, y); y += 8;
                              (prescPrint.itens || []).forEach((item) => {
                                if (y > 270) { doc.addPage(); y = 20; }
                                doc.setFontSize(10);
                                doc.setFont('helvetica', 'bold');
                                doc.text(`${item.medicamento}`, 25, y); y += 6;
                                doc.setFont('helvetica', 'normal');
                                doc.text(`   Dosagem: ${item.dosagem}`, 25, y); y += 5;
                                doc.text(`   Frequência: ${item.frequencia}`, 25, y); y += 5;
                                const il = doc.splitTextToSize(`   ${item.instrucoes}`, 165);
                                doc.text(il, 25, y); y += il.length * 5 + 3;
                                if (item.quantidade) { doc.text(`   Quantidade: ${item.quantidade}`, 25, y); y += 5; }
                                y += 3;
                              });
                              if (prescPrint.observacoes) {
                                if (y > 250) { doc.addPage(); y = 20; }
                                y += 5;
                                doc.setFontSize(10);
                                doc.setFont('helvetica', 'bold');
                                doc.text('OBSERVAÇÕES:', 20, y); y += 6;
                                doc.setFont('helvetica', 'normal');
                                const obsLines = doc.splitTextToSize(prescPrint.observacoes, 170);
                                doc.text(obsLines, 20, y); y += obsLines.length * 5;
                              }
                              if (y > 250) { doc.addPage(); y = 20; }
                              y += 10;
                              doc.setFontSize(9);
                              const dataAtual = new Date().toLocaleDateString('pt-BR');
                              doc.text(`Data: ${dataAtual}`, 20, y); y += 15;
                              doc.line(20, y, 100, y);
                              doc.setFontSize(8);
                              doc.text('Assinatura do Nutricionista', 20, y + 5);
                              doc.save(`Prescricao_${pacNome.replace(/\s/g, '_')}_${dataAtual.replace(/\//g, '_')}.pdf`);
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2"
                          >
                            <Printer size={16} /> Imprimir
                          </button>
                  </>
                ) : (
                  <button onClick={() => setShowModalPrescricoes(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                    Fechar
                  </button>
                )}
              </div>
          </div>
        </div>
      )}

      {/* Modal Nutri (ver como paciente) — mobile: não cobre a barra de menu inferior; sem botão Voltar */}
      {showModalNutri && pacienteNutriSelecionado && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-stretch justify-center px-0 py-0 text-center sm:block sm:min-h-screen sm:p-0">
            <div className="fixed inset-0 bottom-16 lg:bottom-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => { setShowModalNutri(false); setPacienteNutriSelecionado(null); }} aria-hidden="true" />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="fixed top-0 left-0 right-0 bottom-16 lg:inset-0 z-10 flex flex-col overflow-y-auto bg-white sm:static sm:my-8 sm:inline-block sm:max-h-[90vh] sm:w-full sm:max-w-4xl sm:rounded-lg sm:shadow-xl">
              <PacienteModalHeader
                compact
                className="flex-shrink-0"
                patientName={
                  pacienteNutriSelecionado.dadosIdentificacao?.nomeCompleto ||
                  pacienteNutriSelecionado.nome ||
                  'Paciente'
                }
                patientPhotoUrl={
                  pacienteNutriSelecionado.userId
                    ? patientPhotoByUserId[pacienteNutriSelecionado.userId]
                    : null
                }
                dataNascimento={pacienteNutriSelecionado.dadosIdentificacao?.dataNascimento}
                cidade={pacienteNutriSelecionado.dadosIdentificacao?.endereco?.cidade}
                estado={pacienteNutriSelecionado.dadosIdentificacao?.endereco?.estado}
                statusTratamento={pacienteNutriSelecionado.statusTratamento}
                recomendacoesLidas={Boolean(pacienteNutriSelecionado.recomendacoesLidas)}
                dataLeituraRecomendacoes={pacienteNutriSelecionado.dataLeituraRecomendacoes}
                actions={
                  <button
                    type="button"
                    onClick={() => { setShowModalNutri(false); setPacienteNutriSelecionado(null); }}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                    aria-label="Fechar"
                  >
                    <X size={24} />
                  </button>
                }
              />
              <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-3 sm:py-5">
                  <NutriContent
                    paciente={pacienteNutriSelecionado}
                    setPaciente={(p: PacienteCompleto) => setPacienteNutriSelecionado(p)}
                    modoNutricionista
                    habilitarPlanosTemplates
                    chatNutriAuthorKind="nutritionist"
                    chatNutriAuthorName={nutricionista?.nome || user?.displayName || undefined}
                    chatNutriAuthorId={nutricionista?.userId || nutricionista?.id || user?.uid}
                  />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Trainer mobile — tela cheia (somente visualização para nutricionista) */}
      {showModalPersonal && pacientePersonalSelecionado && (
        <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-white">
          <PacienteModalHeader
            compact
            className="flex-shrink-0"
            patientName={
              pacientePersonalSelecionado.dadosIdentificacao?.nomeCompleto ||
              pacientePersonalSelecionado.nome ||
              'Paciente'
            }
            patientPhotoUrl={
              pacientePersonalSelecionado.userId
                ? patientPhotoByUserId[pacientePersonalSelecionado.userId]
                : null
            }
            dataNascimento={pacientePersonalSelecionado.dadosIdentificacao?.dataNascimento}
            cidade={pacientePersonalSelecionado.dadosIdentificacao?.endereco?.cidade}
            estado={pacientePersonalSelecionado.dadosIdentificacao?.endereco?.estado}
            statusTratamento={pacientePersonalSelecionado.statusTratamento}
            recomendacoesLidas={Boolean(pacientePersonalSelecionado.recomendacoesLidas)}
            dataLeituraRecomendacoes={pacientePersonalSelecionado.dataLeituraRecomendacoes}
            actions={
              <button
                type="button"
                onClick={() => {
                  setShowModalPersonal(false);
                  setPacientePersonalSelecionado(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            }
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex min-h-[50dvh] items-center justify-center bg-[#0A1F44] text-sm text-[#E8EDED]/70">
                  Carregando treinos do paciente…
                </div>
              }
            >
              <PersonalPageContent
                key={`personal-nutri-view-${pacientePersonalSelecionado.id}`}
                embedded={false}
                fromMetaadminEmbedded
                metaadminFullscreen
                suppressAppHeader
                professionalReadOnly
                professionalViewerRole="doctor"
                pacienteProp={pacientePersonalSelecionado}
                onCloseMetaadmin={() => {
                  setShowModalPersonal(false);
                  setPacientePersonalSelecionado(null);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Modal de Busca de Personal Trainer por Estado/Cidade */}
      {showModalBuscarPersonalTrainer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Search size={20} className="text-pink-600" />
                  Buscar Personal Trainer
                </h3>
                <button
                  onClick={() => {
                    setShowModalBuscarPersonalTrainer(false);
                    setEstadoBuscaPersonalModal('');
                    setCidadeBuscaPersonalModal('');
                    setPersonalTrainersFiltrados([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Seleção de Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={estadoBuscaPersonalModal}
                  onChange={(e) => {
                    setEstadoBuscaPersonalModal(e.target.value);
                    setCidadeBuscaPersonalModal('');
                    setPersonalTrainersFiltrados([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="">Selecione o estado</option>
                  {estadosComPersonalTrainers.map((estado) => (
                    <option key={estado} value={estado}>
                      {estadosList.find(e => e.sigla === estado)?.nome || estado}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Cidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade
                </label>
                <select
                  value={cidadeBuscaPersonalModal}
                  onChange={(e) => {
                    setCidadeBuscaPersonalModal(e.target.value);
                    setPersonalTrainersFiltrados([]);
                  }}
                  disabled={!estadoBuscaPersonalModal}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione a cidade</option>
                  {estadoBuscaPersonalModal && cidadesComPersonalTrainers
                    .filter(c => c.estado === estadoBuscaPersonalModal)
                    .map((cidade) => (
                      <option key={`${cidade.estado}-${cidade.cidade}`} value={cidade.cidade}>
                        {cidade.cidade}
                      </option>
                    ))}
                </select>
              </div>

              {/* Botão Buscar */}
              <button
                onClick={buscarPersonalTrainersPorLocalizacao}
                disabled={!estadoBuscaPersonalModal || !cidadeBuscaPersonalModal || loadingPersonalTrainersFiltrados}
                className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loadingPersonalTrainersFiltrados ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Buscar</span>
                  </>
                )}
              </button>

              {/* Lista de Personal Trainers Encontrados */}
              {personalTrainersFiltrados.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Personal Trainers encontrados ({personalTrainersFiltrados.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {personalTrainersFiltrados.map((personal) => (
                      <button
                        key={personal.id}
                        onClick={async () => {
                          if (!pacientePersonalSelecionado?.id || !nutricionista?.userId) {
                            alert('Erro: paciente ou nutricionista não encontrado.');
                            return;
                          }

                          setEnviandoCompartilhamentoPersonal(true);
                          try {
                            // O sistema atual requer medicoId, então vamos usar o primeiro médico vinculado ao nutricionista
                            // ou buscar o médico do paciente se disponível
                            if (!nutricionista.medicoVinculadoIds || nutricionista.medicoVinculadoIds.length === 0) {
                              alert('Você precisa estar vinculado a pelo menos um médico para compartilhar pacientes com personal trainers.');
                              return;
                            }
                            
                            // Usar o primeiro médico vinculado (ou implementar lógica para escolher o médico correto)
                            const medicoId = nutricionista.medicoVinculadoIds[0];
                            
                            await SolicitacaoPersonalTrainerService.createPacienteShareRequest(
                              medicoId,
                              personal.userId,
                              pacientePersonalSelecionado.id,
                              {
                                pacienteNome: pacientePersonalSelecionado.dadosIdentificacao?.nomeCompleto || pacientePersonalSelecionado.nome || 'Paciente',
                                medicoNome: 'Médico vinculado', // Pode buscar o nome do médico se necessário
                                personalTrainerNome: personal.nome,
                                personalTrainerEmail: personal.email,
                              }
                            );

                            alert('Solicitação de compartilhamento enviada com sucesso!');
                            setShowModalBuscarPersonalTrainer(false);
                            setEstadoBuscaPersonalModal('');
                            setCidadeBuscaPersonalModal('');
                            setPersonalTrainersFiltrados([]);
                            await loadStatusCompartilhamentoPersonal(pacientePersonalSelecionado.id);
                          } catch (error: any) {
                            console.error('Erro ao compartilhar paciente:', error);
                            alert(error.message || 'Erro ao compartilhar paciente com personal trainer.');
                          } finally {
                            setEnviandoCompartilhamentoPersonal(false);
                          }
                        }}
                        disabled={enviandoCompartilhamentoPersonal}
                        className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                      >
                        <div className="font-medium text-gray-900">{personal.nome}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {personal.registroNumero || 'Sem registro'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensagem quando não há resultados */}
              {estadoBuscaPersonalModal && cidadeBuscaPersonalModal && personalTrainersFiltrados.length === 0 && !loadingPersonalTrainersFiltrados && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Nenhum personal trainer encontrado para {cidadeBuscaPersonalModal}, {estadosList.find(e => e.sigla === estadoBuscaPersonalModal)?.nome || estadoBuscaPersonalModal}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhe - Paciente Concluiu Tratamento */}
      {showModalDetalheConclusao && registroConclusaoParaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => setShowModalDetalheConclusao(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Paciente Concluiu o Tratamento</h3>
                <p className="text-sm text-gray-600">Semana de Conclusão</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              <strong>{registroConclusaoParaModal.pacienteNome || 'Paciente'}</strong> concluiu o tratamento na <strong>Semana {registroConclusaoParaModal.weekIndex}</strong> ({registroConclusaoParaModal.weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} a {registroConclusaoParaModal.weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}).
            </p>
            {registroConclusaoParaModal.peso != null && (
              <p className="text-sm text-gray-600 mb-4">
                Peso final: <strong>{registroConclusaoParaModal.peso} kg</strong>
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowModalDetalheConclusao(false)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal visualização classificação (somente leitura) */}
      {showModalClassificacaoVisualizar && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full pointer-events-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Avaliações</h3>
              <button onClick={() => setShowModalClassificacaoVisualizar(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {detalhamentoVisualizar === null ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { estrelas: 5, count: detalhamentoVisualizar.count5 },
                    { estrelas: 4, count: detalhamentoVisualizar.count4 },
                    { estrelas: 3, count: detalhamentoVisualizar.count3 },
                    { estrelas: 2, count: detalhamentoVisualizar.count2 },
                    { estrelas: 1, count: detalhamentoVisualizar.count1 },
                  ].map(({ estrelas, count }) => (
                    <div key={estrelas} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={16} className={s <= estrelas ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                        ))}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{count} voto{count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 pt-3 mt-3 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Média</span>
                    <span className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} className={s <= Math.round(detalhamentoVisualizar.media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                      ))}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white ml-1">{detalhamentoVisualizar.media.toFixed(1)}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setShowModalClassificacaoVisualizar(false)}
                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPipelineLembreteModal && (
        <ModalNovoLembrete
          pacientes={pacientesVisiveis.map((p) => p.paciente)}
          tags={LEMBRETE_TAGS_NUTRI}
          initialValues={pipelineLembreteDraft}
          defaultTelefoneAviso={telefoneContato || nutricionista?.telefone}
          defaultTelefoneAvisoDdi={telefoneDdiContato || nutricionista?.telefoneDdi}
          defaultTelefoneAvisoPais={telefonePaisContato || nutricionista?.telefonePais}
          audience="nutricionista"
          onFechar={() => {
            setShowPipelineLembreteModal(false);
            setPipelineLembreteDraft(undefined);
          }}
          onSalvar={async (dados) => {
            if (!user?.uid) return;
            await LembreteService.criarLembrete({
              nutricionistaId: user.uid,
              pacienteId: dados.pacienteId,
              pacienteNome: dados.pacienteNome,
              data: dados.data,
              horario: dados.horario,
              avisoWhatsApp: dados.avisoWhatsApp,
              telefoneAviso: dados.telefoneAviso,
              telefoneAvisoDdi: dados.telefoneAvisoDdi,
              telefoneAvisoPais: dados.telefoneAvisoPais,
              notificarPaciente: dados.notificarPaciente,
              texto: dados.texto,
              tag: dados.tag,
              concluido: false,
            });
            await loadLembretes();
            setShowPipelineLembreteModal(false);
            setPipelineLembreteDraft(undefined);
          }}
        />
      )}

    </div>
    </>
  );
}

export default MetaNutriPageV2;
