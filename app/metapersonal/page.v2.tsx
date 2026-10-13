'use client';

// Estrutura idêntica ao /metanutri, adaptada para Personal Trainers

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { PersonalTrainerService } from '@/services/personalTrainerService';
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
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { PacientePersonalTrainerService } from '@/services/pacientePersonalTrainerService';
import { PagamentoService } from '@/services/pagamentoService';
import { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';
import { PacienteService } from '@/services/pacienteService';
import { 
  Activity, 
  Dumbbell,
  Home,
  LayoutDashboard, 
  Stethoscope, 
  Users, 
  DollarSign, 
  Calendar, 
  X, 
  UserCircle, 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Link as LinkIcon,
  Shield,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Clock,
  Copy,
  ExternalLink,
  Menu,
  Search,
  UserPlus,
  Kanban,
  Send,
  Phone,
  MessageSquare,
  Mail,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Edit,
  Syringe,
  FlaskConical,
  Scale,
  FileText,
  BarChart3,
  Plus,
  Pill,
  User as UserIcon,
  Save,
  ClipboardList,
  Printer,
  UtensilsCrossed,
  Bell,
  History,
  Brain,
  Droplet,
  Coffee,
  Sun,
  Sunset,
  Moon,
  TrendingUp,
  AlertTriangle,
  Star,
  MessageCircle,
  Building,
  HelpCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ClassificacaoProfissionalService, type DetalhamentoClassificacao } from '@/services/classificacaoProfissionalService';
import { BioImpedanciaDisplay } from '@/components/bodymap/BioImpedanciaDisplay';
import { salvarBioImpedanciaRegistros } from '@/services/bioImpedanciaService';
import { estadosCidades, estadosList } from '@/data/cidades-brasil';
import { MedicoService } from '@/services/medicoService';
import OrganizacaoComunicacaoGmailPanel from '@/components/comunicacao/OrganizacaoComunicacaoGmailPanel';
import { loadDestinatariosMetapersonal } from '@/lib/organizacaoMensagem/loadDestinatarios';
import type { OrganizacaoMensagemPacienteAnexo } from '@/lib/organizacaoMensagem/types';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import WhatsappConnectionSection from '@/components/metaadmin/WhatsappConnectionSection';
import SolicitacoesPacientesCarousel from '@/components/metaadmin/SolicitacoesPacientesCarousel';
import WhatsappConnectHintBalloon from '@/components/whatsapp/WhatsappConnectHintBalloon';
import WhatsappConnectPromptModal from '@/components/whatsapp/WhatsappConnectPromptModal';
import { useWhatsappConnectHint } from '@/hooks/useWhatsappConnectHint';
import MedicoFotoPerfilEditor from '@/components/metaadmin/MedicoFotoPerfilEditor';
import { InternationalPhoneInput } from '@/components/phone/InternationalPhoneInput';
import { isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';
import { professionalPhoneWriteFields, phoneFieldsFromProfessional } from '@/lib/whatsapp/resolveProfessionalPhone';
import MetapersonalHomeLeadsPipeline from '@/components/metapersonal/MetapersonalHomeLeadsPipeline';
import MetapersonalTreinosPage from '@/components/metapersonal/treinos/MetapersonalTreinosPage';
import MetapersonalPacienteTreinoPanel from '@/components/metapersonal/treinos/MetapersonalPacienteTreinoPanel';
import MetapersonalHistoricoPage from '@/components/metapersonal/historico/MetapersonalHistoricoPage';
import { BarraFaixaAplicacoes } from '@/components/metaadmin/BarraFaixaAplicacoes';
import PatientDetailsMobileModal from '@/components/paciente/PatientDetailsMobileModal';
import {
  calcMetaProgressPct,
  countAplicacoesProgress,
  resolveMetaAbdominalCmLoss,
  resolveMetaPesoKgLoss,
} from '@/lib/paciente/metaProgresso';
import { buildPatientWhatsappUrl, buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import type { PacienteCompartilhadoCrmItem } from '@/components/crm/profissional/LeadsProfissionalCrmView';
import ModalNovoLembrete, {
  type ModalNovoLembreteInitialValues,
} from '@/components/metaadmin/ModalNovoLembrete';
import { Medico } from '@/types/medico';
import { PacienteCompleto } from '@/types/obesidade';
import { PacienteVisivelPersonal } from '@/services/pacientePersonalTrainerService';
import { SolicitacaoPersonalTrainerService } from '@/services/solicitacaoPersonalTrainerService';
import { SolicitacaoPersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { SolicitacaoVinculoPersonalMedicoService } from '@/services/solicitacaoVinculoPersonalMedicoService';
import { SolicitacaoVinculoPersonalMedicoDoc } from '@/features/metaPersonal/metaPersonal.types';
import { SOLICITACAO_STATUS } from '@/features/metaPersonal/metaPersonal.constants';
import { PrescricaoService } from '@/services/prescricaoService';
import { Prescricao, PrescricaoItem } from '@/types/prescricao';
import jsPDF from 'jspdf';
import { SolicitacaoNutricionistaService } from '@/services/solicitacaoNutricionistaService';
import { NutricionistaService } from '@/services/nutricionistaService';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { SOLICITACAO_STATUS as SOLICITACAO_STATUS_NUTRI } from '@/features/metaNutri/metaNutri.constants';
import { trainingSessionService } from '@/services/trainingSessionService';
import type { TrainingSession, TrainingSessionExercise, TrainingReminderPrefs } from '@/types/trainingSession';
import type { Exercise } from '@/types/exercise';
import {
  formatTrainingSeriesSummary,
  getEffectiveRestSec,
  serializeTrainingPrescription,
} from '@/lib/personal/trainingExerciseSeries';
import { notifyPacienteTreinoPersonalClient } from '@/lib/personal/notifyPacienteTreinoPersonalClient';
import { translateExerciseName, translateBodyPart, translateTarget, translateEquipment } from '@/data/exerciseTranslations';
import CalendarioTreinosPersonal from '@/components/CalendarioTreinosPersonal';
import NutriContent from '@/components/NutriContent';
import PsiquiatriaContent from '@/components/psiquiatria/PsiquiatriaContent';
import { LabSectionScoreBadge } from '@/components/LabSectionScoreBadge';
import { LabMetabolicSummarySection } from '@/components/LabMetabolicSummarySection';
import {
  LabResultCard,
  LabStatusLegend,
  LabPatientHeaderCard,
  LabCompactScore,
} from '@/components/LabResultCard';
import PacienteModalHeader from '@/components/metaadmin/paciente-modal/PacienteModalHeader';
import ProfissionalVinculadosSplitView from '@/components/metaadmin/ProfissionalVinculadosSplitView';
import {
  MedicoAndamentoStatsBlock,
  VinculoFotoAvatar,
  VinculoMobilePacientesList,
} from '@/components/metaadmin/ProfissionalVinculoStats';
import { TratamentoPacienteMobileModal } from '@/components/metaadmin/TratamentoPacienteMobileModal';
import { bioTrendDir } from '@/utils/bioImpedanciaTrend';
import { calculateSectionMetabolicScore } from '@/lib/labExames/labSectionScore';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import type { Sex } from '@/types/labRanges';
import { getLabRange } from '@/utils/labRangesFromJson';
import { useLabOrderBySection } from '@/hooks/useLabOrderBySection';
import { EXAME_LABORATORIAL_KEY_TO_FIELD } from '@/lib/metaadmin/exameLaboratorialFormFields';
import { buildPatientLabSectionsFromOrder } from '@/lib/labExames/buildPatientLabSectionsFromOrder';
import TrendLine from '@/components/TrendLine';
import { PersonalPageContent } from '@/app/meta/personal/page';
import {
  MetapersonalPersonalPatientPicker,
  readPersonalPatientTabs,
  writePersonalPatientTabs,
  type PersonalPatientTab,
} from '@/components/metapersonal/shell/MetapersonalPersonalPatientTabs';
import MetaNutriPersonalWizard from '@/components/meta/MetaNutriPersonalWizard';
import ProfissionalCadastroGateModal from '@/components/meta/ProfissionalCadastroGateModal';
import CadastroVerificacaoScreen from '@/components/portal/CadastroVerificacaoScreen';
import ProfissionalFinanceiroSection from '@/components/profissional/ProfissionalFinanceiroSection';
import ProfissionalCalendarioSection from '@/components/profissional/ProfissionalCalendarioSection';
import type { ConsultaCalendarioItem } from '@/components/profissional/ProfissionalCalendarioSection';
import MetapersonalLeadsAgendaHub from '@/components/metapersonal/agenda/MetapersonalLeadsAgendaHub';
import MetapersonalPacienteWelcomeActions from '@/components/metapersonal/MetapersonalPacienteWelcomeActions';
import { personalAgendaAuthFetch } from '@/lib/personal/agenda/personalAgendaAuthFetch';
import { EvolucaoSeguimentoReadonlyView } from '@/components/profissional/EvolucaoSeguimentoReadonlyView';
import {
  ControleFinanceiroPacientePanel,
} from '@/components/profissional/ControleFinanceiroPacientePanel';
import { getStatusPagamentoPaciente } from '@/lib/metaadmin/buildFinanceiroRelatorioTransacoes';
import { ModalGraficoERegistrosPaciente } from '@/components/paciente/ModalGraficoERegistrosPaciente';
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
import { getExameCampoNumerico } from '@/lib/labExames/exameCampoNumerico';
import { ProntuarioNutriTab } from '@/app/metaadmin/components/paciente-modal/prontuario/ProntuarioNutriTab';
import { ExamesImagemPacientePanel } from '@/components/metaadmin/ExamesImagemPacientePanel';
import { PacienteIdentificacaoTabContent } from '@/components/metaadmin/paciente-modal/PacienteIdentificacaoTabContent';
import { PacienteDadosClinicosTabContent } from '@/components/metaadmin/paciente-modal/PacienteDadosClinicosTabContent';
import { LembreteService } from '@/services/lembreteService';
import type { Lembrete } from '@/types/lembrete';
import { LEMBRETE_TAGS_PERSONAL } from '@/types/lembrete';

type MenuPersonal = 'home' | 'leads' | 'medicos' | 'pacientes' | 'treinos' | 'historico' | 'financeiro' | 'calendario' | 'meu-perfil' | 'comunicacao';

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

function MetaPersonalPageV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { labOrderBySection: labOrderBySecaoConfig, labLimitOverrides, labSectionLabels } = useLabOrderBySection();

  // Estados de navegação e layout
  const [activeMenu, setActiveMenu] = useState<MenuPersonal>('home');
  useEffect(() => {
    if (searchParams.get('menu') === 'pacientes') setActiveMenu('pacientes');
  }, [searchParams]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabletNavOpen, setTabletNavOpen] = useState(false);
  const [tabletPastasOpen, setTabletPastasOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMensagensComunicacaoModal, setShowMensagensComunicacaoModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [meuPerfilAba, setMeuPerfilAba] = useState<'dados' | 'endereco' | 'cidades' | 'assinatura' | 'link' | 'whatsapp'>('dados');
  
  // Estados de autenticação e dados
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    showBalloon: showWhatsappConnectHint,
    showPrompt: showWhatsappConnectPrompt,
    dismissPrompt: dismissWhatsappConnectPrompt,
    dismissBalloon: dismissWhatsappConnectBalloon,
  } = useWhatsappConnectHint({
    apiBasePath: '/api/metapersonal/whatsapp',
    ready: !!user,
    getAuthToken: async () => {
      const current = auth.currentUser ?? user;
      if (!current) return null;
      return current.getIdToken();
    },
  });
  useEffect(() => {
    if (activeMenu === 'meu-perfil' && meuPerfilAba === 'whatsapp') {
      dismissWhatsappConnectPrompt();
      dismissWhatsappConnectBalloon();
    }
  }, [activeMenu, meuPerfilAba, dismissWhatsappConnectPrompt, dismissWhatsappConnectBalloon]);
  const [personalTrainer, setPersonalTrainer] = useState<PersonalTrainerDoc | null>(null);
  const [agregadoPersonal, setAgregadoPersonal] = useState<{ count: number; media: number } | null>(null);
  const [showModalClassificacaoVisualizar, setShowModalClassificacaoVisualizar] = useState(false);
  const [detalhamentoVisualizar, setDetalhamentoVisualizar] = useState<DetalhamentoClassificacao | null>(null);
  const [loadingPersonalTrainer, setLoadingPersonalTrainer] = useState(true);
  const [salvandoCadastroPersonal, setSalvandoCadastroPersonal] = useState(false);
  const [criandoCadastroPersonal, setCriandoCadastroPersonal] = useState(false);
  const [metaPersonalLoadTick, setMetaPersonalLoadTick] = useState(0);
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
  
  // Estados para perfil
  const [registroNumero, setRegistroNumero] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [telefoneDdiContato, setTelefoneDdiContato] = useState('');
  const [telefonePaisContato, setTelefonePaisContato] = useState('');
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<{ estado: string; cidade: string }[]>([]);
  const [estadoSelecionado, setEstadoSelecionado] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState('');
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
  const [isSaving, setIsSaving] = useState(false);
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
  
  // Estados para seção Médicos
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
  
  // Estados para busca de médicos disponíveis
  const [medicosDisponiveis, setMedicosDisponiveis] = useState<Medico[]>([]);
  const [loadingMedicosDisponiveis, setLoadingMedicosDisponiveis] = useState(false);
  const [estadoBuscaMedico, setEstadoBuscaMedico] = useState('');
  const [cidadeBuscaMedico, setCidadeBuscaMedico] = useState('');
  const [estadosComMedicosBusca, setEstadosComMedicosBusca] = useState<string[]>([]);
  const [cidadesComMedicosBusca, setCidadesComMedicosBusca] = useState<{ estado: string; cidade: string }[]>([]);
  const [loadingEstadosCidadesMedicos, setLoadingEstadosCidadesMedicos] = useState(false);
  
  // Estados para solicitações de vínculo
  const [solicitacoesVinculo, setSolicitacoesVinculo] = useState<SolicitacaoVinculoPersonalMedicoDoc[]>([]);
  const [loadingSolicitacoesVinculo, setLoadingSolicitacoesVinculo] = useState(false);
  const [solicitacoesVinculoRecebidas, setSolicitacoesVinculoRecebidas] = useState<SolicitacaoVinculoPersonalMedicoDoc[]>([]);
  const [loadingSolicitacoesVinculoRecebidas, setLoadingSolicitacoesVinculoRecebidas] = useState(false);
  
  const [medicoDisponivelExpandidoId, setMedicoDisponivelExpandidoId] = useState<string | null>(null);
  const [medicoExpandidoId, setMedicoExpandidoId] = useState<string | null>(null);
  const [filtroMobileMedicosVinculados, setFiltroMobileMedicosVinculados] = useState<'todos' | 'pendente' | 'ativo'>('todos');
  useEffect(() => {
    setFiltroMobileMedicosVinculados('todos');
  }, [medicoExpandidoId]);
  const [vinculosCache, setVinculosCache] = useState<Array<{
    pacienteId: string;
    medicoId: string;
    dataCompartilhamento: Date;
  }>>([]);
  const [pacientesPorMedico, setPacientesPorMedico] = useState<Map<string, Array<{
    paciente: PacienteCompleto;
    dataCompartilhamento: Date;
  }>>>(new Map());
  const [loadingPacientesPorMedico, setLoadingPacientesPorMedico] = useState<Set<string>>(new Set());

  // Estados para seção Pacientes
  const [pacientesVisiveis, setPacientesVisiveis] = useState<PacienteVisivelPersonal[]>([]);
  const [personalPatientTabs, setPersonalPatientTabs] = useState<PersonalPatientTab[]>([]);
  const [personalTabPickerOpen, setPersonalTabPickerOpen] = useState(false);
  const personalViewPacienteId =
    searchParams.get('view') === 'personal' ? searchParams.get('pacienteId') || '' : '';

  const resolvePersonalTabNome = useCallback(
    (pacienteId: string) => {
      const item = pacientesVisiveis.find(
        (p) =>
          p.paciente?.id === pacienteId ||
          p.paciente?.userId === pacienteId ||
          p.pacienteId === pacienteId
      );
      return (
        item?.paciente?.dadosIdentificacao?.nomeCompleto?.trim() ||
        item?.paciente?.nome?.trim() ||
        'Paciente'
      );
    },
    [pacientesVisiveis]
  );

  const personalPickerPatients = useMemo(() => {
    const seen = new Set<string>();
    const rows: PersonalPatientTab[] = [];
    for (const item of pacientesVisiveis) {
      const id = item.paciente?.id || item.paciente?.userId || item.pacienteId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({ id, nome: resolvePersonalTabNome(id) });
    }
    rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return rows;
  }, [pacientesVisiveis, resolvePersonalTabNome]);

  const personalTabsUi = useMemo(() => {
    if (!personalViewPacienteId) return personalPatientTabs;
    if (personalPatientTabs.some((tab) => tab.id === personalViewPacienteId)) return personalPatientTabs;
    return [
      ...personalPatientTabs,
      { id: personalViewPacienteId, nome: resolvePersonalTabNome(personalViewPacienteId) },
    ];
  }, [personalPatientTabs, personalViewPacienteId, resolvePersonalTabNome]);

  useEffect(() => {
    if (!personalViewPacienteId) return;
    setPersonalPatientTabs((prev) => {
      const base = prev.length > 0 ? prev : readPersonalPatientTabs();
      const withCurrent =
        base.some((tab) => tab.id === personalViewPacienteId)
          ? base
          : [...base, { id: personalViewPacienteId, nome: resolvePersonalTabNome(personalViewPacienteId) }];
      const next = withCurrent.map((tab) => {
        const nome = resolvePersonalTabNome(tab.id);
        return nome !== 'Paciente' && nome !== tab.nome ? { ...tab, nome } : tab;
      });
      const unchanged =
        next.length === prev.length && next.every((tab, index) => tab.id === prev[index]?.id && tab.nome === prev[index]?.nome);
      if (unchanged) return prev;
      writePersonalPatientTabs(next);
      return next;
    });
  }, [personalViewPacienteId, resolvePersonalTabNome]);

  const selectPersonalPatientTab = useCallback(
    (id: string) => {
      if (!id || id === personalViewPacienteId) return;
      router.replace(`/metapersonal?view=personal&pacienteId=${id}`);
    },
    [personalViewPacienteId, router]
  );

  const addPersonalPatientTab = useCallback(
    (patient: PersonalPatientTab) => {
      setPersonalPatientTabs((prev) => {
        const base =
          prev.length > 0 ? prev : personalTabsUi.length > 0 ? personalTabsUi : readPersonalPatientTabs();
        const next = base.some((tab) => tab.id === patient.id) ? base : [...base, patient];
        writePersonalPatientTabs(next);
        return next;
      });
      setPersonalTabPickerOpen(false);
      if (patient.id !== personalViewPacienteId) {
        router.replace(`/metapersonal?view=personal&pacienteId=${patient.id}`);
      }
    },
    [personalTabsUi, personalViewPacienteId, router]
  );

  const closePersonalPatientTab = useCallback(
    (id: string) => {
      const source = personalPatientTabs.length > 0 ? personalPatientTabs : personalTabsUi;
      const next = source.filter((tab) => tab.id !== id);
      writePersonalPatientTabs(next);
      setPersonalPatientTabs(next);
      if (personalViewPacienteId !== id) return;
      if (next.length === 0) {
        router.push('/metapersonal');
        return;
      }
      const index = source.findIndex((tab) => tab.id === id);
      const fallback = next[Math.max(0, Math.min(index, next.length - 1))];
      router.replace(`/metapersonal?view=personal&pacienteId=${fallback.id}`);
    },
    [personalPatientTabs, personalTabsUi, personalViewPacienteId, router]
  );

  const closeAllPersonalPatientTabs = useCallback(() => {
    writePersonalPatientTabs([]);
    setPersonalPatientTabs([]);
    setPersonalTabPickerOpen(false);
    router.push('/metapersonal');
  }, [router]);

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

  // Estados para solicitações pendentes
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<SolicitacaoPersonalTrainerDoc[]>([]);
  const [loadingSolicitacoesPendentes, setLoadingSolicitacoesPendentes] = useState(false);
  const [aceitandoSolicitacaoId, setAceitandoSolicitacaoId] = useState<string | null>(null);
  const aceitandoSolicitacaoIdRef = useRef<string | null>(null);
  
  // Estados para modal de visualização / edição (11 abas)
  const [showVisualizarPacienteModal, setShowVisualizarPacienteModal] = useState(false);
  const [abrindoPacienteLoading, setAbrindoPacienteLoading] = useState(false);
  const abrindoPacienteLoadingRef = useRef(false);
  const [pacienteVisualizando, setPacienteVisualizando] = useState<PacienteCompleto | null>(null);
  /** Quando true, modal mobile mostra 3 abas (Identificação, Anamnese, Prontuário), igual metanutri */
  const [modalVisualizacaoEstiloPersonal, setModalVisualizacaoEstiloPersonal] = useState(false);
  const [pastaAtiva, setPastaAtiva] = useState(1); // Estado para controlar qual pasta está ativa no modal (1-10)
  const [showModalGraficoRegistros, setShowModalGraficoRegistros] = useState(false);
  const [pacienteParaGraficoRegistros, setPacienteParaGraficoRegistros] = useState<PacienteCompleto | null>(null);
  const pacienteIdsMedia = useMemo(
    () => pacientesVisiveis.map((p) => p.paciente.id).filter(Boolean),
    [pacientesVisiveis]
  );
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
  const { fotosPorPacienteId, marcarTemFoto } = useFotosCompartilhadasMedico(pacienteIdsMedia);
  const { abrirFotos, fotosModal } = usePacienteFotosCarouselModal(marcarTemFoto);
  const [depoimentoModalPaciente, setDepoimentoModalPaciente] = useState<{
    pacienteNome: string;
    paciente: PacienteCompleto;
  } | null>(null);
  const [showModalDetalheConclusao, setShowModalDetalheConclusao] = useState(false);
  const [registroConclusaoParaModal, setRegistroConclusaoParaModal] = useState<{ weekIndex: number; weekStart: Date; weekEnd: Date; peso?: number; pacienteNome?: string } | null>(null);
  const [exameDataSelecionadaNoModal, setExameDataSelecionadaNoModal] = useState<string>('');
  const [examesNutriSubpasta, setExamesNutriSubpasta] = useState<'laboratoriais' | 'imagem'>('laboratoriais');
  
  // Estados para modal de pagamento
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
    dataUltimaAtualizacao: new Date(),
  });

  // Estados para calendário
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [consultasAgenda, setConsultasAgenda] = useState<ConsultaCalendarioItem[]>([]);
  const [showPipelineLembreteModal, setShowPipelineLembreteModal] = useState(false);
  const [pipelineLembreteDraft, setPipelineLembreteDraft] = useState<ModalNovoLembreteInitialValues | undefined>();

  // Estados para modal de Exames
  const [showModalExames, setShowModalExames] = useState(false);
  const [showModalBioImpedancia, setShowModalBioImpedancia] = useState(false);
  const [pacienteBioImpedanciaSelecionado, setPacienteBioImpedanciaSelecionado] = useState<PacienteCompleto | null>(null);
  const [pacienteExamesSelecionado, setPacienteExamesSelecionado] = useState<PacienteCompleto | null>(null);
  /** Cache de photoURL do Firebase Auth (Google) por userId — via /api/user-photo. */
  const [patientPhotoByUserId, setPatientPhotoByUserId] = useState<Record<string, string | null>>({});
  const [exameDataSelecionada, setExameDataSelecionada] = useState('');
  const [secoesExpandidas, setSecoesExpandidas] = useState<Set<string>>(new Set());
  const [examesExpandidos, setExamesExpandidos] = useState<Set<string>>(new Set());
  /** Pastas colapsáveis da aba Exames (modal paciente desktop) */
  const [secoesExamesPastaExpandidas, setSecoesExamesPastaExpandidas] = useState<Set<string>>(new Set());
  const [showAdicionarExameModalMobile, setShowAdicionarExameModalMobile] = useState(false);
  const [indiceExameEditandoMobile, setIndiceExameEditandoMobile] = useState<number | null>(null);
  const [novoExameDataMobile, setNovoExameDataMobile] = useState<{
    dataColeta: string;
    [key: string]: any;
  }>({
    dataColeta: new Date().toISOString().split('T')[0]
  });

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
      pacienteBioImpedanciaSelecionado?.userId,
      pacienteAplicacoesSelecionado?.userId,
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
  }, [
    pacienteVisualizando?.userId,
    pacienteExamesSelecionado?.userId,
    pacienteBioImpedanciaSelecionado?.userId,
    pacienteAplicacoesSelecionado?.userId,
    pacienteDetalhesMobileUserId,
  ]);

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

  // Estados para modal de nutrição
  const [showModalNutricao, setShowModalNutricao] = useState(false);
  const [pacienteNutricaoSelecionado, setPacienteNutricaoSelecionado] = useState<PacienteCompleto | null>(null);
  const [planoNutricionalModal, setPlanoNutricionalModal] = useState<any>(null);
  const [checkinsNutricao, setCheckinsNutricao] = useState<any[]>([]);
  const [loadingNutricao, setLoadingNutricao] = useState(false);
  const [activeTabNutricao, setActiveTabNutricao] = useState<'plano' | 'checkins' | 'estatisticas' | 'chatnutri'>('plano');
  const [checkInSelecionado, setCheckInSelecionado] = useState<any | null>(null);
  const [mesCalendarioCheckIns, setMesCalendarioCheckIns] = useState(new Date());

  // Estados para compartilhamento com nutricionista
  const [nutricionistasElegiveis, setNutricionistasElegiveis] = useState<NutricionistaDoc[]>([]);
  const [loadingNutricionistasElegiveis, setLoadingNutricionistasElegiveis] = useState(false);
  const [enviandoCompartilhamentoNutri, setEnviandoCompartilhamentoNutri] = useState(false);
  const [vinculosAtivosPacienteNutri, setVinculosAtivosPacienteNutri] = useState<any[]>([]);
  const [solicitacoesCompartilhamentoPacienteNutri, setSolicitacoesCompartilhamentoPacienteNutri] = useState<any[]>([]);
  const [loadingSolicitacoesCompartilhamentoNutri, setLoadingSolicitacoesCompartilhamentoNutri] = useState(false);
  const [pacientesComNutricao, setPacientesComNutricao] = useState<Record<string, boolean>>({});

  // Estados para modal de Personal Trainer (edição de treino)
  const [showModalPersonal, setShowModalPersonal] = useState(false);
  const [pacientePersonalSelecionado, setPacientePersonalSelecionado] = useState<PacienteCompleto | null>(null);
  
  // Estados para tabs do modal (igual à página /meta/personal)
  const [activeTabPersonal, setActiveTabPersonal] = useState<'hoje' | 'cronograma' | 'criar' | 'historico' | 'estatisticas' | 'lembretes'>('hoje');
  
  // Estados para treino de hoje
  const [todaySessions, setTodaySessions] = useState<TrainingSession[]>([]);
  const [selectedTodaySessionId, setSelectedTodaySessionId] = useState<string | null>(null);
  const [todayExercises, setTodayExercises] = useState<TrainingSessionExercise[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [patientNotes, setPatientNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Estados do calendário
  const [mesCalendarioPersonal, setMesCalendarioPersonal] = useState(new Date());
  const [semanaCalendarioPersonal, setSemanaCalendarioPersonal] = useState(new Date());
  const [visualizacaoCalendarioPersonal, setVisualizacaoCalendarioPersonal] = useState<'mes' | 'semana'>('semana');
  const [diaSelecionadoPersonal, setDiaSelecionadoPersonal] = useState<Date | null>(null);
  const [sessoesCalendarioPersonal, setSessoesCalendarioPersonal] = useState<TrainingSession[]>([]);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<TrainingSession | null>(null);
  const [selectedSessionExercisesDetail, setSelectedSessionExercisesDetail] = useState<TrainingSessionExercise[]>([]);
  const [deletingSession, setDeletingSession] = useState(false);
  const [deletingExercise, setDeletingExercise] = useState<string | null>(null);
  
  // Estados do Criar Treino
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [targets, setTargets] = useState<string[]>([]);
  const [equipments, setEquipments] = useState<string[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [exercisesResults, setExercisesResults] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Array<Exercise & { sets: number; reps: number; restSec: number }>>([]);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [sessionType, setSessionType] = useState<'single' | 'recurring'>('single');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'custom'>('weekly');
  const [weeksCount, setWeeksCount] = useState(4);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [creatingSession, setCreatingSession] = useState(false);
  
  // Estados do Histórico
  const [historicoSessions, setHistoricoSessions] = useState<TrainingSession[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<TrainingSession | null>(null);
  const [selectedSessionExercises, setSelectedSessionExercises] = useState<TrainingSessionExercise[]>([]);
  
  // Estados de Estatísticas
  const [adherence7d, setAdherence7d] = useState(0);
  const [adherence30d, setAdherence30d] = useState(0);
  const [treinosPorSemana, setTreinosPorSemana] = useState<number[]>([]);
  
  // Estados de Lembretes
  const [reminderPrefs, setReminderPrefs] = useState<TrainingReminderPrefs | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);

  // Estados para mensagens não lidas
  const [mensagensNaoLidasPorPaciente, setMensagensNaoLidasPorPaciente] = useState<Record<string, number>>({});

  // Estados para pacientes com treinos (Personal Trainer)
  const [pacientesComTreinos, setPacientesComTreinos] = useState<Set<string>>(new Set());

  // Estados para Home (KPIs e filtros - padrão metanutri)
  const [medicosVinculados, setMedicosVinculados] = useState(0);
  const [loadingKPIs, setLoadingKPIs] = useState(false);
  const [filtroBaseDashboard, setFiltroBaseDashboard] = useState<'meus' | 'oftware'>('meus');
  const [filtroDosePerdaPeso, setFiltroDosePerdaPeso] = useState<string>('todas');
  const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState<string>('todas');
  const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState<string>('todos');
  const [todosPacientesOftware, setTodosPacientesOftware] = useState<PacienteCompleto[]>([]);
  const [loadingTodosPacientes, setLoadingTodosPacientes] = useState(false);

  // --- Prescrições: subtipos (runtime, sem alterar Firestore) ---
  type PrescricaoSubtipo =
    | 'Recibo Educador Físico'
    | 'Gastrointestinal'
    | 'Massa Magra & Performance'
    | 'Metabólico / Glicêmico'
    | 'Micronutrientes'
    | 'Sono & Comportamento'
    | 'Hepático / Cardiometabólico'
    | 'Outros';

  const SUBTIPOS_ORDER: PrescricaoSubtipo[] = [
    'Recibo Educador Físico',
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

  function getSubtipoPrescricao(p: { nome?: string; descricao?: string; observacoes?: string }): PrescricaoSubtipo {
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

    if (txt.includes('recibo')) return 'Recibo Educador Físico';
    if (txt.includes('tirzepatida') || txt.includes('mounjaro') || txt.includes('zepbound') || txt.includes('base do tratamento')) return 'Outros';
    if (txt.includes('probiótico') || txt.includes('probiotico') || txt.includes('inulina') || txt.includes('fos') || txt.includes('constip') || txt.includes('náuse') || txt.includes('nause') || txt.includes('empach') || txt.includes('magnésio') || txt.includes('magnesio')) return 'Gastrointestinal';
    if (txt.includes('hmb') || txt.includes('whey') || txt.includes('leucina') || txt.includes('creatina') || txt.includes('massa magra') || txt.includes('sarcopen')) return 'Massa Magra & Performance';
    if (txt.includes('berberina') || txt.includes('cromo') || txt.includes('insulina') || txt.includes('resist') || txt.includes('glic') || txt.includes('homa')) return 'Metabólico / Glicêmico';
    if (txt.includes('vitamina d') || txt.includes('colecalciferol') || txt.includes('b12') || txt.includes('metilcobalamina') || txt.includes('zinco') || txt.includes('selênio') || txt.includes('selenio') || txt.includes('ferrit')) return 'Micronutrientes';
    if (txt.includes('sono') || txt.includes('insônia') || txt.includes('insonia') || txt.includes('melaton') || txt.includes('teanina') || txt.includes('glicina') || txt.includes('compuls')) return 'Sono & Comportamento';
    if (txt.includes('silimarina') || txt.includes('colina') || txt.includes('inositol') || txt.includes('esteat') || txt.includes('tgo') || txt.includes('tgp') || txt.includes('ggt') || txt.includes('omega') || txt.includes('coq10') || txt.includes('ldl') || txt.includes('hdl') || txt.includes('trig')) return 'Hepático / Cardiometabólico';
    return 'Outros';
  }

  function groupBySubtipo<T extends { nome?: string; descricao?: string; observacoes?: string }>(arr: T[]) {
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

  // Event listeners para arrastar o marcador de IMC (mouse)
  useEffect(() => {
    if (!isDraggingIMC || !pacienteArrastandoIMC) return;

    const handleMouseMove = (e: MouseEvent) => {
      const barraRef = barraIMCRef.current[pacienteArrastandoIMC];
      if (!barraRef) return;

      const rect = barraRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));

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

      const imcParaPeso = (imc: number): number => imc * (alturaMetros * alturaMetros);

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
      if (e.cancelable) e.preventDefault();

      const rect = barraRef.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));

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

      const imcParaPeso = (imc: number): number => imc * (alturaMetros * alturaMetros);

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

  /** YYYY-MM-DD em horário local (scheduledDate no Firestore é local). */
  function toLocalYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Constrói a URL do GIF do exercício usando nossa rota proxy
   * A API ExerciseDB não retorna gifUrl diretamente, mas fornece via endpoint /image
   * Usamos nossa rota proxy para autenticar com a RapidAPI key
   */
  function getExerciseGifUrl(exerciseId: string, resolution: '180' | '360' | '720' | '1080' = '360'): string {
    return `/api/exercisedb/image?exerciseId=${exerciseId}&resolution=${resolution}`;
  }

  // Interação (abrir paciente, pastas do modal). O chrome visual do shell
  // usa CSS/Tailwind (xl = desktop). Não usar este flag para layout estrutural.
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Verificar autenticação e carregar personal trainer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setPersonalTrainer(null);
        setRegistroNumero('');
        setTelefoneContato('');
        setTelefoneDdiContato('');
        setTelefonePaisContato('');
        setCidadesSelecionadas([]);
        setLoadingPersonalTrainer(false);
        setLoading(false);
        router.push('/');
        return;
      }

      setUser(firebaseUser);
      setLoadingPersonalTrainer(true);

      try {
        let personalDoc: PersonalTrainerDoc | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            personalDoc = await PersonalTrainerService.getPersonalTrainerByUserId(firebaseUser.uid);
            break;
          } catch (error) {
            if (attempt === 1) throw error;
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
        setPersonalTrainer(personalDoc);
        setRegistroNumero(personalDoc?.registroNumero || '');
        setTelefoneContato(personalDoc?.telefone || '');
        setTelefoneDdiContato(personalDoc?.telefoneDdi || '');
        setTelefonePaisContato(personalDoc?.telefonePais || '');
        setCidadesSelecionadas(personalDoc?.cidades || []);
        setPerfilGenero((personalDoc?.genero as 'M' | 'F' | '') || '');
        setPerfilInstagram(personalDoc?.instagramUsuario || '');
        setPerfilCep(personalDoc?.cep || '');
        setPerfilNomeLocal(personalDoc?.nomeLocal || '');
        setPerfilEndereco(personalDoc?.endereco || '');
        setPerfilNumero(personalDoc?.numero || '');
        setPerfilPontoRef(personalDoc?.pontoReferencia || '');
        setPerfilGoogleMaps(personalDoc?.googleMapsUrl || '');
        setPerfilFotoUrl(personalDoc?.fotoPerfilUrl || firebaseUser.photoURL || null);
      } catch (error) {
        console.error('Erro ao carregar personal trainer:', error);
      } finally {
        setLoadingPersonalTrainer(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

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
        const res = await fetch('/api/metapersonal/organization-branding', {
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

  const handleConfirmarCadastroPersonal = useCallback(async () => {
    if (!user) return;
    setCriandoCadastroPersonal(true);
    try {
      const personalDoc = await PersonalTrainerService.createOrUpdatePersonalTrainer(
        user.uid,
        user.email || '',
        user.displayName || ''
      );
      setPersonalTrainer(personalDoc);
      setRegistroNumero(personalDoc.registroNumero || '');
      setTelefoneContato(personalDoc.telefone || '');
      setTelefoneDdiContato(personalDoc.telefoneDdi || '');
      setTelefonePaisContato(personalDoc.telefonePais || '');
      setCidadesSelecionadas(personalDoc.cidades || []);
    } catch (error) {
      console.error('Erro ao iniciar cadastro de personal trainer:', error);
      alert('Nao foi possivel iniciar seu cadastro agora. Tente novamente.');
    } finally {
      setCriandoCadastroPersonal(false);
    }
  }, [user]);

  const handleRecusarCadastroPersonal = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = 'https://www.oftware.com.br';
      return;
    }
    router.push('/');
  }, [router]);

  // Carregar agregado de classificação do personal trainer
  useEffect(() => {
    const id = personalTrainer?.id || personalTrainer?.userId;
    if (!id) { setAgregadoPersonal(null); return; }
    ClassificacaoProfissionalService.getAgregado('personal', id).then(setAgregadoPersonal);
  }, [personalTrainer?.id, personalTrainer?.userId]);

  // Handler de logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Carregar médicos verificados
  const loadMedicosVerificados = useCallback(async () => {
    setLoadingMedicos(true);
    try {
      const medicos = await MedicoService.getAllMedicos();
      const verificados = medicos.filter(m => m.isVerificado);
      setMedicosVerificados(verificados);
      
      // Extrair estados e cidades únicos onde existem médicos
      const estadosSet = new Set<string>();
      const cidadesComMed: { estado: string; cidade: string }[] = [];
      
      verificados.forEach(medico => {
        // Verificar se cidades existe e é um array antes de iterar
        if (medico.cidades && Array.isArray(medico.cidades)) {
          medico.cidades.forEach(cidade => {
            estadosSet.add(cidade.estado);
            if (!cidadesComMed.some(c => c.estado === cidade.estado && c.cidade === cidade.cidade)) {
              cidadesComMed.push({
                estado: cidade.estado,
                cidade: cidade.cidade
              });
            }
          });
        }
      });
      
      setEstadosComMedicos(Array.from(estadosSet).sort());
      setCidadesComMedicos(cidadesComMed);
    } catch (error) {
      console.error('Erro ao carregar médicos:', error);
    } finally {
      setLoadingMedicos(false);
    }
  }, []);

  // Carregar cidades da coleção medicos (para o modal de perfil - todas as cidades cadastradas nos médicos)
  const loadCidadesDosMedicos = useCallback(async () => {
    setLoadingCidadesMedicos(true);
    try {
      const todosMedicos = await MedicoService.getAllMedicos();
      const estadosSet = new Set<string>();
      const cidadesComMed: { estado: string; cidade: string }[] = [];

      todosMedicos.forEach(medico => {
        if (medico.cidades && Array.isArray(medico.cidades)) {
          medico.cidades.forEach(cidade => {
            estadosSet.add(cidade.estado);
            if (!cidadesComMed.some(c => c.estado === cidade.estado && c.cidade === cidade.cidade)) {
              cidadesComMed.push({
                estado: cidade.estado,
                cidade: cidade.cidade
              });
            }
          });
        }
      });

      setEstadosComMedicos(Array.from(estadosSet).sort());
      setCidadesComMedicos(cidadesComMed);
    } catch (error) {
      console.error('Erro ao carregar cidades dos médicos:', error);
    } finally {
      setLoadingCidadesMedicos(false);
    }
  }, []);

  // Carregar estados e cidades com médicos para busca
  const loadEstadosCidadesMedicosDisponiveis = useCallback(async () => {
    setLoadingEstadosCidadesMedicos(true);
    try {
      const todosMedicos = await MedicoService.getAllMedicos();
      const disponiveis = todosMedicos.filter(medico => 
        medico.isVerificado && medico.status === 'ativo'
      );
      
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
      
      setEstadosComMedicosBusca(Array.from(estadosComMed).sort());
      setCidadesComMedicosBusca(cidadesComMed);
    } catch (error) {
      console.error('Erro ao carregar estados e cidades de médicos:', error);
    } finally {
      setLoadingEstadosCidadesMedicos(false);
    }
  }, []);

  // Carregar médicos disponíveis para criar vínculo (filtrado por estado e cidade)
  const loadMedicosDisponiveis = useCallback(async (estado?: string, cidade?: string) => {
    if (!user || !personalTrainer || !personalTrainer.isVerificado) return;
    
    if (!estado || !cidade) {
      alert('Selecione estado e cidade para buscar.');
      return;
    }

    setLoadingMedicosDisponiveis(true);
    try {
      const todosMedicos = await MedicoService.getAllMedicos();
      
      const disponiveis = todosMedicos.filter(medico => {
        if (!medico.isVerificado || medico.status !== 'ativo') {
          return false;
        }
        
        if (!medico.cidades || !Array.isArray(medico.cidades) || medico.cidades.length === 0) {
          return false;
        }
        
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
  }, [user, personalTrainer]);

  // Carregar solicitações de vínculo ENVIADAS pelo personal trainer
  const loadSolicitacoesVinculo = useCallback(async () => {
    if (!user || !personalTrainer) return;
    
    setLoadingSolicitacoesVinculo(true);
    try {
      const solicitacoes = await SolicitacaoVinculoPersonalMedicoService.listSentVinculoRequestsByPersonal(user.uid);
      // Filtrar apenas solicitações que NÃO estão aceitas (aceitas aparecem em médicos vinculados)
      const naoAceitas = solicitacoes.filter(s => s.status !== SOLICITACAO_STATUS.ACEITA);
      setSolicitacoesVinculo(naoAceitas);
    } catch (error) {
      console.error('Erro ao carregar solicitações de vínculo:', error);
    } finally {
      setLoadingSolicitacoesVinculo(false);
    }
  }, [user, personalTrainer]);
  
  // Carregar solicitações de vínculo RECEBIDAS pelo personal trainer
  const loadSolicitacoesVinculoRecebidas = useCallback(async () => {
    if (!user || !personalTrainer) return;
    
    setLoadingSolicitacoesVinculoRecebidas(true);
    try {
      const todas = await SolicitacaoVinculoPersonalMedicoService.listVinculoRequestsByPersonal(user.uid);
      // Filtrar apenas as que foram solicitadas pelo médico E que NÃO estão aceitas
      const recebidas = todas.filter(s => 
        s.solicitadoPor === 'medico' && s.status !== SOLICITACAO_STATUS.ACEITA
      );
      setSolicitacoesVinculoRecebidas(recebidas);
    } catch (error) {
      console.error('Erro ao carregar solicitações de vínculo recebidas:', error);
    } finally {
      setLoadingSolicitacoesVinculoRecebidas(false);
    }
  }, [user, personalTrainer]);

  // Carregar médicos vinculados (igual metanutri: vinculos + medicoPacientesMap + vinculosCache)
  const loadMedicosVinculados = useCallback(async () => {
    if (!user || !personalTrainer || !personalTrainer.isVerificado) return;
    
    if (!personalTrainer.medicoVinculadoIds || personalTrainer.medicoVinculadoIds.length === 0) {
      setMedicosList([]);
      setVinculosCache([]);
      return;
    }
    
    setLoadingMedicosList(true);
    try {
      const [vinculos, medicosData] = await Promise.all([
        PacientePersonalTrainerService.listActiveVinculosByPersonal(user.uid),
        Promise.all(
          personalTrainer.medicoVinculadoIds.map(id => MedicoService.getMedicoById(id))
        ),
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
          cidades: medico.cidades || [],
          fotoPerfilUrl: medico.fotoPerfilUrl ?? null,
          instagramUsuario: medico.instagramUsuario ?? null,
          nomeLocal: medico.localizacao?.nomeLocal,
          endereco: medico.localizacao?.endereco,
          countPacientes: medicoPacientesMap.get(medico.id)?.length ?? 0,
          pacienteIds: medicoPacientesMap.get(medico.id) ?? [],
        }))
        .sort((a, b) => {
          if (b.countPacientes !== a.countPacientes) return b.countPacientes - a.countPacientes;
          return a.nome.localeCompare(b.nome);
        });

      setMedicosList(medicosListData);
      setVinculosCache(vinculos.map(v => ({
        pacienteId: v.pacienteId,
        medicoId: v.medicoId,
        dataCompartilhamento: v.dataCompartilhamento,
      })));
    } catch (error) {
      console.error('Erro ao carregar médicos vinculados:', error);
      setMedicosList([]);
      setVinculosCache([]);
    } finally {
      setLoadingMedicosList(false);
    }
  }, [user, personalTrainer]);

  // Handler para solicitar vínculo
  const handleSolicitarVinculo = useCallback(async (medicoId: string) => {
    if (!user || !personalTrainer) return;
    
    try {
      setLoading(true);
      await SolicitacaoVinculoPersonalMedicoService.createVinculoRequest(
        user.uid,
        medicoId,
        'personal_trainer',
        {
          personalTrainerNome: personalTrainer.nome,
          personalTrainerEmail: user.email || ''
        }
      );
      // Enviar e-mail ao médico (personal pediu vínculo) — instantâneo
      try {
        await fetch('/api/send-email-personal-pediu-vinculo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicoId, personalId: user.uid }),
        });
      } catch (e) {
        console.error('Erro ao enviar e-mail personal pediu vínculo:', e);
      }
      await loadSolicitacoesVinculo();
      await loadMedicosDisponiveis(estadoBuscaMedico, cidadeBuscaMedico);
    } catch (error: any) {
      alert(error.message || 'Erro ao solicitar vínculo.');
    } finally {
      setLoading(false);
    }
  }, [user, personalTrainer, loadSolicitacoesVinculo, loadMedicosDisponiveis, estadoBuscaMedico, cidadeBuscaMedico]);

  // Handler para aceitar vínculo
  const handleAceitarVinculo = useCallback(async (requestId: string) => {
    if (!user || !personalTrainer) return;
    
    try {
      setLoading(true);
      await SolicitacaoVinculoPersonalMedicoService.approveVinculoRequest(requestId);
      alert('Vínculo aceito com sucesso!');
      
      // Recarregar personal trainer para atualizar medicoVinculadoIds
      const updated = await PersonalTrainerService.getPersonalTrainerByUserId(user.uid);
      if (updated) {
        setPersonalTrainer(updated);
      }
      
      // Recarregar listas (solicitações aceitas desaparecerão automaticamente devido ao filtro)
      await loadSolicitacoesVinculoRecebidas();
      await loadMedicosVinculados();
    } catch (error: any) {
      alert(error.message || 'Erro ao aceitar vínculo.');
    } finally {
      setLoading(false);
    }
  }, [user, personalTrainer, loadSolicitacoesVinculoRecebidas, loadMedicosVinculados]);

  // Handler para rejeitar vínculo
  const handleRejeitarVinculo = useCallback(async (requestId: string) => {
    if (!user || !personalTrainer) return;
    
    try {
      setLoading(true);
      await SolicitacaoVinculoPersonalMedicoService.rejectVinculoRequest(requestId);
      await loadSolicitacoesVinculoRecebidas();
    } catch (error: any) {
      alert(error.message || 'Erro ao rejeitar vínculo.');
    } finally {
      setLoading(false);
    }
  }, [user, personalTrainer, loadSolicitacoesVinculoRecebidas]);

  // Handler para cancelar solicitação
  const handleCancelarSolicitacao = useCallback(async (requestId: string) => {
    if (!user || !personalTrainer) return;
    
    try {
      setLoading(true);
      await SolicitacaoVinculoPersonalMedicoService.cancelVinculoRequest(requestId);
      await loadSolicitacoesVinculo();
    } catch (error: any) {
      alert(error.message || 'Erro ao cancelar solicitação.');
    } finally {
      setLoading(false);
    }
  }, [user, personalTrainer, loadSolicitacoesVinculo]);

  // Handler para excluir solicitação
  const handleExcluirSolicitacaoVinculo = useCallback(async (requestId: string, tipo: 'enviada' | 'recebida') => {
    if (!user || !personalTrainer) return;
    
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;
    
    try {
      setLoading(true);
      await SolicitacaoVinculoPersonalMedicoService.deleteVinculoRequest(requestId);
      
      // Recarregar personal trainer para atualizar medicoVinculadoIds se necessário
      const updated = await PersonalTrainerService.getPersonalTrainerById(user.uid);
      if (updated) {
        setPersonalTrainer(updated);
      }
      
      // Recarregar todas as listas para atualizar o estado
      if (tipo === 'enviada') {
        await loadSolicitacoesVinculo();
      } else {
        await loadSolicitacoesVinculoRecebidas();
      }
      
      // Recarregar médicos vinculados para atualizar a lista
      await loadMedicosVinculados();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir solicitação.');
    } finally {
      setLoading(false);
    }
  }, [user, personalTrainer, loadSolicitacoesVinculo, loadSolicitacoesVinculoRecebidas, loadMedicosVinculados]);

  // Carregar pacientes em comum com um médico (igual metanutri: expandir seta na aba Médicos Vinculados)
  const loadPacientesComum = useCallback(async (medicoId: string, pacienteIds: string[]) => {
    if (pacienteIds.length === 0) {
      setPacientesPorMedico(prev => {
        const newMap = new Map(prev);
        newMap.set(medicoId, []);
        return newMap;
      });
      return;
    }

    let shouldLoad = true;
    setPacientesPorMedico(prev => {
      if (prev.has(medicoId)) shouldLoad = false;
      return prev;
    });
    if (!shouldLoad) return;

    setLoadingPacientesPorMedico(prev => new Set(prev).add(medicoId));
    try {
      const pacientesData = await Promise.all(
        pacienteIds.map(id => PacienteService.getPacienteById(id))
      );

      const vinculosMap = new Map<string, Date>();
      vinculosCache.forEach(v => {
        if (v.medicoId === medicoId) {
          vinculosMap.set(v.pacienteId, v.dataCompartilhamento);
        }
      });

      if (vinculosCache.length === 0 && user) {
        const vinculos = await PacientePersonalTrainerService.listActiveVinculosByPersonal(user.uid);
        vinculos.forEach(v => {
          if (v.medicoId === medicoId) {
            vinculosMap.set(v.pacienteId, v.dataCompartilhamento);
          }
        });
      }

      const pacientesFiltrados = pacientesData.filter((p): p is PacienteCompleto => p !== null);
      const pacientesComumData = pacientesFiltrados
        .map(paciente => ({
          paciente,
          dataCompartilhamento: vinculosMap.get(paciente.id) || new Date(),
        }))
        .sort((a, b) => b.dataCompartilhamento.getTime() - a.dataCompartilhamento.getTime());

      setPacientesPorMedico(prev => {
        const newMap = new Map(prev);
        newMap.set(medicoId, pacientesComumData);
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

  // Handler para expandir/colapsar médico vinculado
  const handleToggleMedicoExpandido = async (medico: typeof medicosList[0]) => {
    if (medicoExpandidoId === medico.medicoId) {
      setMedicoExpandidoId(null);
    } else {
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

  // ==========================================
  // FUNÇÕES DE CARREGAMENTO - SEÇÃO PACIENTES
  // ==========================================

  // Carregar solicitações pendentes
  const loadSolicitacoesPendentes = useCallback(async () => {
    if (!user || !personalTrainer || !personalTrainer.isVerificado) return;
    
    setLoadingSolicitacoesPendentes(true);
    try {
      // IMPORTANTE: usar user.uid (Firebase Auth UID) como personalTrainerId
      const solicitacoes = await SolicitacaoPersonalTrainerService.listPendingRequestsByPersonal(user.uid);
      setSolicitacoesPendentes(solicitacoes);
    } catch (error) {
      console.error('Erro ao carregar solicitações pendentes:', error);
      setSolicitacoesPendentes([]);
    } finally {
      setLoadingSolicitacoesPendentes(false);
    }
  }, [user, personalTrainer]);

  // Carregar pagamentos dos pacientes compartilhados (relação personal trainer-paciente)
  const loadPagamentos = useCallback(async (pacientesParaUsar: PacienteCompleto[]) => {
    if (!personalTrainer || !user || pacientesParaUsar.length === 0) return;
    
    try {
      console.log('💰 Financeiro Personal: Carregando pagamentos personal-paciente para', pacientesParaUsar.length, 'pacientes');
      
      // Buscar pagamentos específicos da relação personal trainer-paciente
      const pagamentosPersonalTrainer = await PagamentoService.getAllPagamentosPersonalTrainer(user.uid);
      console.log('💰 Financeiro Personal: Pagamentos personal-paciente encontrados:', Object.keys(pagamentosPersonalTrainer).length);
      
      // Filtrar apenas pagamentos dos pacientes visíveis
      const pacientesIds = pacientesParaUsar.map(p => p.id);
      const pagamentosFiltrados: Record<string, PagamentoPaciente> = {};
      
      Object.entries(pagamentosPersonalTrainer).forEach(([pacienteId, pagamento]) => {
        if (pacientesIds.includes(pacienteId)) {
          pagamentosFiltrados[pacienteId] = pagamento;
        }
      });
      
      console.log('💰 Financeiro Personal: Pagamentos filtrados encontrados:', Object.keys(pagamentosFiltrados).length);
      setPagamentosPacientes(pagamentosFiltrados);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  }, [personalTrainer, user]);

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

  // Carregar KPIs da Home (padrão metanutri)
  const loadKPIs = useCallback(async () => {
    if (!user || !personalTrainer) return;

    setLoadingKPIs(true);
    try {
      const vinculos = await PacientePersonalTrainerService.listActiveVinculosByPersonal(user.uid);
      setMedicosVinculados(personalTrainer.medicoVinculadoIds?.length ?? 0);
      if (personalTrainer.isVerificado && (personalTrainer.medicoVinculadoIds?.length ?? 0) > 0) {
        const pacientes = await PacientePersonalTrainerService.listPacientesVisiveisByPersonal(user.uid);
        setPacientesVisiveis(pacientes);
      }
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    } finally {
      setLoadingKPIs(false);
    }
  }, [user, personalTrainer]);

  // Carregar todos os pacientes do Oftware (para filtro Base Oftware na Home)
  const loadTodosPacientesOftware = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (todosPacientesOftware.length > 0) return;

    setLoadingTodosPacientes(true);
    try {
      const todosPacientes = await PacienteService.getAllPacientes();
      setTodosPacientesOftware(todosPacientes);
    } catch (error) {
      console.error('Erro ao carregar todos os pacientes:', error);
    } finally {
      setLoadingTodosPacientes(false);
    }
  }, [todosPacientesOftware.length]);

  // Carregar pacientes quando entrar na seção
  const loadPacientesList = useCallback(async () => {
    if (!user || !personalTrainer || !personalTrainer.isVerificado) return;
    
    setLoadingPacientesList(true);
    try {
      // ==========================================
      // FASE 1: CARREGAR DADOS ESSENCIAIS (RÁPIDO)
      // ==========================================
      console.log('Carregando pacientes para personal trainer ID:', user.uid);
      const pacientes = await PacientePersonalTrainerService.listPacientesVisiveisByPersonal(user.uid);
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
  }, [user, personalTrainer, loadPagamentos]);

  // Catálogo (Prescrições Salvas): templates + docs sem pacienteId. Histórico carrega à parte.
  const loadPrescricoesModal = useCallback(async (_paciente?: PacienteCompleto) => {
    if (!personalTrainer) return;
    try {
      setLoadingPrescricoesModal(true);
      await PrescricaoService.criarPrescricoesPadraoGlobais();
      const [templates, prescricoesPersonal] = await Promise.all([
        PrescricaoService.getPrescricoesTemplate(),
        PrescricaoService.getPrescricoesByMedico(personalTrainer.userId)
      ]);
      const catalogo = [
        ...templates,
        ...prescricoesPersonal.filter((x) => !x.pacienteId),
      ];
      prescricoesBuscaFonteRef.current = montarFonteBuscaPrescricoes(templates, prescricoesPersonal);
      setPrescricoesModal((prev) => {
        const temp = prev.find((x) => x.id === 'temp-new');
        return temp ? [temp, ...catalogo.filter((x) => x.id !== 'temp-new')] : catalogo;
      });
    } catch (error) {
      console.error('Erro ao carregar prescrições (modal):', error);
    } finally {
      setLoadingPrescricoesModal(false);
    }
  }, [personalTrainer]);

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

  // Função para carregar nutricionistas elegíveis (verificados, ativos e vinculados ao personal trainer)
  const loadNutricionistasElegiveis = useCallback(async () => {
    if (!personalTrainer?.userId) return;
    
    setLoadingNutricionistasElegiveis(true);
    try {
      const todosNutris = await NutricionistaService.getAllNutricionistas();
      // Filtrar: verificados, ativos e vinculados ao personal trainer atual
      // Nota: Assumindo que existe um campo personalTrainerVinculadoIds no NutricionistaDoc
      // Se não existir, buscar todos verificados e ativos
      const elegiveis = todosNutris.filter(nutri => 
        nutri.isVerificado && 
        nutri.status === 'ativo'
        // TODO: Adicionar filtro por personalTrainerVinculadoIds quando o campo existir
        // && nutri.personalTrainerVinculadoIds?.includes(personalTrainer.userId)
      );
      setNutricionistasElegiveis(elegiveis);
    } catch (error) {
      console.error('Erro ao carregar nutricionistas elegíveis:', error);
    } finally {
      setLoadingNutricionistasElegiveis(false);
    }
  }, [personalTrainer]);

  // Função para carregar status completo de compartilhamento com Nutricionista
  const loadStatusCompartilhamentoNutri = useCallback(async (pacienteId: string) => {
    if (!personalTrainer?.userId || !pacienteId) return;
    
    setLoadingSolicitacoesCompartilhamentoNutri(true);
    try {
      // Buscar vínculos ativos do paciente
      const { COL_PACIENTE_NUTRICIONISTA } = await import('@/features/metaNutri/metaNutri.constants');
      const { db } = await import('@/lib/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const q = query(
        collection(db, COL_PACIENTE_NUTRICIONISTA),
        where('pacienteId', '==', pacienteId),
        where('status', '==', 'ativo')
      );
      
      const querySnapshot = await getDocs(q);
      const vinculos = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          nutricionistaId: data.nutricionistaId,
          medicoId: data.medicoId,
          dataCompartilhamento: data.dataCompartilhamento?.toDate() || new Date(),
          status: data.status || 'ativo',
        };
      });
      
      // Filtrar vínculos onde o médico está vinculado ao personal trainer
      const vinculosFiltrados = vinculos.filter(v => {
        if (personalTrainer.medicoVinculadoIds && personalTrainer.medicoVinculadoIds.length > 0) {
          return personalTrainer.medicoVinculadoIds.includes(v.medicoId);
        }
        return false;
      });
      
      setVinculosAtivosPacienteNutri(vinculosFiltrados);
      
      // Buscar solicitações pendentes
      const solicitacoes = await SolicitacaoNutricionistaService.getShareRequestsByPaciente(pacienteId);
      const solicitacoesFiltradas = solicitacoes.filter(s => {
        if (personalTrainer.medicoVinculadoIds && personalTrainer.medicoVinculadoIds.length > 0) {
          return personalTrainer.medicoVinculadoIds.includes(s.medicoId);
        }
        return false;
      });
      setSolicitacoesCompartilhamentoPacienteNutri(solicitacoesFiltradas);
    } catch (error) {
      console.error('Erro ao carregar status de compartilhamento nutri:', error);
    } finally {
      setLoadingSolicitacoesCompartilhamentoNutri(false);
    }
  }, [personalTrainer]);

  // Carregar treino de hoje para o paciente selecionado
  const loadTodaySession = useCallback(async (patientId: string) => {
    if (!patientId) return;
    setLoadingToday(true);
    try {
      const sessions = await trainingSessionService.getTodaySessions(patientId);
      if (sessions.length > 0) {
        setTodaySessions(sessions);
        const firstSession = sessions[0];
        setSelectedTodaySessionId(firstSession.id || null);
        setPatientNotes(firstSession.patientNotes || '');
        if (firstSession.id) {
          const exercises = await trainingSessionService.getSessionExercises(firstSession.id);
          setTodayExercises(exercises);
        } else {
          setTodayExercises([]);
        }
      } else {
        setTodaySessions([]);
        setSelectedTodaySessionId(null);
        setTodayExercises([]);
        setPatientNotes('');
      }
    } catch (error) {
      console.error('Erro ao carregar sessão de hoje:', error);
      setTodaySessions([]);
      setSelectedTodaySessionId(null);
      setTodayExercises([]);
      setPatientNotes('');
    } finally {
      setLoadingToday(false);
    }
  }, []);

  // Carregar sessões do calendário
  const loadCalendarSessions = useCallback(async (patientId: string) => {
    if (!patientId) return;
    try {
      let startDate: string;
      let endDate: string;

      if (visualizacaoCalendarioPersonal === 'semana') {
        const inicioSemana = new Date(semanaCalendarioPersonal);
        inicioSemana.setDate(semanaCalendarioPersonal.getDate() - semanaCalendarioPersonal.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);
        
        startDate = toLocalYYYYMMDD(inicioSemana);
        endDate = toLocalYYYYMMDD(fimSemana);
      } else {
        const ano = mesCalendarioPersonal.getFullYear();
        const mes = mesCalendarioPersonal.getMonth();
        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        startDate = toLocalYYYYMMDD(primeiroDia);
        endDate = toLocalYYYYMMDD(ultimoDia);
      }

      const sessions = await trainingSessionService.getPatientSessions(patientId, {
        startDate,
        endDate,
      });
      setSessoesCalendarioPersonal(sessions);
    } catch (error) {
      console.error('Erro ao carregar sessões do calendário:', error);
    }
  }, [visualizacaoCalendarioPersonal, mesCalendarioPersonal, semanaCalendarioPersonal]);

  // Carregar histórico de sessões
  const loadHistorico = useCallback(async (patientId: string) => {
    if (!patientId) return;
    setLoadingHistorico(true);
    try {
      const hoje = new Date();
      const sessentaDiasAtras = new Date(hoje);
      sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);
      const startDate = toLocalYYYYMMDD(sessentaDiasAtras);
      const endDate = toLocalYYYYMMDD(hoje);

      const sessions = await trainingSessionService.getPatientSessions(patientId, {
        startDate,
        endDate,
      });
      setHistoricoSessions(sessions);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  // Carregar estatísticas
  const loadEstatisticas = useCallback(async (patientId: string) => {
    if (!patientId) return;
    try {
      const hoje = new Date();

      // Aderência baseada em exercícios feitos (não sessões)
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const trintaDiasAtras = new Date(hoje);
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      // Buscar todas as sessões do período
      const sessions7d = await trainingSessionService.getPatientSessions(patientId, {
        startDate: toLocalYYYYMMDD(seteDiasAtras),
        endDate: toLocalYYYYMMDD(hoje),
      });
      const sessions30d = await trainingSessionService.getPatientSessions(patientId, {
        startDate: toLocalYYYYMMDD(trintaDiasAtras),
        endDate: toLocalYYYYMMDD(hoje),
      });

      // Calcular aderência baseada em exercícios
      let totalExercises7d = 0;
      let doneExercises7d = 0;
      for (const session of sessions7d) {
        if (session.id) {
          const exercises = await trainingSessionService.getSessionExercises(session.id);
          totalExercises7d += exercises.length;
          doneExercises7d += exercises.filter((ex) => ex.status === 'done').length;
        }
      }
      const adherence7 = totalExercises7d > 0 ? (doneExercises7d / totalExercises7d) * 100 : 0;
      setAdherence7d(adherence7);

      let totalExercises30d = 0;
      let doneExercises30d = 0;
      for (const session of sessions30d) {
        if (session.id) {
          const exercises = await trainingSessionService.getSessionExercises(session.id);
          totalExercises30d += exercises.length;
          doneExercises30d += exercises.filter((ex) => ex.status === 'done').length;
        }
      }
      const adherence30 = totalExercises30d > 0 ? (doneExercises30d / totalExercises30d) * 100 : 0;
      setAdherence30d(adherence30);

      // Treinos por semana (últimas 4 semanas) - baseado em exercícios feitos
      const semanas: number[] = [];
      for (let i = 3; i >= 0; i--) {
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(inicioSemana.getDate() - (i * 7 + 6));
        const fimSemana = new Date(hoje);
        fimSemana.setDate(fimSemana.getDate() - i * 7);

        const sessions = await trainingSessionService.getPatientSessions(patientId, {
          startDate: toLocalYYYYMMDD(inicioSemana),
          endDate: toLocalYYYYMMDD(fimSemana),
        });
        
        // Contar exercícios feitos na semana
        let exercisesDone = 0;
        for (const session of sessions) {
          if (session.id) {
            const exercises = await trainingSessionService.getSessionExercises(session.id);
            exercisesDone += exercises.filter((ex) => ex.status === 'done').length;
          }
        }
        semanas.push(exercisesDone);
      }
      setTreinosPorSemana(semanas);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }, []);

  // Carregar preferências de lembrete
  const loadReminderPrefs = useCallback(async (patientId: string) => {
    if (!patientId) return;
    try {
      const prefs = await trainingSessionService.getReminderPrefs(patientId);
      setReminderPrefs(prefs);
    } catch (error) {
      console.error('Erro ao carregar preferências de lembrete:', error);
    }
  }, []);

  // Carregar filtros para busca de exercícios
  const loadFilters = useCallback(async () => {
    try {
      const [targetsRes, equipmentsRes, bodyPartsRes] = await Promise.all([
        fetch('/api/exercisedb/targets').then((r) => r.json()),
        fetch('/api/exercisedb/equipments').then((r) => r.json()),
        fetch('/api/exercisedb/bodyparts').then((r) => r.json()),
      ]);
      setTargets(targetsRes);
      setEquipments(equipmentsRes);
      setBodyParts(bodyPartsRes);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
  }, []);

  // Buscar exercícios
  const searchExercises = useCallback(async () => {
    if (!pacientePersonalSelecionado) return;
    setLoadingExercises(true);
    try {
      let url = '/api/exercisedb/search?name=' + encodeURIComponent(searchQuery);
      if (!searchQuery) {
        if (selectedTarget) {
          url = `/api/exercisedb/byTarget?target=${encodeURIComponent(selectedTarget)}&page=1`;
        } else if (selectedEquipment) {
          url = `/api/exercisedb/byEquipment?equipment=${encodeURIComponent(selectedEquipment)}&page=1`;
        } else if (selectedBodyPart) {
          url = `/api/exercisedb/byBodyPart?bodyPart=${encodeURIComponent(selectedBodyPart)}&page=1`;
        } else {
          url = '/api/exercises?limit=20';
        }
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const exercises = Array.isArray(data) ? data : [];
        const normalizedExercises = exercises.map((ex: any) => ({
          ...ex,
          gifUrl: getExerciseGifUrl(ex.id, '360'),
        }));
        setExercisesResults(normalizedExercises);
      }
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    } finally {
      setLoadingExercises(false);
    }
  }, [searchQuery, selectedTarget, selectedEquipment, selectedBodyPart, pacientePersonalSelecionado]);

  // Calcular progresso diário
  const calculateDailyProgress = useCallback(() => {
    if (todayExercises.length === 0) return { done: 0, skipped: 0, total: 0, percentage: 0 };
    
    const done = todayExercises.filter((ex) => ex.status === 'done').length;
    const skipped = todayExercises.filter((ex) => ex.status === 'skipped').length;
    const total = todayExercises.length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    
    return { done, skipped, total, percentage };
  }, [todayExercises]);

  // useEffect para carregar filtros quando abrir tab criar
  useEffect(() => {
    if (showModalPersonal && activeTabPersonal === 'criar') {
      loadFilters();
    }
  }, [showModalPersonal, activeTabPersonal, loadFilters]);

  // useEffect para buscar exercícios quando filtros mudarem
  useEffect(() => {
    if (showModalPersonal && activeTabPersonal === 'criar') {
      const timeoutId = setTimeout(() => {
        searchExercises();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [showModalPersonal, activeTabPersonal, searchExercises]);

  // ==========================================
  // USE EFFECTS PARA CARREGAR DADOS
  // ==========================================

  // Carregar KPIs quando entrar na Home
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'home') {
      loadKPIs();
    }
  }, [user, personalTrainer, activeMenu, loadKPIs]);

  // Carregar todos os pacientes Oftware quando filtro for "Base Oftware" na Home
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (filtroBaseDashboard === 'oftware' && todosPacientesOftware.length === 0 && !loadingTodosPacientes) {
      loadTodosPacientesOftware();
    }
  }, [filtroBaseDashboard, todosPacientesOftware.length, loadingTodosPacientes, loadTodosPacientesOftware]);

  // Carregar dados quando entrar na seção home ou leads (pacientes e pagamentos para estatísticas)
  useEffect(() => {
    if (user && personalTrainer && (activeMenu === 'home' || activeMenu === 'leads' || activeMenu === 'treinos' || activeMenu === 'historico')) {
      loadPacientesList();
    }
  }, [user, personalTrainer, activeMenu, loadPacientesList]);

  // Carregar dados quando entrar na seção pacientes
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'pacientes') {
      loadPacientesList();
      loadSolicitacoesPendentes();
    }
  }, [user, personalTrainer, activeMenu, loadPacientesList, loadSolicitacoesPendentes]);

  // Carregar dados quando entrar na seção financeiro
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'financeiro') {
      loadPacientesList();
    }
  }, [user, personalTrainer, activeMenu, loadPacientesList]);

  // Comunicação: pacientes compartilhados + médicos vinculados
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'comunicacao') {
      void loadPacientesList();
      void loadMedicosVinculados();
    }
  }, [user, personalTrainer, activeMenu, loadPacientesList, loadMedicosVinculados]);

  // Carregar dados quando entrar na seção calendário
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'calendario') {
      loadPacientesList();
      // Pagamentos já serão carregados automaticamente pelo loadPacientesList
    }
  }, [user, personalTrainer, activeMenu, loadPacientesList]);

  const loadLembretes = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const data = await LembreteService.getLembretesPorPersonalTrainer(user.uid);
      setLembretes(data);
    } catch (error) {
      console.error('[Metapersonal] Erro ao carregar lembretes:', error);
    }
  }, [user?.uid]);

  const loadConsultasAgenda = useCallback(async () => {
    if (!user) return;
    try {
      const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/meetings');
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
      console.error('[Metapersonal] Erro ao carregar consultas agendadas:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user && personalTrainer && (activeMenu === 'calendario' || activeMenu === 'home' || activeMenu === 'leads')) {
      void loadLembretes();
    }
    if (user && personalTrainer && activeMenu === 'calendario') {
      void loadConsultasAgenda();
    }
  }, [user, personalTrainer, activeMenu, loadLembretes, loadConsultasAgenda]);

  // Carregar dados quando entrar na seção financeiro
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'financeiro') {
      loadPacientesList();
    }
  }, [user, personalTrainer, activeMenu, loadPacientesList]);

  // Carregar pagamentos quando pacientes mudarem no menu financeiro
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'financeiro' && pacientesVisiveis.length > 0 && !loadingPacientesList) {
      loadPagamentos(pacientesVisiveis.map(p => p.paciente));
    }
  }, [user, personalTrainer, activeMenu, loadingPacientesList, pacientesVisiveis, loadPagamentos]);

  // Carregar "tem treinos" por paciente (ícone Personal rosa só quando há ao menos 1 treino)
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

  // Carregar pacientes com nutrição
  useEffect(() => {
    if (activeMenu !== 'pacientes' || pacientesVisiveis.length === 0) return;
    
    let cancelled = false;
    (async () => {
      const pacientesComNutriMap: Record<string, boolean> = {};
      
      for (const item of pacientesVisiveis) {
        if (cancelled) break;
        try {
          const { db } = await import('@/lib/firebase');
          const { doc, getDoc } = await import('firebase/firestore');
          const planoRef = doc(db, 'pacientes_completos', item.paciente.id, 'nutricao', 'plano');
          const planoSnap = await getDoc(planoRef);
          pacientesComNutriMap[item.paciente.id] = planoSnap.exists();
        } catch {
          pacientesComNutriMap[item.paciente.id] = false;
        }
      }
      
      if (!cancelled) setPacientesComNutricao(pacientesComNutriMap);
    })();
    return () => { cancelled = true; };
  }, [activeMenu, pacientesVisiveis]);

  // Carregar dados quando entrar na seção calendário
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'calendario') {
      loadPacientesList();
    }
  }, [user, personalTrainer, activeMenu, loadPacientesList]);

  // ==========================================
  // HANDLERS DE AÇÕES - SEÇÃO PACIENTES
  // ==========================================

  // Handler para aceitar solicitação
  const handleAceitarSolicitacao = async (requestId: string) => {
    if (aceitandoSolicitacaoIdRef.current) return;
    aceitandoSolicitacaoIdRef.current = requestId;
    setAceitandoSolicitacaoId(requestId);
    try {
      await SolicitacaoPersonalTrainerService.approveShareRequest(requestId);
      // Enviar e-mail de boas-vindas ao paciente (instantâneo)
      try {
        const emailRes = await fetch('/api/send-email-solicitado-personal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitacaoId: requestId }),
        });
        const emailResult = await emailRes.json();
        if (!emailRes.ok) console.error('E-mail boas-vindas personal:', emailResult);
        else if (!emailResult.jaEnviado) console.log('E-mail de boas-vindas (personal) enviado.');
      } catch (e) {
        console.error('Erro ao enviar e-mail de boas-vindas:', e);
      }
      // WhatsApp: médico → paciente + personal → paciente
      try {
        const waRes = await fetch('/api/send-whatsapp-compartilhamento-aceite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitacaoId: requestId, role: 'personal_trainer' }),
        });
        const waText = await waRes.text();
        let waResult: any = null;
        try {
          waResult = waText ? JSON.parse(waText) : null;
        } catch {
          waResult = { error: waText?.slice(0, 200) || `HTTP ${waRes.status}` };
        }
        if (!waRes.ok || waResult?.success === false) {
          console.error('WhatsApp aceite personal:', waRes.status, waResult);
        } else if (!waResult?.jaEnviado) {
          console.log('WhatsApp de aceite (personal) enviado.', waResult);
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
      await SolicitacaoPersonalTrainerService.rejectShareRequest(requestId, motivo || undefined);
      await loadSolicitacoesPendentes();
    } catch (error: any) {
      console.error('Erro ao rejeitar solicitação:', error);
      alert(error.message || 'Erro ao rejeitar solicitação');
    }
  };

  // Handler para editar/visualizar paciente
  // estiloPersonal: true = modal tela cheia com Identificação + Anamnese + Prontuário (mobile)
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
      setPacienteVisualizando(paciente);
      setPacientePersonalSelecionado(paciente); // prep for Personal Trainer tab
      setModalVisualizacaoEstiloPersonal(estiloPersonal ?? false);
      setPastaAtiva(estiloPersonal ? Math.min(abaInicial, 3) : abaInicial);
      setShowVisualizarPacienteModal(true);
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

  const fecharVisualizarPacienteModal = useCallback(() => {
    setShowVisualizarPacienteModal(false);
    setPacienteVisualizando(null);
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
    // handleVisualizarPaciente é função estável no render deste componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /** Navega no menu principal e fecha o painel do paciente, se estiver aberto. */
  const navegarMenuPrincipal = useCallback(
    (menu: MenuPersonal) => {
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

  // Sincronizar pagamento quando usuário abre aba 10 no modal
  useEffect(() => {
    if (showVisualizarPacienteModal && pacienteVisualizando && pastaAtiva === 10) {
      setPacientePagamentoSelecionado(pacienteVisualizando);
      const pag = pagamentosPacientes[pacienteVisualizando.id];
      if (pag) setDadosPagamento(pag);
      else setDadosPagamento({ pacienteId: pacienteVisualizando.id, statusPagamento: 'em_aberto', formaPagamento: null, valorTotal: 0, valorPago: 0, valorPendente: 0, parcelas: [], dataUltimaAtualizacao: new Date() });
    }
  }, [showVisualizarPacienteModal, pacienteVisualizando?.id, pastaAtiva, pagamentosPacientes]);

  // Carregar prescrições quando abre aba 7
  useEffect(() => {
    if (showVisualizarPacienteModal && pacienteVisualizando && pastaAtiva === 7 && personalTrainer) {
      setPacientePrescricoesSelecionado(pacienteVisualizando);
      loadPrescricoesModal(pacienteVisualizando);
    }
  }, [showVisualizarPacienteModal, pacienteVisualizando?.id, pastaAtiva, personalTrainer, loadPrescricoesModal]);

  // Sincronizar paciente personal e carregar treino de hoje na aba 9
  useEffect(() => {
    if (showVisualizarPacienteModal && pacienteVisualizando && pastaAtiva === 9 && personalTrainer) {
      setPacientePersonalSelecionado(pacienteVisualizando);
      const patientId = pacienteVisualizando.userId || pacienteVisualizando.id;
      if (patientId && activeTabPersonal === 'hoje') {
        loadTodaySession(patientId);
      }
    }
  }, [showVisualizarPacienteModal, pacienteVisualizando?.id, pastaAtiva, personalTrainer, activeTabPersonal, loadTodaySession]);

  // Handler para cancelar compartilhamento
  const handleCancelarCompartilhamento = async (item: PacienteVisivelPersonal) => {
    if (!user || !personalTrainer) return;
    
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
      await SolicitacaoPersonalTrainerService.endCompartilhamento(
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

  // Handler para ver paciente (placeholder - será implementado quando houver pacientes)
  const handleVerPacienteNaPaginaPacientes = async (paciente: any) => {
    // TODO: Implementar quando houver pacientes compartilhados
    console.log('Ver paciente:', paciente);
  };

  // Handler para encerrar compartilhamento de paciente com médico (igual metanutri)
  const handleEncerrarCompartilhamento = useCallback(async (pacienteId: string, medicoId: string) => {
    if (!user || !personalTrainer) return;

    const pacientesList = pacientesPorMedico.get(medicoId) || [];
    const pacienteItem = pacientesList.find(p => p.paciente.id === pacienteId);
    const nomePaciente = pacienteItem?.paciente.dadosIdentificacao?.nomeCompleto || pacienteItem?.paciente.nome || 'este paciente';
    const medicoEncontrado = medicosList.find(m => m.medicoId === medicoId);
    const nomeMedico = medicoEncontrado?.nome || 'o médico';

    if (!confirm(
      `Tem certeza que deseja cancelar o compartilhamento de ${nomePaciente} com ${nomeMedico}?\n\n` +
      `Esta ação irá encerrar o compartilhamento ativo. Esta ação não pode ser desfeita.`
    )) return;

    setLoading(true);
    try {
      await SolicitacaoPersonalTrainerService.endCompartilhamento(pacienteId, user.uid, medicoId);
      alert('Compartilhamento encerrado com sucesso!');

      setPacientesPorMedico(prev => {
        const newMap = new Map(prev);
        const list = newMap.get(medicoId) || [];
        newMap.set(medicoId, list.filter(p => p.paciente.id !== pacienteId));
        return newMap;
      });
      setMedicosList(prev => prev.map(m =>
        m.medicoId === medicoId
          ? { ...m, countPacientes: Math.max(0, m.countPacientes - 1), pacienteIds: m.pacienteIds.filter(id => id !== pacienteId) }
          : m
      ));
      await loadMedicosVinculados();
      await loadPacientesList();
    } catch (error: any) {
      console.error('Erro ao encerrar compartilhamento:', error);
      alert(error.message || 'Erro ao encerrar compartilhamento.');
    } finally {
      setLoading(false);
    }
  }, [user, personalTrainer, pacientesPorMedico, medicosList, loadMedicosVinculados, loadPacientesList]);

  // Handler para excluir vínculo com médico
  const handleExcluirVinculoMedico = useCallback(async (medicoId: string) => {
    if (!user || !personalTrainer) return;
    
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
    
    setLoading(true);
    try {
      await SolicitacaoVinculoPersonalMedicoService.removeVinculoCompleto(
        medicoId,
        user.uid
      );
      alert('Vínculo excluído com sucesso!');
      
      // Recarregar personal trainer para atualizar medicoVinculadoIds
      const updated = await PersonalTrainerService.getPersonalTrainerByUserId(user.uid);
      if (updated) {
        setPersonalTrainer(updated);
      }
      
      // Recarregar médicos vinculados
      await loadMedicosVinculados();
      
      // Recarregar solicitações enviadas (caso haja alguma relacionada)
      await loadSolicitacoesVinculo();
    } catch (error: any) {
      console.error('Erro ao excluir vínculo:', error);
      alert(error.message || 'Erro ao excluir vínculo.');
    } finally {
      setLoading(false);
    }
  }, [user, personalTrainer, medicosList, loadMedicosVinculados, loadSolicitacoesVinculo]);

  // Carregar dados do perfil quando personal trainer for carregado
  useEffect(() => {
    if (personalTrainer) {
      setRegistroNumero(personalTrainer.registroNumero || '');
      setTelefoneContato(personalTrainer.telefone || '');
      setTelefoneDdiContato(personalTrainer.telefoneDdi || '');
      setTelefonePaisContato(personalTrainer.telefonePais || '');
      setCidadesSelecionadas(personalTrainer.cidades || []);
      setPerfilGenero((personalTrainer.genero as 'M' | 'F' | '') || '');
      setPerfilInstagram(personalTrainer.instagramUsuario || '');
      setPerfilCep(personalTrainer.cep || '');
      setPerfilNomeLocal(personalTrainer.nomeLocal || '');
      setPerfilEndereco(personalTrainer.endereco || '');
      setPerfilNumero(personalTrainer.numero || '');
      setPerfilPontoRef(personalTrainer.pontoReferencia || '');
      setPerfilGoogleMaps(personalTrainer.googleMapsUrl || '');
      setPerfilFotoUrl(personalTrainer.fotoPerfilUrl || user?.photoURL || null);
    }
  }, [personalTrainer, user?.photoURL]);

  // Carregar dados quando entrar na seção médicos
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'medicos') {
      if (abaAtivaMedicos === 'buscar') {
        loadEstadosCidadesMedicosDisponiveis();
      } else if (abaAtivaMedicos === 'solicitacoes') {
        loadSolicitacoesVinculo();
        loadSolicitacoesVinculoRecebidas();
      } else if (abaAtivaMedicos === 'vinculados') {
        loadMedicosVinculados();
      }
    }
  }, [user, personalTrainer, activeMenu, abaAtivaMedicos, loadEstadosCidadesMedicosDisponiveis, loadSolicitacoesVinculo, loadSolicitacoesVinculoRecebidas, loadMedicosVinculados]);

  // Carregar cidades disponíveis quando abrir o modal de perfil
  // Carrega cidades da coleção medicos (todas as cidades cadastradas nos médicos)
  useEffect(() => {
    if (activeMenu === 'meu-perfil' && personalTrainer) {
      loadCidadesDosMedicos();
    }
  }, [activeMenu, personalTrainer, loadCidadesDosMedicos]);

  // Carregar médicos verificados quando abrir o modal de link (ou aba link do perfil)
  useEffect(() => {
    if ((showLinkModal || meuPerfilAba === 'link') && personalTrainer && medicosVerificados.length === 0) {
      loadMedicosVerificados();
    }
  }, [showLinkModal, meuPerfilAba, personalTrainer, medicosVerificados.length, loadMedicosVerificados]);

  // Filtrar cidades do estado selecionado para mostrar apenas onde há médicos
  const cidadesDoEstado = estadoSelecionado
    ? cidadesComMedicos
        .filter(c => c.estado === estadoSelecionado)
        .map(c => c.cidade)
        .sort()
    : [];

  // Adicionar cidade
  const handleAddCidade = () => {
    if (!estadoSelecionado || !cidadeSelecionada) return;
    const existe = cidadesSelecionadas.some(
      c => c.estado === estadoSelecionado && c.cidade === cidadeSelecionada
    );
    if (existe) return;
    
    setCidadesSelecionadas([
      ...cidadesSelecionadas,
      { estado: estadoSelecionado, cidade: cidadeSelecionada }
    ]);
    setCidadeSelecionada('');
  };

  // Remover cidade
  const handleRemoveCidade = (index: number) => {
    setCidadesSelecionadas(cidadesSelecionadas.filter((_, i) => i !== index));
  };

  // Validação do perfil: registro (apenas números), pelo menos 1 cidade, telefone.
  // O botão Salvar permanece clicável; a mensagem diz o que ainda falta.
  const registroSoNumeros = registroNumero.replace(/\D/g, '');
  const phoneWritePerfil = professionalPhoneWriteFields({
    telefone: telefoneContato,
    telefoneDdi: telefoneDdiContato,
    telefonePais: telefonePaisContato,
  });
  const telefonePerfilValido = isValidIdentificacaoPhone({
    telefone: telefoneContato,
    telefoneDdi: telefoneDdiContato,
    telefonePais: telefonePaisContato,
  });
  const perfilSavePendencias = [
    !registroSoNumeros ? 'número do registro' : null,
    !telefonePerfilValido ? 'telefone válido' : null,
    cidadesSelecionadas.length < 1 ? 'pelo menos uma cidade de atendimento' : null,
  ].filter((item): item is string => Boolean(item));

  // Salvar perfil
  const handleSavePerfil = async () => {
    if (!user || !personalTrainer) return;
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
      await PersonalTrainerService.updatePerfil(
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
      setPersonalTrainer({
        ...personalTrainer,
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
      setSaveMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao salvar perfil. Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  const buscarEnderecoPorCepPersonal = async (cep: string) => {
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

  // Renderizar conteúdo baseado no menu ativo
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
      <MetapersonalHomeLeadsPipeline
        personalTrainerId={user?.uid}
        userEmail={user?.email}
        compartilhados={compartilhadosCrm}
        lembretes={lembretes}
        onOpenAbaPersonal={(pacienteId) => {
          const item = pacientesVisiveis.find(
            (p) => p.pacienteId === pacienteId || p.paciente?.id === pacienteId
          );
          const paciente = item?.paciente;
          if (!paciente) return;
          setActiveMenu('pacientes');
          if (isMobile) {
            const patientId = paciente.id || paciente.userId;
            if (patientId) {
              router.push(`/metapersonal?view=personal&pacienteId=${patientId}`);
            }
          } else {
            handleVisualizarPaciente(paciente, 9);
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
        if (!user || !personalTrainer) {
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
                role: 'personal',
                profileId: personalTrainer.id || user.uid,
                nome: personalTrainer.nome || user.displayName || 'Personal',
                email: user.email || personalTrainer.email || '',
                fotoUrl: personalTrainer.fotoPerfilUrl || perfilFotoUrl || null,
                subtitle: personalTrainer.registroNumero
                  ? `CREF ${personalTrainer.registroNumero}`
                  : null,
              }}
              loadDestinatarios={() =>
                loadDestinatariosMetapersonal({
                  personalProfileId: personalTrainer.id || user.uid,
                  pacientes: pacientesVisiveis.map((p) => p.paciente),
                  pacientesPorMedicoId: Object.fromEntries(
                    pacientesVisiveis
                      .filter((p) => p.paciente?.id && p.medicoId)
                      .map((p) => [p.paciente.id, p.medicoId])
                  ),
                  medicosVinculados: medicosList,
                  medicoVinculadoIds: personalTrainer.medicoVinculadoIds || [],
                  organizationId: personalTrainer.organizationId || METODO_ORGANIZATION_ID,
                })
              }
              assinaturaDefaults={{
                role: 'personal',
                displayName: personalTrainer.nome || user.displayName || 'Personal',
                registro: personalTrainer.registroNumero
                  ? `CREF ${personalTrainer.registroNumero}`
                  : null,
                telefone: personalTrainer.telefone || null,
                email: personalTrainer.email || user.email || null,
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
        const pagamentosListaHome = Object.values(pagamentosPacientes || {});
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
              recebido: pagamentosListaHome.reduce((sum, p) => sum + (p.valorPago || 0), 0),
              emAberto: pagamentosListaHome.reduce((sum, p) => sum + (p.valorPendente || 0), 0),
              previsto: pagamentosListaHome.reduce((sum, p) => sum + (p.valorTotal || 0), 0),
            }}
          />
        );
      }

      case 'leads':
        return <MetapersonalLeadsAgendaHub leadsContent={renderLeadsPipeline()} />;
      case 'treinos':
        if (!user) {
          return (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Carregando perfil…
            </div>
          );
        }
        return (
          <MetapersonalTreinosPage
            personalTrainerId={user.uid}
            pacientesVisiveis={pacientesVisiveis}
            loadingPacientes={loadingPacientesList}
            medicosVinculadosCount={personalTrainer?.medicoVinculadoIds?.length ?? 0}
            patientPhotoByUserId={patientPhotoByUserId}
            sidebarCollapsed={sidebarCollapsed}
          />
        );
      case 'historico':
        if (!user) {
          return (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Carregando perfil…
            </div>
          );
        }
        return (
          <MetapersonalHistoricoPage
            personalName={personalTrainer?.nome || user.displayName || 'Personal'}
            pacientesVisiveis={pacientesVisiveis}
            loadingPacientes={loadingPacientesList}
            patientPhotoByUserId={patientPhotoByUserId}
          />
        );
      case 'medicos':
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
                        ? 'border-yellow-600 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Médicos Vinculados
                  </button>
                  <button
                    onClick={() => setAbaAtivaMedicos('solicitacoes')}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'solicitacoes'
                        ? 'border-yellow-600 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Solicitações
                    {solicitacoesVinculo.filter(s => s.status === SOLICITACAO_STATUS.PENDENTE).length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        {solicitacoesVinculo.filter(s => s.status === SOLICITACAO_STATUS.PENDENTE).length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAbaAtivaMedicos('buscar')}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'buscar'
                        ? 'border-yellow-600 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Buscar Médicos
                  </button>
                </nav>
              </div>

              {/* Conteúdo das Abas */}
              {!personalTrainer?.isVerificado ? (
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
                        {/* Estado e Cidade lado a lado */}
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                          >
                            <Search size={18} />
                            Buscar
                          </button>
                        </div>
                      </div>

                      {/* Loading */}
                          {loadingMedicosDisponiveis ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
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
                            const jaVinculado = personalTrainer?.medicoVinculadoIds?.includes(medico.id);
                            const jaSolicitado = solicitacoesVinculo.some(s => 
                              s.medicoId === medico.id && 
                              (s.status === SOLICITACAO_STATUS.PENDENTE || s.status === SOLICITACAO_STATUS.ACEITA)
                            );
                            
                            const primeiraCidade = medico.cidades && medico.cidades.length > 0 
                              ? `${medico.cidades[0].cidade}, ${medico.cidades[0].estado}`
                              : null;
                            
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
                                        className="px-2.5 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 active:bg-yellow-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-medium flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
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
                                      className="w-full px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 active:bg-yellow-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm"
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
                                              onClick={() => handleAceitarVinculo(solicitacao.id)}
                                              disabled={loading}
                                              className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                            >
                                              <CheckCircle size={14} />
                                              Aceitar
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
                                                    onClick={() => handleAceitarVinculo(solicitacao.id)}
                                                    disabled={loading}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                  >
                                                    <CheckCircle size={14} />
                                                    Aceitar
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
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
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
                        kind="personal"
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
                          void handleVisualizarPaciente(paciente, 9);
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
                                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto"></div>
                                              <p className="mt-2 text-sm text-gray-600">Carregando pacientes...</p>
                                            </div>
                                          ) : pacientesList.length === 0 ? (
                                            <div className="text-center py-4 text-sm text-gray-500">
                                              Nenhum paciente compartilhado
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              {pacientesList.map((item) => {
                                                const nomePaciente = item.paciente?.dadosIdentificacao?.nomeCompleto || item.paciente?.nome || 'Paciente sem nome';
                                                return (
                                                  <div
                                                    key={item.paciente?.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => { void handleVisualizarPaciente(item.paciente, 9); }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        void handleVisualizarPaciente(item.paciente, 9);
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
                                                          handleEncerrarCompartilhamento(item.paciente?.id, medico.medicoId);
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
                                        kind="personal"
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
                                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto"></div>
                                          <p className="mt-2 text-sm text-gray-600">Carregando pacientes...</p>
                                        </div>
                                      ) : pacientesList.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-gray-500">
                                          Nenhum paciente compartilhado
                                        </div>
                                      ) : (
                                        <VinculoMobilePacientesList
                                          kind="personal"
                                          patients={pacientesList.filter((item) => item.paciente)}
                                          filtro={filtroMobileMedicosVinculados}
                                          onFiltroChange={setFiltroMobileMedicosVinculados}
                                          renderItem={(item) => {
                                            const nomePaciente = item.paciente.dadosIdentificacao?.nomeCompleto || item.paciente.nome || 'Paciente sem nome';
                                            return (
                                              <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => { void handleVisualizarPaciente(item.paciente, 9); }}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    void handleVisualizarPaciente(item.paciente, 9);
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
                                                      handleEncerrarCompartilhamento(item.paciente?.id, medico.medicoId);
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                {medicosUnicosPacientes.length > 0 && (
                  <div className="sm:w-56">
                    <select
                      value={filtroMedicoPacientes}
                      onChange={(e) => setFiltroMedicoPacientes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando pacientes...</p>
                </div>
              ) : (
                <>
                  {/* Empty states */}
                  {!personalTrainer.isVerificado ? (
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
                                          title="Cancelar compartilhamento"
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
                          const isSelecionado = isExpanded;
                          
                          return (
                            <div key={item.pacienteId} className={`shadow rounded-lg transition-all overflow-hidden ${
                              isSelecionado 
                                ? 'p-[2px] bg-gradient-to-r from-yellow-500 to-orange-500' 
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

                                {/* Botões de ação */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {/* Botão Editar */}
                                    <button
                                      onClick={() => handleVisualizarPaciente(paciente, 1, true)}
                                      className="p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                      title="Editar"
                                    >
                                      <Edit size={18} />
                                    </button>
                                    {/* Botão Aplicações */}
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
                                    {/* Botão Exames */}
                                    {(() => {
                                      const temExames = (paciente.examesLaboratoriais || []).length > 0;
                                      return (
                                        <button
                                          onClick={() => {
                                            setPacienteExamesSelecionado(paciente);
                                            setShowModalExames(true);
                                            // Inicializar com o exame mais recente se houver
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
                                    {/* Botão Nutri */}
                                    {(() => {
                                      const temNutricao = pacientesComNutricao[paciente.id] || false;
                                      return (
                                        <button
                                          onClick={() => {
                                            setPacienteNutricaoSelecionado(paciente);
                                            setShowModalNutricao(true);
                                          }}
                                          className={`p-2 rounded-md transition-colors ${
                                            temNutricao
                                              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                          }`}
                                          title="Nutrição"
                                        >
                                          <UtensilsCrossed size={18} />
                                        </button>
                                      );
                                    })()}
                                    {/* Botão Personal Trainer — mesma página do /meta; ?from=metapersonal faz header mostrar só "Aluno: nome" */}
                                    {(() => {
                                      const temPersonal = !!(paciente.userId && pacientesComTreinos.has(paciente.userId)) || !!(paciente.id && pacientesComTreinos.has(paciente.id));
                                      return (
                                        <button
                                          onClick={() => {
                                            const patientId = paciente.id || paciente.userId;
                                            if (patientId) {
                                              router.push(`/metapersonal?view=personal&pacienteId=${patientId}`);
                                            }
                                          }}
                                          className={`p-2 rounded-md transition-colors ${
                                            temPersonal
                                              ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                          }`}
                                          title="Personal Trainer"
                                        >
                                          <Dumbbell size={18} />
                                        </button>
                                      );
                                    })()}
                                    {/* Botão Excluir (cancelar compartilhamento) */}
                                    <button
                                      onClick={() => handleCancelarCompartilhamento(item)}
                                      className="p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                      title="Cancelar compartilhamento"
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
                                        <Edit size={18} />
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
                                      {(() => {
                                        const temNutricao = pacientesComNutricao[paciente.id] || false;
                                        return (
                                          <button
                                            onClick={() => {
                                              setPacienteNutricaoSelecionado(paciente);
                                              setShowModalNutricao(true);
                                            }}
                                            className={`p-2 rounded-md transition-colors ${
                                              temNutricao
                                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                            }`}
                                            title="Nutrição"
                                          >
                                            <UtensilsCrossed size={18} />
                                          </button>
                                        );
                                      })()}
                                      {(() => {
                                        const temPersonal = !!(paciente.userId && pacientesComTreinos.has(paciente.userId)) || !!(paciente.id && pacientesComTreinos.has(paciente.id));
                                        return (
                                          <button
                                            onClick={() => {
                                              const patientId = paciente.id || paciente.userId;
                                              if (patientId) {
                                                router.push(`/metapersonal?view=personal&pacienteId=${patientId}`);
                                              }
                                            }}
                                            className={`p-2 rounded-md transition-colors ${
                                              temPersonal
                                                ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                            }`}
                                            title="Personal Trainer"
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
                                        title="Cancelar compartilhamento"
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
            accentClassName="text-yellow-700 hover:text-yellow-900"
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
            tags={LEMBRETE_TAGS_PERSONAL}
            isMobile={isMobile}
            loading={loadingPacientesList}
            defaultTelefoneAviso={telefoneContato || personalTrainer?.telefone}
            defaultTelefoneAvisoDdi={telefoneDdiContato || personalTrainer?.telefoneDdi}
            defaultTelefoneAvisoPais={telefonePaisContato || personalTrainer?.telefonePais}
            avisoAudience="personal"
            onRefresh={async () => {
              await loadPacientesList();
              await loadPagamentos(pacientesVisiveis.map((p) => p.paciente));
              await loadLembretes();
              await loadConsultasAgenda();
            }}
            onSaveConsulta={async (input) => {
              const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/meetings/update', {
                method: 'POST',
                body: JSON.stringify(input),
              });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(data.error || 'Falha ao salvar consulta.');
              await loadConsultasAgenda();
              await loadLembretes();
            }}
            onDeleteConsulta={async (id) => {
              const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/meetings/update', {
                method: 'POST',
                body: JSON.stringify({ id, delete: true }),
              });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(data.error || 'Falha ao apagar consulta.');
              await loadConsultasAgenda();
              await loadLembretes();
            }}
            onToggleConsultaRealizada={async (id, realizada) => {
              const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/meetings/update', {
                method: 'POST',
                body: JSON.stringify({ id, realizada }),
              });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(data.error || 'Falha ao atualizar a consulta.');
              await loadConsultasAgenda();
            }}
            onOpenPaciente={(p) => handleVisualizarPaciente(p)}
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
                personalTrainerId: user.uid,
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

      case 'meu-perfil':
        return (
          <div className="w-full max-w-none space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden max-h-[calc(100dvh-8.5rem)] md:max-h-[calc(100dvh-2.5rem)]">
            {/* Cabeçalho */}
            <div className="shrink-0 flex items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-t-2xl">
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
                  <p className="text-yellow-100 text-xs font-medium uppercase tracking-wider">Meu Perfil</p>
                  <h2 className="text-white font-bold">{personalTrainer?.nome || user?.displayName || 'Personal Trainer'}</h2>
                </div>
              </div>
            </div>

            {/* Abas de navegação */}
            <div className="shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
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
                          ? 'bg-white dark:bg-gray-800 text-yellow-700 dark:text-yellow-400 shadow-md ring-1 ring-yellow-500/20'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-800/60 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${ativa ? 'text-yellow-600' : ''}`} />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{short}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Conteúdo da aba */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6">

              {/* --- ABA: Dados Iniciais --- */}
              {meuPerfilAba === 'dados' && (
                <div className="space-y-5">
                  {/* Status badge */}
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${personalTrainer?.isVerificado ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    {personalTrainer?.isVerificado ? <ShieldCheck size={16} className="text-green-600" /> : <Clock size={16} className="text-yellow-600" />}
                    <span className={`text-sm font-semibold ${personalTrainer?.isVerificado ? 'text-green-900' : 'text-yellow-900'}`}>
                      {personalTrainer?.isVerificado ? 'Perfil verificado' : 'Aguardando verificação'}
                    </span>
                    {personalTrainer?.isVerificado && (
                      <span className="ml-auto text-xs text-green-700">{personalTrainer.medicoVinculadoIds.length} médico(s) vinculado(s)</span>
                    )}
                  </div>

                  <div className="rounded-2xl border border-dashed border-yellow-200 bg-yellow-50/30 p-5">
                    <MedicoFotoPerfilEditor
                      currentUrl={perfilFotoUrl}
                      onUrlChange={(url) => {
                        setPerfilFotoUrl(url);
                        if (!user?.uid) return;
                        void PersonalTrainerService.updateFotoPerfil(user.uid, url)
                          .then(() => {
                            setPersonalTrainer((prev) =>
                              prev ? { ...prev, fotoPerfilUrl: url } : prev
                            );
                          })
                          .catch((err) => {
                            console.error('Erro ao salvar foto de perfil do personal:', err);
                          });
                      }}
                      disabled={isSaving || loadingPersonalTrainer}
                      profissao="personal"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <UserCircle className="h-4 w-4 text-yellow-600" />
                        Gênero
                      </label>
                      <select
                        value={perfilGenero}
                        onChange={(e) => setPerfilGenero(e.target.value as 'M' | 'F' | '')}
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <ShieldCheck className="h-4 w-4 text-yellow-600" />
                        Nº do Registro (CREF) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={registroNumero}
                        onChange={(e) => setRegistroNumero(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 123456"
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Phone className="h-4 w-4 text-yellow-600" />
                        Telefone para contato *
                      </label>
                      <InternationalPhoneInput
                        id="metapersonal-perfil-telefone"
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
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <LinkIcon className="h-4 w-4 text-yellow-600" />
                        Instagram (@)
                      </label>
                      <input
                        type="text"
                        value={perfilInstagram}
                        onChange={(e) => setPerfilInstagram(e.target.value)}
                        placeholder="@usuario"
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
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
                      <MapPin className="h-4 w-4 text-yellow-600" />
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
                          if (v.length === 8) void buscarEnderecoPorCepPersonal(v);
                        }}
                        placeholder="00000-000"
                        maxLength={9}
                        className="flex-1 block rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                      />
                      <button
                        type="button"
                        onClick={() => void buscarEnderecoPorCepPersonal(perfilCep)}
                        disabled={perfilCep.length !== 8 || buscandoCepPerfil}
                        className="px-4 py-2.5 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                      >
                        {buscandoCepPerfil ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Building className="h-4 w-4 text-yellow-600" />
                      Nome do local ou academia
                    </label>
                    <input
                      type="text"
                      value={perfilNomeLocal}
                      onChange={(e) => setPerfilNomeLocal(e.target.value)}
                      placeholder="Ex: Academia Fitness, Studio Personal"
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
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
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-800">Número</label>
                      <input
                        type="text"
                        value={perfilNumero}
                        onChange={(e) => setPerfilNumero(e.target.value)}
                        placeholder="Ex: 1200"
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-800">Ponto de referência</label>
                    <input
                      type="text"
                      value={perfilPontoRef}
                      onChange={(e) => setPerfilPontoRef(e.target.value)}
                      placeholder="Ex: Próximo ao parque, sala 3"
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <LinkIcon className="h-4 w-4 text-yellow-600" />
                      URL do Google Maps
                    </label>
                    <input
                      type="url"
                      value={perfilGoogleMaps}
                      onChange={(e) => setPerfilGoogleMaps(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                    />
                    <p className="text-xs text-gray-500">No Google Maps, abra o local → Compartilhar → Copiar link e cole aqui.</p>
                    {perfilGoogleMaps.trim() && (
                      <a href={perfilGoogleMaps.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-700">
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
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow disabled:opacity-50"
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
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow disabled:opacity-50"
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesDoEstado.map((cidade) => <option key={cidade} value={cidade}>{cidade}</option>)}
                    </select>
                    <button
                      onClick={handleAddCidade}
                      disabled={!estadoSelecionado || !cidadeSelecionada}
                      className="px-5 py-2.5 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium shrink-0"
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
                            <MapPin className="h-4 w-4 text-yellow-600 shrink-0" />
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
                      A integração de assinatura digital para personal trainers está disponível mediante configuração pelo administrador da plataforma.
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
                      <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-100 dark:border-yellow-800/40 p-5">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300 mb-3">
                          <LinkIcon className="h-5 w-5" />
                          <span className="font-semibold text-sm">Link público do personal trainer</span>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-inner border border-yellow-100 dark:border-gray-700 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                            className="px-5 py-2.5 bg-yellow-500 text-white text-sm font-semibold rounded-xl hover:bg-yellow-600 shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
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

                  {medicosVerificados.length > 0 && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <LinkIcon className="h-4 w-4 text-yellow-600" />
                        Gerar link associado ao médico
                      </label>
                      <select
                        value={medicoSelecionadoReferral}
                        onChange={(e) => {
                          setMedicoSelecionadoReferral(e.target.value);
                          const medico = medicosVerificados.find(m => m.id === e.target.value);
                          if (medico && personalTrainer) {
                            const gerarSlug = (nome: string) => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-');
                            const slugMedico = gerarSlug(medico.nome);
                            const slugPersonal = gerarSlug(personalTrainer.nome);
                            const link = buildOrganizacaoPublicUrl(`/dr/${slugMedico}/${slugPersonal}`);
                            setLinkReferralGerado(link);
                          } else {
                            setLinkReferralGerado('');
                          }
                        }}
                        className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/25 focus:border-yellow-500 transition-shadow"
                      >
                        <option value="">Selecione o médico</option>
                        {medicosVerificados
                          .filter(m => personalTrainer?.medicoVinculadoIds?.includes(m.id))
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.genero === 'F' ? 'Dra.' : 'Dr.'} {m.nome}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* --- ABA: WhatsApp --- */}
              {meuPerfilAba === 'whatsapp' && (
                <WhatsappConnectionSection
                  medicoId={personalTrainer?.id || personalTrainer?.userId || user?.uid || null}
                  disabled={loadingPersonalTrainer}
                  apiBasePath="/api/metapersonal/whatsapp"
                  profileMissingMessage="Perfil do personal trainer não carregado. Recarregue a página e tente novamente."
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
              <div className="relative z-[600] shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center gap-3">
                {saveMessage ? (
                  <div className={`flex-1 flex items-center gap-2 text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {saveMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {saveMessage.text}
                  </div>
                ) : perfilSavePendencias.length > 0 ? (
                  <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
                    Para salvar, informe: {perfilSavePendencias.join(', ')}.
                  </p>
                ) : null}
                {meuPerfilAba !== 'assinatura' && meuPerfilAba !== 'link' && (
                  <button
                    type="button"
                    onClick={handleSavePerfil}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto bg-yellow-500 hover:bg-yellow-600"
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
        return null;
    }
  };

  if (loading || loadingPersonalTrainer) {
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

  if (!user) return null;

  if (!personalTrainer) {
    return (
      <ProfissionalCadastroGateModal
        tipo="personal"
        loading={criandoCadastroPersonal}
        onConfirm={handleConfirmarCadastroPersonal}
        onDecline={handleRecusarCadastroPersonal}
      />
    );
  }

  const telaBloqueioVerificacaoPersonal =
    !!user?.uid &&
    !loading &&
    !loadingPersonalTrainer &&
    !!personalTrainer &&
    personalTrainer.isVerificado !== true;

  return (
    <>
      {!telaBloqueioVerificacaoPersonal &&
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
      {telaBloqueioVerificacaoPersonal && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-black/50"
          aria-modal="true"
          role="dialog"
          aria-labelledby="metapersonal-bloqueio-verificacao-titulo"
        >
          <span id="metapersonal-bloqueio-verificacao-titulo" className="sr-only">
            Verificação obrigatória — cadastro de personal trainer
          </span>
          <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-white shadow-none dark:bg-gray-800">
            <MetaNutriPersonalWizard
              tipo="personal"
              profissional={personalTrainer}
              setProfissional={setPersonalTrainer}
              userDisplayName={user.displayName}
              userId={user.uid}
              onSave={async (_closeAfter, m) => {
                if (!m?.userId) return;
                await PersonalTrainerService.updateCadastroVerificacao(m.userId, {
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
                const fresh = await PersonalTrainerService.getPersonalTrainerByUserId(user.uid);
                if (fresh) {
                  setPersonalTrainer(fresh);
                  setMetaPersonalLoadTick((t) => t + 1);
                }
              }}
              saving={salvandoCadastroPersonal}
              setSaving={setSalvandoCadastroPersonal}
              resumeAfterLoadTick={metaPersonalLoadTick}
            />
          </div>
        </div>
      )}
    <div
      className="mp-shell-frame flex min-h-0 min-w-0 w-full max-w-full"
      style={organizationShellCssVars(shellChrome)}
    >
      {tabletNavOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:block xl:hidden"
          aria-hidden="true"
          onClick={() => setTabletNavOpen(false)}
        />
      ) : null}
      {/* Sidebar: no tablet (md–xl) fica recolhida; hamburger abre overlay. Desktop (xl+) inalterado. */}
      <div
        data-mp-nav="desktop"
        data-mp-nav-open={tabletNavOpen ? '' : undefined}
        data-organization-id={organizationShellContext.organizationId || undefined}
        data-organization-match={organizationShellContext.organizationMatch ? 'true' : 'false'}
        className={`mp-sidebar hidden md:block fixed inset-y-0 left-0 z-40 shadow-lg transition-all duration-300 border-r border-white/10 w-16 ${sidebarCollapsed ? 'xl:w-16' : 'xl:w-64'}`}
        style={{ backgroundColor: shellChrome.secondaryColor, ...organizationShellCssVars(shellChrome) }}
      >
        <div className="flex flex-col h-full">
          {/* Logo e botão de toggle */}
          <div className="mp-sidebar-top flex items-center justify-between h-16 px-2 xl:px-4 border-b border-white/10">
            <div className={`mp-sidebar-label flex items-center ${sidebarCollapsed ? 'xl:hidden' : ''}`}>
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
          <div className={`mp-sidebar-label px-4 py-4 border-b border-white/10 ${sidebarCollapsed ? 'xl:hidden' : ''}`}>
              <div className="mb-2">
                <p className={organizationShellForegroundClass(shellChrome, 'text-sm font-semibold text-[#E8EDED]')}>Bem-vindo,</p>
                <div className="flex items-center gap-2">
                  <p className={organizationShellForegroundClass(shellChrome, 'text-sm font-semibold text-[#E8EDED]')}>
                    {personalTrainer?.nome || user?.displayName || 'Personal Trainer'}
                  </p>
                  {personalTrainer && (
                    personalTrainer.isVerificado ? (
                      <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Shield className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={organizationShellBadgeClass(shellChrome, 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#4CCB7A]/20 text-[#4CCB7A] border border-[#4CCB7A]/40')}>Personal</span>
                {agregadoPersonal && agregadoPersonal.count > 0 && (
                  <button
                    onClick={async () => {
                      const id = personalTrainer?.id || personalTrainer?.userId;
                      if (!id) return;
                      setDetalhamentoVisualizar(null);
                      setShowModalClassificacaoVisualizar(true);
                      const det = await ClassificacaoProfissionalService.getDetalhamento('personal', id);
                      setDetalhamentoVisualizar(det);
                    }}
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                    title="Ver detalhes das avaliações"
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} className={s <= Math.round(agregadoPersonal.media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    ))}
                    <span className={organizationShellForegroundClass(shellChrome, 'text-xs text-[#E8EDED]/70')}>{agregadoPersonal.count} • {agregadoPersonal.media.toFixed(1)}</span>
                  </button>
                )}
              </div>
            </div>

          {/* Navigation */}
          <nav className={`mp-sidebar-nav flex-1 py-4 space-y-2 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            <button
              onClick={() => navegarMenuPrincipal('home')}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'home'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Dashboard"
            >
              <LayoutDashboard size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Dashboard</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('leads')}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'leads'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Leads"
            >
              <Kanban size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Leads</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('medicos')}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'medicos'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Médicos"
            >
              <Stethoscope size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Médicos</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('pacientes')}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors relative ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'pacientes'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Pacientes"
            >
              <Users size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Pacientes</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('treinos')}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'treinos'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Treinos"
            >
              <Dumbbell size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Treinos</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('historico')}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'historico'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Histórico"
            >
              <History size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Histórico</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('financeiro')}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'financeiro'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Financeiro"
            >
              <DollarSign size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Financeiro</span>
            </button>
            <button
              onClick={() => navegarMenuPrincipal('calendario')}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'calendario'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Calendário"
            >
              <Calendar size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Calendário</span>
            </button>
            <button
              onClick={() => {
                navegarMenuPrincipal('comunicacao');
                void loadPacientesList();
                void loadMedicosVinculados();
              }}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'comunicacao'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="Comunicação"
            >
              <Mail size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>Comunicação</span>
            </button>
            <div className="relative overflow-visible">
              <button
              onClick={() => {
                fecharVisualizarPacienteModal();
                setMeuPerfilAba('whatsapp');
                setActiveMenu('meu-perfil');
                setTabletNavOpen(false);
              }}
              className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'meu-perfil' && meuPerfilAba === 'whatsapp'
                  ? organizationShellActiveClass(shellChrome, 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]')
                  : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
              }`}
              title="WhatsApp"
            >
              <MessageCircle size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              <span className={`mp-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>WhatsApp</span>
            </button>
              {showWhatsappConnectHint ? (
                <WhatsappConnectHintBalloon align={sidebarCollapsed ? 'center' : 'start'} />
              ) : null}
            </div>
          </nav>

          {/* Profile button */}
          <div className={`mp-sidebar-footer py-4 border-t border-white/10 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={`mp-sidebar-item w-full flex items-center py-2 text-sm font-medium ${organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')} rounded-md transition-colors ${
                  sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                }`}
                title="Perfil"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className={`mp-sidebar-item-icon w-8 h-8 rounded-full flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`}
                  />
                ) : (
                  <UserCircle size={sidebarCollapsed ? 24 : 20} className={`mp-sidebar-item-icon flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                )}
                <span className={`mp-sidebar-label flex flex-1 items-center ${sidebarCollapsed ? 'xl:hidden' : ''}`}>
                  <span className="flex-1 text-left">Perfil</span>
                  <ChevronDown size={16} className={showProfileDropdown ? 'rotate-180' : ''} />
                </span>
              </button>
              {showProfileDropdown && (
                <div className={`mp-profile-dropdown absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[280px] ${
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
      
      {/* Main Content Area — padding-left (não margin) evita overflow com sidebar fixed */}
      <div
        className={`mp-shell-main flex-1 min-w-0 max-w-full transition-all duration-300 pb-20 md:pb-0 bg-gray-50 dark:bg-gray-900 md:pl-16 ${
          sidebarCollapsed ? 'xl:pl-16' : 'xl:pl-64'
        }`}
      >
        {/* Header mobile — oculto no tablet (md+) e no desktop (xl+); oculto quando view=personal */}
        {!(searchParams.get('view') === 'personal' && searchParams.get('pacienteId')) && (
        <div
          data-mp-nav="mobile"
          className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1 min-w-0">
              {/* Logo personal trainer, logo verificação, nome e tipo */}
              {personalTrainer && (
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-2">
                    <OrganizationShellMobileMark
                      organizationId={organizationShellContext.organizationId}
                      logoSrc={headerOrganizationLogoSrc}
                      alt={sidebarOrganizationLogoAlt}
                    >
                      <Dumbbell className="h-6 w-6 text-blue-600 flex-shrink-0" />
                    </OrganizationShellMobileMark>
                    {personalTrainer.isVerificado ? (
                      <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                    ) : (
                      <Shield className="h-4 w-4 text-red-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {personalTrainer.nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-white truncate">Personal</span>
                      {agregadoPersonal && agregadoPersonal.count > 0 && (
                        <button
                          onClick={async () => {
                            const id = personalTrainer?.id || personalTrainer?.userId;
                            if (!id) return;
                            setDetalhamentoVisualizar(null);
                            setShowModalClassificacaoVisualizar(true);
                            const det = await ClassificacaoProfissionalService.getDetalhamento('personal', id);
                            setDetalhamentoVisualizar(det);
                          }}
                          className="flex items-center gap-0.5 cursor-pointer hover:opacity-80"
                          title="Ver detalhes das avaliações"
                        >
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={10} className={s <= Math.round(agregadoPersonal.media) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                          ))}
                          <span className="text-xs text-gray-500 ml-0.5">{agregadoPersonal.media.toFixed(1)} ({agregadoPersonal.count})</span>
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
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 xl:hidden"
                        >
                          <Stethoscope size={16} className="text-gray-600 dark:text-gray-400" />
                          Médicos
                        </button>
                        <button
                          onClick={() => {
                            setShowMensagensComunicacaoModal(true);
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 xl:hidden"
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
        )}
        
        {/* Notificação de Perfil Incompleto - oculta na view Personal (só header do aluno) */}
        {!(searchParams.get('view') === 'personal' && searchParams.get('pacienteId')) && personalTrainer && (() => {
          const perfilIncompleto = !personalTrainer.registroNumero ||
                                   !personalTrainer.registroNumero.trim() ||
                                   !personalTrainer.telefone ||
                                   !personalTrainer.telefone.trim() ||
                                   (personalTrainer.cidades?.length ?? 0) < 1;
          const semVinculo = !personalTrainer.medicoVinculadoIds || 
                            personalTrainer.medicoVinculadoIds.length === 0;
          
          if (perfilIncompleto || semVinculo) {
            return (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4 mb-0 md:mx-5 md:mt-5 xl:mx-6 xl:mt-6">
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
        
        {/* Content Area — view Personal embutida: full-bleed (sem p-6 / max-width) */}
        {searchParams.get('view') === 'personal' && searchParams.get('pacienteId') ? (
          <main className="p-0 w-full min-w-0 max-w-full">
            <Suspense fallback={<div className="p-4">Carregando...</div>}>
              <PersonalPageContent
                key={personalViewPacienteId}
                fromMetapersonalEmbedded
                patientBrowserTabs={{
                  tabs: personalTabsUi,
                  activeId: personalViewPacienteId,
                  onSelect: selectPersonalPatientTab,
                  onClose: closePersonalPatientTab,
                  onAdd: () => setPersonalTabPickerOpen(true),
                  onCloseAll: closeAllPersonalPatientTabs,
                }}
              />
            </Suspense>
            <MetapersonalPersonalPatientPicker
              open={personalTabPickerOpen}
              patients={personalPickerPatients}
              openIds={personalTabsUi.map((tab) => tab.id)}
              onClose={() => setPersonalTabPickerOpen(false)}
              onPick={addPersonalPatientTab}
            />
          </main>
        ) : (
          <main className={`mp-shell-content min-w-0 w-full max-w-full py-4 md:px-5 md:py-5 xl:px-6 xl:py-6 2xl:px-8 bg-gray-50 dark:bg-gray-900 ${
            ['home', 'pacientes', 'leads', 'financeiro', 'calendario', 'treinos', 'historico'].includes(activeMenu) ? 'px-2' : 'px-4'
          }`}>
            {renderContent()}
          </main>
        )}
      </div>

      {/* Bottom nav mobile — oculto no tablet (md+) e no desktop */}
      {!(searchParams.get('view') === 'personal' && searchParams.get('pacienteId')) && (
      <div
        data-mp-nav="mobile"
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50"
        style={organizationShellCssVars(shellChrome)}
      >
        <div className="flex items-center justify-around py-2 px-1">
          <button
            onClick={() => navegarMenuPrincipal('home')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'home'
                ? organizationShellActiveClass(shellChrome, 'bg-blue-100 text-blue-700', 'light')
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
                ? organizationShellActiveClass(shellChrome, 'bg-blue-100 text-blue-700', 'light')
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
                ? organizationShellActiveClass(shellChrome, 'bg-blue-100 text-blue-700', 'light')
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
                ? organizationShellActiveClass(shellChrome, 'bg-blue-100 text-blue-700', 'light')
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
                ? organizationShellActiveClass(shellChrome, 'bg-blue-100 text-blue-700', 'light')
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Calendário</span>
          </button>
        </div>
      </div>
      )}

      {/* Modal Mensagens (mobile — mesmo canal da Comunicação desktop) */}
      {showMensagensComunicacaoModal && personalTrainer && user && (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/50 lg:items-center lg:p-4">
          <div className="flex h-full w-full flex-col overflow-hidden bg-white lg:h-[min(90vh,820px)] lg:max-w-5xl lg:rounded-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-gray-900">Mensagens</h2>
                <p className="truncate text-sm text-gray-500">
                  Médicos, pacientes e nutricionistas vinculados
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
                  role: 'personal',
                  profileId: personalTrainer.id || user.uid,
                  nome: personalTrainer.nome || user.displayName || 'Personal',
                  email: user.email || personalTrainer.email || '',
                  fotoUrl: personalTrainer.fotoPerfilUrl || perfilFotoUrl || null,
                  subtitle: personalTrainer.registroNumero
                    ? `CREF ${personalTrainer.registroNumero}`
                    : null,
                }}
                loadDestinatarios={() =>
                  loadDestinatariosMetapersonal({
                    personalProfileId: personalTrainer.id || user.uid,
                    pacientes: pacientesVisiveis.map((p) => p.paciente),
                    pacientesPorMedicoId: Object.fromEntries(
                      pacientesVisiveis
                        .filter((p) => p.paciente?.id && p.medicoId)
                        .map((p) => [p.paciente.id, p.medicoId])
                    ),
                    medicosVinculados: medicosList,
                    medicoVinculadoIds: personalTrainer.medicoVinculadoIds || [],
                    organizationId: personalTrainer.organizationId || METODO_ORGANIZATION_ID,
                  })
                }
                assinaturaDefaults={{
                  role: 'personal',
                  displayName: personalTrainer.nome || user.displayName || 'Personal',
                  registro: personalTrainer.registroNumero
                    ? `CREF ${personalTrainer.registroNumero}`
                    : null,
                  telefone: personalTrainer.telefone || null,
                  email: personalTrainer.email || user.email || null,
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

      {/* Modal Controle Financeiro (personal ↔ paciente) */}
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
            await PagamentoService.salvarPagamentoPersonalTrainerPaciente(
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
      {showModalGrupoNovaPrescricao && novaPrescricaoContexto && personalTrainer && (
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
                      medicoId: personalTrainer.userId,
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
      {showModalPrescricoes && pacientePrescricoesSelecionado && personalTrainer && (
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
              {/* Body - scrollável */}
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
                  <div className="w-full space-y-3">
                    {(!prescricoesModal || prescricoesModal.length === 0) ? (
                      <p className="text-base text-gray-500 text-center py-8">Nenhuma prescrição cadastrada. Clique em &quot;Nova Prescrição&quot; para criar.</p>
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
                                !paraEditar.isTemplate && !!paraEditar.pacienteId
                                  ? paraEditar
                                  : null
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
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-1">Nenhuma prescrição selecionada</p>
                        <p className="text-sm text-gray-500 mb-4">Clique em uma prescrição na aba &quot;Prescrições Salvas&quot; para ver e editar a descrição.</p>
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
              {/* Footer */}
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
                                  : { medicoId: personalTrainer.userId, pacienteId: pacienteIdCtx, pacienteNome: pacientePrescricoesSelecionado.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, criadoEm: new Date(), atualizadoEm: new Date(), criadoPor: user?.email || '', isTemplate: false, pesoPaciente: peso ?? undefined };
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
                                    return { ...item, dosagem: '3,5g por dia', instrucoes: '3,5g/dia em 200ml de água. Preferencialmente pós-treino.', quantidade: '3,5g/dia' };
                                  }
                                  return item;
                                });
                              }
                              const doc = new jsPDF();
                              doc.setFontSize(16);
                              doc.text('PRESCRIÇÃO DE TREINO', 105, 20, { align: 'center' });
                              doc.setFontSize(12);
                              doc.text(`Paciente: ${pacientePrescricoesSelecionado.nome}`, 20, 35);
                              doc.text(`CREF: ${personalTrainer.registroNumero || 'N/A'}`, 20, 42);
                              doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 49);
                              let y = 60;
                              doc.setFontSize(10);
                              itensPrint.forEach((item, idx) => {
                                if (y > 250) {
                                  doc.addPage();
                                  y = 20;
                                }
                                doc.setFontSize(11);
                                doc.text(`${idx + 1}. ${item.medicamento}`, 20, y);
                                y += 7;
                                doc.setFontSize(10);
                                doc.text(`   Dosagem: ${item.dosagem}`, 20, y);
                                y += 5;
                                doc.text(`   Frequência: ${item.frequencia}`, 20, y);
                                y += 5;
                                if (item.quantidade) {
                                  doc.text(`   Quantidade: ${item.quantidade}`, 20, y);
                                  y += 5;
                                }
                                doc.text(`   Instruções: ${item.instrucoes}`, 20, y);
                                y += 8;
                              });
                              if (novaPrescricaoModal.observacoes) {
                                if (y > 250) {
                                  doc.addPage();
                                  y = 20;
                                }
                                doc.setFontSize(10);
                                doc.text(`Observações: ${novaPrescricaoModal.observacoes}`, 20, y);
                              }
                              doc.save(`prescricao_${pacientePrescricoesSelecionado.nome}_${new Date().toISOString().split('T')[0]}.pdf`);
                            }}
                            className="p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center justify-center"
                            title="Imprimir"
                          >
                            <Printer size={18} />
                          </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowModalPrescricoes(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                )}
              </div>
          </div>
        </div>
      )}

      {/* Modal de Nutrição — portal no body: mobile tela cheia acima do menu (bottom-16); desktop caixa centralizada */}
      {showModalNutricao && pacienteNutricaoSelecionado && personalTrainer && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-16 lg:bottom-0 z-[9999] flex flex-col overflow-hidden lg:flex lg:items-center lg:justify-center lg:bg-black/50">
          <div className="hidden lg:block fixed inset-0 bg-gray-500/75" onClick={() => setShowModalNutricao(false)} aria-hidden="true" />
          <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden lg:flex-none lg:max-w-6xl lg:w-full lg:h-[90vh] lg:rounded-lg lg:shadow-xl lg:relative lg:z-10">
            <PacienteModalHeader
              compact
              className="flex-shrink-0"
              patientName={
                pacienteNutricaoSelecionado.dadosIdentificacao?.nomeCompleto ||
                pacienteNutricaoSelecionado.nome ||
                'Paciente'
              }
              patientPhotoUrl={
                pacienteNutricaoSelecionado.userId
                  ? patientPhotoByUserId[pacienteNutricaoSelecionado.userId]
                  : null
              }
              dataNascimento={pacienteNutricaoSelecionado.dadosIdentificacao?.dataNascimento}
              cidade={pacienteNutricaoSelecionado.dadosIdentificacao?.endereco?.cidade}
              estado={pacienteNutricaoSelecionado.dadosIdentificacao?.endereco?.estado}
              statusTratamento={pacienteNutricaoSelecionado.statusTratamento}
              recomendacoesLidas={Boolean(pacienteNutricaoSelecionado.recomendacoesLidas)}
              dataLeituraRecomendacoes={pacienteNutricaoSelecionado.dataLeituraRecomendacoes}
              actions={
                <button
                  type="button"
                  onClick={() => setShowModalNutricao(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
              }
            />
            <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
              <NutriContent
                paciente={pacienteNutricaoSelecionado}
                setPaciente={(p: PacienteCompleto) => setPacienteNutricaoSelecionado(p)}
                modoNutricionista
                embedded
                somenteVisualizacao
              />
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal de Personal Trainer — mobile: não cobre a barra de menu inferior (bottom-16) */}
      {showModalPersonal && pacientePersonalSelecionado && personalTrainer && !showVisualizarPacienteModal && (
        <div className="fixed top-0 left-0 right-0 bottom-16 lg:bottom-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-stretch justify-center px-0 py-0 text-center sm:block sm:min-h-screen sm:p-0">
            <div className="fixed inset-0 bottom-16 lg:bottom-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModalPersonal(false)} />
            <div className="fixed top-0 left-0 right-0 bottom-16 lg:inset-0 z-10 flex flex-col overflow-y-auto bg-white sm:static sm:my-8 sm:inline-block sm:max-h-[90vh] sm:w-full sm:max-w-6xl sm:rounded-lg sm:shadow-xl">
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
                metaExtra={<span className="text-xs font-medium text-slate-500">Treinos</span>}
                actions={
                  <button
                    type="button"
                    onClick={() => setShowModalPersonal(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                    aria-label="Fechar"
                  >
                    <X size={24} />
                  </button>
                }
              />
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 flex-shrink-0 bg-gray-50">
                {[
                  { id: 'hoje', label: 'Hoje', icon: Calendar },
                  { id: 'cronograma', label: 'Cronograma', icon: Calendar },
                  { id: 'criar', label: 'Criar', icon: Plus },
                  { id: 'historico', label: 'Histórico', icon: History },
                  { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
                  { id: 'lembretes', label: 'Lembretes', icon: Bell },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTabPersonal(id as any);
                      const patientId = pacientePersonalSelecionado.userId || pacientePersonalSelecionado.id;
                      if (patientId) {
                        if (id === 'hoje') {
                          loadTodaySession(patientId);
                        } else if (id === 'cronograma') {
                          loadCalendarSessions(patientId);
                        } else if (id === 'historico') {
                          loadHistorico(patientId);
                        } else if (id === 'estatisticas') {
                          loadEstatisticas(patientId);
                        } else if (id === 'lembretes') {
                          loadReminderPrefs(patientId);
                        }
                      }
                    }}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTabPersonal === id
                        ? 'border-pink-500 text-pink-700 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={16} className="mx-auto mb-1" />
                    {label}
                  </button>
                ))}
              </div>
              
              {/* Conteúdo das Tabs */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full px-4 py-4">
                {activeTabPersonal === 'hoje' && (
                  <div className="space-y-6">
                    {loadingToday ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
                      </div>
                    ) : todaySessions.length > 0 ? (
                      <div className="space-y-6">
                        {todaySessions.length > 1 && (
                          <div className="bg-white rounded-lg shadow p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Selecione o treino:
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {todaySessions.map((session) => (
                                <button
                                  key={session.id}
                                  onClick={async () => {
                                    setSelectedTodaySessionId(session.id || null);
                                    const sessionData = todaySessions.find((s) => s.id === session.id);
                                    if (sessionData) {
                                      setPatientNotes(sessionData.patientNotes || '');
                                      if (session.id) {
                                        const exercises = await trainingSessionService.getSessionExercises(session.id);
                                        setTodayExercises(exercises);
                                      }
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedTodaySessionId === session.id
                                      ? 'bg-pink-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {session.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedTodaySessionId && (
                          <div className="bg-white rounded-lg shadow p-6 space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-xl font-bold text-gray-900">
                                {todaySessions.find((s) => s.id === selectedTodaySessionId)?.title}
                              </h2>
                              {(() => {
                                const total = todayExercises.length;
                                const done = todayExercises.filter((ex) => ex.status === 'done').length;
                                const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
                                return (
                                  <div className="text-right">
                                    <div className="text-sm text-gray-600">Progresso hoje</div>
                                    <div className="text-lg font-bold text-pink-600">{percentage}%</div>
                                    <div className="text-xs text-gray-500">
                                      {done}/{total} exercícios
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="space-y-4">
                              {todayExercises.map((exercise, index) => {
                                const isDone = exercise.status === 'done';
                                const isSkipped = exercise.status === 'skipped';
                                return (
                                  <div
                                    key={exercise.id || index}
                                    className={`relative bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all ${
                                      isDone
                                        ? 'border-green-300'
                                        : isSkipped
                                        ? 'border-red-300'
                                        : 'border-gray-200'
                                    }`}
                                  >
                                    <div className="flex flex-col sm:flex-row">
                                      {exercise.gifUrl && (
                                        <div className="w-full sm:w-32 md:w-40 h-48 sm:h-auto sm:min-h-[200px] flex-shrink-0 bg-gray-100">
                                          <img
                                            src={exercise.gifUrl}
                                            alt={translateExerciseName(exercise.name)}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      )}

                                      <div className="flex-1 flex flex-col">
                                        <div className={`px-4 py-3 flex-1 ${
                                          isDone
                                            ? 'bg-green-100'
                                            : isSkipped
                                            ? 'bg-red-100'
                                            : 'bg-gray-100'
                                        }`}>
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">
                                                {translateExerciseName(exercise.name)}
                                              </h3>
                                              <div className="flex gap-2 flex-wrap">
                                                <span className="text-xs font-semibold text-pink-800 bg-gray-50 px-2.5 py-1 rounded-full border border-pink-300">
                                                  {translateTarget(exercise.target)}
                                                </span>
                                                {exercise.equipment && exercise.equipment !== 'body weight' && (
                                                  <span className="text-xs font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-300">
                                                    {translateEquipment(exercise.equipment)}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            {(isDone || isSkipped) && (
                                              <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                                                isDone
                                                  ? 'bg-green-500 text-white'
                                                  : 'bg-red-500 text-white'
                                              }`}>
                                                {isDone ? (
                                                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                                ) : (
                                                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {exercise.prescription && (
                                          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                            <p className="text-center text-sm sm:text-base font-semibold text-pink-600">
                                              {formatTrainingSeriesSummary(exercise.prescription)}
                                            </p>
                                            <p className="text-center text-xs text-gray-600 mt-1 font-medium">
                                              Descanso {getEffectiveRestSec(exercise.prescription)}s
                                            </p>
                                          </div>
                                        )}

                                        {!isDone && !isSkipped ? (
                                          <div className="px-4 py-3 bg-gray-100 border-t border-gray-200">
                                            <div className="flex gap-2">
                                              <button
                                                onClick={async () => {
                                                  if (!selectedTodaySessionId || !exercise.id) return;
                                                  setSavingStatus(true);
                                                  try {
                                                    await trainingSessionService.markExercise(selectedTodaySessionId, exercise.id, 'done');
                                                    const exercises = await trainingSessionService.getSessionExercises(selectedTodaySessionId);
                                                    setTodayExercises(exercises);
                                                  } catch (error) {
                                                    console.error('Erro ao marcar exercício:', error);
                                                  } finally {
                                                    setSavingStatus(false);
                                                  }
                                                }}
                                                disabled={savingStatus}
                                                className="flex-1 px-4 py-2.5 bg-green-600 text-white font-semibold text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all"
                                              >
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Feito</span>
                                              </button>
                                              <button
                                                onClick={async () => {
                                                  if (!selectedTodaySessionId || !exercise.id) return;
                                                  setSavingStatus(true);
                                                  try {
                                                    await trainingSessionService.markExercise(selectedTodaySessionId, exercise.id, 'skipped');
                                                    const exercises = await trainingSessionService.getSessionExercises(selectedTodaySessionId);
                                                    setTodayExercises(exercises);
                                                  } catch (error) {
                                                    console.error('Erro ao marcar exercício:', error);
                                                  } finally {
                                                    setSavingStatus(false);
                                                  }
                                                }}
                                                disabled={savingStatus}
                                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all"
                                              >
                                                <XCircle className="w-4 h-4" />
                                                <span>Pulei</span>
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="px-4 py-3 bg-gray-100 border-t border-gray-200">
                                            <button
                                              onClick={async () => {
                                                if (!selectedTodaySessionId || !exercise.id) return;
                                                setSavingStatus(true);
                                                try {
                                                  const { db } = await import('@/lib/firebase');
                                                  const { doc, updateDoc, deleteField } = await import('firebase/firestore');
                                                  const exerciseRef = doc(db, 'trainingSessions', selectedTodaySessionId, 'exercises', exercise.id);
                                                  await updateDoc(exerciseRef, {
                                                    status: deleteField(),
                                                    completedAt: deleteField(),
                                                  });
                                                  const exercises = await trainingSessionService.getSessionExercises(selectedTodaySessionId);
                                                  setTodayExercises(exercises);
                                                } catch (error) {
                                                  console.error('Erro ao desfazer:', error);
                                                } finally {
                                                  setSavingStatus(false);
                                                }
                                              }}
                                              disabled={savingStatus}
                                              className="w-full px-4 py-2.5 bg-gray-600 text-white font-semibold text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all"
                                            >
                                              <X className="w-4 h-4" />
                                              <span>Desfazer</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Observações do treino
                              </label>
                              <textarea
                                value={patientNotes}
                                onChange={(e) => setPatientNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                                rows={3}
                                placeholder="Anote como foi o treino..."
                              />
                              <button
                                onClick={async () => {
                                  if (!selectedTodaySessionId) return;
                                  setSavingNotes(true);
                                  try {
                                    await trainingSessionService.updateSession(selectedTodaySessionId, {
                                      patientNotes,
                                    });
                                    alert('Observações salvas com sucesso!');
                                  } catch (error) {
                                    console.error('Erro ao salvar observações:', error);
                                    alert('Erro ao salvar observações. Tente novamente.');
                                  } finally {
                                    setSavingNotes(false);
                                  }
                                }}
                                disabled={savingNotes}
                                className="w-full sm:w-auto px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                {savingNotes ? 'Salvando...' : 'Salvar observações'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600 mb-6">
                          Nenhum treino para hoje.
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setActiveTabPersonal('criar')}
                            className="px-3 py-1.5 bg-pink-600 text-white text-sm font-medium rounded-md hover:bg-pink-700 transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Criar
                          </button>
                          <button
                            onClick={() => setActiveTabPersonal('cronograma')}
                            className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Cronograma
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTabPersonal === 'cronograma' && pacientePersonalSelecionado && (
                  <CalendarioTreinosPersonal
                    pacienteId={pacientePersonalSelecionado.userId || pacientePersonalSelecionado.id}
                    personalTrainerId={personalTrainer.userId}
                    onSessionClick={async (session) => {
                      setSelectedSessionForDetail(session);
                      if (session.id) {
                        const exercises = await trainingSessionService.getSessionExercises(session.id);
                        setSelectedSessionExercisesDetail(exercises);
                      }
                    }}
                    onSessionDelete={async (sessionId) => {
                      if (!confirm('Tem certeza que deseja cancelar este treino? Esta ação não pode ser desfeita.')) {
                        return;
                      }
                      setDeletingSession(true);
                      try {
                        await trainingSessionService.deleteSession(sessionId);
                        const patientId = pacientePersonalSelecionado.userId || pacientePersonalSelecionado.id;
                        if (patientId) {
                          await loadCalendarSessions(patientId);
                          await loadTodaySession(patientId);
                        }
                        setSelectedSessionForDetail(null);
                        setSelectedSessionExercisesDetail([]);
                        alert('Treino cancelado com sucesso!');
                      } catch (error) {
                        console.error('Erro ao deletar sessão:', error);
                        alert('Erro ao cancelar treino. Tente novamente.');
                      } finally {
                        setDeletingSession(false);
                      }
                    }}
                    onExerciseDelete={async (sessionId, exerciseDocId) => {
                      if (!confirm('Tem certeza que deseja remover este exercício do treino?')) {
                        return;
                      }
                      setDeletingExercise(exerciseDocId);
                      try {
                        const { db } = await import('@/lib/firebase');
                        const { doc, deleteDoc } = await import('firebase/firestore');
                        await deleteDoc(doc(db, 'trainingSessions', sessionId, 'exercises', exerciseDocId));
                        const exercises = await trainingSessionService.getSessionExercises(sessionId);
                        setSelectedSessionExercisesDetail(exercises);
                        alert('Exercício removido com sucesso!');
                      } catch (error) {
                        console.error('Erro ao deletar exercício:', error);
                        alert('Erro ao remover exercício.');
                      } finally {
                        setDeletingExercise(null);
                      }
                    }}
                  />
                )}

                {activeTabPersonal === 'criar' && pacientePersonalSelecionado && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Criar Novo Treino</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Título do Treino *</label>
                          <input
                            type="text"
                            value={newSessionTitle}
                            onChange={(e) => setNewSessionTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Ex: Treino de Peito e Tríceps"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                          <input
                            type="date"
                            value={newSessionDate}
                            onChange={(e) => setNewSessionDate(e.target.value)}
                            min={toLocalYYYYMMDD(new Date())}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Sessão</label>
                          <div className="flex gap-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="sessionType"
                                value="single"
                                checked={sessionType === 'single'}
                                onChange={(e) => setSessionType(e.target.value as 'single' | 'recurring')}
                                className="mr-2"
                              />
                              Única
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="sessionType"
                                value="recurring"
                                checked={sessionType === 'recurring'}
                                onChange={(e) => setSessionType(e.target.value as 'single' | 'recurring')}
                                className="mr-2"
                              />
                              Recorrente
                            </label>
                          </div>
                        </div>
                        {sessionType === 'recurring' && (
                          <div className="space-y-4 border-t pt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Frequência</label>
                              <select
                                value={recurrenceFrequency}
                                onChange={(e) => setRecurrenceFrequency(e.target.value as 'daily' | 'weekly' | 'custom')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="daily">Diária</option>
                                <option value="weekly">Semanal</option>
                                <option value="custom">Personalizada</option>
                              </select>
                            </div>
                            {recurrenceFrequency === 'weekly' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantas semanas?</label>
                                  <input
                                    type="number"
                                    value={weeksCount}
                                    onChange={(e) => setWeeksCount(parseInt(e.target.value) || 4)}
                                    min={1}
                                    max={52}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantas vezes por semana?</label>
                                  <input
                                    type="number"
                                    value={timesPerWeek}
                                    onChange={(e) => setTimesPerWeek(parseInt(e.target.value) || 3)}
                                    min={1}
                                    max={7}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Adicionar Exercícios</h2>
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar exercício..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <select
                            value={selectedBodyPart}
                            onChange={(e) => setSelectedBodyPart(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Parte do Corpo</option>
                            {bodyParts.map((bp) => (
                              <option key={bp} value={bp}>{translateBodyPart(bp)}</option>
                            ))}
                          </select>
                          <select
                            value={selectedTarget}
                            onChange={(e) => setSelectedTarget(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Grupo Muscular</option>
                            {targets.map((t) => (
                              <option key={t} value={t}>{translateTarget(t)}</option>
                            ))}
                          </select>
                          <select
                            value={selectedEquipment}
                            onChange={(e) => setSelectedEquipment(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Equipamento</option>
                            {equipments.map((eq) => (
                              <option key={eq} value={eq}>{translateEquipment(eq)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {loadingExercises ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
                        </div>
                      ) : exercisesResults.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                          {exercisesResults.map((exercise) => (
                            <div
                              key={exercise.id}
                              className="border border-gray-200 rounded-lg p-3 hover:border-pink-300 cursor-pointer"
                              onClick={() => {
                                if (!selectedExercises.find((e) => e.id === exercise.id)) {
                                  const gifUrl = exercise.gifUrl || getExerciseGifUrl(exercise.id, '360');
                                  setSelectedExercises([
                                    ...selectedExercises,
                                    {
                                      ...exercise,
                                      gifUrl: gifUrl,
                                      sets: 3,
                                      reps: 10,
                                      restSec: 60,
                                    },
                                  ]);
                                }
                              }}
                            >
                              {exercise.gifUrl && (
                                <img
                                  src={exercise.gifUrl}
                                  alt={translateExerciseName(exercise.name)}
                                  className="w-full h-32 object-cover rounded mb-2"
                                />
                              )}
                              <h4 className="font-medium text-sm">{translateExerciseName(exercise.name)}</h4>
                              <p className="text-xs text-gray-500">{translateTarget(exercise.target)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">Nenhum exercício encontrado. Use os filtros para buscar.</p>
                      )}
                    </div>

                    {selectedExercises.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Exercícios Selecionados ({selectedExercises.length})</h2>
                        <div className="space-y-4">
                          {selectedExercises.map((exercise, idx) => (
                            <div key={exercise.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium">{translateExerciseName(exercise.name)}</h4>
                                  <p className="text-sm text-gray-500">{translateTarget(exercise.target)}</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedExercises(selectedExercises.filter((e) => e.id !== exercise.id));
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Séries</label>
                                  <input
                                    type="number"
                                    value={exercise.sets}
                                    onChange={(e) => {
                                      const newExercises = [...selectedExercises];
                                      newExercises[idx] = { ...exercise, sets: parseInt(e.target.value) || 0 };
                                      setSelectedExercises(newExercises);
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Repetições</label>
                                  <input
                                    type="number"
                                    value={exercise.reps}
                                    onChange={(e) => {
                                      const newExercises = [...selectedExercises];
                                      newExercises[idx] = { ...exercise, reps: parseInt(e.target.value) || 0 };
                                      setSelectedExercises(newExercises);
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Descanso (s)</label>
                                  <input
                                    type="number"
                                    value={exercise.restSec}
                                    onChange={(e) => {
                                      const newExercises = [...selectedExercises];
                                      newExercises[idx] = { ...exercise, restSec: parseInt(e.target.value) || 0 };
                                      setSelectedExercises(newExercises);
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    min={0}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={async () => {
                            if (!newSessionTitle.trim() || !newSessionDate) {
                              alert('Preencha título e data do treino.');
                              return;
                            }
                            if (selectedExercises.length === 0) {
                              alert('Adicione pelo menos um exercício.');
                              return;
                            }
                            setCreatingSession(true);
                            try {
                              const patientId = pacientePersonalSelecionado.userId || pacientePersonalSelecionado.id;
                              if (!patientId) {
                                alert('ID do paciente não encontrado.');
                                return;
                              }
                              const exercisesData = selectedExercises.map((ex) => ({
                                exerciseId: ex.id,
                                name: ex.name,
                                target: ex.target,
                                bodyPart: ex.bodyPart,
                                equipment: ex.equipment,
                                gifUrl: ex.gifUrl,
                                prescription: serializeTrainingPrescription({
                                  sets: ex.sets,
                                  reps: ex.reps,
                                  restSec: ex.restSec,
                                }),
                              }));
                              let sessionDates: string[] = [];
                              if (sessionType === 'single') {
                                sessionDates = [newSessionDate];
                              } else {
                                // Lógica para recorrente (simplificada)
                                const startDate = new Date(newSessionDate);
                                for (let i = 0; i < weeksCount; i++) {
                                  for (let j = 0; j < timesPerWeek; j++) {
                                    const date = new Date(startDate);
                                    date.setDate(startDate.getDate() + (i * 7) + (j * Math.floor(7 / timesPerWeek)));
                                    sessionDates.push(toLocalYYYYMMDD(date));
                                  }
                                }
                              }
                              for (const date of sessionDates) {
                                await trainingSessionService.createSessionWithExercises(
                                  {
                                    patientId: patientId,
                                    createdBy: 'personal_trainer',
                                    createdById: personalTrainer.userId,
                                    scheduledDate: date,
                                    title: newSessionTitle,
                                    status: 'scheduled',
                                    published: true,
                                  },
                                  exercisesData
                                );
                              }
                              alert(`Treino criado com sucesso! ${sessionDates.length} ${sessionDates.length === 1 ? 'sessão' : 'sessões'} criada(s).`);
                              if (pacientePersonalSelecionado.id) {
                                notifyPacienteTreinoPersonalClient(pacientePersonalSelecionado.id);
                              }
                              setNewSessionTitle('');
                              setNewSessionDate('');
                              setSelectedExercises([]);
                              setSearchQuery('');
                              // patientId já foi declarado acima no início do try
                              if (patientId) {
                                await loadTodaySession(patientId);
                                await loadCalendarSessions(patientId);
                              }
                              setActiveTabPersonal('cronograma');
                            } catch (error) {
                              console.error('Erro ao criar sessão:', error);
                              alert('Erro ao criar treino. Tente novamente.');
                            } finally {
                              setCreatingSession(false);
                            }
                          }}
                          disabled={creatingSession}
                          className="w-full mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {creatingSession ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Criando...
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              Criar Treino
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTabPersonal === 'historico' && (
                  <div className="space-y-6">
                    {loadingHistorico ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
                      </div>
                    ) : historicoSessions.length > 0 ? (
                      <div className="space-y-4">
                        {historicoSessions.map((session) => (
                          <div
                            key={session.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={async () => {
                              setSelectedSessionDetail(session);
                              if (session.id) {
                                const exercises = await trainingSessionService.getSessionExercises(session.id);
                                setSelectedSessionExercises(exercises);
                              }
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-gray-900">{session.title}</h3>
                                <p className="text-sm text-gray-500">
                                  {new Date(session.scheduledDate).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                session.status === 'done' ? 'bg-green-100 text-green-800' :
                                session.status === 'skipped' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {session.status === 'done' ? 'Concluído' :
                                 session.status === 'skipped' ? 'Pulado' :
                                 'Agendado'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600">Nenhum treino no histórico.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTabPersonal === 'estatisticas' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Estatísticas de Aderência</h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Últimos 7 dias</p>
                          <p className="text-2xl font-bold text-blue-600">{adherence7d.toFixed(0)}%</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">Últimos 30 dias</p>
                          <p className="text-2xl font-bold text-green-600">{adherence30d.toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTabPersonal === 'lembretes' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Preferências de Lembretes</h2>
                      {reminderPrefs ? (
                        <div className="space-y-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={reminderPrefs.enabled || false}
                              onChange={(e) => setReminderPrefs({ ...reminderPrefs, enabled: e.target.checked })}
                              className="mr-2"
                            />
                            <span>Ativar lembretes</span>
                          </label>
                          {reminderPrefs.enabled && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Horário</label>
                                <input
                                  type="time"
                                  value={reminderPrefs.time || '08:00'}
                                  onChange={(e) => setReminderPrefs({ ...reminderPrefs, time: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Dias da Semana</label>
                                <div className="flex flex-wrap gap-2">
                                  {['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'].map((dia, idx) => (
                                    <label key={dia} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={reminderPrefs.daysOfWeek?.includes(idx) || false}
                                        onChange={(e) => {
                                          const days = reminderPrefs.daysOfWeek || [];
                                          if (e.target.checked) {
                                            setReminderPrefs({ ...reminderPrefs, daysOfWeek: [...days, idx] });
                                          } else {
                                            setReminderPrefs({ ...reminderPrefs, daysOfWeek: days.filter(d => d !== idx) });
                                          }
                                        }}
                                        className="mr-1"
                                      />
                                      <span className="text-sm">{dia.substring(0, 3)}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  const patientId = pacientePersonalSelecionado.userId || pacientePersonalSelecionado.id;
                                  if (!patientId || !reminderPrefs) return;
                                  setSavingReminder(true);
                                  try {
                                    await trainingSessionService.saveReminderPrefs(patientId, {
                                      enabled: reminderPrefs.enabled,
                                      time: reminderPrefs.time,
                                      daysOfWeek: reminderPrefs.daysOfWeek,
                                    });
                                    alert('Preferências salvas!');
                                  } catch (error) {
                                    console.error('Erro ao salvar preferências:', error);
                                    alert('Erro ao salvar. Tente novamente.');
                                  } finally {
                                    setSavingReminder(false);
                                  }
                                }}
                                disabled={savingReminder}
                                className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
                              >
                                {savingReminder ? 'Salvando...' : 'Salvar Preferências'}
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600">Carregando preferências...</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Modal de detalhe da sessão (quando clicar em uma sessão no calendário) */}
                {selectedSessionForDetail && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">
                            {selectedSessionForDetail.title}
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(selectedSessionForDetail.scheduledDate).toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSessionForDetail(null);
                            setSelectedSessionExercisesDetail([]);
                          }}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {selectedSessionExercisesDetail.map((exercise, idx) => (
                          <div key={exercise.id || idx} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">{translateExerciseName(exercise.name)}</h4>
                                <p className="text-sm text-gray-500">{translateTarget(exercise.target)}</p>
                              </div>
                              <button
                                onClick={async () => {
                                  if (!selectedSessionForDetail.id || !exercise.id) return;
                                  if (!confirm('Remover este exercício do treino?')) return;
                                  setDeletingExercise(exercise.id);
                                  try {
                                    const { db } = await import('@/lib/firebase');
                                    const { doc, deleteDoc } = await import('firebase/firestore');
                                    await deleteDoc(doc(db, 'trainingSessions', selectedSessionForDetail.id, 'exercises', exercise.id));
                                    const exercises = await trainingSessionService.getSessionExercises(selectedSessionForDetail.id);
                                    setSelectedSessionExercisesDetail(exercises);
                                    alert('Exercício removido!');
                                  } catch (error) {
                                    console.error('Erro ao deletar exercício:', error);
                                    alert('Erro ao remover exercício.');
                                  } finally {
                                    setDeletingExercise(null);
                                  }
                                }}
                                disabled={deletingExercise === exercise.id}
                                className="text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                            {exercise.prescription && (
                              <div className="text-sm text-gray-700">
                                <span className="text-gray-600">Prescrição:</span>{' '}
                                {formatTrainingSeriesSummary(exercise.prescription)}
                                {' · '}
                                {getEffectiveRestSec(exercise.prescription)}s
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

      {/* Modal Editar Paciente.
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
              : `fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:bg-transparent md:p-0 md:items-stretch md:justify-start md:transition-[left] md:duration-300 md:left-16 ${
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
                  <MetapersonalPacienteWelcomeActions
                    pacienteId={pacienteVisualizando.id}
                    phone={pacienteVisualizando.dadosIdentificacao?.telefone}
                    telefoneDdi={pacienteVisualizando.dadosIdentificacao?.telefoneDdi}
                    telefoneE164={pacienteVisualizando.dadosIdentificacao?.telefoneE164}
                    iconOnly={modalPacienteTelaCheia}
                  />
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
                    data-mp-pastas-open={tabletPastasOpen ? '' : undefined}
                    className="mp-pastas hidden lg:flex w-16 xl:w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white relative z-20"
                  >
                    <div className="mp-pastas-top flex items-center justify-center h-12 px-2 border-b border-gray-200 xl:hidden">
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
                    <nav className="mp-pastas-nav flex-1 py-2 xl:py-4 px-2 xl:px-3 space-y-1 overflow-y-auto">
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
                            className={`mp-pastas-item w-full flex items-center justify-center xl:justify-start min-h-11 px-0 xl:px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              ativa
                                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon size={18} className="mp-pastas-item-icon flex-shrink-0 xl:mr-3" />
                            <span className="mp-pastas-label hidden xl:inline truncate text-left">{nome}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </aside>
                </>
              )}

              {/* Conteúdo: mobile / estilo personal com abas no topo; desktop embutido usa menu lateral */}
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden min-w-0">
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
                (pastaAtiva === 3 || pastaAtiva === 4 || pastaAtiva === 7 || pastaAtiva === 8 || pastaAtiva === 9 || pastaAtiva === 10 || pastaAtiva === 14) &&
                !modalPacienteTelaCheia
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
                  nutricionistaId={undefined}
                  fillHeight={!modalPacienteTelaCheia}
                  mobileMode={modalPacienteTelaCheia}
                  variant="personal"
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
                                          className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/80 text-sm dark:border-gray-600 dark:bg-gray-900/30"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => toggleSecaoExamesPasta(secao.sectionId)}
                                            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 gap-y-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-emerald-50/40 px-3 py-2.5 text-left transition-colors hover:from-slate-50 hover:to-emerald-50/60 dark:border-gray-700 dark:from-gray-800/60 dark:to-gray-800/40"
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
                                            <span className="min-w-0 whitespace-normal text-[15px] font-semibold leading-tight text-slate-800 dark:text-gray-100">
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
              {pastaAtiva === 7 && pacienteVisualizando && personalTrainer && (
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
                            ? 'border-b-2 border-green-500 text-green-700 bg-white'
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
                    <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div><p className="mt-2 text-gray-600">Carregando prescrições...</p></div>
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
                                  : { medicoId: personalTrainer.userId, pacienteId: pacienteIdCtx, pacienteNome: pacienteVisualizando?.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, criadoEm: new Date(), atualizadoEm: new Date(), criadoPor: user?.email || '', isTemplate: false, pesoPaciente: peso };
                                await PrescricaoService.createOrUpdatePrescricao(data);
                                if (pacienteVisualizando) await aposSalvarPrescricaoPaciente(pacienteVisualizando);
                                alert('Prescrição salva no histórico!');
                              } catch (e) { console.error(e); alert('Erro ao salvar'); }
                            }} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"><Save size={16} /> Salvar</button>
                            <button onClick={async () => { if (!pacienteVisualizando || !novaPrescricaoModal.itens?.length || !personalTrainer) return; try { const pesoReal = pacienteVisualizando.dadosClinicos?.medidasIniciais?.peso ?? pacienteVisualizando.evolucaoSeguimento?.[(pacienteVisualizando.evolucaoSeguimento?.length ?? 0) - 1]?.peso; let itensPrint = novaPrescricaoModal.itens || []; if (prescricaoSelecionadaModal?.isTemplate && pesoReal) { itensPrint = itensPrint.map((item) => { if (item.medicamento === 'Whey Protein') { const total = (pesoReal * 1.6).toFixed(1), porRef = (pesoReal * 1.6 / 3).toFixed(1); return { ...item, dosagem: `${total}g por dia (1,6g por kg)`, instrucoes: `Tomar ~${porRef}g 3x ao dia (total ${total}g/dia).`, quantidade: `${total}g/dia` }; } if (item.medicamento === 'Creatina MAX' || (item.medicamento || '').includes('Creatina')) return { ...item, dosagem: '3,5g por dia', instrucoes: '3,5g/dia em 200ml de água.', quantidade: '3,5g/dia' }; return item; }); } const doc = new jsPDF(); const dark = [44, 62, 80]; doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark); doc.text(`${personalTrainer.nome || 'Personal Trainer'}`, 20, 15); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); if (personalTrainer.registroNumero) { doc.text(`CREF-${personalTrainer.registroNumero}`, 20, 22); } doc.setDrawColor(200, 200, 200); doc.line(20, 28, 190, 28); let y = 40; doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('PRESCRIÇÃO PERSONALIZADA', 20, y); y += 10; doc.setFontSize(10); doc.setFont('helvetica', 'normal'); const pacNome = pacienteVisualizando.dadosIdentificacao?.nomeCompleto || pacienteVisualizando.nome || 'Paciente'; doc.text(`Paciente: ${pacNome}`, 20, y); y += 6; if (pesoReal) { doc.text(`Peso: ${pesoReal.toFixed(1)} kg`, 20, y); y += 6; } y += 5; doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(novaPrescricaoModal.nome, 20, y); y += 8; if (novaPrescricaoModal.descricao) { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); const dl = doc.splitTextToSize(novaPrescricaoModal.descricao, 170); doc.text(dl, 20, y); y += dl.length * 5 + 5; } doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('ITENS PRESCRITOS:', 20, y); y += 8; itensPrint.forEach((item) => { if (y > 270) { doc.addPage(); y = 20; } doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(`${item.medicamento}`, 25, y); y += 6; doc.setFont('helvetica', 'normal'); doc.text(`   Dosagem: ${item.dosagem}`, 25, y); y += 5; doc.text(`   Frequência: ${item.frequencia}`, 25, y); const il = doc.splitTextToSize(`   ${item.instrucoes}`, 165); doc.text(il, 25, y); y += il.length * 5 + 3; if (item.quantidade) { doc.text(`   Quantidade: ${item.quantidade}`, 25, y); y += 5; } y += 3; }); if (novaPrescricaoModal.observacoes) { if (y > 250) { doc.addPage(); y = 20; } y += 5; doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('OBSERVAÇÕES:', 20, y); y += 6; doc.setFont('helvetica', 'normal'); const obsLines = doc.splitTextToSize(novaPrescricaoModal.observacoes, 170); doc.text(obsLines, 20, y); y += obsLines.length * 5; } doc.save(`prescricao_${pacNome}_${new Date().toISOString().split('T')[0]}.pdf`); } catch (er) { console.error(er); alert('Erro ao gerar PDF'); } }} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"><Printer size={16} /> Imprimir</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 lg:p-12 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2 hidden lg:block">Selecione uma prescrição à esquerda para ver os detalhes.</p>
                        <p className="text-gray-600 mb-2 lg:hidden">Selecione uma prescrição em Prescrições Salvas ou no Histórico.</p>
                        <button type="button" onClick={() => setAbaPrescricoesModal('salvas')} className="mt-2 text-sm text-green-700 font-medium hover:underline lg:hidden">Ir para Prescrições Salvas</button>
                      </div>
                    )
                    }
                    </div>
                  </div>
                </div>
              )}

              {/* Aba 7: Nutrologia — mesma seção do MetaNutri, só visualização (ChatNutri editável) */}
              {pastaAtiva === 8 && pacienteVisualizando && (
                <div className="flex-1 min-h-0 flex flex-col -m-4 lg:m-0 overflow-hidden rounded-xl lg:rounded-none border border-emerald-200/60 lg:border-0 bg-gradient-to-b from-emerald-50/50 to-white lg:bg-none lg:from-transparent">
                  <div className="lg:hidden flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                        <UtensilsCrossed size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">Nutrologia</h3>
                        <p className="text-xs text-emerald-100">Visualização · ChatNutri editável</p>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white/15 text-sm font-medium">
                      {pacienteVisualizando.nome || pacienteVisualizando.dadosIdentificacao?.nomeCompleto || 'Paciente'}
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-6 lg:p-0">
                    <NutriContent
                      paciente={pacienteVisualizando}
                      setPaciente={(p: PacienteCompleto) => setPacienteVisualizando(p)}
                      modoNutricionista
                      embedded
                      somenteVisualizacao
                    />
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

              {/* Aba 9: Personal Trainer — quadro e edição iguais à Central de Treinos */}
              {pastaAtiva === 9 && pacienteVisualizando && personalTrainer && user && (
                <div className="flex-1 min-h-0 flex flex-col -m-4 lg:m-0 overflow-hidden">
                  <MetapersonalPacienteTreinoPanel
                    key={pacienteVisualizando.id}
                    personalTrainerId={user.uid}
                    paciente={pacienteVisualizando}
                    vinculo={
                      pacientesVisiveis.find(
                        (item) =>
                          item.pacienteId === pacienteVisualizando.id ||
                          item.paciente?.id === pacienteVisualizando.id
                      ) || null
                    }
                    sidebarCollapsed={sidebarCollapsed}
                  />
                </div>
              )}

              {/* Aba Financeiro — Controle Financeiro (personal ↔ paciente) */}
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
                      await PagamentoService.salvarPagamentoPersonalTrainerPaciente(
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
        shellClassName="fixed top-0 left-0 right-0 bottom-16 lg:bottom-0 bg-white z-[70] flex flex-col overflow-hidden"
      />

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
                    setPacientesVisiveis(prev => prev.map(item => item.paciente.id === p.id ? { ...item, paciente: { ...item.paciente, bioimpedanciaRegistros: novos } } : item));
                  }}
                />
              );
            })()}
          </div>
        </div>
      )}

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
        
        // Preparar dados para gráfico de linha
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
        
        const pacienteSex = pacienteExamesSelecionado.dadosIdentificacao?.sexoBiologico as Sex;

        const todosOsCampos = buildPatientLabSectionsFromOrder(
          labOrderBySecaoConfig,
          EXAME_LABORATORIAL_KEY_TO_FIELD,
          labLimitOverrides,
          labSectionLabels
        );

        const mobileHeaderScores = todosOsCampos.map((secao) =>
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

        const idxAtualModal = examesOrdenados.findIndex(
          (e) => safeDateToString(e.dataColeta) === dataSelecionada
        );
        const exameAnteriorModal =
          idxAtualModal >= 0 && idxAtualModal < examesOrdenados.length - 1
            ? examesOrdenados[idxAtualModal + 1]
            : null;

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

            {(examesOrdenados.length > 0 || globalAvgMobile != null) && (
              <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto py-0.5 [-webkit-overflow-scrolling:touch]">
                  {examesOrdenados.length > 0 && (
                    <select
                      value={dataSelecionada}
                      onChange={(e) => {
                        setExameDataSelecionada(e.target.value);
                      }}
                      aria-label="Data do exame"
                      className="min-w-[9.25rem] shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
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
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 min-h-0">
              {exames.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center">
                  <FlaskConical className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-black mb-2">Nenhum exame registrado</h3>
                  <p className="text-black">Os exames laboratoriais aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-3 pb-3 text-sm">
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
                        pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento,
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

                    const sectionScorePersonal = calculateSectionMetabolicScore({
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
                        <button
                          type="button"
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
                          <LabSectionScoreBadge score={sectionScorePersonal.score} color={sectionScorePersonal.color} />
                          {isSecaoExpandida ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                        </button>

                        {isSecaoExpandida && (
                          <div className="space-y-3 p-2.5">
                            {camposComValor.map((campo) => {
                              const range = getLabRange(
                                campo.key as string,
                                pacienteSex,
                                pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento,
                                labLimitOverrides
                              );
                              if (!range) return null;

                              const value = exameSelecionado[campo.field as keyof typeof exameSelecionado] as number | undefined;
                              const exameKey = `${secaoKey}-${campo.field}`;
                              const isExameExpandido = examesExpandidos.has(exameKey);
                              const valorAtualTrendModal = getExameCampoNumerico(
                                exameOriginal as Record<string, unknown>,
                                campo.field
                              );
                              const valorAnteriorTrendModal = exameAnteriorModal
                                ? getExameCampoNumerico(
                                    exameAnteriorModal as Record<string, unknown>,
                                    campo.field
                                  )
                                : null;
                              const labTrendDirModal =
                                valorAtualTrendModal != null && valorAnteriorTrendModal != null
                                  ? bioTrendDir(valorAtualTrendModal, valorAnteriorTrendModal)
                                  : 'none';

                              return (
                                <div key={campo.field} className="min-w-0 space-y-1.5">
                                  <LabResultCard
                                    name={range.label}
                                    value={value ?? null}
                                    unit={range.unit}
                                    examKey={campo.key}
                                    range={range}
                                    trendDir={labTrendDirModal}
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
                                          formatter={(v: any) =>
                                            v !== null ? `${parseFloat(v).toFixed(1)}` : 'N/A'
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

                  {exameSelecionado && (
                    <>
                      <LabMetabolicSummarySection scores={mobileHeaderScores} />
                      <LabStatusLegend />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
          tags={LEMBRETE_TAGS_PERSONAL}
          initialValues={pipelineLembreteDraft}
          defaultTelefoneAviso={telefoneContato || personalTrainer?.telefone}
            defaultTelefoneAvisoDdi={telefoneDdiContato || personalTrainer?.telefoneDdi}
            defaultTelefoneAvisoPais={telefonePaisContato || personalTrainer?.telefonePais}
          audience="personal"
          onFechar={() => {
            setShowPipelineLembreteModal(false);
            setPipelineLembreteDraft(undefined);
          }}
          onSalvar={async (dados) => {
            if (!user?.uid) return;
            await LembreteService.criarLembrete({
              personalTrainerId: user.uid,
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

export default MetaPersonalPageV2;
