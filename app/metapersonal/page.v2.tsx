'use client';

// Estrutura idêntica ao /metanutri, adaptada para Personal Trainers

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { buildOrganizacaoPublicUrl } from '@/lib/tenant/organizacaoPublicOrigin';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { PacientePersonalTrainerService } from '@/services/pacientePersonalTrainerService';
import { PagamentoService } from '@/services/pagamentoService';
import { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';
import { PacienteService } from '@/services/pacienteService';
import { 
  Activity, 
  Dumbbell,
  Home, 
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
  Send,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Eye,
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
  Star
} from 'lucide-react';
import { ClassificacaoProfissionalService, type DetalhamentoClassificacao } from '@/services/classificacaoProfissionalService';
import { BioImpedanciaDisplay } from '@/components/bodymap/BioImpedanciaDisplay';
import { salvarBioImpedanciaRegistros } from '@/services/bioImpedanciaService';
import { estadosCidades, estadosList } from '@/data/cidades-brasil';
import { MedicoService } from '@/services/medicoService';
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
import { translateExerciseName, translateBodyPart, translateTarget, translateEquipment } from '@/data/exerciseTranslations';
import CalendarioTreinosPersonal from '@/components/CalendarioTreinosPersonal';
import NutriContent from '@/components/NutriContent';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { buildExpectedCurveDoseDrivenAnchored, buildSuggestedDoseSchedule, predictWaistCircumference, varianceStatus } from '@/utils/expectedCurve';
import { LabRangeBar } from '@/components/LabRangeBar';
import { LabOptimizationBadge } from '@/components/LabOptimizationBadge';
import { LabSectionScoreBadge } from '@/components/LabSectionScoreBadge';
import { LabMetabolicSummarySection } from '@/components/LabMetabolicSummarySection';
import { calculateSectionMetabolicScore } from '@/lib/labExames/labSectionScore';
import type { Sex } from '@/types/labRanges';
import { getLabRange } from '@/utils/labRangesFromJson';
import { useLabOrderBySection } from '@/hooks/useLabOrderBySection';
import { EXAME_LABORATORIAL_KEY_TO_FIELD } from '@/lib/metaadmin/exameLaboratorialFormFields';
import { buildPatientLabSectionsFromOrder } from '@/lib/labExames/buildPatientLabSectionsFromOrder';
import TrendLine from '@/components/TrendLine';
import { PersonalPageContent } from '@/app/meta/personal/page';
import MetaNutriPersonalWizard from '@/components/meta/MetaNutriPersonalWizard';
import ProfissionalCadastroGateModal from '@/components/meta/ProfissionalCadastroGateModal';
import PageLoadingScreen from '@/components/landing/PageLoadingScreen';

type MenuPersonal = 'home' | 'medicos' | 'pacientes' | 'financeiro' | 'calendario' | 'meu-perfil';

function MetaPersonalPageV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { labOrderBySection: labOrderBySecaoConfig, labLimitOverrides } = useLabOrderBySection();

  // Estados de navegação e layout
  const [activeMenu, setActiveMenu] = useState<MenuPersonal>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  
  // Estados de autenticação e dados
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [personalTrainer, setPersonalTrainer] = useState<PersonalTrainerDoc | null>(null);
  const [agregadoPersonal, setAgregadoPersonal] = useState<{ count: number; media: number } | null>(null);
  const [showModalClassificacaoVisualizar, setShowModalClassificacaoVisualizar] = useState(false);
  const [detalhamentoVisualizar, setDetalhamentoVisualizar] = useState<DetalhamentoClassificacao | null>(null);
  const [loadingPersonalTrainer, setLoadingPersonalTrainer] = useState(false);
  const [salvandoCadastroPersonal, setSalvandoCadastroPersonal] = useState(false);
  const [criandoCadastroPersonal, setCriandoCadastroPersonal] = useState(false);
  const [metaPersonalLoadTick, setMetaPersonalLoadTick] = useState(0);
  
  // Estados para perfil
  const [registroNumero, setRegistroNumero] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<{ estado: string; cidade: string }[]>([]);
  const [estadoSelecionado, setEstadoSelecionado] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState('');
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
  const [abaAtivaMedicos, setAbaAtivaMedicos] = useState<'buscar' | 'solicitacoes' | 'vinculados'>('buscar');
  
  // Estados para médicos vinculados
  const [medicosList, setMedicosList] = useState<Array<{
    medicoId: string;
    nome: string;
    email?: string;
    telefone?: string;
    genero?: string;
    crm?: { estado: string; numero: string };
    cidades?: { estado: string; cidade: string }[];
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
  const [loadingPacientesList, setLoadingPacientesList] = useState(false);
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [filtroMedicoPacientes, setFiltroMedicoPacientes] = useState<string>('');
  const [pagamentosPacientes, setPagamentosPacientes] = useState<Record<string, PagamentoPaciente>>({});
  const [pacienteCardExpandido, setPacienteCardExpandido] = useState<string | null>(null);
  const [pacienteDetalhesExpandido, setPacienteDetalhesExpandido] = useState<string | null>(null);

  // Estados para controle do arraste da barra de IMC interativa nos cards de pacientes
  const [isDraggingIMC, setIsDraggingIMC] = useState(false);
  const [pacienteArrastandoIMC, setPacienteArrastandoIMC] = useState<string | null>(null);
  const [pesoTemporarioIMC, setPesoTemporarioIMC] = useState<number | null>(null);
  const [imcTemporarioIMC, setImcTemporarioIMC] = useState<number | null>(null);
  const barraIMCRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Estados para solicitações pendentes
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<SolicitacaoPersonalTrainerDoc[]>([]);
  const [loadingSolicitacoesPendentes, setLoadingSolicitacoesPendentes] = useState(false);
  
  // Estados para modal de visualização
  const [showVisualizarPacienteModal, setShowVisualizarPacienteModal] = useState(false);
  const [pacienteVisualizando, setPacienteVisualizando] = useState<PacienteCompleto | null>(null);
  const [pastaAtiva, setPastaAtiva] = useState(1); // Estado para controlar qual pasta está ativa no modal
  const [showGraficosModal, setShowGraficosModal] = useState(false);
  const [pacienteGraficos, setPacienteGraficos] = useState<PacienteCompleto | null>(null);
  const [graficoAtivo, setGraficoAtivo] = useState<'peso' | 'circunferencia' | 'hba1c' | 'imc'>('peso');
  
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

  // Estados para seção Financeiro
  const [buscaPacienteFinanceiro, setBuscaPacienteFinanceiro] = useState<string>('');
  const [filtroStatusPagamentoFinanceiro, setFiltroStatusPagamentoFinanceiro] = useState<string>('todos');

  // Estados para calendário
  const [mesCalendario, setMesCalendario] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [aplicacoesDiaSelecionado, setAplicacoesDiaSelecionado] = useState<Array<{
    paciente: PacienteCompleto;
    semana: number;
    dose: number;
    localAplicacao: string;
  }>>([]);
  const [pagamentosDiaSelecionado, setPagamentosDiaSelecionado] = useState<Array<{
    paciente: PacienteCompleto;
    parcela: ParcelaPagamento;
  }>>([]);
  // Estado preparado para treinos (futuro)
  const [treinosDiaSelecionado, setTreinosDiaSelecionado] = useState<Array<{
    paciente: PacienteCompleto;
    treino: any; // TODO: definir tipo quando implementar
  }>>([]);

  // Estados para modal de Exames
  const [showModalExames, setShowModalExames] = useState(false);
  const [showModalBioImpedancia, setShowModalBioImpedancia] = useState(false);
  const [pacienteBioImpedanciaSelecionado, setPacienteBioImpedanciaSelecionado] = useState<PacienteCompleto | null>(null);
  const [pacienteExamesSelecionado, setPacienteExamesSelecionado] = useState<PacienteCompleto | null>(null);
  const [exameDataSelecionada, setExameDataSelecionada] = useState('');
  const [secoesExpandidas, setSecoesExpandidas] = useState<Set<string>>(new Set());
  const [examesExpandidos, setExamesExpandidos] = useState<Set<string>>(new Set());
  const [showAdicionarExameModalMobile, setShowAdicionarExameModalMobile] = useState(false);
  const [indiceExameEditandoMobile, setIndiceExameEditandoMobile] = useState<number | null>(null);
  const [novoExameDataMobile, setNovoExameDataMobile] = useState<{
    dataColeta: string;
    [key: string]: any;
  }>({
    dataColeta: new Date().toISOString().split('T')[0]
  });

  // Estados para modal de Prescrições
  const [showModalPrescricoes, setShowModalPrescricoes] = useState(false);
  const [pacientePrescricoesSelecionado, setPacientePrescricoesSelecionado] = useState<PacienteCompleto | null>(null);
  const [prescricoesModal, setPrescricoesModal] = useState<Prescricao[]>([]);
  const [loadingPrescricoesModal, setLoadingPrescricoesModal] = useState(false);
  const [prescricaoSelecionadaModal, setPrescricaoSelecionadaModal] = useState<Prescricao | null>(null);
  const [prescricaoEditandoModal, setPrescricaoEditandoModal] = useState<Prescricao | null>(null);
  const [novaPrescricaoModal, setNovaPrescricaoModal] = useState({
    nome: '',
    descricao: '',
    itens: [] as PrescricaoItem[],
    observacoes: ''
  });
  const [abaPrescricoesModal, setAbaPrescricoesModal] = useState<'salvas' | 'descricao'>('salvas');
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
  const [filtroBasePerdaPeso, setFiltroBasePerdaPeso] = useState<'meus' | 'oftware'>('meus');
  const [filtroDosePerdaPeso, setFiltroDosePerdaPeso] = useState<string>('todas');
  const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState<string>('todas');
  const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState<string>('todos');
  const [filtroBaseDemografia, setFiltroBaseDemografia] = useState<'meus' | 'oftware'>('meus');
  const [todosPacientesOftware, setTodosPacientesOftware] = useState<PacienteCompleto[]>([]);
  const [loadingTodosPacientes, setLoadingTodosPacientes] = useState(false);

  // --- Prescrições: subtipos (runtime, sem alterar Firestore) ---
  type PrescricaoSubtipo =
    | 'Base do Tratamento'
    | 'Gastrointestinal'
    | 'Massa Magra & Performance'
    | 'Metabólico / Glicêmico'
    | 'Micronutrientes'
    | 'Sono & Comportamento'
    | 'Hepático / Cardiometabólico'
    | 'Outros';

  const SUBTIPOS_ORDER: PrescricaoSubtipo[] = [
    'Base do Tratamento',
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

    if (txt.includes('tirzepatida') || txt.includes('mounjaro') || txt.includes('zepbound') || txt.includes('base do tratamento')) return 'Base do Tratamento';
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

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Persistir activeMenu no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMenu = localStorage.getItem('metapersonal_activeMenu');
      if (savedMenu && ['home', 'medicos', 'pacientes', 'financeiro', 'calendario', 'meu-perfil'].includes(savedMenu)) {
        setActiveMenu(savedMenu as MenuPersonal);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metapersonal_activeMenu', activeMenu);
    }
  }, [activeMenu]);

  // Verificar autenticação e carregar personal trainer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setPersonalTrainer(null);
        setRegistroNumero('');
        setTelefoneContato('');
        setCidadesSelecionadas([]);
        setLoading(false);
        router.push('/');
        return;
      }

      setUser(firebaseUser);
      setLoadingPersonalTrainer(true);

      try {
        const personalDoc = await PersonalTrainerService.getPersonalTrainerByUserId(firebaseUser.uid);
        setPersonalTrainer(personalDoc);
        setRegistroNumero(personalDoc?.registroNumero || '');
        setTelefoneContato(personalDoc?.telefone || '');
        setCidadesSelecionadas(personalDoc?.cidades || []);
      } catch (error) {
        console.error('Erro ao carregar personal trainer:', error);
      } finally {
        setLoadingPersonalTrainer(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

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

  // Carregar prescrições para o modal mobile (por paciente)
  const loadPrescricoesModal = useCallback(async (paciente: PacienteCompleto) => {
    if (!personalTrainer) return;
    try {
      setLoadingPrescricoesModal(true);
      await PrescricaoService.criarPrescricoesPadraoGlobais();
      // Buscar prescrições do personal trainer (usando userId como medicoId no sistema atual)
      const [templates, prescricoesPersonal] = await Promise.all([
        PrescricaoService.getPrescricoesTemplate(),
        PrescricaoService.getPrescricoesByMedico(personalTrainer.userId)
      ]);
      const todas = [
        ...templates,
        ...prescricoesPersonal.filter(x => !x.pacienteId || x.pacienteId === paciente.id)
      ];
      setPrescricoesModal(todas);
      if (prescricaoSelecionadaModal && todas.find(p => p.id === prescricaoSelecionadaModal.id)) {
        // Manter seleção se ainda existir
      } else {
        setPrescricaoSelecionadaModal(null);
        setPrescricaoEditandoModal(null);
        setNovaPrescricaoModal({ nome: '', descricao: '', itens: [], observacoes: '' });
      }
    } catch (error) {
      console.error('Erro ao carregar prescrições (modal):', error);
    } finally {
      setLoadingPrescricoesModal(false);
    }
  }, [personalTrainer, prescricaoSelecionadaModal]);

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
    if ((filtroBasePerdaPeso === 'oftware' || filtroBaseDemografia === 'oftware') && todosPacientesOftware.length === 0 && !loadingTodosPacientes) {
      loadTodosPacientesOftware();
    }
  }, [filtroBasePerdaPeso, filtroBaseDemografia, todosPacientesOftware.length, loadingTodosPacientes, loadTodosPacientesOftware]);

  // Carregar dados quando entrar na seção home (pacientes e pagamentos para estatísticas)
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'home') {
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

  // Carregar dados quando entrar na seção calendário
  useEffect(() => {
    if (user && personalTrainer && activeMenu === 'calendario') {
      loadPacientesList();
      // Pagamentos já serão carregados automaticamente pelo loadPacientesList
    }
  }, [user, personalTrainer, activeMenu, loadPacientesList]);

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
      // Recarregar solicitações e pacientes
      await loadSolicitacoesPendentes();
      await loadPacientesList();
    } catch (error: any) {
      console.error('Erro ao aceitar solicitação:', error);
      alert(error.message || 'Erro ao aceitar solicitação');
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

  // Handler para visualizar paciente
  const handleVisualizarPaciente = (paciente: PacienteCompleto) => {
    setPacienteVisualizando(paciente);
    setPastaAtiva(1); // Resetar para a primeira pasta ao abrir
    setShowVisualizarPacienteModal(true);
  };

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
      setCidadesSelecionadas(personalTrainer.cidades || []);
    }
  }, [personalTrainer]);

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
    if (showPerfilModal && personalTrainer) {
      loadCidadesDosMedicos();
    }
  }, [showPerfilModal, personalTrainer, loadCidadesDosMedicos]);

  // Carregar médicos verificados quando abrir o modal de link
  useEffect(() => {
    if (showLinkModal && personalTrainer && medicosVerificados.length === 0) {
      loadMedicosVerificados();
    }
  }, [showLinkModal, personalTrainer, medicosVerificados.length, loadMedicosVerificados]);

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

  // Validação para permitir salvar perfil: registro (apenas números), pelo menos 1 cidade, telefone
  const registroSoNumeros = registroNumero.replace(/\D/g, '');
  const telefoneSoNumeros = telefoneContato.replace(/\D/g, '');
  const canSavePerfil = registroSoNumeros.length > 0 &&
    cidadesSelecionadas.length >= 1 &&
    telefoneSoNumeros.length >= 10;

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
    if (telefoneSoNumeros.length < 10) {
      setSaveMessage({ type: 'error', text: 'Preencha o telefone para contato.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await PersonalTrainerService.updatePerfil(
        user.uid,
        registroSoNumeros,
        telefoneContato.trim(),
        cidadesSelecionadas
      );
      setPersonalTrainer({
        ...personalTrainer,
        registroNumero: registroSoNumeros,
        telefone: telefoneContato.trim(),
        cidades: cidadesSelecionadas
      });
      setSaveMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setTimeout(() => {
        setSaveMessage(null);
        setShowPerfilModal(false);
      }, 2000);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao salvar perfil. Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Renderizar conteúdo baseado no menu ativo
  const renderContent = () => {
    switch (activeMenu) {
      case 'home': {
        // Calcular estatísticas de pacientes por status (padrão metanutri)
        const pacientes = pacientesVisiveis.map(p => p.paciente);
        const totalPacientes = pacientes.length;
        const pacientesPendentes = pacientes.filter(p => p.statusTratamento === 'pendente').length;
        const pacientesEmTratamento = pacientes.filter(p => p.statusTratamento === 'em_tratamento').length;
        const pacientesConcluidos = pacientes.filter(p => p.statusTratamento === 'concluido').length;
        const pacientesAbandono = pacientes.filter(p => p.statusTratamento === 'abandono').length;

        const pagamentosListaHome = Object.values(pagamentosPacientes || {});
        const totalRecebido = pagamentosListaHome.reduce((sum, p) => sum + (p.valorPago || 0), 0);
        const totalEmAberto = pagamentosListaHome.reduce((sum, p) => sum + (p.valorPendente || 0), 0);
        const totalPrevisto = pagamentosListaHome.reduce((sum, p) => sum + (p.valorTotal || 0), 0);

        return (
          <div className="space-y-6">
            {/* Estatísticas de Pacientes */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatísticas de Pacientes</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                {loadingKPIs ? (
                  <div className="bg-white dark:bg-gray-700 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-600 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-700 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center">
                      <Stethoscope className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                      <div className="ml-3 md:ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Médicos Vinculados</p>
                        <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{medicosVinculados}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-white dark:bg-gray-700 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Pacientes</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{totalPacientes}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Pendentes</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{pacientesPendentes}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <Activity className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Tratamento</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{pacientesEmTratamento}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Concluído</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{pacientesConcluidos}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center">
                    <X className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Abandono</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{pacientesAbandono}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demografia dos Pacientes */}
            {(() => {
              const pacientesParaAnalise = filtroBaseDemografia === 'oftware'
                ? (todosPacientesOftware.length > 0 ? todosPacientesOftware : pacientes)
                : pacientes;

              if (filtroBaseDemografia === 'oftware' && loadingTodosPacientes && todosPacientesOftware.length === 0) {
                return (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Demografia dos Pacientes</h3>
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando pacientes da base Oftware...</span>
                    </div>
                  </div>
                );
              }

              const pacientesComIdade = pacientesParaAnalise.filter(p => {
                const dataNasc = p.dadosIdentificacao?.dataNascimento;
                return dataNasc !== null && dataNasc !== undefined;
              });

              const idades = pacientesComIdade.map(p => {
                const dataNasc = p.dadosIdentificacao?.dataNascimento;
                if (!dataNasc) return null;
                let dataNascDate: Date;
                if (dataNasc instanceof Date) {
                  dataNascDate = dataNasc;
                } else if (dataNasc?.toDate) {
                  dataNascDate = dataNasc.toDate();
                } else {
                  dataNascDate = new Date(dataNasc);
                }
                const hoje = new Date();
                let idade = hoje.getFullYear() - dataNascDate.getFullYear();
                const mesAtual = hoje.getMonth();
                const diaAtual = hoje.getDate();
                const mesNasc = dataNascDate.getMonth();
                const diaNasc = dataNascDate.getDate();
                if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) idade--;
                return idade;
              }).filter(idade => idade !== null && idade > 0) as number[];

              const idadeMedia = idades.length > 0 ? idades.reduce((sum, idade) => sum + idade, 0) / idades.length : 0;
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

              const pacientesComGenero = pacientesParaAnalise.filter(p => {
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
              const coresGenero = ['#3b82f6', '#ec4899'];

              return (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Demografia dos Pacientes</h3>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Base de Dados:</label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setFiltroBaseDemografia('meus')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${filtroBaseDemografia === 'meus' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
                        >
                          Meus Pacientes
                        </button>
                        <button
                          onClick={() => setFiltroBaseDemografia('oftware')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${filtroBaseDemografia === 'oftware' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
                        >
                          Base Oftware
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Idade Média</h4>
                            <UserIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                            {idadeMedia > 0 ? idadeMedia.toFixed(1) : '-'} <span className="text-lg text-gray-600 dark:text-gray-400">anos</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {totalComIdade} paciente{totalComIdade !== 1 ? 's' : ''} com data de nascimento
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Distribuição por Faixas Etárias</h4>
                          <div className="space-y-3">
                            {(['18-24', '25-40', '41-65', '65+'] as const).map((faixa, i) => (
                              <div key={faixa} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{faixa === '65+' ? '> 65 anos' : `${faixa} anos`}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${porcentagensFaixas[faixa]}%` }} />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right">{porcentagensFaixas[faixa].toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribuição por Gênero</h4>
                        {totalGenero > 0 ? (
                          <div className="flex flex-col items-center">
                            <div className="w-full max-w-xs">
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie data={dadosGenero} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value" labelLine={false} label={false}>
                                    {dadosGenero.map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={coresGenero[index]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value: any, _: string, props: any) => [`${value} paciente${value !== 1 ? 's' : ''} (${props.payload.porcentagem.toFixed(1)}%)`, props.payload.name]} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex gap-4">
                              {dadosGenero.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: coresGenero[index] }} />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}: <span className="font-semibold">{item.value}</span> ({item.porcentagem.toFixed(1)}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400 dark:text-gray-500"><p className="text-sm">Nenhum dado de gênero disponível</p></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Demografia Geográfica */}
            {(() => {
              const normalizarCidadeEstado = (cidade: string, estado: string): string => {
                const cidadeNorm = cidade.trim().replace(/\s+/g, ' ').split(' ').map(p => (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())).join(' ').trim();
                const estadoNorm = estado.trim().toUpperCase().replace(/\s+/g, '');
                return `${cidadeNorm}, ${estadoNorm}`;
              };
              const pacientesComCidade = pacientes.filter(p => {
                const cidade = p.dadosIdentificacao?.endereco?.cidade;
                const estado = p.dadosIdentificacao?.endereco?.estado;
                return cidade && cidade.trim() !== '' && estado && estado.trim() !== '';
              });
              const cidadesCount: Record<string, number> = {};
              pacientesComCidade.forEach(p => {
                const cidade = p.dadosIdentificacao?.endereco?.cidade || '';
                const estado = p.dadosIdentificacao?.endereco?.estado || '';
                const chave = normalizarCidadeEstado(cidade, estado);
                cidadesCount[chave] = (cidadesCount[chave] || 0) + 1;
              });
              const cidadesOrdenadas = Object.entries(cidadesCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
              const totalComCidade = pacientesComCidade.length;
              const totalOutras = totalComCidade - cidadesOrdenadas.reduce((s, [, c]) => s + c, 0);
              const dadosCidades = cidadesOrdenadas.map(([cidadeEstado, count]) => ({
                cidadeEstado,
                count,
                porcentagem: totalComCidade > 0 ? (count / totalComCidade) * 100 : 0
              }));
              if (totalOutras > 0 || cidadesOrdenadas.length < 5) {
                dadosCidades.push({ cidadeEstado: 'Outras', count: totalOutras, porcentagem: totalComCidade > 0 ? (totalOutras / totalComCidade) * 100 : 0 });
              }
              const coresCidades = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d1d5db'];
              return (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Demografia Geográfica</h3>
                  {totalComCidade > 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Top Cidades</h4>
                      <div className="space-y-3">
                        {dadosCidades.map((item, index) => (
                          <div key={item.cidadeEstado} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0 w-40 truncate">{item.cidadeEstado}</span>
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div className="h-2 rounded-full transition-all" style={{ width: `${item.porcentagem}%`, backgroundColor: coresCidades[index] || coresCidades[coresCidades.length - 1] }} />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white w-16 text-right">{item.porcentagem.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{totalComCidade} paciente{totalComCidade !== 1 ? 's' : ''} com cidade cadastrada</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500"><p className="text-sm">Nenhum dado de cidade disponível</p></div>
                  )}
                </div>
              );
            })()}

            {/* Estatística de Perda de Peso */}
            {(() => {
              const calcularIdade = (dataNasc: any): number | null => {
                if (!dataNasc) return null;
                let dataNascDate: Date;
                if (dataNasc instanceof Date) dataNascDate = dataNasc;
                else if (dataNasc?.toDate) dataNascDate = dataNasc.toDate();
                else dataNascDate = new Date(dataNasc);
                if (isNaN(dataNascDate.getTime())) return null;
                const hoje = new Date();
                let idade = hoje.getFullYear() - dataNascDate.getFullYear();
                const mesAtual = hoje.getMonth(), diaAtual = hoje.getDate();
                const mesNasc = dataNascDate.getMonth(), diaNasc = dataNascDate.getDate();
                if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) idade--;
                return idade > 0 ? idade : null;
              };
              const obterFaixaEtaria = (idade: number | null): string => {
                if (!idade) return 'desconhecida';
                if (idade >= 18 && idade <= 24) return '18-24';
                if (idade >= 25 && idade <= 40) return '25-40';
                if (idade >= 41 && idade <= 65) return '41-65';
                if (idade > 65) return '65+';
                return 'desconhecida';
              };
              const pacientesParaAnalise = filtroBasePerdaPeso === 'oftware' ? (todosPacientesOftware.length > 0 ? todosPacientesOftware : pacientes) : pacientes;
              if (filtroBasePerdaPeso === 'oftware' && loadingTodosPacientes && todosPacientesOftware.length === 0) {
                return (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatística de Perda de Peso</h3>
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando pacientes da base Oftware...</span>
                    </div>
                  </div>
                );
              }
              const perdasPesoPorSemana: Record<number, number[]> = {};
              pacientesParaAnalise.forEach(paciente => {
                const sexo = paciente.dadosIdentificacao?.sexoBiologico;
                if (filtroSexoPerdaPeso !== 'todos' && sexo !== filtroSexoPerdaPeso) return;
                const idade = calcularIdade(paciente.dadosIdentificacao?.dataNascimento);
                const faixaEtaria = obterFaixaEtaria(idade);
                if (filtroFaixaEtariaPerdaPeso !== 'todas' && faixaEtaria !== filtroFaixaEtariaPerdaPeso) return;
                const evolucao = paciente.evolucaoSeguimento || [];
                if (evolucao.length < 2) return;
                const evolucaoOrdenada = [...evolucao].sort((a, b) => {
                  const semanaA = a.weekIndex || a.numeroSemana || 0, semanaB = b.weekIndex || b.numeroSemana || 0;
                  if (semanaA !== semanaB) return semanaA - semanaB;
                  const dataA = a.dataRegistro instanceof Date ? a.dataRegistro : a.dataRegistro?.toDate ? a.dataRegistro.toDate() : new Date(a.dataRegistro || 0);
                  const dataB = b.dataRegistro instanceof Date ? b.dataRegistro : b.dataRegistro?.toDate ? b.dataRegistro.toDate() : new Date(b.dataRegistro || 0);
                  return dataA.getTime() - dataB.getTime();
                });
                const registroSemana1 = evolucaoOrdenada.find(r => (r.weekIndex || r.numeroSemana || 0) === 1 && r.peso);
                if (!registroSemana1?.peso) return;
                const pesoBaseline = registroSemana1.peso;
                evolucaoOrdenada.forEach(registro => {
                  const semana = registro.weekIndex || registro.numeroSemana || 0;
                  if (semana <= 1 || !registro.peso) return;
                  const registrosAteSemana = evolucaoOrdenada.filter(r => { const s = r.weekIndex || r.numeroSemana || 0; return s >= 1 && s <= semana && r.doseAplicada?.quantidade; });
                  let doseMedia = registrosAteSemana.length > 0 ? registrosAteSemana.reduce((sum, r) => sum + (r.doseAplicada?.quantidade || 0), 0) / registrosAteSemana.length : 0;
                  if (filtroDosePerdaPeso !== 'todas' && Math.abs(doseMedia - parseFloat(filtroDosePerdaPeso)) > 0.5) return;
                  const perdaPeso = pesoBaseline - registro.peso;
                  if (!perdasPesoPorSemana[semana]) perdasPesoPorSemana[semana] = [];
                  perdasPesoPorSemana[semana].push(perdaPeso);
                });
              });
              const mediasPorSemana = Object.entries(perdasPesoPorSemana)
                .map(([semana, perdas]) => ({ semana: parseInt(semana), media: perdas.length > 0 ? perdas.reduce((s, p) => s + p, 0) / perdas.length : 0, quantidade: perdas.length }))
                .filter(item => item.quantidade > 0)
                .sort((a, b) => a.semana - b.semana);
              const dadosGrafico = mediasPorSemana.map(item => ({
                semana: item.semana,
                perda: Math.abs(item.media),
                quantidade: item.quantidade
              }));
              const valoresPerda = dadosGrafico.map(d => d.perda);
              const maxPerda = Math.max(...valoresPerda, 0);
              const margem = maxPerda * 0.1;

              return (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatística de Perda de Peso</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Coluna Esquerda: Filtros e Média */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Base de Dados</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setFiltroBasePerdaPeso('meus')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroBasePerdaPeso === 'meus'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              Meus Pacientes
                            </button>
                            <button
                              onClick={() => setFiltroBasePerdaPeso('oftware')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroBasePerdaPeso === 'oftware'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              Base Oftware
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dose Média</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setFiltroDosePerdaPeso('todas')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroDosePerdaPeso === 'todas'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              Todas
                            </button>
                            {['2.5', '5.0', '7.5', '10', '12.5', '15'].map((dose) => (
                              <button
                                key={dose}
                                onClick={() => setFiltroDosePerdaPeso(dose)}
                                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                  filtroDosePerdaPeso === dose
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                                }`}
                              >
                                {dose} mg
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Faixa Etária</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('todas')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroFaixaEtariaPerdaPeso === 'todas'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              Todas
                            </button>
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('18-24')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroFaixaEtariaPerdaPeso === '18-24'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              18 - 24 anos
                            </button>
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('25-40')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroFaixaEtariaPerdaPeso === '25-40'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              25 - 40 anos
                            </button>
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('41-65')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroFaixaEtariaPerdaPeso === '41-65'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              41 - 65 anos
                            </button>
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('65+')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroFaixaEtariaPerdaPeso === '65+'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              &gt; 65 anos
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sexo</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setFiltroSexoPerdaPeso('todos')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroSexoPerdaPeso === 'todos'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              Todos
                            </button>
                            <button
                              onClick={() => setFiltroSexoPerdaPeso('M')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroSexoPerdaPeso === 'M'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              Masculino
                            </button>
                            <button
                              onClick={() => setFiltroSexoPerdaPeso('F')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors shadow-sm ${
                                filtroSexoPerdaPeso === 'F'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              Feminino
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card com Média de Perda de Peso - Desktop abaixo dos filtros */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 lg:block hidden">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Média de Perda de Peso por Semana</h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {mediasPorSemana.map((item) => (
                            <div key={item.semana} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium w-20">
                                Sem {item.semana}
                              </span>
                              <div className="flex items-center gap-3 flex-1">
                                {item.quantidade > 0 ? (
                                  <>
                                    <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                      <div
                                        className="bg-green-500 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(Math.abs(item.media) * 5, 100)}%` }}
                                      />
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 min-w-[120px] text-right">
                                      <span className="font-semibold text-green-700 dark:text-green-400">
                                        {Math.abs(item.media).toFixed(2)} kg
                                      </span>
                                      <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                                        (n={item.quantidade})
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex-1 text-center">
                                    <span className="text-sm text-gray-400 dark:text-gray-500">Sem dados disponíveis</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {mediasPorSemana.length === 0 && (
                            <div className="text-center py-4 text-gray-400 dark:text-gray-500">
                              <p className="text-sm">Nenhum dado disponível com os filtros selecionados</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coluna Direita: Gráfico */}
                    <div className="lg:col-span-3">
                      <div className="space-y-4">
                        {/* Card com Média de Perda de Peso - Mobile */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 lg:hidden">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Média de Perda de Peso por Semana</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {mediasPorSemana.map((item) => (
                              <div key={item.semana} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium w-20">
                                  Sem {item.semana}
                                </span>
                                <div className="flex items-center gap-3 flex-1">
                                  {item.quantidade > 0 ? (
                                    <>
                                      <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div
                                          className="bg-green-500 h-2 rounded-full transition-all"
                                          style={{ width: `${Math.min(Math.abs(item.media) * 5, 100)}%` }}
                                        />
                                      </div>
                                      <div className="text-sm text-gray-700 dark:text-gray-300 min-w-[120px] text-right">
                                        <span className="font-semibold text-green-700 dark:text-green-400">
                                          {Math.abs(item.media).toFixed(2)} kg
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                                          (n={item.quantidade})
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex-1 text-center">
                                      <span className="text-sm text-gray-400 dark:text-gray-500">Sem dados disponíveis</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {mediasPorSemana.length === 0 && (
                              <div className="text-center py-4 text-gray-400 dark:text-gray-500">
                                <p className="text-sm">Nenhum dado disponível com os filtros selecionados</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Gráfico */}
                        {dadosGrafico.length > 0 ? (
                          <>
                            <div className="hidden lg:flex items-center justify-center h-[500px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dadosGrafico}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="semana" label={{ value: 'Semana', position: 'insideBottom', offset: -5 }} />
                                  <YAxis
                                    domain={[0, maxPerda + margem]}
                                    tickFormatter={(value) => value.toFixed(1)}
                                    label={{ value: 'Perda de Peso (kg)', angle: -90, position: 'insideLeft' }}
                                  />
                                  <Tooltip
                                    formatter={(value: any, name: string, props: any) => {
                                      return [`${value.toFixed(2)} kg (n=${props.payload.quantidade})`, 'Perda de Peso'];
                                    }}
                                  />
                                  <Legend />
                                  <Line
                                    type="monotone"
                                    dataKey="perda"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    name="Perda de Peso (kg)"
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="lg:hidden flex items-center justify-center h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dadosGrafico} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="semana" label={{ value: 'Semana', position: 'insideBottom', offset: -5 }} />
                                  <YAxis
                                    domain={[0, maxPerda + margem]}
                                    tickFormatter={(value) => value.toFixed(1)}
                                  />
                                  <Tooltip
                                    formatter={(value: any, name: string, props: any) => {
                                      return [`${value.toFixed(2)} kg (n=${props.payload.quantidade})`, 'Perda de Peso'];
                                    }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="perda"
                                    stroke="#3b82f6"
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
                            <div className="hidden lg:flex items-center justify-center h-[500px] text-gray-400 dark:text-gray-500">
                              <p className="text-sm">Nenhum dado disponível para o gráfico</p>
                            </div>
                            <div className="lg:hidden flex items-center justify-center h-[300px] text-gray-400 dark:text-gray-500">
                              <p className="text-sm">Nenhum dado disponível para o gráfico</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Estatísticas Financeiras */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatísticas Financeiras</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-700 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Receitas Recebidas</p>
                  <p className="mt-2 text-2xl font-semibold text-green-700 dark:text-green-400">R$ {totalRecebido.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-700 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Em Aberto</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">R$ {totalEmAberto.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-700 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Previsto</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">R$ {totalPrevisto.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
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
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-4" aria-label="Tabs">
                  <button
                    onClick={() => setAbaAtivaMedicos('buscar')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'buscar'
                        ? 'border-yellow-600 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Buscar Médicos
                  </button>
                  <button
                    onClick={() => setAbaAtivaMedicos('solicitacoes')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                    onClick={() => setAbaAtivaMedicos('vinculados')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'vinculados'
                        ? 'border-yellow-600 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Médicos Vinculados
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
                                              href={`https://wa.me/55${medico.telefone.replace(/\D/g, '')}`}
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
                                            href={`https://wa.me/55${medico.telefone.replace(/\D/g, '')}`}
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
                      {/* Versão Desktop - Tabela */}
                      <div className="hidden lg:block bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                                              href={`https://wa.me/55${medico.telefone.replace(/\D/g, '')}`}
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
                                                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:shadow-sm transition-shadow"
                                                  >
                                                    <div className="flex-1">
                                                      <h4 className="text-sm font-medium text-gray-900">{nomePaciente}</h4>
                                                      <p className="text-xs text-gray-500 mt-1">
                                                        Compartilhado em: {item.dataCompartilhamento.toLocaleDateString('pt-BR')}
                                                      </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-4">
                                                      <button
                                                        onClick={() => handleVerPacienteNaPaginaPacientes(item.paciente)}
                                                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                                        title="Ver paciente"
                                                      >
                                                        <Eye size={16} />
                                                      </button>
                                                      <button
                                                        onClick={() => handleEncerrarCompartilhamento(item.paciente?.id, medico.medicoId)}
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
                                <div key={medico.medicoId} className="shadow rounded-lg border border-gray-200 bg-white">
                                  <div className="p-4">
                                    {/* Cabeçalho do card */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <Stethoscope className="h-5 w-5 text-green-600" />
                                          </div>
                                          <h3 className="text-base font-semibold text-gray-900 truncate">
                                            {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                                          </h3>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {medico.crm && (
                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                              CRM {medico.crm.estado} {medico.crm.numero}
                                            </span>
                                          )}
                                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            Ativo
                                          </span>
                                          {medico.telefone && (
                                            <a 
                                              href={`https://wa.me/55${medico.telefone.replace(/\D/g, '')}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center text-green-600 hover:text-green-800"
                                              title={`WhatsApp: ${medico.telefone}`}
                                            >
                                              <Phone size={16} />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Informações de pacientes e ação */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {medico.countPacientes} {medico.countPacientes === 1 ? 'paciente' : 'pacientes'}
                                        </div>
                                        <div className="text-xs text-gray-500">em comum</div>
                                      </div>
                                      <div className="flex items-center gap-2">
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
                                  </div>
                                  
                                  {/* Lista de pacientes expandida */}
                                  {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
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
                                                className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:shadow-sm transition-shadow"
                                              >
                                                <div className="flex-1 min-w-0">
                                                  <h4 className="text-sm font-medium text-gray-900 truncate">{nomePaciente}</h4>
                                                  <p className="text-xs text-gray-500 mt-1">
                                                    Compartilhado em: {item.dataCompartilhamento.toLocaleDateString('pt-BR')}
                                                  </p>
                                                </div>
                                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                                  <button
                                                    onClick={() => handleVerPacienteNaPaginaPacientes(item.paciente)}
                                                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                                    title="Ver paciente"
                                                  >
                                                    <Eye size={16} />
                                                  </button>
                                                  <button
                                                    onClick={() => handleEncerrarCompartilhamento(item.paciente?.id, medico.medicoId)}
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
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-yellow-900">
                      Solicitações Pendentes ({solicitacoesPendentes.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {solicitacoesPendentes.map((solicitacao) => (
                      <div
                        key={solicitacao.id}
                        className="bg-white border border-yellow-300 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {solicitacao.pacienteNome || `Paciente ID: ${solicitacao.pacienteId.substring(0, 8)}...`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Enviado por {solicitacao.medicoNome || 'Médico'} em {solicitacao.criadoEm?.toLocaleDateString('pt-BR') || '-'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAceitarSolicitacao(solicitacao.id)}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle size={16} />
                            Aceitar
                          </button>
                          <button
                            onClick={() => handleRejeitarSolicitacao(solicitacao.id)}
                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                          >
                            <X size={16} />
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                                
                                // Calcular semanas
                                const planoTerapeutico = paciente.planoTerapeutico;
                                const totalSemanas = planoTerapeutico?.numeroSemanasTratamento || 0;
                                const semanasAplicadas = evolucao.filter(reg => {
                                  if (reg.doseAplicada && reg.doseAplicada.quantidade > 0) return true;
                                  if (reg.adherence && reg.adherence !== 'MISSED') return true;
                                  if (reg.adesao && reg.adesao !== 'esquecida') return true;
                                  if ((reg.peso && reg.peso > 0) || 
                                      (reg.circunferenciaAbdominal && reg.circunferenciaAbdominal > 0) ||
                                      (reg.hba1c && reg.hba1c > 0)) return true;
                                  return false;
                                }).length;
                                
                                // Formatar telefone
                                const telefone = paciente.dadosIdentificacao?.telefone || '';
                                const telefoneWhatsApp = telefone.replace(/\D/g, '');
                                const linkWhatsApp = telefoneWhatsApp ? `https://wa.me/55${telefoneWhatsApp}` : '#';
                                
                                // Obter pagamento
                                const pagamento = pagamentosPacientes[paciente.id];
                                
                                return (
                                  <tr key={item.pacienteId} className="hover:bg-gray-50">
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
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                          style={{ 
                                            border: `2px solid ${imcData.corBorda}`,
                                            backgroundColor: 'white'
                                          }}
                                        >
                                          <span style={{ fontSize: '18px' }}>{imcData.emoji}</span>
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">{nomeCompleto}</div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
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
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full transition-all ${
                                                (semanasAplicadas / totalSemanas) >= 1
                                                  ? 'bg-green-500'
                                                  : (semanasAplicadas / totalSemanas) >= 0.5
                                                  ? 'bg-blue-500'
                                                  : 'bg-yellow-500'
                                              }`}
                                              style={{
                                                width: `${Math.min((semanasAplicadas / totalSemanas) * 100, 100)}%`
                                              }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <button
                                        onClick={() => handleVisualizarPaciente(paciente)}
                                        className="inline-flex items-center justify-center p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                        title="Visualizar"
                                      >
                                        <Edit size={18} />
                                      </button>
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
                          
                          // Calcular semanas
                          const planoTerapeutico = paciente.planoTerapeutico;
                          const totalSemanas = planoTerapeutico?.numeroSemanasTratamento || 0;
                          const semanasAplicadas = evolucao.filter(reg => {
                            if (reg.doseAplicada && reg.doseAplicada.quantidade > 0) return true;
                            if (reg.adherence && reg.adherence !== 'MISSED') return true;
                            if (reg.adesao && reg.adesao !== 'esquecida') return true;
                            if ((reg.peso && reg.peso > 0) || 
                                (reg.circunferenciaAbdominal && reg.circunferenciaAbdominal > 0) ||
                                (reg.hba1c && reg.hba1c > 0)) return true;
                            return false;
                          }).length;
                          
                          // Obter pagamento
                          const pagamento = pagamentosPacientes[paciente.id];
                          
                          // Formatar telefone para WhatsApp
                          const telefone = paciente.dadosIdentificacao?.telefone || '';
                          const telefoneWhatsApp = telefone.replace(/\D/g, '');
                          const linkWhatsApp = telefoneWhatsApp ? `https://wa.me/55${telefoneWhatsApp}` : '#';
                          
                          // Estado de expansão
                          const isExpanded = pacienteCardExpandido === item.pacienteId;
                          const isDetalhesExpandido = pacienteDetalhesExpandido === item.pacienteId;
                          const isSelecionado = isExpanded || isDetalhesExpandido;
                          
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
                                  {/* Barra de progresso (1.5px de espessura, largura conforme %) */}
                                  <div
                                    className={`absolute left-0 top-0 transition-all duration-300 ${
                                      totalSemanas > 0
                                        ? (semanasAplicadas / totalSemanas) >= 1
                                          ? 'bg-green-500 rounded-full'
                                          : (semanasAplicadas / totalSemanas) >= 0.5
                                          ? 'bg-blue-500'
                                          : 'bg-amber-500'
                                        : 'bg-gray-200 rounded-full'
                                    }`}
                                    style={{
                                      width: totalSemanas > 0
                                        ? `${Math.min((semanasAplicadas / totalSemanas) * 100, 100)}%`
                                        : '100%',
                                      height: '1.5px'
                                    }}
                                  />
                                  {/* Texto centralizado */}
                                  <div className="relative z-10 py-0.5 text-center text-xs font-semibold text-gray-700">
                                    {totalSemanas > 0 ? `${semanasAplicadas} de ${totalSemanas}` : '–'}
                                  </div>
                                </div>
                                <div className="p-4 pt-3">
                                {/* Cabeçalho */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ 
                                          border: `2px solid ${imcData.corBorda}`,
                                          backgroundColor: 'white'
                                        }}
                                      >
                                        <span style={{ fontSize: '18px' }}>{imcData.emoji}</span>
                                      </div>
                                      <h3 className="text-base font-semibold text-gray-900 truncate">{nomeCompleto}</h3>
                                      {mensagensNaoLidasPorPaciente[paciente.id] > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0" title={`${mensagensNaoLidasPorPaciente[paciente.id]} mensagem(ns) não lida(s)`}>
                                          <MessageSquare size={10} className="mr-1" />
                                          {mensagensNaoLidasPorPaciente[paciente.id]}
                                        </span>
                                      )}
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
                                      {/* Status Financeiro - Clicável para abrir modal */}
                                      {(() => {
                                        const pagamento = pagamentosPacientes[paciente.id];
                                        const statusPagamento = pagamento?.statusPagamento || 'negociacao';
                                        return (
                                          <span 
                                            onClick={() => {
                                              setPacientePagamentoSelecionado(paciente);
                                              if (pagamento) {
                                                setDadosPagamento(pagamento);
                                              } else {
                                                setDadosPagamento({
                                                  pacienteId: paciente.id,
                                                  statusPagamento: 'negociacao',
                                                  formaPagamento: null,
                                                  valorTotal: 0,
                                                  valorPago: 0,
                                                  valorPendente: 0,
                                                  parcelas: [],
                                                  dataUltimaAtualizacao: new Date(),
                                                });
                                              }
                                              setShowModalPagamento(true);
                                            }}
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                                              statusPagamento === 'pago'
                                                ? 'bg-green-100 text-green-800'
                                                : statusPagamento === 'em_aberto'
                                                ? 'bg-red-100 text-red-800'
                                                : statusPagamento === 'iniciou_pagamento'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}
                                            title="Clique para gerenciar pagamento"
                                          >
                                            {statusPagamento === 'pago'
                                              ? 'Pago'
                                              : statusPagamento === 'em_aberto'
                                              ? 'Em Aberto'
                                              : statusPagamento === 'iniciou_pagamento'
                                              ? 'Parcial'
                                              : 'Negociação'}
                                          </span>
                                        );
                                      })()}
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
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const novoEstado = isExpanded ? null : item.pacienteId;
                                      setPacienteCardExpandido(novoEstado);
                                    }}
                                    className="flex-shrink-0 ml-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                    aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                  >
                                    <ChevronDown 
                                      size={20} 
                                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                  </button>
                                </div>

                                {/* Botões de ação */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {/* Botão Editar */}
                                    <button
                                      onClick={() => handleVisualizarPaciente(paciente)}
                                      className="p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                      title="Visualizar"
                                    >
                                      <Edit size={18} />
                                    </button>
                                    {/* Botão Aplicações */}
                                    {(() => {
                                      const temAplicacoes = (paciente.evolucaoSeguimento || []).length > 0;
                                      return (
                                        <button
                                          onClick={() => {
                                            const novoEstado = pacienteDetalhesExpandido === item.pacienteId ? null : item.pacienteId;
                                            setPacienteDetalhesExpandido(novoEstado);
                                            // Fechar detalhes do card se abrir detalhes de aplicações
                                            if (novoEstado) {
                                              setPacienteCardExpandido(null);
                                            }
                                          }}
                                          className={`p-2 rounded-md transition-colors ${
                                            pacienteDetalhesExpandido === item.pacienteId
                                              ? 'bg-blue-600 text-white'
                                              : temAplicacoes
                                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                          }`}
                                          title={pacienteDetalhesExpandido === item.pacienteId ? 'Ocultar Aplicações' : 'Aplicações'}
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
                                      disabled
                                      className="p-2 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed transition-colors"
                                      title="Prescrições (Bloqueado para Personal Trainer)"
                                    >
                                      <ClipboardList size={18} />
                                    </button>
                                    {/* Botão Nutri */}
                                    {(() => {
                                      const temNutricao = pacientesComNutricao[paciente.id] || false;
                                      return (
                                        <button
                                          onClick={async () => {
                                            setPacienteNutricaoSelecionado(paciente);
                                            setShowModalNutricao(true);
                                            setLoadingNutricao(true);
                                            setActiveTabNutricao('plano');
                                            setPlanoNutricionalModal(null);
                                            setCheckinsNutricao([]);
                                            
                                            try {
                                              // Carregar plano nutricional
                                              const { db } = await import('@/lib/firebase');
                                              const { doc, getDoc } = await import('firebase/firestore');
                                              const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
                                              const planoSnap = await getDoc(planoRef);
                                              if (planoSnap.exists()) {
                                                setPlanoNutricionalModal(planoSnap.data());
                                              } else {
                                                setPlanoNutricionalModal(null);
                                              }
                                            } catch (error) {
                                              console.error('Erro ao carregar dados de nutrição:', error);
                                            } finally {
                                              setLoadingNutricao(false);
                                            }
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
                                
                                {/* Detalhes expandíveis (mesmo padrão /metanutri) */}
                                {isExpanded && (
                                  <div className="space-y-2 mb-3 pt-3 border-t border-gray-200">
                                    {/* Caixa com informações clínicas iniciais + barra de IMC interativa */}
                                    {(ultimoPeso || paciente.dadosClinicos?.medidasIniciais?.altura || paciente.dadosClinicos?.medidasIniciais?.imc) && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 relative overflow-hidden" style={{ borderRadius: '12px' }}>
                                        {(() => {
                                          const medidasIniciaisCard = paciente.dadosClinicos?.medidasIniciais;
                                          const alturaCm = medidasIniciaisCard?.altura;
                                          const alturaMetros = alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;
                                          // IMC atual: se estiver arrastando, usar temporário; senão calcular do último peso ou usar IMC inicial
                                          let imcAtual: number | null = null;
                                          if (pacienteArrastandoIMC === item.pacienteId && imcTemporarioIMC !== null) {
                                            imcAtual = imcTemporarioIMC;
                                          } else if (alturaMetros && ultimoPeso && ultimoPeso > 0) {
                                            imcAtual = ultimoPeso / (alturaMetros * alturaMetros);
                                          } else if (medidasIniciaisCard?.imc) {
                                            imcAtual = medidasIniciaisCard.imc;
                                          }
                                          // Peso atual: se estiver arrastando, usar temporário; senão último peso ou peso inicial
                                          const pesoAtual = pacienteArrastandoIMC === item.pacienteId && pesoTemporarioIMC !== null
                                            ? pesoTemporarioIMC
                                            : (ultimoPeso || medidasIniciaisCard?.peso || null);

                                          const classificarIMC = (imc: number | null | undefined): { label: string; cor: string; icone: string } | null => {
                                            if (!imc || imc === 0) return null;
                                            if (imc < 18.5) return { label: 'Baixo peso', cor: 'text-blue-600', icone: '😟' };
                                            if (imc < 25) return { label: 'Saudável', cor: 'text-green-600', icone: '🙂' };
                                            if (imc < 30) return { label: 'Alto', cor: 'text-yellow-600', icone: '😐' };
                                            return { label: 'Obeso', cor: 'text-red-600', icone: '😟' };
                                          };

                                          const calcularPosicaoMarcador = (imc: number | null | undefined): number => {
                                            if (!imc || imc === 0) return 0;
                                            if (imc < 18.5) return (imc / 18.5) * 25;
                                            if (imc < 25) return 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
                                            if (imc < 30) return 50 + ((imc - 25) / (30 - 25)) * 25;
                                            return 75 + Math.min(((imc - 30) / 20) * 25, 25);
                                          };

                                          const handleMouseDown = (e: React.MouseEvent) => {
                                            e.preventDefault();
                                            setIsDraggingIMC(true);
                                            setPacienteArrastandoIMC(item.pacienteId);
                                          };
                                          const handleTouchStart = (e: React.TouchEvent) => {
                                            setIsDraggingIMC(true);
                                            setPacienteArrastandoIMC(item.pacienteId);
                                          };

                                          const classificacaoIMC = classificarIMC(imcAtual);

                                          return (
                                            <>
                                              <div className="grid grid-cols-3 gap-2">
                                                {pesoAtual && pesoAtual > 0 && (
                                                  <div className="text-center">
                                                    <div className="text-xs text-blue-700 font-medium mb-1">Peso Atual</div>
                                                    <div className="text-sm font-semibold text-blue-900">{pesoAtual.toFixed(1)} kg</div>
                                                  </div>
                                                )}
                                                {alturaMetros && (
                                                  <div className="text-center">
                                                    <div className="text-xs text-blue-700 font-medium mb-1">Altura</div>
                                                    <div className="text-sm font-semibold text-blue-900">{alturaMetros.toFixed(2)} m</div>
                                                  </div>
                                                )}
                                                {imcAtual && imcAtual > 0 && (
                                                  <div className="text-center">
                                                    <div className="text-xs text-blue-700 font-medium mb-1">IMC</div>
                                                    <div className="text-sm font-semibold text-blue-900">{imcAtual.toFixed(1)}</div>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Barra de IMC interativa (arrastar para simular peso) */}
                                              {imcAtual && imcAtual > 0 && alturaMetros && (
                                                <div className="mt-3 pt-3 border-t border-blue-200">
                                                  <div className="relative mb-1 h-4">
                                                    <span className="absolute text-xs text-gray-500" style={{ left: '25%', transform: 'translateX(-50%)' }}>18.5</span>
                                                    <span className="absolute text-xs text-gray-500" style={{ left: '50%', transform: 'translateX(-50%)' }}>25</span>
                                                    <span className="absolute text-xs text-gray-500" style={{ left: '75%', transform: 'translateX(-50%)' }}>30</span>
                                                  </div>
                                                  <div
                                                    ref={(el) => {
                                                      if (el) barraIMCRef.current[item.pacienteId] = el;
                                                    }}
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
                                                      onMouseDown={handleMouseDown}
                                                      onTouchStart={handleTouchStart}
                                                    >
                                                      <div className="flex items-center gap-1">
                                                        <span className="text-gray-600 text-xs font-bold" style={{ fontSize: '12px' }}>&lt;</span>
                                                        <div className="bg-white border-2 border-gray-400 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110" style={{ width: '24px', height: '24px' }}>
                                                          <span style={{ fontSize: '14px' }}>{classificacaoIMC?.icone || '🙂'}</span>
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
                                                  <div className="mt-2 text-center">
                                                    <div className="text-xs text-blue-700 font-medium mb-1">Grau de Obesidade</div>
                                                    <div className={`text-sm font-semibold ${getCorGrauObesidade(calcularGrauObesidade(imcAtual))}`}>
                                                      {calcularGrauObesidade(imcAtual) || '-'}
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {/* Cadastro */}
                                    <div className="flex items-center text-sm text-gray-600">
                                      <span className="font-medium mr-2">Cadastro:</span>
                                      <span className="text-gray-900">
                                        {paciente.dataCadastro ?
                                          (paciente.dataCadastro instanceof Date
                                            ? paciente.dataCadastro.toLocaleDateString('pt-BR')
                                            : new Date(paciente.dataCadastro).toLocaleDateString('pt-BR'))
                                          : '-'}
                                      </span>
                                    </div>

                                    {/* Telefone */}
                                    <div className="flex items-center text-sm text-gray-600">
                                      <span className="font-medium mr-2">Telefone:</span>
                                      {telefoneWhatsApp ? (
                                        <a
                                          href={linkWhatsApp}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-green-600 hover:text-green-800 flex items-center gap-1"
                                        >
                                          <MessageSquare size={14} />
                                          {telefone}
                                        </a>
                                      ) : (
                                        <span className="text-gray-900">-</span>
                                      )}
                                    </div>

                                    {/* Cidade */}
                                    <div className="flex items-center text-sm text-gray-600">
                                      <span className="font-medium mr-2">Cidade:</span>
                                      <span className="text-gray-900">{paciente.dadosIdentificacao?.endereco?.cidade || '-'}</span>
                                    </div>

                                    {/* Sexo */}
                                    {paciente.dadosIdentificacao?.sexoBiologico && (
                                      <div className="flex items-center text-sm text-gray-600">
                                        <span className="font-medium mr-2">Sexo:</span>
                                        <span className="text-gray-900">
                                          {paciente.dadosIdentificacao.sexoBiologico === 'M' ? 'Masculino' :
                                            paciente.dadosIdentificacao.sexoBiologico === 'F' ? 'Feminino' :
                                              'Outro'}
                                        </span>
                                      </div>
                                    )}

                                    {/* Data de Nascimento */}
                                    <div className="flex items-center text-sm text-gray-600">
                                      <span className="font-medium mr-2">Data de Nascimento:</span>
                                      {(() => {
                                        const dataNasc = paciente.dadosIdentificacao?.dataNascimento;
                                        if (!dataNasc) {
                                          return <span className="text-gray-900">-</span>;
                                        }
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
                                        return (
                                          <span className="text-gray-900">
                                            {dataNascimento.toLocaleDateString('pt-BR')}, {idade} {idade === 1 ? 'ano' : 'anos'}
                                          </span>
                                        );
                                      })()}
                                    </div>

                                    {/* Valor Total (Negociado entre Paciente x Personal) */}
                                    <div className="flex items-center text-sm text-gray-600">
                                      <span className="font-medium mr-2">Valor Total:</span>
                                      {pagamento && pagamento.valorTotal > 0 ? (
                                        <span className="text-gray-900">
                                          R$ {pagamento.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          {pagamento.parcelas && pagamento.parcelas.length > 0 && (
                                            <span className="text-gray-500 ml-1">
                                              ({pagamento.parcelas.length} {pagamento.parcelas.length === 1 ? 'parcela' : 'parcelas'})
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-gray-900">-</span>
                                      )}
                                    </div>

                                    {/* NPS (Futuro) */}
                                    <div className="flex items-center text-sm text-gray-600">
                                      <span className="font-medium mr-2">NPS:</span>
                                      <span className="text-gray-500 italic">Em breve</span>
                                    </div>
                                  </div>
                                )}

                                {/* Lista de Aplicações */}
                                {pacienteDetalhesExpandido === item.pacienteId && (
                                  <div className="mb-3 border-t border-gray-200 pt-3">
                                    {evolucao.length > 0 ? (
                                      <>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Aplicações ({evolucao.length})</h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                          {(() => {
                                            // Ordenar por semana para calcular variação
                                            const evolucaoOrdenadaPorSemana = [...evolucao].sort((a, b) => {
                                              const semanaA = a.weekIndex || a.numeroSemana || 0;
                                              const semanaB = b.weekIndex || b.numeroSemana || 0;
                                              return semanaA - semanaB;
                                            });
                                            
                                            // Ordenar por data para exibição (mais recente primeiro)
                                            const evolucaoOrdenadaPorData = [...evolucao].sort((a, b) => {
                                              const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
                                              const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
                                              return dataB - dataA;
                                            });
                                            
                                            return evolucaoOrdenadaPorData.map((registro) => {
                                              // Encontrar registro da semana anterior para calcular variação
                                              const semanaAtual = registro.weekIndex || registro.numeroSemana || 0;
                                              const registroAnterior = evolucaoOrdenadaPorSemana.find(r => {
                                                const semanaR = r.weekIndex || r.numeroSemana || 0;
                                                return semanaR === semanaAtual - 1 && r.peso && r.peso > 0;
                                              });
                                              
                                              // Calcular variação de peso
                                              let variacaoPeso: number | null = null;
                                              if (registro.peso && registro.peso > 0) {
                                                if (registroAnterior && registroAnterior.peso && registroAnterior.peso > 0) {
                                                  variacaoPeso = registro.peso - registroAnterior.peso;
                                                } else if (semanaAtual === 1) {
                                                  variacaoPeso = 0; // Semana 1 sempre tem variação 0
                                                }
                                              }
                                              
                                              return (
                                                <div key={registro.id || registro.weekIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                                  <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                      <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-medium text-gray-900">
                                                          {registro.comentarioMedico === 'Semana de Conclusão' 
                                                            ? `Semana ${registro.weekIndex || registro.numeroSemana || '-'} - Semana de Conclusão`
                                                            : `Semana ${registro.weekIndex || registro.numeroSemana || '-'}`}
                                                        </span>
                                                        {registro.dataRegistro && (
                                                          <span className="text-xs text-gray-500">
                                                            {registro.dataRegistro instanceof Date 
                                                              ? registro.dataRegistro.toLocaleDateString('pt-BR')
                                                              : new Date(registro.dataRegistro).toLocaleDateString('pt-BR')}
                                                          </span>
                                                        )}
                                                      </div>
                                                      {registro.peso && (
                                                        <p className="text-xs text-gray-600">
                                                          <span className="font-medium">Peso:</span> {registro.peso} kg
                                                        </p>
                                                      )}
                                                      {registro.doseAplicada?.quantidade && (
                                                        <p className="text-xs text-gray-600">
                                                          <span className="font-medium">Dose:</span> {registro.doseAplicada.quantidade} mg
                                                        </p>
                                                      )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                      {variacaoPeso !== null && (
                                                        <span className={`text-xs ${variacaoPeso < 0 ? 'text-green-600' : variacaoPeso > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                          {variacaoPeso > 0 ? '+' : ''}{variacaoPeso.toFixed(1)} kg
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                        {/* Botão do Gráfico */}
                                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-center">
                                          <button
                                            onClick={() => {
                                              setPacienteGraficos(paciente);
                                              setShowGraficosModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5"
                                            title="Ver gráficos"
                                          >
                                            <BarChart3 size={14} />
                                            Gráficos do Paciente
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-lg mb-3">
                                        <p className="text-sm text-gray-500">Nenhuma aplicação registrada ainda.</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
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
        // Calcular totais financeiros a partir dos pagamentos dos pacientes
        const pacientesLista = pacientesVisiveis.map(p => p.paciente);
        const pagamentosLista = Object.values(pagamentosPacientes || {});
        const totalRecebido = pagamentosLista.reduce((sum, p) => sum + (p.valorPago || 0), 0);
        const totalEmAberto = pagamentosLista.reduce((sum, p) => sum + (p.valorPendente || 0), 0);
        const totalPrevisto = pagamentosLista.reduce((sum, p) => sum + (p.valorTotal || 0), 0);

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Financeiro</h2>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500">Receitas Recebidas</p>
                <p className="mt-2 text-2xl font-semibold text-green-700">
                  R$ {totalRecebido.toFixed(2)}
                </p>
          </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500">Em Aberto</p>
                <p className="mt-2 text-2xl font-semibold text-amber-600">
                  R$ {totalEmAberto.toFixed(2)}
                </p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500">Total Previsto</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  R$ {totalPrevisto.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar paciente por nome..."
                    value={buscaPacienteFinanceiro}
                    onChange={(e) => setBuscaPacienteFinanceiro(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:w-48">
                  <select
                    value={filtroStatusPagamentoFinanceiro}
                    onChange={(e) => setFiltroStatusPagamentoFinanceiro(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="pago">Pago</option>
                    <option value="em_aberto">Em Aberto</option>
                    <option value="iniciou_pagamento">Parcial</option>
                    <option value="negociacao">Negociação</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabela de pacientes */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="min-w-[900px] w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="sticky left-0 z-20 bg-gray-50 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Descrição / Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pago
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Em Aberto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Pacientes */}
                    {pacientesLista
                      .filter((paciente) => {
                        // Filtro por nome
                        const nomeCompleto = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '';
                        const matchNome = buscaPacienteFinanceiro === '' || 
                          nomeCompleto.toLowerCase().includes(buscaPacienteFinanceiro.toLowerCase());
                        
                        // Filtro por status de pagamento
                        const pagamento = pagamentosPacientes[paciente.id];
                        const statusPagamento = pagamento?.statusPagamento || 'negociacao';
                        const matchStatus = filtroStatusPagamentoFinanceiro === 'todos' || 
                          statusPagamento === filtroStatusPagamentoFinanceiro;
                        
                        return matchNome && matchStatus;
                      })
                      .map((paciente) => {
                        const pagamento = pagamentosPacientes[paciente.id];
                        // Extrair nome e sobrenome do nome completo
                        const nomeCompleto = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '';
                        const partesNome = nomeCompleto.trim().split(/\s+/);
                        const nomeSobrenome = partesNome.length > 1 
                          ? `${partesNome[0]} ${partesNome[partesNome.length - 1]}`
                          : partesNome[0] || nomeCompleto;
                        return (
                          <tr key={`paciente-${paciente.id}`} className="group hover:bg-gray-50">
                            <td className="sticky left-0 z-20 bg-white group-hover:bg-gray-50 px-4 lg:px-6 py-4 whitespace-nowrap border-r border-gray-200">
                              <div className="text-sm font-medium text-gray-900">{nomeSobrenome}</div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-white group-hover:bg-gray-50">
                              R$ {(pagamento?.valorTotal || 0).toFixed(2)}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-white group-hover:bg-gray-50">
                              R$ {(pagamento?.valorPago || 0).toFixed(2)}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-white group-hover:bg-gray-50">
                              R$ {(pagamento?.valorPendente || 0).toFixed(2)}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap bg-white group-hover:bg-gray-50">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  pagamento?.statusPagamento === 'pago'
                                    ? 'bg-green-100 text-green-800'
                                    : pagamento?.statusPagamento === 'em_aberto'
                                    ? 'bg-red-100 text-red-800'
                                    : pagamento?.statusPagamento === 'iniciou_pagamento'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {pagamento?.statusPagamento === 'pago'
                                  ? 'Pago'
                                  : pagamento?.statusPagamento === 'em_aberto'
                                  ? 'Em Aberto'
                                  : pagamento?.statusPagamento === 'iniciou_pagamento'
                                  ? 'Parcial'
                                  : 'Negociação'}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium bg-white group-hover:bg-gray-50">
                              <button
                                onClick={() => {
                                  setPacientePagamentoSelecionado(paciente);
                                  if (pagamento) {
                                    setDadosPagamento(pagamento);
                                  } else {
                                    setDadosPagamento({
                                      pacienteId: paciente.id,
                                      statusPagamento: 'negociacao',
                                      formaPagamento: null,
                                      valorTotal: 0,
                                      valorPago: 0,
                                      valorPendente: 0,
                                      parcelas: [],
                                      dataUltimaAtualizacao: new Date(),
                                    });
                                  }
                                  setShowModalPagamento(true);
                                }}
                                className="text-green-700 hover:text-green-900"
                              >
                                Gerenciar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }
      case 'calendario': {
        // Obter lista de pacientes do personal trainer para o calendário
        const pacientesCalendario = pacientesVisiveis.map(p => p.paciente);
        
        // Função para calcular aplicações de um paciente
        const calcularAplicacoesPaciente = (paciente: PacienteCompleto, mesInicio: Date, mesFim: Date) => {
          const aplicacoes: Array<{
            data: Date;
            paciente: PacienteCompleto;
            semana: number;
            dose: number;
            localAplicacao: string;
          }> = [];

          const planoTerapeutico = paciente.planoTerapeutico;
          if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
            return aplicacoes;
          }

          const diasSemana: { [key: string]: number } = {
            dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
          };

          const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
          const startDateValue = planoTerapeutico.startDate;
          const primeiraDose = startDateValue instanceof Date 
            ? new Date(startDateValue)
            : new Date(startDateValue as any);
          primeiraDose.setHours(0, 0, 0, 0);
          
          // Ajustar para o dia da semana correto
          while (primeiraDose.getDay() !== diaDesejado) {
            primeiraDose.setDate(primeiraDose.getDate() + 1);
          }

          const doseInicial = planoTerapeutico.currentDoseMg || 2.5;
          const evolucao = paciente.evolucaoSeguimento || [];
          
          // Obter número de semanas do tratamento (padrão: 18)
          const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
          
          // Obter semanas canceladas
          const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
          
          // Locais de aplicação em rotação
          const locais = ['abdome', 'coxa', 'braco'];
          
          // Função para calcular dose considerando atrasos de 4+ dias (reinicia ciclo)
          const calcularDoseComAtrasos = (semanaIndex: number) => {
            let semanasDesdeUltimoCiclo = semanaIndex;
            
            // Verificar se houve atraso de 4+ dias em aplicações anteriores
            for (let s = 0; s < semanaIndex; s++) {
              const dataPrevista = new Date(primeiraDose);
              dataPrevista.setDate(primeiraDose.getDate() + (s * 7));
              
              // Buscar registro correspondente
              const registro = evolucao.find(e => {
                if (!e.dataRegistro) return false;
                const dataRegistro = e.dataRegistro instanceof Date 
                  ? new Date(e.dataRegistro)
                  : new Date(e.dataRegistro as any);
                if (isNaN(dataRegistro.getTime())) return false;
                dataRegistro.setHours(0, 0, 0, 0);
                const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
                return diffDias <= 1; // Tolerância de 1 dia
              });
              
              // Se encontrou registro e houve atraso de 4+ dias
              if (registro && registro.dataRegistro) {
                const dataRegistro = registro.dataRegistro instanceof Date 
                  ? new Date(registro.dataRegistro)
                  : new Date(registro.dataRegistro as any);
                dataRegistro.setHours(0, 0, 0, 0);
                const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
                
                // Se atraso de 4 dias ou mais, reiniciar ciclo a partir dessa semana
                if (diffDias >= 4) {
                  semanasDesdeUltimoCiclo = semanaIndex - s - 1;
                  break; // Usar o primeiro atraso encontrado como referência
                }
              }
            }
            
            // Calcular dose: aumento de 2.5mg a cada 4 semanas desde o último ciclo
            return doseInicial + (Math.floor(semanasDesdeUltimoCiclo / 4) * 2.5);
          };
          
          // Calcular aplicações baseado no número de semanas do tratamento
          for (let semana = 0; semana < numeroSemanas; semana++) {
            const semanaNum = semana + 1;
            
            // Pular semanas canceladas
            if (semanasCanceladas.includes(semanaNum)) {
              continue;
            }
            
            const dataDose = new Date(primeiraDose);
            dataDose.setDate(primeiraDose.getDate() + (semana * 7));

            // Verificar se está no intervalo do mês do calendário
            if (dataDose >= mesInicio && dataDose <= mesFim) {
              // Calcular dose planejada: primeiro verificar se há dose customizada, senão usar cálculo automático
              let dosePlanejada: number;
              if (planoTerapeutico.esquemaDosesCustomizado && planoTerapeutico.esquemaDosesCustomizado[semanaNum]) {
                // Usar dose customizada se existir
                dosePlanejada = planoTerapeutico.esquemaDosesCustomizado[semanaNum];
              } else {
                // Calcular dose planejada considerando atrasos (reinicia ciclo se atraso >= 4 dias)
                dosePlanejada = calcularDoseComAtrasos(semana);
              }
              
              // Encontrar aplicação da semana anterior para rotação do local
              const dataSemanaAnterior = new Date(dataDose);
              dataSemanaAnterior.setDate(dataDose.getDate() - 7);
              
              // Buscar aplicação exata da semana anterior (tolerância de ±1 dia)
              const aplicacaoSemanaAnterior = evolucao.find(e => {
                const dataRegistro = e.dataRegistro instanceof Date 
                  ? new Date(e.dataRegistro)
                  : new Date(e.dataRegistro as any);
                const diffDias = Math.abs((dataRegistro.getTime() - dataSemanaAnterior.getTime()) / (1000 * 60 * 60 * 24));
                return diffDias <= 1; // Tolerância de 1 dia
              });

              // Se não encontrar da semana anterior, buscar última aplicação registrada
              let ultimoLocalAplicado = aplicacaoSemanaAnterior?.localAplicacao;
              
              if (!ultimoLocalAplicado) {
                const ultimaAplicacao = evolucao
                  .filter(e => {
                    const dataRegistro = e.dataRegistro instanceof Date 
                      ? new Date(e.dataRegistro)
                      : new Date(e.dataRegistro as any);
                    return dataRegistro < dataDose;
                  })
                  .sort((a, b) => {
                    const dataA = a.dataRegistro instanceof Date 
                      ? new Date(a.dataRegistro)
                      : new Date(a.dataRegistro as any);
                    const dataB = b.dataRegistro instanceof Date 
                      ? new Date(b.dataRegistro)
                      : new Date(b.dataRegistro as any);
                    return dataB.getTime() - dataA.getTime();
                  })[0];
                ultimoLocalAplicado = ultimaAplicacao?.localAplicacao;
              }

              let localIndex = 0;
              if (ultimoLocalAplicado) {
                const ultimoLocalIndex = locais.indexOf(ultimoLocalAplicado);
                if (ultimoLocalIndex >= 0) {
                  // Rotacionar: próximo local (nunca igual ao anterior)
                  localIndex = (ultimoLocalIndex + 1) % locais.length;
                }
              }

              aplicacoes.push({
                data: dataDose,
                paciente,
                semana: semanaNum,
                dose: dosePlanejada,
                localAplicacao: locais[localIndex]
              });
            }
          }

          return aplicacoes;
        };

        // Função para obter aplicações do mês
        const obterAplicacoesMes = () => {
          const ano = mesCalendario.getFullYear();
          const mes = mesCalendario.getMonth();
          const mesInicio = new Date(ano, mes, 1);
          const mesFim = new Date(ano, mes + 1, 0);
          mesFim.setHours(23, 59, 59);

          const todasAplicacoes: Array<{
            data: Date;
            paciente: PacienteCompleto;
            semana: number;
            dose: number;
            localAplicacao: string;
          }> = [];

          pacientesCalendario
            .filter(p => p.statusTratamento === 'em_tratamento')
            .forEach(paciente => {
              const aplicacoes = calcularAplicacoesPaciente(paciente, mesInicio, mesFim);
              todasAplicacoes.push(...aplicacoes);
            });

          return todasAplicacoes;
        };

        // Função para obter pagamentos do mês (pagamentos parcelados personal-paciente)
        const obterPagamentosMes = () => {
          const ano = mesCalendario.getFullYear();
          const mes = mesCalendario.getMonth();
          const mesInicio = new Date(ano, mes, 1);
          const mesFim = new Date(ano, mes + 1, 0);
          mesFim.setHours(23, 59, 59);

          const pagamentosDoMes: Array<{
            data: Date;
            paciente: PacienteCompleto;
            parcela: ParcelaPagamento;
          }> = [];

          // Iterar sobre todos os pagamentos personal-paciente
          Object.entries(pagamentosPacientes).forEach(([pacienteId, pagamento]) => {
            const paciente = pacientesCalendario.find(p => p.id === pacienteId);
            if (!paciente || !pagamento.parcelas) return;

            // Verificar cada parcela
            pagamento.parcelas.forEach(parcela => {
              if (parcela.dataVencimento) {
                const dataVencimento = parcela.dataVencimento instanceof Date 
                  ? new Date(parcela.dataVencimento)
                  : new Date(parcela.dataVencimento as any);
                
                // Verificar se está no mês do calendário
                if (dataVencimento >= mesInicio && dataVencimento <= mesFim) {
                  pagamentosDoMes.push({
                    data: dataVencimento,
                    paciente,
                    parcela
                  });
                }
              }
            });
          });

          return pagamentosDoMes;
        };

        // Função para obter treinos do mês (FUTURO - será implementado quando treinos forem definidos na página /meta)
        const obterTreinosMes = () => {
          // TODO: Implementar quando estrutura de treinos estiver disponível
          // Fonte: será definida posteriormente na página /meta
          return [];
        };

        // Função para renderizar calendário
        const renderizarCalendario = () => {
          const ano = mesCalendario.getFullYear();
          const mes = mesCalendario.getMonth();
          const aplicacoes = obterAplicacoesMes();
          const pagamentos = obterPagamentosMes();
          const treinos = obterTreinosMes(); // FUTURO

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
              const dataAplicacao = a.data;
              return dataAplicacao.getDate() === data.getDate() &&
                     dataAplicacao.getMonth() === data.getMonth() &&
                     dataAplicacao.getFullYear() === data.getFullYear();
            });

            const pagamentosDoDia = pagamentos.filter(p => {
              const dataPagamento = p.data;
              return dataPagamento.getDate() === data.getDate() &&
                     dataPagamento.getMonth() === data.getMonth() &&
                     dataPagamento.getFullYear() === data.getFullYear();
            });

            // TODO: Filtrar treinos quando implementado
            // const treinosDoDia = treinos.filter(t => { ... });

            setDiaSelecionado(data);
            setAplicacoesDiaSelecionado(aplicacoesDoDia);
            setPagamentosDiaSelecionado(pagamentosDoDia);
            // setTreinosDiaSelecionado(treinosDoDia); // FUTURO
          };

          return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Calendário de Aplicações</h2>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <button
                    onClick={() => mudarMes('anterior')}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm sm:text-lg font-semibold text-gray-900 flex-1 text-center sm:flex-none">
                    {meses[mes]} {ano}
                  </span>
                  <button
                    onClick={() => mudarMes('proximo')}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setMesCalendario(new Date())}
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors whitespace-nowrap"
                  >
                    Hoje
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {diasSemana.map(dia => (
                    <div key={dia} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-700 bg-gray-50">
                      {dia}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {dias.map((dia, index) => {
                    const aplicacoesDoDia = dia ? aplicacoes.filter(a => {
                      const dataAplicacao = a.data;
                      return dataAplicacao.getDate() === dia.getDate() &&
                             dataAplicacao.getMonth() === dia.getMonth() &&
                             dataAplicacao.getFullYear() === dia.getFullYear();
                    }) : [];

                    const pagamentosDoDia = dia ? pagamentos.filter(p => {
                      const dataPagamento = p.data;
                      return dataPagamento.getDate() === dia.getDate() &&
                             dataPagamento.getMonth() === dia.getMonth() &&
                             dataPagamento.getFullYear() === dia.getFullYear();
                    }) : [];

                    // TODO: Filtrar treinos quando implementado
                    // const treinosDoDia = dia ? treinos.filter(t => { ... }) : [];

                    const hoje = new Date();
                    const eHoje = dia && dia.getDate() === hoje.getDate() &&
                                  dia.getMonth() === hoje.getMonth() &&
                                  dia.getFullYear() === hoje.getFullYear();

                    // Verificar se tem aplicações ou pagamentos para definir cor de fundo
                    const temAplicacoes = aplicacoesDoDia.length > 0;
                    const temPagamentos = pagamentosDoDia.length > 0;
                    // const temTreinos = treinosDoDia.length > 0; // FUTURO

                    return (
                      <div
                        key={index}
                        onClick={() => handleDiaClick(dia)}
                        className={`min-h-16 sm:min-h-24 border border-gray-200 p-1 sm:p-2 cursor-pointer transition-colors ${
                          dia === null
                            ? 'bg-gray-50'
                            : eHoje
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : temAplicacoes
                            ? 'bg-green-50 hover:bg-green-100'
                            : temPagamentos
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {dia && (
                          <>
                            <div className={`text-xs sm:text-sm font-medium mb-1 ${
                              eHoje ? 'text-blue-600' : 'text-gray-700'
                            }`}>
                              {dia.getDate()}
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                              {/* Aplicações (verde) */}
                              {aplicacoesDoDia.length > 0 && (
                                <>
                                  {aplicacoesDoDia.slice(0, temPagamentos ? 1 : 2).map((aplicacao, idx) => (
                                    <div
                                      key={`app-${idx}`}
                                      className="text-[10px] sm:text-xs bg-green-600 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate"
                                      title={aplicacao.paciente.nome}
                                    >
                                      {aplicacao.paciente.nome}
                                    </div>
                                  ))}
                                </>
                              )}
                              {/* Pagamentos (azul claro) */}
                              {pagamentosDoDia.length > 0 && (
                                <>
                                  {pagamentosDoDia.slice(0, temAplicacoes ? 1 : 2).map((pagamento, idx) => (
                                    <div
                                      key={`pag-${idx}`}
                                      className="text-[10px] sm:text-xs bg-blue-300 text-blue-900 px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate font-medium"
                                      title={pagamento.paciente.nome}
                                    >
                                      {pagamento.paciente.nome}
                                    </div>
                                  ))}
                                </>
                              )}
                              {/* TODO: Treinos quando implementado */}
                              {/* Contador de itens extras */}
                              {(aplicacoesDoDia.length + pagamentosDoDia.length) > 2 && (
                                <div className="text-[10px] sm:text-xs text-gray-600 font-medium">
                                  +{(aplicacoesDoDia.length + pagamentosDoDia.length) - 2} mais
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detalhes do dia selecionado abaixo do calendário */}
              {diaSelecionado && (
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                      {diaSelecionado.toLocaleDateString('pt-BR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <button
                      onClick={() => {
                        setDiaSelecionado(null);
                        setAplicacoesDiaSelecionado([]);
                        setPagamentosDiaSelecionado([]);
                        setTreinosDiaSelecionado([]);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X size={20} className="sm:w-6 sm:h-6" />
                    </button>
                  </div>
                  
                  {/* Aplicações */}
                  {aplicacoesDiaSelecionado.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Pill className="h-5 w-5 text-green-600" />
                        Aplicações ({aplicacoesDiaSelecionado.length})
                      </h4>
                      <div className="space-y-3">
                        {aplicacoesDiaSelecionado.map((aplicacao, idx) => (
                          <div
                            key={idx}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {aplicacao.paciente.nome}
                              </h4>
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                                Semana {aplicacao.semana}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                <span className="text-sm text-gray-500">Dose:</span>
                                <span className="ml-2 text-sm font-medium text-gray-900">
                                  {aplicacao.dose} mg
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Local de Aplicação:</span>
                                <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                                  {aplicacao.localAplicacao === 'abdome' ? 'Abdome' : 
                                   aplicacao.localAplicacao === 'coxa' ? 'Coxa' : 'Braço'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Pagamentos (parcelados personal-paciente) */}
                  {pagamentosDiaSelecionado.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        Pagamentos ({pagamentosDiaSelecionado.length})
                      </h4>
                      <div className="space-y-3">
                        {pagamentosDiaSelecionado.map((pagamento, idx) => (
                          <div
                            key={idx}
                            className="border border-blue-200 rounded-lg p-4 bg-blue-50 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {pagamento.paciente.nome}
                              </h4>
                              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                pagamento.parcela.status === 'paga' 
                                  ? 'bg-green-100 text-green-700'
                                  : pagamento.parcela.status === 'atrasada'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {pagamento.parcela.status === 'paga' ? 'Paga' :
                                 pagamento.parcela.status === 'atrasada' ? 'Atrasada' : 'Pendente'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                <span className="text-sm text-gray-500">Valor:</span>
                                <span className="ml-2 text-sm font-medium text-gray-900">
                                  R$ {pagamento.parcela.valor.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Parcela:</span>
                                <span className="ml-2 text-sm font-medium text-gray-900">
                                  {pagamento.parcela.numero}
                                </span>
                              </div>
                            </div>
                            {pagamento.parcela.observacoes && (
                              <div className="mt-3">
                                <span className="text-sm text-gray-500">Observações:</span>
                                <span className="ml-2 text-sm text-gray-700">
                                  {pagamento.parcela.observacoes}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Treinos (FUTURO - será implementado quando treinos forem definidos na página /meta) */}
                  {treinosDiaSelecionado.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-purple-600" />
                        Treinos ({treinosDiaSelecionado.length})
                      </h4>
                      <div className="space-y-3">
                        {/* TODO: Implementar quando treinos forem definidos na página /meta */}
                        <p className="text-gray-500 text-sm">Estrutura preparada para implementação futura.</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Mensagem quando não há nada */}
                  {aplicacoesDiaSelecionado.length === 0 && pagamentosDiaSelecionado.length === 0 && treinosDiaSelecionado.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      Nenhuma aplicação ou pagamento agendado para este dia.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        };

        return renderizarCalendario();
      }
      case 'meu-perfil':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Perfil do Personal Trainer</h2>
              <p className="text-gray-600 mb-4">Gerencie suas informações de perfil.</p>
              <button
                onClick={() => setShowPerfilModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Abrir Perfil
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loadingPersonalTrainer || (loading && !user)) {
    return <PageLoadingScreen />;
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
    <div className="flex">
      {/* Sidebar Desktop - Idêntica ao metanutri */}
      <div className={`hidden lg:block fixed inset-y-0 left-0 z-40 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex flex-col h-full">
          {/* Logo e botão de toggle */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <div className="flex items-center">
                <img
                  src="/logo.png"
                  alt="Oftware Logo"
                  className="h-5 w-auto object-contain"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                {sidebarCollapsed ? <Activity size={24} /> : <X size={24} />}
              </button>
            </div>
          </div>

          {/* User info */}
          {!sidebarCollapsed && (
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="mb-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Bem-vindo,</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
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
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Personal</span>
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
                    <span className="text-xs text-gray-500">{agregadoPersonal.count} • {agregadoPersonal.media.toFixed(1)}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {user?.email}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 py-4 space-y-2 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            <button
              onClick={() => setActiveMenu('home')}
              className={`w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'home'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-500 dark:border-blue-600'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={sidebarCollapsed ? 'Home' : ''}
            >
              <Home size={sidebarCollapsed ? 24 : 20} className={`flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Home'}
            </button>
            <button
              onClick={() => setActiveMenu('medicos')}
              className={`w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'medicos'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-500 dark:border-blue-600'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={sidebarCollapsed ? 'Médicos' : ''}
            >
              <Stethoscope size={sidebarCollapsed ? 24 : 20} className={`flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Médicos'}
            </button>
            <button
              onClick={() => setActiveMenu('pacientes')}
              className={`w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors relative ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'pacientes'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-500 dark:border-blue-600'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={sidebarCollapsed ? 'Pacientes' : ''}
            >
              <Users size={sidebarCollapsed ? 24 : 20} className={`flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Pacientes'}
            </button>
            <button
              onClick={() => setActiveMenu('financeiro')}
              className={`w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'financeiro'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-500 dark:border-blue-600'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={sidebarCollapsed ? 'Financeiro' : ''}
            >
              <DollarSign size={sidebarCollapsed ? 24 : 20} className={`flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Financeiro'}
            </button>
            <button
              onClick={() => setActiveMenu('calendario')}
              className={`w-full flex items-center py-2 text-sm font-medium rounded-md transition-colors ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                activeMenu === 'calendario'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-500 dark:border-blue-600'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={sidebarCollapsed ? 'Calendário' : ''}
            >
              <Calendar size={sidebarCollapsed ? 24 : 20} className={`flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Calendário'}
            </button>
          </nav>

          {/* Profile button */}
          <div className={`py-4 border-t border-gray-200 dark:border-gray-700 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={`w-full flex items-center py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors ${
                  sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                }`}
                title={sidebarCollapsed ? 'Perfil' : ''}
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className={`w-8 h-8 rounded-full flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`}
                  />
                ) : (
                  <UserCircle size={sidebarCollapsed ? 24 : 20} className={`flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                )}
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">Perfil</span>
                    <ChevronDown size={16} className={showProfileDropdown ? 'rotate-180' : ''} />
                  </>
                )}
              </button>
              {showProfileDropdown && !sidebarCollapsed && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[280px]">
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
                        setShowPerfilModal(true);
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
      
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-16' : 'ml-64'} overflow-x-hidden pb-20 lg:pb-0 bg-gray-50 dark:bg-gray-900`}>
        {/* Mobile Header - oculto quando view=personal (header fica só "Aluno: nome" do PersonalPageContent) */}
        {!(searchParams.get('view') === 'personal' && searchParams.get('pacienteId')) && (
        <div className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1 min-w-0">
              {/* Logo personal trainer, logo verificação, nome e tipo */}
              {personalTrainer && (
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-2">
                    <Dumbbell className="h-6 w-6 text-blue-600 flex-shrink-0" />
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
                            setShowPerfilModal(true);
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
                              onClick={() => setShowPerfilModal(true)}
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
                                setActiveMenu('medicos');
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
        <main className="p-6 bg-gray-50 dark:bg-gray-900">
          {searchParams.get('view') === 'personal' && searchParams.get('pacienteId') ? (
            <div className="pb-20">
              <Suspense fallback={<div className="p-4">Carregando...</div>}>
                <PersonalPageContent fromMetapersonalEmbedded />
              </Suspense>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex items-center justify-around py-2 px-1">
          <button
            onClick={() => setActiveMenu('home')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'home'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600'
            }`}
          >
            <Home className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => setActiveMenu('medicos')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'medicos'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600'
            }`}
          >
            <Stethoscope className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Médicos</span>
          </button>

          <button
            onClick={() => setActiveMenu('pacientes')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'pacientes'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600'
            }`}
          >
            <Users className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Pacientes</span>
          </button>

          <button
            onClick={() => setActiveMenu('financeiro')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'financeiro'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600'
            }`}
          >
            <DollarSign className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Financeiro</span>
          </button>

          <button
            onClick={() => setActiveMenu('calendario')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'calendario'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Calendário</span>
          </button>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showModalPagamento && pacientePagamentoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Controle de Pagamento - {pacientePagamentoSelecionado.dadosIdentificacao?.nomeCompleto || pacientePagamentoSelecionado.nome}
                </h2>
                <button
                  onClick={() => {
                    setShowModalPagamento(false);
                    setPacientePagamentoSelecionado(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status do Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status do Pagamento
                </label>
                <select
                  value={dadosPagamento.statusPagamento}
                  onChange={(e) => {
                    const novoStatus = e.target.value as PagamentoPaciente['statusPagamento'];
                    setDadosPagamento({
                      ...dadosPagamento,
                      statusPagamento: novoStatus,
                      dataPagamento: novoStatus === 'pago' ? new Date() : undefined
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="negociacao">Em Negociação</option>
                  <option value="iniciou_pagamento">Iniciou Pagamento</option>
                  <option value="em_aberto">Em Aberto</option>
                  <option value="pago">Pago</option>
                </select>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento
                </label>
                <select
                  value={dadosPagamento.formaPagamento || ''}
                  onChange={(e) => {
                    setDadosPagamento({
                      ...dadosPagamento,
                      formaPagamento: e.target.value ? e.target.value as 'a_vista' | 'dividido' | 'cartao' : null,
                      parcelas: (e.target.value === 'dividido' || e.target.value === 'cartao') ? dadosPagamento.parcelas || [] : []
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecione...</option>
                  <option value="a_vista">À Vista</option>
                  <option value="dividido">Dividido (Parcelado)</option>
                  <option value="cartao">Cartão</option>
                </select>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={dadosPagamento.valorTotal || ''}
                    onChange={(e) => {
                      const valorTotal = parseFloat(e.target.value) || 0;
                      setDadosPagamento({
                        ...dadosPagamento,
                        valorTotal,
                        valorPendente: valorTotal - (dadosPagamento.valorPago || 0)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Pago (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={dadosPagamento.valorPago || ''}
                    onChange={(e) => {
                      const valorPago = parseFloat(e.target.value) || 0;
                      setDadosPagamento({
                        ...dadosPagamento,
                        valorPago,
                        valorPendente: (dadosPagamento.valorTotal || 0) - valorPago
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Pendente (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={dadosPagamento.valorPendente || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Parcelas (se dividido ou cartão) */}
              {(dadosPagamento.formaPagamento === 'dividido' || dadosPagamento.formaPagamento === 'cartao') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Parcelas
                    </label>
                    {(dadosPagamento.valorTotal || 0) > 0 && (
                      <button
                        onClick={() => {
                          const numParcelas = prompt('Quantas parcelas?');
                          if (numParcelas && !isNaN(parseInt(numParcelas))) {
                            const valorParcela = (dadosPagamento.valorTotal || 0) / parseInt(numParcelas);
                            const parcelas: ParcelaPagamento[] = [];
                            const hoje = new Date();
                            for (let i = 1; i <= parseInt(numParcelas); i++) {
                              const dataVencimento = new Date(hoje);
                              dataVencimento.setMonth(hoje.getMonth() + i);
                              parcelas.push({
                                numero: i,
                                valor: valorParcela,
                                dataVencimento,
                                status: 'pendente'
                              });
                            }
                            setDadosPagamento({
                              ...dadosPagamento,
                              parcelas
                            });
                          }
                        }}
                        className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Adicionar Parcelas
                      </button>
                    )}
                  </div>
                  {dadosPagamento.parcelas && dadosPagamento.parcelas.length > 0 && (
                    <div className="space-y-2">
                      {/* Validação da soma das parcelas */}
                      {(() => {
                        const somaParcelas = dadosPagamento.parcelas.reduce((sum, p) => sum + (p.valor || 0), 0);
                        const diferenca = Math.abs(somaParcelas - (dadosPagamento.valorTotal || 0));
                        if (diferenca > 0.01) {
                          return (
                            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-xs text-yellow-800">
                                Aviso: A soma das parcelas (R$ {somaParcelas.toFixed(2)}) não corresponde ao valor total (R$ {(dadosPagamento.valorTotal || 0).toFixed(2)})
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div className="max-h-60 overflow-y-auto">
                        {dadosPagamento.parcelas.map((parcela, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-gray-900">
                                Parcela {parcela.numero}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-20">Valor:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={parcela.valor || ''}
                                onChange={(e) => {
                                  const novasParcelas = [...(dadosPagamento.parcelas || [])];
                                  const novoValor = parseFloat(e.target.value) || 0;
                                  novasParcelas[idx] = {
                                    ...parcela,
                                    valor: novoValor,
                                  };
                                  // Recalcular valor total baseado na soma das parcelas
                                  const somaParcelas = novasParcelas.reduce((sum, p) => sum + (p.valor || 0), 0);
                                  setDadosPagamento({
                                    ...dadosPagamento,
                                    parcelas: novasParcelas,
                                    valorTotal: somaParcelas,
                                    valorPendente: somaParcelas - (dadosPagamento.valorPago || 0),
                                  });
                                }}
                                className="text-xs px-2 py-1 border border-gray-300 rounded-md bg-white w-24"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-20">Vencimento:</span>
                              <input
                                type="date"
                                value={
                                  parcela.dataVencimento
                                    ? new Date(parcela.dataVencimento).toISOString().slice(0, 10)
                                    : ''
                                }
                                onChange={(e) => {
                                  const novasParcelas = [...(dadosPagamento.parcelas || [])];
                                  const novaData = e.target.value
                                    ? new Date(`${e.target.value}T00:00:00`)
                                    : undefined;
                                  novasParcelas[idx] = {
                                    ...parcela,
                                    dataVencimento: novaData as Date,
                                  };
                                  setDadosPagamento({
                                    ...dadosPagamento,
                                    parcelas: novasParcelas,
                                  });
                                }}
                                className="text-xs px-2 py-1 border border-gray-300 rounded-md bg-white"
                              />
                            </div>
                          </div>
                          <select
                            value={parcela.status}
                            onChange={(e) => {
                              const novasParcelas = [...dadosPagamento.parcelas!];
                              novasParcelas[idx] = {
                                ...parcela,
                                status: e.target.value as 'pendente' | 'paga' | 'atrasada',
                                dataPagamento: e.target.value === 'paga' ? new Date() : undefined,
                              };
                              setDadosPagamento({
                                ...dadosPagamento,
                                parcelas: novasParcelas,
                                valorPago: novasParcelas
                                  .filter((p) => p.status === 'paga')
                                  .reduce((sum, p) => sum + p.valor, 0),
                                valorPendente:
                                  (dadosPagamento.valorTotal || 0) -
                                  novasParcelas
                                    .filter((p) => p.status === 'paga')
                                    .reduce((sum, p) => sum + p.valor, 0),
                              });
                            }}
                            className="text-xs px-2 py-1 border border-gray-300 rounded-md"
                          >
                            <option value="pendente">Pendente</option>
                            <option value="paga">Paga</option>
                            <option value="atrasada">Atrasada</option>
                          </select>
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={dadosPagamento.observacoes || ''}
                  onChange={(e) => {
                    setDadosPagamento({
                      ...dadosPagamento,
                      observacoes: e.target.value
                    });
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Anotações sobre o pagamento..."
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    if (!user || !pacientePagamentoSelecionado) return;
                    try {
                      await PagamentoService.salvarPagamentoPersonalTrainerPaciente(
                        user.uid,
                        pacientePagamentoSelecionado.id,
                        {
                          statusPagamento: dadosPagamento.statusPagamento,
                          formaPagamento: dadosPagamento.formaPagamento,
                          valorTotal: dadosPagamento.valorTotal,
                          valorPago: dadosPagamento.valorPago,
                          valorPendente: dadosPagamento.valorPendente,
                          parcelas: dadosPagamento.parcelas || [],
                          observacoes: dadosPagamento.observacoes,
                          dataUltimaAtualizacao: new Date(),
                          dataVencimento: dadosPagamento.dataVencimento,
                          dataPagamento: dadosPagamento.dataPagamento
                        }
                      );
                      await loadPagamentos(pacientesVisiveis.map(p => p.paciente));
                      setShowModalPagamento(false);
                      setPacientePagamentoSelecionado(null);
                      alert('Pagamento salvo com sucesso!');
                    } catch (error) {
                      console.error('Erro ao salvar pagamento:', error);
                      alert('Erro ao salvar pagamento');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setShowModalPagamento(false);
                    setPacientePagamentoSelecionado(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Meu Perfil */}
      {showPerfilModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserCircle size={20} className="text-yellow-600" />
                Meu Perfil
              </h3>
              <button
                onClick={() => setShowPerfilModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div className={`p-4 rounded-lg ${personalTrainer?.isVerificado ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  {personalTrainer?.isVerificado ? (
                    <>
                      <ShieldCheck size={18} className="text-green-600" />
                      <span className="text-sm font-semibold text-green-900">Verificado</span>
                    </>
                  ) : (
                    <>
                      <Clock size={18} className="text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-900">Aguardando verificação</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {personalTrainer?.isVerificado 
                    ? 'Seu perfil foi verificado pelo administrador.'
                    : 'Seu perfil está aguardando verificação. Após a aprovação, você poderá acessar mais funcionalidades.'}
                </p>
              </div>

              {/* Vínculos */}
              {personalTrainer?.isVerificado && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Médicos vinculados:</strong> {personalTrainer.medicoVinculadoIds.length}
                  </p>
                </div>
              )}

              {/* Registro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Registro (CREF - apenas números) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={registroNumero}
                  onChange={(e) => setRegistroNumero(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>

              {/* Telefone para contato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone para contato *
                </label>
                <input
                  type="tel"
                  value={telefoneContato}
                  onChange={(e) => setTelefoneContato(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>

              {/* Cidades */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidades Atendidas *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <select
                    value={estadoSelecionado}
                    onChange={(e) => {
                      setEstadoSelecionado(e.target.value);
                      setCidadeSelecionada('');
                    }}
                    disabled={loadingCidadesMedicos}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione o estado</option>
                    {loadingCidadesMedicos ? (
                      <option value="">Carregando...</option>
                    ) : (
                      estadosComMedicos.map((estado) => {
                        const estadoInfo = estadosList.find(e => e.sigla === estado);
                        return (
                          <option key={estado} value={estado}>
                            {estadoInfo?.nome || estado}
                          </option>
                        );
                      })
                    )}
                  </select>
                  <select
                    value={cidadeSelecionada}
                    onChange={(e) => setCidadeSelecionada(e.target.value)}
                    disabled={!estadoSelecionado}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione a cidade</option>
                    {cidadesDoEstado.map((cidade) => (
                      <option key={cidade} value={cidade}>
                        {cidade}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddCidade}
                    disabled={!estadoSelecionado || !cidadeSelecionada}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin size={16} />
                    Adicionar
                  </button>
                </div>

                {cidadesSelecionadas.length > 0 && (
                  <div className="space-y-2">
                    {cidadesSelecionadas.map((cidade, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">
                          {cidade.cidade}, {estadosCidades[cidade.estado as keyof typeof estadosCidades]?.nome || cidade.estado}
                        </span>
                        <button
                          onClick={() => handleRemoveCidade(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mensagem */}
              {saveMessage && (
                <div
                  className={`p-3 rounded-lg relative ${
                    saveMessage.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <button
                    onClick={() => setSaveMessage(null)}
                    className={`absolute top-2 right-2 ${
                      saveMessage.type === 'success'
                        ? 'text-green-700 hover:text-green-900'
                        : 'text-red-700 hover:text-red-900'
                    }`}
                    aria-label="Fechar mensagem"
                  >
                    <X size={16} />
                  </button>
                  {saveMessage.text}
                </div>
              )}

              {/* Botão Salvar */}
              <div className="flex justify-end">
                <button
                  onClick={handleSavePerfil}
                  disabled={isSaving || !canSavePerfil}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Meu Link */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <LinkIcon size={20} className="text-blue-600" />
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
                Gere um link para indicar pacientes a um médico. O paciente será redirecionado para solicitar acompanhamento com o médico escolhido e com você.
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione um médico</option>
                    {medicosVerificados
                      .filter(m => personalTrainer?.medicoVinculadoIds?.includes(m.id))
                      .map((medico) => (
                        <option key={medico.id} value={medico.id}>
                          {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome} - CRM {medico.crm?.estado} {medico.crm?.numero}
                        </option>
                      ))}
                  </select>
                )}
                {personalTrainer && (!personalTrainer.medicoVinculadoIds || personalTrainer.medicoVinculadoIds.length === 0) && (
                  <p className="text-sm text-amber-600 mt-2">
                    Você ainda não possui médicos vinculados. Vá em "Médicos" para solicitar vínculo.
                  </p>
                )}
              </div>

              {medicoSelecionadoReferral && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (!user || !medicoSelecionadoReferral || !personalTrainer) return;
                      
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
                      const slugPersonal = gerarSlug(personalTrainer.nome);
                      
                      const link = buildOrganizacaoPublicUrl(`/dr/${slugMedico}/${slugPersonal}`);
                      setLinkReferralGerado(link);
                      setLinkCopiado(false);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
                        <p className="text-sm text-blue-600 text-center">Link copiado para a área de transferência!</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
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
                      // Lógica para desktop (se houver)
                      setNovaPrescricaoModal({ nome, descricao: '', itens: [], observacoes: '' });
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
              {/* Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Prescrições - {pacientePrescricoesSelecionado.nome}
                    </h3>
                  </div>
                  <button onClick={() => setShowModalPrescricoes(false)} className="text-gray-400 hover:text-gray-500">
                    <X size={24} />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setNovaPrescricaoContexto('mobile');
                      setShowModalGrupoNovaPrescricao(true);
                    }}
                    className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Nova Prescrição
                  </button>
                  <button
                    onClick={() => pacientePrescricoesSelecionado && loadPrescricoesModal(pacientePrescricoesSelecionado)}
                    className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Atualizar
                  </button>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 flex-shrink-0 bg-gray-50">
                <button
                  onClick={() => setAbaPrescricoesModal('salvas')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    abaPrescricoesModal === 'salvas'
                      ? 'border-b-2 border-purple-500 text-purple-700 bg-white'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Prescrições Salvas
                </button>
                <button
                  onClick={() => setAbaPrescricoesModal('descricao')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
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
                {loadingPrescricoesModal ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando prescrições...</p>
                  </div>
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
                              setPrescricaoEditandoModal(paraEditar);
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
                                const data: Omit<Prescricao, 'id'> | Prescricao = prescricaoEditandoModal && !prescricaoEditandoModal.isTemplate && !isTemp
                                  ? { ...prescricaoEditandoModal, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, atualizadoEm: new Date() }
                                  : { medicoId: personalTrainer.userId, pacienteId: pacientePrescricoesSelecionado.id, pacienteNome: pacientePrescricoesSelecionado.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, criadoEm: new Date(), atualizadoEm: new Date(), criadoPor: user?.email || '', isTemplate: false, pesoPaciente: peso ?? undefined };
                                const id = await PrescricaoService.createOrUpdatePrescricao(data);
                                if (isTemp) setPrescricoesModal(prev => prev.filter(x => x.id !== 'temp-new'));
                                await loadPrescricoesModal(pacientePrescricoesSelecionado);
                                if (id) {
                                  const [tpl, prescricoes] = await Promise.all([PrescricaoService.getPrescricoesTemplate(), PrescricaoService.getPrescricoesByMedico(personalTrainer.userId)]);
                                  const todas = [...tpl, ...prescricoes.filter(x => !x.pacienteId || x.pacienteId === pacientePrescricoesSelecionado.id)];
                                  const salva = todas.find(x => x.id === id);
                                  if (salva) {
                                    setPrescricaoSelecionadaModal(salva);
                                    setPrescricaoEditandoModal(salva);
                                    setNovaPrescricaoModal({ nome: salva.nome, descricao: salva.descricao || '', itens: salva.itens || [], observacoes: salva.observacoes || '' });
                                  }
                                }
                                alert(isTemp || !prescricaoEditandoModal ? 'Prescrição criada!' : 'Prescrição atualizada!');
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
          {/* Backdrop desktop: clicar fecha */}
          <div className="hidden lg:block fixed inset-0 bg-gray-500/75" onClick={() => setShowModalNutricao(false)} aria-hidden="true" />
          {/* Mobile: painel ocupa 100% do container (até o menu); desktop: caixa centralizada */}
          <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden lg:flex-none lg:max-w-4xl lg:w-full lg:max-h-[90vh] lg:rounded-lg lg:shadow-xl lg:relative lg:z-10">
              {/* Header */}
              <div className="bg-white px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UtensilsCrossed className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Nutrologia - {pacienteNutricaoSelecionado.nome}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowModalNutricao(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-2 sm:gap-4 mt-4 border-b border-gray-200 overflow-x-auto">
                  <button
                    onClick={() => setActiveTabNutricao('plano')}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTabNutricao === 'plano'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Plano Nutricional
                  </button>
                  <button
                    onClick={() => setActiveTabNutricao('checkins')}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTabNutricao === 'checkins'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Check-ins ({checkinsNutricao.length})
                  </button>
                  <button
                    onClick={() => setActiveTabNutricao('estatisticas')}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTabNutricao === 'estatisticas'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Estatísticas
                  </button>
                  <button
                    onClick={() => setActiveTabNutricao('chatnutri')}
                    className={`hidden lg:flex px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap items-center gap-1 ${
                      activeTabNutricao === 'chatnutri'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <MessageSquare size={16} />
                    Conversas
                  </button>
                </div>
              </div>
              
              {/* Content — mobile: preenche a página (flex-1); desktop: max-h 70vh */}
              <div className="bg-white px-4 sm:px-6 py-4 flex-1 min-h-0 overflow-y-auto lg:max-h-[70vh]">
                {loadingNutricao ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Carregando dados de nutrição...</span>
                  </div>
                ) : (
                  activeTabNutricao === 'plano' ? (
                    planoNutricionalModal ? (
                    <div className="space-y-6">
                      {/* Título e Data */}
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <UtensilsCrossed className="h-5 w-5 text-green-600" />
                          Plano Nutricional Personalizado
                        </h2>
                        {planoNutricionalModal.criadoEm && (
                          <p className="text-gray-600 text-sm">
                            Criado em {(() => {
                              const data = planoNutricionalModal.criadoEm?.toDate 
                                ? planoNutricionalModal.criadoEm.toDate() 
                                : new Date(planoNutricionalModal.criadoEm);
                              return data.toLocaleDateString('pt-BR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              });
                            })()}
                          </p>
                        )}
                      </div>
                      
                      {/* Hipótese Comportamental (Mini Parecer Nutro) */}
                      {planoNutricionalModal.hipoteseComportamental && (
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Brain className="h-5 w-5 text-purple-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Hipótese Comportamental</h3>
                          </div>
                          <p className="text-gray-700 leading-relaxed italic whitespace-pre-wrap">
                            {planoNutricionalModal.hipoteseComportamental}
                          </p>
                        </div>
                      )}
                      
                      {/* Cards de Métricas Principais */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Estilo Alimentar */}
                        {planoNutricionalModal.estilo && (
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <UtensilsCrossed className="h-5 w-5 text-green-600" />
                              <h3 className="text-sm font-medium text-gray-700">Estilo Alimentar</h3>
                            </div>
                            <p className="text-xl font-bold text-green-700 capitalize mb-2">
                              {planoNutricionalModal.estilo.replace('_', ' ')}
                            </p>
                            {planoNutricionalModal.descricaoEstilo && (
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {planoNutricionalModal.descricaoEstilo}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Meta de Proteína */}
                        {planoNutricionalModal.protDia_g && (
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <Activity className="h-5 w-5 text-blue-600" />
                              <h3 className="text-sm font-medium text-gray-700">Meta de Proteína</h3>
                            </div>
                            <p className="text-2xl font-bold text-blue-700 mb-1">
                              {planoNutricionalModal.protDia_g} g/dia
                            </p>
                            <p className="text-xs text-gray-600">
                              Meta diária aproximada de proteína total
                            </p>
                          </div>
                        )}
                        
                        {/* Meta de Água */}
                        {planoNutricionalModal.aguaDia_ml && (
                          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border border-cyan-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <Droplet className="h-5 w-5 text-cyan-600" />
                              <h3 className="text-sm font-medium text-gray-700">Meta de Água</h3>
                            </div>
                            <p className="text-2xl font-bold text-cyan-700 mb-1">
                              {Math.round(planoNutricionalModal.aguaDia_ml / 1000)}L/dia
                            </p>
                            <p className="text-xs text-gray-600">
                              Equivalente a {Math.round(planoNutricionalModal.aguaDia_ml / 250)} copos por dia
                            </p>
                          </div>
                        )}
                        
                        {/* Refeições */}
                        {planoNutricionalModal.refeicoes && (
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <Clock className="h-5 w-5 text-purple-600" />
                              <h3 className="text-sm font-medium text-gray-700">Refeições</h3>
                            </div>
                            <p className="text-2xl font-bold text-purple-700 mb-1">
                              {planoNutricionalModal.refeicoes} refeições
                            </p>
                            <p className="text-xs text-gray-600">
                              Distribuídas ao longo do dia
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Distribuição de Proteína */}
                      {planoNutricionalModal.distribuicaoProteina && (
                        <div className="space-y-4">
                          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                            Distribuição de Proteína por Refeição
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {Object.entries(planoNutricionalModal.distribuicaoProteina).map(([refeicao, valor]) => {
                              const refeicaoLabels: Record<string, { label: string; icon: any; bgClass: string; borderClass: string; iconClass: string }> = {
                                cafe: { label: 'Café da Manhã', icon: Coffee, bgClass: 'from-green-50 to-green-100 border-green-200', borderClass: 'border-green-200', iconClass: 'text-green-700' },
                                lanche1: { label: 'Lanche 1', icon: Sun, bgClass: 'from-blue-50 to-blue-100 border-blue-200', borderClass: 'border-blue-200', iconClass: 'text-blue-700' },
                                almoco: { label: 'Almoço', icon: Sunset, bgClass: 'from-orange-50 to-orange-100 border-orange-200', borderClass: 'border-orange-200', iconClass: 'text-orange-700' },
                                lanche2: { label: 'Lanche 2', icon: Sun, bgClass: 'from-purple-50 to-purple-100 border-purple-200', borderClass: 'border-purple-200', iconClass: 'text-purple-700' },
                                jantar: { label: 'Jantar', icon: Moon, bgClass: 'from-indigo-50 to-indigo-100 border-indigo-200', borderClass: 'border-indigo-200', iconClass: 'text-indigo-700' }
                              };
                              const refeicaoInfo = refeicaoLabels[refeicao] || { 
                                label: refeicao, 
                                icon: UtensilsCrossed, 
                                bgClass: 'from-gray-50 to-gray-100 border-gray-200', 
                                borderClass: 'border-gray-200', 
                                iconClass: 'text-gray-700' 
                              };
                              const IconComponent = refeicaoInfo.icon;
                              
                              return (
                                <div key={refeicao} className={`p-4 bg-gradient-to-br ${refeicaoInfo.bgClass} rounded-lg border ${refeicaoInfo.borderClass}`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <IconComponent className={`h-4 w-4 ${refeicaoInfo.iconClass}`} />
                                    <p className="text-sm font-semibold text-gray-700">{refeicaoInfo.label}</p>
                                  </div>
                                  <p className="text-lg font-bold text-gray-900">{valor as string}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Modelo do Dia */}
                      {planoNutricionalModal.modeloDia && (
                        <div className="space-y-4">
                          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                            Modelo de Dia - Sugestões de Refeições
                          </h2>
                          <div className="space-y-4">
                            {Object.entries(planoNutricionalModal.modeloDia).map(([refeicao, descricao]) => {
                              const refeicaoStyles: Record<string, { label: string; icon: any; gradient: string; border: string }> = {
                                cafe: { 
                                  label: 'Café da Manhã', 
                                  icon: Coffee, 
                                  gradient: 'from-amber-50 to-orange-50', 
                                  border: 'border-amber-500' 
                                },
                                lanche1: { 
                                  label: 'Lanche da Manhã', 
                                  icon: Sun, 
                                  gradient: 'from-blue-50 to-cyan-50', 
                                  border: 'border-blue-500' 
                                },
                                almoco: { 
                                  label: 'Almoço', 
                                  icon: Sunset, 
                                  gradient: 'from-orange-50 to-red-50', 
                                  border: 'border-orange-500' 
                                },
                                lanche2: { 
                                  label: 'Lanche da Tarde', 
                                  icon: Sun, 
                                  gradient: 'from-purple-50 to-pink-50', 
                                  border: 'border-purple-500' 
                                },
                                jantar: { 
                                  label: 'Jantar', 
                                  icon: Moon, 
                                  gradient: 'from-indigo-50 to-blue-50', 
                                  border: 'border-indigo-500' 
                                }
                              };
                              const refeicaoInfo = refeicaoStyles[refeicao] || { 
                                label: refeicao, 
                                icon: UtensilsCrossed, 
                                gradient: 'from-gray-50 to-gray-100', 
                                border: 'border-gray-500' 
                              };
                              const IconComponent = refeicaoInfo.icon;
                              
                              const iconColorClass = refeicao === 'cafe' ? 'text-amber-700' :
                                    refeicao === 'lanche1' ? 'text-blue-700' :
                                    refeicao === 'almoco' ? 'text-orange-700' :
                                    refeicao === 'lanche2' ? 'text-purple-700' :
                                    'text-indigo-700';
                              
                              return (
                                <div key={refeicao} className={`w-full text-left p-5 bg-gradient-to-r ${refeicaoInfo.gradient} rounded-lg border-l-4 ${refeicaoInfo.border}`}>
                                  <div className="flex items-center gap-3 mb-2">
                                    <IconComponent className={`h-5 w-5 ${iconColorClass}`} />
                                    <h4 className="font-semibold text-gray-900">{refeicaoInfo.label}</h4>
                                  </div>
                                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{descricao as string}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Alimentos a Evitar */}
                      {planoNutricionalModal.evitar && planoNutricionalModal.evitar.length > 0 && (
                        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Alimentos a Evitar</h3>
                          </div>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                            {planoNutricionalModal.evitar.map((item: string, index: number) => (
                              <li key={index} className="leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Suplementos */}
                      {planoNutricionalModal.suplementos && (
                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <Pill className="h-5 w-5 text-amber-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Suplementos</h3>
                          </div>
                          <div className="space-y-3">
                            {planoNutricionalModal.suplementos.probiotico && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Probiótico</p>
                                <p className="text-sm text-gray-600">{planoNutricionalModal.suplementos.probiotico}</p>
                              </div>
                            )}
                            {planoNutricionalModal.suplementos.whey && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Whey Protein</p>
                                <p className="text-sm text-gray-600">{planoNutricionalModal.suplementos.whey}</p>
                              </div>
                            )}
                            {planoNutricionalModal.suplementos.creatina && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Creatina</p>
                                <p className="text-sm text-gray-600">{planoNutricionalModal.suplementos.creatina}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <UtensilsCrossed className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum plano nutricional encontrado</h3>
                      <p className="text-gray-500">O paciente ainda não preencheu as informações de nutrição.</p>
                    </div>
                  )
                ) : activeTabNutricao === 'checkins' ? (
                  (() => {
                    // Função helper para formatar datas
                    const getDataFormatada = (data: any): Date => {
                      try {
                        if (data?.toDate) return data.toDate();
                        if (typeof data === 'string') {
                          if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            const [year, month, day] = data.split('-').map(Number);
                            return new Date(year, month - 1, day);
                          }
                          return new Date(data);
                        }
                        if (data instanceof Date) return new Date(data);
                        return new Date(data);
                      } catch {
                        return new Date();
                      }
                    };

                    // Criar mapa de check-ins por data (YYYY-MM-DD)
                    const checkInsPorData: Record<string, any> = {};
                    checkinsNutricao.forEach((checkin) => {
                      const dataStr = checkin.data || checkin.id;
                      if (dataStr) {
                        const data = getDataFormatada(dataStr);
                        const dataKey = data.toISOString().split('T')[0];
                        checkInsPorData[dataKey] = checkin;
                      }
                    });

                    // Função para gerar dias do calendário
                    const gerarDiasCalendario = () => {
                      const ano = mesCalendarioCheckIns.getFullYear();
                      const mes = mesCalendarioCheckIns.getMonth();
                      const primeiroDia = new Date(ano, mes, 1);
                      const ultimoDia = new Date(ano, mes + 1, 0);
                      const diaSemanaInicio = primeiroDia.getDay();
                      const diasNoMes = ultimoDia.getDate();
                      
                      const dias: Array<{ dia: number; data: Date; temCheckIn: boolean; checkIn: any | null }> = [];
                      
                      for (let i = 0; i < diaSemanaInicio; i++) {
                        dias.push({ dia: 0, data: new Date(), temCheckIn: false, checkIn: null });
                      }
                      
                      for (let dia = 1; dia <= diasNoMes; dia++) {
                        const data = new Date(ano, mes, dia);
                        const dataKey = data.toISOString().split('T')[0];
                        const checkIn = checkInsPorData[dataKey] || null;
                        dias.push({
                          dia,
                          data,
                          temCheckIn: !!checkIn,
                          checkIn
                        });
                      }
                      
                      return dias;
                    };

                    const diasCalendario = gerarDiasCalendario();
                    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                    const nomesDiasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

                    return (
                      <div className="space-y-4">
                        {/* Calendário */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              onClick={() => {
                                const novoMes = new Date(mesCalendarioCheckIns);
                                novoMes.setMonth(novoMes.getMonth() - 1);
                                setMesCalendarioCheckIns(novoMes);
                                setCheckInSelecionado(null);
                              }}
                              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                            >
                              <ChevronLeft size={20} className="text-gray-600" />
                            </button>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {nomesMeses[mesCalendarioCheckIns.getMonth()]} {mesCalendarioCheckIns.getFullYear()}
                            </h3>
                            <button
                              onClick={() => {
                                const novoMes = new Date(mesCalendarioCheckIns);
                                novoMes.setMonth(novoMes.getMonth() + 1);
                                setMesCalendarioCheckIns(novoMes);
                                setCheckInSelecionado(null);
                              }}
                              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                            >
                              <ChevronRight size={20} className="text-gray-600" />
                            </button>
                          </div>

                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {nomesDiasSemana.map((dia) => (
                              <div key={dia} className="text-center text-xs font-medium text-gray-600 py-2">
                                {dia}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {diasCalendario.map((item, index) => {
                              if (item.dia === 0) {
                                return <div key={`empty-${index}`} className="aspect-square"></div>;
                              }

                              const dataKey = item.data.toISOString().split('T')[0];
                              const checkIn = item.checkIn;
                              const score = checkIn?.score;
                              
                              const getCorScore = (score: number | undefined) => {
                                if (score === undefined) return 'bg-gray-100 text-gray-400';
                                if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
                                if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                                return 'bg-red-100 text-red-800 border-red-300';
                              };

                              return (
                                <button
                                  key={dataKey}
                                  onClick={() => {
                                    if (checkIn) {
                                      setCheckInSelecionado(checkInSelecionado?.data === checkIn.data || checkInSelecionado?.id === checkIn.id ? null : checkIn);
                                    }
                                  }}
                                  className={`aspect-square p-1 rounded-md border-2 transition-all ${
                                    checkIn
                                      ? `${getCorScore(score)} cursor-pointer hover:opacity-80 ${
                                          checkInSelecionado?.data === checkIn.data || checkInSelecionado?.id === checkIn.id
                                            ? 'ring-2 ring-blue-500 ring-offset-2'
                                            : ''
                                        }`
                                      : 'bg-gray-50 text-gray-400 border-gray-200 cursor-default'
                                  }`}
                                >
                                  <div className="text-xs font-medium">{item.dia}</div>
                                  {checkIn && score !== undefined && (
                                    <div className="text-[10px] font-bold mt-0.5">
                                      {Math.round(score)}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Detalhes do Check-in Selecionado */}
                        {checkInSelecionado && (
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900">
                                {(() => {
                                  const data = getDataFormatada(checkInSelecionado.data || checkInSelecionado.id);
                                  return data.toLocaleDateString('pt-BR', { 
                                    day: '2-digit', 
                                    month: 'long', 
                                    year: 'numeric' 
                                  });
                                })()}
                              </h4>
                              {checkInSelecionado.score !== undefined && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  checkInSelecionado.score >= 80 ? 'bg-green-100 text-green-800' :
                                  checkInSelecionado.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  Score: {checkInSelecionado.score}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <h5 className="font-medium text-gray-900 mb-2">Alimentação</h5>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {checkInSelecionado.proteinaOk ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                    <span className="text-gray-700">Proteína</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {checkInSelecionado.frutasOk ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                    <span className="text-gray-700">Frutas</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {checkInSelecionado.aguaOk ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                    <span className="text-gray-700">Água</span>
                                  </div>
                                  {checkInSelecionado.lixoAlimentar !== undefined && (
                                    <div className="flex items-center gap-2">
                                      {!checkInSelecionado.lixoAlimentar ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                      <span className="text-gray-700">Sem lixo alimentar</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {(checkInSelecionado.probioticoTomou !== undefined || checkInSelecionado.wheyTomou !== undefined || checkInSelecionado.creatinaTomou !== undefined) && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">Suplementos</h5>
                                  <div className="space-y-1">
                                    {checkInSelecionado.probioticoTomou !== undefined && (
                                      <div className="flex items-center gap-2">
                                        {checkInSelecionado.probioticoTomou ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                        <span className="text-gray-700">Probiótico</span>
                                      </div>
                                    )}
                                    {checkInSelecionado.wheyTomou !== undefined && (
                                      <div className="flex items-center gap-2">
                                        {checkInSelecionado.wheyTomou ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                        <span className="text-gray-700">Whey</span>
                                      </div>
                                    )}
                                    {checkInSelecionado.creatinaTomou !== undefined && (
                                      <div className="flex items-center gap-2">
                                        {checkInSelecionado.creatinaTomou ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                        <span className="text-gray-700">Creatina</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {checkInSelecionado.sintomasGI && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">Sintomas GI</h5>
                                  <p className="text-gray-700 capitalize">{checkInSelecionado.sintomasGI}</p>
                                </div>
                              )}
                              
                              {checkInSelecionado.horasSono && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">Sono</h5>
                                  <p className="text-gray-700">{checkInSelecionado.horasSono}</p>
                                </div>
                              )}
                              
                              {checkInSelecionado.atividadeFisicaHoje && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">Atividade Física</h5>
                                  <p className="text-gray-700 capitalize">{checkInSelecionado.atividadeFisicaHoje}</p>
                                </div>
                              )}
                              
                              {checkInSelecionado.humorEnergia !== undefined && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">Humor/Energia</h5>
                                  <p className="text-gray-700">{checkInSelecionado.humorEnergia}/5</p>
                                </div>
                              )}
                            </div>
                            
                            {checkInSelecionado.observacoes && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Observações: </span>
                                  {checkInSelecionado.observacoes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {checkinsNutricao.length === 0 && (
                          <div className="text-center py-12">
                            <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                            <p className="text-gray-500">Nenhum check-in encontrado.</p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : activeTabNutricao === 'estatisticas' ? (
                  (() => {
                    if (checkinsNutricao.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <p className="text-gray-500">Nenhum check-in encontrado para calcular estatísticas.</p>
                        </div>
                      );
                    }

                    const getDataFormatada = (data: any): Date => {
                      try {
                        if (data?.toDate) return data.toDate();
                        if (typeof data === 'string') return new Date(data);
                        if (data instanceof Date) return new Date(data);
                        return new Date(data);
                      } catch {
                        return new Date();
                      }
                    };
                    
                    const checkInsOrdenados = [...checkinsNutricao].sort((a, b) => {
                      const dataA = getDataFormatada(a.data || a.id);
                      const dataB = getDataFormatada(b.data || b.id);
                      return dataA.getTime() - dataB.getTime();
                    });

                    const totalCheckIns = checkInsOrdenados.length;
                    const scores = checkInsOrdenados.map((ci: any) => ci.score || 0);
                    const mediaScore = totalCheckIns > 0 ? scores.reduce((a, b) => a + b, 0) / totalCheckIns : 0;
                    const checkInsDentro = scores.filter(s => s >= 80).length;
                    const checkInsFora = scores.filter(s => s < 80).length;
                    const taxaAderencia = totalCheckIns > 0 ? Math.round((checkInsDentro / totalCheckIns) * 100) : 0;
                    
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    
                    let dataInicioTratamento: Date | null = null;
                    if (pacienteNutricaoSelecionado?.planoTerapeutico?.startDate) {
                      const startDate = pacienteNutricaoSelecionado.planoTerapeutico.startDate;
                      if (startDate instanceof Date) {
                        dataInicioTratamento = new Date(startDate);
                      } else if (startDate?.toDate) {
                        dataInicioTratamento = startDate.toDate();
                      } else {
                        dataInicioTratamento = new Date(startDate);
                      }
                      dataInicioTratamento.setHours(0, 0, 0, 0);
                    } else if (pacienteNutricaoSelecionado?.planoTerapeutico?.dataInicioTratamento) {
                      const dataInicio = pacienteNutricaoSelecionado.planoTerapeutico.dataInicioTratamento;
                      if (dataInicio instanceof Date) {
                        dataInicioTratamento = new Date(dataInicio);
                      } else if (dataInicio?.toDate) {
                        dataInicioTratamento = dataInicio.toDate();
                      } else {
                        dataInicioTratamento = new Date(dataInicio);
                      }
                      dataInicioTratamento.setHours(0, 0, 0, 0);
                    } else if (checkInsOrdenados.length > 0) {
                      dataInicioTratamento = getDataFormatada(checkInsOrdenados[0].data || checkInsOrdenados[0].id);
                      dataInicioTratamento.setHours(0, 0, 0, 0);
                    }
                    
                    let frequenciaPreenchimento = 0;
                    let diasDesdeInicio = 0;
                    
                    if (dataInicioTratamento) {
                      diasDesdeInicio = Math.ceil((hoje.getTime() - dataInicioTratamento.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      
                      const checkInsDistintos = new Set(
                        checkInsOrdenados.map((ci: any) => {
                          const data = getDataFormatada(ci.data || ci.id);
                          data.setHours(0, 0, 0, 0);
                          return data.getTime();
                        })
                      );
                      
                      const totalCheckInsDistintos = checkInsDistintos.size;
                      frequenciaPreenchimento = diasDesdeInicio > 0 ? Math.round((totalCheckInsDistintos / diasDesdeInicio) * 100) : 0;
                    } else {
                      diasDesdeInicio = checkInsOrdenados.length;
                      frequenciaPreenchimento = 100;
                    }

                    return (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 sm:p-6 border border-purple-200">
                          <h5 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                            Dashboard de Aderência Nutricional
                          </h5>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div className="bg-white rounded-lg p-3 sm:p-4 border border-purple-100 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">Média de Pontuação</span>
                                <Activity className={`w-4 h-4 ${
                                  mediaScore >= 80 ? 'text-green-600' :
                                  mediaScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`} />
                              </div>
                              <p className={`text-xl sm:text-2xl font-bold ${
                                mediaScore >= 80 ? 'text-green-600' :
                                mediaScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {mediaScore.toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">de 100 pontos</p>
                            </div>

                            <div className="bg-white rounded-lg p-3 sm:p-4 border border-purple-100 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">Taxa de Aderência</span>
                                <CheckCircle className={`w-4 h-4 ${
                                  taxaAderencia >= 70 ? 'text-green-600' :
                                  taxaAderencia >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`} />
                              </div>
                              <p className={`text-xl sm:text-2xl font-bold ${
                                taxaAderencia >= 70 ? 'text-green-600' :
                                taxaAderencia >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {taxaAderencia}%
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {checkInsDentro} de {totalCheckIns} check-ins dentro
                              </p>
                            </div>

                            <div className="bg-white rounded-lg p-3 sm:p-4 border border-purple-100 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">Frequência de Preenchimento</span>
                                <Calendar className={`w-4 h-4 ${
                                  frequenciaPreenchimento >= 70 ? 'text-green-600' :
                                  frequenciaPreenchimento >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`} />
                              </div>
                              <p className={`text-xl sm:text-2xl font-bold ${
                                frequenciaPreenchimento >= 70 ? 'text-green-600' :
                                frequenciaPreenchimento >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {frequenciaPreenchimento}%
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {(() => {
                                  const checkInsDistintos = new Set(
                                    checkInsOrdenados.map((ci: any) => {
                                      const data = getDataFormatada(ci.data || ci.id);
                                      data.setHours(0, 0, 0, 0);
                                      return data.getTime();
                                    })
                                  );
                                  return checkInsDistintos.size;
                                })()} check-ins em {diasDesdeInicio} dias
                              </p>
                            </div>

                            <div className="bg-white rounded-lg p-3 sm:p-4 border border-purple-100 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">Status Geral</span>
                                {mediaScore >= 80 && taxaAderencia >= 70 ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : mediaScore >= 60 && taxaAderencia >= 50 ? (
                                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                              </div>
                              <p className={`text-lg sm:text-xl font-bold ${
                                mediaScore >= 80 && taxaAderencia >= 70 ? 'text-green-600' :
                                mediaScore >= 60 && taxaAderencia >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {mediaScore >= 80 && taxaAderencia >= 70 ? 'Dentro' :
                                 mediaScore >= 60 && taxaAderencia >= 50 ? 'Atenção' : 'Fora'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {checkInsDentro} dentro / {checkInsFora} fora
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : activeTabNutricao === 'chatnutri' && pacienteNutricaoSelecionado ? (
                  <div className="hidden lg:block">
                    <NutriContent paciente={pacienteNutricaoSelecionado} modoNutricionista onlyChatNutri />
                  </div>
                ) : null
                )}
              </div>
          </div>
        </div>
      , document.body)}

      {/* Modal de Personal Trainer — mobile: não cobre a barra de menu inferior (bottom-16) */}
      {showModalPersonal && pacientePersonalSelecionado && personalTrainer && (
        <div className="fixed top-0 left-0 right-0 bottom-16 lg:bottom-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-stretch justify-center px-0 py-0 text-center sm:block sm:min-h-screen sm:p-0">
            <div className="fixed inset-0 bottom-16 lg:bottom-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModalPersonal(false)} />
            <div className="fixed top-0 left-0 right-0 bottom-16 lg:inset-0 z-10 flex flex-col overflow-y-auto bg-white sm:static sm:my-8 sm:inline-block sm:max-h-[90vh] sm:w-full sm:max-w-6xl sm:rounded-lg sm:shadow-xl">
              {/* Header — mobile: só "Aluno: nome" + X; desktop: ícone + "Treinos - nome" + X */}
              <div className="flex-shrink-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Dumbbell className="w-6 h-6 text-pink-600 hidden lg:block flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      <span className="lg:hidden">Aluno: {pacientePersonalSelecionado.dadosIdentificacao?.nomeCompleto || pacientePersonalSelecionado.nome || 'Paciente'}</span>
                      <span className="hidden lg:inline">Treinos - {pacientePersonalSelecionado.nome}</span>
                    </h3>
                  </div>
                  <button onClick={() => setShowModalPersonal(false)} className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-500" aria-label="Fechar">
                    <X size={24} />
                  </button>
                </div>
              </div>
              
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
                                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                              <div className="text-center">
                                                <div className="text-xl sm:text-2xl font-bold text-pink-600">
                                                  {exercise.prescription.sets}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1 font-medium">
                                                  Séries
                                                </div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-xl sm:text-2xl font-bold text-pink-600">
                                                  {exercise.prescription.reps}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1 font-medium">
                                                  Repetições
                                                </div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-xl sm:text-2xl font-bold text-pink-600">
                                                  {exercise.prescription.restSec}s
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1 font-medium">
                                                  Descanso
                                                </div>
                                              </div>
                                            </div>
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
                                prescription: {
                                  sets: ex.sets,
                                  reps: ex.reps,
                                  restSec: ex.restSec,
                                },
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
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Séries:</span> {exercise.prescription.sets}
                                </div>
                                <div>
                                  <span className="text-gray-600">Reps:</span> {exercise.prescription.reps}
                                </div>
                                <div>
                                  <span className="text-gray-600">Descanso:</span> {exercise.prescription.restSec}s
                                </div>
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

      {/* Modal Visualizar Paciente (Read-Only) com Abas */}
      {showVisualizarPacienteModal && pacienteVisualizando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Visualizar Paciente</h2>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {pacienteVisualizando.dadosIdentificacao?.nomeCompleto || pacienteVisualizando.nome || 'Paciente'}
                  </p>
                  <div className="mt-2 space-y-2">
                    <div className="bg-yellow-100 border border-yellow-300 rounded-md px-3 py-2">
                      <p className="text-sm text-yellow-800 font-medium">
                        ⚠️ Somente visualização — alterações apenas pelo médico responsável
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Status do Tratamento:</span>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        pacienteVisualizando.statusTratamento === 'em_tratamento'
                          ? 'bg-green-100 text-green-800'
                          : pacienteVisualizando.statusTratamento === 'concluido'
                          ? 'bg-blue-100 text-blue-800'
                          : pacienteVisualizando.statusTratamento === 'abandono'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {pacienteVisualizando.statusTratamento === 'pendente' ? 'Pendente' :
                         pacienteVisualizando.statusTratamento === 'em_tratamento' ? 'Em Tratamento' :
                         pacienteVisualizando.statusTratamento === 'concluido' ? 'Concluído' :
                         pacienteVisualizando.statusTratamento === 'abandono' ? 'Abandono' :
                         'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowVisualizarPacienteModal(false);
                    setPacienteVisualizando(null);
                    setPastaAtiva(1);
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs das 2 Pastas */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {[
                { id: 1, nome: 'Dados de Identificação' },
                { id: 2, nome: 'Dados Clínicos' }
              ].map((pasta) => (
                <button
                  key={pasta.id}
                  onClick={() => setPastaAtiva(pasta.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    pastaAtiva === pasta.id
                      ? 'border-green-500 text-green-700 bg-green-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {pasta.nome}
                </button>
              ))}
            </div>

            {/* Conteúdo da Pasta Ativa */}
            <div className="flex-1 overflow-y-auto p-6">
              {pastaAtiva === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados de Identificação</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.nomeCompleto || pacienteVisualizando.nome || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.email || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.telefone || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.cpf || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.dataNascimento
                          ? (() => {
                              try {
                                const d = new Date(pacienteVisualizando.dadosIdentificacao.dataNascimento);
                                if (!isNaN(d.getTime())) {
                                  return d.toLocaleDateString('pt-BR');
                                }
                              } catch {}
                              return 'N/A';
                            })()
                          : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sexo Biológico</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.sexoBiologico === 'M' ? 'Masculino' :
                         pacienteVisualizando.dadosIdentificacao?.sexoBiologico === 'F' ? 'Feminino' :
                         pacienteVisualizando.dadosIdentificacao?.sexoBiologico === 'Outro' ? 'Outro' :
                         'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.endereco?.cep || 'N/A'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Endereço (Rua)</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.endereco?.rua || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.endereco?.cidade || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosIdentificacao?.endereco?.estado || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data de Cadastro</label>
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dataCadastro
                          ? (() => {
                              try {
                                const d = new Date(pacienteVisualizando.dataCadastro);
                                if (!isNaN(d.getTime())) {
                                  return d.toLocaleDateString('pt-BR');
                                }
                              } catch {}
                              return 'N/A';
                            })()
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pastaAtiva === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Clínicos da Anamnese</h3>
                  
                  {/* 2.1 Medidas Iniciais */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.1 Medidas Iniciais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                        <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                          {pacienteVisualizando.dadosClinicos?.medidasIniciais?.peso ? pacienteVisualizando.dadosClinicos.medidasIniciais.peso.toFixed(1) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label>
                        <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                          {pacienteVisualizando.dadosClinicos?.medidasIniciais?.altura || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">IMC (kg/m²)</label>
                        <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                          {pacienteVisualizando.dadosClinicos?.medidasIniciais?.imc ? pacienteVisualizando.dadosClinicos.medidasIniciais.imc.toFixed(2) : 'N/A'}
                        </div>
                        {pacienteVisualizando.dadosClinicos?.medidasIniciais?.imc && (
                          <p className={`mt-2 text-sm ${getCorGrauObesidade(calcularGrauObesidade(pacienteVisualizando.dadosClinicos.medidasIniciais.imc))}`}>
                            <strong>Grau de Obesidade:</strong> {calcularGrauObesidade(pacienteVisualizando.dadosClinicos.medidasIniciais.imc)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Circunf. Abdominal (cm)</label>
                        <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                          {pacienteVisualizando.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2.2 Diagnóstico Principal */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.2 Diagnóstico Principal</h4>
                    <div className="space-y-2">
                      <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                        {pacienteVisualizando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'dm2' ? 'Diabetes mellitus tipo 2 (DM2)' :
                         pacienteVisualizando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'obesidade' ? 'Obesidade (IMC ≥ 30)' :
                         pacienteVisualizando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'sobrepeso_comorbidade' ? 'Sobrepeso com comorbidade (IMC 27-29,9 + comorbidade)' :
                         pacienteVisualizando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'pre_diabetes' ? 'Pré-diabetes (IFG/ITG)' :
                         pacienteVisualizando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'resistencia_insulinica' ? 'Resistência insulínica/Síndrome metabólica' :
                         pacienteVisualizando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'sop_ri' ? 'Síndrome dos ovários policísticos (SOP) com RI' :
                         pacienteVisualizando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'ehna_sem_dm2' ? 'Esteatose hepática não alcoólica (EHNA) sem DM2' :
                         pacienteVisualizando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'outro' ? `Outro: ${pacienteVisualizando.dadosClinicos.diagnosticoPrincipal.outro || ''}` :
                         'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* 2.3 Comorbidades Associadas */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.3 Comorbidades Associadas</h4>
                    <div className="space-y-2">
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.hipertensaoArterial && (
                        <div className="text-sm text-gray-900">✓ Hipertensão arterial (HAS)</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.dislipidemia && (
                        <div className="text-sm text-gray-900">✓ Dislipidemia (DLP)</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.apneiaObstrutivaSono && (
                        <div className="text-sm text-gray-900">✓ Apneia obstrutiva do sono (AOS)</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.esteatoseEHNA && (
                        <div className="text-sm text-gray-900">✓ Esteatose/EHNA</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.doencaCardiovascular && (
                        <div className="text-sm text-gray-900">✓ Doença cardiovascular (ex.: DAC, IC, AVE prévio)</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.doencaRenalCronica && (
                        <div className="text-sm text-gray-900">✓ Doença renal crônica (DRC)</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.sop && (
                        <div className="text-sm text-gray-900">✓ SOP</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.hipotireoidismo && (
                        <div className="text-sm text-gray-900">✓ Hipotireoidismo</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.asmaDPOC && (
                        <div className="text-sm text-gray-900">✓ Asma/DPOC</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.transtornoAnsiedadeDepressao && (
                        <div className="text-sm text-gray-900">✓ Transtorno de ansiedade/depressão</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.nenhuma && (
                        <div className="text-sm text-gray-900">✓ Nenhuma</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.comorbidades?.outra && (
                        <div className="text-sm text-gray-900">✓ Outra: {pacienteVisualizando.dadosClinicos.comorbidades.outraDescricao || ''}</div>
                      )}
                      {(!pacienteVisualizando.dadosClinicos?.comorbidades ||
                        (!pacienteVisualizando.dadosClinicos.comorbidades.hipertensaoArterial &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.dislipidemia &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.apneiaObstrutivaSono &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.esteatoseEHNA &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.doencaCardiovascular &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.doencaRenalCronica &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.sop &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.hipotireoidismo &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.asmaDPOC &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.transtornoAnsiedadeDepressao &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.nenhuma &&
                         !pacienteVisualizando.dadosClinicos.comorbidades.outra)) && (
                        <div className="text-sm text-gray-500">Nenhuma comorbidade registrada</div>
                      )}
                    </div>
                  </div>

                  {/* 2.4 Medicações em uso atual */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.4 Medicações em uso atual</h4>
                    {pacienteVisualizando.dadosClinicos?.medicacoesUsoAtual && pacienteVisualizando.dadosClinicos.medicacoesUsoAtual.length > 0 ? (
                      <div className="space-y-2">
                        {pacienteVisualizando.dadosClinicos.medicacoesUsoAtual.map((med, index) => (
                          <div key={index} className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-md p-3">
                            <div><strong>Categoria:</strong> {
                              med.categoria === 'metformina' ? 'Metformina' :
                              med.categoria === 'sglt2i' ? 'SGLT2i (dapagliflozina/empagliflozina)' :
                              med.categoria === 'insulina' ? 'Insulina basal/bolus' :
                              med.categoria === 'statina' ? 'Estatina' :
                              med.categoria === 'anti_hipertensivo' ? 'Anti-hipertensivo (IECA/BRA, BCC, tiazídico)' :
                              med.categoria === 'antidepressivo' ? 'Antidepressivo/ansiolítico' :
                              med.categoria === 'outro' ? 'Outro' : med.categoria
                            }</div>
                            {med.nomeFarmaco && <div><strong>Nome:</strong> {med.nomeFarmaco}</div>}
                            {med.dose && <div><strong>Dose:</strong> {med.dose}</div>}
                            {med.frequencia && <div><strong>Frequência:</strong> {med.frequencia}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Nenhuma medicação registrada</div>
                    )}
                  </div>

                  {/* 2.5 Alergias */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.5 Alergias</h4>
                    <div className="space-y-2">
                      {pacienteVisualizando.dadosClinicos?.alergias?.semAlergias && (
                        <div className="text-sm text-gray-900">✓ Sem alergias conhecidas</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.alergias?.medicamentosa && (
                        <div className="text-sm text-gray-900">
                          ✓ Medicamentosa: {pacienteVisualizando.dadosClinicos.alergias.medicamentosa.farmaco || ''} 
                          {pacienteVisualizando.dadosClinicos.alergias.medicamentosa.reacao && ` - Reação: ${pacienteVisualizando.dadosClinicos.alergias.medicamentosa.reacao}`}
                        </div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.alergias?.alimento !== undefined && pacienteVisualizando.dadosClinicos.alergias.alimento && (
                        <div className="text-sm text-gray-900">✓ Alimento: {pacienteVisualizando.dadosClinicos.alergias.alimento}</div>
                      )}
                      {pacienteVisualizando.dadosClinicos?.alergias?.latexAdesivo !== undefined && pacienteVisualizando.dadosClinicos.alergias.latexAdesivo && (
                        <div className="text-sm text-gray-900">✓ Látex/adesivo: {pacienteVisualizando.dadosClinicos.alergias.latexAdesivo}</div>
                      )}
                      {(!pacienteVisualizando.dadosClinicos?.alergias ||
                        (!pacienteVisualizando.dadosClinicos.alergias.semAlergias &&
                         !pacienteVisualizando.dadosClinicos.alergias.medicamentosa &&
                         pacienteVisualizando.dadosClinicos.alergias.alimento === undefined &&
                         pacienteVisualizando.dadosClinicos.alergias.latexAdesivo === undefined)) && (
                        <div className="text-sm text-gray-500">Nenhuma alergia registrada</div>
                      )}
                    </div>
                  </div>

                  {/* Observação */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> Esta é uma visualização somente leitura. Para editar informações do paciente, entre em contato com o médico responsável.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gráficos do Paciente */}
      {showGraficosModal && pacienteGraficos && (() => {
        const evolucao = pacienteGraficos?.evolucaoSeguimento || [];
        const planoTerapeutico = pacienteGraficos?.planoTerapeutico;
        const medidasIniciais = pacienteGraficos?.dadosClinicos?.medidasIniciais;
        
        // Preparar dados para gráficos (mesma lógica da página /meta)
        const seguimentoOrdem = evolucao.sort((a, b) => {
          const dateA = new Date(a.dataRegistro);
          const dateB = new Date(b.dataRegistro);
          return dateA.getTime() - dateB.getTime();
        });
        
        const ultimas4Semanas = seguimentoOrdem.slice(-4);
        const primeiroRegistro = seguimentoOrdem.find(e => e.weekIndex === 1);
        const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
        const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
        
        // Calcular curva esperada
        const suggestedSchedule = planoTerapeutico?.doseSchedule || buildSuggestedDoseSchedule({
          startDoseMg: 2.5,
          targetDoseMg: planoTerapeutico?.currentDoseMg || 15,
          weeksToTarget: 4
        });
        
        const expectedCurve = buildExpectedCurveDoseDrivenAnchored({
          baselineWeightKg: baselineWeight,
          doseSchedule: suggestedSchedule,
          totalWeeks: planoTerapeutico?.numeroSemanasTratamento || 18,
          targetType: planoTerapeutico?.metas?.weightLossTargetType,
          targetValue: planoTerapeutico?.metas?.weightLossTargetValue || 0
        });
        
        // Dados para gráfico de peso
        const pesoChartData = ultimas4Semanas.map((s) => {
          const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
          return {
            semana: s.weekIndex,
            previsto: expectedWeek?.expectedWeightKg || null,
            real: s.peso || null
          };
        });
        
        // Dados para gráfico de circunferência abdominal
        const baseCircAbdominal = primeiroRegistro?.circunferenciaAbdominal || medidasIniciais?.circunferenciaAbdominal || 0;
        const circData = ultimas4Semanas.map((s) => {
          const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
          const previsto = expectedWeek?.expectedCumulativePct 
            ? predictWaistCircumference({ 
                baselineWaistCm: baseCircAbdominal, 
                cumulativeWeightLossPct: expectedWeek.expectedCumulativePct 
              })
            : null;
          return {
            semana: s.weekIndex,
            circunferencia: s.circunferenciaAbdominal || null,
            previsto: previsto
          };
        });
        
        // Dados para gráfico de HbA1c
        const metaHba1c = planoTerapeutico?.metas?.hba1cTargetType;
        const metaValue = metaHba1c ? parseFloat(metaHba1c.replace('≤', '')) : null;
        const faixaIdealMin = 4.0;
        const faixaIdealMax = metaValue ? metaValue : 5.6;
        
        const hba1cData = ultimas4Semanas.map((s) => {
          return {
            semana: s.weekIndex,
            hba1c: s.hba1c || null,
            faixaIdealMin: faixaIdealMin,
            faixaIdealMax: faixaIdealMax
          };
        });
        
        // Dados para gráfico de IMC
        const calcularGrauObesidadeLocal = (imc: number | null | undefined): string | null => {
          if (!imc || imc === 0) return null;
          if (imc < 18.5) return 'Abaixo do peso';
          if (imc < 25) return 'Peso normal';
          if (imc < 30) return 'Sobrepeso';
          if (imc < 35) return 'Obesidade Grau I';
          if (imc < 40) return 'Obesidade Grau II';
          return 'Obesidade Grau III';
        };
        
        const imcParaIndiceGrau = (imc: number | null): number | null => {
          if (!imc) return null;
          if (imc < 18.5) return 0;
          if (imc < 25) return 1;
          if (imc < 30) return 2;
          if (imc < 35) return 3;
          if (imc < 40) return 4;
          return 5;
        };
        
        const imcChartData = alturaMetros ? ultimas4Semanas.map((s) => {
          const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
          const imcReal = s.peso && alturaMetros ? s.peso / (alturaMetros * alturaMetros) : null;
          const imcPrevisto = expectedWeek?.expectedWeightKg && alturaMetros 
            ? expectedWeek.expectedWeightKg / (alturaMetros * alturaMetros) 
            : null;
          
          const grauReal = calcularGrauObesidadeLocal(imcReal);
          const grauPrevisto = calcularGrauObesidadeLocal(imcPrevisto);
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
        
        const grausLabels = ['Abaixo do peso', 'Peso normal', 'Sobrepeso', 'Grau I', 'Grau II', 'Grau III'];
        
        // Calcular dados para o card de peso
        const ultimoRegistro = seguimentoOrdem.length > 0 ? seguimentoOrdem[seguimentoOrdem.length - 1] : null;
        const ultimoPeso = ultimoRegistro?.peso || medidasIniciais?.peso || null;
        const imcAtual = alturaMetros && ultimoPeso && ultimoPeso > 0 ? ultimoPeso / (alturaMetros * alturaMetros) : null;
        const imcParaCard = medidasIniciais?.imc || imcAtual;
        const dataUltimaMedicao = ultimoRegistro?.dataRegistro ? new Date(ultimoRegistro.dataRegistro) : null;
        
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
        
        const classificacaoIMC = classificarIMC(imcParaCard);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-900">Gráficos do Paciente - {pacienteGraficos.dadosIdentificacao?.nomeCompleto || pacienteGraficos.nome}</h2>
                <button
                  onClick={() => {
                    setShowGraficosModal(false);
                    setPacienteGraficos(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Card de Status Corporal (Peso com Barra IMC) */}
                {classificacaoIMC && (
                  <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden relative" style={{ borderRadius: '24px' }}>
                    <div className="p-4" style={{ padding: '18px' }}>
                      {/* Topo: Badge pill à esquerda */}
                      <div className="mb-1">
                        <div 
                          className={`${classificacaoIMC.cor} px-3 py-2 rounded-full inline-flex items-center gap-2`} 
                          style={{ 
                            height: '30px',
                            background: classificacaoIMC.bgGradient
                          }}
                        >
                          <span className="text-sm font-medium">{classificacaoIMC.label}</span>
                        </div>
                      </div>
                      
                      {/* Peso em destaque - alinhado à esquerda */}
                      <div className="mb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-gray-900" style={{ fontSize: '52px' }}>
                            {ultimoPeso && ultimoPeso > 0 ? ultimoPeso.toFixed(1) : '--'}
                          </span>
                          {ultimoPeso && ultimoPeso > 0 && (
                            <span className="text-gray-600 font-medium" style={{ fontSize: '20px' }}>Kg</span>
                          )}
                        </div>
                        {dataUltimaMedicao && (
                          <div className="text-gray-400 mt-0.5" style={{ fontSize: '15px' }}>
                            {formatarDataISO(dataUltimaMedicao)}
                          </div>
                        )}
                      </div>

                      {/* Barra de IMC */}
                      {imcParaCard && imcParaCard > 0 && (
                        <div className="mt-4">
                          {/* Valores acima da barra nas transições */}
                          <div className="relative mb-1 h-4">
                            <span className="absolute text-xs text-gray-500" style={{ left: '25%', transform: 'translateX(-50%)' }}>18.5</span>
                            <span className="absolute text-xs text-gray-500" style={{ left: '50%', transform: 'translateX(-50%)' }}>25</span>
                            <span className="absolute text-xs text-gray-500" style={{ left: '75%', transform: 'translateX(-50%)' }}>30</span>
                          </div>
                          
                          {/* Barra horizontal fina com 4 segmentos */}
                          <div 
                            className="relative rounded-full overflow-visible bg-gray-100" 
                            style={{ height: '6px', borderRadius: '999px' }}
                          >
                            {/* Faixa Azul - Baixo peso */}
                            <div className="absolute left-0 top-0 h-full" style={{ width: '25%', backgroundColor: '#60a5fa' }}></div>
                            {/* Faixa Verde - Saudável */}
                            <div className="absolute left-1/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#34d399' }}></div>
                            {/* Faixa Amarela - Alto */}
                            <div className="absolute left-2/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#fbbf24' }}></div>
                            {/* Faixa Vermelha - Obeso */}
                            <div className="absolute left-3/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#f87171' }}></div>
                            
                            {/* Marcador dinâmico com emoji smiley - redondo */}
                            <div 
                              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10"
                              style={{ 
                                left: `${calcularPosicaoMarcador(imcParaCard)}%`,
                                userSelect: 'none'
                              }}
                            >
                              <div className="bg-white border-2 border-gray-400 rounded-full shadow-lg flex items-center justify-center" style={{ width: '24px', height: '24px' }}>
                                <span style={{ fontSize: '14px' }}>{classificacaoIMC.icone}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Labels abaixo da barra */}
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
                    </div>
                  </div>
                )}
                {/* Gráfico de Peso */}
                {baselineWeight > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Peso (últimas 4 semanas)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pesoChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="semana" 
                            label={{ value: 'Semana', position: 'bottom', offset: -5, style: { textAnchor: 'middle' } }}
                          />
                          <YAxis 
                            label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
                            domain={[Math.max(0, baselineWeight - 20), baselineWeight + 20]}
                          />
                          <Tooltip 
                            formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)} kg` : 'N/A'}
                            labelFormatter={(label) => `Semana ${label}`}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} iconSize={12} />
                          <Line 
                            type="monotone" 
                            dataKey="previsto" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            name="Peso previsto"
                            dot={{ fill: '#3b82f6', r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="real" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="Peso real"
                            dot={{ fill: '#10b981', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Gráfico de IMC */}
                {alturaMetros && imcChartData.length > 0 && imcChartData.some(d => d.imc !== null) && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">IMC (últimas 4 semanas)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={imcChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="semana" 
                            label={{ value: 'Semana', position: 'bottom', offset: -5, style: { textAnchor: 'middle' } }}
                          />
                          <YAxis 
                            label={{ value: 'Grau de Obesidade', angle: -90, position: 'insideLeft' }}
                            domain={[0, 5]}
                            tickFormatter={(value) => {
                              const index = Math.round(value);
                              if (index >= 0 && index < grausLabels.length) {
                                return grausLabels[index];
                              }
                              return '';
                            }}
                            width={140}
                            ticks={[0, 1, 2, 3, 4, 5]}
                            allowDecimals={false}
                            interval={0}
                            tickCount={6}
                          />
                          <Tooltip 
                            formatter={(value: any, name: string, props: any) => {
                              if (value === null) return 'N/A';
                              const imcValue = name === 'imc' ? props.payload.imc : props.payload.previsto;
                              const grau = name === 'imc' ? props.payload.grau : props.payload.grauPrevisto;
                              return [
                                `${imcValue ? `${parseFloat(imcValue).toFixed(1)} kg/m² - ${grau || 'N/A'}` : 'N/A'}`,
                                name === 'imc' ? 'IMC Real' : 'IMC Previsto'
                              ];
                            }}
                            labelFormatter={(label) => `Semana ${label}`}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} iconSize={12} />
                          <Line 
                            type="monotone" 
                            dataKey="indiceGrau" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="IMC Real"
                            dot={{ fill: '#10b981', r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="indiceGrauPrevisto" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="IMC Previsto"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Gráfico de HbA1c */}
                {((hba1cData.length > 0 && hba1cData.some(d => d.hba1c !== null)) || metaValue) && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      HbA1c (últimas 4 semanas)
                      {metaValue && <span className="text-sm font-normal text-gray-600 ml-2">(Faixa Ideal: {faixaIdealMin}% - {faixaIdealMax}%)</span>}
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hba1cData}>
                          <defs>
                            <pattern id="hachuraFaixaIdeal" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                              <rect width="4" height="8" fill="#10b981" opacity="0.3"/>
                            </pattern>
                            <linearGradient id="faixaIdeal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="semana" 
                            label={{ value: 'Semana', position: 'bottom', offset: -5, style: { textAnchor: 'middle' } }}
                          />
                          <YAxis 
                            label={{ value: 'HbA1c (%)', angle: -90, position: 'insideLeft' }}
                            domain={(() => {
                              const valuesWithReal = hba1cData.map(d => d.hba1c).filter(v => v !== null) as number[];
                              const allValues = [...valuesWithReal, faixaIdealMin, faixaIdealMax];
                              const minValue = Math.min(...allValues);
                              const maxValue = Math.max(...allValues);
                              const range = maxValue - minValue;
                              return [Math.max(0, minValue - range * 0.2), maxValue + range * 0.2];
                            })()}
                          />
                          <Tooltip 
                            formatter={(value: any, name: string) => {
                              if (name === 'faixaIdeal') return null;
                              return value !== null ? `${parseFloat(value).toFixed(1)}%` : 'N/A';
                            }}
                            labelFormatter={(label) => `Semana ${label}`}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px'
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} iconSize={12} />
                          <Area
                            type="monotone"
                            dataKey="faixaIdealMax"
                            stackId="1"
                            stroke="none"
                            fill="url(#hachuraFaixaIdeal)"
                            fillOpacity={1}
                            hide={true}
                          />
                          <Area
                            type="monotone"
                            dataKey="faixaIdealMin"
                            stackId="1"
                            stroke="none"
                            fill="#ffffff"
                            fillOpacity={1}
                            hide={true}
                          />
                          <Line
                            type="monotone"
                            dataKey="faixaIdealMax"
                            stroke="#10b981"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            dot={false}
                            name={`Faixa Ideal (${faixaIdealMin}% - ${faixaIdealMax}%)`}
                            legendType="line"
                          />
                          <Line
                            type="monotone"
                            dataKey="faixaIdealMin"
                            stroke="#10b981"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            dot={false}
                            legendType="none"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="hba1c" 
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            name="HbA1c Real"
                            dot={{ fill: '#8b5cf6', r: 4 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Gráfico de Circunferência Abdominal */}
                {baseCircAbdominal > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Circunferência Abdominal (últimas 4 semanas)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={circData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="semana" 
                            label={{ value: 'Semana', position: 'bottom', offset: -5, style: { textAnchor: 'middle' } }}
                          />
                          <YAxis 
                            label={{ value: 'Circunferência (cm)', angle: -90, position: 'insideLeft' }}
                            domain={[Math.max(0, baseCircAbdominal - 20), baseCircAbdominal + 20]}
                          />
                          <Tooltip 
                            formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)} cm` : 'N/A'}
                            labelFormatter={(label) => `Semana ${label}`}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} iconSize={12} />
                          <Line 
                            type="monotone" 
                            dataKey="circunferencia" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            name="Circunferência Abdominal"
                            dot={{ fill: '#f59e0b', r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="previsto" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Circunferência Prevista"
                            dot={false}
                            legendType="line"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Bio Impedância - Tela Cheia (mobile: mantém barra de menu inferior) */}
      {showModalBioImpedancia && pacienteBioImpedanciaSelecionado && (
        <div className="fixed top-0 left-0 right-0 bottom-16 lg:bottom-0 bg-white z-[70] flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Bio Impedância</h2>
                <p className="text-sm text-gray-600">Paciente: {pacienteBioImpedanciaSelecionado.nome}</p>
              </div>
              <button
                onClick={() => {
                  setShowModalBioImpedancia(false);
                  setPacienteBioImpedanciaSelecionado(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <X size={24} />
              </button>
            </div>
          </div>
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
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                    Exames Laboratoriais
                  </h2>
                  <p className="text-sm text-gray-600 mb-1">
                    Paciente: {pacienteExamesSelecionado.nome}
                  </p>
                  {/* Seletor de Data */}
                  {examesOrdenados.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Data:</span>
                      <select
                        value={dataSelecionada}
                        onChange={(e) => {
                          setExameDataSelecionada(e.target.value);
                        }}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowModalExames(false);
                        setPacienteExamesSelecionado(null);
                        setExameDataSelecionada('');
                        setSecoesExpandidas(new Set());
                        setExamesExpandidos(new Set());
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
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
                <div className="space-y-1.5 pb-3 text-sm">
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
                      <div key={secao.sectionId} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Cabeçalho da seção */}
                        <button
                          onClick={() => toggleSecao(secaoKey)}
                          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${secaoComExameForaDaFaixa ? 'bg-red-500' : 'bg-green-500'}`}
                              aria-hidden="true"
                            />
                            <h4 className="font-semibold text-black text-left text-sm">
                              {secao.section}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <LabSectionScoreBadge score={sectionScorePersonal.score} color={sectionScorePersonal.color} />
                            {isSecaoExpandida ? (
                              <ChevronUp className="w-4 h-4 text-black" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-black" />
                            )}
                          </div>
                        </button>
                        
                        {/* Conteúdo da seção */}
                        {isSecaoExpandida && (
                          <div className="p-2.5 space-y-2">
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

                              return (
                                <div key={campo.field} className="border border-gray-200 rounded-lg overflow-hidden">
                                  {/* Cabeçalho do exame */}
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
                                      <span className="font-medium text-black text-left text-sm">
                                        {range.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-semibold text-black">
                                        {value || '-'}
                                        {value && range.unit && ` ${range.unit}`}
                                      </div>
                                    </div>
                                  </button>

                                  {/* Barra de range */}
                                  <div className="p-2 bg-white border-t border-gray-200">
                                    <LabRangeBar range={range} value={value || null} />
                                    <LabOptimizationBadge examKey={campo.key} value={value || null} range={range} />
                                  </div>
                                  
                                  {/* Gráfico de evolução */}
                                  {isExameExpandido && (
                                    <div className="p-2 bg-white border-t border-gray-200">
                                      <label className="block text-xs font-medium text-black mb-1.5">
                                        Evolução Temporal
                                      </label>
                                      {dadosGrafico.length > 0 && dadosGrafico.some(d => {
                                        const fieldValue = d[campo.field as keyof typeof d];
                                        return fieldValue !== null && fieldValue !== undefined;
                                      }) ? (
                                        <TrendLine
                                          data={dadosGrafico}
                                          dataKeys={[
                                            { key: campo.field, name: range.label, stroke: '#10b981', dot: true }
                                          ]}
                                          xKey="data"
                                          height={150}
                                          xAxisLabel="Data"
                                          yAxisLabel={range.unit || ''}
                                          formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)}` : 'N/A'}
                                          referenceLines={[
                                            { value: range.min, label: `Min: ${range.min}`, stroke: '#ef4444', strokeDasharray: '5 5' },
                                            { value: range.max, label: `Max: ${range.max}`, stroke: '#ef4444', strokeDasharray: '5 5' }
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
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Resumo Metabólico */}
                  {exameSelecionado && (() => {
                    const allPersonalScores = todosOsCampos.map((secao) =>
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
                    return <LabMetabolicSummarySection scores={allPersonalScores} />;
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
    </div>
    </>
  );
}

export default MetaPersonalPageV2;
