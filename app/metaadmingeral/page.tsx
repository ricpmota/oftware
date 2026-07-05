'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserService } from '@/services/userService';
import { User as UserType, Residente, Local, Servico, Escala, ServicoDia } from '@/types/auth';
import { Troca } from '@/types/troca';
import { Ferias } from '@/types/ferias';
import FeriasCalendar from '@/components/FeriasCalendar';
import { Users, UserPlus, MapPin, Settings, Calendar, Edit, Menu, X, UserCheck, Building, Wrench, Plus, BarChart3, RefreshCw, MessageSquare, MessageCircle, Trash2, Eye, Target, Mail, Image, AlertCircle, UtensilsCrossed, Phone, Palette, FlaskConical, Activity, Scale, Flame } from 'lucide-react';
import EditModal from '@/components/EditModal';
import EditResidenteForm from '@/components/EditResidenteForm';
import EditLocalForm from '@/components/EditLocalForm';
import EditServicoForm from '@/components/EditServicoForm';
import EditEscalaForm from '@/components/EditEscalaForm';
import { MensagemService } from '@/services/mensagemService';
import { Mensagem, MensagemResidenteParaAdmin } from '@/types/mensagem';
import { MedicoService } from '@/services/medicoService';
import { Medico } from '@/types/medico';
import {
  isAnamneseInteligenteAtivoParaMedico,
  isMetaAdminGeralEmail,
} from '@/lib/meta/anamneseInteligenteGate';
import { isMetodoImagensAtivo, METODO_IMAGENS_SOURCE_EMAIL, type MetodoImagensTemplate } from '@/lib/metodo/metodoImagens';
import { NutricionistaService } from '@/services/nutricionistaService';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { TirzepatidaService, TirzepatidaPreco } from '@/services/tirzepatidaService';
import { Stethoscope, CheckCircle, XCircle, Shield, ShieldCheck, Pill, DollarSign, Dumbbell, Star, QrCode, Sparkles } from 'lucide-react';
import { ClassificacaoProfissionalService, type DetalhamentoClassificacao } from '@/services/classificacaoProfissionalService';
import type { ProfissionalTipo } from '@/types/classificacaoProfissional';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import { SolicitacaoMedico } from '@/types/solicitacaoMedico';
import { LeadService } from '@/services/leadService';
import { Lead, LeadStatus } from '@/types/lead';
import EmailManagement from '@/components/EmailManagement';
import CalendarioAplicacoes from '@/components/CalendarioAplicacoes';
import DashboardEvolucao from '@/components/DashboardEvolucao';
import { BannerService } from '@/services/bannerService';
import { Banner, BannerContent } from '@/types/banner';
import { NPSService } from '@/services/npsService';
import { NPSResposta, NPSEstatisticas } from '@/types/nps';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
import { User as UserIcon } from 'lucide-react';
import { IndicacaoService } from '@/services/indicacaoService';
import { Indicacao } from '@/types/indicacao';
import { PagamentoService } from '@/services/pagamentoService';
import { PagamentoPaciente, VendaAvulsa } from '@/types/pagamento';
import { FileText, BookOpen, Save, ChevronDown, ChevronRight } from 'lucide-react';
import RelatoriosSection from '@/components/RelatoriosSection';
import { OFTPAY_COURSES } from '@/app/oftpay/coursesConfig';
import TranscribeOftreviewPanel from '@/components/dev/TranscribeOftreviewPanel';
import TranscribeStatusCard from '@/components/dev/TranscribeStatusCard';
import type { OftpayLearningInsightsAdminPayload } from '@/lib/oftpay/oftpayLearningInsightsAdmin';
import SystemColorsTab from '@/components/systemColors/SystemColorsTab';
import LabExamesLaboratoriaisAdmin from '@/components/metaadmingeral/LabExamesLaboratoriaisAdmin';
import BioImpedanciaReferenciasAdmin from '@/components/metaadmingeral/BioImpedanciaReferenciasAdmin';
import ProtocolosPrescricaoAdmin from '@/components/metaadmingeral/ProtocolosPrescricaoAdmin';
import MetaBusinessAdminPanel from '@/components/metaadmingeral/MetaBusinessAdminPanel';
import OrganizationsHubPanel from '@/components/metaadmingeral/OrganizationsHubPanel';
import PlatformPatrimonioHubPanel from '@/components/metaadmingeral/PlatformPatrimonioHubPanel';
import ContratosAdminPanel from '@/components/metaadmingeral/ContratosAdminPanel';
import { MedicoPublicUrlQrModal } from '@/components/metaadmingeral/MedicoPublicUrlQrModal';
import ModalDosesAplicadasPaciente from '@/components/metaadmingeral/ModalDosesAplicadasPaciente';
import { publicDrUrlForMedico } from '@/utils/medicoDrSlug';
import { metaAdminGeralAcessarUrl } from '@/lib/metaadmin/metaAdminGeralLogin';
import MetaAdminGeralNavShell, {
  defaultActiveOrganizationId,
} from '@/components/metaadmingeral/MetaAdminGeralNavShell';
import OrganizationDashboardPanel from '@/components/metaadmingeral/OrganizationDashboardPanel';
import OrganizationFinanceiroPanel from '@/components/metaadmingeral/OrganizationFinanceiroPanel';
import { buildOrganizationDashboardMetrics } from '@/lib/metaadmingeral/buildOrganizationDashboardMetrics';
import { buildOrganizationFinanceMetrics } from '@/lib/metaadmingeral/buildOrganizationFinanceMetrics';
import { buildOrganizationClinicalOutcomeMetrics } from '@/lib/metaadmingeral/buildOrganizationClinicalOutcomeMetrics';
import { isOrganizationTeamMember } from '@/lib/organization/isOrganizationTeamMember';
import OrganizationMetodoPanel from '@/components/metaadmingeral/OrganizationMetodoPanel';
import OrganizationBrandingPanel from '@/components/metaadmingeral/OrganizationBrandingPanel';
import OftwareDashboardPanel from '@/components/metaadmingeral/OftwareDashboardPanel';
import PlatformHealthAuditPanel from '@/components/metaadmingeral/PlatformHealthAuditPanel';
import {
  inferNavContextFromMenu,
  listNavOrganizations,
  resolveMetaAdminGeralMenuId,
  type MetaAdminGeralNavContext,
} from '@/lib/metaadmingeral/metaAdminGeralNavUx';
import MetaAdminGeralBrandMark, {
  MetaAdminGeralLoadingScreen,
} from '@/components/metaadmingeral/MetaAdminGeralBrandMark';
import { META_ADMIN_GERAL_BRANDING, META_ADMIN_GERAL_SHELL } from '@/lib/metaadmin/metaAdminGeralBranding';

const getLeadTimestamp = (date?: Date) => (date instanceof Date ? date.getTime() : 0);

const sortLeadsByStatusDate = (_status: LeadStatus, statusLeads: Lead[]) => {
  statusLeads.sort((a, b) => {
    const estrelasA = a.estrelas || 0;
    const estrelasB = b.estrelas || 0;
    if (estrelasB !== estrelasA) return estrelasB - estrelasA;

    const dateA = getLeadTimestamp(a.createdAt) || getLeadTimestamp(a.dataStatus);
    const dateB = getLeadTimestamp(b.createdAt) || getLeadTimestamp(b.dataStatus);
    return dateB - dateA;
  });
};

export default function MetaAdminGeralPage() {
  return (
    <Suspense
      fallback={
        <MetaAdminGeralLoadingScreen />
      }
    >
      <MetaAdminGeralContent />
    </Suspense>
  );
}

function MetaAdminGeralContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeMenu, setActiveMenu] = useState('dashboard-oftware');
  const [navContext, setNavContext] = useState<MetaAdminGeralNavContext>('platform');
  const [activeOrganizationId, setActiveOrganizationId] = useState(defaultActiveOrganizationId);
  const [filtroPeriodo, setFiltroPeriodo] = useState<'semana' | 'mes' | 'ano'>('semana');
  const [users, setUsers] = useState<UserType[]>([]);
  const [firebaseUsers, setFirebaseUsers] = useState<{
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    disabled: boolean;
    metadata: {
      creationTime: string;
      lastSignInTime?: string;
    };
  }[]>([]);
  const [editingUser, setEditingUser] = useState<{
    uid: string;
    name: string;
    role: string;
  } | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'residente' | 'recepcao'>('admin');
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  
  // Auto-dismiss para mensagens
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000); // Desaparece após 5 segundos
      return () => clearTimeout(timer);
    }
  }, [message]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificacoesTroca, setNotificacoesTroca] = useState(0);
  const [trocasPendentes, setTrocasPendentes] = useState<Troca[]>([]);
  const [loadingTrocas, setLoadingTrocas] = useState(false);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [feriasPendentes, setFeriasPendentes] = useState<Ferias[]>([]);
  const [loadingFerias, setLoadingFerias] = useState(false);
  
  // Estados para médicos
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [metodoImagensTemplate, setMetodoImagensTemplate] = useState<MetodoImagensTemplate | null>(null);
  const [loadingMetodoTemplate, setLoadingMetodoTemplate] = useState(false);
  const [togglingMetodoMedicoId, setTogglingMetodoMedicoId] = useState<string | null>(null);
  
  // Estados para nutricionistas
  const [nutricionistas, setNutricionistas] = useState<NutricionistaDoc[]>([]);
  const [loadingNutricionistas, setLoadingNutricionistas] = useState(false);
  const [showDetalhesNutriModal, setShowDetalhesNutriModal] = useState(false);
  const [nutriDetalhes, setNutriDetalhes] = useState<NutricionistaDoc | null>(null);
  const [totalPacientesCompartilhados, setTotalPacientesCompartilhados] = useState<number>(0);
  const [loadingPacientesCompartilhados, setLoadingPacientesCompartilhados] = useState(false);
  
  // Estados para personal trainers
  const [personalTrainers, setPersonalTrainers] = useState<PersonalTrainerDoc[]>([]);
  const [loadingPersonalTrainers, setLoadingPersonalTrainers] = useState(false);
  const [showDetalhesPersonalModal, setShowDetalhesPersonalModal] = useState(false);
  const [personalDetalhes, setPersonalDetalhes] = useState<PersonalTrainerDoc | null>(null);
  const [agregadosMedicos, setAgregadosMedicos] = useState<Record<string, { count: number; media: number }>>({});
  const [agregadosNutri, setAgregadosNutri] = useState<Record<string, { count: number; media: number }>>({});
  const [agregadosPersonal, setAgregadosPersonal] = useState<Record<string, { count: number; media: number }>>({});
  const [showModalClassificacaoAdmin, setShowModalClassificacaoAdmin] = useState(false);
  const [profissionalClassificacao, setProfissionalClassificacao] = useState<{ tipo: ProfissionalTipo; id: string; nome: string } | null>(null);
  const [detalhamentoEdit, setDetalhamentoEdit] = useState<DetalhamentoClassificacao | null>(null);
  const [salvandoClassificacaoAdmin, setSalvandoClassificacaoAdmin] = useState(false);

  // Estados para OftPay (usuários que entram no OftPay – liberar cursos e vigência)
  const [oftpayUsers, setOftpayUsers] = useState<{ email: string; displayName?: string | null; lastLoginAt?: number; courseIds: string[]; questoesEnabled?: boolean; accessStartAt?: number | null; accessEndAt?: number | null }[]>([]);
  const [loadingOftPay, setLoadingOftPay] = useState(false);
  const [oftpayError, setOftpayError] = useState<string | null>(null);
  const [oftpayLocalCourseIds, setOftpayLocalCourseIds] = useState<Record<string, string[]>>({});
  const [oftpayLocalQuestoesEnabled, setOftpayLocalQuestoesEnabled] = useState<Record<string, boolean>>({});
  const [oftpayLocalAccessStart, setOftpayLocalAccessStart] = useState<Record<string, string>>({});
  const [oftpayLocalAccessEnd, setOftpayLocalAccessEnd] = useState<Record<string, string>>({});
  const [oftpaySavingEmail, setOftpaySavingEmail] = useState<string | null>(null);
  const [oftpayNewEmail, setOftpayNewEmail] = useState('');
  const [oftpayAddingUser, setOftpayAddingUser] = useState(false);
  const [oftpayDeletingEmail, setOftpayDeletingEmail] = useState<string | null>(null);
  const [oftpayExpandedEmail, setOftpayExpandedEmail] = useState<string | null>(null);
  const [oftpayUserDetails, setOftpayUserDetails] = useState<Record<string, { coursePercentages: Record<string, number>; lastLoginUserAgent: string | null; lastLoginAt: number | null }>>({});
  const [oftpayLoadingDetails, setOftpayLoadingDetails] = useState<string | null>(null);
  const [oftpayLearnPayload, setOftpayLearnPayload] = useState<OftpayLearningInsightsAdminPayload | null>(null);
  const [loadingOftpayLearn, setLoadingOftpayLearn] = useState(false);
  const [oftpayLearnError, setOftpayLearnError] = useState<string | null>(null);
  const [oftpayLearnDomain, setOftpayLearnDomain] = useState('');
  const [oftpayLearnExam, setOftpayLearnExam] = useState('');
  const [oftpayLearnEff, setOftpayLearnEff] = useState('');
  const [oftpayLearnStab, setOftpayLearnStab] = useState('');
  const oftpayLearnFiltersRef = useRef({
    domain: '',
    exam: '',
    eff: '',
    stab: '',
  });
  const [transcribeBatchId, setTranscribeBatchId] = useState('');
  
  // Estados para pacientes
  const [pacientes, setPacientes] = useState<PacienteCompleto[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [rastrosSubcolecoesPacientes, setRastrosSubcolecoesPacientes] = useState<Record<string, string[]>>({});
  const [loadingRastrosSubcolecoesPacientes, setLoadingRastrosSubcolecoesPacientes] = useState(false);
  const [filtroBuscaPaciente, setFiltroBuscaPaciente] = useState('');
  const [filtroMedicoPaciente, setFiltroMedicoPaciente] = useState<string>('todos');
  const [filtroStatusPaciente, setFiltroStatusPaciente] = useState<string>('todos');
  const [filtroRecomendacoesPaciente, setFiltroRecomendacoesPaciente] = useState<string>('todos');
  /** IDs de documentos em solicitacoes_medico (mais recente primeiro na origem) por paciente_completos.id ou por email */
  const [idsSolicitacaoMedicoPorPaciente, setIdsSolicitacaoMedicoPorPaciente] = useState<{
    porPacienteDocId: Record<string, string>;
    porEmail: Record<string, string>;
  }>({ porPacienteDocId: {}, porEmail: {} });
  
  // Estados para filtro de estatísticas
  const [filtroMedicoEstatisticas, setFiltroMedicoEstatisticas] = useState<string>('total');
  const [filtroDosePerdaPeso, setFiltroDosePerdaPeso] = useState<string>('todas');
  const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState<string>('todas');
  const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState<string>('todos');
  
  // Estados para solicitações pendentes
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<SolicitacaoMedico[]>([]);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);
  
  // Estados para leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadsByStatus, setLeadsByStatus] = useState<Record<LeadStatus, Lead[]>>({
    nao_qualificado: [],
    enviado_contato: [],
    contato_feito: [],
    qualificado: [],
    excluido: [],
  });
  const [leadsQualificadosDesaparecidos, setLeadsQualificadosDesaparecidos] = useState<number>(0);
  const pipelineLeadsScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollPipelineToStatus = useCallback((targetStatus: LeadStatus) => {
    const container = pipelineLeadsScrollRef.current;
    if (!container) return;

    const targetColumn = container.querySelector(`[data-pipeline-column="${targetStatus}"]`) as HTMLElement | null;
    if (!targetColumn) return;

    const containerRect = container.getBoundingClientRect();
    const columnRect = targetColumn.getBoundingClientRect();
    const currentScroll = container.scrollLeft;
    const columnCenter = columnRect.left - containerRect.left + (columnRect.width / 2) + currentScroll;
    const nextScrollLeft = Math.max(0, columnCenter - (containerRect.width / 2));

    container.scrollTo({
      left: nextScrollLeft,
      behavior: 'smooth',
    });
  }, []);
  
  // Estado para aba do calendário
  const [calendarioTab, setCalendarioTab] = useState<'calendario' | 'dashboard'>('calendario');
  
  // Estados para Banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [showEditarBannerModal, setShowEditarBannerModal] = useState(false);
  const [bannerEditando, setBannerEditando] = useState<Banner | null>(null);
  const [dadosBanner, setDadosBanner] = useState<{
    titulo: string;
    imagemUrl: string;
    conteudoHtml?: string;
    conteudoJson?: BannerContent;
    formato: 'html' | 'json';
    local: 'home' | 'meta';
    ativo: boolean;
    ordem: number;
  }>({
    titulo: '',
    imagemUrl: '',
    conteudoHtml: '',
    conteudoJson: undefined,
    formato: 'json',
    local: 'meta', // Padrão para meta (banners existentes)
    ativo: true,
    ordem: 0
  });
  const [pastaBannerAtiva, setPastaBannerAtiva] = useState<'home' | 'meta'>('meta');
  const [jsonError, setJsonError] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Estados para NPS
  const [npsEstatisticas, setNpsEstatisticas] = useState<NPSEstatisticas | null>(null);
  
  // Estados para indicações e faturamento
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loadingIndicacoes, setLoadingIndicacoes] = useState(false);
  const indicacoesCarregadasRef = useRef(false);
  const [pagamentosPacientes, setPagamentosPacientes] = useState<Record<string, PagamentoPaciente>>({});
  const [vendasAvulsas, setVendasAvulsas] = useState<VendaAvulsa[]>([]);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);
  const [npsRespostas, setNpsRespostas] = useState<NPSResposta[]>([]);
  const [loadingNPS, setLoadingNPS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados para modais de edição
  const [showEditarMedicoModal, setShowEditarMedicoModal] = useState(false);
  const [medicoQrLinkModal, setMedicoQrLinkModal] = useState<Medico | null>(null);
  const [medicoEditando, setMedicoEditando] = useState<Medico | null>(null);
  const [dadosMedicoEditando, setDadosMedicoEditando] = useState({
    nome: '',
    email: '',
    telefone: '',
    genero: '' as 'M' | 'F' | '',
    crmNumero: '',
    crmEstado: '',
    endereco: '',
    cep: '',
    pontoReferencia: ''
  });
  
  const [showEditarPacienteModal, setShowEditarPacienteModal] = useState(false);
  const [pacienteDosesModal, setPacienteDosesModal] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [pacienteEditando, setPacienteEditando] = useState<PacienteCompleto | null>(null);
  const [dadosPacienteEditando, setDadosPacienteEditando] = useState({
    nomeCompleto: '',
    email: '',
    telefone: '',
    cpf: '',
    dataNascimento: '',
    sexoBiologico: '' as 'M' | 'F' | 'Outro' | '',
    rua: '',
    cidade: '',
    estado: '',
    cep: ''
  });
  
  // Estados para Tirzepatida
  const [tirzepatidaPrecos, setTirzepatidaPrecos] = useState<TirzepatidaPreco[]>([]);
  const [editandoTirzepatida, setEditandoTirzepatida] = useState<{ tipo: string; preco: number } | null>(null);
  const [editandoTirzepatidaTipo, setEditandoTirzepatidaTipo] = useState<string | null>(null);
  const [precoEditandoTirzepatida, setPrecoEditandoTirzepatida] = useState<string>('0');
  const [loadingTirzepatida, setLoadingTirzepatida] = useState(false);
  
  // Estados para mensagens
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [showEnviarMensagem, setShowEnviarMensagem] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState({
    titulo: '',
    mensagem: '',
    destinatarios: 'todos' as 'todos' | 'especificos',
    residentesSelecionados: [] as string[]
  });
  
  // Estados para mensagens dos residentes
  const [mensagensResidentes, setMensagensResidentes] = useState<MensagemResidenteParaAdmin[]>([]);
  const [loadingMensagensResidentes, setLoadingMensagensResidentes] = useState(false);
  const [mensagensNaoLidasResidentes, setMensagensNaoLidasResidentes] = useState(0);
  const [activeTabMensagens, setActiveTabMensagens] = useState<'enviadas' | 'recebidas'>('enviadas');
  const [showMensagemModal, setShowMensagemModal] = useState(false);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<MensagemResidenteParaAdmin | null>(null);
  const [showMensagemEnviadaModal, setShowMensagemEnviadaModal] = useState(false);
  const [mensagemEnviadaSelecionada, setMensagemEnviadaSelecionada] = useState<Mensagem | null>(null);
  
  // Estados para modais de cadastro
  const [showCadastrarResidenteModal, setShowCadastrarResidenteModal] = useState(false);
  const [showCadastrarLocalModal, setShowCadastrarLocalModal] = useState(false);
  const [showCadastrarServicoModal, setShowCadastrarServicoModal] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectMenu = useCallback((menuId: string) => {
    const resolved = resolveMetaAdminGeralMenuId(menuId);
    setNavContext(inferNavContextFromMenu(resolved));
    setActiveMenu(resolved);
  }, []);

  const enterOrganization = useCallback((organizationId: string) => {
    setActiveOrganizationId(organizationId);
    setNavContext('organization');
    setActiveMenu('org-dashboard');
  }, []);

  // Deep links ?menu= — preserva IDs legados
  useEffect(() => {
    const menuParam = searchParams.get('menu');
    if (!menuParam) return;
    const resolved = resolveMetaAdminGeralMenuId(menuParam);
    setNavContext(inferNavContextFromMenu(resolved));
    setActiveMenu(resolved);
    if (inferNavContextFromMenu(resolved) === 'organization') {
      const orgParam = searchParams.get('org');
      if (orgParam) setActiveOrganizationId(orgParam);
    }
  }, [searchParams]);

  // Garantir que o tema sempre seja claro (modo escuro desativado)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      // Sempre remover a classe 'dark' para garantir tema claro
      root.classList.remove('dark');
    }
  }, []);

  // Form states
  const [newResidente, setNewResidente] = useState({ nome: '', nivel: 'R1' as 'R1' | 'R2' | 'R3', email: '', telefone: '' });
  const [newLocal, setNewLocal] = useState({ nome: '' });
  const [newServico, setNewServico] = useState({ nome: '', localId: '' });
  
  // Escalas states
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [novaEscala, setNovaEscala] = useState({
    dataInicio: '',
    dias: {
      segunda: [] as ServicoDia[],
      terca: [] as ServicoDia[],
      quarta: [] as ServicoDia[],
      quinta: [] as ServicoDia[],
      sexta: [] as ServicoDia[],
      sabado: [] as ServicoDia[],
      domingo: [] as ServicoDia[]
    }
  });
  const [activeTab, setActiveTab] = useState('segunda');
  const [escalasExpandidas, setEscalasExpandidas] = useState<Set<string>>(new Set());

  // Modal states
  const [editModal, setEditModal] = useState({
    isOpen: false,
    type: '', // 'residente', 'local', 'servico', 'escala'
    data: null as Residente | Local | Servico | Escala | null
  });

  const ensureAdminUser = useCallback(async () => {
    try {
      if (user?.email === 'ricpmota.med@gmail.com') {
        // Verificar se o usuário admin já existe
        const users = await UserService.getAllUsers();
        const adminExists = users.some(u => u.email === 'ricpmota.med@gmail.com');
        
        if (!adminExists) {
          await UserService.createAdminUser(user.uid, user.displayName || 'Admin', user.email || 'ricpmota.med@gmail.com');
        }
      }
    } catch (error) {
      console.error('Erro ao garantir usuário admin:', error);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Primeiro, garantir que o usuário admin existe
      await ensureAdminUser();
      
      const [usersData, residentesData, locaisData, servicosData, escalasData] = await Promise.all([
        UserService.getAllUsers(),
        UserService.getAllResidentes(),
        UserService.getAllLocais(),
        UserService.getAllServicos(),
        UserService.getAllEscalas()
      ]);
      
      setUsers(usersData);
      setResidentes(residentesData);
      setLocais(locaisData);
      setServicos(servicosData);
      setEscalas(escalasData);
      
      // Buscar usuários do Firebase Authentication
      // Como a API está falhando, usar diretamente os dados do console
      const firebaseUsersData = await getFirebaseUsersFromConsole();
      console.log('Usuários carregados do console:', firebaseUsersData.length);
      
      setFirebaseUsers(firebaseUsersData);
      
      // Sincronizar usuários do Firebase Auth com Firestore
      await syncFirebaseUsersWithFirestore(firebaseUsersData, usersData);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [ensureAdminUser]);

  // Função para buscar usuários do Firebase Authentication baseado nos dados do console
  const getFirebaseUsersFromConsole = async () => {
    try {
      // Lista completa de usuários baseada no console do Firebase
      const firebaseUsers = [
        {
          uid: 'ntSS2TpLSKcqUjKex7eSdqeti...',
          email: 'ajricarte@gmail.com',
          displayName: 'AJ Ricarte',
          emailVerified: true,
          disabled: false,
          metadata: {
            creationTime: '2025-09-15T00:00:00.000Z',
            lastSignInTime: '2025-09-15T00:00:00.000Z'
          }
        },
        {
          uid: 'FFjwwwnNmrVSAtGIGMQfsVa...',
          email: 'romulogfilho@gmail.com',
          displayName: 'Romulo G Filho',
          emailVerified: true,
          disabled: false,
          metadata: {
            creationTime: '2025-09-15T00:00:00.000Z',
            lastSignInTime: '2025-09-15T00:00:00.000Z'
          }
        },
        {
          uid: 'danielalpinto10...',
          email: 'danielalpinto10@gmail.com',
          displayName: 'Daniel Pinto',
          emailVerified: true,
          disabled: false,
          metadata: {
            creationTime: '2025-09-15T00:00:00.000Z',
            lastSignInTime: '2025-09-15T00:00:00.000Z'
          }
        },
        {
          uid: 'marianat.oliveeira...',
          email: 'marianat.oliveeira@gmail.com',
          displayName: 'Mariana Oliveira',
          emailVerified: true,
          disabled: false,
          metadata: {
            creationTime: '2025-09-15T00:00:00.000Z',
            lastSignInTime: '2025-09-15T00:00:00.000Z'
          }
        },
        {
          uid: 'marielleboaventura...',
          email: 'marielleboaventura@gmail.com',
          displayName: 'Marielle Boaventura',
          emailVerified: true,
          disabled: false,
          metadata: {
            creationTime: '2025-09-15T00:00:00.000Z',
            lastSignInTime: '2025-09-15T00:00:00.000Z'
          }
        },
        {
          uid: 'hianefn2...',
          email: 'hianefn2@gmail.com',
          displayName: 'Hiane',
          emailVerified: true,
          disabled: false,
          metadata: {
            creationTime: '2025-08-18T00:00:00.000Z',
            lastSignInTime: '2025-09-04T00:00:00.000Z'
          }
        },
      ];

      console.log('Usuários do Firebase Authentication carregados:', firebaseUsers.length);
      return firebaseUsers;
    } catch (error) {
      console.error('Erro ao buscar usuários do console:', error);
      return [];
    }
  };

  const syncFirebaseUsersWithFirestore = async (firebaseUsers: {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    disabled: boolean;
    metadata: {
      creationTime: string;
      lastSignInTime?: string;
    };
  }[], firestoreUsers: UserType[]) => {
    try {
      for (const firebaseUser of firebaseUsers) {
        const existsInFirestore = firestoreUsers.some(u => u.uid === firebaseUser.uid);
        
        if (!existsInFirestore) {
          // Criar usuário no Firestore se não existir
          await UserService.createAdminUser(
            firebaseUser.uid,
            firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
            firebaseUser.email || ''
          );
          console.log('Usuário sincronizado:', firebaseUser.email);
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar usuários:', error);
    }
  };


  useEffect(() => {
    const returnPath = searchParams.toString()
      ? `/metaadmingeral?${searchParams.toString()}`
      : '/metaadmingeral';

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setUserLoading(false);
      
      if (!user) {
        router.push(metaAdminGeralAcessarUrl(returnPath));
        return;
      }
      
      // APENAS ricpmota.med@gmail.com pode acessar /metaadmingeral
      if (user.email === 'ricpmota.med@gmail.com') {
        loadData();
      } else {
        // Qualquer outro usuário é redirecionado
        router.push('/meta');
      }
    });

    return () => unsubscribe();
  }, [router, loadData, searchParams]);

  const loadTrocasPendentes = useCallback(async () => {
    if (!user) return;
    
    setLoadingTrocas(true);
    try {
      const pendentes = await UserService.getTrocasPendentes(200);
      setTrocasPendentes(pendentes);
      setNotificacoesTroca(pendentes.length);
    } catch (error) {
      console.error('Erro ao carregar trocas:', error);
    } finally {
      setLoadingTrocas(false);
    }
  }, [user]);

  const loadFeriasAdmin = useCallback(async () => {
    if (!user) return;
    
    setLoadingFerias(true);
    try {
      const [todasFerias, pendentes] = await Promise.all([
        UserService.getAllFerias(),
        UserService.getFeriasPendentes(200),
      ]);
      setFeriasPendentes(pendentes);
      setFerias(todasFerias);
    } catch (error) {
      console.error('Erro ao carregar férias:', error);
      setFeriasPendentes([]);
      setFerias([]);
    } finally {
      setLoadingFerias(false);
    }
  }, [user]);

  const loadFeriasPendentes = useCallback(async () => {
    if (!user) return;
    
    console.log('🔄 Carregando férias pendentes no admin...');
    setLoadingFerias(true);
    try {
      const feriasData = await UserService.getFeriasPendentes(200);
      console.log('📊 Todas as férias carregadas:', feriasData.length);
      console.log('📋 Status das férias:', feriasData.map(f => ({ id: f.id, status: f.status, residente: f.residenteEmail })));
      console.log('⏳ Férias pendentes:', feriasData.length);
      setFeriasPendentes(feriasData);
    } catch (error) {
      console.error('❌ Erro ao carregar férias:', error);
    } finally {
      setLoadingFerias(false);
    }
  }, [user]);

  // Função para carregar médicos
  const loadMedicos = useCallback(async () => {
    setLoadingMedicos(true);
    try {
      const medicosData = await MedicoService.getAllMedicos();
      setMedicos(medicosData);
    } catch (error) {
      console.error('Erro ao carregar médicos:', error);
    } finally {
      setLoadingMedicos(false);
    }
  }, []);

  const loadMetodoImagensTemplate = useCallback(async (forceSync = false) => {
    if (!user) return;
    setLoadingMetodoTemplate(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/metodo/template', {
        method: forceSync ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setMetodoImagensTemplate(data.template ?? null);
      if (forceSync) {
        setMessage('Template Método sincronizado da conta fonte.');
      }
    } catch (error) {
      console.error('Erro ao carregar template Método:', error);
      setMetodoImagensTemplate(null);
      if (forceSync) {
        setMessage(
          error instanceof Error ? error.message : 'Erro ao sincronizar template Método'
        );
      }
    } finally {
      setLoadingMetodoTemplate(false);
    }
  }, [user]);

  // Função para carregar nutricionistas
  const loadNutricionistas = useCallback(async () => {
    setLoadingNutricionistas(true);
    try {
      const nutricionistasData = await NutricionistaService.getAllNutricionistas();
      setNutricionistas(nutricionistasData);
    } catch (error) {
      console.error('Erro ao carregar nutricionistas:', error);
      setMessage('Erro ao carregar nutricionistas');
    } finally {
      setLoadingNutricionistas(false);
    }
  }, []);

  // Função para carregar personal trainers
  const loadPersonalTrainers = useCallback(async () => {
    setLoadingPersonalTrainers(true);
    try {
      const personalTrainersData = await PersonalTrainerService.getAllPersonalTrainers();
      setPersonalTrainers(personalTrainersData);
    } catch (error) {
      console.error('Erro ao carregar personal trainers:', error);
      setMessage('Erro ao carregar personal trainers');
    } finally {
      setLoadingPersonalTrainers(false);
    }
  }, []);

  // Carregar agregados de classificação dos médicos
  useEffect(() => {
    if (medicos.length === 0) { setAgregadosMedicos({}); return; }
    const load = async () => {
      const map: Record<string, { count: number; media: number }> = {};
      await Promise.all(medicos.map(async (m) => {
        const a = await ClassificacaoProfissionalService.getAgregado('medico', m.id);
        map[m.id] = a;
      }));
      setAgregadosMedicos(map);
    };
    load();
  }, [medicos]);

  // Carregar agregados de classificação dos nutricionistas
  useEffect(() => {
    if (nutricionistas.length === 0) { setAgregadosNutri({}); return; }
    const load = async () => {
      const map: Record<string, { count: number; media: number }> = {};
      await Promise.all(nutricionistas.map(async (n) => {
        const id = n.userId || n.id;
        if (id) {
          const a = await ClassificacaoProfissionalService.getAgregado('nutricionista', id);
          map[id] = a;
        }
      }));
      setAgregadosNutri(map);
    };
    load();
  }, [nutricionistas]);

  // Carregar agregados de classificação dos personal trainers
  useEffect(() => {
    if (personalTrainers.length === 0) { setAgregadosPersonal({}); return; }
    const load = async () => {
      const map: Record<string, { count: number; media: number }> = {};
      await Promise.all(personalTrainers.map(async (p) => {
        const id = p.id || p.userId;
        if (id) {
          const a = await ClassificacaoProfissionalService.getAgregado('personal', id);
          map[id] = a;
        }
      }));
      setAgregadosPersonal(map);
    };
    load();
  }, [personalTrainers]);

  const openModalClassificacaoAdmin = async (tipo: ProfissionalTipo, id: string, nome: string) => {
    setProfissionalClassificacao({ tipo, id, nome });
    setDetalhamentoEdit(null);
    setShowModalClassificacaoAdmin(true);
    const det = await ClassificacaoProfissionalService.getDetalhamento(tipo, id);
    setDetalhamentoEdit(det);
  };

  const handleSalvarClassificacaoAdmin = async () => {
    if (!profissionalClassificacao || !detalhamentoEdit) return;
    setSalvandoClassificacaoAdmin(true);
    try {
      await ClassificacaoProfissionalService.setAdminOverride(
        profissionalClassificacao.tipo,
        profissionalClassificacao.id,
        {
          count5: detalhamentoEdit.count5,
          count4: detalhamentoEdit.count4,
          count3: detalhamentoEdit.count3,
          count2: detalhamentoEdit.count2,
          count1: detalhamentoEdit.count1,
        }
      );
      const novoAgregado = await ClassificacaoProfissionalService.getAgregado(profissionalClassificacao.tipo, profissionalClassificacao.id);
      if (profissionalClassificacao.tipo === 'medico') {
        setAgregadosMedicos((prev) => ({ ...prev, [profissionalClassificacao.id]: novoAgregado }));
      } else if (profissionalClassificacao.tipo === 'nutricionista') {
        setAgregadosNutri((prev) => ({ ...prev, [profissionalClassificacao.id]: novoAgregado }));
      } else {
        setAgregadosPersonal((prev) => ({ ...prev, [profissionalClassificacao.id]: novoAgregado }));
      }
      setMessage('Classificação atualizada com sucesso!');
      setShowModalClassificacaoAdmin(false);
    } catch (error) {
      console.error('Erro ao salvar classificação:', error);
      setMessage('Erro ao salvar classificação');
    } finally {
      setSalvandoClassificacaoAdmin(false);
    }
  };

  // Função para carregar pacientes
  const loadPacientes = useCallback(async () => {
    setLoadingPacientes(true);
    try {
      const [pacientesData, todasSolicitacoesMedico] = await Promise.all([
        PacienteService.getAllPacientes(),
        SolicitacaoMedicoService.getAllSolicitacoes().catch(() => [] as SolicitacaoMedico[]),
      ]);
      setPacientes(pacientesData);

      const porPacienteDocId: Record<string, string> = {};
      const porEmail: Record<string, string> = {};
      for (const s of todasSolicitacoesMedico) {
        if (s.pacienteId && !porPacienteDocId[s.pacienteId]) {
          porPacienteDocId[s.pacienteId] = s.id;
        }
        const em = s.pacienteEmail?.toLowerCase().trim();
        if (em && !porEmail[em]) {
          porEmail[em] = s.id;
        }
      }
      setIdsSolicitacaoMedicoPorPaciente({ porPacienteDocId, porEmail });
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      setIdsSolicitacaoMedicoPorPaciente({ porPacienteDocId: {}, porEmail: {} });
    } finally {
      setLoadingPacientes(false);
    }
  }, []);

  const loadRastrosSubcolecoesPacientes = useCallback(async () => {
    setLoadingRastrosSubcolecoesPacientes(true);
    try {
      const rastros = await PacienteService.rastrearPacientesEmSubcolecoes();
      setRastrosSubcolecoesPacientes(rastros);
    } catch (error) {
      console.error('Erro ao carregar rastros de subcolecoes de pacientes:', error);
      setRastrosSubcolecoesPacientes({});
    } finally {
      setLoadingRastrosSubcolecoesPacientes(false);
    }
  }, []);

  // Função para carregar solicitações pendentes
  const loadSolicitacoesPendentes = useCallback(async () => {
    setLoadingSolicitacoes(true);
    try {
      const solicitacoesData = await SolicitacaoMedicoService.getAllSolicitacoesPendentes();
      setSolicitacoesPendentes(solicitacoesData);
    } catch (error) {
      console.error('Erro ao carregar solicitações pendentes:', error);
    } finally {
      setLoadingSolicitacoes(false);
    }
  }, []);

  // Função para carregar leads (TODOS os usuários do Firebase Authentication)
  const loadPagamentos = useCallback(async () => {
    setLoadingPagamentos(true);
    try {
      const todosPagamentos = await PagamentoService.getAllPagamentos();
      setPagamentosPacientes(todosPagamentos);
      
      // Buscar todas as vendas avulsas
      const todasVendas: VendaAvulsa[] = [];
      for (const medico of medicos) {
        try {
          const vendasMedico = await PagamentoService.getAllVendasAvulsas(medico.id);
          todasVendas.push(...vendasMedico);
        } catch (error) {
          console.error(`Erro ao carregar vendas avulsas do médico ${medico.id}:`, error);
        }
      }
      setVendasAvulsas(todasVendas);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      setPagamentosPacientes({});
      setVendasAvulsas([]);
    } finally {
      setLoadingPagamentos(false);
    }
  }, [medicos]);

  const loadIndicacoes = useCallback(async (medicosParaBuscar: Medico[]) => {
    setLoadingIndicacoes(true);
    try {
      // Buscar todas as indicações de todos os médicos
      const todasIndicacoes: Indicacao[] = [];
      for (const medico of medicosParaBuscar) {
        try {
          const indicacoesMedico = await IndicacaoService.getIndicacoesPorMedico(medico.id);
          todasIndicacoes.push(...indicacoesMedico);
        } catch (error) {
          console.error(`Erro ao carregar indicações do médico ${medico.id}:`, error);
        }
      }
      setIndicacoes(todasIndicacoes);
    } catch (error) {
      console.error('Erro ao carregar indicações:', error);
      setIndicacoes([]);
    } finally {
      setLoadingIndicacoes(false);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    setLeadsError(null);
    try {
      // Buscar TODOS os usuários do Firebase Authentication via API
      let allFirebaseUsers: any[] = [];
      try {
        console.log('🔍 Buscando usuários do Firebase Authentication via API...');
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          allFirebaseUsers = data.users || [];
          console.log(`✅ ${allFirebaseUsers.length} usuários encontrados no Firebase Authentication`);
        } else {
          const errorText = await response.text();
          console.error('⚠️ Erro na resposta da API:', response.status, errorText);
          throw new Error(`API retornou status ${response.status}`);
        }
      } catch (apiError) {
        console.error('❌ Erro ao buscar usuários via API:', apiError);
        setLeadsError(`❌ Erro ao buscar usuários do Firebase Authentication: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}. Verifique os logs do servidor.`);
        allFirebaseUsers = [];
      }
      
      // Buscar todas as solicitações de médico para filtrar
      console.log('🔍 Buscando solicitações de médico para filtrar leads...');
      const todasSolicitacoes = await SolicitacaoMedicoService.getAllSolicitacoes();
      console.log(`✅ ${todasSolicitacoes.length} solicitações encontradas`);
      
      // Extrair emails únicos que já fizeram solicitação
      const emailsComSolicitacao = new Set(
        todasSolicitacoes
          .map(s => s.pacienteEmail?.toLowerCase().trim())
          .filter(Boolean)
      );
      console.log(`📊 ${emailsComSolicitacao.size} emails únicos com solicitação`);
      
      // Data mínima: 20/11/2025
      const dataMinima = new Date('2025-11-20T00:00:00');
      dataMinima.setHours(0, 0, 0, 0);
      
      // Buscar informações adicionais do Firestore
      console.log('🔍 Buscando informações adicionais do Firestore...');
      const [firestoreUsers, pacientesCompletos, medicosList] = await Promise.all([
        UserService.getAllUsers().catch(() => []),
        PacienteService.getAllPacientes().catch(() => []),
        MedicoService.getAllMedicos().catch(() => [])
      ]);
      
      console.log(`✅ ${firestoreUsers.length} usuários no Firestore`);
      console.log(`✅ ${pacientesCompletos.length} pacientes completos`);
      console.log(`✅ ${medicosList.length} médicos`);
      
      // Criar mapas para busca rápida
      const firestoreUsersMap = new Map(firestoreUsers.map(u => [u.uid, u]));
      const pacientesMap = new Map(pacientesCompletos.map(p => [p.userId || p.email?.toLowerCase(), p]));
      const medicosMap = new Map(medicosList.map(m => [m.userId || m.email?.toLowerCase(), m]));
      
      // Filtrar usuários que NÃO têm solicitação E foram cadastrados a partir de 20/11/2025
      const leadsFormatted = allFirebaseUsers
        .map((user: any) => {
          // Converter creationTime corretamente (pode ser string ou Date)
          let createdAt: Date | undefined;
          if (user.metadata?.creationTime) {
            if (typeof user.metadata.creationTime === 'string') {
              createdAt = new Date(user.metadata.creationTime);
            } else if (user.metadata.creationTime instanceof Date) {
              createdAt = user.metadata.creationTime;
            } else if (user.metadata.creationTime.toDate) {
              // Firestore Timestamp
              createdAt = user.metadata.creationTime.toDate();
            }
          }
          
          const userEmail = (user.email || '').toLowerCase().trim();
          const firestoreUser = firestoreUsersMap.get(user.uid);
          const paciente = pacientesMap.get(user.uid) || pacientesMap.get(userEmail);
          const medico = medicosMap.get(user.uid) || medicosMap.get(userEmail);
          
          return {
            uid: user.uid,
            email: user.email || 'Sem email',
            name: user.displayName || firestoreUser?.name || user.email || 'Usuário sem nome',
            createdAt: createdAt,
            lastSignInTime: user.metadata?.lastSignInTime,
            emailVerified: user.emailVerified,
            temPerfilFirestore: !!firestoreUser,
            temPerfilPaciente: !!paciente,
            temPerfilMedico: !!medico,
            role: firestoreUser?.role,
            telefone: paciente?.dadosIdentificacao?.telefone || medico?.telefone,
            cidade: paciente?.dadosIdentificacao?.endereco?.cidade || (medico?.cidades && medico.cidades.length > 0 ? medico.cidades[0].cidade : undefined),
            estado: paciente?.dadosIdentificacao?.endereco?.estado || (medico?.cidades && medico.cidades.length > 0 ? medico.cidades[0].estado : undefined)
          };
        })
        .filter((user) => {
          // Filtrar apenas usuários que NÃO têm solicitação
          const userEmail = user.email?.toLowerCase().trim();
          if (!userEmail || userEmail === 'sem email') return false;
          if (emailsComSolicitacao.has(userEmail)) return false;
          
          // Filtrar apenas usuários cadastrados a partir de 20/11/2025
          if (!user.createdAt) return false;
          const userCreatedAt = new Date(user.createdAt);
          userCreatedAt.setHours(0, 0, 0, 0);
          return userCreatedAt >= dataMinima;
        });
      
      // Ordenar por data de criação (mais recente primeiro)
      leadsFormatted.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      console.log(`📊 Total de leads (sem solicitação): ${leadsFormatted.length} de ${allFirebaseUsers.length} usuários`);
      
      // Buscar leads existentes no Firestore
      const leadsExistentes = await LeadService.getAllLeads();
      const leadsExistentesMap = new Map(leadsExistentes.map(l => [l.uid, l]));
      
      // Identificar leads qualificados que desapareceram (estavam qualificados mas não aparecem mais na lista filtrada)
      const leadsQualificadosDesaparecidosCount = leadsExistentes.filter(lead => {
        // Lead estava qualificado mas não aparece mais na lista filtrada (porque fez solicitação)
        return lead.status === 'qualificado' && !leadsFormatted.find(l => l.uid === lead.uid);
      }).length;
      setLeadsQualificadosDesaparecidos(leadsQualificadosDesaparecidosCount);
      
      // Sincronizar: criar leads no Firestore se não existirem, ou atualizar dados
      const leadsSincronizados: Lead[] = [];
      for (const lead of leadsFormatted) {
        const leadExistente = leadsExistentesMap.get(lead.uid);
        
        if (leadExistente) {
          // Atualizar dados do lead existente (mas manter status)
          const leadAtualizado: Lead = {
            ...leadExistente,
            email: lead.email,
            name: lead.name,
            telefone: lead.telefone,
            estrelas: leadExistente.estrelas || 0,
            createdAt: lead.createdAt,
            lastSignInTime: lead.lastSignInTime,
            emailVerified: lead.emailVerified,
          };
          await LeadService.createOrUpdateLead(leadAtualizado);
          leadsSincronizados.push(leadAtualizado);
        } else {
          // Criar novo lead com status inicial
          const novoLead: Omit<Lead, 'id'> = {
            uid: lead.uid,
            email: lead.email,
            name: lead.name,
            estrelas: 0,
            telefone: lead.telefone,
            createdAt: lead.createdAt,
            lastSignInTime: lead.lastSignInTime,
            emailVerified: lead.emailVerified,
            status: 'nao_qualificado',
            dataStatus: new Date(),
          };
          const leadId = await LeadService.createOrUpdateLead(novoLead);
          const leadComId = { ...novoLead, id: leadId } as Lead;
          leadsSincronizados.push(leadComId);
          
          // Enviar e-mail de lead avulso para o gestor admin
          try {
            console.log('📧 Tentando enviar e-mail de lead avulso para ricpmota.med@gmail.com...', {
              leadId,
              leadNome: novoLead.name,
              leadEmail: novoLead.email
            });
            
            const emailResponse = await fetch('/api/send-email-lead-avulso', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                leadId: leadId,
                leadNome: novoLead.name,
                leadEmail: novoLead.email,
              }),
            });

            const emailResult = await emailResponse.json();
            
            if (!emailResponse.ok) {
              console.error('❌ Erro ao enviar e-mail de lead avulso:', emailResult);
            } else {
              console.log('✅ E-mail de lead avulso enviado com sucesso:', emailResult);
            }
          } catch (emailError) {
            console.error('❌ Erro ao enviar e-mail de lead avulso:', emailError);
            // Não bloquear o fluxo se o e-mail falhar
          }
        }
      }
      
      // Organizar leads por status
      const leadsPorStatus: Record<LeadStatus, Lead[]> = {
        nao_qualificado: [],
        enviado_contato: [],
        contato_feito: [],
        qualificado: [],
        excluido: [],
      };
      
      leadsSincronizados.forEach(lead => {
        leadsPorStatus[lead.status].push(lead);
      });
      
      // Ordenação igual ao metaadmin: estrelas desc e, em empate, data mais recente.
      Object.keys(leadsPorStatus).forEach(status => {
        sortLeadsByStatusDate(status as LeadStatus, leadsPorStatus[status as LeadStatus]);
      });
      
      setLeads(leadsSincronizados);
      setLeadsByStatus(leadsPorStatus);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      setLeadsError('Erro ao carregar leads. Tente novamente.');
      setMessage('Erro ao carregar leads. Tente novamente.');
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  // Função para carregar preços do Tirzepatida
  const loadTirzepatidaPrecos = useCallback(async () => {
    setLoadingTirzepatida(true);
    try {
      const precosData = await TirzepatidaService.getPrecos();
      setTirzepatidaPrecos(precosData);
    } catch (error) {
      console.error('Erro ao carregar preços do Tirzepatida:', error);
    } finally {
      setLoadingTirzepatida(false);
    }
  }, []);

  // Função para salvar dados do médico editado
  const handleSalvarMedico = async () => {
    if (!medicoEditando) return;
    
    try {
      setLoading(true);
      const { id, ...medicoSemId } = medicoEditando;
      const medicoData = {
        ...medicoSemId,
        nome: dadosMedicoEditando.nome,
        email: dadosMedicoEditando.email,
        telefone: dadosMedicoEditando.telefone || undefined,
        genero: dadosMedicoEditando.genero || undefined,
        crm: {
          numero: dadosMedicoEditando.crmNumero,
          estado: dadosMedicoEditando.crmEstado
        },
        localizacao: {
          ...medicoEditando.localizacao,
          endereco: dadosMedicoEditando.endereco,
          cep: dadosMedicoEditando.cep || undefined,
          pontoReferencia: dadosMedicoEditando.pontoReferencia || undefined
        }
      };
      
      await MedicoService.createOrUpdateMedico(medicoData);
      await loadMedicos();
      setShowEditarMedicoModal(false);
      setMedicoEditando(null);
      setMessage('Dados do médico atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar médico:', error);
      setMessage('Erro ao salvar dados do médico');
    } finally {
      setLoading(false);
    }
  };

  // Função para salvar dados do paciente editado
  const handleSalvarPaciente = async () => {
    if (!pacienteEditando) return;
    
    try {
      setLoading(true);
      const pacienteData = {
        ...pacienteEditando,
        nome: dadosPacienteEditando.nomeCompleto,
        email: dadosPacienteEditando.email,
        dadosIdentificacao: {
          ...pacienteEditando.dadosIdentificacao,
          nomeCompleto: dadosPacienteEditando.nomeCompleto,
          email: dadosPacienteEditando.email,
          telefone: dadosPacienteEditando.telefone || undefined,
          cpf: dadosPacienteEditando.cpf || undefined,
          dataNascimento: dadosPacienteEditando.dataNascimento 
            ? new Date(dadosPacienteEditando.dataNascimento)
            : undefined,
          sexoBiologico: dadosPacienteEditando.sexoBiologico || undefined,
          endereco: {
            rua: dadosPacienteEditando.rua || undefined,
            cidade: dadosPacienteEditando.cidade || undefined,
            estado: dadosPacienteEditando.estado || undefined,
            cep: dadosPacienteEditando.cep || undefined
          },
          dataCadastro: pacienteEditando.dadosIdentificacao?.dataCadastro || new Date()
        }
      };
      
      await PacienteService.createOrUpdatePaciente(pacienteData);
      await loadPacientes();
      setShowEditarPacienteModal(false);
      setPacienteEditando(null);
      setMessage('Dados do paciente atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      setMessage('Erro ao salvar dados do paciente');
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer upload de imagem via API route (server-side)
  const handleUploadBannerImage = async (file: File): Promise<string> => {
    try {
      setUploadingImage(true);
      setMessage('Enviando imagem...');
      
      console.log('Iniciando upload do arquivo:', file.name, 'Tamanho:', file.size);
      
      // Criar FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Fazer upload via API route (server-side, sem CORS)
      const response = await fetch('/api/upload-banner', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Resposta do servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = 'Erro ao fazer upload';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        console.error('Erro na resposta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Upload concluído, URL recebida:', data.url);
      
      if (!data.url) {
        throw new Error('URL não retornada pelo servidor');
      }
      
      setMessage('Imagem enviada com sucesso!');
      return data.url;
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      const errorMsg = error.message || 'Erro desconhecido ao fazer upload';
      setMessage(`Erro: ${errorMsg}`);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Função para salvar banner
  const handleSalvarBanner = async () => {
    console.log('handleSalvarBanner chamado', { dadosBanner });
    
    if (!dadosBanner.titulo.trim() || !dadosBanner.imagemUrl.trim()) {
      setMessage('Título e URL da imagem são obrigatórios');
      return;
    }

    // Detectar formato automaticamente baseado no conteúdo
    let formatoFinal = dadosBanner.formato;
    if (dadosBanner.conteudoJson && dadosBanner.conteudoJson.sections && dadosBanner.conteudoJson.sections.length > 0) {
      formatoFinal = 'json';
      console.log('Formato detectado como JSON');
    } else if (dadosBanner.conteudoHtml && dadosBanner.conteudoHtml.trim()) {
      formatoFinal = 'html';
      console.log('Formato detectado como HTML');
    } else {
      console.log('Formato não detectado, usando:', formatoFinal);
    }

    // Validar conteúdo baseado no formato final
    if (formatoFinal === 'json') {
      if (!dadosBanner.conteudoJson || typeof dadosBanner.conteudoJson !== 'object' || !dadosBanner.conteudoJson.sections || !Array.isArray(dadosBanner.conteudoJson.sections) || dadosBanner.conteudoJson.sections.length === 0) {
        console.log('Validação JSON falhou:', {
          temConteudoJson: !!dadosBanner.conteudoJson,
          tipo: typeof dadosBanner.conteudoJson,
          temSections: !!(dadosBanner.conteudoJson && dadosBanner.conteudoJson.sections),
          sectionsLength: dadosBanner.conteudoJson?.sections?.length
        });
        setMessage('Conteúdo JSON é obrigatório. Adicione pelo menos uma seção.');
        return;
      }
      console.log('Validação JSON passou');
    } else if (formatoFinal === 'html') {
      if (!dadosBanner.conteudoHtml || !dadosBanner.conteudoHtml.trim()) {
        console.log('Validação HTML falhou');
        setMessage('Conteúdo HTML é obrigatório');
        return;
      }
      console.log('Validação HTML passou');
    } else {
      console.log('Formato inválido:', formatoFinal);
      setMessage('Formato inválido. Selecione JSON ou HTML.');
      return;
    }
    
    try {
      setLoading(true);
      // Preparar dados do banner removendo campos undefined (Firestore não aceita undefined)
      const bannerDataBase: any = {
        titulo: dadosBanner.titulo,
        imagemUrl: dadosBanner.imagemUrl,
        formato: formatoFinal,
        local: dadosBanner.local || 'meta', // Padrão para meta se não especificado
        ativo: dadosBanner.ativo,
        ordem: dadosBanner.ordem,
      };

      // Adicionar apenas o conteúdo do formato selecionado (não incluir undefined)
      if (formatoFinal === 'html') {
        bannerDataBase.conteudoHtml = dadosBanner.conteudoHtml || '';
      } else if (formatoFinal === 'json') {
        bannerDataBase.conteudoJson = dadosBanner.conteudoJson;
      }

      if (bannerEditando && bannerEditando.id) {
        // Atualizar banner existente
        const bannerData: any = {
          ...bannerEditando,
          ...bannerDataBase,
          atualizadoEm: new Date()
        };
        
        // Remover campos undefined explicitamente
        if (formatoFinal === 'html') {
          delete bannerData.conteudoJson;
        } else if (formatoFinal === 'json') {
          delete bannerData.conteudoHtml;
        }
        
        console.log('Salvando banner (atualizar):', {
          formato: formatoFinal,
          temConteudoJson: !!bannerData.conteudoJson,
          temConteudoHtml: !!bannerData.conteudoHtml,
          conteudoJson: bannerData.conteudoJson,
          bannerData: bannerData
        });
        const bannerId = await BannerService.createOrUpdateBanner(bannerData, user?.uid || undefined);
        console.log('Banner salvo com sucesso, ID:', bannerId);
      } else {
        // Criar novo banner
        const bannerData: any = {
          ...bannerDataBase,
          criadoEm: new Date(),
          atualizadoEm: new Date()
        };
        
        console.log('Salvando banner (criar):', {
          formato: formatoFinal,
          temConteudoJson: !!bannerData.conteudoJson,
          temConteudoHtml: !!bannerData.conteudoHtml,
          conteudoJson: bannerData.conteudoJson,
          bannerData: bannerData
        });
        const bannerId = await BannerService.createOrUpdateBanner(bannerData, user?.uid || undefined);
        console.log('Banner salvo com sucesso, ID:', bannerId);
      }
      await loadBanners();
      setShowEditarBannerModal(false);
      setBannerEditando(null);
      setMessage(bannerEditando ? 'Banner atualizado com sucesso!' : 'Banner criado com sucesso!');
      console.log('Modal fechado e mensagem exibida');
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao salvar banner';
      setMessage(`Erro ao salvar banner: ${errorMessage}`);
      alert(`Erro ao salvar banner: ${errorMessage}`); // Alert temporário para debug
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAnamneseInteligenteMedico = async (medicoId: string, ativo: boolean) => {
    try {
      const medico = medicos.find((m) => m.id === medicoId);
      if (!medico) return;
      if (isMetaAdminGeralEmail(medico.email)) {
        setMessage('O administrador geral sempre tem análise inteligente ativa.');
        return;
      }

      await MedicoService.createOrUpdateMedico({
        ...medico,
        anamneseInteligenteAtivo: !ativo,
      });
      await loadMedicos();
      setMessage(
        ativo
          ? 'Análise inteligente desativada para o médico.'
          : 'Análise inteligente ativada para o médico.'
      );
    } catch (error) {
      console.error('Erro ao alterar análise inteligente:', error);
      setMessage('Erro ao alterar análise inteligente do médico');
    }
  };

  const handleToggleMetodoImagensMedico = async (medicoId: string, ativo: boolean) => {
    if (!user) return;
    setTogglingMetodoMedicoId(medicoId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/metodo/toggle', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medicoId, ativo: !ativo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);

      setMedicos((prev) =>
        prev.map((m) =>
          m.id === medicoId ? { ...m, metodoImagensAtivo: !ativo } : m
        )
      );
      setMessage(
        ativo
          ? 'Padrão Método desativado para o médico.'
          : 'Padrão Método ativado — imagens da conta fonte serão usadas.'
      );
    } catch (error) {
      console.error('Erro ao alterar Método:', error);
      setMessage(
        error instanceof Error ? error.message : 'Erro ao alterar padrão Método do médico'
      );
    } finally {
      setTogglingMetodoMedicoId(null);
    }
  };

  // Função para verificar/desverificar médico
  const handleToggleVerificacaoMedico = async (medicoId: string, isVerificado: boolean) => {
    try {
      const medico = medicos.find(m => m.id === medicoId);
      if (!medico) return;

      const medicoData = {
        ...medico,
        isVerificado: !isVerificado
      };

      await MedicoService.createOrUpdateMedico(medicoData);
      await loadMedicos();
      setMessage(isVerificado ? 'Médico desverificado com sucesso!' : 'Médico verificado com sucesso!');
    } catch (error) {
      console.error('Erro ao alterar verificação:', error);
      setMessage('Erro ao alterar verificação do médico');
    }
  };

  // Função para carregar mensagens do admin
  const loadMensagens = useCallback(async () => {
    if (!user) return;
    
    setLoadingMensagens(true);
    try {
      const mensagensData = await MensagemService.getMensagensAdmin(user.email);
      setMensagens(mensagensData);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoadingMensagens(false);
    }
  }, [user]);

  // Função para carregar mensagens dos residentes
  const loadMensagensResidentes = useCallback(async () => {
    setLoadingMensagensResidentes(true);
    try {
      const mensagensData = await MensagemService.getMensagensResidenteParaAdmin();
      setMensagensResidentes(mensagensData);
      
      // Contar mensagens não lidas
      const naoLidas = mensagensData.filter(m => !m.lida).length;
      setMensagensNaoLidasResidentes(naoLidas);
    } catch (error) {
      console.error('Erro ao carregar mensagens dos residentes:', error);
    } finally {
      setLoadingMensagensResidentes(false);
    }
  }, []);

  // Função para enviar mensagem
  const handleEnviarMensagem = async () => {
    if (!user || !novaMensagem.titulo.trim() || !novaMensagem.mensagem.trim()) {
      setMessage('Título e mensagem são obrigatórios');
      return;
    }

    if (novaMensagem.destinatarios === 'especificos' && novaMensagem.residentesSelecionados.length === 0) {
      setMessage('Selecione pelo menos um residente');
      return;
    }

    setLoading(true);
    
    try {
      // Criar mensagem
      const mensagemId = await MensagemService.criarMensagem({
        titulo: novaMensagem.titulo.trim(),
        mensagem: novaMensagem.mensagem.trim(),
        destinatarios: novaMensagem.destinatarios,
        residentesSelecionados: novaMensagem.residentesSelecionados,
        criadoPor: user.email
      });

      // Determinar lista de residentes para envio
      const residentesParaEnvio = novaMensagem.destinatarios === 'todos' 
        ? residentes 
        : residentes.filter(r => novaMensagem.residentesSelecionados.includes(r.email));

      // Enviar mensagem
      const resultado = await MensagemService.enviarMensagem(mensagemId, residentesParaEnvio, user.email);
      
      setMessage(`Mensagem enviada com sucesso! ${resultado.sucesso} residentes notificados.`);
      setShowEnviarMensagem(false);
      setNovaMensagem({ titulo: '', mensagem: '', destinatarios: 'todos', residentesSelecionados: [] });
      loadMensagens();
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessage('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para deletar mensagem
  const handleDeletarMensagem = async (mensagemId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta mensagem? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLoading(true);
    
    try {
      await MensagemService.deletarMensagem(mensagemId);
      setMessage('Mensagem deletada com sucesso!');
      loadMensagens();
      
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      setMessage('Erro ao deletar mensagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para marcar mensagem do residente como lida
  const handleMarcarMensagemResidenteComoLida = async (mensagemId: string) => {
    try {
      await MensagemService.marcarMensagemResidenteComoLida(mensagemId);
      setMensagensResidentes(prev => prev.map(m => 
        m.id === mensagemId ? { ...m, lida: true, lidaEm: new Date() } : m
      ));
      setMensagensNaoLidasResidentes(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  };

  // Função para deletar mensagem do residente
  const handleDeletarMensagemResidente = async (mensagemId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta mensagem?')) return;
    
    try {
      await MensagemService.deletarMensagemResidente(mensagemId);
      setMensagensResidentes(prev => prev.filter(m => m.id !== mensagemId));
      setMessage('Mensagem deletada com sucesso');
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      setMessage('Erro ao deletar mensagem');
    }
  };

  // Função para visualizar mensagem
  const handleVisualizarMensagem = async (mensagem: MensagemResidenteParaAdmin) => {
    setMensagemSelecionada(mensagem);
    setShowMensagemModal(true);
    
    // Marcar como lida se não estiver lida
    if (!mensagem.lida) {
      await handleMarcarMensagemResidenteComoLida(mensagem.id);
    }
  };

  // Função para visualizar mensagem enviada
  const handleVisualizarMensagemEnviada = (mensagem: Mensagem) => {
    setMensagemEnviadaSelecionada(mensagem);
    setShowMensagemEnviadaModal(true);
  };

  useEffect(() => {
    if (user && activeMenu === 'troca') {
      loadTrocasPendentes();
    }
  }, [user, activeMenu, loadTrocasPendentes]);

  useEffect(() => {
    if (user && activeMenu === 'ferias') {
      loadFeriasAdmin();
    }
  }, [user, activeMenu, loadFeriasAdmin]);

  useEffect(() => {
    if (user && activeMenu === 'mensagens') {
      loadMensagens();
      loadMensagensResidentes();
    }
  }, [user, activeMenu, loadMensagens, loadMensagensResidentes]);


  // Função para carregar total de pacientes compartilhados
  const loadTotalPacientesCompartilhados = useCallback(async () => {
    setLoadingPacientesCompartilhados(true);
    try {
      // Buscar todos os nutricionistas
      const todosNutricionistas = await NutricionistaService.getAllNutricionistas();
      
      // Para cada nutricionista, buscar seus vínculos ativos
      const vinculosPromises = todosNutricionistas.map(nutri => 
        PacienteNutricionistaService.listActiveVinculosByNutri(nutri.userId)
      );
      
      const todosVinculos = await Promise.all(vinculosPromises);
      
      // Contar total de vínculos únicos (um paciente pode estar compartilhado com múltiplos nutricionistas)
      const pacientesUnicos = new Set<string>();
      todosVinculos.flat().forEach(vinculo => {
        pacientesUnicos.add(vinculo.pacienteId);
      });
      
      setTotalPacientesCompartilhados(pacientesUnicos.size);
    } catch (error) {
      console.error('Erro ao carregar total de pacientes compartilhados:', error);
      setTotalPacientesCompartilhados(0);
    } finally {
      setLoadingPacientesCompartilhados(false);
    }
  }, []);

  // Carregar dados do dashboard da organização / plataforma (e legado estatísticas / financeiro)
  useEffect(() => {
    if (
      activeMenu === 'estatisticas' ||
      activeMenu === 'org-dashboard' ||
      activeMenu === 'org-financeiro-overview' ||
      activeMenu === 'dashboard-oftware'
    ) {
      loadMedicos();
      loadPacientes();
      loadSolicitacoesPendentes();
      loadNutricionistas();
      loadPersonalTrainers();
      loadTotalPacientesCompartilhados();
      loadLeads();
    }
  }, [
    activeMenu,
    loadMedicos,
    loadPacientes,
    loadSolicitacoesPendentes,
    loadNutricionistas,
    loadPersonalTrainers,
    loadTotalPacientesCompartilhados,
    loadLeads,
  ]);

  // Carregar pagamentos quando médicos e pacientes estiverem carregados (apenas uma vez)
  useEffect(() => {
    const needsFinanceData =
      activeMenu === 'estatisticas' || activeMenu === 'org-financeiro-overview';
    if (
      needsFinanceData &&
      medicos.length > 0 &&
      pacientes.length > 0 &&
      !loadingMedicos &&
      !loadingPacientes &&
      !loadingPagamentos
    ) {
      const chaveCarregamento = `${medicos.length}-${pacientes.length}`;
      if (!indicacoesCarregadasRef.current || indicacoesCarregadasRef.current !== chaveCarregamento) {
        indicacoesCarregadasRef.current = chaveCarregamento;
        loadPagamentos();
      }
    }
    // Reset ref quando mudar de menu
    if (!needsFinanceData) {
      indicacoesCarregadasRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu, medicos.length, pacientes.length, loadingMedicos, loadingPacientes]);

  // Carregar médicos quando a página medicos for ativada
  useEffect(() => {
    if (activeMenu === 'medicos') {
      loadMedicos();
      void loadMetodoImagensTemplate();
    }
  }, [activeMenu, loadMedicos, loadMetodoImagensTemplate]);

  // Carregar nutricionistas quando a página nutricionistas for ativada
  useEffect(() => {
    if (activeMenu === 'nutricionistas') {
      loadNutricionistas();
    }
  }, [activeMenu, loadNutricionistas]);

  // Carregar personal trainers quando a página personal_trainers for ativada
  useEffect(() => {
    if (activeMenu === 'personal_trainers') {
      loadPersonalTrainers();
    }
  }, [activeMenu, loadPersonalTrainers]);

  // Carregar usuários OftPay quando a página oftpay for ativada
  const loadOftPayUsers = useCallback(async () => {
    if (!user) return;
    setLoadingOftPay(true);
    setOftpayError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/oftpay/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      const list = (data.users || []) as { email: string; displayName?: string | null; lastLoginAt?: number; courseIds: string[]; questoesEnabled?: boolean; accessStartAt?: number | null; accessEndAt?: number | null }[];
      setOftpayUsers(list);
      const initial: Record<string, string[]> = {};
      const initialQuestoes: Record<string, boolean> = {};
      const initialStart: Record<string, string> = {};
      const initialEnd: Record<string, string> = {};
      list.forEach((u) => {
        initial[u.email] = [...(u.courseIds || [])];
        initialQuestoes[u.email] = Boolean(u.questoesEnabled);
        initialStart[u.email] = u.accessStartAt ? new Date(u.accessStartAt).toISOString().slice(0, 10) : '';
        initialEnd[u.email] = u.accessEndAt ? new Date(u.accessEndAt).toISOString().slice(0, 10) : '';
      });
      setOftpayLocalCourseIds(initial);
      setOftpayLocalQuestoesEnabled(initialQuestoes);
      setOftpayLocalAccessStart(initialStart);
      setOftpayLocalAccessEnd(initialEnd);
    } catch (e) {
      setOftpayError(e instanceof Error ? e.message : 'Erro ao carregar usuários');
      setOftpayUsers([]);
    } finally {
      setLoadingOftPay(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeMenu === 'oftpay') {
      loadOftPayUsers();
    }
  }, [activeMenu, loadOftPayUsers]);

  useEffect(() => {
    oftpayLearnFiltersRef.current = {
      domain: oftpayLearnDomain,
      exam: oftpayLearnExam,
      eff: oftpayLearnEff,
      stab: oftpayLearnStab,
    };
  }, [oftpayLearnDomain, oftpayLearnExam, oftpayLearnEff, oftpayLearnStab]);

  const loadOftpayLearningInsights = useCallback(async () => {
    if (!user) return;
    setLoadingOftpayLearn(true);
    setOftpayLearnError(null);
    try {
      const token = await user.getIdToken();
      const { domain, exam, eff, stab } = oftpayLearnFiltersRef.current;
      const qs = new URLSearchParams();
      if (domain) qs.set('relatedDomain', domain);
      if (exam.trim()) qs.set('relatedExamType', exam.trim());
      if (eff) qs.set('effectivenessStatus', eff);
      if (stab) qs.set('stabilityStatus', stab);
      const q = qs.toString();
      const res = await fetch(`/api/metaadmingeral/oftpay/learning-insights${q ? `?${q}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
      setOftpayLearnPayload(data as OftpayLearningInsightsAdminPayload);
    } catch (e) {
      setOftpayLearnError(e instanceof Error ? e.message : 'Erro ao carregar painel de aprendizado');
      setOftpayLearnPayload(null);
    } finally {
      setLoadingOftpayLearn(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeMenu === 'oftpay' && user) {
      void loadOftpayLearningInsights();
    }
  }, [activeMenu, user, loadOftpayLearningInsights]);

  // Carregar pacientes quando a página pacientes for ativada
  useEffect(() => {
    if (activeMenu === 'pacientes') {
      loadPacientes();
      loadMedicos(); // Precisa carregar médicos para mostrar o médico responsável
      loadRastrosSubcolecoesPacientes();
    }
  }, [activeMenu, loadPacientes, loadMedicos, loadRastrosSubcolecoesPacientes]);

  // Carregar preços do Tirzepatida quando a página tirzepatida for ativada
  useEffect(() => {
    if (activeMenu === 'tirzepatida') {
      loadTirzepatidaPrecos();
    }
  }, [activeMenu, loadTirzepatidaPrecos]);

  // Carregar leads quando a página leads for ativada
  useEffect(() => {
    if (activeMenu === 'leads') {
      loadLeads();
    }
  }, [activeMenu, loadLeads]);

  // Carregar banners
  const loadBanners = useCallback(async () => {
    setLoadingBanners(true);
    try {
      const bannersData = await BannerService.getAllBanners();
      // Filtrar por pasta ativa
      const bannersFiltrados = bannersData.filter(banner => {
        // Se o banner não tem local definido, considerar como 'meta' (compatibilidade com banners antigos)
        const bannerLocal = (banner as any).local || 'meta';
        return bannerLocal === pastaBannerAtiva;
      });
      setBanners(bannersFiltrados);
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
      setMessage('Erro ao carregar banners');
    } finally {
      setLoadingBanners(false);
    }
  }, [pastaBannerAtiva]);

  // Carregar banners quando a página banners for ativada
  useEffect(() => {
    if (activeMenu === 'banners') {
      loadBanners();
    }
  }, [activeMenu, loadBanners]);

  const handleAprovarTroca = async (trocaId: string) => {
    try {
      await UserService.aprovarTroca(trocaId);
      await loadTrocasPendentes();
      setMessage('Troca aprovada com sucesso!');
    } catch (error) {
      console.error('Erro ao aprovar troca:', error);
      setMessage('Erro ao aprovar troca');
    }
  };

  const handleRejeitarTroca = async (trocaId: string) => {
    try {
      await UserService.rejeitarTroca(trocaId);
      setMessage('Troca rejeitada!');
      await loadTrocasPendentes();
    } catch (error) {
      console.error('Erro ao rejeitar troca:', error);
      setMessage('Erro ao rejeitar troca');
    }
  };

  const handleReverterTroca = async (trocaId: string) => {
    try {
      await UserService.reverterTroca(trocaId);
      setMessage('Troca revertida com sucesso!');
      await loadTrocasPendentes();
    } catch (error) {
      console.error('Erro ao reverter troca:', error);
      setMessage('Erro ao reverter troca: ' + (error as Error).message);
    }
  };

  const handleAprovarFerias = async (feriasId: string, observacoes?: string) => {
    try {
      console.log('🔄 Aprovando férias:', feriasId);
      await UserService.aprovarFerias(feriasId, observacoes);
      console.log('✅ Férias aprovada com sucesso no admin');
      setMessage('Férias aprovada com sucesso!');
      await loadFeriasPendentes();
    } catch (error) {
      console.error('❌ Erro ao aprovar férias:', error);
      setMessage('Erro ao aprovar férias');
    }
  };

  const handleRejeitarFerias = async (feriasId: string, observacoes?: string) => {
    try {
      await UserService.rejeitarFerias(feriasId, observacoes);
      setMessage('Férias rejeitada!');
      await loadFeriasPendentes();
    } catch (error) {
      console.error('Erro ao rejeitar férias:', error);
      setMessage('Erro ao rejeitar férias');
    }
  };


  const handleEditUser = (user: {
    uid: string;
    email: string;
    displayName: string;
  }) => {
    const userData = users.find(u => u.uid === user.uid);
    setEditingUser({
      uid: user.uid,
      name: userData?.name || user.displayName || user.email,
      role: userData?.role || 'admin'
    });
    setEditName(userData?.name || user.displayName || user.email);
    setEditRole((userData?.role as 'admin' | 'residente' | 'recepcao') || 'admin');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      setLoading(true);
      
      // Atualizar nome se mudou
      if (editName !== editingUser.name) {
        await UserService.updateUserName(editingUser.uid, editName);
      }
      
      // Atualizar role se mudou
      if (editRole !== editingUser.role) {
        await UserService.updateUserRole(editingUser.uid, editRole);
      }
      
      // Atualizar lista local
      setUsers(users.map(u => 
        u.uid === editingUser.uid 
          ? { ...u, name: editName, role: editRole }
          : u
      ));
      
      setEditingUser(null);
      setMessage('Usuário atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      setMessage('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditName('');
    setEditRole('admin');
  };



  const handleAddResidente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('=== DEBUG: Iniciando handleAddResidente ===');
      console.log('Usuário autenticado:', !!user);
      console.log('Email do usuário:', user?.email);
      console.log('UID do usuário:', user?.uid);
      console.log('Dados do residente:', newResidente);
      
      // Verificar se o usuário está autenticado
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Verificar se os campos estão preenchidos
      if (!newResidente.nome || !newResidente.email) {
        throw new Error('Nome e email são obrigatórios');
      }
      
      console.log('Chamando UserService.addResidente...');
      await UserService.addResidente(newResidente);
      console.log('UserService.addResidente concluído com sucesso');
      
      setNewResidente({ nome: '', nivel: 'R1', email: '', telefone: '' });
      setShowCadastrarResidenteModal(false);
      await loadData();
      setMessage('Residente adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar residente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro ao adicionar residente: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await UserService.addLocal(newLocal);
      setNewLocal({ nome: '' });
      setShowCadastrarLocalModal(false);
      loadData();
      setMessage('Local adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar local:', error);
      setMessage('Erro ao adicionar local');
    }
  };

  const handleAddServico = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await UserService.addServico(newServico);
      setNewServico({ nome: '', localId: '' });
      setShowCadastrarServicoModal(false);
      loadData();
      setMessage('Serviço adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar serviço:', error);
      setMessage('Erro ao adicionar serviço');
    }
  };

  const handleDeleteResidente = async (residenteId: string) => {
    if (confirm('Tem certeza que deseja excluir este residente?')) {
      try {
        await UserService.deleteResidente(residenteId);
        loadData();
        setMessage('Residente excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir residente:', error);
        setMessage('Erro ao excluir residente');
      }
    }
  };

  const handleDeleteLocal = async (localId: string) => {
    if (confirm('Tem certeza que deseja excluir este local?')) {
      try {
        await UserService.deleteLocal(localId);
        loadData();
        setMessage('Local excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir local:', error);
        setMessage('Erro ao excluir local');
      }
    }
  };

  const handleDeleteServico = async (servicoId: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await UserService.deleteServico(servicoId);
        loadData();
        setMessage('Serviço excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        setMessage('Erro ao excluir serviço');
      }
    }
  };

  // Funções para escalas
  const handleCriarEscala = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!novaEscala.dataInicio) {
        throw new Error('Data de início é obrigatória');
      }

      // Verificar se a data selecionada é uma segunda-feira
      const dataSelecionada = new Date(novaEscala.dataInicio + 'T00:00:00.000Z');
      const diaDaSemana = dataSelecionada.getUTCDay(); // 0 = domingo, 1 = segunda, etc.
      
      if (diaDaSemana !== 1) {
        throw new Error('A data selecionada deve ser uma segunda-feira. Por favor, selecione uma segunda-feira.');
      }

      // Verificar se já existe uma escala para esta semana
      const dataInicioTimestamp = dataSelecionada.getTime();
      const dataFimTimestamp = dataInicioTimestamp + (6 * 24 * 60 * 60 * 1000);
      
      const escalaExistente = escalas.find(escala => {
        const escalaInicio = new Date(escala.dataInicio).getTime();
        const escalaFim = escalaInicio + (6 * 24 * 60 * 60 * 1000);
        
        // Verificar se há sobreposição de datas
        return (dataInicioTimestamp >= escalaInicio && dataInicioTimestamp <= escalaFim) ||
               (dataFimTimestamp >= escalaInicio && dataFimTimestamp <= escalaFim) ||
               (dataInicioTimestamp <= escalaInicio && dataFimTimestamp >= escalaFim);
      });

      if (escalaExistente) {
        throw new Error(`Já existe uma escala para este período (${new Date(escalaExistente.dataInicio).toLocaleDateString('pt-BR')}). Por favor, selecione outra semana.`);
      }

      // Validar se pelo menos um dia tem dados
      const temDados = Object.values(novaEscala.dias).some(dia => 
        Array.isArray(dia) && dia.length > 0
      );

      if (!temDados) {
        throw new Error('Pelo menos um dia deve ter pelo menos um serviço configurado');
      }

      await UserService.addEscala({
        ...novaEscala,
        dataInicio: new Date(novaEscala.dataInicio)
      });
      setNovaEscala({
        dataInicio: '',
        dias: {
          segunda: [],
          terca: [],
          quarta: [],
          quinta: [],
          sexta: [],
          sabado: [],
          domingo: []
        }
      });
      await loadData();
      setMessage('Escala criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar escala:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage(`Erro ao criar escala: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Função para preencher automaticamente os dias da semana
  const handleDataInicioChange = (data: string) => {
    if (!data) {
      setNovaEscala(prev => ({ ...prev, dataInicio: data }));
      setMessage('');
      return;
    }

    // Criar data no formato correto (YYYY-MM-DD) - usar UTC para evitar problemas de timezone
    const dataSelecionada = new Date(data + 'T00:00:00.000Z');
    const diaDaSemana = dataSelecionada.getUTCDay();
    
    console.log('Data selecionada:', data);
    console.log('Data processada:', dataSelecionada);
    console.log('Dia da semana:', diaDaSemana, '(0=domingo, 1=segunda, etc.)');
    
    // Verificar se é segunda-feira
    if (diaDaSemana !== 1) {
      setMessage('A data selecionada deve ser uma segunda-feira. Por favor, selecione uma segunda-feira.');
      return;
    }

    // Verificar se já existe uma escala para esta semana
    const dataInicioTimestamp = dataSelecionada.getTime();
    const dataFimTimestamp = dataInicioTimestamp + (6 * 24 * 60 * 60 * 1000);
    
    const escalaExistente = escalas.find(escala => {
      const escalaInicio = new Date(escala.dataInicio).getTime();
      const escalaFim = escalaInicio + (6 * 24 * 60 * 60 * 1000);
      
      // Verificar se há sobreposição de datas
      return (dataInicioTimestamp >= escalaInicio && dataInicioTimestamp <= escalaFim) ||
             (dataFimTimestamp >= escalaInicio && dataFimTimestamp <= escalaFim) ||
             (dataInicioTimestamp <= escalaInicio && dataFimTimestamp >= escalaFim);
    });

    if (escalaExistente) {
      setMessage(`Já existe uma escala para este período (${new Date(escalaExistente.dataInicio).toLocaleDateString('pt-BR')}). Por favor, selecione outra semana.`);
      return;
    }

    // Calcular as datas da semana
    const datasDaSemana = {
      segunda: dataSelecionada,
      terca: new Date(dataSelecionada.getTime() + 24 * 60 * 60 * 1000),
      quarta: new Date(dataSelecionada.getTime() + 2 * 24 * 60 * 60 * 1000),
      quinta: new Date(dataSelecionada.getTime() + 3 * 24 * 60 * 60 * 1000),
      sexta: new Date(dataSelecionada.getTime() + 4 * 24 * 60 * 60 * 1000),
      sabado: new Date(dataSelecionada.getTime() + 5 * 24 * 60 * 60 * 1000),
      domingo: new Date(dataSelecionada.getTime() + 6 * 24 * 60 * 60 * 1000)
    };

    setNovaEscala(prev => ({ ...prev, dataInicio: data }));
    setMessage(`Semana configurada: ${dataSelecionada.toLocaleDateString('pt-BR')} a ${datasDaSemana.domingo.toLocaleDateString('pt-BR')}`);
  };

  const adicionarServico = (dia: string) => {
    const novoId = Date.now().toString();
    const novoServico = {
      id: novoId,
      localId: '',
      servicoId: '',
      turno: 'manha' as 'manha' | 'tarde',
      residentes: []
    };
    
    setNovaEscala(prev => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: [...(prev.dias[dia as keyof typeof prev.dias] as ServicoDia[]), novoServico]
      }
    }));
  };

  const removerServico = (dia: string, servicoId: string) => {
    setNovaEscala(prev => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: (prev.dias[dia as keyof typeof prev.dias] as ServicoDia[]).filter(s => s.id !== servicoId)
      }
    }));
  };

  const handleServicoChange = (dia: string, servicoId: string, campo: string, valor: string | string[]) => {
    setNovaEscala(prev => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: (prev.dias[dia as keyof typeof prev.dias] as ServicoDia[]).map(servico => 
          servico.id === servicoId 
            ? { ...servico, [campo]: valor }
            : servico
        )
      }
    }));
  };

  const handleResidenteToggle = (dia: string, servicoId: string, residenteId: string) => {
    const diaAtual = novaEscala.dias[dia as keyof typeof novaEscala.dias] as ServicoDia[];
    const servico = diaAtual.find(s => s.id === servicoId);
    
    if (servico) {
      const residente = residentes.find(r => r.id === residenteId);
      if (!residente) return;
      
      const residentesAtuais = servico.residentes as string[];
      
      if (residentesAtuais.includes(residente.email)) {
        // Remover residente (por email)
        handleServicoChange(dia, servicoId, 'residentes', residentesAtuais.filter(email => email !== residente.email));
      } else {
        // Adicionar residente (por email)
        handleServicoChange(dia, servicoId, 'residentes', [...residentesAtuais, residente.email]);
      }
    }
  };

  const getServicosDoLocal = (localId: string) => {
    return servicos.filter(servico => servico.localId === localId);
  };

  const getResidentesDoServico = (dia: string, servicoId: string) => {
    const diaAtual = novaEscala.dias[dia as keyof typeof novaEscala.dias] as ServicoDia[];
    const servico = diaAtual.find(s => s.id === servicoId);
    return servico ? servico.residentes as string[] : [];
  };

  // Função para contar quantas vezes um residente participou de um serviço específico
  const getParticipacaoResidente = (residenteEmail: string, servicoId: string, localId: string) => {
    let contador = 0;
    
    // Contar participações em escalas existentes
    escalas.forEach(escala => {
      Object.values(escala.dias).forEach(dia => {
        if (Array.isArray(dia)) {
          dia.forEach(servicoDia => {
            if (servicoDia.servicoId === servicoId && 
                servicoDia.localId === localId && 
                servicoDia.residentes.includes(residenteEmail)) {
              contador++;
            }
          });
        }
      });
    });
    
    // Contar participações na escala sendo criada (novaEscala)
    if (novaEscala.dataInicio) {
      Object.values(novaEscala.dias).forEach(dia => {
        if (Array.isArray(dia)) {
          dia.forEach(servicoDia => {
            if (servicoDia.servicoId === servicoId && 
                servicoDia.localId === localId && 
                servicoDia.residentes.includes(residenteEmail)) {
              contador++;
            }
          });
        }
      });
    }
    
    return contador;
  };

  const isResidenteSelecionado = (dia: string, servicoId: string, residenteId: string) => {
    const diaAtual = novaEscala.dias[dia as keyof typeof novaEscala.dias] as ServicoDia[];
    const servico = diaAtual.find(s => s.id === servicoId);
    const residente = residentes.find(r => r.id === residenteId);
    
    if (!servico || !residente) return false;
    
    return servico.residentes.includes(residente.email);
  };

  // Funções para controlar expansão/colapso das escalas
  const toggleEscalaExpansao = (escalaId: string) => {
    setEscalasExpandidas(prev => {
      const novo = new Set(prev);
      if (novo.has(escalaId)) {
        novo.delete(escalaId);
      } else {
        novo.add(escalaId);
      }
      return novo;
    });
  };

  const expandirTodasEscalas = () => {
    const todasEscalasIds = new Set(escalas.map(e => e.id));
    setEscalasExpandidas(todasEscalasIds);
  };

  const colapsarTodasEscalas = () => {
    setEscalasExpandidas(new Set());
  };

  const handleDeleteEscala = async (escalaId: string) => {
    if (confirm('Tem certeza que deseja excluir esta escala?')) {
      try {
        await UserService.deleteEscala(escalaId);
        loadData();
        setMessage('Escala excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir escala:', error);
        setMessage('Erro ao excluir escala');
      }
    }
  };

  // Funções para abrir modais de edição
  const openEditModal = (type: string, data: Residente | Local | Servico | Escala) => {
    setEditModal({
      isOpen: true,
      type,
      data: { ...data }
    });
  };

  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      type: '',
      data: null
    });
  };

  // Funções de atualização
  const handleUpdateResidente = async (updatedData: Residente) => {
    try {
      await UserService.updateResidente(updatedData.id, updatedData);
      loadData();
      closeEditModal();
      setMessage('Residente atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar residente:', error);
      setMessage('Erro ao atualizar residente');
    }
  };

  const handleUpdateLocal = async (updatedData: Local) => {
    try {
      await UserService.updateLocal(updatedData.id, updatedData);
      loadData();
      closeEditModal();
      setMessage('Local atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar local:', error);
      setMessage('Erro ao atualizar local');
    }
  };

  const handleUpdateServico = async (updatedData: Servico) => {
    try {
      await UserService.updateServico(updatedData.id, updatedData);
      loadData();
      closeEditModal();
      setMessage('Serviço atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      setMessage('Erro ao atualizar serviço');
    }
  };

  const handleUpdateEscala = async (updatedData: Escala) => {
    try {
      await UserService.updateEscala(updatedData.id, updatedData);
      loadData();
      closeEditModal();
      setMessage('Escala atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar escala:', error);
      setMessage('Erro ao atualizar escala');
    }
  };

  // Função para calcular estatísticas detalhadas
  const calcularEstatisticasDetalhadas = (escalasFiltradas: Escala[]) => {


    // Estatísticas por nível
    const residentesR1 = residentes.filter(r => r.nivel === 'R1');
    const residentesR2 = residentes.filter(r => r.nivel === 'R2');
    const residentesR3 = residentes.filter(r => r.nivel === 'R3');

    // Calcular serviços por residente por nível
    const servicosPorResidente = {
      R1: {} as Record<string, { manha: number; tarde: number; total: number }>,
      R2: {} as Record<string, { manha: number; tarde: number; total: number }>,
      R3: {} as Record<string, { manha: number; tarde: number; total: number }>
    };

    escalasFiltradas.forEach(escala => {
      Object.values(escala.dias).forEach(dia => {
        if (Array.isArray(dia)) {
          dia.forEach(servico => {
            servico.residentes.forEach(email => {
              const residente = residentes.find(r => r.email === email);
              if (residente) {
                const nivel = residente.nivel as 'R1' | 'R2' | 'R3';
                if (!servicosPorResidente[nivel][residente.nome]) {
                  servicosPorResidente[nivel][residente.nome] = { manha: 0, tarde: 0, total: 0 };
                }
                
                if (servico.turno === 'manha') {
                  servicosPorResidente[nivel][residente.nome].manha += 1;
                } else {
                  servicosPorResidente[nivel][residente.nome].tarde += 1;
                }
                servicosPorResidente[nivel][residente.nome].total += 1;
              }
            });
          });
        }
      });
    });

    // Identificar brechas nas escalas (por turno)
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const turnos = ['manha', 'tarde'];
    const brechasPorNivel = {
      R1: {} as Record<string, { dia: string; turno: string }[]>,
      R2: {} as Record<string, { dia: string; turno: string }[]>,
      R3: {} as Record<string, { dia: string; turno: string }[]>
    };

    // Calcular folgas por residente
    const folgasPorResidente = {
      R1: {} as Record<string, number>,
      R2: {} as Record<string, number>,
      R3: {} as Record<string, number>
    };

    // Somatórios por nível
    const somatoriosPorNivel = {
      R1: { manha: 0, tarde: 0, total: 0, folgas: 0 },
      R2: { manha: 0, tarde: 0, total: 0, folgas: 0 },
      R3: { manha: 0, tarde: 0, total: 0, folgas: 0 }
    };

    // Para cada residente, verificar quais dias/turnos não têm serviços
    Object.keys(servicosPorResidente).forEach(nivel => {
      Object.keys(servicosPorResidente[nivel as keyof typeof servicosPorResidente]).forEach(nomeResidente => {
        const residente = residentes.find(r => r.nome === nomeResidente);
        if (residente) {
          const turnosComServico = new Set<string>();
          let folgas = 0;
          
          escalasFiltradas.forEach(escala => {
            diasSemana.forEach(dia => {
              const servicosDia = escala.dias[dia as keyof typeof escala.dias];
              if (Array.isArray(servicosDia)) {
                servicosDia.forEach(servico => {
                  if (servico.residentes.includes(residente.email)) {
                    const servicoInfo = servicos.find(s => s.id === servico.servicoId);
                    if (servicoInfo?.nome === 'Folga') {
                      folgas++;
                      // Folga também conta como turno com serviço (não é brecha)
                      turnosComServico.add(`${dia}-${servico.turno}`);
                    } else {
                      turnosComServico.add(`${dia}-${servico.turno}`);
                    }
                  }
                });
              }
            });
          });

          // Identificar turnos sem serviço (desconsiderando sábado tarde e domingo dia todo)
          const turnosSemServico: { dia: string; turno: string }[] = [];
          diasSemana.forEach(dia => {
            turnos.forEach(turno => {
              // Desconsiderar sábado tarde e domingo dia todo
              if (dia === 'sabado' && turno === 'tarde') return;
              if (dia === 'domingo') return;
              
              if (!turnosComServico.has(`${dia}-${turno}`)) {
                turnosSemServico.push({ dia, turno });
              }
            });
          });

          if (turnosSemServico.length > 0) {
            brechasPorNivel[nivel as keyof typeof brechasPorNivel][nomeResidente] = turnosSemServico;
          }

          // Contar folgas
          folgasPorResidente[nivel as keyof typeof folgasPorResidente][nomeResidente] = folgas;

          // Atualizar somatórios
          const servicosResidente = servicosPorResidente[nivel as keyof typeof servicosPorResidente][nomeResidente];
          somatoriosPorNivel[nivel as keyof typeof somatoriosPorNivel].manha += servicosResidente.manha;
          somatoriosPorNivel[nivel as keyof typeof somatoriosPorNivel].tarde += servicosResidente.tarde;
          somatoriosPorNivel[nivel as keyof typeof somatoriosPorNivel].total += servicosResidente.total;
          somatoriosPorNivel[nivel as keyof typeof somatoriosPorNivel].folgas += folgas;
        }
      });
    });

    return {
      escalasFiltradas,
      servicosPorResidente,
      brechasPorNivel,
      folgasPorResidente,
      somatoriosPorNivel,
      totalResidentes: { R1: residentesR1.length, R2: residentesR2.length, R3: residentesR3.length }
    };
  };

  const organizationMedicos = useMemo(
    () => medicos.filter((medico) => isOrganizationTeamMember(medico, activeOrganizationId)),
    [medicos, activeOrganizationId],
  );

  const organizationNutricionistas = useMemo(
    () =>
      nutricionistas.filter((nutricionista) =>
        isOrganizationTeamMember(nutricionista, activeOrganizationId),
      ),
    [nutricionistas, activeOrganizationId],
  );

  const organizationPersonalTrainers = useMemo(
    () =>
      personalTrainers.filter((personal) =>
        isOrganizationTeamMember(personal, activeOrganizationId),
      ),
    [personalTrainers, activeOrganizationId],
  );

  const organizationMedicoIds = useMemo(
    () => new Set(organizationMedicos.map((medico) => medico.id)),
    [organizationMedicos],
  );

  const organizationPacientes = useMemo(
    () =>
      pacientes.filter(
        (paciente) =>
          paciente.medicoResponsavelId &&
          organizationMedicoIds.has(paciente.medicoResponsavelId),
      ),
    [pacientes, organizationMedicoIds],
  );

  const organizationDashboardMetrics = useMemo(
    () =>
      buildOrganizationDashboardMetrics({
        medicos: organizationMedicos,
        nutricionistas: organizationNutricionistas,
        personalTrainers: organizationPersonalTrainers,
        pacientes: organizationPacientes,
        leadsByStatus,
        npsEstatisticas,
        solicitacoesPendentes,
        totalPacientesCompartilhados,
      }),
    [
      organizationMedicos,
      organizationNutricionistas,
      organizationPersonalTrainers,
      organizationPacientes,
      leadsByStatus,
      npsEstatisticas,
      solicitacoesPendentes,
      totalPacientesCompartilhados,
    ],
  );

  const organizationClinicalOutcomes = useMemo(
    () => buildOrganizationClinicalOutcomeMetrics(organizationPacientes),
    [organizationPacientes],
  );

  const platformDashboardMetrics = useMemo(
    () =>
      buildOrganizationDashboardMetrics({
        medicos,
        nutricionistas,
        personalTrainers,
        pacientes,
        leadsByStatus,
        npsEstatisticas,
        solicitacoesPendentes,
        totalPacientesCompartilhados,
      }),
    [
      medicos,
      nutricionistas,
      personalTrainers,
      pacientes,
      leadsByStatus,
      npsEstatisticas,
      solicitacoesPendentes,
      totalPacientesCompartilhados,
    ],
  );

  const platformClinicalOutcomes = useMemo(
    () => buildOrganizationClinicalOutcomeMetrics(pacientes),
    [pacientes],
  );

  const organizationVendasAvulsas = useMemo(
    () => vendasAvulsas.filter((venda) => organizationMedicoIds.has(venda.medicoId)),
    [vendasAvulsas, organizationMedicoIds],
  );

  const organizationFinanceMetrics = useMemo(
    () =>
      buildOrganizationFinanceMetrics({
        medicos: organizationMedicos,
        pacientes: organizationPacientes,
        pagamentosPacientes,
        vendasAvulsas: organizationVendasAvulsas,
      }),
    [
      organizationMedicos,
      organizationPacientes,
      pagamentosPacientes,
      organizationVendasAvulsas,
    ],
  );

  const organizationDashboardLoading = useMemo(
    () => ({
      team: loadingMedicos || loadingNutricionistas || loadingPersonalTrainers,
      pacientes: loadingPacientes,
      leads: loadingLeads,
      nps: loadingNPS,
      compartilhados: loadingPacientesCompartilhados,
    }),
    [
      loadingMedicos,
      loadingNutricionistas,
      loadingPersonalTrainers,
      loadingPacientes,
      loadingLeads,
      loadingNPS,
      loadingPacientesCompartilhados,
    ],
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard-oftware':
        return (
          <OftwareDashboardPanel
            organizations={listNavOrganizations()}
            metrics={platformDashboardMetrics}
            clinicalOutcomes={platformClinicalOutcomes}
            loading={{
              team: loadingMedicos || loadingNutricionistas || loadingPersonalTrainers,
              pacientes: loadingPacientes,
              leads: loadingLeads,
            }}
            onOpenOrganization={() => selectMenu('organizacoes')}
          />
        );
      case 'platform-patrimonio':
        return <PlatformPatrimonioHubPanel onNavigate={selectMenu} />;
      case 'organizacoes':
      case 'leads-whitelabel':
        return (
          <OrganizationsHubPanel
            activeView={activeMenu === 'leads-whitelabel' ? 'leads-whitelabel' : 'list'}
            organizations={listNavOrganizations()}
            activeOrganizationId={activeOrganizationId}
            onSelectOrganization={enterOrganization}
            onNavigate={selectMenu}
          />
        );
      case 'org-dashboard':
        return user ? (
          <OrganizationDashboardPanel
            user={user}
            organization={
              listNavOrganizations().find((o) => o.id === activeOrganizationId) ??
              listNavOrganizations()[0]
            }
            metrics={organizationDashboardMetrics}
            clinicalOutcomes={organizationClinicalOutcomes}
            loading={organizationDashboardLoading}
            onNavigate={selectMenu}
          />
        ) : null;
      case 'org-financeiro-overview':
        return (
          <OrganizationFinanceiroPanel
            organization={
              listNavOrganizations().find((o) => o.id === activeOrganizationId) ??
              listNavOrganizations()[0]
            }
            metrics={organizationFinanceMetrics}
            loading={loadingMedicos || loadingPacientes || loadingPagamentos}
          />
        );
      case 'organizacao-metodo':
        return <OrganizationMetodoPanel />;
      case 'organizacao-metodo-branding':
        return user ? (
          <OrganizationBrandingPanel user={user} organizationId={activeOrganizationId} />
        ) : null;
      case 'platform-health':
        return user ? <PlatformHealthAuditPanel user={user} /> : null;
      case 'meta-business':
        return <MetaBusinessAdminPanel />;
      case 'exames-laboratoriais':
        return <LabExamesLaboratoriaisAdmin />;
      case 'bio-impedancia':
        return <BioImpedanciaReferenciasAdmin />;
      case 'protocolos-prescricao':
        return <ProtocolosPrescricaoAdmin />;
      case 'contratos':
        return <ContratosAdminPanel />;
      case 'cores-do-sistema':
        return <SystemColorsTab />;
      case 'medicos':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Médicos</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#E8EDED]/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#E8EDED]">Padrão Método — imagens</p>
                  <p className="mt-1 text-xs text-[#E8EDED]/60">
                    Fonte: {METODO_IMAGENS_SOURCE_EMAIL} (OG, favicon, PDF, Meu Link, Aplicações, Conclusão)
                  </p>
                  {metodoImagensTemplate?.syncedAt ? (
                    <p className="mt-1 text-xs text-[#4CCB7A]/90">
                      Template sincronizado em{' '}
                      {new Date(metodoImagensTemplate.syncedAt).toLocaleString('pt-BR')}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={loadingMetodoTemplate || !user}
                  onClick={() => void loadMetodoImagensTemplate(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-[#E8EDED] hover:bg-white/15 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingMetodoTemplate ? 'animate-spin' : ''}`} />
                  {loadingMetodoTemplate ? 'Sincronizando…' : 'Sincronizar da conta fonte'}
                </button>
              </div>
              {metodoImagensTemplate ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      ['ogImageUrl', 'OG'],
                      ['faviconUrl', 'Favicon'],
                      ['pdfLogoUrl', 'PDF'],
                      ['drPageLogoUrl', 'Meu Link'],
                      ['aplicacaoPageLogoUrl', 'Aplicações'],
                      ['conclusaoPageLogoUrl', 'Conclusão'],
                    ] as const
                  ).map(([key, label]) => {
                    const url = metodoImagensTemplate[key];
                    if (!url) return null;
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1"
                        title={url}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={label} className="h-8 w-8 rounded object-contain bg-white/10" />
                        <span className="text-xs">{label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : !loadingMetodoTemplate ? (
                <p className="mt-2 text-xs text-amber-300/90">
                  Template ainda não carregado. Clique em sincronizar ou abra a aba com a conta fonte configurada.
                </p>
              ) : null}
            </div>
            {loadingMedicos ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando médicos...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/30 transition-colors">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Qualificação
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          CRM
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Telefone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Cidades
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Análise IA
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Método
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Verificação
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Docs enviados
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Data Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                    {[...medicos]
                      .sort((a, b) => {
                        const mediaA = agregadosMedicos[a.id]?.media ?? 0;
                        const mediaB = agregadosMedicos[b.id]?.media ?? 0;
                        if (mediaB !== mediaA) return mediaB - mediaA;
                        return a.nome.localeCompare(b.nome);
                      })
                      .map((medico, index) => (
                      <tr key={medico.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#E8EDED]">
                          {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-[#E8EDED]/70 cursor-pointer hover:bg-white/10"
                          onClick={() => openModalClassificacaoAdmin('medico', medico.id, `${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${medico.nome}`)}
                          title="Clique para editar classificação"
                        >
                          {agregadosMedicos[medico.id]?.count ? (
                            <span className="inline-flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={12} className={s <= Math.round(agregadosMedicos[medico.id].media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                              ))}
                              <span>{agregadosMedicos[medico.id].media.toFixed(1)} ({agregadosMedicos[medico.id].count})</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">— (clique para definir)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          CRM {medico.crm.estado} {medico.crm.numero}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {medico.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {medico.telefone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span>{medico.cidades?.length || 0} cidade{(medico.cidades?.length || 0) !== 1 ? 's' : ''}</span>
                            {medico.cidades && medico.cidades.length > 0 && (
                              <div className="ml-2 group relative">
                                <Eye size={16} className="text-gray-400 cursor-pointer" />
                                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                  {medico.cidades.map((cidade, idx) => (
                                    <div key={idx}>{cidade.cidade}, {cidade.estado}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className="font-mono text-xs text-[#E8EDED]/70"
                            title={medico.id}
                          >
                            {medico.id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isAnamneseInteligenteAtivoParaMedico(medico)}
                              aria-label={`Análise inteligente ${isAnamneseInteligenteAtivoParaMedico(medico) ? 'ativa' : 'inativa'} para ${medico.nome}`}
                              disabled={isMetaAdminGeralEmail(medico.email)}
                              title={
                                isMetaAdminGeralEmail(medico.email)
                                  ? 'Administrador geral — sempre ativo'
                                  : isAnamneseInteligenteAtivoParaMedico(medico)
                                    ? 'Desativar análise inteligente'
                                    : 'Ativar análise inteligente'
                              }
                              onClick={() =>
                                handleToggleAnamneseInteligenteMedico(
                                  medico.id,
                                  medico.anamneseInteligenteAtivo === true
                                )
                              }
                              className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
                                isAnamneseInteligenteAtivoParaMedico(medico)
                                  ? 'bg-violet-600'
                                  : 'bg-gray-500/60'
                              } ${isMetaAdminGeralEmail(medico.email) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-90'}`}
                            >
                              <span
                                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                  isAnamneseInteligenteAtivoParaMedico(medico) ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="inline-flex items-center gap-1 text-xs text-[#E8EDED]/80">
                              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                              {isAnamneseInteligenteAtivoParaMedico(medico) ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isMetodoImagensAtivo(medico)}
                              disabled={togglingMetodoMedicoId === medico.id || !metodoImagensTemplate}
                              title={
                                !metodoImagensTemplate
                                  ? 'Sincronize o template Método antes de ativar'
                                  : isMetodoImagensAtivo(medico)
                                    ? 'Desativar padrão Método'
                                    : 'Ativar padrão Método'
                              }
                              onClick={() =>
                                handleToggleMetodoImagensMedico(
                                  medico.id,
                                  isMetodoImagensAtivo(medico)
                                )
                              }
                              className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
                                isMetodoImagensAtivo(medico)
                                  ? 'bg-emerald-600'
                                  : 'bg-gray-500/60'
                              } ${
                                togglingMetodoMedicoId === medico.id || !metodoImagensTemplate
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'cursor-pointer hover:opacity-90'
                              }`}
                            >
                              <span
                                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                  isMetodoImagensAtivo(medico) ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="inline-flex items-center gap-1 text-xs text-[#E8EDED]/80">
                              <Flame className="h-3.5 w-3.5 text-emerald-300" />
                              {isMetodoImagensAtivo(medico) ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {medico.isVerificado ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verificado
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              Não Verificado
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {medico.docVerificacaoCnhUrl ? (
                              <a
                                href={medico.docVerificacaoCnhUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                CNH
                              </a>
                            ) : null}
                            {medico.docVerificacaoSelfieUrl ? (
                              <a
                                href={medico.docVerificacaoSelfieUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                Selfie
                              </a>
                            ) : null}
                            {medico.docVerificacaoCrmUrl ? (
                              <a
                                href={medico.docVerificacaoCrmUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                CRM
                              </a>
                            ) : null}
                            {!medico.docVerificacaoCnhUrl && !medico.docVerificacaoSelfieUrl && !medico.docVerificacaoCrmUrl ? (
                              <span className="text-gray-500">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            medico.status === 'ativo'
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {medico.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {medico.dataCadastro ? new Date(medico.dataCadastro).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-row flex-nowrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setMedicoQrLinkModal(medico)}
                              className="shrink-0 p-2 bg-white/15 text-[#E8EDED] rounded-md hover:bg-white/25 transition-colors flex items-center justify-center border border-white/20"
                              title="QR code do link público (/dr/...)"
                            >
                              <QrCode size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setMedicoEditando(medico);
                                setDadosMedicoEditando({
                                  nome: medico.nome,
                                  email: medico.email,
                                  telefone: medico.telefone || '',
                                  genero: medico.genero || '',
                                  crmNumero: medico.crm.numero,
                                  crmEstado: medico.crm.estado,
                                  endereco: medico.localizacao.endereco,
                                  cep: medico.localizacao.cep || '',
                                  pontoReferencia: medico.localizacao.pontoReferencia || ''
                                });
                                setShowEditarMedicoModal(true);
                              }}
                              className="shrink-0 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleVerificacaoMedico(medico.id, medico.isVerificado || false)}
                              className={`shrink-0 p-2 rounded-md transition-colors flex items-center justify-center ${
                                medico.isVerificado
                                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              title={medico.isVerificado ? 'Desverificar' : 'Verificar'}
                            >
                              {medico.isVerificado ? (
                                <XCircle size={16} />
                              ) : (
                                <ShieldCheck size={16} />
                              )}
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Tem certeza que deseja excluir o médico ${medico.nome}? Esta ação não pode ser desfeita.`)) {
                                  try {
                                    await MedicoService.deleteMedico(medico.id);
                                    await loadMedicos();
                                    setMessage('Médico excluído com sucesso!');
                                  } catch (error) {
                                    console.error('Erro ao excluir médico:', error);
                                    setMessage('Erro ao excluir médico');
                                  }
                                }
                              }}
                              className="shrink-0 p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                {medicos.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum médico encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'nutricionistas':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Nutricionistas</h2>
            </div>
            {loadingNutricionistas ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando nutricionistas...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/30 transition-colors">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Qualificação
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Registro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Telefone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Cidades
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Verificado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Docs enviados
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Data Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                    {[...nutricionistas]
                      .sort((a, b) => {
                        const idA = a.userId || a.id;
                        const idB = b.userId || b.id;
                        const mediaA = idA ? (agregadosNutri[idA]?.media ?? 0) : 0;
                        const mediaB = idB ? (agregadosNutri[idB]?.media ?? 0) : 0;
                        if (mediaB !== mediaA) return mediaB - mediaA;
                        return a.nome.localeCompare(b.nome);
                      })
                      .map((nutri, index) => (
                      <tr key={nutri.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#E8EDED]">
                          {nutri.nome}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-[#E8EDED]/70 cursor-pointer hover:bg-white/10"
                          onClick={() => openModalClassificacaoAdmin('nutricionista', nutri.userId || nutri.id, nutri.nome)}
                          title="Clique para editar classificação"
                        >
                          {agregadosNutri[nutri.userId || nutri.id]?.count ? (
                            <span className="inline-flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={12} className={s <= Math.round(agregadosNutri[nutri.userId || nutri.id].media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                              ))}
                              <span>{agregadosNutri[nutri.userId || nutri.id].media.toFixed(1)} ({agregadosNutri[nutri.userId || nutri.id].count})</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">— (clique para definir)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {nutri.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {nutri.registroNumero || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {nutri.telefone ? (
                            <a
                              href={`https://wa.me/55${nutri.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                              title={`WhatsApp: ${nutri.telefone}`}
                            >
                              <Phone size={14} />
                              {nutri.telefone}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span>{nutri.cidades.length} cidade{nutri.cidades.length !== 1 ? 's' : ''}</span>
                            {nutri.cidades.length > 0 && (
                              <div className="ml-2 group relative">
                                <Eye size={16} className="text-gray-400 cursor-pointer" />
                                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                  {nutri.cidades.map((cidade, idx) => (
                                    <div key={idx}>{cidade.cidade}, {cidade.estado}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {nutri.isVerificado ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verificado
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              Não Verificado
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {nutri.docVerificacaoCnhUrl ? (
                              <a
                                href={nutri.docVerificacaoCnhUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                CNH
                              </a>
                            ) : null}
                            {nutri.docVerificacaoSelfieUrl ? (
                              <a
                                href={nutri.docVerificacaoSelfieUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                Selfie
                              </a>
                            ) : null}
                            {nutri.docVerificacaoRegistroUrl ? (
                              <a
                                href={nutri.docVerificacaoRegistroUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                CRN
                              </a>
                            ) : null}
                            {!nutri.docVerificacaoCnhUrl && !nutri.docVerificacaoSelfieUrl && !nutri.docVerificacaoRegistroUrl ? (
                              <span className="text-gray-500">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            nutri.status === 'ativo'
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {nutri.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {nutri.dataCadastro ? new Date(nutri.dataCadastro).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setNutriDetalhes(nutri);
                                setShowDetalhesNutriModal(true);
                              }}
                              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            {!nutri.isVerificado && (
                              <button
                                onClick={async () => {
                                  try {
                                    await NutricionistaService.verifyNutricionista(nutri.userId);
                                    await loadNutricionistas();
                                    setMessage('Nutricionista verificado com sucesso!');
                                  } catch (error) {
                                    console.error('Erro ao verificar nutricionista:', error);
                                    setMessage('Erro ao verificar nutricionista');
                                  }
                                }}
                                className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                                title="Verificar"
                              >
                                <ShieldCheck size={16} />
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                try {
                                  await NutricionistaService.toggleStatus(nutri.userId, nutri.status);
                                  await loadNutricionistas();
                                  setMessage(`Nutricionista ${nutri.status === 'ativo' ? 'inativado' : 'ativado'} com sucesso!`);
                                } catch (error) {
                                  console.error('Erro ao alternar status:', error);
                                  setMessage('Erro ao alternar status');
                                }
                              }}
                              className={`p-2 rounded-md transition-colors flex items-center justify-center ${
                                nutri.status === 'ativo'
                                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              title={nutri.status === 'ativo' ? 'Inativar' : 'Ativar'}
                            >
                              {nutri.status === 'ativo' ? (
                                <XCircle size={16} />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Tem certeza que deseja excluir o nutricionista ${nutri.nome}? Esta ação não pode ser desfeita.`)) {
                                  try {
                                    await NutricionistaService.deleteNutricionista(nutri.userId);
                                    await loadNutricionistas();
                                    setMessage('Nutricionista excluído com sucesso!');
                                  } catch (error) {
                                    console.error('Erro ao excluir nutricionista:', error);
                                    setMessage('Erro ao excluir nutricionista');
                                  }
                                }
                              }}
                              className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                {nutricionistas.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum nutricionista encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'personal_trainers':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Personal Trainers</h2>
            </div>
            {loadingPersonalTrainers ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando personal trainers...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/30 transition-colors">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Qualificação
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Registro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Telefone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Cidades
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Verificado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Docs enviados
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Data Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                    {[...personalTrainers]
                      .sort((a, b) => {
                        const idA = a.id || a.userId;
                        const idB = b.id || b.userId;
                        const mediaA = idA ? (agregadosPersonal[idA]?.media ?? 0) : 0;
                        const mediaB = idB ? (agregadosPersonal[idB]?.media ?? 0) : 0;
                        if (mediaB !== mediaA) return mediaB - mediaA;
                        return a.nome.localeCompare(b.nome);
                      })
                      .map((personal, index) => (
                      <tr key={personal.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#E8EDED]">
                          {personal.nome}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-[#E8EDED]/70 cursor-pointer hover:bg-white/10"
                          onClick={() => openModalClassificacaoAdmin('personal', personal.id || personal.userId, personal.nome)}
                          title="Clique para editar classificação"
                        >
                          {agregadosPersonal[personal.id || personal.userId]?.count ? (
                            <span className="inline-flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={12} className={s <= Math.round(agregadosPersonal[personal.id || personal.userId].media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                              ))}
                              <span>{agregadosPersonal[personal.id || personal.userId].media.toFixed(1)} ({agregadosPersonal[personal.id || personal.userId].count})</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">— (clique para definir)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {personal.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {personal.registroNumero || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {personal.telefone ? (
                            <a
                              href={`https://wa.me/55${personal.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                              title={`WhatsApp: ${personal.telefone}`}
                            >
                              <Phone size={14} />
                              {personal.telefone}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span>{personal.cidades.length} cidade{personal.cidades.length !== 1 ? 's' : ''}</span>
                            {personal.cidades.length > 0 && (
                              <div className="ml-2 group relative">
                                <Eye size={16} className="text-gray-400 cursor-pointer" />
                                <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                  {personal.cidades.map((cidade, idx) => (
                                    <div key={idx}>{cidade.cidade}, {cidade.estado}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {personal.isVerificado ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verificado
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              Não Verificado
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {personal.docVerificacaoCnhUrl ? (
                              <a
                                href={personal.docVerificacaoCnhUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                CNH
                              </a>
                            ) : null}
                            {personal.docVerificacaoSelfieUrl ? (
                              <a
                                href={personal.docVerificacaoSelfieUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                Selfie
                              </a>
                            ) : null}
                            {personal.docVerificacaoRegistroUrl ? (
                              <a
                                href={personal.docVerificacaoRegistroUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline text-xs"
                              >
                                CREF
                              </a>
                            ) : null}
                            {!personal.docVerificacaoCnhUrl && !personal.docVerificacaoSelfieUrl && !personal.docVerificacaoRegistroUrl ? (
                              <span className="text-gray-500">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            personal.status === 'ativo'
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {personal.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {personal.dataCadastro ? new Date(personal.dataCadastro).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setPersonalDetalhes(personal);
                                setShowDetalhesPersonalModal(true);
                              }}
                              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            {!personal.isVerificado && (
                              <button
                                onClick={async () => {
                                  try {
                                    await PersonalTrainerService.verifyPersonalTrainer(personal.userId);
                                    await loadPersonalTrainers();
                                    setMessage('Personal Trainer verificado com sucesso!');
                                  } catch (error) {
                                    console.error('Erro ao verificar personal trainer:', error);
                                    setMessage('Erro ao verificar personal trainer');
                                  }
                                }}
                                className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                                title="Verificar"
                              >
                                <ShieldCheck size={16} />
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                try {
                                  await PersonalTrainerService.toggleStatus(personal.userId, personal.status);
                                  await loadPersonalTrainers();
                                  setMessage(`Personal Trainer ${personal.status === 'ativo' ? 'inativado' : 'ativado'} com sucesso!`);
                                } catch (error) {
                                  console.error('Erro ao alternar status:', error);
                                  setMessage('Erro ao alternar status');
                                }
                              }}
                              className={`p-2 rounded-md transition-colors flex items-center justify-center ${
                                personal.status === 'ativo'
                                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              title={personal.status === 'ativo' ? 'Inativar' : 'Ativar'}
                            >
                              {personal.status === 'ativo' ? (
                                <XCircle size={16} />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Tem certeza que deseja excluir o personal trainer ${personal.nome}? Esta ação não pode ser desfeita.`)) {
                                  try {
                                    await PersonalTrainerService.deletePersonalTrainer(personal.userId);
                                    await loadPersonalTrainers();
                                    setMessage('Personal Trainer excluído com sucesso!');
                                  } catch (error) {
                                    console.error('Erro ao excluir personal trainer:', error);
                                    setMessage('Erro ao excluir personal trainer');
                                  }
                                }
                              }}
                              className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                {personalTrainers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum personal trainer encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

            case 'pacientes':
        // Função auxiliar para calcular quantificação de doses
        const calcularDosesAplicadas = (paciente: PacienteCompleto): number => {
          if (!paciente.evolucaoSeguimento || paciente.evolucaoSeguimento.length === 0) return 0;
          return paciente.evolucaoSeguimento.filter(
            seguimento => seguimento.doseAplicada && seguimento.adherence !== 'MISSED'
          ).length;
        };

        // Função auxiliar para calcular tempo de tratamento
        const calcularTempoTratamento = (paciente: PacienteCompleto): { dias: number; semanas: number; meses: number } => {
          const dataInicio = paciente.planoTerapeutico?.startDate 
            ? new Date(paciente.planoTerapeutico.startDate)
            : paciente.dataCadastro 
            ? new Date(paciente.dataCadastro)
            : null;
          
          if (!dataInicio) {
            return { dias: 0, semanas: 0, meses: 0 };
          }

          const agora = new Date();
          const diffMs = agora.getTime() - dataInicio.getTime();
          const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const semanas = Math.floor(dias / 7);
          const meses = Math.floor(dias / 30);

          return { dias, semanas, meses };
        };

        // Filtrar pacientes
        const pacientesFiltrados = pacientes.filter(paciente => {
          // Filtro por busca (nome ou email)
          const buscaLower = filtroBuscaPaciente.toLowerCase();
          const matchBusca = !filtroBuscaPaciente || 
            (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '').toLowerCase().includes(buscaLower) ||
            paciente.email.toLowerCase().includes(buscaLower);
          
          // Filtro por médico
          const matchMedico = filtroMedicoPaciente === 'todos' || 
            paciente.medicoResponsavelId === filtroMedicoPaciente ||
            (filtroMedicoPaciente === 'sem_medico' && !paciente.medicoResponsavelId);
          
          // Filtro por status
          const matchStatus = filtroStatusPaciente === 'todos' || 
            paciente.statusTratamento === filtroStatusPaciente;
          
          // Filtro por recomendações
          const matchRecomendacoes = filtroRecomendacoesPaciente === 'todos' ||
            (filtroRecomendacoesPaciente === 'lidas' && paciente.recomendacoesLidas === true) ||
            (filtroRecomendacoesPaciente === 'nao_lidas' && (paciente.recomendacoesLidas === false || paciente.recomendacoesLidas === undefined));
          
          return matchBusca && matchMedico && matchStatus && matchRecomendacoes;
        });

        const pacientesIdsSet = new Set(
          pacientes
            .map((p) => (p.id || '').toString().trim())
            .filter(Boolean)
        );
        const buscaLower = filtroBuscaPaciente.toLowerCase().trim();
        const rastrosSubcolecoesOrfas = Object.entries(rastrosSubcolecoesPacientes)
          .filter(([pacienteId]) => !pacientesIdsSet.has(pacienteId))
          .filter(([pacienteId]) => !buscaLower || pacienteId.toLowerCase().includes(buscaLower))
          .sort(([idA], [idB]) => idA.localeCompare(idB, 'pt-BR'));

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Pacientes</h2>
              <div className="text-sm text-gray-500">
                {pacientesFiltrados.length} de {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-[#4CCB7A]/30 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Busca por nome/email */}
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">
                    Buscar por Nome/Email
                  </label>
                  <input
                    type="text"
                    value={filtroBuscaPaciente}
                    onChange={(e) => setFiltroBuscaPaciente(e.target.value)}
                    placeholder="Digite nome ou email..."
                    className="w-full border border-white/20 rounded-md px-3 py-2 text-sm text-[#E8EDED] bg-white/5 placeholder-[#E8EDED]/50 focus:outline-none focus:ring-[#4CCB7A] focus:border-[#4CCB7A]"
                  />
                </div>

                {/* Filtro por Médico */}
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">
                    Médico Responsável
                  </label>
                  <select
                    value={filtroMedicoPaciente}
                    onChange={(e) => setFiltroMedicoPaciente(e.target.value)}
                    className="w-full border border-white/20 rounded-md px-3 py-2 text-sm text-[#E8EDED] bg-white/5 placeholder-[#E8EDED]/50 focus:outline-none focus:ring-[#4CCB7A] focus:border-[#4CCB7A]"
                  >
                    <option value="todos">Todos os médicos</option>
                    <option value="sem_medico">Sem médico responsável</option>
                    {medicos.map(medico => (
                      <option key={medico.id} value={medico.id}>
                        {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Status */}
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">
                    Status do Tratamento
                  </label>
                  <select
                    value={filtroStatusPaciente}
                    onChange={(e) => setFiltroStatusPaciente(e.target.value)}
                    className="w-full border border-white/20 rounded-md px-3 py-2 text-sm text-[#E8EDED] bg-white/5 placeholder-[#E8EDED]/50 focus:outline-none focus:ring-[#4CCB7A] focus:border-[#4CCB7A]"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="pendente">Pendente</option>
                    <option value="em_tratamento">Em Tratamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="abandono">Abandono</option>
                  </select>
                </div>

                {/* Filtro por Recomendações */}
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">
                    Recomendações
                  </label>
                  <select
                    value={filtroRecomendacoesPaciente}
                    onChange={(e) => setFiltroRecomendacoesPaciente(e.target.value)}
                    className="w-full border border-white/20 rounded-md px-3 py-2 text-sm text-[#E8EDED] bg-white/5 placeholder-[#E8EDED]/50 focus:outline-none focus:ring-[#4CCB7A] focus:border-[#4CCB7A]"
                  >
                    <option value="todos">Todas</option>
                    <option value="lidas">Lidas</option>
                    <option value="nao_lidas">Não Lidas</option>
                  </select>
                </div>
              </div>

              {/* Botão para limpar filtros */}
              {(filtroBuscaPaciente || filtroMedicoPaciente !== 'todos' || filtroStatusPaciente !== 'todos' || filtroRecomendacoesPaciente !== 'todos') && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setFiltroBuscaPaciente('');
                      setFiltroMedicoPaciente('todos');
                      setFiltroStatusPaciente('todos');
                      setFiltroRecomendacoesPaciente('todos');
                    }}
                    className="px-4 py-2 bg-white/10 text-[#E8EDED] text-sm rounded-md hover:bg-white/20 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-[#4CCB7A]/30 transition-colors">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-[#E8EDED]">
                  Rastreamento de Subcolecoes (sem documento raiz em pacientes_completos)
                </h3>
                <span className="text-xs text-[#E8EDED]/70">
                  {loadingRastrosSubcolecoesPacientes ? 'Rastreando...' : `${rastrosSubcolecoesOrfas.length} encontrado(s)`}
                </span>
              </div>
              {loadingRastrosSubcolecoesPacientes ? (
                <p className="text-sm text-[#E8EDED]/60">Verificando subcolecoes de pacientes...</p>
              ) : rastrosSubcolecoesOrfas.length === 0 ? (
                <p className="text-sm text-[#E8EDED]/60">Nenhum paciente orfao encontrado nas subcolecoes rastreadas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-2 pr-4 text-left text-xs uppercase tracking-wider text-[#E8EDED]/60">Paciente ID</th>
                        <th className="py-2 text-left text-xs uppercase tracking-wider text-[#E8EDED]/60">Encontrado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rastrosSubcolecoesOrfas.map(([pacienteId, fontes]) => (
                        <tr key={pacienteId} className="border-b border-white/5 last:border-b-0">
                          <td className="py-2 pr-4 font-mono text-xs text-[#E8EDED] break-all">{pacienteId}</td>
                          <td className="py-2 text-[#E8EDED]/80">{fontes.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {loadingPacientes ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando pacientes...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/30 transition-colors">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Documento (pacientes_completos)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Documentos (solicitacoes_medico)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Médico Responsável
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Doses Aplicadas
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Tempo de Tratamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Data de Cadastro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Recomendações
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {pacientesFiltrados.map((paciente, index) => {
                      const medico = medicos.find(m => m.id === paciente.medicoResponsavelId);
                      const fontesSubcolecao = rastrosSubcolecoesPacientes[paciente.id] || [];
                      const emailKey = (paciente.email || '').toLowerCase().trim();
                      const idSolicitacaoMedico =
                        idsSolicitacaoMedicoPorPaciente.porPacienteDocId[paciente.id] ||
                        (emailKey ? idsSolicitacaoMedicoPorPaciente.porEmail[emailKey] : undefined);
                      const dosesAplicadas = calcularDosesAplicadas(paciente);
                      const tempoTratamento = calcularTempoTratamento(paciente);
                      const tempoTexto = tempoTratamento.meses > 0
                        ? `${tempoTratamento.meses} ${tempoTratamento.meses === 1 ? 'mês' : 'meses'}`
                        : tempoTratamento.semanas > 0
                        ? `${tempoTratamento.semanas} ${tempoTratamento.semanas === 1 ? 'semana' : 'semanas'}`
                        : `${tempoTratamento.dias} ${tempoTratamento.dias === 1 ? 'dia' : 'dias'}`;

                      return (
                        <tr key={paciente.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-[#E8EDED]/70">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#E8EDED]">
                            {paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {paciente.email}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400 font-mono text-xs max-w-[16rem] break-all" title={paciente.id}>
                            <div>{paciente.id}</div>
                            {fontesSubcolecao.length > 0 && (
                              <div className="mt-1 text-[10px] text-amber-300">
                                Subcolecoes: {fontesSubcolecao.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400 font-mono text-xs max-w-[16rem] break-all" title={idSolicitacaoMedico || undefined}>
                            {idSolicitacaoMedico || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {medico ? `${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${medico.nome}` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-[#E8EDED] font-medium">
                            <button
                              type="button"
                              onClick={() =>
                                setPacienteDosesModal({
                                  id: paciente.id,
                                  nome:
                                    paciente.dadosIdentificacao?.nomeCompleto ||
                                    paciente.nome ||
                                    paciente.email ||
                                    paciente.id,
                                })
                              }
                              className={`tabular-nums font-semibold underline underline-offset-2 ${
                                dosesAplicadas > 0
                                  ? 'text-[#4CCB7A] hover:text-[#6dd99a]'
                                  : 'text-[#E8EDED]/50 hover:text-[#E8EDED]/80'
                              }`}
                              title="Ver aplicações e links (aplicacao_links)"
                            >
                              {dosesAplicadas}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-[#E8EDED]/70">
                            {tempoTexto}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {paciente.dataCadastro ? new Date(paciente.dataCadastro).toLocaleDateString('pt-BR') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              paciente.statusTratamento === 'em_tratamento'
                                ? 'bg-blue-100 text-blue-800'
                                : paciente.statusTratamento === 'concluido'
                                ? 'bg-green-100 text-green-800'
                                : paciente.statusTratamento === 'abandono'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {paciente.statusTratamento === 'em_tratamento' ? 'Em Tratamento' :
                               paciente.statusTratamento === 'concluido' ? 'Concluído' :
                               paciente.statusTratamento === 'abandono' ? 'Abandono' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {paciente.recomendacoesLidas ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" title="Recomendações lidas" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 mx-auto" title="Recomendações não lidas" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => {
                                setPacienteEditando(paciente);
                                const dadosId = paciente.dadosIdentificacao || {} as any;
                                setDadosPacienteEditando({
                                  nomeCompleto: dadosId.nomeCompleto || paciente.nome || '',
                                  email: dadosId.email || paciente.email || '',
                                  telefone: dadosId.telefone || '',
                                  cpf: dadosId.cpf || '',
                                  dataNascimento: dadosId.dataNascimento 
                                    ? (dadosId.dataNascimento instanceof Date 
                                        ? dadosId.dataNascimento.toISOString().split('T')[0]
                                        : new Date(dadosId.dataNascimento).toISOString().split('T')[0])
                                    : '',
                                  sexoBiologico: dadosId.sexoBiologico || '',
                                  rua: dadosId.endereco?.rua || '',
                                  cidade: dadosId.endereco?.cidade || '',
                                  estado: dadosId.endereco?.estado || '',
                                  cep: dadosId.endereco?.cep || ''
                                });
                                setShowEditarPacienteModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors flex items-center"
                            >
                              <Edit size={14} className="mr-1" />
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                {pacientes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum paciente encontrado</p>
                  </div>
                )}
                {pacientes.length > 0 && pacientesFiltrados.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum paciente encontrado com os filtros aplicados</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'cadastrar-residente':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Cadastrar Residente</h2>
              <button
                onClick={() => setActiveMenu('residentes')}
                className="flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                ← Voltar para Residentes
              </button>
            </div>
            <form onSubmit={handleAddResidente} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nome</label>
                  <input
                    type="text"
                    value={newResidente.nome}
                    onChange={(e) => setNewResidente({ ...newResidente, nome: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nível</label>
                  <select
                    value={newResidente.nivel}
                    onChange={(e) => setNewResidente({ ...newResidente, nivel: e.target.value as 'R1' | 'R2' | 'R3' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="R1">R1</option>
                    <option value="R2">R2</option>
                    <option value="R3">R3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Email</label>
                  <input
                    type="email"
                    value={newResidente.email}
                    onChange={(e) => setNewResidente({ ...newResidente, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Adicionar Residente
                </button>
              </div>
            </form>
          </div>
        );

      case 'cadastrar-local':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Cadastrar Local</h2>
              <button
                onClick={() => setActiveMenu('locais')}
                className="flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                ← Voltar para Locais
              </button>
            </div>
            <form onSubmit={handleAddLocal} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nome do Local</label>
                  <input
                    type="text"
                    value={newLocal.nome}
                    onChange={(e) => setNewLocal({ ...newLocal, nome: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Adicionar Local
                </button>
              </div>
            </form>
          </div>
        );

                            case 'leads':
                const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
                  nao_qualificado: { label: 'Não Qualificado', color: 'text-[#E8EDED]/90', bgColor: 'bg-white/10' },
                  enviado_contato: { label: 'Enviado Contato', color: 'text-[#2F8FA3]', bgColor: 'bg-[#2F8FA3]/20' },
                  contato_feito: { label: 'Contato Feito', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
                  qualificado: { label: 'Qualificado', color: 'text-[#4CCB7A]', bgColor: 'bg-[#4CCB7A]/20' },
                  excluido: { label: 'Excluído', color: 'text-red-400', bgColor: 'bg-red-400/20' },
                };

                const statusOrder: LeadStatus[] = ['nao_qualificado', 'enviado_contato', 'contato_feito', 'qualificado', 'excluido'];

                const handleSetLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
                  try {
                    await LeadService.updateLeadStatus(leadId, newStatus, user?.email || undefined);
                    
                    // Atualizar estado local
                    const updatedLeads = leads.map(l => 
                      l.id === leadId ? { ...l, status: newStatus, dataStatus: new Date() } : l
                    );
                    
                    const leadsPorStatus: Record<LeadStatus, Lead[]> = {
                      nao_qualificado: [],
                      enviado_contato: [],
                      contato_feito: [],
                      qualificado: [],
                      excluido: [],
                    };
                    
                    updatedLeads.forEach(lead => {
                      leadsPorStatus[lead.status].push(lead);
                    });
                    
                    Object.keys(leadsPorStatus).forEach(status => {
                      sortLeadsByStatusDate(status as LeadStatus, leadsPorStatus[status as LeadStatus]);
                    });
                    
                    setLeads(updatedLeads);
                    setLeadsByStatus(leadsPorStatus);
                    setTimeout(() => scrollPipelineToStatus(newStatus), 80);
                  } catch (error) {
                    console.error('Erro ao mover lead:', error);
                    setMessage('Erro ao mover lead');
                    setTimeout(() => setMessage(''), 3000);
                  }
                };

                const handleUpdateLeadEstrelas = async (leadId: string, estrelas: number) => {
                  try {
                    const leadAtual = leads.find(l => l.id === leadId);
                    if (!leadAtual) return;

                    const novasEstrelas = leadAtual.estrelas === estrelas ? 0 : estrelas;
                    await LeadService.updateLeadEstrelas(leadId, novasEstrelas);

                    const updatedLeads = leads.map(l =>
                      l.id === leadId ? { ...l, estrelas: novasEstrelas } : l
                    );

                    const leadsPorStatus: Record<LeadStatus, Lead[]> = {
                      nao_qualificado: [],
                      enviado_contato: [],
                      contato_feito: [],
                      qualificado: [],
                      excluido: [],
                    };

                    updatedLeads.forEach(lead => {
                      leadsPorStatus[lead.status].push(lead);
                    });

                    Object.keys(leadsPorStatus).forEach(status => {
                      sortLeadsByStatusDate(status as LeadStatus, leadsPorStatus[status as LeadStatus]);
                    });

                    setLeads(updatedLeads);
                    setLeadsByStatus(leadsPorStatus);
                  } catch (error) {
                    console.error('Erro ao atualizar estrelas do lead:', error);
                    setMessage('Erro ao atualizar classificação do lead');
                    setTimeout(() => setMessage(''), 3000);
                  }
                };

                const handleMoveLead = async (leadId: string, currentStatus: LeadStatus, direction: 'left' | 'right') => {
                  const currentIndex = statusOrder.indexOf(currentStatus);
                  let newStatus: LeadStatus;
                  
                  if (direction === 'right' && currentIndex < statusOrder.length - 1) {
                    newStatus = statusOrder[currentIndex + 1];
                  } else if (direction === 'left' && currentIndex > 0) {
                    newStatus = statusOrder[currentIndex - 1];
                  } else {
                    return; // Não pode mover
                  }
                  
                  await handleSetLeadStatus(leadId, newStatus);
                };

                return (
                  <div className="space-y-6">
                    {loadingLeads ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                          <p className="mt-4 text-[#E8EDED]/70">Carregando leads...</p>
                        </div>
                      </div>
                    ) : (
                      <div ref={pipelineLeadsScrollRef} className="overflow-x-auto pb-4">
                        <div className="flex gap-4 min-w-max">
                          {statusOrder.map((status) => {
                            const config = statusConfig[status];
                            const leadsInStatus = leadsByStatus[status];
                            const currentIndex = statusOrder.indexOf(status);
                            
                            return (
                              <div key={status} data-pipeline-column={status} className="flex-shrink-0 w-64 bg-white/5 rounded-xl border border-white/10">
                                <div className={`${config.bgColor} ${config.color} px-4 py-3 rounded-t-lg border-b border-gray-200`}>
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-[#E8EDED]">{config.label}</h3>
                                    <span className="text-xs font-semibold text-[#E8EDED] bg-[#0A1F44]/70 border border-white/20 px-2 py-1 rounded-full">
                                      {leadsInStatus.length}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                                  {leadsInStatus.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                      Nenhum lead
                                    </div>
                                  ) : (
                                    leadsInStatus.map((lead) => (
                                      <div
                                        key={lead.id}
                                        className="bg-white/5 rounded-xl border border-white/10 p-3 hover:border-[#4CCB7A]/30 transition-colors"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#E8EDED] truncate">{lead.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                                            {lead.createdAt && (
                                              <p className="text-xs text-gray-400 mt-1">
                                                {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                              </p>
                                            )}
                                            <div className="flex items-center gap-0.5 mt-1.5">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                  key={star}
                                                  onClick={() => handleUpdateLeadEstrelas(lead.id, star)}
                                                  className="p-0 hover:scale-110 transition-transform"
                                                  title={`${star} estrela${star > 1 ? 's' : ''}`}
                                                >
                                                  <Star
                                                    size={14}
                                                    className={
                                                      star <= (lead.estrelas || 0)
                                                        ? 'text-yellow-400 fill-yellow-400'
                                                        : 'text-gray-300'
                                                    }
                                                  />
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                          {lead.telefone && (
                                            <a
                                              href={`https://wa.me/${lead.telefone.replace(/\D/g, '').startsWith('55') ? lead.telefone.replace(/\D/g, '') : `55${lead.telefone.replace(/\D/g, '')}`}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="ml-2 inline-flex items-center justify-center p-1.5 rounded-md bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition-colors"
                                              title={`Abrir WhatsApp: ${lead.telefone}`}
                                            >
                                              <MessageCircle className="w-4 h-4" />
                                            </a>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                                          <button
                                            onClick={() => handleMoveLead(lead.id, lead.status, 'left')}
                                            disabled={currentIndex === 0}
                                            className={`w-8 sm:flex-1 px-1.5 sm:px-2 py-1 text-xs rounded transition-colors ${
                                              currentIndex === 0
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-white/10 text-[#E8EDED] hover:bg-white/20'
                                            }`}
                                            title="Mover para esquerda"
                                          >
                                            ←
                                          </button>
                                          <select
                                            value={lead.status}
                                            onChange={(e) => {
                                              const selectedStatus = e.target.value as LeadStatus;
                                              if (selectedStatus !== lead.status) {
                                                handleSetLeadStatus(lead.id, selectedStatus);
                                              }
                                            }}
                                            className="w-[122px] sm:w-auto sm:flex-[2] px-1.5 sm:px-2 py-1 text-[9px] sm:text-xs rounded bg-white/10 border border-white/20 text-[#E8EDED] focus:outline-none focus:ring-1 focus:ring-[#4CCB7A]"
                                            title="Selecionar etapa do lead"
                                          >
                                            {statusOrder.map((statusOption) => (
                                              <option key={statusOption} value={statusOption} className="text-[9px] sm:text-xs text-gray-900">
                                                {statusConfig[statusOption].label}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => handleMoveLead(lead.id, lead.status, 'right')}
                                            disabled={currentIndex === statusOrder.length - 1}
                                            className={`w-8 sm:flex-1 px-1.5 sm:px-2 py-1 text-xs rounded transition-colors ${
                                              currentIndex === statusOrder.length - 1
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-white/10 text-[#E8EDED] hover:bg-white/20'
                                            }`}
                                            title="Mover para direita"
                                          >
                                            →
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={loadLeads}
                      className="fixed bottom-6 right-4 lg:right-8 z-30 inline-flex items-center justify-center p-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors"
                      aria-label="Atualizar leads"
                      title="Atualizar leads"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                );

                            case 'tirzepatida':
                const tiposTirzepatida = ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'];
                
                const handleSalvarPrecoTirzepatida = async (tipo: string, preco: number) => {
                  try {
                    // Salvar no Firestore
                    await TirzepatidaService.updatePreco(tipo, preco);
                    
                    // Atualizar estado local
                    const novosPrecos = [...tirzepatidaPrecos];
                    const index = novosPrecos.findIndex(p => p.tipo === tipo);
                    if (index >= 0) {
                      novosPrecos[index].preco = preco;
                      novosPrecos[index].atualizadoEm = new Date();
                    } else {
                      novosPrecos.push({ tipo, preco, atualizadoEm: new Date() });
                    }
                    setTirzepatidaPrecos(novosPrecos);
                    setMessage(`Preço do Tirzepatida ${tipo} atualizado com sucesso!`);
                    
                    // Limpar mensagem após 3 segundos
                    setTimeout(() => setMessage(''), 3000);
                  } catch (error) {
                    console.error('Erro ao salvar preço:', error);
                    setMessage('Erro ao salvar preço');
                  }
                };

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-[#E8EDED]">Precificação Tirzepatida</h2>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-[#E8EDED]">Tipos de Tirzepatida</h3>
                        <p className="text-sm text-gray-500 mt-1">Configure os preços dos diferentes tipos de Tirzepatida para que os médicos possam encomendar.</p>
                      </div>
                      <div className="px-6 py-4">
                        <div className="space-y-4">
                          {tiposTirzepatida.map((tipo) => {
                            const precoAtual = tirzepatidaPrecos.find(p => p.tipo === tipo);
                            const editando = editandoTirzepatidaTipo === tipo;

                            return (
                              <div key={tipo} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                                    <Pill className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[#E8EDED]">Tirzepatida {tipo}</p>
                                    {!editando && precoAtual && (
                                      <p className="text-xs text-[#E8EDED]/70">Preço atual: R$ {precoAtual.preco.toFixed(2).replace('.', ',')}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {editando ? (
                                    <>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm text-[#E8EDED]/90">R$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={precoEditandoTirzepatida}
                                          onChange={(e) => setPrecoEditandoTirzepatida(e.target.value)}
                                          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <button
                                        onClick={() => {
                                          const precoNum = parseFloat(precoEditandoTirzepatida);
                                          if (!isNaN(precoNum) && precoNum >= 0) {
                                            handleSalvarPrecoTirzepatida(tipo, precoNum);
                                            setEditandoTirzepatidaTipo(null);
                                            setPrecoEditandoTirzepatida('0');
                                          }
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                                      >
                                        Salvar
                                      </button>
                                      <button
                                        onClick={() => {
                                          setPrecoEditandoTirzepatida('0');
                                          setEditandoTirzepatidaTipo(null);
                                        }}
                                        className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setPrecoEditandoTirzepatida(precoAtual?.preco?.toString() || '0');
                                        setEditandoTirzepatidaTipo(tipo);
                                      }}
                                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center"
                                    >
                                      <Edit size={14} className="mr-1" />
                                      {precoAtual ? 'Editar Preço' : 'Definir Preço'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );

              case 'servicos':
                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-[#E8EDED]">Serviços</h2>
                      <button
                        onClick={() => setShowCadastrarServicoModal(true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Wrench size={16} className="mr-2" />
                        Adicionar Serviço
                      </button>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-[#E8EDED]">Lista de Serviços ({servicos.length})</h3>
                      </div>
                      <div className="px-6 py-4">
                        {servicos.length === 0 ? (
                          <p className="text-gray-500 text-sm">Nenhum serviço cadastrado</p>
                        ) : (
                          <div className="space-y-2">
                            {servicos.map((servico) => {
                              const local = locais.find(l => l.id === servico.localId);
                              return (
                                <div key={servico.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                  <div>
                                    <p className="text-sm font-medium text-[#E8EDED]">{servico.nome}</p>
                                    <p className="text-xs text-gray-500">Local: {local?.nome || 'Local não encontrado'}</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => openEditModal('servico', servico)}
                                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                    >
                                      <Edit size={14} className="mr-1" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteServico(servico.id)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );

              case 'cadastrar-servico':
                return (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-[#E8EDED]">Cadastrar Serviço</h2>
                    <form onSubmit={handleAddServico} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-[#E8EDED]/90">Nome do Serviço</label>
                          <input
                            type="text"
                            value={newServico.nome}
                            onChange={(e) => setNewServico({ ...newServico, nome: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#E8EDED]/90">Local</label>
                          <select
                            value={newServico.localId}
                            onChange={(e) => setNewServico({ ...newServico, localId: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                            required
                          >
                            <option value="">Selecione um local</option>
                            {locais.map((local) => (
                              <option key={local.id} value={local.id}>
                                {local.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Adicionar Serviço
                        </button>
                      </div>
                    </form>
                  </div>
                );

              case 'criar-escala':
                // Calcular datas da semana se dataInicio estiver definida
                const calcularDatasDaSemana = () => {
                  if (!novaEscala.dataInicio) return {};
                  
                  const [ano, mes, dia] = novaEscala.dataInicio.split('-').map(Number);
                  const dataSelecionada = new Date(ano, mes - 1, dia); // mes - 1 porque Date usa 0-11
                  return {
                    segunda: dataSelecionada,
                    terca: new Date(dataSelecionada.getTime() + 24 * 60 * 60 * 1000),
                    quarta: new Date(dataSelecionada.getTime() + 2 * 24 * 60 * 60 * 1000),
                    quinta: new Date(dataSelecionada.getTime() + 3 * 24 * 60 * 60 * 1000),
                    sexta: new Date(dataSelecionada.getTime() + 4 * 24 * 60 * 60 * 1000),
                    sabado: new Date(dataSelecionada.getTime() + 5 * 24 * 60 * 60 * 1000),
                    domingo: new Date(dataSelecionada.getTime() + 6 * 24 * 60 * 60 * 1000)
                  };
                };

                const datasDaSemana = calcularDatasDaSemana();
                
                const diasSemana = [
                  { key: 'segunda', nome: 'Segunda-feira', data: datasDaSemana.segunda },
                  { key: 'terca', nome: 'Terça-feira', data: datasDaSemana.terca },
                  { key: 'quarta', nome: 'Quarta-feira', data: datasDaSemana.quarta },
                  { key: 'quinta', nome: 'Quinta-feira', data: datasDaSemana.quinta },
                  { key: 'sexta', nome: 'Sexta-feira', data: datasDaSemana.sexta },
                  { key: 'sabado', nome: 'Sábado', data: datasDaSemana.sabado },
                  { key: 'domingo', nome: 'Domingo', data: datasDaSemana.domingo }
                ];


                return (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-[#E8EDED]">Criar Escala Semanal</h2>
                    <form onSubmit={handleCriarEscala} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-[#E8EDED]/90 mb-2">
                          Data de Início da Semana (Segunda-feira)
                        </label>
                        <input
                          type="date"
                          value={novaEscala.dataInicio}
                          onChange={(e) => handleDataInicioChange(e.target.value)}
                          className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                          required
                        />
                      </div>

                      {/* Abas dos dias da semana */}
                      <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-4 justify-center">
                          {diasSemana.map(({ key, nome, data }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setActiveTab(key)}
                              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === key
                                  ? 'border-green-500 text-green-600'
                                  : 'border-transparent text-gray-500 hover:text-[#E8EDED] hover:border-white/20'
                              }`}
                            >
                              <div className="text-center">
                                <div>{nome}</div>
                                {data && (
                                  <div className="text-xs font-normal opacity-75 mt-1">
                                    {data.toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </nav>
                      </div>

                      {/* Conteúdo da aba ativa */}
                      <div className="mt-6">
                        {diasSemana.map(({ key, nome, data }) => (
                          activeTab === key && (
                            <div key={key} className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-[#E8EDED]">
                                  {nome} {data && `- ${data.toLocaleDateString('pt-BR')}`}
                                </h3>
                              </div>

                              {/* Lista de serviços do dia */}
                              <div className="space-y-4">
                                {(novaEscala.dias[key as keyof typeof novaEscala.dias] as ServicoDia[]).map((servico, index) => (
                                  <div key={servico.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-4">
                                      <h4 className="text-md font-medium text-[#E8EDED]">
                                        Serviço {index + 1}
                                      </h4>
                                      <button
                                        type="button"
                                        onClick={() => removerServico(key, servico.id)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                      >
                                        Remover
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                      {/* Coluna 1: Configurações */}
                                      <div className="space-y-4">
                                        {/* Local */}
                                        <div>
                                          <label className="block text-sm font-medium text-[#E8EDED]/90 mb-2">Local</label>
                                          <select
                                            value={servico.localId}
                                            onChange={(e) => {
                                              handleServicoChange(key, servico.id, 'localId', e.target.value);
                                              handleServicoChange(key, servico.id, 'servicoId', ''); // Limpar serviço quando mudar local
                                            }}
                                            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                          >
                                            <option value="">Selecione um local</option>
                                            {locais
                                              .sort((a, b) => a.nome.localeCompare(b.nome))
                                              .map((local) => (
                                              <option key={local.id} value={local.id}>
                                                {local.nome}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Serviço */}
                                        <div>
                                          <label className="block text-sm font-medium text-[#E8EDED]/90 mb-2">Serviço</label>
                                          <select
                                            value={servico.servicoId}
                                            onChange={(e) => handleServicoChange(key, servico.id, 'servicoId', e.target.value)}
                                            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                            disabled={!servico.localId}
                                          >
                                            <option value="">Selecione um serviço</option>
                                            {getServicosDoLocal(servico.localId)
                                              .sort((a, b) => a.nome.localeCompare(b.nome))
                                              .map((serv) => (
                                              <option key={serv.id} value={serv.id}>
                                                {serv.nome}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Turno */}
                                        <div>
                                          <label className="block text-sm font-medium text-[#E8EDED]/90 mb-2">Turno</label>
                                          <div className="space-y-2">
                                            <label className="flex items-center">
                                              <input
                                                type="radio"
                                                name={`turno-${servico.id}`}
                                                value="manha"
                                                checked={servico.turno === 'manha'}
                                                onChange={(e) => handleServicoChange(key, servico.id, 'turno', e.target.value)}
                                                className="mr-2 text-green-600 focus:ring-green-500"
                                              />
                                              <span className="text-sm text-[#E8EDED]/90">Manhã</span>
                                            </label>
                                            <label className="flex items-center">
                                              <input
                                                type="radio"
                                                name={`turno-${servico.id}`}
                                                value="tarde"
                                                checked={servico.turno === 'tarde'}
                                                onChange={(e) => handleServicoChange(key, servico.id, 'turno', e.target.value)}
                                                className="mr-2 text-green-600 focus:ring-green-500"
                                              />
                                              <span className="text-sm text-[#E8EDED]/90">Tarde</span>
                                            </label>
                                          </div>
                                        </div>
                                      </div>

                                    {/* Coluna 2 e 3: Residentes por Nível */}
                                    <div className="lg:col-span-2">
                                      <label className="block text-sm font-medium text-[#E8EDED]/90 mb-2">
                                        Residentes ({getResidentesDoServico(key, servico.id).length})
                                      </label>
                                      <div className="h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                                        {residentes.length === 0 ? (
                                          <p className="text-sm text-gray-500">Nenhum residente cadastrado</p>
                                        ) : (
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* R1 */}
                                            <div className="space-y-1">
                                              <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide border-b border-blue-200 pb-1">
                                                R1 ({residentes.filter(r => r.nivel === 'R1').length})
                                              </h4>
                                              {residentes.filter(r => r.nivel === 'R1').map((residente) => {
                                                const participacoes = servico.servicoId && servico.localId ?
                                                  getParticipacaoResidente(residente.email, servico.servicoId, servico.localId) : 0;

                                                return (
                                                  <label key={residente.id} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                                    <input
                                                      type="checkbox"
                                                      checked={isResidenteSelecionado(key, servico.id, residente.id)}
                                                      onChange={() => handleResidenteToggle(key, servico.id, residente.id)}
                                                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center space-x-1">
                                                        <span className="text-[#E8EDED] font-medium truncate text-xs">
                                                          {residente.nome}
                                                        </span>
                                                        {participacoes > 0 && (
                                                          <span className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded-full flex-shrink-0">
                                                            {participacoes}x
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </label>
                                                );
                                              })}
                                            </div>

                                            {/* R2 */}
                                            <div className="space-y-1">
                                              <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide border-b border-green-200 pb-1">
                                                R2 ({residentes.filter(r => r.nivel === 'R2').length})
                                              </h4>
                                              {residentes.filter(r => r.nivel === 'R2').map((residente) => {
                                                const participacoes = servico.servicoId && servico.localId ?
                                                  getParticipacaoResidente(residente.email, servico.servicoId, servico.localId) : 0;

                                                return (
                                                  <label key={residente.id} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                                    <input
                                                      type="checkbox"
                                                      checked={isResidenteSelecionado(key, servico.id, residente.id)}
                                                      onChange={() => handleResidenteToggle(key, servico.id, residente.id)}
                                                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center space-x-1">
                                                        <span className="text-[#E8EDED] font-medium truncate text-xs">
                                                          {residente.nome}
                                                        </span>
                                                        {participacoes > 0 && (
                                                          <span className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded-full flex-shrink-0">
                                                            {participacoes}x
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </label>
                                                );
                                              })}
                                            </div>

                                            {/* R3 */}
                                            <div className="space-y-1">
                                              <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide border-b border-purple-200 pb-1">
                                                R3 ({residentes.filter(r => r.nivel === 'R3').length})
                                              </h4>
                                              {residentes.filter(r => r.nivel === 'R3').map((residente) => {
                                                const participacoes = servico.servicoId && servico.localId ?
                                                  getParticipacaoResidente(residente.email, servico.servicoId, servico.localId) : 0;

                                                return (
                                                  <label key={residente.id} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                                    <input
                                                      type="checkbox"
                                                      checked={isResidenteSelecionado(key, servico.id, residente.id)}
                                                      onChange={() => handleResidenteToggle(key, servico.id, residente.id)}
                                                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center space-x-1">
                                                        <span className="text-[#E8EDED] font-medium truncate text-xs">
                                                          {residente.nome}
                                                        </span>
                                                        {participacoes > 0 && (
                                                          <span className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded-full flex-shrink-0">
                                                            {participacoes}x
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    </div>
                                  </div>
                                ))}

                                {(novaEscala.dias[key as keyof typeof novaEscala.dias] as ServicoDia[]).length === 0 && (
                                  <div className="text-center py-8 text-gray-500">
                                    <p>Nenhum serviço adicionado para {nome.toLowerCase()}</p>
                                    <p className="text-sm">Clique em &quot;Adicionar Serviço&quot; para começar</p>
                                  </div>
                                )}
                                
                                {/* Botão Adicionar Serviço sempre no final */}
                                <div className="flex justify-center pt-4">
                                  <button
                                    type="button"
                                    onClick={() => adicionarServico(key)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                  >
                                    + Adicionar Serviço
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        ))}
                      </div>


                      <div className="mt-6">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {loading ? 'Criando Escala...' : 'Criar Escala'}
                        </button>
                      </div>
                    </form>
                  </div>
                );

              case 'escalas':
                const diasSemanaEscalas = [
                  { key: 'segunda', nome: 'Segunda-feira' },
                  { key: 'terca', nome: 'Terça-feira' },
                  { key: 'quarta', nome: 'Quarta-feira' },
                  { key: 'quinta', nome: 'Quinta-feira' },
                  { key: 'sexta', nome: 'Sexta-feira' },
                  { key: 'sabado', nome: 'Sábado' },
                  { key: 'domingo', nome: 'Domingo' }
                ];

                return (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-[#E8EDED]">Escalas Cadastradas</h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-[#E8EDED]">Lista de Escalas ({escalas.length})</h3>
                          <div className="flex space-x-2">
                            <button
                              onClick={expandirTodasEscalas}
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                            >
                              Expandir Todas
                            </button>
                            <button
                              onClick={colapsarTodasEscalas}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              Colapsar Todas
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4">
                        {escalas.length === 0 ? (
                          <p className="text-gray-500 text-sm">Nenhuma escala cadastrada</p>
                        ) : (
                          <div className="space-y-4">
                            {escalas
                              .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())
                              .map((escala) => {
                              const isExpandida = escalasExpandidas.has(escala.id);
                              
                              return (
                                <div key={escala.id} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-3">
                                      <button
                                        onClick={() => toggleEscalaExpansao(escala.id)}
                                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                        title={isExpandida ? "Colapsar detalhes" : "Expandir detalhes"}
                                      >
                                        {isExpandida ? (
                                          <svg className="w-5 h-5 text-[#E8EDED]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        ) : (
                                          <svg className="w-5 h-5 text-[#E8EDED]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        )}
                                      </button>
                                      <div>
                                        <h4 className="text-lg font-medium text-[#E8EDED]">
                                          Semana de {new Date(escala.dataInicio).toLocaleDateString('pt-BR')}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                          Criada em {new Date(escala.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => openEditModal('escala', escala)}
                                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                      >
                                        <Edit size={14} className="mr-1" />
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEscala(escala.id)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                      >
                                        Excluir
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Conteúdo expansível */}
                                  {isExpandida && (
                                    <div className="border-t border-gray-200 pt-4">
                                
                                {/* Abas dos dias da semana */}
                                <div className="border-b border-gray-200">
                                  <nav className="-mb-px flex space-x-8">
                                    {diasSemanaEscalas.map(({ key, nome }) => {
                                      const servicosDia = escala.dias[key as keyof typeof escala.dias];
                                      const temServicos = Array.isArray(servicosDia) && servicosDia.length > 0;
                                      
                                      return (
                                        <button
                                          key={key}
                                          type="button"
                                          onClick={() => setActiveTab(key)}
                                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === key
                                              ? 'border-green-500 text-green-600'
                                              : 'border-transparent text-gray-500 hover:text-[#E8EDED] hover:border-white/20'
                                          }`}
                                        >
                                          {nome} {temServicos && `(${servicosDia.length})`}
                                        </button>
                                      );
                                    })}
                                  </nav>
                                </div>

                                {/* Conteúdo da aba ativa */}
                                <div className="mt-4">
                                  {diasSemanaEscalas.map(({ key, nome }) => (
                                    activeTab === key && (
                                      <div key={key} className="space-y-4">
                                        {(() => {
                                          const servicosDia = escala.dias[key as keyof typeof escala.dias];
                                          if (!Array.isArray(servicosDia) || servicosDia.length === 0) {
                                            return (
                                              <div className="text-center py-8 text-gray-500">
                                                <p>Nenhum serviço cadastrado para {nome.toLowerCase()}</p>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div className="space-y-3">
                                              {servicosDia.map((servicoDia, index) => {
                                                const local = locais.find(l => l.id === servicoDia.localId);
                                                const servico = servicos.find(s => s.id === servicoDia.servicoId);
                                                const residentesDia = residentes.filter(r => servicoDia.residentes.includes(r.email));
                                                
                                                return (
                                                  <div key={servicoDia.id || index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                                    <div className="flex justify-between items-start mb-3">
                                                      <h6 className="font-medium text-gray-800">Serviço {index + 1}</h6>
                                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                        servicoDia.turno === 'manha' 
                                                          ? 'bg-yellow-100 text-yellow-800' 
                                                          : 'bg-blue-100 text-blue-800'
                                                      }`}>
                                                        {servicoDia.turno === 'manha' ? 'Manhã' : 'Tarde'}
                                                      </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      <div>
                                                        <p className="text-sm text-[#E8EDED]/70"><strong>Local:</strong> {local?.nome}</p>
                                                        <p className="text-sm text-[#E8EDED]/70"><strong>Serviço:</strong> {servico?.nome}</p>
                                                      </div>
                                                      <div>
                                                        <p className="text-xs text-gray-500 font-medium mb-1">Residentes:</p>
                                                        {residentesDia.length > 0 ? (
                                                          residentesDia.map(residente => (
                                                            <p key={residente.id} className="text-xs text-[#E8EDED]/90">
                                                              {residente.nome} ({residente.nivel})
                                                            </p>
                                                          ))
                                                        ) : (
                                                          <p className="text-xs text-gray-500">Nenhum residente</p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )
                                  ))}
                                </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );

      case 'estatisticas': {
        // Calcular estatísticas de médicos
        const totalMedicos = medicos.length;
        const medicosVerificados = medicos.filter(m => m.isVerificado).length;
        const medicosNaoVerificados = totalMedicos - medicosVerificados;
        const totalPacientes = pacientes.length;

        const toDateEvolucao = (val: unknown): Date | null => {
          if (!val) return null;
          if (val instanceof Date) return val;
          const t = (val as { toDate?: () => Date })?.toDate?.();
          if (t) return t;
          const d = new Date(val as string | number);
          return isNaN(d.getTime()) ? null : d;
        };

        let kgPerdidoTotal = 0;
        let totalAplicacoesMg = 0;
        let totalAplicacoesQuantidade = 0;

        pacientes.forEach((paciente) => {
          const evolucao = paciente.evolucaoSeguimento || [];

          evolucao.forEach((reg) => {
            const doseAplicada = reg.doseAplicada;
            const adherence = String(reg.adherence ?? reg.adesao ?? '').toUpperCase();
            const contaAplicacao = Boolean(doseAplicada) && adherence !== 'MISSED';
            const adesaoOk = reg.adherence !== 'MISSED' && reg.adesao !== 'esquecida';

            if (contaAplicacao) {
              totalAplicacoesQuantidade += 1;
            }
            if (adesaoOk) {
              const qtd = reg.doseAplicada?.quantidade;
              if (typeof qtd === 'number' && qtd > 0) {
                totalAplicacoesMg += qtd;
              }
            }
          });

          const comPeso = evolucao
            .filter((r) => typeof r.peso === 'number' && r.peso > 0)
            .sort((a, b) => {
              const sa = a.weekIndex ?? a.numeroSemana ?? 0;
              const sb = b.weekIndex ?? b.numeroSemana ?? 0;
              if (sa !== sb) return sa - sb;
              const da = toDateEvolucao(a.dataRegistro) || new Date(0);
              const db = toDateEvolucao(b.dataRegistro) || new Date(0);
              return da.getTime() - db.getTime();
            });

          const pesoInicial =
            comPeso[0]?.peso ??
            paciente.dadosClinicos?.medidasIniciais?.peso ??
            null;
          const pesoFinal =
            (comPeso.length > 0 ? comPeso[comPeso.length - 1]?.peso : null) ??
            paciente.planoTerapeutico?.conclusaoTratamento?.pesoFinalKg ??
            null;

          if (pesoInicial != null && pesoFinal != null && pesoInicial > pesoFinal) {
            kgPerdidoTotal += pesoInicial - pesoFinal;
          }
        });

        const KCAL_POR_KG_PERDIDO = 7700;
        const totalCaloriasPerdidas = Math.round(kgPerdidoTotal * KCAL_POR_KG_PERDIDO);
        
        // Calcular estatísticas de nutricionistas
        const totalNutricionistas = nutricionistas.length;
        const nutricionistasVerificados = nutricionistas.filter(n => n.isVerificado).length;
        const nutricionistasNaoVerificados = totalNutricionistas - nutricionistasVerificados;
        
        // Calcular estatísticas de personal trainers
        const totalPersonalTrainers = personalTrainers.length;
        const personalTrainersVerificados = personalTrainers.filter(p => p.isVerificado).length;
        const personalTrainersNaoVerificados = totalPersonalTrainers - personalTrainersVerificados;
        
        // Estatísticas do pipeline de leads
        const totalLeadsNaoQualificado = leadsByStatus.nao_qualificado.length;
        const totalLeadsEnviadoContato = leadsByStatus.enviado_contato.length;
        const totalLeadsContatoFeito = leadsByStatus.contato_feito.length;
        const totalLeadsQualificado = leadsByStatus.qualificado.length;
        const totalLeadsExcluido = leadsByStatus.excluido.length;
        const totalLeadsAtivos = totalLeadsNaoQualificado + totalLeadsEnviadoContato + totalLeadsContatoFeito + totalLeadsQualificado;
        
        // Taxa de conversão: leads qualificados que desapareceram (encontraram médico) / total de leads não qualificados
        const taxaConversao = totalLeadsNaoQualificado > 0 && leadsQualificadosDesaparecidos > 0
          ? ((leadsQualificadosDesaparecidos / totalLeadsNaoQualificado) * 100).toFixed(1)
          : '0.0';

        // Calcular abandonos por motivo
        const abandonosPorMotivo: Record<string, number> = {};
        pacientes.forEach(paciente => {
          if (paciente.motivoAbandono) {
            abandonosPorMotivo[paciente.motivoAbandono] = (abandonosPorMotivo[paciente.motivoAbandono] || 0) + 1;
          }
        });
        const rankingAbandonos = Object.entries(abandonosPorMotivo)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        // Calcular ranking de médicos por número de pacientes
        const rankingMedicos: Record<string, {
          medico: Medico;
          pendente: number;
          emTratamento: number;
          concluido: number;
          abandono: number;
          solicitacoesPendentes: number;
          total: number;
        }> = {};

        // Inicializar todos os médicos no ranking
        medicos.forEach(medico => {
          rankingMedicos[medico.id] = {
            medico,
            pendente: 0,
            emTratamento: 0,
            concluido: 0,
            abandono: 0,
            solicitacoesPendentes: 0,
            total: 0
          };
        });

        // Contar pacientes por médico
        pacientes.forEach(paciente => {
          const medicoId = paciente.medicoResponsavelId;
          if (medicoId && rankingMedicos[medicoId]) {
            const status = paciente.statusTratamento || 'pendente';
            if (status === 'pendente') rankingMedicos[medicoId].pendente++;
            else if (status === 'em_tratamento') rankingMedicos[medicoId].emTratamento++;
            else if (status === 'concluido') rankingMedicos[medicoId].concluido++;
            else if (status === 'abandono') rankingMedicos[medicoId].abandono++;
            rankingMedicos[medicoId].total++;
          }
        });

        // Contar solicitações pendentes por médico
        solicitacoesPendentes.forEach(solicitacao => {
          const medicoId = solicitacao.medicoId;
          if (medicoId && rankingMedicos[medicoId]) {
            rankingMedicos[medicoId].solicitacoesPendentes++;
          }
        });

        const rankingMedicosOrdenado = Object.values(rankingMedicos)
          .filter(item => item.total > 0 || item.solicitacoesPendentes > 0)
          .sort((a, b) => b.total - a.total);

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Estatísticas</h2>
            </div>

            {/* Cards de resumo */}
            <div className="space-y-6">
              {/* Primeira linha: Médicos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Médicos</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{totalMedicos}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Médicos Verificados</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{medicosVerificados}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Médicos não Verificados</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{medicosNaoVerificados}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Segunda linha: Nutricionistas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Nutricionistas</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{totalNutricionistas}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Nutricionistas Verificados</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{nutricionistasVerificados}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Nutricionistas não Verificados</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{nutricionistasNaoVerificados}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terceira linha: Personal Trainers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Personal Trainers</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{totalPersonalTrainers}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Personal Trainers Verificados</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{personalTrainersVerificados}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Personal Trainers não Verificados</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{personalTrainersNaoVerificados}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pacientes e resultados clínicos agregados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Pacientes</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">{totalPacientes}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Pacientes Compartilhados</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">
                        {loadingPacientesCompartilhados ? '...' : totalPacientesCompartilhados}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Scale className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Peso Perdido</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">
                        {kgPerdidoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Pill className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Aplicações (mg)</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">
                        {totalAplicacoesMg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mg
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Aplicações (quantidade)</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">
                        {totalAplicacoesQuantidade.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#E8EDED]/70">Total de Calorias Perdidas</p>
                      <p className="text-2xl font-semibold text-[#E8EDED]">
                        {totalCaloriasPerdidas.toLocaleString('pt-BR')} kcal
                      </p>
                      <p className="text-xs text-[#E8EDED]/50 mt-1">Equivalente ao peso total perdido</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline de Leads */}
            <div className="mt-6">
              <h3 className="text-xl font-bold text-[#E8EDED] mb-4">Pipeline de Leads</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-sm font-medium text-[#E8EDED]/70">Não Qualificado</p>
                  <p className="text-2xl font-semibold text-[#E8EDED]">{totalLeadsNaoQualificado}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-[#2F8FA3]/40">
                  <p className="text-sm font-medium text-[#E8EDED]/80">Enviado Contato</p>
                  <p className="text-2xl font-semibold text-[#E8EDED]">{totalLeadsEnviadoContato}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-amber-400/40">
                  <p className="text-sm font-medium text-[#E8EDED]/80">Contato Feito</p>
                  <p className="text-2xl font-semibold text-[#E8EDED]">{totalLeadsContatoFeito}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-[#4CCB7A]/40">
                  <p className="text-sm font-medium text-[#E8EDED]/80">Qualificado</p>
                  <p className="text-2xl font-semibold text-[#E8EDED]">{totalLeadsQualificado}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-red-400/40">
                  <p className="text-sm font-medium text-[#E8EDED]/80">Excluído</p>
                  <p className="text-2xl font-semibold text-[#E8EDED]">{totalLeadsExcluido}</p>
                </div>
              </div>
              
              {/* Taxa de Conversão */}
              {leadsQualificadosDesaparecidos > 0 && (
                <div className="mt-4 bg-white/5 p-4 rounded-xl border border-[#4CCB7A]/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#E8EDED]">Taxa de Conversão</p>
                      <p className="text-xs text-[#E8EDED]/70 mt-1">
                        Leads qualificados que encontraram médico
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-[#4CCB7A]">{taxaConversao}%</p>
                      <p className="text-xs text-[#E8EDED]/70">
                        {leadsQualificadosDesaparecidos} de {totalLeadsNaoQualificado}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ranking de médicos por número de pacientes */}
            {rankingMedicosOrdenado.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Ranking de Médicos por Número de Pacientes</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Posição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Médico</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Pendente</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Em Tratamento</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Concluído</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Abandono</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Solicitação Pendente</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {rankingMedicosOrdenado.map((item, index) => (
                        <tr key={item.medico.id} className={index % 2 === 0 ? 'bg-transparent' : 'bg-white/5'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#E8EDED]">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center inline-block ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              index === 2 ? 'bg-orange-500 text-white' :
                              'bg-white/10 text-[#E8EDED]'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#E8EDED]">
                            {item.medico.genero === 'F' ? 'Dra.' : 'Dr.'} {item.medico.nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-[#E8EDED]/70">{item.pendente}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-600 font-medium">{item.emTratamento}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-medium">{item.concluido}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-400 font-medium">{item.abandono}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-amber-400 font-medium">{item.solicitacoesPendentes}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-[#E8EDED]">{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {rankingMedicosOrdenado.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors text-center text-[#E8EDED]/70">
                Nenhum médico encontrado com pacientes cadastrados.
              </div>
            )}

            {/* Filtro de Médico para Estatísticas */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#E8EDED]/90 mb-2">Filtrar por Médico</label>
                <select
                  value={filtroMedicoEstatisticas}
                  onChange={(e) => setFiltroMedicoEstatisticas(e.target.value)}
                  className="w-full md:w-auto border border-white/20 rounded-md px-3 py-2 text-[#E8EDED] bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]"
                >
                  <option value="total">Total (Todos os Médicos)</option>
                  {medicos.map((medico) => (
                    <option key={medico.id} value={medico.id}>
                      {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ranking de Abandonos por Motivo (Filtrado) */}
            {(() => {
              // Filtrar pacientes baseado no filtro de médico
              const pacientesFiltrados = filtroMedicoEstatisticas === 'total' 
                ? pacientes 
                : pacientes.filter(p => p.medicoResponsavelId === filtroMedicoEstatisticas);

              // Calcular abandonos por motivo
              const abandonosPorMotivo: Record<string, number> = {};
              pacientesFiltrados.forEach(paciente => {
                if (paciente.motivoAbandono) {
                  abandonosPorMotivo[paciente.motivoAbandono] = (abandonosPorMotivo[paciente.motivoAbandono] || 0) + 1;
                }
              });
              const rankingAbandonosFiltrado = Object.entries(abandonosPorMotivo)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

              if (rankingAbandonosFiltrado.length === 0) return null;

              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Ranking de Motivos por Abandono</h3>
                  <div className="space-y-3">
                    {rankingAbandonosFiltrado.map(([motivo, quantidade]: [string, number], index: number) => (
                      <div key={motivo} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center space-x-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-white/10 text-[#E8EDED]'
                          }`}>
                            {index + 1}
                          </span>
<span className="font-medium text-[#E8EDED]">{motivo}</span>
                          </div>
                        <span className="text-lg font-semibold text-[#E8EDED]">{quantidade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Estatísticas de Demografia dos Pacientes */}
            {(() => {
              // Filtrar pacientes baseado no filtro de médico
              const pacientesFiltrados = filtroMedicoEstatisticas === 'total' 
                ? pacientes 
                : pacientes.filter(p => p.medicoResponsavelId === filtroMedicoEstatisticas);

              // Calcular idades dos pacientes
              const pacientesComIdade = pacientesFiltrados.filter(p => {
                const dataNasc = p.dadosIdentificacao?.dataNascimento;
                return dataNasc !== null && dataNasc !== undefined;
              });

              const idades = pacientesComIdade.map(p => {
                const dataNasc = p.dadosIdentificacao?.dataNascimento;
                if (!dataNasc) return null;
                
                let dataNascimento: Date;
                if (dataNasc instanceof Date) {
                  dataNascimento = dataNasc;
                } else if (dataNasc?.toDate) {
                  dataNascimento = dataNasc.toDate();
                } else {
                  dataNascimento = new Date(dataNasc);
                }
                
                const hoje = new Date();
                let idade = hoje.getFullYear() - dataNascimento.getFullYear();
                const mesAtual = hoje.getMonth();
                const diaAtual = hoje.getDate();
                const mesNasc = dataNascimento.getMonth();
                const diaNasc = dataNascimento.getDate();
                
                if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) {
                  idade--;
                }
                
                return idade;
              }).filter(idade => idade !== null && idade > 0) as number[];

              const idadeMedia = idades.length > 0 
                ? idades.reduce((sum, idade) => sum + idade, 0) / idades.length 
                : 0;

              // Calcular faixas etárias
              const faixasEtarias = {
                '18-24': idades.filter(idade => idade >= 18 && idade <= 24).length,
                '25-40': idades.filter(idade => idade >= 25 && idade <= 40).length,
                '41-65': idades.filter(idade => idade >= 41 && idade <= 65).length,
                '65+': idades.filter(idade => idade > 65).length
              };

              const totalComIdade = idades.length;
              const porcentagensFaixas = {
                '18-24': totalComIdade > 0 ? (faixasEtarias['18-24'] / totalComIdade) * 100 : 0,
                '25-40': totalComIdade > 0 ? (faixasEtarias['25-40'] / totalComIdade) * 100 : 0,
                '41-65': totalComIdade > 0 ? (faixasEtarias['41-65'] / totalComIdade) * 100 : 0,
                '65+': totalComIdade > 0 ? (faixasEtarias['65+'] / totalComIdade) * 100 : 0
              };

              // Calcular distribuição por gênero
              const pacientesComGenero = pacientesFiltrados.filter(p => {
                const genero = p.dadosIdentificacao?.sexoBiologico;
                return genero === 'M' || genero === 'F';
              });

              const homens = pacientesComGenero.filter(p => p.dadosIdentificacao?.sexoBiologico === 'M').length;
              const mulheres = pacientesComGenero.filter(p => p.dadosIdentificacao?.sexoBiologico === 'F').length;
              const totalGenero = homens + mulheres;

              const dadosGenero = [
                { name: 'Masculino', value: homens, porcentagem: totalGenero > 0 ? (homens / totalGenero) * 100 : 0 },
                { name: 'Feminino', value: mulheres, porcentagem: totalGenero > 0 ? (mulheres / totalGenero) * 100 : 0 }
              ];

              const coresGenero = ['#4CCB7A', '#2F8FA3'];

              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Demografia dos Pacientes</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Idade Média e Faixas Etárias */}
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-[#E8EDED]/90">Idade Média</h4>
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <p className="text-3xl font-bold text-[#E8EDED]">
                          {idadeMedia > 0 ? idadeMedia.toFixed(1) : '-'} <span className="text-lg text-[#E8EDED]/70">anos</span>
                        </p>
                        <p className="text-xs text-[#E8EDED]/60 mt-1">
                          {totalComIdade} paciente{totalComIdade !== 1 ? 's' : ''} com data de nascimento
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Distribuição por Faixas Etárias</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#E8EDED]/70">18 - 24 anos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-white/20 rounded-full h-2">
                                <div 
                                  className="bg-[#4CCB7A] h-2 rounded-full transition-all"
                                  style={{ width: `${porcentagensFaixas['18-24']}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-[#E8EDED] w-12 text-right">
                                {porcentagensFaixas['18-24'].toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#E8EDED]/70">25 - 40 anos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-white/20 rounded-full h-2">
                                <div 
                                  className="bg-[#2F8FA3] h-2 rounded-full transition-all"
                                  style={{ width: `${porcentagensFaixas['25-40']}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-[#E8EDED] w-12 text-right">
                                {porcentagensFaixas['25-40'].toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#E8EDED]/70">41 - 65 anos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-white/20 rounded-full h-2">
                                <div 
                                  className="bg-[#4CCB7A]/80 h-2 rounded-full transition-all"
                                  style={{ width: `${porcentagensFaixas['41-65']}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-[#E8EDED] w-12 text-right">
                                {porcentagensFaixas['41-65'].toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#E8EDED]/70">&gt; 65 anos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-white/20 rounded-full h-2">
                                <div 
                                  className="bg-[#2F8FA3]/80 h-2 rounded-full transition-all"
                                  style={{ width: `${porcentagensFaixas['65+']}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-[#E8EDED] w-12 text-right">
                                {porcentagensFaixas['65+'].toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gráfico de Pizza - Gênero */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-4">Distribuição por Gênero</h4>
                      {totalGenero > 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="w-full max-w-xs">
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <defs>
                                  <linearGradient id="gradienteMasculinoGeral" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#4CCB7A" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#2F8FA3" stopOpacity={1} />
                                  </linearGradient>
                                  <linearGradient id="gradienteFemininoGeral" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#2F8FA3" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#0A1F44" stopOpacity={1} />
                                  </linearGradient>
                                </defs>
                                <Pie
                                  data={dadosGenero}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={false}
                                  outerRadius={70}
                                  fill="#4CCB7A"
                                  dataKey="value"
                                >
                                  {dadosGenero.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={index === 0 ? 'url(#gradienteMasculinoGeral)' : 'url(#gradienteFemininoGeral)'} 
                                    />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: any, name: string, props: any) => {
                                    return [`${value} paciente${value !== 1 ? 's' : ''} (${props.payload.porcentagem.toFixed(1)}%)`, name];
                                  }}
                                  contentStyle={{ backgroundColor: '#0A1F44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                  labelStyle={{ color: '#E8EDED' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-4 flex gap-4">
                            {dadosGenero.map((item, index) => (
                              <div key={item.name} className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: coresGenero[index] }}
                                />
                                <span className="text-sm text-[#E8EDED]/90">
                                  {item.name}: <span className="font-semibold">{item.value}</span> ({item.porcentagem.toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-[#E8EDED]/50">
                          <p className="text-sm">Nenhum dado de gênero disponível</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Demografia Geográfica */}
            {(() => {
              // Filtrar pacientes baseado no filtro de médico
              const pacientesFiltrados = filtroMedicoEstatisticas === 'total' 
                ? pacientes 
                : pacientes.filter(p => p.medicoResponsavelId === filtroMedicoEstatisticas);

              // Função para normalizar cidade e estado
              const normalizarCidadeEstado = (cidade: string, estado: string): string => {
                const cidadeNormalizada = cidade
                  .trim()
                  .replace(/\s+/g, ' ')
                  .split(' ')
                  .map(palavra => {
                    if (palavra.length === 0) return '';
                    return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
                  })
                  .join(' ')
                  .trim();

                const estadoNormalizado = estado.trim().toUpperCase().replace(/\s+/g, '');

                return `${cidadeNormalizada}, ${estadoNormalizado}`;
              };

              const pacientesComCidade = pacientesFiltrados.filter(p => {
                const cidade = p.dadosIdentificacao?.endereco?.cidade;
                const estado = p.dadosIdentificacao?.endereco?.estado;
                return cidade && cidade.trim() !== '' && estado && estado.trim() !== '';
              });

              const cidadesCount: Record<string, number> = {};
              pacientesComCidade.forEach(p => {
                const cidade = p.dadosIdentificacao?.endereco?.cidade || '';
                const estado = p.dadosIdentificacao?.endereco?.estado || '';
                const chaveNormalizada = normalizarCidadeEstado(cidade, estado);
                cidadesCount[chaveNormalizada] = (cidadesCount[chaveNormalizada] || 0) + 1;
              });

              const cidadesOrdenadas = Object.entries(cidadesCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

              const totalComCidade = pacientesComCidade.length;
              const totalOutras = totalComCidade - cidadesOrdenadas.reduce((sum, [, count]) => sum + count, 0);

              const dadosCidades = cidadesOrdenadas.map(([cidadeEstado, count]) => ({
                cidadeEstado,
                quantidade: count,
                porcentagem: totalComCidade > 0 ? (count / totalComCidade) * 100 : 0
              }));

              if (totalOutras > 0) {
                dadosCidades.push({
                  cidadeEstado: 'Outras',
                  quantidade: totalOutras,
                  porcentagem: totalComCidade > 0 ? (totalOutras / totalComCidade) * 100 : 0
                });
              }

              const coresCidades = ['#4CCB7A', '#2F8FA3', '#4CCB7A', '#2F8FA3', '#4CCB7A', '#2F8FA3'];

              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Demografia Geográfica</h3>
                  {totalComCidade > 0 ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Top Cidades</h4>
                      <div className="space-y-3">
                        {dadosCidades.map((item, index) => (
                          <div key={item.cidadeEstado} className="flex items-center justify-between">
                            <span className="text-sm text-[#E8EDED]/70 flex-shrink-0 w-40 truncate">
                              {item.cidadeEstado}
                            </span>
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-full max-w-xs bg-white/20 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full transition-all"
                                  style={{ 
                                    width: `${item.porcentagem}%`,
                                    backgroundColor: coresCidades[index % 2]
                                  }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-[#E8EDED] w-16 text-right">
                                {item.porcentagem.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#E8EDED]/60 mt-3">
                        {totalComCidade} paciente{totalComCidade !== 1 ? 's' : ''} com cidade cadastrada
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#E8EDED]/50">
                      <p className="text-sm">Nenhum dado de cidade disponível</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Estatística de Perda de Peso */}
            {(() => {
              // Filtrar pacientes baseado no filtro de médico
              const pacientesFiltrados = filtroMedicoEstatisticas === 'total' 
                ? pacientes 
                : pacientes.filter(p => p.medicoResponsavelId === filtroMedicoEstatisticas);

              // Função para calcular idade
              const calcularIdade = (dataNasc: any): number | null => {
                if (!dataNasc) return null;
                let dataNascimento: Date;
                if (dataNasc instanceof Date) {
                  dataNascimento = dataNasc;
                } else if (dataNasc?.toDate) {
                  dataNascimento = dataNasc.toDate();
                } else {
                  dataNascimento = new Date(dataNasc);
                }
                if (isNaN(dataNascimento.getTime())) return null;
                
                const hoje = new Date();
                let idade = hoje.getFullYear() - dataNascimento.getFullYear();
                const mesAtual = hoje.getMonth();
                const diaAtual = hoje.getDate();
                const mesNasc = dataNascimento.getMonth();
                const diaNasc = dataNascimento.getDate();
                
                if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) {
                  idade--;
                }
                return idade > 0 ? idade : null;
              };

              // Função para obter faixa etária
              const obterFaixaEtaria = (idade: number | null): string => {
                if (!idade) return 'desconhecida';
                if (idade >= 18 && idade <= 24) return '18-24';
                if (idade >= 25 && idade <= 40) return '25-40';
                if (idade >= 41 && idade <= 65) return '41-65';
                if (idade > 65) return '65+';
                return 'desconhecida';
              };

              // Calcular perda de peso para cada paciente por semana individual
              const perdasPesoPorSemana: Record<number, number[]> = {};

              pacientesFiltrados.forEach(paciente => {
                // Filtrar por sexo
                const sexo = paciente.dadosIdentificacao?.sexoBiologico;
                if (filtroSexoPerdaPeso !== 'todos' && sexo !== filtroSexoPerdaPeso) return;

                // Filtrar por faixa etária
                const idade = calcularIdade(paciente.dadosIdentificacao?.dataNascimento);
                const faixaEtaria = obterFaixaEtaria(idade);
                if (filtroFaixaEtariaPerdaPeso !== 'todas' && faixaEtaria !== filtroFaixaEtariaPerdaPeso) return;

                const evolucao = paciente.evolucaoSeguimento || [];
                if (evolucao.length < 2) return; // Precisa de pelo menos 2 registros

                // Ordenar evolução por weekIndex ou dataRegistro
                const evolucaoOrdenada = [...evolucao].sort((a, b) => {
                  const semanaA = a.weekIndex || a.numeroSemana || 0;
                  const semanaB = b.weekIndex || b.numeroSemana || 0;
                  if (semanaA !== semanaB) return semanaA - semanaB;
                  
                  const dataA = a.dataRegistro instanceof Date 
                    ? a.dataRegistro 
                    : a.dataRegistro?.toDate 
                    ? a.dataRegistro.toDate() 
                    : new Date(a.dataRegistro || 0);
                  const dataB = b.dataRegistro instanceof Date 
                    ? b.dataRegistro 
                    : b.dataRegistro?.toDate 
                    ? b.dataRegistro.toDate() 
                    : new Date(b.dataRegistro || 0);
                  return dataA.getTime() - dataB.getTime();
                });

                // Encontrar o registro da semana 1 (baseline)
                const registroSemana1 = evolucaoOrdenada.find(r => {
                  const semana = r.weekIndex || r.numeroSemana || 0;
                  return semana === 1 && r.peso;
                });

                if (!registroSemana1?.peso) return; // Precisa ter registro da semana 1

                const pesoBaseline = registroSemana1.peso;

                // Calcular perda de peso acumulada para cada semana desde a semana 1
                evolucaoOrdenada.forEach(registro => {
                  const semana = registro.weekIndex || registro.numeroSemana || 0;
                  if (semana <= 1 || !registro.peso) return; // Ignorar semana 1 e registros sem peso

                  // Calcular dose média até esta semana (incluindo a semana atual)
                  const registrosAteSemana = evolucaoOrdenada.filter(r => {
                    const sem = r.weekIndex || r.numeroSemana || 0;
                    return sem >= 1 && sem <= semana && r.doseAplicada?.quantidade;
                  });

                  let doseMedia = 0;
                  if (registrosAteSemana.length > 0) {
                    const somaDoses = registrosAteSemana.reduce((sum, r) => sum + (r.doseAplicada?.quantidade || 0), 0);
                    doseMedia = somaDoses / registrosAteSemana.length;
                  }

                  // Filtrar por dose média
                  if (filtroDosePerdaPeso !== 'todas') {
                    const doseFiltro = parseFloat(filtroDosePerdaPeso);
                    // Verificar se a dose média está próxima da dose do filtro (tolerância de 0.5mg)
                    if (Math.abs(doseMedia - doseFiltro) > 0.5) return;
                  }

                  // Calcular perda de peso acumulada desde a semana 1 (peso baseline - peso atual)
                  const perdaPeso = pesoBaseline - registro.peso;

                  // Inicializar array se não existir
                  if (!perdasPesoPorSemana[semana]) {
                    perdasPesoPorSemana[semana] = [];
                  }

                  perdasPesoPorSemana[semana].push(perdaPeso);
                });
              });

              // Calcular médias por semana e ordenar
              const mediasPorSemana = Object.entries(perdasPesoPorSemana)
                .map(([semana, perdas]) => ({
                  semana: parseInt(semana),
                  media: perdas.length > 0 ? perdas.reduce((sum, p) => sum + p, 0) / perdas.length : 0,
                  quantidade: perdas.length
                }))
                .filter(item => item.quantidade > 0) // Filtrar apenas semanas com dados
                .sort((a, b) => a.semana - b.semana); // Ordenar por semana

              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Estatística de Perda de Peso</h3>
                  
                  {/* Layout lado a lado para desktop */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Coluna Esquerda: Filtros e Média */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Filtros */}
                      <div className="space-y-3">
                    {/* Filtro de Dose */}
                    <div>
                      <label className="block text-xs font-medium text-[#E8EDED]/90 mb-1.5">Dose Média</label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFiltroDosePerdaPeso('todas')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroDosePerdaPeso === 'todas'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          Todas
                        </button>
                        {['2.5', '5.0', '7.5', '10', '12.5', '15'].map((dose) => (
                          <button
                            key={dose}
                            onClick={() => setFiltroDosePerdaPeso(dose)}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                              filtroDosePerdaPeso === dose
                                ? 'bg-[#4CCB7A] text-[#0A1F44]'
                                : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                            }`}
                          >
                            {dose} mg
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filtro de Faixa Etária */}
                    <div>
                      <label className="block text-xs font-medium text-[#E8EDED]/90 mb-1.5">Faixa Etária</label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFiltroFaixaEtariaPerdaPeso('todas')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroFaixaEtariaPerdaPeso === 'todas'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          Todas
                        </button>
                        <button
                          onClick={() => setFiltroFaixaEtariaPerdaPeso('18-24')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroFaixaEtariaPerdaPeso === '18-24'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          18 - 24 anos
                        </button>
                        <button
                          onClick={() => setFiltroFaixaEtariaPerdaPeso('25-40')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroFaixaEtariaPerdaPeso === '25-40'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          25 - 40 anos
                        </button>
                        <button
                          onClick={() => setFiltroFaixaEtariaPerdaPeso('41-65')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroFaixaEtariaPerdaPeso === '41-65'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          41 - 65 anos
                        </button>
                        <button
                          onClick={() => setFiltroFaixaEtariaPerdaPeso('65+')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroFaixaEtariaPerdaPeso === '65+'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          &gt; 65 anos
                        </button>
                      </div>
                    </div>

                    {/* Filtro de Sexo */}
                    <div>
                      <label className="block text-xs font-medium text-[#E8EDED]/90 mb-1.5">Sexo</label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFiltroSexoPerdaPeso('todos')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroSexoPerdaPeso === 'todos'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setFiltroSexoPerdaPeso('M')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroSexoPerdaPeso === 'M'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          Masculino
                        </button>
                        <button
                          onClick={() => setFiltroSexoPerdaPeso('F')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroSexoPerdaPeso === 'F'
                              ? 'bg-[#4CCB7A] text-[#0A1F44]'
                              : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                          }`}
                        >
                          Feminino
                        </button>
                      </div>
                    </div>
                      </div>

                      {/* Card com Média de Perda de Peso - Desktop abaixo dos filtros */}
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 lg:block hidden">
                        <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Média de Perda de Peso por Semana</h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {mediasPorSemana.map((item) => (
                            <div key={item.semana} className="flex items-center justify-between">
                              <span className="text-sm text-[#E8EDED]/70 font-medium w-20">
                                Sem {item.semana}
                              </span>
                          <div className="flex items-center gap-3 flex-1">
                            {item.quantidade > 0 ? (
                              <>
                                <div className="w-full max-w-xs bg-white/20 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all ${
                                      item.media > 0 ? 'bg-[#4CCB7A]' : item.media < 0 ? 'bg-[#2F8FA3]' : 'bg-white/40'
                                    }`}
                                    style={{ 
                                      width: `${Math.min(Math.abs(item.media) * 5, 100)}%`
                                    }}
                                  />
                                </div>
                                <div className="text-sm text-[#E8EDED]/90 min-w-[120px] text-right">
                                  {(() => {
                                    // Inverter o sinal para exibição: perda positiva mostra como negativa, ganho negativo mostra como positivo
                                    const valorExibicao = -item.media;
                                    return (
                                      <span className={`font-semibold ${item.media > 0 ? 'text-[#4CCB7A]' : item.media < 0 ? 'text-red-400' : 'text-[#E8EDED]/70'}`}>
                                        {valorExibicao > 0 ? '+' : ''}{valorExibicao.toFixed(2)} kg
                                      </span>
                                    );
                                  })()}
                                  <span className="text-[#E8EDED]/50 ml-2 text-xs">
                                    (n={item.quantidade})
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex-1 text-center">
                                <span className="text-sm text-[#E8EDED]/50">Sem dados disponíveis</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                          {mediasPorSemana.length === 0 && (
                            <div className="text-center py-4 text-[#E8EDED]/50">
                              <p className="text-sm">Nenhum dado disponível com os filtros selecionados</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coluna Direita: Gráfico */}
                    <div className="lg:col-span-3">
                      {/* Preparar dados para o gráfico */}
                      {(() => {
                        const dadosGrafico = mediasPorSemana.map(item => ({
                          semana: item.semana,
                          perda: -item.media, // Inverter sinal para exibição
                          quantidade: item.quantidade
                        }));

                        // Calcular o valor máximo e mínimo para inverter o eixo Y
                        const valoresPerda = dadosGrafico.map(d => d.perda);
                        const maxPerda = Math.max(...valoresPerda, 0);
                        const minPerda = Math.min(...valoresPerda, 0);
                        const margem = Math.max(Math.abs(maxPerda), Math.abs(minPerda)) * 0.1; // 10% de margem

                        return (
                          <div className="space-y-4">
                            {/* Card com Média de Perda de Peso - Mobile */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10 lg:hidden">
                              <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Média de Perda de Peso por Semana</h4>
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {mediasPorSemana.map((item) => (
                                  <div key={item.semana} className="flex items-center justify-between">
                                    <span className="text-sm text-[#E8EDED]/70 font-medium w-20">
                                      Sem {item.semana}
                                    </span>
                                    <div className="flex items-center gap-3 flex-1">
                                      {item.quantidade > 0 ? (
                                        <>
                                          <div className="w-full max-w-xs bg-white/20 rounded-full h-2">
                                            <div 
                                              className={`h-2 rounded-full transition-all ${
                                                item.media > 0 ? 'bg-[#4CCB7A]' : item.media < 0 ? 'bg-[#2F8FA3]' : 'bg-white/40'
                                              }`}
                                              style={{ 
                                                width: `${Math.min(Math.abs(item.media) * 5, 100)}%`
                                              }}
                                            />
                                          </div>
                                          <div className="text-sm text-[#E8EDED]/90 min-w-[120px] text-right">
                                            {(() => {
                                              // Inverter o sinal para exibição: perda positiva mostra como negativa, ganho negativo mostra como positivo
                                              const valorExibicao = -item.media;
                                              return (
                                                <span className={`font-semibold ${item.media > 0 ? 'text-[#4CCB7A]' : item.media < 0 ? 'text-red-400' : 'text-[#E8EDED]/70'}`}>
                                                  {valorExibicao > 0 ? '+' : ''}{valorExibicao.toFixed(2)} kg
                                                </span>
                                              );
                                            })()}
                                            <span className="text-[#E8EDED]/50 ml-2 text-xs">
                                              (n={item.quantidade})
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex-1 text-center">
                                          <span className="text-sm text-[#E8EDED]/50">Sem dados disponíveis</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {mediasPorSemana.length === 0 && (
                                  <div className="text-center py-4 text-[#E8EDED]/50">
                                    <p className="text-sm">Nenhum dado disponível com os filtros selecionados</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Gráfico de Linha */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                              <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Evolução da Perda de Peso</h4>
                              {dadosGrafico.length > 0 ? (
                                <>
                                  {/* Versão Desktop */}
                                  <div className="hidden lg:block">
                                    <ResponsiveContainer width="100%" height={500}>
                                      <LineChart data={dadosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,237,237,0.2)" />
                                        <XAxis 
                                          dataKey="semana" 
                                          label={{ value: 'Semana', position: 'insideBottom', offset: -5, fill: '#E8EDED' }}
                                          tick={{ fontSize: 12, fill: '#E8EDED' }}
                                          stroke="#E8EDED"
                                        />
                                        <YAxis 
                                          domain={[minPerda - margem, maxPerda + margem]}
                                          reversed={true}
                                          label={{ value: 'Perda de Peso (kg)', angle: -90, position: 'insideLeft', fill: '#E8EDED' }}
                                          tick={{ fontSize: 12, fill: '#E8EDED' }}
                                          stroke="#E8EDED"
                                          tickFormatter={(value) => value.toFixed(1)}
                                        />
                                        <Tooltip 
                                          formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(2)} kg`, 'Perda de Peso']}
                                          labelFormatter={(label) => `Semana ${label}`}
                                          contentStyle={{ backgroundColor: '#0A1F44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                          labelStyle={{ color: '#E8EDED' }}
                                        />
                                        <Legend wrapperStyle={{ color: '#E8EDED' }} />
                                        <Line 
                                          type="monotone" 
                                          dataKey="perda" 
                                          stroke="#4CCB7A" 
                                          strokeWidth={2}
                                          dot={{ r: 4 }}
                                          activeDot={{ r: 6 }}
                                          name="Perda de Peso (kg)"
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                  {/* Versão Mobile */}
                                  <div className="lg:hidden">
                                    <ResponsiveContainer width="100%" height={300}>
                                      <LineChart data={dadosGrafico} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,237,237,0.2)" />
                                        <XAxis 
                                          dataKey="semana" 
                                          label={{ value: 'Semana', position: 'insideBottom', offset: -5, fill: '#E8EDED' }}
                                          tick={{ fontSize: 11, fill: '#E8EDED' }}
                                          stroke="#E8EDED"
                                        />
                                        <YAxis 
                                          domain={[minPerda - margem, maxPerda + margem]}
                                          reversed={true}
                                          tick={{ fontSize: 10, fill: '#E8EDED' }}
                                          stroke="#E8EDED"
                                          tickFormatter={(value) => value.toFixed(1)}
                                          width={40}
                                        />
                                        <Tooltip 
                                          formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(2)} kg`, 'Perda de Peso']}
                                          labelFormatter={(label) => `Semana ${label}`}
                                          contentStyle={{ backgroundColor: '#0A1F44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                          labelStyle={{ color: '#E8EDED' }}
                                        />
                                        <Legend wrapperStyle={{ color: '#E8EDED' }} />
                                        <Line 
                                          type="monotone" 
                                          dataKey="perda" 
                                          stroke="#4CCB7A" 
                                          strokeWidth={2}
                                          dot={{ r: 3 }}
                                          activeDot={{ r: 5 }}
                                          name="Perda de Peso (kg)"
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="hidden lg:flex items-center justify-center h-[500px] text-[#E8EDED]/50">
                                    <p className="text-sm">Nenhum dado disponível para o gráfico</p>
                                  </div>
                                  <div className="lg:hidden flex items-center justify-center h-[300px] text-[#E8EDED]/50">
                                    <p className="text-sm">Nenhum dado disponível para o gráfico</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Controle de Faturamento dos Médicos */}
            {(() => {
              // Calcular faturamento de vendas por médico (pagamentos dos pacientes)
              const faturamentoPorMedico: Record<string, {
                medico: Medico;
                totalPacientes: number;
                valorTotal: number;
                valorPago: number;
                valorPendente: number;
                vendasAvulsas: number;
                valorVendasAvulsas: number;
              }> = {};

              // Inicializar todos os médicos
              medicos.forEach(medico => {
                faturamentoPorMedico[medico.id] = {
                  medico,
                  totalPacientes: 0,
                  valorTotal: 0,
                  valorPago: 0,
                  valorPendente: 0,
                  vendasAvulsas: 0,
                  valorVendasAvulsas: 0
                };
              });

              // Processar pagamentos dos pacientes
              pacientes.forEach(paciente => {
                const medicoId = paciente.medicoResponsavelId;
                if (!medicoId || !faturamentoPorMedico[medicoId]) return;

                const pagamento = pagamentosPacientes[paciente.id];
                if (pagamento) {
                  faturamentoPorMedico[medicoId].totalPacientes++;
                  faturamentoPorMedico[medicoId].valorTotal += pagamento.valorTotal || 0;
                  faturamentoPorMedico[medicoId].valorPago += pagamento.valorPago || 0;
                  faturamentoPorMedico[medicoId].valorPendente += pagamento.valorPendente || 0;
                }
              });

              // Processar vendas avulsas
              vendasAvulsas.forEach(venda => {
                const medicoId = venda.medicoId;
                if (!medicoId || !faturamentoPorMedico[medicoId]) return;

                faturamentoPorMedico[medicoId].vendasAvulsas++;
                faturamentoPorMedico[medicoId].valorVendasAvulsas += venda.valorTotal || 0;
                faturamentoPorMedico[medicoId].valorTotal += venda.valorTotal || 0;
                faturamentoPorMedico[medicoId].valorPago += venda.valorPago || 0;
                faturamentoPorMedico[medicoId].valorPendente += venda.valorPendente || 0;
              });

              // Filtrar apenas médicos com faturamento
              const faturamentoFiltrado = Object.values(faturamentoPorMedico)
                .filter(item => 
                  item.valorTotal > 0 || item.totalPacientes > 0 || item.vendasAvulsas > 0
                )
                .sort((a, b) => b.valorTotal - a.valorTotal);

              const totalFaturamentoGeral = faturamentoFiltrado.reduce((sum, item) => sum + item.valorTotal, 0);
              const totalFaturamentoPendenteGeral = faturamentoFiltrado.reduce((sum, item) => sum + item.valorPendente, 0);
              const totalFaturamentoPagoGeral = faturamentoFiltrado.reduce((sum, item) => sum + item.valorPago, 0);

              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                  <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Controle de Faturamento dos Médicos</h3>
                  
                  {/* Resumo Geral */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4 border border-[#2F8FA3]/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#E8EDED]/80">Total Faturado</p>
                          <p className="text-2xl font-bold text-[#E8EDED]">
                            R$ {totalFaturamentoGeral.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-amber-400/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#E8EDED]/80">Pendente de Pagamento</p>
                          <p className="text-2xl font-bold text-[#E8EDED]">
                            R$ {totalFaturamentoPendenteGeral.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-[#4CCB7A]/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#E8EDED]/80">Total Pago</p>
                          <p className="text-2xl font-bold text-[#E8EDED]">
                            R$ {totalFaturamentoPagoGeral.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Faturamento */}
                  {loadingPagamentos ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-[#E8EDED]/70">Carregando faturamento...</p>
                    </div>
                  ) : faturamentoFiltrado.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                              Médico
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                              Pacientes
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                              Vendas Avulsas
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                              Valor Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                              Valor Pago
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                              Valor Pendente
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {faturamentoFiltrado.map((item) => (
                            <tr key={item.medico.id} className="hover:bg-white/10">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-[#E8EDED]">
                                  {item.medico.nome}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.medico.email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#E8EDED]">
                                {item.totalPacientes}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#E8EDED]">
                                {item.vendasAvulsas}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#E8EDED]">
                                R$ {item.valorTotal.toFixed(2).replace('.', ',')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                                R$ {item.valorPago.toFixed(2).replace('.', ',')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-700">
                                R$ {item.valorPendente.toFixed(2).replace('.', ',')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">Nenhum médico com faturamento registrado</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      }

      case 'troca': {

        if (loadingTrocas) {
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Aprovar Trocas</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando trocas...</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Gerenciar Trocas</h2>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {trocasPendentes.filter(t => t.status === 'aceita').length} pendente{trocasPendentes.filter(t => t.status === 'aceita').length !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {trocasPendentes.filter(t => t.status === 'aprovada').length} aprovada{trocasPendentes.filter(t => t.status === 'aprovada').length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {trocasPendentes.length > 0 ? (
              <div className="space-y-4">
                {trocasPendentes.map((troca) => {
                  const solicitante = residentes.find(r => r.email === troca.solicitanteEmail);
                  const solicitado = residentes.find(r => r.email === troca.solicitadoEmail);
                  const servico = servicos.find(s => s.id === troca.servicoId);
                  const local = locais.find(l => l.id === troca.localId);
                  
                  return (
                  <div key={troca.id} className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-[#E8EDED]">
                                Solicitação de Troca #{troca.id}
                              </h3>
                              <p className="text-sm text-[#E8EDED]/70">
                                Solicitado em {troca.createdAt.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <h4 className="text-sm font-medium text-[#E8EDED]/90 mb-3">Detalhes da Troca</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-[#E8EDED]/70">Solicitante:</span>
                                  <span className="text-sm font-medium text-[#E8EDED]">{solicitante?.nome || troca.solicitanteEmail}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-[#E8EDED]/70">Solicitado:</span>
                                  <span className="text-sm font-medium text-[#E8EDED]">{solicitado?.nome || troca.solicitadoEmail}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-[#E8EDED]/70">Serviço:</span>
                                  <span className="text-sm font-medium text-[#E8EDED]">{servico?.nome || 'Serviço não encontrado'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-[#E8EDED]/70">Local:</span>
                                  <span className="text-sm font-medium text-[#E8EDED]">{local?.nome || 'Local não encontrado'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-[#E8EDED]/70">Dia:</span>
                                  <span className="text-sm font-medium text-[#E8EDED]">{troca.dia}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-[#E8EDED]/70">Turno:</span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    troca.turno === 'manha' 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {troca.turno === 'manha' ? 'Manhã' : 'Tarde'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium text-[#E8EDED]/90 mb-3">Motivo</h4>
                              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <p className="text-sm text-[#E8EDED]">{troca.motivo || 'Motivo não informado'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-6">
                          {troca.status === 'aceita' ? (
                            <>
                              <button
                                onClick={() => handleAprovarTroca(troca.id)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                              >
                                Aprovar Troca
                              </button>
                              <button
                                onClick={() => handleRejeitarTroca(troca.id)}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                              >
                                Rejeitar
                              </button>
                            </>
                          ) : troca.status === 'aprovada' ? (
                            <>
                              <div className="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-md text-center">
                                ✅ Aprovada
                              </div>
                              {troca.dataAprovacao && (
                                <div className="text-xs text-gray-500 text-center">
                                  Aprovada em: {troca.dataAprovacao.toLocaleDateString('pt-BR')} às {troca.dataAprovacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              {troca.dataAprovacao && (() => {
                                const agora = new Date();
                                const diferencaHoras = (agora.getTime() - troca.dataAprovacao.getTime()) / (1000 * 60 * 60);
                                return diferencaHoras <= 24 ? (
                                  <button
                                    onClick={() => handleReverterTroca(troca.id)}
                                    className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                                  >
                                    Reverter Troca
                                  </button>
                                ) : (
                                  <div className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-md text-center">
                                    Prazo de reversão expirado
                                  </div>
                                );
                              })()}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8EDED] mb-2">Nenhuma Troca Disponível</h3>
                  <p className="text-gray-500">
                    Não há solicitações de troca aguardando aprovação ou aprovadas no momento.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'ferias': {
        if (loadingFerias) {
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Gerenciar Férias</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando férias...</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Gerenciar Férias</h2>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {feriasPendentes.length} pendente{feriasPendentes.length !== 1 ? 's' : ''}
                </span>
                <RefreshCw 
                  className="h-5 w-5 text-gray-500 cursor-pointer hover:text-[#E8EDED] transition-colors" 
                  onClick={() => loadFeriasAdmin()}
                />
              </div>
            </div>

            {feriasPendentes.length > 0 ? (
              <div className="space-y-4">
                {feriasPendentes.map((ferias) => {
                  const residente = residentes.find(r => r.email === ferias.residenteEmail);
                  
                  return (
                    <div key={ferias.id} className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors">
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                  <Calendar className="h-5 w-5 text-orange-600" />
                                </div>
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-[#E8EDED]">
                                  Solicitação de Férias #{ferias.id}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Solicitado em {ferias.createdAt.toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Detalhes da Férias</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Residente:</span>
                                    <span className="text-sm font-medium text-[#E8EDED]">{residente?.nome || ferias.residenteEmail}</span>
                                  </div>
                                  {residente?.nivel && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-500">Nível:</span>
                                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        residente.nivel === 'R1' ? 'bg-blue-100 text-blue-800' :
                                        residente.nivel === 'R2' ? 'bg-green-100 text-green-800' :
                                        'bg-purple-100 text-purple-800'
                                      }`}>
                                        {residente.nivel}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Data de Início:</span>
                                    <span className="text-sm font-medium text-[#E8EDED]">{ferias.dataInicio.toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Data de Fim:</span>
                                    <span className="text-sm font-medium text-[#E8EDED]">{ferias.dataFim.toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Duração:</span>
                                    <span className={`text-sm font-medium ${
                                      Math.ceil((ferias.dataFim.getTime() - ferias.dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1 > 30 
                                        ? 'text-amber-600' 
                                        : 'text-[#E8EDED]'
                                    }`}>
                                      {Math.ceil((ferias.dataFim.getTime() - ferias.dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
                                      {Math.ceil((ferias.dataFim.getTime() - ferias.dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1 > 30 && (
                                        <span className="text-xs ml-1">(Período longo)</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Motivo</h4>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-sm text-[#E8EDED]/90">{ferias.motivo || 'Motivo não informado'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col space-y-2 ml-6">
                            <button
                              onClick={() => {
                                const observacoes = prompt('Observações (opcional):');
                                handleAprovarFerias(ferias.id, observacoes || undefined);
                              }}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                            >
                              Aprovar Férias
                            </button>
                            <button
                              onClick={() => {
                                const observacoes = prompt('Motivo da rejeição (opcional):');
                                handleRejeitarFerias(ferias.id, observacoes || undefined);
                              }}
                              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#E8EDED] mb-2">Nenhuma Solicitação de Férias Pendente</h3>
                  <p className="text-gray-500">
                    Não há solicitações de férias aguardando aprovação no momento.
                  </p>
                </div>
              </div>
            )}

            {/* Calendário de Férias - Estilo Gantt */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
              <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Calendário de Férias Aprovadas</h3>
              <FeriasCalendar ferias={ferias.filter(f => f.status === 'aprovada')} residentes={residentes} />
            </div>

            {/* Histórico de Férias */}
            {ferias.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Histórico de Férias</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Residente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Aprovado/Rejeitado por
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">
                          Data Solicitação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {ferias.map((ferias) => {
                        const residente = residentes.find(r => r.email === ferias.residenteEmail);
                        return (
                          <tr key={ferias.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#E8EDED]">
                              {residente?.nome || ferias.residenteEmail}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {ferias.dataInicio.toLocaleDateString('pt-BR')} - {ferias.dataFim.toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                ferias.status === 'aprovada' 
                                  ? 'bg-green-100 text-green-800' 
                                  : ferias.status === 'rejeitada'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {ferias.status === 'aprovada' ? 'Aprovada' : 
                                 ferias.status === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {ferias.aprovadoPor || ferias.rejeitadoPor || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {ferias.createdAt.toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'ferias': {
        if (loadingFerias) {
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Gerenciar Férias</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando férias...</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Gerenciar Férias</h2>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {feriasPendentes.length} pendente{feriasPendentes.length !== 1 ? 's' : ''}
                </span>
                <RefreshCw 
                  className="h-5 w-5 text-gray-500 cursor-pointer hover:text-[#E8EDED] transition-colors" 
                  onClick={() => loadFeriasAdmin()}
                />
              </div>
            </div>

            {feriasPendentes.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-[#E8EDED]">Nenhuma Solicitação Pendente</h3>
                <p className="mt-1 text-sm text-gray-500">Todas as solicitações de férias foram processadas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feriasPendentes.map((ferias) => (
                  <div key={ferias.id} className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-orange-600" />
                              </div>
                            </div>
                            <div>
                              <h4 className="text-lg font-medium text-[#E8EDED]">
                                Solicitação de Férias
                              </h4>
                              <p className="text-sm text-gray-500">
                                {ferias.residenteEmail} • {ferias.createdAt.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-3">Detalhes</h5>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Período:</span>
                                  <span className="text-sm font-medium text-[#E8EDED]">
                                    {ferias.dataInicio.toLocaleDateString('pt-BR')} a {ferias.dataFim.toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Duração:</span>
                                  <span className="text-sm font-medium text-[#E8EDED]">
                                    {Math.ceil((ferias.dataFim.getTime() - ferias.dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
                                  </span>
                                </div>
                                {ferias.motivo && (
                                  <div>
                                    <span className="text-sm text-gray-500">Motivo:</span>
                                    <p className="text-sm font-medium text-[#E8EDED] mt-1">{ferias.motivo}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleAprovarFerias(ferias.id)}
                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                              >
                                Aprovar Férias
                              </button>
                              <button
                                onClick={() => handleRejeitarFerias(ferias.id)}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                              >
                                Rejeitar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }


      case 'mensagens': {
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Mensagens</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => MensagemService.testarMensagens()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <RefreshCw size={20} className="mr-2" />
                  Testar
                </button>
                <button
                  onClick={() => setShowEnviarMensagem(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
                >
                  <Plus size={20} className="mr-2" />
                  Nova Mensagem
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Abas */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTabMensagens('enviadas')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTabMensagens === 'enviadas'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-[#E8EDED]'
                  }`}
                >
                  Enviadas
                </button>
                <button
                  onClick={() => setActiveTabMensagens('recebidas')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTabMensagens === 'recebidas'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-[#E8EDED]'
                  }`}
                >
                  Recebidas
                  {mensagensNaoLidasResidentes > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {mensagensNaoLidasResidentes}
                    </span>
                  )}
                </button>
              </div>

              {/* Conteúdo das abas */}
              {activeTabMensagens === 'enviadas' ? (
                loadingMensagens ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CCB7A]"></div>
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-[#E8EDED] mb-2">Nenhuma mensagem enviada</h4>
                    <p className="text-gray-500">Suas mensagens enviadas para os residentes aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mensagens.map((mensagem) => (
                      <div 
                        key={mensagem.id} 
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer transition-colors hover:border-white/20"
                        onClick={() => handleVisualizarMensagemEnviada(mensagem)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-[#E8EDED]">{mensagem.titulo}</h3>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-gray-500">
                              {mensagem.criadoEm.toLocaleDateString('pt-BR')} às {mensagem.criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletarMensagem(mensagem.id);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Deletar mensagem"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[#E8EDED]/90 mb-3 line-clamp-2">{mensagem.mensagem}</p>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>
                            Para: {mensagem.destinatarios === 'todos' ? 'Todos os residentes' : `${mensagem.residentesSelecionados.length} residente(s) selecionado(s)`}
                          </span>
                          {mensagem.enviadoEm && (
                            <span className="text-green-600">
                              ✓ Enviada em {mensagem.enviadoEm.toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                loadingMensagensResidentes ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : mensagensResidentes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-[#E8EDED] mb-2">Nenhuma mensagem recebida</h4>
                    <p className="text-gray-500">Mensagens dos residentes aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mensagensResidentes.map((mensagem) => (
                      <div 
                        key={mensagem.id} 
                        className={`bg-white border rounded-lg p-4 shadow-sm cursor-pointer transition-colors ${
                          mensagem.lida 
                            ? 'border-gray-200 hover:border-white/20' 
                            : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                        }`}
                        onClick={() => handleVisualizarMensagem(mensagem)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-[#E8EDED]">{mensagem.titulo}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-[#E8EDED]/70">
                                De: {mensagem.anonima ? 'Anônimo' : mensagem.residenteNome}
                              </span>
                              {mensagem.anonima && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Anônimo
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-gray-500">
                              {mensagem.criadoEm.toLocaleDateString('pt-BR')} às {mensagem.criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {!mensagem.lida && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Nova
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[#E8EDED]/90 mb-3 line-clamp-2">{mensagem.mensagem}</p>
                        {mensagem.lida && mensagem.lidaEm && (
                          <div className="text-xs text-gray-500">
                            Lida em {mensagem.lidaEm.toLocaleDateString('pt-BR')} às {mensagem.lidaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Modal para enviar nova mensagem */}
            {showEnviarMensagem && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-[#0A1F44] [&_label]:text-[#0A1F44] [&_p]:text-[#0A1F44]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Nova Mensagem</h3>
                    <button
                      onClick={() => setShowEnviarMensagem(false)}
                      className="text-gray-400 hover:text-[#E8EDED]/70"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Título *
                      </label>
                      <input
                        type="text"
                        value={novaMensagem.titulo}
                        onChange={(e) => setNovaMensagem({ ...novaMensagem, titulo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                        placeholder="Digite o título da mensagem"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Mensagem *
                      </label>
                      <textarea
                        value={novaMensagem.mensagem}
                        onChange={(e) => setNovaMensagem({ ...novaMensagem, mensagem: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                        placeholder="Digite sua mensagem"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Destinatários
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center text-black">
                          <input
                            type="radio"
                            name="destinatarios"
                            value="todos"
                            checked={novaMensagem.destinatarios === 'todos'}
                            onChange={(e) => setNovaMensagem({ ...novaMensagem, destinatarios: e.target.value as 'todos' | 'especificos' })}
                            className="mr-2"
                          />
                          Todos os residentes
                        </label>
                        <label className="flex items-center text-black">
                          <input
                            type="radio"
                            name="destinatarios"
                            value="especificos"
                            checked={novaMensagem.destinatarios === 'especificos'}
                            onChange={(e) => setNovaMensagem({ ...novaMensagem, destinatarios: e.target.value as 'todos' | 'especificos' })}
                            className="mr-2"
                          />
                          Residentes específicos
                        </label>
                      </div>
                    </div>

                    {novaMensagem.destinatarios === 'especificos' && (
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">
                          Selecionar Residentes
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                          {residentes.map((residente) => (
                            <label key={residente.email} className="flex items-center py-1 text-black">
                              <input
                                type="checkbox"
                                checked={novaMensagem.residentesSelecionados.includes(residente.email)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNovaMensagem({
                                      ...novaMensagem,
                                      residentesSelecionados: [...novaMensagem.residentesSelecionados, residente.email]
                                    });
                                  } else {
                                    setNovaMensagem({
                                      ...novaMensagem,
                                      residentesSelecionados: novaMensagem.residentesSelecionados.filter(email => email !== residente.email)
                                    });
                                  }
                                }}
                                className="mr-2"
                              />
                              {residente.nome} ({residente.email})
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={() => setShowEnviarMensagem(false)}
                        className="px-4 py-2 text-[#E8EDED]/70 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleEnviarMensagem}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading ? 'Enviando...' : 'Enviar Mensagem'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Visualização de Mensagem */}
            {showMensagemModal && mensagemSelecionada && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-[#0A1F44] [&_label]:text-[#0A1F44] [&_p]:text-[#0A1F44]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Mensagem do Residente</h3>
                    <button
                      onClick={() => setShowMensagemModal(false)}
                      className="text-gray-400 hover:text-[#E8EDED]/70"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">{mensagemSelecionada.titulo}</h4>
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-sm text-[#E8EDED]/70">
                          De: {mensagemSelecionada.anonima ? 'Anônimo' : mensagemSelecionada.residenteNome}
                        </span>
                        {mensagemSelecionada.anonima && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Anônimo
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          • {mensagemSelecionada.criadoEm.toLocaleDateString('pt-BR')} às {mensagemSelecionada.criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{mensagemSelecionada.mensagem}</p>
                    </div>

                    {mensagemSelecionada.lida && mensagemSelecionada.lidaEm && (
                      <div className="text-sm text-gray-500">
                        ✓ Lida em {mensagemSelecionada.lidaEm.toLocaleDateString('pt-BR')} às {mensagemSelecionada.lidaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={() => setShowMensagemModal(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Visualização de Mensagem Enviada */}
            {showMensagemEnviadaModal && mensagemEnviadaSelecionada && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-[#0A1F44] [&_label]:text-[#0A1F44] [&_p]:text-[#0A1F44]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Mensagem Enviada</h3>
                    <button
                      onClick={() => setShowMensagemEnviadaModal(false)}
                      className="text-gray-400 hover:text-[#E8EDED]/70"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">{mensagemEnviadaSelecionada.titulo}</h4>
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-sm text-gray-500">
                          {mensagemEnviadaSelecionada.criadoEm.toLocaleDateString('pt-BR')} às {mensagemEnviadaSelecionada.criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {mensagemEnviadaSelecionada.enviadoEm && (
                          <span className="text-sm text-green-600">
                            • Enviada em {mensagemEnviadaSelecionada.enviadoEm.toLocaleDateString('pt-BR')} às {mensagemEnviadaSelecionada.enviadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{mensagemEnviadaSelecionada.mensagem}</p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 mb-2">Destinatários:</h5>
                      {mensagemEnviadaSelecionada.destinatarios === 'todos' ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600 font-medium">Todos os residentes</span>
                          <span className="text-sm text-gray-500">({residentes.length} residentes)</span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-[#E8EDED]/70 mb-2">
                            {mensagemEnviadaSelecionada.residentesSelecionados.length} residente(s) selecionado(s):
                          </p>
                          <div className="space-y-1">
                            {mensagemEnviadaSelecionada.residentesSelecionados.map((email) => {
                              const residente = residentes.find(r => r.email === email);
                              return (
                                <div key={email} className="flex items-center space-x-2 text-sm">
                                  <span className="text-gray-700">•</span>
                                  <span className="text-gray-900">{residente?.nome || 'Residente não encontrado'}</span>
                                  <span className="text-gray-500">({email})</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={() => handleDeletarMensagem(mensagemEnviadaSelecionada.id)}
                        className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                      >
                        Deletar
                      </button>
                      <button
                        onClick={() => setShowMensagemEnviadaModal(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'emails':
        return (
          <EmailManagement leads={leads} />
        );

      case 'calendario': {
        return (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setCalendarioTab('calendario')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    calendarioTab === 'calendario'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-[#E8EDED] hover:border-white/20'
                  }`}
                >
                  <Calendar className="mr-2" size={18} />
                  Calendário de Aplicações
                </button>
                <button
                  onClick={() => setCalendarioTab('dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    calendarioTab === 'dashboard'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-[#E8EDED] hover:border-white/20'
                  }`}
                >
                  <BarChart3 className="mr-2" size={18} />
                  Dashboard de Evolução
                </button>
              </nav>
            </div>

            {/* Conteúdo */}
            {calendarioTab === 'calendario' ? (
              <CalendarioAplicacoes pacientes={pacientes} />
            ) : (
              <DashboardEvolucao />
            )}
          </div>
        );
      }

      case 'nps': {
        // Função auxiliar para calcular distribuição de uma métrica com todas as opções
        const calcularDistribuicao = (
          respostas: NPSResposta[], 
          getter: (r: NPSResposta) => string | number | undefined,
          todasOpcoes: (string | number)[]
        ) => {
          const contagem: Record<string, number> = {};
          let total = 0;
          
          // Inicializar todas as opções com 0
          todasOpcoes.forEach(opcao => {
            contagem[String(opcao)] = 0;
          });
          
          // Contar respostas
          respostas.forEach(resposta => {
            const valor = getter(resposta);
            if (valor !== undefined && valor !== null) {
              const key = String(valor);
              contagem[key] = (contagem[key] || 0) + 1;
              total++;
            }
          });
          
          // Converter para array mantendo ordem das opções
          return todasOpcoes.map(opcao => {
            const key = String(opcao);
            const count = contagem[key] || 0;
            return {
              name: key,
              value: count,
              porcentagem: total > 0 ? (count / total * 100).toFixed(1) : '0.0'
            };
          });
        };

        // Função auxiliar para calcular distribuição de array (como oQueMaisUsa) com todas as opções
        const calcularDistribuicaoArray = (
          respostas: NPSResposta[], 
          getter: (r: NPSResposta) => string[] | undefined,
          todasOpcoes: string[]
        ) => {
          const contagem: Record<string, number> = {};
          let totalRespostas = 0;
          
          // Inicializar todas as opções com 0
          todasOpcoes.forEach(opcao => {
            contagem[opcao] = 0;
          });
          
          // Contar respostas (cada resposta conta como 1, mesmo se tiver múltiplas seleções)
          respostas.forEach(resposta => {
            const valores = getter(resposta);
            if (valores && valores.length > 0) {
              totalRespostas++;
              valores.forEach(valor => {
                contagem[valor] = (contagem[valor] || 0) + 1;
              });
            }
          });
          
          // Converter para array mantendo ordem das opções
          // Para arrays, porcentagem é baseada no total de respostas, não no total de seleções
          return todasOpcoes.map(opcao => {
            const count = contagem[opcao] || 0;
            return {
              name: opcao,
              value: count,
              porcentagem: totalRespostas > 0 ? (count / totalRespostas * 100).toFixed(1) : '0.0'
            };
          });
        };

        // Cores para os gráficos
        const CORES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

        // Traduzir labels
        const traduzirLabel = (key: string, tipo?: string) => {
          // Médico
          if (tipo === 'medico') {
            if (key === 'muito') return 'Muito';
            if (key === 'sim') return 'Sim';
            if (key === 'pouco') return 'Pouco';
            if (key === 'nao') return 'Não';
            if (key === 'excelentes') return 'Excelentes';
            if (key === 'boas') return 'Boas';
            if (key === 'regulares') return 'Regulares';
            if (key === 'insuficientes') return 'Insuficientes';
            if (key === 'com_certeza') return 'Com certeza';
            if (key === 'provavelmente') return 'Provavelmente';
            if (key === 'nao_sei') return 'Não sei';
            if (key === 'provavelmente_nao') return 'Provavelmente não';
            if (key === 'controle_leads') return 'Controle de Leads';
            if (key === 'financeiro') return 'Financeiro';
            if (key === 'chat') return 'Chat';
            if (key === 'pacientes') return 'Pacientes';
            if (key === 'estatisticas') return 'Estatísticas';
            if (key === 'calendario') return 'Calendário';
            if (key === 'mais_integracao') return 'Mais integrações';
            if (key === 'mais_automatizacao') return 'Mais automação';
            if (key === 'mais_relatorios') return 'Mais relatórios';
            if (key === 'melhor_ux') return 'Melhor UX';
            if (key === 'mais_ferramentas') return 'Mais ferramentas';
          }
          
          // Paciente
          if (key === 'muito_claras') return 'Muito claras';
          if (key === 'claras') return 'Claras';
          if (key === 'mais_ou_menos') return 'Mais ou menos';
          if (key === 'confusas') return 'Confusas';
          if (key === 'muito_seguro') return 'Muito seguro';
          if (key === 'seguro') return 'Seguro';
          if (key === 'indiferente') return 'Indiferente';
          if (key === 'inseguro') return 'Inseguro';
          if (key === 'ajuda_muito') return 'Ajuda muito';
          if (key === 'ajuda') return 'Ajuda';
          if (key === 'ajuda_pouco') return 'Ajuda pouco';
          if (key === 'nao_ajuda') return 'Não ajuda';
          if (key === 'acompanhamento_medico') return 'Acompanhamento médico';
          if (key === 'plano_alimentar') return 'Plano alimentar';
          if (key === 'medicacao') return 'Medicação';
          if (key === 'relatorios') return 'Relatórios';
          if (key === 'mais_contato_medico') return 'Mais contato médico';
          if (key === 'mais_conteudo_educativo') return 'Mais conteúdo educativo';
          if (key === 'mais_automacoes') return 'Mais automações';
          if (key === 'medico') return 'Médico';
          if (key === 'indicacao') return 'Indicação';
          if (key === 'instagram') return 'Instagram';
          if (key === 'google') return 'Google';
          if (key === 'outro') return 'Outro';
          if (key === 'outros') return 'Outros';
          if (['1', '2', '3', '4', '5'].includes(key)) return `${key} estrelas`;
          
          return key;
        };

        // Separar respostas por tipo
        const respostasMedicos = npsRespostas.filter(r => r.tipo === 'medico');
        const respostasPacientes = npsRespostas.filter(r => r.tipo === 'paciente');

        // Calcular distribuições para médicos (com todas as opções)
        const facilidadeUso = calcularDistribuicao(respostasMedicos, r => r.medico?.facilidadeUso, ['muito', 'sim', 'pouco', 'nao']);
        const qualidadeInformacoes = calcularDistribuicao(respostasMedicos, r => r.medico?.qualidadeInformacoes, ['excelentes', 'boas', 'regulares', 'insuficientes']);
        const ganhoProfissional = calcularDistribuicao(respostasMedicos, r => r.medico?.ganhoProfissional, ['muito', 'sim', 'pouco', 'nao']);
        const intencaoContinuidade = calcularDistribuicao(respostasMedicos, r => r.medico?.intencaoContinuidade, ['com_certeza', 'provavelmente', 'nao_sei', 'provavelmente_nao']);
        const oQueMaisUsaMedico = calcularDistribuicaoArray(npsRespostas, r => r.tipo === 'medico' ? r.extras?.oQueMaisUsa : undefined, ['controle_leads', 'financeiro', 'chat', 'pacientes', 'estatisticas', 'calendario']);
        const oQueSenteFaltaMedico = calcularDistribuicaoArray(npsRespostas, r => r.tipo === 'medico' ? r.extras?.oQueSenteFalta : undefined, ['mais_integracao', 'mais_automatizacao', 'mais_relatorios', 'melhor_ux', 'mais_ferramentas', 'outros']);
        const comoConheceu = calcularDistribuicao(npsRespostas, r => r.extras?.comoConheceu, ['medico', 'indicacao', 'instagram', 'google', 'outro']);

        // Calcular distribuições para pacientes (com todas as opções)
        const acompanhamentoMedico = calcularDistribuicao(respostasPacientes, r => r.paciente?.acompanhamentoMedico, [5, 4, 3, 2, 1]);
        const clarezaTratamento = calcularDistribuicao(respostasPacientes, r => r.paciente?.clarezaTratamento, ['muito_claras', 'claras', 'mais_ou_menos', 'confusas']);
        const segurancaPrivacidade = calcularDistribuicao(respostasPacientes, r => r.paciente?.segurancaPrivacidade, ['muito_seguro', 'seguro', 'indiferente', 'inseguro']);
        const impactoTratamento = calcularDistribuicao(respostasPacientes, r => r.paciente?.impactoTratamento, ['ajuda_muito', 'ajuda', 'ajuda_pouco', 'nao_ajuda']);
        const oQueMaisUsaPaciente = calcularDistribuicaoArray(npsRespostas, r => r.tipo === 'paciente' ? r.extras?.oQueMaisUsa : undefined, ['acompanhamento_medico', 'chat', 'plano_alimentar', 'medicacao', 'relatorios']);
        const oQueSenteFaltaPaciente = calcularDistribuicaoArray(npsRespostas, r => r.tipo === 'paciente' ? r.extras?.oQueSenteFalta : undefined, ['mais_contato_medico', 'mais_conteudo_educativo', 'mais_automacoes', 'mais_relatorios', 'outros']);

        // Componente de gráfico de barras
        const BarChartComponent = ({ data, title, tipoUsuario }: { data: Array<{name: string, value: number, porcentagem: string}>, title: string, tipoUsuario?: 'medico' | 'paciente' }) => {
          if (data.length === 0) return null;
          
          const dataFormatted = data.map(item => {
            const label = traduzirLabel(item.name, tipoUsuario);
            // Abreviar labels no mobile
            const labelShort = isMobile && label.length > 10 ? label.substring(0, 10) + '...' : label;
            return {
              ...item,
              label: labelShort,
              labelFull: label,
              quantidade: item.value
            };
          });

          return (
            <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors p-3 md:p-6">
              <h3 className={`font-semibold text-[#E8EDED] mb-2 md:mb-4 ${isMobile ? 'text-sm' : 'text-lg'}`}>{title}</h3>
              <ResponsiveContainer width="100%" height={isMobile ? 150 : 200}>
                <BarChart 
                  data={dataFormatted}
                  layout={isMobile ? "vertical" : "horizontal"}
                  margin={isMobile ? { top: 5, right: 10, left: 0, bottom: 5 } : { top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  {isMobile ? (
                    <>
                      <XAxis type="number" hide />
                      <YAxis dataKey="label" type="category" width={isMobile ? 60 : 80} tick={{ fontSize: isMobile ? 10 : 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [
                          `${props.payload.porcentagem}% (${value} respostas)`,
                          props.payload.labelFull
                        ]} 
                      />
                      <Bar dataKey="quantidade" fill="#4CCB7A" radius={[0, 4, 4, 0]} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="labelFull" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [
                          `${props.payload.porcentagem}% (${value} respostas)`,
                          props.payload.labelFull
                        ]} 
                      />
                      <Bar dataKey="quantidade" fill="#4CCB7A" />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        };

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#E8EDED]">Dashboard NPS</h2>
              <button
                onClick={async () => {
                  setLoadingNPS(true);
                  try {
                    const [estatisticas, respostas] = await Promise.all([
                      NPSService.getEstatisticas(),
                      NPSService.getAllRespostas()
                    ]);
                    setNpsEstatisticas(estatisticas);
                    setNpsRespostas(respostas);
                    setMessage('Dados atualizados com sucesso!');
                  } catch (error) {
                    console.error('Erro ao carregar dados NPS:', error);
                    setMessage('Erro ao carregar dados NPS');
                  } finally {
                    setLoadingNPS(false);
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={20} />
                Atualizar
              </button>
            </div>

            {loadingNPS ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando dados NPS...</p>
                </div>
              </div>
            ) : npsEstatisticas ? (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#E8EDED]/70">NPS Geral</p>
                        <p className={`text-3xl font-bold ${npsEstatisticas.npsGeral >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {npsEstatisticas.npsGeral.toFixed(1)}
                        </p>
                      </div>
                      <TrendingUp className={`w-12 h-12 ${npsEstatisticas.npsGeral >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#E8EDED]/70">NPS Pacientes</p>
                        <p className={`text-3xl font-bold ${npsEstatisticas.npsPacientes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {npsEstatisticas.npsPacientes.toFixed(1)}
                        </p>
                      </div>
                      <MessageSquare className={`w-12 h-12 ${npsEstatisticas.npsPacientes >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#E8EDED]/70">NPS Médicos</p>
                        <p className={`text-3xl font-bold ${npsEstatisticas.npsMedicos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {npsEstatisticas.npsMedicos.toFixed(1)}
                        </p>
                      </div>
                      <Stethoscope className={`w-12 h-12 ${npsEstatisticas.npsMedicos >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#E8EDED]/70">Risco de Churn</p>
                        <p className={`text-3xl font-bold ${npsEstatisticas.riscoChurn < 30 ? 'text-green-600' : npsEstatisticas.riscoChurn < 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {npsEstatisticas.riscoChurn.toFixed(1)}%
                        </p>
                      </div>
                      <AlertCircle className={`w-12 h-12 ${npsEstatisticas.riscoChurn < 30 ? 'text-green-600' : npsEstatisticas.riscoChurn < 50 ? 'text-yellow-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                </div>

                {/* Distribuição */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Distribuição Geral</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Promotores</span>
                        <span className="font-semibold text-green-600">{npsEstatisticas.distribuicao.promotor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Neutros</span>
                        <span className="font-semibold text-yellow-600">{npsEstatisticas.distribuicao.neutro}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Detratores</span>
                        <span className="font-semibold text-red-600">{npsEstatisticas.distribuicao.detrator}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Pacientes</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Promotores</span>
                        <span className="font-semibold text-green-600">{npsEstatisticas.distribuicaoPacientes.promotor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Neutros</span>
                        <span className="font-semibold text-yellow-600">{npsEstatisticas.distribuicaoPacientes.neutro}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Detratores</span>
                        <span className="font-semibold text-red-600">{npsEstatisticas.distribuicaoPacientes.detrator}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Médicos</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Promotores</span>
                        <span className="font-semibold text-green-600">{npsEstatisticas.distribuicaoMedicos.promotor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Neutros</span>
                        <span className="font-semibold text-yellow-600">{npsEstatisticas.distribuicaoMedicos.neutro}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#E8EDED]/70">Detratores</span>
                        <span className="font-semibold text-red-600">{npsEstatisticas.distribuicaoMedicos.detrator}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Palavras-chave */}
                {npsEstatisticas.palavrasChave.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                    <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Principais Palavras-chave</h3>
                    <div className="flex flex-wrap gap-2">
                      {npsEstatisticas.palavrasChave.slice(0, 20).map((item, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {item.palavra} ({item.frequencia})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gráficos de Barras - Médicos */}
                {respostasMedicos.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-[#E8EDED]">Análise de Respostas - Médicos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <BarChartComponent 
                        data={facilidadeUso} 
                        title="Facilidade de Uso" 
                        tipoUsuario="medico"
                      />
                      <BarChartComponent 
                        data={qualidadeInformacoes} 
                        title="Qualidade das Informações Clínicas" 
                        tipoUsuario="medico"
                      />
                      <BarChartComponent 
                        data={ganhoProfissional} 
                        title="Ganho Profissional" 
                        tipoUsuario="medico"
                      />
                      <BarChartComponent 
                        data={intencaoContinuidade} 
                        title="Intenção de Continuidade" 
                        tipoUsuario="medico"
                      />
                      {oQueMaisUsaMedico.length > 0 && (
                        <BarChartComponent 
                          data={oQueMaisUsaMedico} 
                          title="O que você mais usa? (Médicos)" 
                          tipoUsuario="medico"
                        />
                      )}
                      {oQueSenteFaltaMedico.length > 0 && (
                        <BarChartComponent 
                          data={oQueSenteFaltaMedico} 
                          title="O que sente falta hoje? (Médicos)" 
                          tipoUsuario="medico"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Gráficos de Barras - Pacientes */}
                {respostasPacientes.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-[#E8EDED]">Análise de Respostas - Pacientes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <BarChartComponent 
                        data={acompanhamentoMedico} 
                        title="Experiência com Acompanhamento Médico" 
                        tipoUsuario="paciente"
                      />
                      <BarChartComponent 
                        data={clarezaTratamento} 
                        title="Clareza do Tratamento" 
                        tipoUsuario="paciente"
                      />
                      <BarChartComponent 
                        data={segurancaPrivacidade} 
                        title="Sensação de Segurança e Privacidade" 
                        tipoUsuario="paciente"
                      />
                      <BarChartComponent 
                        data={impactoTratamento} 
                        title="Impacto Percebido no Tratamento" 
                        tipoUsuario="paciente"
                      />
                      {oQueMaisUsaPaciente.length > 0 && (
                        <BarChartComponent 
                          data={oQueMaisUsaPaciente} 
                          title="O que você mais usa? (Pacientes)" 
                          tipoUsuario="paciente"
                        />
                      )}
                      {oQueSenteFaltaPaciente.length > 0 && (
                        <BarChartComponent 
                          data={oQueSenteFaltaPaciente} 
                          title="O que sente falta hoje? (Pacientes)" 
                          tipoUsuario="paciente"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Como conheceu (geral) */}
                {comoConheceu.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-[#E8EDED]">Geral</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <BarChartComponent 
                        data={comoConheceu} 
                        title="Como você conheceu o Oftware?" 
                      />
                    </div>
                  </div>
                )}

                {/* Histórico de Respostas */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/30 transition-colors">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-[#E8EDED]">Histórico de Respostas</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-white/10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase">Tipo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase">NPS</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase">Classificação</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase">Feedback Melhoria</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {npsRespostas.map((resposta) => (
                          <tr key={resposta.id} className="hover:bg-white/10">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#E8EDED]">
                              {resposta.dataResposta.toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#E8EDED] capitalize">
                              {resposta.tipo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#E8EDED]">
                              {resposta.npsScore}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                resposta.npsClassificacao === 'promotor' ? 'bg-green-100 text-green-800' :
                                resposta.npsClassificacao === 'neutro' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {resposta.npsClassificacao === 'promotor' ? 'Promotor' :
                                 resposta.npsClassificacao === 'neutro' ? 'Neutro' : 'Detrator'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#E8EDED] max-w-md">
                              {resposta.melhoriaTexto ? (
                                <div className="max-w-md" title={resposta.melhoriaTexto}>
                                  {resposta.melhoriaTexto.length > 100 
                                    ? `${resposta.melhoriaTexto.substring(0, 100)}...` 
                                    : resposta.melhoriaTexto}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-[#E8EDED]/70">Nenhum dado NPS disponível ainda.</p>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'banners':
        return (
          <div className="space-y-6">
            <div className="mb-6">
              {/* Seletor de Pastas */}
              <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setPastaBannerAtiva('home')}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    pastaBannerAtiva === 'home'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-[#E8EDED]/70 hover:text-[#E8EDED]'
                  }`}
                >
                  📁 Home (www.oftware.com.br)
                </button>
                <button
                  onClick={() => setPastaBannerAtiva('meta')}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    pastaBannerAtiva === 'meta'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-[#E8EDED]/70 hover:text-[#E8EDED]'
                  }`}
                >
                  📁 Meta (www.oftware.com.br/meta)
                </button>
              </div>

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#E8EDED]">
                  Banners - {pastaBannerAtiva === 'home' ? 'Home' : 'Meta'}
                </h2>
              <button
                onClick={() => {
                  setBannerEditando(null);
                  setDadosBanner({
                    titulo: '',
                    imagemUrl: '',
                    conteudoHtml: '',
                    conteudoJson: undefined,
                    formato: 'json',
                      local: pastaBannerAtiva, // Usar a pasta ativa como padrão
                    ativo: true,
                    ordem: banners.length > 0 ? Math.max(...banners.map(b => b.ordem)) + 1 : 0
                  });
                  setJsonError('');
                  setShowEditarBannerModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Novo Banner
              </button>
              </div>
            </div>

            {loadingBanners ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto"></div>
                  <p className="mt-4 text-[#E8EDED]/70">Carregando banners...</p>
                </div>
              </div>
            ) : banners.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-[#E8EDED]/70">Nenhum banner cadastrado ainda.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {banners.map((banner) => (
                  <div key={banner.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/30 transition-colors">
                    <div className="relative">
                      {banner.imagemUrl && (
                        <img
                          src={banner.imagemUrl}
                          alt={banner.titulo}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          banner.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {banner.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-[#E8EDED] mb-2">{banner.titulo}</h3>
                      <p className="text-sm text-gray-500 mb-3">Ordem: {banner.ordem}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setBannerEditando(banner);
                            // Detectar formato: se tem conteudoJson, é json; se tem conteudoHtml, é html; senão, padrão json
                            const formatoDetectado = banner.formato || 
                              (banner.conteudoJson ? 'json' : 
                               banner.conteudoHtml ? 'html' : 'json');
                            setDadosBanner({
                              titulo: banner.titulo,
                              imagemUrl: banner.imagemUrl,
                              conteudoHtml: banner.conteudoHtml || '',
                              conteudoJson: banner.conteudoJson || (formatoDetectado === 'json' ? { sections: [] } : undefined),
                              formato: formatoDetectado,
                              local: banner.local || 'meta', // Padrão para meta se não especificado
                              ativo: banner.ativo,
                              ordem: banner.ordem
                            });
                            setJsonError('');
                            setShowEditarBannerModal(true);
                          }}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Edit size={16} className="inline mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja excluir este banner?')) {
                              try {
                                await BannerService.deleteBanner(banner.id);
                                await loadBanners();
                                setMessage('Banner excluído com sucesso!');
                              } catch (error) {
                                console.error('Erro ao excluir banner:', error);
                                setMessage('Erro ao excluir banner');
                              }
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                        >
                          <Trash2 size={16} className="inline" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'oftpay':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#E8EDED]">OftPay</h2>
                <p className="text-sm text-[#E8EDED]/70 mt-1">Usuários que entraram no OftPay. Libere cursos e o Banco de Questões para cada um.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={loadOftPayUsers}
                  disabled={loadingOftPay}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#E8EDED] hover:bg-white/10 disabled:opacity-50 text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingOftPay ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={oftpayNewEmail}
                    onChange={(e) => setOftpayNewEmail(e.target.value)}
                    placeholder="Email do usuário"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-48"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!oftpayNewEmail.trim() || !user) return;
                      setOftpayAddingUser(true);
                      setOftpayError(null);
                      try {
                        const token = await user.getIdToken();
                        const res = await fetch('/api/metaadmingeral/oftpay/users', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ email: oftpayNewEmail.trim() }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data.error || res.statusText);
                        setOftpayNewEmail('');
                        setMessage('Usuário adicionado. Libere os cursos abaixo.');
                        await loadOftPayUsers();
                      } catch (e) {
                        setOftpayError(e instanceof Error ? e.message : 'Erro ao adicionar');
                      } finally {
                        setOftpayAddingUser(false);
                      }
                    }}
                    disabled={oftpayAddingUser || !oftpayNewEmail.trim()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
            {oftpayError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{oftpayError}</div>
            )}
            {loadingOftPay ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CCB7A] mx-auto" />
                  <p className="mt-4 text-[#E8EDED]/70">Carregando usuários OftPay...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#4CCB7A]/30 transition-colors">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-2 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider w-10"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider w-12">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Último login</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Início acesso</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Fim acesso</th>
                        {OFTPAY_COURSES.map((c) => (
                          <th key={c.id} className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">{c.name}</th>
                        ))}
                        <th className="px-6 py-3 text-center text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Banco de Questões</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[#E8EDED]/70 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {oftpayUsers.map((u, index) => {
                        const isExpanded = oftpayExpandedEmail === u.email;
                        const details = oftpayUserDetails[u.email];
                        const isLoadingDetails = oftpayLoadingDetails === u.email;
                        return (
                        <Fragment key={u.email}>
                        <tr className="hover:bg-white/10">
                          <td className="px-2 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={async () => {
                                if (isExpanded) {
                                  setOftpayExpandedEmail(null);
                                  return;
                                }
                                setOftpayExpandedEmail(u.email);
                                if (details) return;
                                if (!user) return;
                                setOftpayLoadingDetails(u.email);
                                try {
                                  const token = await user.getIdToken();
                                  const res = await fetch(`/api/metaadmingeral/oftpay/user-details?email=${encodeURIComponent(u.email)}`, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error || res.statusText);
                                  setOftpayUserDetails((prev) => ({
                                    ...prev,
                                    [u.email]: {
                                      coursePercentages: data.coursePercentages ?? {},
                                      lastLoginUserAgent: data.lastLoginUserAgent ?? null,
                                      lastLoginAt: data.lastLoginAt ?? null,
                                    },
                                  }));
                                } catch (e) {
                                  setOftpayError(e instanceof Error ? e.message : 'Erro ao carregar detalhes');
                                } finally {
                                  setOftpayLoadingDetails(null);
                                }
                              }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8EDED] transition-colors"
                              title={isExpanded ? 'Recolher' : 'Expandir detalhes'}
                            >
                              {isLoadingDetails ? (
                                <span className="inline-block w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                              ) : isExpanded ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-[#E8EDED]">{u.email}</p>
                              {u.displayName && <p className="text-xs text-gray-500">{u.displayName}</p>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="date"
                              value={oftpayLocalAccessStart[u.email] ?? ''}
                              onChange={(e) => setOftpayLocalAccessStart((prev) => ({ ...prev, [u.email]: e.target.value }))}
                              className="px-2 py-1.5 border border-gray-200 rounded text-sm w-36"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="date"
                              value={oftpayLocalAccessEnd[u.email] ?? ''}
                              onChange={(e) => setOftpayLocalAccessEnd((prev) => ({ ...prev, [u.email]: e.target.value }))}
                              className="px-2 py-1.5 border border-gray-200 rounded text-sm w-36"
                            />
                          </td>
                          {OFTPAY_COURSES.map((c) => {
                            const courseIds = oftpayLocalCourseIds[u.email] ?? u.courseIds ?? [];
                            const checked = courseIds.includes(c.id);
                            return (
                              <td key={c.id} className="px-6 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setOftpayLocalCourseIds((prev) => {
                                      const current = prev[u.email] ?? [];
                                      const next = e.target.checked ? [...current, c.id] : current.filter((id) => id !== c.id);
                                      return { ...prev, [u.email]: next };
                                    });
                                  }}
                                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={oftpayLocalQuestoesEnabled[u.email] ?? Boolean(u.questoesEnabled)}
                              onChange={(e) => {
                                setOftpayLocalQuestoesEnabled((prev) => ({
                                  ...prev,
                                  [u.email]: e.target.checked,
                                }));
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!user) return;
                                  setOftpaySavingEmail(u.email);
                                  try {
                                    const token = await user.getIdToken();
                                    const courseIds = oftpayLocalCourseIds[u.email] ?? [];
                                    const questoesEnabled = oftpayLocalQuestoesEnabled[u.email] ?? Boolean(u.questoesEnabled);
                                    const startStr = oftpayLocalAccessStart[u.email]?.trim();
                                    const endStr = oftpayLocalAccessEnd[u.email]?.trim();
                                    const accessStartAt = startStr ? new Date(startStr).getTime() : null;
                                    const accessEndAt = endStr ? new Date(endStr + 'T23:59:59.999').getTime() : null;
                                    const res = await fetch('/api/metaadmingeral/oftpay/users', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ email: u.email, courseIds, questoesEnabled, accessStartAt, accessEndAt }),
                                    });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) throw new Error(data.error || res.statusText);
                                    setMessage('Cursos, Banco de Questões e vigência atualizados.');
                                  } catch (e) {
                                    setOftpayError(e instanceof Error ? e.message : 'Erro ao salvar');
                                  } finally {
                                    setOftpaySavingEmail(null);
                                  }
                                }}
                                disabled={oftpaySavingEmail === u.email || oftpayDeletingEmail === u.email}
                                className="inline-flex items-center gap-1 px-2 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {oftpaySavingEmail === u.email ? (
                                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                Salvar
                              </button>
                              <button
                                type="button"
                                title="Excluir usuário"
                                onClick={async () => {
                                  if (!user) return;
                                  if (!confirm(`Excluir o usuário ${u.email}? O acesso ao OftPay será removido.`)) return;
                                  setOftpayDeletingEmail(u.email);
                                  setOftpayError(null);
                                  try {
                                    const token = await user.getIdToken();
                                    const res = await fetch('/api/metaadmingeral/oftpay/users', {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ email: u.email }),
                                    });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) throw new Error(data.error || res.statusText);
                                    setOftpayUsers((prev) => prev.filter((x) => x.email !== u.email));
                                    setOftpayLocalCourseIds((prev) => {
                                      const next = { ...prev };
                                      delete next[u.email];
                                      return next;
                                    });
                                    setOftpayLocalQuestoesEnabled((prev) => {
                                      const next = { ...prev };
                                      delete next[u.email];
                                      return next;
                                    });
                                    setOftpayLocalAccessStart((prev) => {
                                      const next = { ...prev };
                                      delete next[u.email];
                                      return next;
                                    });
                                    setOftpayLocalAccessEnd((prev) => {
                                      const next = { ...prev };
                                      delete next[u.email];
                                      return next;
                                    });
                                    setMessage('Usuário excluído.');
                                  } catch (e) {
                                    setOftpayError(e instanceof Error ? e.message : 'Erro ao excluir');
                                  } finally {
                                    setOftpayDeletingEmail(null);
                                  }
                                }}
                                disabled={oftpaySavingEmail === u.email || oftpayDeletingEmail === u.email}
                                className="p-1.5 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-colors"
                              >
                                {oftpayDeletingEmail === u.email ? (
                                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent inline-block" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-white/5">
                            <td colSpan={6 + OFTPAY_COURSES.length + 2} className="px-6 py-4">
                              <div className="space-y-3 text-sm">
                                {details ? (
                                  <>
                                    <div>
                                      <p className="font-medium text-[#E8EDED]/90 mb-1">Porcentagem por curso</p>
                                      <div className="flex flex-wrap gap-4">
                                        {OFTPAY_COURSES.map((c) => (
                                          <span key={c.id} className="text-[#E8EDED]/70">
                                            {c.name}: <strong>{(details.coursePercentages[c.id] ?? 0)}%</strong>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-medium text-[#E8EDED]/90 mb-1">Último acesso</p>
                                      <p className="text-[#E8EDED]/70">
                                        {details.lastLoginAt
                                          ? new Date(details.lastLoginAt).toLocaleString('pt-BR', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })
                                          : 'Nunca entrou'}
                                      </p>
                                      {details.lastLoginUserAgent && (
                                        <p className="text-gray-500 text-xs mt-0.5 truncate max-w-2xl" title={details.lastLoginUserAgent}>
                                          Dispositivo: {details.lastLoginUserAgent}
                                        </p>
                                      )}
                                    </div>
                                  </>
                                ) : isLoadingDetails ? (
                                  <p className="text-gray-500">Carregando...</p>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
                {oftpayUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum usuário ainda. Quem fizer login no OftPay aparecerá aqui; ou adicione um email acima.</p>
                  </div>
                )}
              </div>
            )}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#E8EDED] flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#4CCB7A]" />
                    OftPay · Aprendizado (técnico)
                  </h3>
                  <p className="text-sm text-[#E8EDED]/65 mt-0.5 max-w-xl">
                    Painel interno: eficácia e estabilidade dos insights na base global anonimizada (sem paciente,
                    arquivo ou texto clínico livre).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOftpayLearningInsights()}
                  disabled={loadingOftpayLearn}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#E8EDED] hover:bg-white/10 disabled:opacity-50 text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingOftpayLearn ? 'animate-spin' : ''}`} />
                  Atualizar painel
                </button>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-xs text-[#E8EDED]/60 mb-1">Domínio</label>
                  <select
                    value={oftpayLearnDomain}
                    onChange={(e) => setOftpayLearnDomain(e.target.value)}
                    className="px-2 py-1.5 rounded-md bg-white/10 border border-white/15 text-[#E8EDED] text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="glaucoma">glaucoma</option>
                    <option value="retina">retina</option>
                    <option value="cornea">cornea</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDED]/60 mb-1">Tipo de exame (id)</label>
                  <input
                    value={oftpayLearnExam}
                    onChange={(e) => setOftpayLearnExam(e.target.value)}
                    placeholder="ex.: oct_macula"
                    className="px-2 py-1.5 rounded-md bg-white/10 border border-white/15 text-[#E8EDED] text-sm w-40 placeholder:text-[#E8EDED]/35"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDED]/60 mb-1">Eficácia</label>
                  <select
                    value={oftpayLearnEff}
                    onChange={(e) => setOftpayLearnEff(e.target.value)}
                    className="px-2 py-1.5 rounded-md bg-white/10 border border-white/15 text-[#E8EDED] text-sm"
                  >
                    <option value="">Todas</option>
                    <option value="promising">promising</option>
                    <option value="mixed">mixed</option>
                    <option value="weak_signal">weak_signal</option>
                    <option value="insufficient_data">insufficient_data</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDED]/60 mb-1">Estabilidade</label>
                  <select
                    value={oftpayLearnStab}
                    onChange={(e) => setOftpayLearnStab(e.target.value)}
                    className="px-2 py-1.5 rounded-md bg-white/10 border border-white/15 text-[#E8EDED] text-sm"
                  >
                    <option value="">Todas</option>
                    <option value="stable_positive">stable_positive</option>
                    <option value="recently_improving">recently_improving</option>
                    <option value="volatile">volatile</option>
                    <option value="recently_weakening">recently_weakening</option>
                    <option value="insufficient_recent_data">insufficient_recent_data</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOftpayLearningInsights()}
                  className="px-3 py-1.5 rounded-lg bg-[#4CCB7A]/20 border border-[#4CCB7A]/40 text-[#E8EDED] text-sm hover:bg-[#4CCB7A]/30"
                >
                  Aplicar filtros
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOftpayLearnDomain('');
                    setOftpayLearnExam('');
                    setOftpayLearnEff('');
                    setOftpayLearnStab('');
                    oftpayLearnFiltersRef.current = { domain: '', exam: '', eff: '', stab: '' };
                    void loadOftpayLearningInsights();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#E8EDED]/80 text-sm hover:bg-white/10"
                >
                  Limpar
                </button>
              </div>
              {oftpayLearnError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{oftpayLearnError}</div>
              )}
              {loadingOftpayLearn && !oftpayLearnPayload ? (
                <div className="text-center py-6 text-[#E8EDED]/60 text-sm">Carregando agregações…</div>
              ) : oftpayLearnPayload ? (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-medium text-[#E8EDED]/55 uppercase tracking-wide mb-2">Resumo</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="px-2 py-1 rounded bg-white/10 text-[#E8EDED]">
                        Agregados: <strong>{oftpayLearnPayload.summary.totalInsights}</strong>
                      </span>
                      <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-200">
                        promising: {oftpayLearnPayload.summary.promisingCount}
                      </span>
                      <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-100">
                        mixed: {oftpayLearnPayload.summary.mixedCount}
                      </span>
                      <span className="px-2 py-1 rounded bg-orange-500/15 text-orange-100">
                        weak_signal: {oftpayLearnPayload.summary.weakSignalCount}
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-500/20 text-slate-200">
                        insufficient_data: {oftpayLearnPayload.summary.insufficientDataCount}
                      </span>
                      <span className="text-[#E8EDED]/45 text-xs">
                        Registros de impacto lidos: {oftpayLearnPayload.impactRecordsLoaded}
                      </span>
                    </div>
                    {oftpayLearnPayload.summary.notes.length > 0 && (
                      <ul className="mt-2 text-xs text-[#E8EDED]/55 list-disc list-inside">
                        {oftpayLearnPayload.summary.notes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#E8EDED]/55 uppercase tracking-wide mb-2">
                      Top sinais promissores
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-white/5 text-[#E8EDED]/65">
                          <tr>
                            <th className="px-2 py-2">patternId / chave</th>
                            <th className="px-2 py-2">tipo</th>
                            <th className="px-2 py-2">domínio</th>
                            <th className="px-2 py-2">exame</th>
                            <th className="px-2 py-2">uses</th>
                            <th className="px-2 py-2">agreeRate</th>
                            <th className="px-2 py-2">eficácia</th>
                            <th className="px-2 py-2">estabilidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-[#E8EDED]/90">
                          {oftpayLearnPayload.topPromising.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-2 py-3 text-[#E8EDED]/45">
                                Nenhum no recorte atual.
                              </td>
                            </tr>
                          ) : (
                            oftpayLearnPayload.topPromising.map((row) => (
                              <tr key={row.patternIdOrKey} className="hover:bg-white/5">
                                <td className="px-2 py-2 font-mono text-[10px] max-w-[220px] truncate" title={row.patternIdOrKey}>
                                  {row.patternIdOrKey}
                                </td>
                                <td className="px-2 py-2">{row.type}</td>
                                <td className="px-2 py-2">{row.relatedDomain ?? '—'}</td>
                                <td className="px-2 py-2">{row.relatedExamType ?? '—'}</td>
                                <td className="px-2 py-2">{row.totalUses}</td>
                                <td className="px-2 py-2">{(row.agreeRate * 100).toFixed(0)}%</td>
                                <td className="px-2 py-2">{row.effectivenessStatus}</td>
                                <td className="px-2 py-2">{row.stabilityStatus}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#E8EDED]/55 uppercase tracking-wide mb-2">
                      Sinais fracos / enfraquecendo / voláteis
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-white/5 text-[#E8EDED]/65">
                          <tr>
                            <th className="px-2 py-2">patternId / chave</th>
                            <th className="px-2 py-2">tipo</th>
                            <th className="px-2 py-2">domínio</th>
                            <th className="px-2 py-2">exame</th>
                            <th className="px-2 py-2">uses</th>
                            <th className="px-2 py-2">disagreeRate</th>
                            <th className="px-2 py-2">eficácia</th>
                            <th className="px-2 py-2">estabilidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-[#E8EDED]/90">
                          {oftpayLearnPayload.weakeningSignals.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-2 py-3 text-[#E8EDED]/45">
                                Nenhum no recorte atual.
                              </td>
                            </tr>
                          ) : (
                            oftpayLearnPayload.weakeningSignals.map((row) => (
                              <tr key={`w-${row.patternIdOrKey}`} className="hover:bg-white/5">
                                <td className="px-2 py-2 font-mono text-[10px] max-w-[220px] truncate" title={row.patternIdOrKey}>
                                  {row.patternIdOrKey}
                                </td>
                                <td className="px-2 py-2">{row.type}</td>
                                <td className="px-2 py-2">{row.relatedDomain ?? '—'}</td>
                                <td className="px-2 py-2">{row.relatedExamType ?? '—'}</td>
                                <td className="px-2 py-2">{row.totalUses}</td>
                                <td className="px-2 py-2">{(row.disagreeRate * 100).toFixed(0)}%</td>
                                <td className="px-2 py-2">{row.effectivenessStatus}</td>
                                <td className="px-2 py-2">{row.stabilityStatus}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#E8EDED]/55 uppercase tracking-wide mb-2">
                      Pouco dado recente ou volume insuficiente
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-white/5 text-[#E8EDED]/65">
                          <tr>
                            <th className="px-2 py-2">patternId / chave</th>
                            <th className="px-2 py-2">tipo</th>
                            <th className="px-2 py-2">domínio</th>
                            <th className="px-2 py-2">exame</th>
                            <th className="px-2 py-2">uses (30d)</th>
                            <th className="px-2 py-2">eficácia</th>
                            <th className="px-2 py-2">estabilidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-[#E8EDED]/90">
                          {oftpayLearnPayload.lowDataSignals.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-2 py-3 text-[#E8EDED]/45">
                                Nenhum no recorte atual.
                              </td>
                            </tr>
                          ) : (
                            oftpayLearnPayload.lowDataSignals.map((row) => (
                              <tr key={`d-${row.patternIdOrKey}-${row.type}`} className="hover:bg-white/5">
                                <td className="px-2 py-2 font-mono text-[10px] max-w-[220px] truncate" title={row.patternIdOrKey}>
                                  {row.patternIdOrKey}
                                </td>
                                <td className="px-2 py-2">{row.type}</td>
                                <td className="px-2 py-2">{row.relatedDomain ?? '—'}</td>
                                <td className="px-2 py-2">{row.relatedExamType ?? '—'}</td>
                                <td className="px-2 py-2">{row.recentUses}</td>
                                <td className="px-2 py-2">{row.effectivenessStatus}</td>
                                <td className="px-2 py-2">{row.stabilityStatus}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#E8EDED]/45">Sem dados ainda.</p>
              )}
            </div>
            {/* Painel dev: transcrição OFTREVIEW. Para ocultar em produção, adicione:
                {process.env.NODE_ENV !== 'production' && (...)} */}
            <div className="mt-6">
              <TranscribeOftreviewPanel
                batchId={transcribeBatchId}
                onBatchIdChange={setTranscribeBatchId}
              />
            </div>
            <div className="mt-6">
              <TranscribeStatusCard
                batchId={transcribeBatchId}
                onBatchIdChange={setTranscribeBatchId}
              />
            </div>
          </div>
        );

      case 'relatorios':
        return <RelatoriosSection user={user} />;

      default:
        return null;
    }
  };

  // Carregar dados NPS quando acessar o menu ou dashboard da organização
  useEffect(() => {
    if (activeMenu === 'nps' || activeMenu === 'org-dashboard') {
      const loadNPS = async () => {
        setLoadingNPS(true);
        try {
          const [estatisticas, respostas] = await Promise.all([
            NPSService.getEstatisticas(),
            NPSService.getAllRespostas()
          ]);
          setNpsEstatisticas(estatisticas);
          setNpsRespostas(respostas);
        } catch (error) {
          console.error('Erro ao carregar dados NPS:', error);
          setMessage('Erro ao carregar dados NPS');
        } finally {
          setLoadingNPS(false);
        }
      };
      loadNPS();
    }
  }, [activeMenu]);

  if (userLoading || loading) {
    return <MetaAdminGeralLoadingScreen />;
  }

  if (!user) {
    return null; // Será redirecionado
  }

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  return (
    <div className={META_ADMIN_GERAL_SHELL.page}>
      <div className="flex">
        <div className={`hidden lg:block fixed inset-y-0 left-0 z-40 ${META_ADMIN_GERAL_SHELL.sidebar} transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <div className="flex flex-col h-full">
            {/* Logo e botão de toggle */}
            <div
              className={`flex items-center h-16 border-b border-white/10 ${
                sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
              }`}
            >
              {!sidebarCollapsed ? <MetaAdminGeralBrandMark variant="sidebar" /> : null}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md hover:bg-white/10 text-[#E8EDED] transition-colors"
              >
                {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
              </button>
            </div>

            <MetaAdminGeralNavShell
              navContext={navContext}
              activeMenu={activeMenu}
              activeOrganizationId={activeOrganizationId}
              sidebarCollapsed={sidebarCollapsed}
              onNavContextChange={setNavContext}
              onOrganizationChange={setActiveOrganizationId}
              onSelectMenu={selectMenu}
            />

            {/* Logout button */}
            <div className="px-4 py-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-md transition-colors"
                title={sidebarCollapsed ? 'Sair' : ''}
              >
                <svg className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {!sidebarCollapsed && 'Sair'}
              </button>
            </div>
          </div>
        </div>
        
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-16' : 'ml-64'} overflow-x-hidden pb-4 lg:pb-0`}>
          {/* Mobile Header - Only visible on mobile; menu abre barra lateral */}
          <div className={`lg:hidden ${META_ADMIN_GERAL_SHELL.mobileHeader} px-4 py-3`}>
            <div className="flex items-center justify-between">
              <MetaAdminGeralBrandMark variant="mobile" />
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-md text-[#E8EDED]/70 hover:text-[#E8EDED] hover:bg-white/10"
                aria-label="Abrir menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <main className="p-6">
            {message && (
              <div className="mb-4 p-4 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#E8EDED] rounded-xl relative">
                <button
                  onClick={() => setMessage('')}
                  className="absolute top-2 right-2 text-[#E8EDED]/80 hover:text-[#E8EDED]"
                  aria-label="Fechar mensagem"
                >
                  <X size={16} />
                </button>
                {message}
              </div>
            )}
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Modal de Edição */}
      <EditModal
        isOpen={editModal.isOpen}
        onClose={closeEditModal}
        title={`Editar ${editModal.type === 'residente' ? 'Residente' : editModal.type === 'local' ? 'Local' : editModal.type === 'servico' ? 'Serviço' : 'Escala'}`}
        fullscreen={editModal.type === 'escala'}
      >
        {editModal.type === 'residente' && editModal.data && (
          <EditResidenteForm
            residente={editModal.data as Residente}
            onSave={handleUpdateResidente}
            onCancel={closeEditModal}
          />
        )}
        {editModal.type === 'local' && editModal.data && (
          <EditLocalForm
            local={editModal.data as Local}
            onSave={handleUpdateLocal}
            onCancel={closeEditModal}
          />
        )}
        {editModal.type === 'servico' && editModal.data && (
          <EditServicoForm
            servico={editModal.data as Servico}
            locais={locais}
            onSave={handleUpdateServico}
            onCancel={closeEditModal}
          />
        )}
        {editModal.type === 'escala' && editModal.data && (
          <EditEscalaForm
            escala={editModal.data as Escala}
            locais={locais}
            servicos={servicos}
            residentes={residentes}
            todasEscalas={escalas}
            onSave={handleUpdateEscala}
            onCancel={closeEditModal}
          />
        )}
      </EditModal>

      {/* Modal de Edição de Usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white text-[#0A1F44] [&_label]:text-[#0A1F44] [&_h3]:text-[#0A1F44]">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Editar Usuário
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Nome do usuário"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">
                    Tipo
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'residente' | 'recepcao')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="residente">Residente</option>
                    <option value="recepcao">Recepção</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Residente */}
      {showCadastrarResidenteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-[#E8EDED]">Cadastrar Residente</h3>
            </div>
            <form onSubmit={handleAddResidente} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nome</label>
                  <input
                    type="text"
                    value={newResidente.nome}
                    onChange={(e) => setNewResidente({ ...newResidente, nome: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nível</label>
                  <select
                    value={newResidente.nivel}
                    onChange={(e) => setNewResidente({ ...newResidente, nivel: e.target.value as 'R1' | 'R2' | 'R3' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="R1">R1</option>
                    <option value="R2">R2</option>
                    <option value="R3">R3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Email</label>
                  <input
                    type="email"
                    value={newResidente.email}
                    onChange={(e) => setNewResidente({ ...newResidente, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Telefone (opcional)</label>
                  <input
                    type="tel"
                    value={newResidente.telefone}
                    onChange={(e) => setNewResidente({ ...newResidente, telefone: e.target.value })}
                    placeholder="+5511999999999"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCadastrarResidenteModal(false);
                    setNewResidente({ nome: '', nivel: 'R1', email: '', telefone: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Salvando...' : 'Adicionar Residente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Local */}
      {showCadastrarLocalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-[#E8EDED]">Cadastrar Local</h3>
            </div>
            <form onSubmit={handleAddLocal} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nome do Local</label>
                  <input
                    type="text"
                    value={newLocal.nome}
                    onChange={(e) => setNewLocal({ ...newLocal, nome: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCadastrarLocalModal(false);
                    setNewLocal({ nome: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Salvando...' : 'Adicionar Local'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Serviço */}
      {showCadastrarServicoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-[#E8EDED]">Cadastrar Serviço</h3>
            </div>
            <form onSubmit={handleAddServico} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nome do Serviço</label>
                  <input
                    type="text"
                    value={newServico.nome}
                    onChange={(e) => setNewServico({ ...newServico, nome: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Local</label>
                  <select
                    value={newServico.localId}
                    onChange={(e) => setNewServico({ ...newServico, localId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Selecione um local</option>
                    {locais.map((local) => (
                      <option key={local.id} value={local.id}>
                        {local.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCadastrarServicoModal(false);
                    setNewServico({ nome: '', localId: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Salvando...' : 'Adicionar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Classificação (Admin) */}
      {showModalClassificacaoAdmin && profissionalClassificacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => !salvandoClassificacaoAdmin && setShowModalClassificacaoAdmin(false)}>
          <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-[#E8EDED]">Editar Classificação</h3>
              <button onClick={() => !salvandoClassificacaoAdmin && setShowModalClassificacaoAdmin(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#E8EDED]/70 mb-4">{profissionalClassificacao.nome}</p>
              {detalhamentoEdit === null ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CCB7A]" />
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: '5 estrelas', key: 'count5' as const },
                    { label: '4 estrelas', key: 'count4' as const },
                    { label: '3 estrelas', key: 'count3' as const },
                    { label: '2 estrelas', key: 'count2' as const },
                    { label: '1 estrela', key: 'count1' as const },
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <label className="text-sm font-medium text-gray-700">{label}</label>
                      <input
                        type="number"
                        min={0}
                        value={detalhamentoEdit[key]}
                        onChange={(e) => setDetalhamentoEdit({ ...detalhamentoEdit, [key]: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-center text-gray-900"
                      />
                      <span className="text-xs text-gray-500">votos</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Média de votos</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {detalhamentoEdit.total > 0
                        ? ((5 * detalhamentoEdit.count5 + 4 * detalhamentoEdit.count4 + 3 * detalhamentoEdit.count3 + 2 * detalhamentoEdit.count2 + 1 * detalhamentoEdit.count1) / detalhamentoEdit.total).toFixed(1)
                        : '0.0'}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => !salvandoClassificacaoAdmin && setShowModalClassificacaoAdmin(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSalvarClassificacaoAdmin}
                      disabled={salvandoClassificacaoAdmin}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {salvandoClassificacaoAdmin ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {medicoQrLinkModal && (
        <MedicoPublicUrlQrModal
          medico={medicoQrLinkModal}
          url={publicDrUrlForMedico(medicoQrLinkModal, medicos)}
          onClose={() => setMedicoQrLinkModal(null)}
        />
      )}

      {/* Modal de Edição de Médico */}
      {showEditarMedicoModal && medicoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-[#E8EDED]">Editar Dados do Médico</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.nome}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, nome: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Email *</label>
                    <input
                      type="email"
                      value={dadosMedicoEditando.email}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={dadosMedicoEditando.telefone}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, telefone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Gênero</label>
                    <select
                      value={dadosMedicoEditando.genero}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, genero: e.target.value as 'M' | 'F' | '' })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">CRM Número *</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.crmNumero}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, crmNumero: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">CRM Estado *</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.crmEstado}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, crmEstado: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Endereço *</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.endereco}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, endereco: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">CEP</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.cep}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, cep: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Ponto de Referência</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.pontoReferencia}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, pontoReferencia: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditarMedicoModal(false);
                    setMedicoEditando(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarMedico}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalDosesAplicadasPaciente
        open={pacienteDosesModal != null}
        onClose={() => setPacienteDosesModal(null)}
        pacienteId={pacienteDosesModal?.id ?? ''}
        pacienteNome={pacienteDosesModal?.nome ?? ''}
        user={user}
        onDosesChanged={loadPacientes}
      />

      {/* Modal de Edição de Paciente */}
      {showEditarPacienteModal && pacienteEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-[#E8EDED]">Editar Dados de Identificação do Paciente</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.nomeCompleto}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, nomeCompleto: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Email *</label>
                    <input
                      type="email"
                      value={dadosPacienteEditando.email}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={dadosPacienteEditando.telefone}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, telefone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">CPF</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.cpf}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, cpf: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={dadosPacienteEditando.dataNascimento}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, dataNascimento: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Sexo Biológico</label>
                    <select
                      value={dadosPacienteEditando.sexoBiologico}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, sexoBiologico: e.target.value as 'M' | 'F' | 'Outro' | '' })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Rua</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.rua}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, rua: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.cidade}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, cidade: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Estado</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.estado}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, estado: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">CEP</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.cep}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, cep: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditarPacienteModal(false);
                    setPacienteEditando(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarPaciente}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Banner */}
      {showEditarBannerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto text-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-900">
                {bannerEditando ? 'Editar Banner' : 'Novo Banner'}
              </h3>
            </div>
            <div className="p-6 bg-white">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={dadosBanner.titulo}
                    onChange={(e) => setDadosBanner({ ...dadosBanner, titulo: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Título do banner"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Banner *</label>
                  
                  {/* Upload de arquivo */}
                  <div className="mt-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploadingImage ? (
                          <>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CCB7A] mb-2"></div>
                            <p className="text-sm text-gray-600">Enviando imagem...</p>
                          </>
                        ) : dadosBanner.imagemUrl ? (
                          <>
                            <Image className="w-8 h-8 text-green-600 mb-2" />
                            <p className="text-sm text-gray-600">Clique para trocar a imagem</p>
                            <p className="text-xs text-gray-500 mt-1">ou arraste uma nova imagem aqui</p>
                          </>
                        ) : (
                          <>
                            <Image className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">Clique para fazer upload</p>
                            <p className="text-xs text-gray-500 mt-1">ou arraste a imagem aqui</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP (máx. 5MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validar tamanho (5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              setMessage('Imagem muito grande. Tamanho máximo: 5MB');
                              return;
                            }
                            
                            try {
                              const url = await handleUploadBannerImage(file);
                              setDadosBanner({ ...dadosBanner, imagemUrl: url });
                              setMessage('Imagem enviada com sucesso!');
                            } catch (error) {
                              console.error('Erro ao fazer upload:', error);
                              setMessage('Erro ao fazer upload da imagem. Tente novamente.');
                            }
                          }
                        }}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  
                  {/* Preview da imagem */}
                  {dadosBanner.imagemUrl && !uploadingImage && (
                    <div className="mt-3">
                      <img
                        src={dadosBanner.imagemUrl}
                        alt="Preview"
                        className="w-full h-48 object-contain border border-gray-200 rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Campo alternativo para URL manual (opcional) */}
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-800">
                      Ou insira uma URL manualmente
                    </summary>
                    <input
                      type="text"
                      value={dadosBanner.imagemUrl}
                      onChange={(e) => setDadosBanner({ ...dadosBanner, imagemUrl: e.target.value })}
                      className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </details>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local do Banner *</label>
                  <select
                    value={dadosBanner.local}
                    onChange={(e) => setDadosBanner({ ...dadosBanner, local: e.target.value as 'home' | 'meta' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="home">Home (www.oftware.com.br)</option>
                    <option value="meta">Meta (www.oftware.com.br/meta)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Selecione onde o banner será exibido
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formato do Conteúdo</label>
                  <select
                    value={dadosBanner.formato}
                    onChange={(e) => {
                      const novoFormato = e.target.value as 'html' | 'json';
                      console.log('Formato mudado para:', novoFormato);
                      setDadosBanner({
                        ...dadosBanner,
                        formato: novoFormato,
                        conteudoHtml: novoFormato === 'html' ? dadosBanner.conteudoHtml : '',
                        conteudoJson: novoFormato === 'json' ? (dadosBanner.conteudoJson || { sections: [] }) : undefined
                      });
                      setJsonError('');
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="json">JSON/TypeScript (Recomendado)</option>
                    <option value="html">HTML</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Escolha o formato do conteúdo que será exibido quando o banner for clicado
                  </p>
                </div>

                {dadosBanner.formato === 'json' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conteúdo JSON
                    </label>
                    <textarea
                      value={JSON.stringify(dadosBanner.conteudoJson || { sections: [] }, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          // Se o JSON foi parseado com sucesso e tem sections, mudar formato para json
                          if (parsed && typeof parsed === 'object' && parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
                            console.log('JSON válido detectado, mudando formato para json');
                            setDadosBanner({
                              ...dadosBanner,
                              conteudoJson: parsed,
                              formato: 'json', // Mudar formato automaticamente para json
                              conteudoHtml: '' // Limpar HTML quando muda para JSON
                            });
                          } else {
                            setDadosBanner({
                              ...dadosBanner,
                              conteudoJson: parsed
                            });
                          }
                          setJsonError('');
                        } catch (error) {
                          setJsonError('JSON inválido: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
                        }
                      }}
                      className={`w-full border rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 font-mono text-sm ${
                        jsonError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      rows={20}
                      placeholder={`{\n  "sections": [\n    {\n      "type": "heading",\n      "heading": "Título",\n      "level": 1\n    },\n    {\n      "type": "text",\n      "text": "Texto do conteúdo"\n    }\n  ]\n}`}
                    />
                    {jsonError && (
                      <p className="mt-1 text-xs text-red-600">{jsonError}</p>
                    )}
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-800">
                        Ver exemplos de tipos de seções disponíveis
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 space-y-2">
                        <div>
                          <strong>Heading:</strong>
                          <pre className="mt-1">{`{
  "type": "heading",
  "heading": "Título",
  "level": 1
}`}</pre>
                        </div>
                        <div>
                          <strong>Text:</strong>
                          <pre className="mt-1">{`{
  "type": "text",
  "text": "Parágrafo de texto"
}`}</pre>
                        </div>
                        <div>
                          <strong>Image:</strong>
                          <pre className="mt-1">{`{
  "type": "image",
  "imageUrl": "https://exemplo.com/imagem.jpg",
  "imageAlt": "Descrição"
}`}</pre>
                        </div>
                        <div>
                          <strong>Button:</strong>
                          <pre className="mt-1">{`{
  "type": "button",
  "buttonText": "Clique aqui",
  "buttonLink": "https://exemplo.com",
  "buttonStyle": "primary"
}`}</pre>
                        </div>
                        <div>
                          <strong>List:</strong>
                          <pre className="mt-1">{`{
  "type": "list",
  "items": ["Item 1", "Item 2", "Item 3"]
}`}</pre>
                        </div>
                      </div>
                    </details>
                    <p className="mt-1 text-xs text-gray-500">
                      Use o formato JSON estruturado para criar conteúdo dinâmico. Tipos disponíveis: heading, text, image, button, list, video, divider
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo HTML</label>
                    <textarea
                      value={dadosBanner.conteudoHtml || ''}
                      onChange={(e) => setDadosBanner({ ...dadosBanner, conteudoHtml: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                      rows={15}
                      placeholder="<html>...</html>"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      HTML completo que será exibido quando o banner for clicado
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                    <input
                      type="number"
                      value={dadosBanner.ordem}
                      onChange={(e) => setDadosBanner({ ...dadosBanner, ordem: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#E8EDED]/90 mb-1">Status</label>
                    <select
                      value={dadosBanner.ativo ? 'ativo' : 'inativo'}
                      onChange={(e) => setDadosBanner({ ...dadosBanner, ativo: e.target.value === 'ativo' })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditarBannerModal(false);
                    setBannerEditando(null);
                    setDadosBanner({
                      titulo: '',
                      imagemUrl: '',
                      conteudoHtml: '',
                      conteudoJson: undefined,
                      formato: 'json',
                      local: pastaBannerAtiva,
                      ativo: true,
                      ordem: 0
                    });
                    setJsonError('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarBanner}
                  disabled={loading}
                  className="px-4 py-2 bg-[#4CCB7A] text-[#0A1F44] text-sm font-semibold rounded-md hover:bg-[#45b86d] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Nutricionista */}
      {showDetalhesNutriModal && nutriDetalhes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#E8EDED]">Detalhes do Nutricionista</h2>
                <button
                  onClick={() => {
                    setShowDetalhesNutriModal(false);
                    setNutriDetalhes(null);
                  }}
                  className="text-gray-400 hover:text-[#E8EDED]/70"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nome</label>
                  <p className="mt-1 text-sm text-gray-900">{nutriDetalhes.nome}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{nutriDetalhes.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">User ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{nutriDetalhes.userId}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Registro (CRN / Número)</label>
                  <p className="mt-1 text-sm text-gray-900">{nutriDetalhes.registroNumero || 'Não informado'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Telefone para contato</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {nutriDetalhes.telefone ? (
                      <a
                        href={`https://wa.me/55${nutriDetalhes.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        title={`WhatsApp: ${nutriDetalhes.telefone}`}
                      >
                        <Phone size={16} />
                        {nutriDetalhes.telefone}
                      </a>
                    ) : (
                      'Não informado'
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Cidades Atendidas</label>
                  {nutriDetalhes.cidades.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {nutriDetalhes.cidades.map((cidade, idx) => (
                        <p key={idx} className="text-sm text-gray-900">
                          {cidade.cidade}, {cidade.estado}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">Nenhuma cidade cadastrada</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Status de Verificação</label>
                  <p className="mt-1">
                    {nutriDetalhes.isVerificado ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center w-fit">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Verificado
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center w-fit">
                        <Shield className="w-3 h-3 mr-1" />
                        Não Verificado
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      nutriDetalhes.status === 'ativo'
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {nutriDetalhes.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Vínculos com Médicos</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {nutriDetalhes.medicoVinculadoIds.length} vínculo{nutriDetalhes.medicoVinculadoIds.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Data de Cadastro</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {nutriDetalhes.dataCadastro ? new Date(nutriDetalhes.dataCadastro).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowDetalhesNutriModal(false);
                    setNutriDetalhes(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Personal Trainer */}
      {showDetalhesPersonalModal && personalDetalhes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl hover:border-[#4CCB7A]/30 transition-colors-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#E8EDED]">Detalhes do Personal Trainer</h2>
                <button
                  onClick={() => {
                    setShowDetalhesPersonalModal(false);
                    setPersonalDetalhes(null);
                  }}
                  className="text-gray-400 hover:text-[#E8EDED]/70"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Nome</label>
                  <p className="mt-1 text-sm text-gray-900">{personalDetalhes.nome}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{personalDetalhes.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">User ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{personalDetalhes.userId}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Registro (CREF / Número)</label>
                  <p className="mt-1 text-sm text-gray-900">{personalDetalhes.registroNumero || 'Não informado'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Telefone para contato</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {personalDetalhes.telefone ? (
                      <a
                        href={`https://wa.me/55${personalDetalhes.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        title={`WhatsApp: ${personalDetalhes.telefone}`}
                      >
                        <Phone size={16} />
                        {personalDetalhes.telefone}
                      </a>
                    ) : (
                      'Não informado'
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Cidades Atendidas</label>
                  {personalDetalhes.cidades.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {personalDetalhes.cidades.map((cidade, idx) => (
                        <p key={idx} className="text-sm text-gray-900">
                          {cidade.cidade}, {cidade.estado}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">Nenhuma cidade cadastrada</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Status de Verificação</label>
                  <p className="mt-1">
                    {personalDetalhes.isVerificado ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center w-fit">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Verificado
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center w-fit">
                        <Shield className="w-3 h-3 mr-1" />
                        Não Verificado
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      personalDetalhes.status === 'ativo'
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {personalDetalhes.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Vínculos com Médicos</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {personalDetalhes.medicoVinculadoIds.length} vínculo{personalDetalhes.medicoVinculadoIds.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E8EDED]/90">Data de Cadastro</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {personalDetalhes.dataCadastro ? new Date(personalDetalhes.dataCadastro).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowDetalhesPersonalModal(false);
                    setPersonalDetalhes(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: barra lateral (drawer) que expande pelo ícone de menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0A1F44] border-r border-white/10 shadow-xl z-50 lg:hidden flex flex-col overflow-hidden">
            <div className="flex items-center justify-between h-14 px-4 border-b border-white/10 shrink-0">
              <MetaAdminGeralBrandMark variant="mobile" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-md text-[#E8EDED]/70 hover:bg-white/10"
                aria-label="Fechar menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <MetaAdminGeralNavShell
              navContext={navContext}
              activeMenu={activeMenu}
              activeOrganizationId={activeOrganizationId}
              onNavContextChange={setNavContext}
              onOrganizationChange={setActiveOrganizationId}
              onSelectMenu={(id) => {
                selectMenu(id);
                setMobileMenuOpen(false);
              }}
            />
            <div className="px-3 py-4 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-md transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
