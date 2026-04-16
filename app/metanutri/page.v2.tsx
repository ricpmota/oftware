'use client';

// ETAPA A2 - Nova estrutura de layout idêntica ao /metaadmin
// Home implementada com KPIs reais + modais principais

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { NutricionistaService } from '@/services/nutricionistaService';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { PagamentoService } from '@/services/pagamentoService';
import { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';
import { PacienteService } from '@/services/pacienteService';
import KpiCard from '@/components/KpiCard';
import { 
  UtensilsCrossed, 
  Home, 
  Stethoscope, 
  Users, 
  DollarSign, 
  Calendar, 
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
  Eye,
  RefreshCw,
  Search,
  Edit,
  Syringe,
  FlaskConical,
  Trash2,
  Send,
  XCircle,
  UserPlus,
  FileText,
  MessageSquare,
  Phone,
  BarChart3,
  Plus,
  Pill,
  Activity,
  User as UserIcon,
  Dumbbell,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Printer,
  Star,
  Scale
} from 'lucide-react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { buildExpectedCurveDoseDrivenAnchored, buildSuggestedDoseSchedule, predictWaistCircumference, varianceStatus } from '@/utils/expectedCurve';
import { ProgressPill } from '@/components/ProgressPill';
import { AlertBadges } from '@/components/AlertBadges';
import { LabRangeBar } from '@/components/LabRangeBar';
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
import CalendarioTreinosPersonal from '@/components/CalendarioTreinosPersonal';
import NutriContent from '@/components/NutriContent';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { SolicitacaoPersonalTrainerService } from '@/services/solicitacaoPersonalTrainerService';
import { SOLICITACAO_STATUS as SOLICITACAO_STATUS_PERSONAL } from '@/features/metaPersonal/metaPersonal.constants';
import { trainingSessionService } from '@/services/trainingSessionService';
import { BioImpedanciaDisplay } from '@/components/bodymap/BioImpedanciaDisplay';
import { salvarBioImpedanciaRegistros } from '@/services/bioImpedanciaService';

type MenuNutri = 'home' | 'medicos' | 'pacientes' | 'financeiro' | 'calendario' | 'meu-perfil';

function MetaNutriPageV2() {
  const router = useRouter();
  const { labOrderBySection: labOrderBySecaoConfig, labLimitOverrides } = useLabOrderBySection();

  // Estados de navegação e layout (ETAPA A1)
  const [activeMenu, setActiveMenu] = useState<MenuNutri>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  // Estados de autenticação e dados
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nutricionista, setNutricionista] = useState<NutricionistaDoc | null>(null);
  const [agregadoNutri, setAgregadoNutri] = useState<{ count: number; media: number } | null>(null);
  const [showModalClassificacaoVisualizar, setShowModalClassificacaoVisualizar] = useState(false);
  const [detalhamentoVisualizar, setDetalhamentoVisualizar] = useState<DetalhamentoClassificacao | null>(null);
  const [loadingNutricionista, setLoadingNutricionista] = useState(false);
  
  // Estados para Home (KPIs)
  const [pacientesCompartilhados, setPacientesCompartilhados] = useState(0);
  const [medicosVinculados, setMedicosVinculados] = useState(0);
  const [receitaTotal, setReceitaTotal] = useState(0);
  const [receitaMes, setReceitaMes] = useState(0);
  const [loadingKPIs, setLoadingKPIs] = useState(false);
  
  // Estados para filtros de perda de peso
  const [filtroBasePerdaPeso, setFiltroBasePerdaPeso] = useState<'meus' | 'oftware'>('meus');
  const [filtroDosePerdaPeso, setFiltroDosePerdaPeso] = useState<string>('todas');
  const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState<string>('todas');
  const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState<string>('todos');
  
  // Estados para filtro de demografia
  const [filtroBaseDemografia, setFiltroBaseDemografia] = useState<'meus' | 'oftware'>('meus');
  
  // Estados para carregar todos os pacientes do Oftware
  const [todosPacientesOftware, setTodosPacientesOftware] = useState<PacienteCompleto[]>([]);
  const [loadingTodosPacientes, setLoadingTodosPacientes] = useState(false);
  
  // Estados para solicitações pendentes
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<SolicitacaoNutricionistaDoc[]>([]);
  const [loadingSolicitacoesPendentes, setLoadingSolicitacoesPendentes] = useState(false);
  
  // Estados para modais
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [showVisualizarPacienteModal, setShowVisualizarPacienteModal] = useState(false);
  const [pacienteVisualizando, setPacienteVisualizando] = useState<PacienteCompleto | null>(null);
  /** Quando true, modal de visualização mostra só 2 abas (Identificação + Dados Clínicos), igual Metapersonal mobile */
  const [modalVisualizacaoEstiloPersonal, setModalVisualizacaoEstiloPersonal] = useState(false);
  /** Visualização do paciente na própria página (não modal), mantendo menu inferior no mobile */
  const [pacienteVisualizandoInline, setPacienteVisualizandoInline] = useState<PacienteCompleto | null>(null);
  const [pacientesVisiveis, setPacientesVisiveis] = useState<PacienteVisivelNutri[]>([]);
  const [pastaAtiva, setPastaAtiva] = useState(1); // Estado para controlar qual pasta está ativa no modal (1-9)
  const [showGraficosModal, setShowGraficosModal] = useState(false);
  const [pacienteGraficos, setPacienteGraficos] = useState<PacienteCompleto | null>(null);
  const [graficoAtivo, setGraficoAtivo] = useState<'peso' | 'circunferencia' | 'hba1c' | 'imc'>('peso');
  const [graficoAtivoEvolucao, setGraficoAtivoEvolucao] = useState<'peso' | 'circunferencia' | 'hba1c' | 'imc'>('peso');
  const [mesCalendarioTimeline, setMesCalendarioTimeline] = useState(new Date());
  const [showModalDetalheConclusao, setShowModalDetalheConclusao] = useState(false);
  const [registroConclusaoParaModal, setRegistroConclusaoParaModal] = useState<{ weekIndex: number; weekStart: Date; weekEnd: Date; peso?: number; pacienteNome?: string } | null>(null);
  
  // Estados para seção Médicos (ETAPA A3)
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
  const [solicitacoesVinculo, setSolicitacoesVinculo] = useState<SolicitacaoVinculoNutriMedicoDoc[]>([]);
  const [loadingSolicitacoesVinculo, setLoadingSolicitacoesVinculo] = useState(false);
  const [solicitacoesVinculoRecebidas, setSolicitacoesVinculoRecebidas] = useState<SolicitacaoVinculoNutriMedicoDoc[]>([]);
  const [loadingSolicitacoesVinculoRecebidas, setLoadingSolicitacoesVinculoRecebidas] = useState(false);
  
  const [medicoExpandidoId, setMedicoExpandidoId] = useState<string | null>(null);
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
  
  // Estados para seção Pacientes (ETAPA A4.1)
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
  const [showFireworks, setShowFireworks] = useState<{ [key: string]: boolean }>({});
  
  // Estados para modal de exames
  const [showModalExames, setShowModalExames] = useState(false);
  const [pacienteExamesSelecionado, setPacienteExamesSelecionado] = useState<PacienteCompleto | null>(null);
  const [showModalBioImpedancia, setShowModalBioImpedancia] = useState(false);
  const [pacienteBioImpedanciaSelecionado, setPacienteBioImpedanciaSelecionado] = useState<PacienteCompleto | null>(null);
  const [exameDataSelecionada, setExameDataSelecionada] = useState<string>('');
  const [exameDataSelecionadaNoModal, setExameDataSelecionadaNoModal] = useState<string>(''); // Para aba Exames no modal unificado
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
  
  // Estados para mensagens não lidas
  const [mensagensNaoLidasPorPaciente, setMensagensNaoLidasPorPaciente] = useState<Record<string, number>>({});
  
  // Estados para pacientes com treinos (Personal Trainer)
  const [pacientesComTreinos, setPacientesComTreinos] = useState<Set<string>>(new Set());
  
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
  const [buscaPacienteFinanceiro, setBuscaPacienteFinanceiro] = useState<string>('');
  const [filtroStatusPagamentoFinanceiro, setFiltroStatusPagamentoFinanceiro] = useState<string>('todos');
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
  
  // Estados para calendário de aplicações
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

  // Persistir activeMenu no localStorage (ETAPA A1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMenu = localStorage.getItem('metanutri_activeMenu');
      if (savedMenu && ['home', 'medicos', 'pacientes', 'financeiro', 'calendario', 'meu-perfil'].includes(savedMenu)) {
        setActiveMenu(savedMenu as MenuNutri);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metanutri_activeMenu', activeMenu);
    }
  }, [activeMenu]);

  // Verificar autenticação e carregar nutricionista
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setNutricionista(null);
        setLoading(false);
        router.push('/');
        return;
      }

      setUser(firebaseUser);
      setLoadingNutricionista(true);

      try {
        const nutriDoc = await NutricionistaService.createOrUpdateNutricionista(
          firebaseUser.uid,
          firebaseUser.email || '',
          firebaseUser.displayName || ''
        );

        setNutricionista(nutriDoc);
        setRegistroNumero(nutriDoc.registroNumero);
        setTelefoneContato(nutriDoc.telefone || '');
        setCidadesSelecionadas(nutriDoc.cidades);
        
        // Carregar médicos verificados
        if (nutriDoc.isVerificado) {
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
      setCidadesSelecionadas(nutricionista.cidades || []);
    }
  }, [nutricionista]);

  // Carregar cidades disponíveis quando abrir o modal de perfil
  // Carrega cidades da coleção medicos (todas as cidades cadastradas nos médicos)
  useEffect(() => {
    if (showPerfilModal) {
      loadCidadesDosMedicos();
    }
  }, [showPerfilModal, loadCidadesDosMedicos]);

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
      
      // BUSCAR TODAS AS SOLICITAÇÕES DA COLEÇÃO diretamente (sem filtro)
      // Depois filtrar no cliente para garantir que não perdemos nenhuma
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs, query } = await import('firebase/firestore');
      const { COL_SOLICITACOES_VINCULO_NUTRI_MEDICO } = await import('@/features/metaNutri/metaNutri.constants');
      
      const todasQuery = query(collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO));
      const todasSnapshot = await getDocs(todasQuery);
      
      console.log('🔍 [DEBUG] Total de solicitações na coleção:', todasSnapshot.docs.length);
      
      // IDs possíveis do nutricionista atual
      const idsPossiveisNutri = [user.uid, nutricionista.id, nutricionista.userId].filter(Boolean);
      
      // Converter todos os documentos
      const todasSolicitacoes = todasSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
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
        };
      });
      
      console.log('🔍 [DEBUG] TODAS as solicitações da coleção:', todasSolicitacoes.map(s => ({
        id: s.id,
        nutricionistaId: s.nutricionistaId,
        medicoId: s.medicoId,
        solicitadoPor: s.solicitadoPor,
        status: s.status,
        correspondeNutri: idsPossiveisNutri.includes(s.nutricionistaId)
      })));
      
      // Filtrar apenas as RECEBIDAS pelo nutricionista (solicitadoPor === 'medico')
      // Mostrar APENAS pendentes - aceitas vão para "Médicos Vinculados", rejeitadas não aparecem mais
      const solicitacoesRecebidas = todasSolicitacoes.filter(s => {
        // Verificar se o nutricionistaId corresponde a qualquer um dos IDs possíveis
        const nutricionistaIdCorresponde = idsPossiveisNutri.includes(s.nutricionistaId);
        
        // Verificar se foi solicitado pelo médico (várias variações de case)
        const solicitadoPorMedico = s.solicitadoPor === 'medico' || 
                                     s.solicitadoPor === 'Medico' || 
                                     s.solicitadoPor === 'MÉDICO' ||
                                     String(s.solicitadoPor).toLowerCase() === 'medico';
        
        // Mostrar APENAS pendentes - aceitas e rejeitadas não aparecem mais aqui
        const statusPendente = s.status === SOLICITACAO_STATUS.PENDENTE;
        
        const passaFiltro = nutricionistaIdCorresponde && solicitadoPorMedico && statusPendente;
        
        console.log('🔍 [DEBUG] Verificando solicitação:', {
          id: s.id,
          nutricionistaId: s.nutricionistaId,
          medicoId: s.medicoId,
          solicitadoPor: s.solicitadoPor,
          status: s.status,
          idsPossiveisNutri,
          nutricionistaIdCorresponde,
          solicitadoPorMedico,
          statusPendente,
          passaFiltro
        });
        
        return passaFiltro;
      });
      
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
    
    try {
      setLoading(true);
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
      setLoading(false);
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
    
    if ((filtroBasePerdaPeso === 'oftware' || filtroBaseDemografia === 'oftware') && todosPacientesOftware.length === 0 && !loadingTodosPacientes) {
      loadTodosPacientesOftware();
    }
  }, [filtroBasePerdaPeso, filtroBaseDemografia, todosPacientesOftware.length, loadingTodosPacientes, loadTodosPacientesOftware]);

  // Carregar dados quando entrar na seção home
  useEffect(() => {
    if (user && nutricionista && activeMenu === 'home') {
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

  // Carregar pagamentos quando pacientes mudarem no menu financeiro
  useEffect(() => {
    if (user && nutricionista && activeMenu === 'financeiro' && pacientesVisiveis.length > 0 && !loadingPacientesList) {
      loadPagamentos(pacientesVisiveis.map(p => p.paciente));
    }
  }, [user, nutricionista, activeMenu, loadingPacientesList, pacientesVisiveis, loadPagamentos]);

  // Carregar dados quando entrar na seção calendário
  useEffect(() => {
    if (user && nutricionista && activeMenu === 'calendario') {
      loadPacientesList();
    }
  }, [user, nutricionista, activeMenu, loadPacientesList]);

  // Handler para aceitar solicitação
  const handleAceitarSolicitacao = async (requestId: string) => {
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
      await SolicitacaoNutricionistaService.rejectShareRequest(requestId, motivo || undefined);
      await loadSolicitacoesPendentes();
    } catch (error: any) {
      console.error('Erro ao rejeitar solicitação:', error);
      alert(error.message || 'Erro ao rejeitar solicitação');
    }
  };

  // Handler para visualizar paciente (abre modal - desktop: 9 abas; mobile estilo personal: 2 abas)
  // abaInicial: 1=Identificação, 2=Dados Clínicos, 3=Exames, ...
  // estiloPersonal: true = mesmo modal do Metapersonal mobile (só Identificação + Dados Clínicos)
  const handleVisualizarPaciente = (paciente: PacienteCompleto, abaInicial: number = 1, estiloPersonal?: boolean) => {
    setPacienteVisualizando(paciente);
    setModalVisualizacaoEstiloPersonal(estiloPersonal ?? false);
    setPastaAtiva(estiloPersonal ? Math.min(abaInicial, 2) : abaInicial);
    setShowVisualizarPacienteModal(true);
    // Inicializar data de exame para aba 3 quando abrir nela
    if (abaInicial === 3) {
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
  };

  // Inicializar/resetar data de exame quando paciente muda ou data selecionada não é válida
  useEffect(() => {
    if (!showVisualizarPacienteModal || !pacienteVisualizando || pastaAtiva !== 3) return;
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
    if (showVisualizarPacienteModal && pacienteVisualizando && pastaAtiva === 9) {
      setPacientePagamentoSelecionado(pacienteVisualizando);
      const pag = pagamentosPacientes[pacienteVisualizando.id];
      if (pag) setDadosPagamento(pag);
      else setDadosPagamento({ pacienteId: pacienteVisualizando.id, statusPagamento: 'negociacao', formaPagamento: null, valorTotal: 0, valorPago: 0, valorPendente: 0, parcelas: [], dataUltimaAtualizacao: new Date() });
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

  // Carregar prescrições para o modal mobile (por paciente)
  const loadPrescricoesModal = useCallback(async (paciente: PacienteCompleto) => {
    if (!nutricionista) return;
    try {
      setLoadingPrescricoesModal(true);
      await PrescricaoService.criarPrescricoesPadraoGlobais();
      // Buscar prescrições do nutricionista (usando userId como medicoId no sistema atual)
      const [templates, prescricoesNutri] = await Promise.all([
        PrescricaoService.getPrescricoesTemplate(),
        PrescricaoService.getPrescricoesByMedico(nutricionista.userId)
      ]);
      const todas = [
        ...templates,
        ...prescricoesNutri.filter(x => !x.pacienteId || x.pacienteId === paciente.id)
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
  }, [nutricionista]);

  // Carregar prescrições e sincronizar paciente quando usuário abre aba 5 no modal
  useEffect(() => {
    if (showVisualizarPacienteModal && pacienteVisualizando && pastaAtiva === 6 && nutricionista) {
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
  const telefoneSoNumeros = telefoneContato.replace(/\D/g, '');
  const canSavePerfil = registroSoNumeros.length > 0 &&
    cidadesSelecionadas.length >= 1 &&
    telefoneSoNumeros.length >= 10;

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
    if (telefoneSoNumeros.length < 10) {
      setSaveMessage({ type: 'error', text: 'Preencha o telefone para contato.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await NutricionistaService.updatePerfil(
        user.uid,
        registroSoNumeros,
        telefoneContato.trim(),
        cidadesSelecionadas
      );
      setNutricionista({
        ...nutricionista,
        registroNumero: registroSoNumeros,
        telefone: telefoneContato.trim(),
        cidades: cidadesSelecionadas,
      });
      setSaveMessage({ type: 'success', text: 'Perfil salvo com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao salvar perfil. Tente novamente.' });
    } finally {
      setIsSaving(false);
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
    switch (activeMenu) {
      case 'home':
        // Calcular estatísticas de pacientes por status
        const pacientes = pacientesVisiveis.map(p => p.paciente);
        const totalPacientes = pacientes.length;
        const pacientesPendentes = pacientes.filter(p => p.statusTratamento === 'pendente').length;
        const pacientesEmTratamento = pacientes.filter(p => p.statusTratamento === 'em_tratamento').length;
        const pacientesConcluidos = pacientes.filter(p => p.statusTratamento === 'concluido').length;
        const pacientesAbandono = pacientes.filter(p => p.statusTratamento === 'abandono').length;
        
        // Calcular estatísticas financeiras
        const pagamentosLista = Object.values(pagamentosPacientes || {});
        const totalRecebido = pagamentosLista.reduce((sum, p) => sum + (p.valorPago || 0), 0);
        const totalEmAberto = pagamentosLista.reduce((sum, p) => sum + (p.valorPendente || 0), 0);
        const totalPrevisto = pagamentosLista.reduce((sum, p) => sum + (p.valorTotal || 0), 0);

        return (
          <div className="space-y-6">
            {/* Estatísticas de Pacientes */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Pacientes</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                {/* KPI - Médicos Vinculados */}
                {loadingKPIs ? (
                  <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <Stethoscope className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                      <div className="ml-3 md:ml-4">
                        <p className="text-sm font-medium text-gray-500">Médicos Vinculados</p>
                        <p className="text-xl md:text-2xl font-semibold text-gray-900">{medicosVinculados}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-sm font-medium text-gray-500">Total de Pacientes</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900">{totalPacientes}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Pendentes</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900">{pacientesPendentes}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Activity className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Tratamento</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900">{pacientesEmTratamento}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Concluído</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900">{pacientesConcluidos}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <X className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                    <div className="ml-3 md:ml-4">
                      <p className="text-xs md:text-sm font-medium text-gray-500">Abandono</p>
                      <p className="text-xl md:text-2xl font-semibold text-gray-900">{pacientesAbandono}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demografia dos Pacientes */}
            {(() => {
              // Selecionar qual array de pacientes usar baseado no filtro
              const pacientesParaAnalise = filtroBaseDemografia === 'oftware' 
                ? (todosPacientesOftware.length > 0 ? todosPacientesOftware : pacientes)
                : pacientes;

              // Se está carregando todos os pacientes e o filtro é "Base Oftware", mostrar loading
              if (filtroBaseDemografia === 'oftware' && loadingTodosPacientes && todosPacientesOftware.length === 0) {
                return (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Demografia dos Pacientes</h3>
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Carregando pacientes da base Oftware...</span>
                    </div>
                  </div>
                );
              }

              // Calcular idades dos pacientes
              const pacientesComIdade = pacientesParaAnalise.filter(p => {
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
                    {/* Filtro de Base de Dados */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-700">Base de Dados:</label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setFiltroBaseDemografia('meus')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroBaseDemografia === 'meus'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Meus Pacientes
                        </button>
                        <button
                          onClick={() => setFiltroBaseDemografia('oftware')}
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                            filtroBaseDemografia === 'oftware'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Base Oftware
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Idade Média e Faixas Etárias */}
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Idade Média</h4>
                          <UserIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-3xl font-bold text-blue-700">
                          {idadeMedia > 0 ? idadeMedia.toFixed(1) : '-'} <span className="text-lg text-gray-600">anos</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {totalComIdade} paciente{totalComIdade !== 1 ? 's' : ''} com data de nascimento
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Faixas Etárias</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">18 - 24 anos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all"
                                  style={{ width: `${porcentagensFaixas['18-24']}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                                {porcentagensFaixas['18-24'].toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">25 - 40 anos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-indigo-500 h-2 rounded-full transition-all"
                                  style={{ width: `${porcentagensFaixas['25-40']}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                                {porcentagensFaixas['25-40'].toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">41 - 65 anos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-500 h-2 rounded-full transition-all"
                                  style={{ width: `${porcentagensFaixas['41-65']}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                                {porcentagensFaixas['41-65'].toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">&gt; 65 anos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-pink-500 h-2 rounded-full transition-all"
                                  style={{ width: `${porcentagensFaixas['65+']}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                                {porcentagensFaixas['65+'].toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gráfico de Pizza - Gênero */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Distribuição por Gênero</h4>
                      {totalGenero > 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="w-full max-w-xs">
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <defs>
                                  <linearGradient id="gradienteMasculino" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#1e40af" stopOpacity={1} />
                                  </linearGradient>
                                  <linearGradient id="gradienteFeminino" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#ec4899" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#be185d" stopOpacity={1} />
                                  </linearGradient>
                                </defs>
                                <Pie
                                  data={dadosGenero}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={false}
                                  outerRadius={70}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {dadosGenero.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={index === 0 ? 'url(#gradienteMasculino)' : 'url(#gradienteFeminino)'} 
                                    />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: any, name: string, props: any) => {
                                    return [`${value} paciente${value !== 1 ? 's' : ''} (${props.payload.porcentagem.toFixed(1)}%)`, name];
                                  }}
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
                                <span className="text-sm text-gray-700">
                                  {item.name}: <span className="font-semibold">{item.value}</span> ({item.porcentagem.toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
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

              // Calcular cidades dos pacientes
              const pacientesComCidade = pacientes.filter(p => {
                const cidade = p.dadosIdentificacao?.endereco?.cidade;
                const estado = p.dadosIdentificacao?.endereco?.estado;
                return cidade && cidade.trim() !== '' && estado && estado.trim() !== '';
              });

              // Contar ocorrências de cada cidade (normalizadas)
              const cidadesCount: Record<string, number> = {};
              pacientesComCidade.forEach(p => {
                const cidade = p.dadosIdentificacao?.endereco?.cidade || '';
                const estado = p.dadosIdentificacao?.endereco?.estado || '';
                const chaveNormalizada = normalizarCidadeEstado(cidade, estado);
                cidadesCount[chaveNormalizada] = (cidadesCount[chaveNormalizada] || 0) + 1;
              });

              // Ordenar por quantidade e pegar top 5
              const cidadesOrdenadas = Object.entries(cidadesCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

              const totalComCidade = pacientesComCidade.length;
              const totalOutras = totalComCidade - cidadesOrdenadas.reduce((sum, [, count]) => sum + count, 0);

              // Preparar dados para exibição
              const dadosCidades = cidadesOrdenadas.map(([cidadeEstado, count]) => ({
                cidadeEstado,
                count,
                porcentagem: totalComCidade > 0 ? (count / totalComCidade) * 100 : 0
              }));

              // Adicionar "Outras" se houver mais cidades
              if (totalOutras > 0 || cidadesOrdenadas.length < 5) {
                dadosCidades.push({
                  cidadeEstado: 'Outras',
                  count: totalOutras,
                  porcentagem: totalComCidade > 0 ? (totalOutras / totalComCidade) * 100 : 0
                });
              }

              // Cores para as barras
              const coresCidades = [
                '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d1d5db'
              ];

              return (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Demografia Geográfica</h3>
                  
                  {totalComCidade > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Cidades</h4>
                      <div className="space-y-3">
                        {dadosCidades.map((item, index) => (
                          <div key={item.cidadeEstado} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex-shrink-0 w-40 truncate">
                              {item.cidadeEstado}
                            </span>
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full transition-all"
                                  style={{ 
                                    width: `${item.porcentagem}%`,
                                    backgroundColor: coresCidades[index] || coresCidades[coresCidades.length - 1]
                                  }}
                                />
                  </div>
                              <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                                {item.porcentagem.toFixed(1)}%
                              </span>
                </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        {totalComCidade} paciente{totalComCidade !== 1 ? 's' : ''} com cidade cadastrada
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">Nenhum dado de cidade disponível</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Estatística de Perda de Peso */}
            {(() => {
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

              // Selecionar qual array de pacientes usar baseado no filtro
              const pacientesParaAnalise = filtroBasePerdaPeso === 'oftware' 
                ? (todosPacientesOftware.length > 0 ? todosPacientesOftware : pacientes)
                : pacientes;

              // Se está carregando todos os pacientes e o filtro é "Base Oftware", mostrar loading
              if (filtroBasePerdaPeso === 'oftware' && loadingTodosPacientes && todosPacientesOftware.length === 0) {
                return (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatística de Perda de Peso</h3>
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Carregando pacientes da base Oftware...</span>
                  </div>
                </div>
                );
              }

              // Calcular perda de peso para cada paciente por semana individual
              const perdasPesoPorSemana: Record<number, number[]> = {};

              pacientesParaAnalise.forEach(paciente => {
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
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estatística de Perda de Peso</h3>
                  
                  {/* Layout lado a lado para desktop */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Coluna Esquerda: Filtros e Média */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Filtros */}
                      <div className="space-y-3">
                        {/* Filtro de Base (Meus Pacientes / Base Oftware) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Base de Dados</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setFiltroBasePerdaPeso('meus')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroBasePerdaPeso === 'meus'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Meus Pacientes
                            </button>
                            <button
                              onClick={() => setFiltroBasePerdaPeso('oftware')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroBasePerdaPeso === 'oftware'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Base Oftware
                            </button>
                  </div>
                </div>
                        
                        {/* Filtro de Dose */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Dose Média</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setFiltroDosePerdaPeso('todas')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroDosePerdaPeso === 'todas'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {dose} mg
                              </button>
                            ))}
              </div>
            </div>

                        {/* Filtro de Faixa Etária */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Faixa Etária</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('todas')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroFaixaEtariaPerdaPeso === 'todas'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Todas
                            </button>
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('18-24')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroFaixaEtariaPerdaPeso === '18-24'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              18 - 24 anos
                            </button>
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('25-40')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroFaixaEtariaPerdaPeso === '25-40'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              25 - 40 anos
                            </button>
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('41-65')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroFaixaEtariaPerdaPeso === '41-65'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              41 - 65 anos
                            </button>
                            <button
                              onClick={() => setFiltroFaixaEtariaPerdaPeso('65+')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroFaixaEtariaPerdaPeso === '65+'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              &gt; 65 anos
                            </button>
                          </div>
                        </div>

                        {/* Filtro de Sexo */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sexo</label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setFiltroSexoPerdaPeso('todos')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroSexoPerdaPeso === 'todos'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Todos
                            </button>
                            <button
                              onClick={() => setFiltroSexoPerdaPeso('M')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroSexoPerdaPeso === 'M'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Masculino
                            </button>
                            <button
                              onClick={() => setFiltroSexoPerdaPeso('F')}
                              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                filtroSexoPerdaPeso === 'F'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Feminino
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card com Média de Perda de Peso - Desktop abaixo dos filtros */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 lg:block hidden">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Média de Perda de Peso por Semana</h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {mediasPorSemana.map((item) => (
                            <div key={item.semana} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 font-medium w-20">
                                Sem {item.semana}
                              </span>
                              <div className="flex items-center gap-3 flex-1">
                                {item.quantidade > 0 ? (
                                  <>
                                    <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                                          <div 
                                            className="bg-green-500 h-2 rounded-full transition-all"
                                            style={{ 
                                              width: `${Math.min(Math.abs(item.media) * 5, 100)}%`
                                            }}
                                          />
                                    </div>
                                    <div className="text-sm text-gray-700 min-w-[120px] text-right">
                                      <span className="font-semibold text-green-700">
                                        {Math.abs(item.media).toFixed(2)} kg
                                      </span>
                                      <span className="text-gray-500 ml-2 text-xs">
                                        (n={item.quantidade})
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex-1 text-center">
                                    <span className="text-sm text-gray-400">Sem dados disponíveis</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {mediasPorSemana.length === 0 && (
                            <div className="text-center py-4 text-gray-400">
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
                          perda: Math.abs(item.media), // Usar valor absoluto para exibir valores positivos
                          quantidade: item.quantidade
                        }));

                        // Calcular o valor máximo para o eixo Y
                        const valoresPerda = dadosGrafico.map(d => d.perda);
                        const maxPerda = Math.max(...valoresPerda, 0);
                        const margem = maxPerda * 0.1; // 10% de margem

                        return (
                          <div className="space-y-4">
                            {/* Card com Média de Perda de Peso - Mobile */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 lg:hidden">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Média de Perda de Peso por Semana</h4>
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {mediasPorSemana.map((item) => (
                                  <div key={item.semana} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 font-medium w-20">
                                      Sem {item.semana}
                                    </span>
                                    <div className="flex items-center gap-3 flex-1">
                                      {item.quantidade > 0 ? (
                                        <>
                                          <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                                            <div 
                                              className="bg-green-500 h-2 rounded-full transition-all"
                                              style={{ 
                                                width: `${Math.min(Math.abs(item.media) * 5, 100)}%`
                                              }}
                                            />
                                          </div>
                                          <div className="text-sm text-gray-700 min-w-[120px] text-right">
                                            <span className="font-semibold text-green-700">
                                              {Math.abs(item.media).toFixed(2)} kg
                                            </span>
                                            <span className="text-gray-500 ml-2 text-xs">
                                              (n={item.quantidade})
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex-1 text-center">
                                          <span className="text-sm text-gray-400">Sem dados disponíveis</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {mediasPorSemana.length === 0 && (
                                  <div className="text-center py-4 text-gray-400">
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
                                <div className="hidden lg:flex items-center justify-center h-[500px] text-gray-400">
                                  <p className="text-sm">Nenhum dado disponível para o gráfico</p>
                                </div>
                                <div className="lg:hidden flex items-center justify-center h-[300px] text-gray-400">
                                  <p className="text-sm">Nenhum dado disponível para o gráfico</p>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Estatísticas Financeiras */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas Financeiras</h3>
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
            </div>
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
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-4" aria-label="Tabs">
                  <button
                    onClick={() => setAbaAtivaMedicos('buscar')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'buscar'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Buscar Médicos
                  </button>
                  <button
                    onClick={() => setAbaAtivaMedicos('solicitacoes')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                    onClick={() => setAbaAtivaMedicos('vinculados')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtivaMedicos === 'vinculados'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Médicos Vinculados
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
                                                        onClick={() => handleEncerrarCompartilhamento(item.paciente.id, medico.medicoId)}
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
                                                    onClick={() => handleEncerrarCompartilhamento(item.paciente.id, medico.medicoId)}
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
        // Mobile: visualização do paciente na própria página (mantém menu inferior)
        if (pacienteVisualizandoInline && pacienteVisualizando) {
          const p = pacienteVisualizando;
          return (
            <div className="space-y-6 pb-20">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <h2 className="text-xl font-bold text-gray-900">Visualizar Paciente</h2>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {p.dadosIdentificacao?.nomeCompleto || p.nome || 'Paciente'}
                      </p>
                      <div className="mt-2 space-y-2">
                        <div className="bg-yellow-100 border border-yellow-300 rounded-md px-3 py-2">
                          <p className="text-sm text-yellow-800 font-medium">
                            ⚠️ Somente visualização — alterações apenas pelo médico responsável
                          </p>
                        </div>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          p.statusTratamento === 'em_tratamento' ? 'bg-green-100 text-green-800' :
                          p.statusTratamento === 'concluido' ? 'bg-blue-100 text-blue-800' :
                          p.statusTratamento === 'abandono' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {p.statusTratamento === 'pendente' ? 'Pendente' : p.statusTratamento === 'em_tratamento' ? 'Em Tratamento' : p.statusTratamento === 'concluido' ? 'Concluído' : p.statusTratamento === 'abandono' ? 'Abandono' : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setPacienteVisualizandoInline(null); setPastaAtiva(1); }}
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                      aria-label="Fechar"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
                <div className="flex border-b border-gray-200 overflow-x-auto">
                  {[{ id: 1, nome: 'Dados de Identificação' }, { id: 2, nome: 'Dados Clínicos' }].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPastaAtiva(tab.id)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        pastaAtiva === tab.id ? 'border-green-500 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.nome}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {pastaAtiva === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados de Identificação</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.nomeCompleto || p.nome || 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Email</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.email || 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.telefone || 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">CPF</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.cpf || 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.dataNascimento ? (() => { try { const d = new Date(p.dadosIdentificacao!.dataNascimento); return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : 'N/A'; } catch { return 'N/A'; } })() : 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Sexo Biológico</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.sexoBiologico === 'M' ? 'Masculino' : p.dadosIdentificacao?.sexoBiologico === 'F' ? 'Feminino' : p.dadosIdentificacao?.sexoBiologico === 'Outro' ? 'Outro' : 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">CEP</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.endereco?.cep || 'N/A'}</div></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Endereço (Rua)</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.endereco?.rua || 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.endereco?.cidade || 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Estado</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosIdentificacao?.endereco?.estado || 'N/A'}</div></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Data de Cadastro</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dataCadastro ? (() => { try { const d = new Date(p.dataCadastro); return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : 'N/A'; } catch { return 'N/A'; } })() : 'N/A'}</div></div>
                      </div>
                    </div>
                  )}
                  {pastaAtiva === 2 && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Clínicos da Anamnese</h3>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-4">2.1 Medidas Iniciais</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div><label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosClinicos?.medidasIniciais?.peso ? p.dadosClinicos.medidasIniciais.peso.toFixed(1) : 'N/A'}</div></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosClinicos?.medidasIniciais?.altura || 'N/A'}</div></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-2">IMC (kg/m²)</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosClinicos?.medidasIniciais?.imc ? p.dadosClinicos.medidasIniciais.imc.toFixed(2) : 'N/A'}</div>{p.dadosClinicos?.medidasIniciais?.imc ? <p className={`mt-2 text-sm ${getCorGrauObesidade(calcularGrauObesidade(p.dadosClinicos.medidasIniciais.imc))}`}><strong>Grau de Obesidade:</strong> {calcularGrauObesidade(p.dadosClinicos.medidasIniciais.imc)}</p> : null}</div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-2">Circunf. Abdominal (cm)</label><div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">{p.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal || 'N/A'}</div></div>
                        </div>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-4">2.2 Diagnóstico Principal</h4>
                        <div className="text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                          {p.dadosClinicos?.diagnosticoPrincipal?.tipo === 'dm2' ? 'Diabetes mellitus tipo 2 (DM2)' : p.dadosClinicos?.diagnosticoPrincipal?.tipo === 'obesidade' ? 'Obesidade (IMC ≥ 30)' : p.dadosClinicos?.diagnosticoPrincipal?.tipo === 'sobrepeso_comorbidade' ? 'Sobrepeso com comorbidade' : p.dadosClinicos?.diagnosticoPrincipal?.tipo === 'pre_diabetes' ? 'Pré-diabetes (IFG/ITG)' : p.dadosClinicos?.diagnosticoPrincipal?.tipo === 'resistencia_insulinica' ? 'Resistência insulínica/Síndrome metabólica' : p.dadosClinicos?.diagnosticoPrincipal?.tipo === 'sop_ri' ? 'SOP com RI' : p.dadosClinicos?.diagnosticoPrincipal?.tipo === 'ehna_sem_dm2' ? 'EHNA sem DM2' : p.dadosClinicos?.diagnosticoPrincipal?.tipo === 'outro' ? `Outro: ${p.dadosClinicos.diagnosticoPrincipal.outro || ''}` : 'N/A'}
                        </div>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-4">2.3 Comorbidades</h4>
                        <div className="space-y-2 text-sm text-gray-900">
                          {p.dadosClinicos?.comorbidades?.hipertensaoArterial && <div>✓ Hipertensão arterial (HAS)</div>}
                          {p.dadosClinicos?.comorbidades?.dislipidemia && <div>✓ Dislipidemia (DLP)</div>}
                          {p.dadosClinicos?.comorbidades?.apneiaObstrutivaSono && <div>✓ Apneia obstrutiva do sono (AOS)</div>}
                          {p.dadosClinicos?.comorbidades?.esteatoseEHNA && <div>✓ Esteatose/EHNA</div>}
                          {p.dadosClinicos?.comorbidades?.doencaCardiovascular && <div>✓ Doença cardiovascular</div>}
                          {p.dadosClinicos?.comorbidades?.doencaRenalCronica && <div>✓ Doença renal crônica (DRC)</div>}
                          {p.dadosClinicos?.comorbidades?.sop && <div>✓ SOP</div>}
                          {p.dadosClinicos?.comorbidades?.hipotireoidismo && <div>✓ Hipotireoidismo</div>}
                          {p.dadosClinicos?.comorbidades?.asmaDPOC && <div>✓ Asma/DPOC</div>}
                          {p.dadosClinicos?.comorbidades?.transtornoAnsiedadeDepressao && <div>✓ Transtorno de ansiedade/depressão</div>}
                          {p.dadosClinicos?.comorbidades?.nenhuma && <div>✓ Nenhuma</div>}
                          {p.dadosClinicos?.comorbidades?.outra && <div>✓ Outra: {p.dadosClinicos.comorbidades.outraDescricao || ''}</div>}
                          {(!p.dadosClinicos?.comorbidades || Object.values(p.dadosClinicos.comorbidades).every(v => !v)) && <div className="text-gray-500">Nenhuma comorbidade registrada</div>}
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800"><strong>Nota:</strong> Visualização somente leitura. Para editar, entre em contato com o médico responsável.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

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
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => handleVisualizarPaciente(paciente)}
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
                                ? 'p-[2px] bg-gradient-to-r from-purple-500 to-orange-500' 
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
                                      {/* Status do Pagamento - abre modal unificado na aba Pagamento (8) */}
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
                                              dataUltimaAtualizacao: new Date()
                                            });
                                          }
                                          handleVisualizarPaciente(paciente, 8);
                                        }}
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
                                          ? 'Aberto'
                                          : pagamento?.statusPagamento === 'iniciou_pagamento'
                                          ? 'Parcial'
                                          : 'Negociação'}
                                      </button>
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
                                
                                {/* Botões de ação - Editar, Aplicações, Exames, Prescrições, Nutri, Personal, Excluir */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {/* Botão Editar — abre na própria página (mantém menu inferior), sem modal */}
                                    <button
                                      onClick={() => {
                                        setPacienteVisualizandoInline(paciente);
                                        setPacienteVisualizando(paciente);
                                        setPastaAtiva(1);
                                        setModalVisualizacaoEstiloPersonal(true);
                                      }}
                                      className="p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                      title="Visualizar paciente"
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
                                
                                {/* Detalhes expandíveis */}
                                {isExpanded && (
                                  <div className="space-y-2 mb-3 pt-3 border-t border-gray-200">
                                    {/* Caixa com informações clínicas iniciais */}
                                    {(ultimoPeso || paciente.dadosClinicos?.medidasIniciais?.altura || 
                                      paciente.dadosClinicos?.medidasIniciais?.imc) && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 relative overflow-hidden" style={{ borderRadius: '12px' }}>
                                        {/* Componente de Confetes (apenas mobile) - explodem e depois caem */}
                                        {(() => {
                                          const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
                                          const alturaCm = medidasIniciais?.altura;
                                          const alturaMetros = alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;
                                          
                                          // IMC atual: se estiver arrastando, usar temporário; senão calcular do último peso ou usar IMC inicial
                                          let imcAtual: number | null = null;
                                          if (pacienteArrastandoIMC === item.pacienteId && imcTemporarioIMC !== null) {
                                            imcAtual = imcTemporarioIMC;
                                          } else if (alturaMetros && ultimoPeso && ultimoPeso > 0) {
                                            imcAtual = ultimoPeso / (alturaMetros * alturaMetros);
                                          } else if (medidasIniciais?.imc) {
                                            imcAtual = medidasIniciais.imc;
                                          }
                                          
                                          // Verificar se está na faixa saudável (18.5 a 25)
                                          const isSaudavel = imcAtual && imcAtual >= 18.5 && imcAtual < 25;
                                          const showFireworksForPaciente = showFireworks[item.pacienteId] && isSaudavel;
                                          
                                          const Confetti = () => {
                                            if (!showFireworksForPaciente) return null;
                                            
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
                                              <div className="lg:hidden absolute inset-0 pointer-events-none z-[51]" style={{ overflow: 'hidden', borderRadius: '12px' }}>
                                                {Array.from({ length: confettiCount }).map((_, i) => {
                                                  const center = explosionCenters[Math.floor(Math.random() * explosionCenters.length)];
                                                  const angle = Math.random() * 360;
                                                  const explosionDistance = 20 + Math.random() * 40;
                                                  const fallDistance = 200 + Math.random() * 200;
                                                  const delay = Math.random() * 0.3;
                                                  const duration = 3;
                                                  const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
                                                  const rotation = Math.random() * 360;
                                                  const animationName = `confetti-explode-${item.pacienteId}-${i}`;
                                                  
                                                  const startX = Math.cos(angle * Math.PI / 180) * explosionDistance;
                                                  const startY = Math.sin(angle * Math.PI / 180) * explosionDistance;
                                                  const fallX = (Math.random() - 0.5) * 30;
                                                  const fallY = fallDistance;
                                                  
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
                                          
                                          // Componente de Fogos de Artifício (apenas mobile)
                                          const Fireworks = () => {
                                            if (!showFireworksForPaciente) return null;
                                            
                                            const fireworkPositions = [
                                              { x: '30%', y: '25%' }, { x: '70%', y: '20%' }, { x: '25%', y: '40%' }, { x: '75%', y: '35%' },
                                              { x: '40%', y: '35%' }, { x: '60%', y: '30%' }, { x: '20%', y: '50%' }, { x: '80%', y: '45%' },
                                              { x: '35%', y: '50%' }, { x: '65%', y: '45%' }, { x: '50%', y: '40%' }, { x: '30%', y: '60%' },
                                              { x: '70%', y: '65%' }, { x: '45%', y: '60%' }, { x: '55%', y: '65%' }, { x: '50%', y: '55%' },
                                            ];
                                            
                                            const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff6b9d', '#c44569', '#f8b500', '#00d2d3', '#ffa500', '#ff1493'];
                                            
                                            return (
                                              <div className="lg:hidden absolute inset-0 pointer-events-none z-50" style={{ overflow: 'hidden', borderRadius: '12px' }}>
                                                {fireworkPositions.map((position, fireworkIndex) => {
                                                  const delay = fireworkIndex * 0.15;
                                                  const duration = 0.8;
                                                  
                                                  const particles = Array.from({ length: 15 }, (_, i) => {
                                                    const angle = (i * 360) / 15;
                                                    const distance = 30 + Math.random() * 40;
                                                    const particleDelay = delay + Math.random() * 0.05;
                                                    const particleDuration = duration + Math.random() * 0.2;
                                                    const color = colors[Math.floor(Math.random() * colors.length)];
                                                    const x = Math.cos(angle * Math.PI / 180) * distance;
                                                    const y = Math.sin(angle * Math.PI / 180) * distance;
                                                    
                                                    return { x, y, particleDelay, particleDuration, color, key: `firework-${item.pacienteId}-${fireworkIndex}-particle-${i}` };
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
                                                                opacity: 0,
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
                                          
                                          return (
                                            <>
                                              <Confetti />
                                              <Fireworks />
                                            </>
                                          );
                                        })()}
                                        
                                        {/* Calcular IMC atual (usando peso temporário se estiver arrastando, senão último peso ou IMC inicial) */}
                                        {(() => {
                                          const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
                                          const alturaCm = medidasIniciais?.altura;
                                          const alturaMetros = alturaCm && typeof alturaCm === 'number' && alturaCm > 0 ? alturaCm / 100 : null;
                                          
                                          // IMC atual: se estiver arrastando, usar temporário; senão calcular do último peso ou usar IMC inicial
                                          let imcAtual: number | null = null;
                                          if (pacienteArrastandoIMC === item.pacienteId && imcTemporarioIMC !== null) {
                                            imcAtual = imcTemporarioIMC;
                                          } else if (alturaMetros && ultimoPeso && ultimoPeso > 0) {
                                            imcAtual = ultimoPeso / (alturaMetros * alturaMetros);
                                          } else if (medidasIniciais?.imc) {
                                            imcAtual = medidasIniciais.imc;
                                          }
                                          
                                          // Peso atual: se estiver arrastando, usar temporário; senão último peso ou peso inicial
                                          const pesoAtual = pacienteArrastandoIMC === item.pacienteId && pesoTemporarioIMC !== null 
                                            ? pesoTemporarioIMC 
                                            : (ultimoPeso || medidasIniciais?.peso || null);
                                          
                                          // Função para classificar IMC
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
                                          
                                          // Função para calcular posição do marcador na barra de IMC
                                          const calcularPosicaoMarcador = (imc: number | null | undefined): number => {
                                            if (!imc || imc === 0) return 0;
                                            // Faixas: Baixo peso (<18.5), Saudável (18.5-25), Sobrepeso (25-30), Obeso (>=30)
                                            // A barra tem 4 faixas iguais (25% cada)
                                            if (imc < 18.5) {
                                              const percentualNaFaixa = (imc / 18.5) * 25;
                                              return percentualNaFaixa;
                                            } else if (imc < 25) {
                                              const percentualNaFaixa = ((imc - 18.5) / (25 - 18.5)) * 25;
                                              return 25 + percentualNaFaixa;
                                            } else if (imc < 30) {
                                              const percentualNaFaixa = ((imc - 25) / (30 - 25)) * 25;
                                              return 50 + percentualNaFaixa;
                                            } else {
                                              const percentualNaFaixa = Math.min(((imc - 30) / 20) * 25, 25);
                                              return 75 + percentualNaFaixa;
                                            }
                                          };
                                          
                                          // Usar IMC arredondado para exibição e barra - garante que valor e posição batam
                                          const imcParaExibicao = imcAtual && imcAtual > 0 ? Math.round(imcAtual * 10) / 10 : null;
                                          const classificacaoIMC = classificarIMC(imcParaExibicao);
                                          
                                          // Handlers para arrastar o marcador
                                          const handleMouseDown = (e: React.MouseEvent) => {
                                            e.preventDefault();
                                            setIsDraggingIMC(true);
                                            setPacienteArrastandoIMC(item.pacienteId);
                                          };

                                          const handleTouchStart = (e: React.TouchEvent) => {
                                            setIsDraggingIMC(true);
                                            setPacienteArrastandoIMC(item.pacienteId);
                                          };
                                          
                                          return (
                                            <>
                                              <div className="grid grid-cols-3 gap-2">
                                                {pesoAtual && pesoAtual > 0 && (
                                                  <div className="text-center">
                                                    <div className="text-xs text-blue-700 font-medium mb-1">Peso Atual</div>
                                                    <div className="text-sm font-semibold text-blue-900">
                                                      {pesoAtual.toFixed(1)} kg
                                                    </div>
                                                  </div>
                                                )}
                                                {alturaMetros && (
                                                  <div className="text-center">
                                                    <div className="text-xs text-blue-700 font-medium mb-1">Altura</div>
                                                    <div className="text-sm font-semibold text-blue-900">
                                                      {alturaMetros.toFixed(2)} m
                                                    </div>
                                                  </div>
                                                )}
                                                {imcParaExibicao && imcParaExibicao > 0 && (
                                                  <div className="text-center">
                                                    <div className="text-xs text-blue-700 font-medium mb-1">IMC</div>
                                                    <div className="text-sm font-semibold text-blue-900">
                                                      {imcParaExibicao.toFixed(1)}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                              
                                              {/* Barra de IMC Interativa */}
                                              {imcParaExibicao && imcParaExibicao > 0 && alturaMetros && (
                                                <div className="mt-3 pt-3 border-t border-blue-200">
                                                  {/* Valores acima da barra nas transições */}
                                                  <div className="relative mb-1 h-4">
                                                    <span className="absolute text-xs text-gray-500" style={{ left: '25%', transform: 'translateX(-50%)' }}>18.5</span>
                                                    <span className="absolute text-xs text-gray-500" style={{ left: '50%', transform: 'translateX(-50%)' }}>25</span>
                                                    <span className="absolute text-xs text-gray-500" style={{ left: '75%', transform: 'translateX(-50%)' }}>30</span>
                                                  </div>
                                                  
                                                  {/* Barra horizontal fina com 4 segmentos */}
                                                  <div 
                                                    ref={(el) => {
                                                      if (el) {
                                                        barraIMCRef.current[item.pacienteId] = el;
                                                      }
                                                    }}
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
                                                    
                                                    {/* Marcador dinâmico com emoji smiley - redondo, não limitado à espessura da barra */}
                                                    <div 
                                                      className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing"
                                                      style={{ 
                                                        left: `${calcularPosicaoMarcador(imcParaExibicao)}%`,
                                                        userSelect: 'none'
                                                      }}
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
                                                  
                                                  {/* Labels abaixo da barra */}
                                                  <div className="flex justify-between mt-2">
                                                    <span className="text-gray-500" style={{ fontSize: '11px' }}>Baixo</span>
                                                    <span className="text-gray-500" style={{ fontSize: '11px' }}>Saudável</span>
                                                    <span className="text-gray-500" style={{ fontSize: '11px' }}>Alto</span>
                                                    <span className="text-gray-500" style={{ fontSize: '11px' }}>Obeso</span>
                                                  </div>
                                                  
                                                  {/* Grau de Obesidade abaixo da barra */}
                                                  <div className="mt-2 text-center">
                                                    <div className="text-xs text-blue-700 font-medium mb-1">Grau de Obesidade</div>
                                                    <div className={`text-sm font-semibold ${getCorGrauObesidade(calcularGrauObesidade(imcParaExibicao))}`}>
                                                      {calcularGrauObesidade(imcParaExibicao) || '-'}
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
                                    
                                    {/* Valor Total (Negociado entre Paciente x Nutricionista) */}
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
                                      </>
                                    ) : (
                                      <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-lg mb-3">
                                        <p className="text-sm text-gray-500">Nenhuma aplicação registrada ainda.</p>
                                      </div>
                                    )}
                                    {/* Botão do Gráfico */}
                                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-center">
                                      <button
                                        onClick={() => {
                                          setPacienteGraficos(paciente);
                                          handleVisualizarPaciente(paciente, 9);
                                        }}
                                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5"
                                        title="Ver gráficos"
                                      >
                                        <BarChart3 size={14} />
                                        Gráficos do Paciente
                                      </button>
                                    </div>
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

            {/* Tabela de pacientes e vendas avulsas */}
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
        // Obter lista de pacientes do nutricionista para o calendário
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

        // Função para obter pagamentos do mês (pagamentos parcelados nutricionista-paciente)
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

          // Iterar sobre todos os pagamentos nutricionista-paciente
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

        // Função para renderizar calendário
        const renderizarCalendario = () => {
          const ano = mesCalendario.getFullYear();
          const mes = mesCalendario.getMonth();
          const aplicacoes = obterAplicacoesMes();
          const pagamentos = obterPagamentosMes();

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

            setDiaSelecionado(data);
            setAplicacoesDiaSelecionado(aplicacoesDoDia);
            setPagamentosDiaSelecionado(pagamentosDoDia);
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
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
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

                    const hoje = new Date();
                    const eHoje = dia && dia.getDate() === hoje.getDate() &&
                                  dia.getMonth() === hoje.getMonth() &&
                                  dia.getFullYear() === hoje.getFullYear();

                    // Verificar se tem aplicações ou pagamentos para definir cor de fundo
                    const temAplicacoes = aplicacoesDoDia.length > 0;
                    const temPagamentos = pagamentosDoDia.length > 0;

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
                  
                  {/* Pagamentos (parcelados nutricionista-paciente) */}
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
                  
                  {/* Mensagem quando não há nada */}
                  {aplicacoesDiaSelecionado.length === 0 && pagamentosDiaSelecionado.length === 0 && (
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
        // O perfil será mostrado via modal, mas manter placeholder aqui também
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Perfil do Nutricionista</h2>
              <p className="text-gray-600 mb-4">Gerencie suas informações de perfil.</p>
              <button
                onClick={() => setShowPerfilModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Abrir Perfil
              </button>
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

  // Loading state
  if (loading || loadingNutricionista) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  if (!nutricionista) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Sidebar Desktop */}
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
                {sidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
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
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Nutricionista</span>
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
                    <span className="text-xs text-gray-500">{agregadoNutri.count} • {agregadoNutri.media.toFixed(1)}</span>
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
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
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
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
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
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
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
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
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
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
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
        {/* Mobile Header - Only visible on mobile */}
        <div className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1 min-w-0">
              {/* Logo nutricionista, logo verificação, nome e tipo */}
              {nutricionista && (
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-2">
                    <UtensilsCrossed className="h-6 w-6 text-green-600 flex-shrink-0" />
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
        <main className="p-6 bg-gray-50 dark:bg-gray-900">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex items-center justify-around py-2 px-1">
          <button
            onClick={() => setActiveMenu('home')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'home'
                ? 'bg-green-100 text-green-700'
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
                ? 'bg-green-100 text-green-700'
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
                ? 'bg-green-100 text-green-700'
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
                ? 'bg-green-100 text-green-700'
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
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Calendário</span>
          </button>
        </div>
      </div>

      {/* Modal Meu Link */}
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
                      
                      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                      const link = `${baseUrl}/dr/${slugMedico}/${slugNutricionista}`;
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

      {/* Modal Meu Perfil */}
      {showPerfilModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserCircle size={20} className="text-green-600" />
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
              <div className={`p-4 rounded-lg ${nutricionista.isVerificado ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  {nutricionista.isVerificado ? (
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
                  {nutricionista.isVerificado 
                    ? 'Seu perfil foi verificado pelo administrador.'
                    : 'Seu perfil está aguardando verificação. Após a aprovação, você poderá acessar mais funcionalidades.'}
                </p>
              </div>

              {/* Vínculos */}
              {nutricionista.isVerificado && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Médicos vinculados:</strong> {nutricionista.medicoVinculadoIds.length}
                  </p>
                </div>
              )}

              {/* Registro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Registro (CRN - apenas números) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={registroNumero}
                  onChange={(e) => setRegistroNumero(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 312345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
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
                    setModalVisualizacaoEstiloPersonal(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs: 2 abas (estilo Metapersonal mobile) ou 10 abas (desktop) */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {(modalVisualizacaoEstiloPersonal
                ? [
                    { id: 1, nome: 'Dados de Identificação' },
                    { id: 2, nome: 'Dados Clínicos' }
                  ]
                : [
                    { id: 1, nome: 'Dados de Identificação' },
                    { id: 2, nome: 'Dados Clínicos' },
                    { id: 3, nome: 'Exames' },
                    { id: 4, nome: 'Bio Impedância' },
                    { id: 5, nome: 'Evolução/Aplicações' },
                    { id: 6, nome: 'Prescrições' },
                    { id: 7, nome: 'Nutrologia' },
                    { id: 8, nome: 'Personal Trainer' },
                    { id: 9, nome: 'Pagamento' },
                    { id: 10, nome: 'Gráficos' }
                  ]
              ).map((pasta) => (
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

              {/* Aba 3: Exames Laboratoriais */}
              {pastaAtiva === 3 && pacienteVisualizando && (() => {
                const exames = pacienteVisualizando.examesLaboratoriais || [];
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
                  labLimitOverrides
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
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Exames Laboratoriais</h3>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Exame por Data</label>
                        <select
                          value={dataSelecionada}
                          onChange={(e) => setExameDataSelecionadaNoModal(e.target.value)}
                          disabled={examesOrdenados.length === 0}
                          className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 ${examesOrdenados.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        >
                          {examesOrdenados.map((exame: any, idx: number) => {
                            const dataExame = safeDateToString(exame.dataColeta);
                            let dataFormatada = '';
                            if (dataExame) { try { const d = new Date(dataExame); if (!isNaN(d.getTime())) dataFormatada = d.toLocaleDateString('pt-BR'); } catch {} }
                            return <option key={idx} value={dataExame}>{dataFormatada}</option>;
                          })}
                          {examesOrdenados.length === 0 && <option value="">Nenhum exame cadastrado</option>}
                        </select>
                      </div>
                    </div>
                    {examesOrdenados.length === 0 ? (
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
                      patientLabSections.map((secao) => {
                        const camposComValor = secao.fields.filter((c) => campoTemAlgumValor(c.field));
                        if (camposComValor.length === 0) return null;
                        const secaoComExameForaDaFaixa = camposComValor.some((campo) => {
                          const rangeToUse = (getLabRange as any)(
                            campo.key as string,
                            pacienteSex,
                            pacienteVisualizando?.dadosIdentificacao?.dataNascimento,
                            labLimitOverrides
                          );
                          if (!rangeToUse) return false;
                          const min = Number(rangeToUse.min);
                          const max = Number(rangeToUse.max);
                          if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
                          const valor = Number((exameSelecionado as Record<string, unknown>)[campo.field]);
                          if (!Number.isFinite(valor)) return false;
                          return valor < min || valor > max;
                        });
                        return (
                          <div key={secao.sectionId} className="border border-gray-200 rounded-lg p-2.5 text-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full shrink-0 ${secaoComExameForaDaFaixa ? 'bg-red-500' : 'bg-green-500'}`}
                                aria-hidden="true"
                              />
                              <h4 className="font-semibold text-gray-800 text-sm">{secao.section}</h4>
                            </div>
                            {camposComValor.map((campo) => {
                              const rangeToUse = getLabRange(campo.key as string, pacienteSex, pacienteVisualizando?.dadosIdentificacao?.dataNascimento, labLimitOverrides);
                              if (!rangeToUse || rangeToUse.min === undefined || rangeToUse.max === undefined) return null;
                              const value = exameSelecionado[campo.field] as number | undefined;
                              return (
                                <div key={campo.field} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">{rangeToUse.label}</label>
                                    <div className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-gray-50 mb-2">
                                      {value != null ? `${value}${rangeToUse.unit ? ` ${rangeToUse.unit}` : ''}` : '-'}
                                    </div>
                                    <LabRangeBar range={rangeToUse} value={value ?? null} />
                                    {campo.key === 'egfr' && value != null && value < 15 && (
                                      <p className="text-sm text-red-600 mt-1">⚠️ Alerta crítico: eGFR &lt; 15</p>
                                    )}
                                    {campo.key === 'calcitonin' && rangeToUse && value != null && value > rangeToUse.max && (
                                      <p className="text-sm text-red-600 mt-1">⚠️ Alerta MEN2: calcitonina elevada</p>
                                    )}
                                    {['amylase', 'lipase'].includes(campo.key) && rangeToUse && value != null && value > rangeToUse.max && (
                                      <p className="text-sm text-red-600 mt-1">⚠️ Alerta: valor acima do máximo</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Evolução Temporal</label>
                                    {dadosGrafico.length > 0 && dadosGrafico.some((d: any) => d[campo.field] != null) ? (
                                      <TrendLine
                                        data={dadosGrafico}
                                        dataKeys={[{ key: campo.field, name: rangeToUse.label, stroke: '#10b981', dot: true }]}
                                        xKey="data"
                                        height={150}
                                        xAxisLabel="Data"
                                        yAxisLabel={rangeToUse.unit || ''}
                                        formatter={(v: any) => v != null ? `${parseFloat(v).toFixed(1)}` : 'N/A'}
                                        referenceLines={[
                                          { value: rangeToUse.min, label: `Min: ${rangeToUse.min}`, stroke: '#ef4444', strokeDasharray: '5 5' },
                                          { value: rangeToUse.max, label: `Max: ${rangeToUse.max}`, stroke: '#ef4444', strokeDasharray: '5 5' }
                                        ]}
                                      />
                                    ) : (
                                      <div className="h-[150px] flex items-center justify-center border border-gray-200 rounded-md bg-gray-50">
                                        <p className="text-xs text-gray-500">Sem dados históricos</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}

              {/* Aba 4: Bio Impedância - padrão Exames: seções, Detalhes, Novo Registro */}
              {pastaAtiva === 4 && pacienteVisualizando && (() => {
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

              {/* Aba 5: Evolução/Aplicações - supera MetaAdmin: resumo, gráficos integrados, cards ricos */}
              {pastaAtiva === 5 && pacienteVisualizando && (() => {
                const p = pacienteVisualizando;
                const evolucao = p?.evolucaoSeguimento || [];
                const planoTerapeutico = p?.planoTerapeutico;
                const medidasIniciais = p?.dadosClinicos?.medidasIniciais;
                const seguimentoOrdem = [...evolucao].sort((a, b) => ((a.weekIndex ?? 0) - (b.weekIndex ?? 0)));
                const ehSemanaConclusaoStr = (s: string | undefined) => s && s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('semana de conclusao');
                const primeiroRegistro = seguimentoOrdem.find(e => e.weekIndex === 1);
                const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
                const ultimoRegistroComPeso = [...seguimentoOrdem].reverse().find(r => r.peso && r.peso > 0);
                const pesoAtual = ultimoRegistroComPeso?.peso ?? null;
                const variacaoTotal = pesoAtual != null && baselineWeight > 0 ? pesoAtual - baselineWeight : null;
                const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
                const imcAtual = alturaMetros && pesoAtual ? pesoAtual / (alturaMetros * alturaMetros) : null;
                const suggestedSchedule = buildSuggestedDoseSchedule(1, [2.5, 5, 7.5, 10, 12.5, 15], 4);
                const expectedCurve = buildExpectedCurveDoseDrivenAnchored({
                  baselineWeightKg: baselineWeight,
                  doseSchedule: suggestedSchedule,
                  totalWeeks: planoTerapeutico?.numeroSemanasTratamento || 18,
                  targetType: planoTerapeutico?.metas?.weightLossTargetType,
                  targetValue: planoTerapeutico?.metas?.weightLossTargetValue || 0,
                  useAnchorWeek: 18,
                  useAnchorPct: 9.0
                });
                const totalSemanasGrafico = planoTerapeutico?.numeroSemanasTratamento || 18;
                const pesoChartData = expectedCurve.slice(0, totalSemanasGrafico).map((week) => {
                  const registroSemana = evolucao.find(e => e.weekIndex === week.weekIndex);
                  return { semana: week.weekIndex, previsto: week.expectedWeightKg, real: registroSemana?.peso || null };
                });
                const baseCircAbdominal = primeiroRegistro?.circunferenciaAbdominal || medidasIniciais?.circunferenciaAbdominal || 0;
                const circData = expectedCurve.map(week => {
                  const registroSemana = evolucao.find(e => e.weekIndex === week.weekIndex);
                  const previsto = week.expectedCumulativePct != null ? predictWaistCircumference({ baselineWaistCm: baseCircAbdominal, cumulativeWeightLossPct: week.expectedCumulativePct }) : null;
                  return { semana: week.weekIndex, circunferencia: registroSemana?.circunferenciaAbdominal || null, previsto };
                });
                const metaHba1c = planoTerapeutico?.metas?.hba1cTargetType;
                const metaValue = metaHba1c ? parseFloat(metaHba1c.replace('≤', '')) : null;
                const faixaIdealMin = 4.0;
                const faixaIdealMax = metaValue ?? 5.6;
                const hba1cData = expectedCurve.map(week => {
                  const registroSemana = evolucao.find(e => e.weekIndex === week.weekIndex);
                  return { semana: week.weekIndex, hba1c: registroSemana?.hba1c || null, faixaIdealMin, faixaIdealMax };
                });
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
                  if (grau.includes('Grau III')) return 'text-red-700';
                  if (grau.includes('Grau II')) return 'text-orange-600';
                  if (grau.includes('Grau I')) return 'text-amber-600';
                  if (grau === 'Sobrepeso') return 'text-yellow-600';
                  if (grau === 'Peso normal') return 'text-green-600';
                  return 'text-blue-600';
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
                const imcData = expectedCurve.map(week => {
                  const registroSemana = evolucao.find(e => e.weekIndex === week.weekIndex);
                  const pesoReal = registroSemana?.peso || null;
                  const imcReal = alturaMetros && pesoReal ? pesoReal / (alturaMetros * alturaMetros) : null;
                  const imcPrevisto = alturaMetros && week.expectedWeightKg ? week.expectedWeightKg / (alturaMetros * alturaMetros) : null;
                  return { semana: week.weekIndex, imc: imcReal, previsto: imcPrevisto, grau: calcularGrauObesidade(imcReal), grauPrevisto: calcularGrauObesidade(imcPrevisto), indiceGrau: imcParaIndiceGrau(imcReal), indiceGrauPrevisto: imcParaIndiceGrau(imcPrevisto) };
                }).filter(d => d.imc != null || d.previsto != null);
                const grausLabels = ['Abaixo do peso', 'Peso normal', 'Sobrepeso', 'Grau I', 'Grau II', 'Grau III'];
                const startDateStr = planoTerapeutico?.startDate || planoTerapeutico?.dataInicioTratamento || new Date();
                const startDate = new Date(startDateStr);
                return (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução e Aplicações</h3>
                    {evolucao.length > 0 ? (
                      <>
                        {/* Resumo visual - KPIs em destaque */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                            <p className="text-xs font-medium text-emerald-800 mb-1">Aplicações</p>
                            <p className="text-2xl font-bold text-emerald-900">{evolucao.length}</p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                            <p className="text-xs font-medium text-blue-800 mb-1">Peso inicial</p>
                            <p className="text-2xl font-bold text-blue-900">{baselineWeight > 0 ? `${baselineWeight.toFixed(1)} kg` : '-'}</p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                            <p className="text-xs font-medium text-purple-800 mb-1">Peso atual</p>
                            <p className="text-2xl font-bold text-purple-900">{pesoAtual != null ? `${pesoAtual.toFixed(1)} kg` : '-'}</p>
                          </div>
                          <div className={`rounded-xl p-4 border ${variacaoTotal != null && variacaoTotal < 0 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : variacaoTotal != null && variacaoTotal > 0 ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                            <p className="text-xs font-medium text-gray-800 mb-1">Variação total</p>
                            <p className={`text-2xl font-bold ${variacaoTotal != null && variacaoTotal < 0 ? 'text-green-900' : variacaoTotal != null && variacaoTotal > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                              {variacaoTotal != null ? `${variacaoTotal > 0 ? '+' : ''}${variacaoTotal.toFixed(1)} kg` : '-'}
                            </p>
                          </div>
                        </div>
                        {/* Gráficos integrados com tabs */}
                        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                          <div className="flex border-b border-gray-200 overflow-x-auto">
                            {(['peso', 'circunferencia', 'hba1c', 'imc'] as const).map((k) => (
                              <button key={k} onClick={() => setGraficoAtivoEvolucao(k)} className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium transition-colors ${graficoAtivoEvolucao === k ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                                {k === 'peso' ? '📊 Peso' : k === 'circunferencia' ? '📏 Circunferência' : k === 'hba1c' ? '🩸 HbA1c' : '📈 IMC'}
                              </button>
                            ))}
                          </div>
                          <div className="p-6">
                            {graficoAtivoEvolucao === 'peso' && (baselineWeight > 0 ? (
                              <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={pesoChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="semana" label={{ value: 'Semana', position: 'bottom' }} />
                                    <YAxis domain={[Math.max(0, baselineWeight - 20), baselineWeight + 20]} label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip formatter={(v: any) => v != null ? `${Number(v).toFixed(1)} kg` : 'N/A'} labelFormatter={(l) => `Semana ${l}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="previsto" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" name="Previsto" dot={{ r: 2 }} />
                                    <Line type="monotone" dataKey="real" stroke="#10b981" strokeWidth={2} name="Real" dot={{ r: 4 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            ) : <div className="py-8 text-center text-amber-700 bg-amber-50 rounded-lg">Peso inicial necessário para exibir o gráfico.</div>)}
                            {graficoAtivoEvolucao === 'circunferencia' && (baseCircAbdominal > 0 ? (
                              <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={circData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="semana" />
                                    <YAxis domain={[Math.max(0, baseCircAbdominal - 20), baseCircAbdominal + 20]} />
                                    <Tooltip formatter={(v: any) => v != null ? `${Number(v).toFixed(1)} cm` : 'N/A'} />
                                    <Legend />
                                    <Line type="monotone" dataKey="circunferencia" stroke="#f59e0b" strokeWidth={2} name="Circunferência" dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="previsto" stroke="#6366f1" strokeDasharray="5 5" name="Previsto" dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            ) : <div className="py-8 text-center text-amber-700 bg-amber-50 rounded-lg">Circunferência inicial necessária.</div>)}
                            {graficoAtivoEvolucao === 'hba1c' && (
                              <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={hba1cData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="semana" />
                                    <YAxis />
                                    <Tooltip formatter={(v: any) => v != null ? `${Number(v).toFixed(1)}%` : 'N/A'} />
                                    <Legend />
                                    <Line type="monotone" dataKey="hba1c" stroke="#8b5cf6" strokeWidth={2} name="HbA1c" dot={{ r: 4 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            {graficoAtivoEvolucao === 'imc' && (alturaMetros && imcData.length > 0 ? (
                              <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={imcData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="semana" />
                                    <YAxis domain={[0, 5]} tickFormatter={(v) => grausLabels[Math.round(v)] ?? ''} ticks={[0, 1, 2, 3, 4, 5]} width={120} />
                                    <Tooltip formatter={(v: any, name: string, props: any) => [props.payload.imc != null ? `${props.payload.imc.toFixed(1)} kg/m² - ${props.payload.grau || ''}` : 'N/A', 'IMC Real']} />
                                    <Legend />
                                    <Line type="monotone" dataKey="indiceGrauPrevisto" stroke="#6366f1" strokeDasharray="5 5" name="IMC Previsto" dot={{ r: 2 }} />
                                    <Line type="monotone" dataKey="indiceGrau" stroke="#10b981" strokeWidth={2} name="IMC Real" dot={{ r: 4 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            ) : <div className="py-8 text-center text-amber-700 bg-amber-50 rounded-lg">Altura e registros com peso necessários.</div>)}
                          </div>
                        </div>
                        {/* Timeline: metade calendário, metade cards semanais */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Timeline Semanal</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[420px]">
                            {/* Calendário - metade esquerda */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col h-full">
                              {(() => {
                                const startDateCal = new Date(startDate);
                                startDateCal.setHours(0, 0, 0, 0);
                                const toDate = (v: any): Date => { const d = v?.toDate ? v.toDate() : v ? new Date(v) : new Date(); d.setHours(0, 0, 0, 0); return d; };
                                const hoje = new Date();
                                hoje.setHours(0, 0, 0, 0);
                                const totalSemanas = Math.max(planoTerapeutico?.numeroSemanasTratamento || 18, ...(evolucao.length ? evolucao.map(e => e.weekIndex ?? 0) : [0]));
                                const infoPorData = new Map<string, { weekIndex: number; status: 'aplicado' | 'nao_preencheu' | 'futuro' | 'concluido' }>();
                                for (let w = 1; w <= totalSemanas; w++) {
                                  const registro = evolucao.find(e => (e.weekIndex ?? 0) === w);
                                  let d: Date;
                                  let status: 'aplicado' | 'nao_preencheu' | 'futuro' | 'concluido';
                                  const ehSemanaConclusao = ehSemanaConclusaoStr(registro?.comentarioMedico);
                                  if (ehSemanaConclusao) {
                                    d = registro?.doseAplicada?.data ? toDate(registro.doseAplicada.data) : (() => { const x = new Date(startDateCal.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000); x.setHours(0, 0, 0, 0); return x; })();
                                    status = 'concluido';
                                  } else if (registro?.doseAplicada?.data) {
                                    d = toDate(registro.doseAplicada.data);
                                    status = 'aplicado';
                                  } else {
                                    d = new Date(startDateCal.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);
                                    d.setHours(0, 0, 0, 0);
                                    if (registro && (registro.adherence === 'MISSED' || registro.adesao === 'esquecida')) {
                                      status = 'nao_preencheu';
                                    } else if (d.getTime() < hoje.getTime()) {
                                      status = 'nao_preencheu';
                                    } else {
                                      status = 'futuro';
                                    }
                                  }
                                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                  infoPorData.set(key, { weekIndex: w, status });
                                }
                                const ano = mesCalendarioTimeline.getFullYear();
                                const mes = mesCalendarioTimeline.getMonth();
                                const primeiroDia = new Date(ano, mes, 1);
                                const ultimoDia = new Date(ano, mes + 1, 0);
                                const diasNoMes = ultimoDia.getDate();
                                const diaSemanaInicio = primeiroDia.getDay();
                                const diaSemanaAjustado = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
                                const diasCalendario: (number | null)[] = [];
                                for (let i = 0; i < diaSemanaAjustado; i++) diasCalendario.push(null);
                                for (let di = 1; di <= diasNoMes; di++) diasCalendario.push(di);
                                const obterInfoDia = (dia: number) => infoPorData.get(`${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
                                return (
                                  <>
                                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                      <h5 className="text-sm font-semibold text-gray-900">
                                        {mesCalendarioTimeline.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                      </h5>
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => setMesCalendarioTimeline(new Date(mesCalendarioTimeline.getFullYear(), mesCalendarioTimeline.getMonth() - 1))} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Mês anterior">
                                          <ChevronLeft className="h-4 w-4 text-gray-700" />
                                        </button>
                                        <button onClick={() => setMesCalendarioTimeline(new Date())} className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Hoje</button>
                                        <button onClick={() => setMesCalendarioTimeline(new Date(mesCalendarioTimeline.getFullYear(), mesCalendarioTimeline.getMonth() + 1))} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Próximo mês">
                                          <ChevronRight className="h-4 w-4 text-gray-700" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5 mb-1 flex-shrink-0">
                                      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((diaSem) => (
                                        <div key={diaSem} className="text-center text-xs font-semibold text-gray-700 py-1">{diaSem}</div>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
                                      {diasCalendario.map((dia, idx) => {
                                        if (dia === null) return <div key={idx} />;
                                        const info = obterInfoDia(dia);
                                        return (
                                          <div key={idx} className="flex flex-col items-center justify-center gap-0.5">
                                            <span className="text-xs font-medium text-gray-800">{dia}</span>
                                            {info ? (
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                                                info.status === 'aplicado' ? 'bg-green-500 text-white' :
                                                info.status === 'concluido' ? 'bg-purple-500 text-white' :
                                                info.status === 'nao_preencheu' ? 'bg-red-500 text-white' :
                                                'bg-blue-500 text-white'
                                              }`} title={info.status === 'aplicado' ? 'Aplicado' : info.status === 'concluido' ? 'Concluído' : info.status === 'nao_preencheu' ? 'Não preenchido' : 'Futuro'}>
                                                Sem {info.weekIndex}
                                              </span>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3 mt-2 pt-2 border-t border-gray-200 flex-shrink-0">
                                      <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-3 rounded bg-green-500" /> Aplicado</span>
                                      <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-3 rounded bg-purple-500" /> Concluído</span>
                                      <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-3 rounded bg-red-500" /> Não preenchido</span>
                                      <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-3 rounded bg-blue-500" /> Futuro</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            {/* Cards semanais - metade direita */}
                            <div className="h-full overflow-y-auto pr-2 space-y-3">
                            {seguimentoOrdem.map((registro, idx) => {
                              const expectedWeek = expectedCurve.find(e => e.weekIndex === registro.weekIndex);
                              const varianceKg = registro.peso && baselineWeight > 0 ? registro.peso - baselineWeight : null;
                              const weekStart = new Date(startDate.getTime() + ((registro.weekIndex ?? 1) - 1) * 7 * 24 * 60 * 60 * 1000);
                              const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                              const isMissed = registro.adherence === 'MISSED' || registro.adesao === 'esquecida';
                              return (
                                <div key={registro.id || `${registro.weekIndex}-${idx}`} className={`border-2 rounded-xl p-4 bg-white ${
                                  isMissed && !registro.doseAplicada ? 'border-l-4 border-l-red-500 bg-red-50/50' : idx % 2 === 0 ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-500'
                                }`}>
                                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                    <div>
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="font-bold text-gray-900">Semana {registro.weekIndex ?? '-'}</span>
                                        {ehSemanaConclusaoStr(registro.comentarioMedico) && (
                                          <span className="text-purple-600">- Semana de Conclusão</span>
                                        )}
                                        <span className="text-xs text-gray-500">({weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} a {weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })})</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {ehSemanaConclusaoStr(registro.comentarioMedico) && (
                                          <button
                                            onClick={() => {
                                              setRegistroConclusaoParaModal({
                                                weekIndex: registro.weekIndex ?? 0,
                                                weekStart,
                                                weekEnd,
                                                peso: registro.peso,
                                                pacienteNome: pacienteVisualizando?.nome || pacienteVisualizando?.dadosIdentificacao?.nomeCompleto
                                              });
                                              setShowModalDetalheConclusao(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                          >
                                            <CheckCircle size={14} />
                                            Concluído — clique para detalhes
                                          </button>
                                        )}
                                        {registro.doseAplicada ? (
                                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">💉 Dose {registro.doseAplicada.quantidade} mg</span>
                                        ) : isMissed ? (
                                          <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">⚠️ Semana Pulada</span>
                                        ) : null}
                                      </div>
                                    </div>
                                    {expectedWeek && registro.peso && (
                                      <div className="flex-shrink-0"><ProgressPill varianceKg={varianceKg} expectedWeight={expectedWeek.expectedWeightKg} actualWeight={registro.peso} /></div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
                                    <div><span className="text-xs text-gray-500 block">Peso</span><span className="text-sm font-semibold">{registro.peso != null ? `${registro.peso} kg` : '-'}</span></div>
                                    <div><span className="text-xs text-gray-500 block">Circunferência</span><span className="text-sm font-semibold">{registro.circunferenciaAbdominal != null ? `${registro.circunferenciaAbdominal} cm` : '-'}</span></div>
                                    <div>
                                      <span className="text-xs text-gray-500 block">Adesão</span>
                                      {ehSemanaConclusaoStr(registro.comentarioMedico) ? (
                                        <button
                                          onClick={() => {
                                            setRegistroConclusaoParaModal({
                                              weekIndex: registro.weekIndex ?? 0,
                                              weekStart,
                                              weekEnd,
                                              peso: registro.peso,
                                              pacienteNome: pacienteVisualizando?.nome || pacienteVisualizando?.dadosIdentificacao?.nomeCompleto
                                            });
                                            setShowModalDetalheConclusao(true);
                                          }}
                                          className="text-sm font-semibold text-purple-600 hover:underline cursor-pointer flex items-center gap-1"
                                        >
                                          <CheckCircle size={14} /> Concluído
                                        </button>
                                      ) : (
                                        <span className={`text-sm font-semibold ${registro.adherence === 'ON_TIME' || registro.adesao === 'pontual' ? 'text-green-600' : registro.adherence === 'MISSED' || registro.adesao === 'esquecida' ? 'text-red-600' : 'text-yellow-600'}`}>
                                          {registro.adherence === 'ON_TIME' ? '⏰ Pontual' : registro.adherence === 'LATE_<96H' ? '⚠️ Atrasada' : registro.adherence === 'MISSED' ? '❌ Perdida' : registro.adesao === 'pontual' ? '⏰ Pontual' : registro.adesao === 'atrasada' ? '⚠️ Atrasada' : registro.adesao === 'esquecida' ? '❌ Perdida' : '-'}
                                        </span>
                                      )}
                                    </div>
                                    <div><span className="text-xs text-gray-500 block">Efeitos GI</span><span className={`text-sm font-semibold ${registro.giSeverity === 'LEVE' ? 'text-green-600' : registro.giSeverity === 'MODERADO' ? 'text-yellow-600' : registro.giSeverity === 'GRAVE' ? 'text-red-600' : 'text-gray-500'}`}>
                                      {registro.giSeverity === 'LEVE' ? '✅ Leve' : registro.giSeverity === 'MODERADO' ? '⚠️ Moderado' : registro.giSeverity === 'GRAVE' ? '❌ Grave' : '-'}
                                    </span></div>
                                  </div>
                                  {registro.alerts && registro.alerts.length > 0 && <div className="mt-2"><AlertBadges alerts={registro.alerts} /></div>}
                                  {(registro.observacoesPaciente || registro.comentarioMedico) && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm">
                                      {registro.observacoesPaciente && <p><span className="font-medium text-gray-600">Paciente:</span> {registro.observacoesPaciente}</p>}
                                      {registro.comentarioMedico && (
                                        <p>
                                          <span className="font-medium text-blue-600">Médico: </span>
                                          {ehSemanaConclusaoStr(registro.comentarioMedico) ? (
                                            <button
                                              onClick={() => {
                                                setRegistroConclusaoParaModal({
                                                  weekIndex: registro.weekIndex ?? 0,
                                                  weekStart,
                                                  weekEnd,
                                                  peso: registro.peso,
                                                  pacienteNome: pacienteVisualizando?.nome || pacienteVisualizando?.dadosIdentificacao?.nomeCompleto
                                                });
                                                setShowModalDetalheConclusao(true);
                                              }}
                                              className="text-purple-600 hover:underline font-medium cursor-pointer"
                                            >
                                              Semana de Conclusão — clique para detalhes
                                            </button>
                                          ) : (
                                            <span>{registro.comentarioMedico}</span>
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button onClick={() => setPastaAtiva(9)} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-200 transition-colors">
                            <BarChart3 size={18} /> Ver mais gráficos (aba Gráficos)
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl">
                        <Syringe className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma aplicação registrada</h4>
                        <p className="text-sm text-gray-600 max-w-md mx-auto">Os registros de acompanhamento semanal (peso, dose aplicada, circunferência) aparecerão aqui quando forem cadastrados pelo médico responsável.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Aba 6: Prescrições - usa pacientePrescricoesSelecionado (sincronizado com pacienteVisualizando na aba 6) */}
              {pastaAtiva === 6 && pacienteVisualizando && nutricionista && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Prescrições</h3>
                    <div className="flex gap-2">
                      <button onClick={() => { setNovaPrescricaoContexto('desktop'); setShowModalGrupoNovaPrescricao(true); }} className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 flex items-center gap-2">
                        <Plus size={16} /> Nova Prescrição
                      </button>
                      <button onClick={() => loadPrescricoesModal(pacienteVisualizando)} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2">
                        <RefreshCw size={16} /> Atualizar
                      </button>
                    </div>
                  </div>
                  {loadingPrescricoesModal ? (
                    <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div><p className="mt-2 text-gray-600">Carregando prescrições...</p></div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Lista Prescrições Salvas - esquerda */}
                      <div className="lg:col-span-1 space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Prescrições Salvas</h4>
                        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                          {(!prescricoesModal || prescricoesModal.length === 0) ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                              <p className="text-sm text-gray-500">Nenhuma prescrição cadastrada ainda.</p>
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
                                          setPrescricaoEditandoModal(paraEditar);
                                          setNovaPrescricaoModal({ nome: paraEditar.nome, descricao: paraEditar.descricao || '', itens: paraEditar.itens || [], observacoes: paraEditar.observacoes || '' });
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
                      </div>
                      {/* Descrição / Editor - direita (2 cols) */}
                      <div className="lg:col-span-2">
                        {prescricaoSelecionadaModal ? (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
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
                                    const data: any = prescricaoEditandoModal && !prescricaoEditandoModal.isTemplate && !isTemp ? { ...prescricaoEditandoModal, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, atualizadoEm: new Date() } : { medicoId: nutricionista.userId, pacienteId: pacienteVisualizando?.id, pacienteNome: pacienteVisualizando?.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, criadoEm: new Date(), atualizadoEm: new Date(), criadoPor: user?.email || '', isTemplate: false, pesoPaciente: peso };
                                    const id = await PrescricaoService.createOrUpdatePrescricao(data);
                                    if (isTemp) setPrescricoesModal(prev => prev.filter(x => x.id !== 'temp-new'));
                                    if (pacienteVisualizando) await loadPrescricoesModal(pacienteVisualizando);
                                    if (id) { const [tpl, prescricoes] = await Promise.all([PrescricaoService.getPrescricoesTemplate(), PrescricaoService.getPrescricoesByMedico(nutricionista.userId)]); const todas = [...tpl, ...prescricoes.filter(x => !x.pacienteId || x.pacienteId === pacienteVisualizando?.id)]; const salva = todas.find(x => x.id === id); if (salva) { setPrescricaoSelecionadaModal(salva); setPrescricaoEditandoModal(salva); setNovaPrescricaoModal({ nome: salva.nome, descricao: salva.descricao || '', itens: salva.itens || [], observacoes: salva.observacoes || '' }); } }
                                    alert(isTemp || !prescricaoEditandoModal ? 'Prescrição criada!' : 'Prescrição atualizada!');
                                  } catch (e) { console.error(e); alert('Erro ao salvar'); }
                                }} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"><Save size={16} /> Salvar</button>
                                <button onClick={async () => { if (!pacienteVisualizando || !novaPrescricaoModal.itens?.length || !nutricionista) return; try { const pesoReal = pacienteVisualizando.dadosClinicos?.medidasIniciais?.peso ?? pacienteVisualizando.evolucaoSeguimento?.[(pacienteVisualizando.evolucaoSeguimento?.length ?? 0) - 1]?.peso; let itensPrint = novaPrescricaoModal.itens || []; if (prescricaoSelecionadaModal?.isTemplate && pesoReal) { itensPrint = itensPrint.map((item) => { if (item.medicamento === 'Whey Protein') { const total = (pesoReal * 1.6).toFixed(1), porRef = (pesoReal * 1.6 / 3).toFixed(1); return { ...item, dosagem: `${total}g por dia (1,6g por kg)`, instrucoes: `Tomar ~${porRef}g 3x ao dia (total ${total}g/dia).`, quantidade: `${total}g/dia` }; } if (item.medicamento === 'Creatina MAX' || (item.medicamento || '').includes('Creatina')) return { ...item, dosagem: '3,5g por dia', instrucoes: '3,5g/dia em 200ml de água.', quantidade: '3,5g/dia' }; return item; }); } const doc = new jsPDF(); const dark = [44, 62, 80]; const titulo = (nutricionista as any).genero === 'F' ? 'Dra.' : 'Dr.'; doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark); doc.text(`${titulo} ${nutricionista.nome || 'Nutricionista'}`, 20, 15); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`CRN-${(nutricionista as any).registroNumero || '00000'}`, 20, 22); doc.setDrawColor(200, 200, 200); doc.line(20, 28, 190, 28); let y = 40; doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('PRESCRIÇÃO NUTRICIONAL', 20, y); y += 10; doc.setFontSize(10); doc.setFont('helvetica', 'normal'); const pacNome = pacienteVisualizando.dadosIdentificacao?.nomeCompleto || pacienteVisualizando.nome || 'Paciente'; doc.text(`Paciente: ${pacNome}`, 20, y); y += 6; if (pesoReal) { doc.text(`Peso: ${pesoReal.toFixed(1)} kg`, 20, y); y += 6; } y += 5; doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(novaPrescricaoModal.nome, 20, y); y += 8; if (novaPrescricaoModal.descricao) { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); const dl = doc.splitTextToSize(novaPrescricaoModal.descricao, 170); doc.text(dl, 20, y); y += dl.length * 5 + 5; } doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('MEDICAMENTOS/SUPLEMENTOS:', 20, y); y += 8; itensPrint.forEach((item) => { if (y > 270) { doc.addPage(); y = 20; } doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(`${item.medicamento}`, 25, y); y += 6; doc.setFont('helvetica', 'normal'); doc.text(`   Dosagem: ${item.dosagem}`, 25, y); y += 5; doc.text(`   Frequência: ${item.frequencia}`, 25, y); const il = doc.splitTextToSize(`   ${item.instrucoes}`, 165); doc.text(il, 25, y); y += il.length * 5 + 3; if (item.quantidade) { doc.text(`   Quantidade: ${item.quantidade}`, 25, y); y += 5; } y += 3; }); if (novaPrescricaoModal.observacoes) { if (y > 250) { doc.addPage(); y = 20; } y += 5; doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('OBSERVAÇÕES:', 20, y); y += 6; doc.setFont('helvetica', 'normal'); const obsLines = doc.splitTextToSize(novaPrescricaoModal.observacoes, 170); doc.text(obsLines, 20, y); y += obsLines.length * 5; } doc.save(`prescricao_${pacNome}_${new Date().toISOString().split('T')[0]}.pdf`); } catch (er) { console.error(er); alert('Erro ao gerar PDF'); } }} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"><Printer size={16} /> Imprimir</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 mb-2">Clique em uma prescrição na lista para ver e editar a descrição.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Aba 7: Nutrologia - área do nutricionista */}
              {pastaAtiva === 7 && pacienteVisualizando && (
                <div className="min-h-[400px] -m-4 sm:-m-6 rounded-xl overflow-hidden border border-emerald-200/60 bg-gradient-to-b from-emerald-50/50 to-white">
                  {/* Header da área nutricionista */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
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
                  {/* Conteúdo */}
                  <div className="p-4 sm:p-6">
                    <NutriContent paciente={pacienteVisualizando} setPaciente={(p: PacienteCompleto) => setPacienteVisualizando(p)} modoNutricionista />
                  </div>
                </div>
              )}

              {/* Aba 8: Personal Trainer */}
              {pastaAtiva === 8 && pacienteVisualizando && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Treinos com Personal Trainer</h3>
                  <CalendarioTreinosPersonal
                    patientId={pacienteVisualizando?.userId}
                    pacienteId={pacienteVisualizando?.id}
                    wideRange
                  />
                </div>
              )}

              {/* Aba 9: Pagamento - usa pacientePagamentoSelecionado e dadosPagamento (sincronizados na aba 9) */}
              {pastaAtiva === 9 && pacienteVisualizando && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Controle de Pagamento</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status do Pagamento</label>
                    <select value={dadosPagamento.statusPagamento} onChange={(e) => setDadosPagamento({ ...dadosPagamento, statusPagamento: e.target.value as PagamentoPaciente['statusPagamento'], dataPagamento: e.target.value === 'pago' ? new Date() : undefined })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="negociacao">Em Negociação</option>
                      <option value="iniciou_pagamento">Iniciou Pagamento</option>
                      <option value="em_aberto">Em Aberto</option>
                      <option value="pago">Pago</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                    <select value={dadosPagamento.formaPagamento || ''} onChange={(e) => setDadosPagamento({ ...dadosPagamento, formaPagamento: e.target.value ? e.target.value as 'a_vista' | 'dividido' | 'cartao' : null, parcelas: (e.target.value === 'dividido' || e.target.value === 'cartao') ? dadosPagamento.parcelas || [] : [] })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Selecione...</option>
                      <option value="a_vista">À Vista</option>
                      <option value="dividido">Dividido (Parcelado)</option>
                      <option value="cartao">Cartão</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Valor Total (R$)</label><input type="number" step="0.01" value={dadosPagamento.valorTotal || ''} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setDadosPagamento({ ...dadosPagamento, valorTotal: v, valorPendente: v - (dadosPagamento.valorPago || 0) }); }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="0.00" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Pago (R$)</label><input type="number" step="0.01" value={dadosPagamento.valorPago || ''} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setDadosPagamento({ ...dadosPagamento, valorPago: v, valorPendente: (dadosPagamento.valorTotal || 0) - v }); }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="0.00" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Em Aberto (R$)</label><div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">{(dadosPagamento.valorPendente ?? 0).toFixed(2)}</div></div>
                  </div>
                  <button onClick={async () => { if (!user || !pacienteVisualizando) return; try { await PagamentoService.salvarPagamentoNutricionistaPaciente(user.uid, pacienteVisualizando.id, { statusPagamento: dadosPagamento.statusPagamento, formaPagamento: dadosPagamento.formaPagamento, valorTotal: dadosPagamento.valorTotal, valorPago: dadosPagamento.valorPago, valorPendente: dadosPagamento.valorPendente, parcelas: dadosPagamento.parcelas || [], observacoes: dadosPagamento.observacoes, dataUltimaAtualizacao: new Date(), dataVencimento: dadosPagamento.dataVencimento, dataPagamento: dadosPagamento.dataPagamento }); await loadPagamentos(pacientesVisiveis.map(p => p.paciente)); alert('Pagamento salvo com sucesso!'); } catch (e) { console.error(e); alert('Erro ao salvar pagamento'); } }} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                    <Save size={18} /> Salvar Pagamento
                  </button>
                </div>
              )}

              {/* Aba 10: Gráficos - reutiliza lógica do modal com pacienteVisualizando */}
              {pastaAtiva === 10 && pacienteVisualizando && (() => {
                const p = pacienteVisualizando;
                const evolucao = p?.evolucaoSeguimento || [];
                const planoTerapeutico = p?.planoTerapeutico;
                const medidasIniciais = p?.dadosClinicos?.medidasIniciais;
                const seguimentoOrdem = [...evolucao].sort((a, b) => new Date(a.dataRegistro as any).getTime() - new Date(b.dataRegistro as any).getTime());
                const ultimas4Semanas = seguimentoOrdem.slice(-4);
                const primeiroRegistro = seguimentoOrdem.find(e => e.weekIndex === 1);
                const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
                const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
                const schedule = (planoTerapeutico as any)?.doseSchedule || buildSuggestedDoseSchedule(1, [2.5, 5, 7.5, 10, 12.5, 15], 4);
                const expectedCurve = buildExpectedCurveDoseDrivenAnchored({ baselineWeightKg: baselineWeight, doseSchedule: schedule, totalWeeks: planoTerapeutico?.numeroSemanasTratamento || 18, targetType: planoTerapeutico?.metas?.weightLossTargetType, targetValue: planoTerapeutico?.metas?.weightLossTargetValue || 0 });
                const pesoChartData = ultimas4Semanas.map((s) => ({ semana: s.weekIndex, previsto: expectedCurve.find(e => e.weekIndex === s.weekIndex)?.expectedWeightKg ?? null, real: s.peso ?? null }));
                const baseCirc = primeiroRegistro?.circunferenciaAbdominal || medidasIniciais?.circunferenciaAbdominal || 0;
                const circData = ultimas4Semanas.map((s) => {
                  const ew = expectedCurve.find(e => e.weekIndex === s.weekIndex);
                  const pct = ew?.expectedCumulativePct;
                  return { semana: s.weekIndex, circunferencia: s.circunferenciaAbdominal ?? null, previsto: pct != null ? predictWaistCircumference({ baselineWaistCm: baseCirc, cumulativeWeightLossPct: pct }) : null };
                });
                const hba1cData = ultimas4Semanas.map((s) => ({ semana: s.weekIndex, hba1c: s.hba1c ?? null }));
                const imcChartData = alturaMetros ? ultimas4Semanas.map((s) => ({ semana: s.weekIndex, imc: s.peso && alturaMetros ? s.peso / (alturaMetros * alturaMetros) : null })) : [];
                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Gráficos de Evolução</h3>
                    <div className="flex gap-2 mb-4">
                      {(['peso', 'circunferencia', 'hba1c', 'imc'] as const).map((k) => (
                        <button key={k} onClick={() => setGraficoAtivo(k)} className={`px-3 py-1.5 text-sm rounded-md ${graficoAtivo === k ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                          {k === 'peso' ? 'Peso' : k === 'circunferencia' ? 'Circunferência' : k === 'hba1c' ? 'HbA1c' : 'IMC'}
                        </button>
                      ))}
                    </div>
                    <div className="h-72">
                      {graficoAtivo === 'peso' && pesoChartData.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={pesoChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="semana" />
                            <YAxis />
                            <Tooltip formatter={(v: any) => v != null ? `${Number(v).toFixed(1)} kg` : 'N/A'} />
                            <Legend />
                            <Line type="monotone" dataKey="real" stroke="#10b981" name="Real" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="previsto" stroke="#6366f1" strokeDasharray="5 5" name="Previsto" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      {graficoAtivo === 'circunferencia' && circData.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={circData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="semana" />
                            <YAxis />
                            <Tooltip formatter={(v: any) => v != null ? `${Number(v).toFixed(1)} cm` : 'N/A'} />
                            <Legend />
                            <Line type="monotone" dataKey="circunferencia" stroke="#f59e0b" name="Circunferência" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="previsto" stroke="#6366f1" strokeDasharray="5 5" name="Previsto" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      {graficoAtivo === 'hba1c' && hba1cData.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={hba1cData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="semana" />
                            <YAxis />
                            <Tooltip formatter={(v: any) => v != null ? `${Number(v).toFixed(1)}%` : 'N/A'} />
                            <Legend />
                            <Line type="monotone" dataKey="hba1c" stroke="#8b5cf6" name="HbA1c" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      {graficoAtivo === 'imc' && imcChartData.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={imcChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="semana" />
                            <YAxis />
                            <Tooltip formatter={(v: any) => v != null ? `${Number(v).toFixed(1)}` : 'N/A'} />
                            <Legend />
                            <Line type="monotone" dataKey="imc" stroke="#ec4899" name="IMC" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      {((graficoAtivo === 'peso' && pesoChartData.length === 0) || (graficoAtivo === 'circunferencia' && circData.length === 0) || (graficoAtivo === 'hba1c' && hba1cData.length === 0) || (graficoAtivo === 'imc' && imcChartData.length === 0)) && (
                        <div className="h-full flex items-center justify-center text-gray-500">Sem dados para exibir neste gráfico.</div>
                      )}
                    </div>
                  </div>
                );
              })()}
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
        const calcularGrauObesidade = (imc: number | null | undefined): string | null => {
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
          
          const grauReal = calcularGrauObesidade(imcReal);
          const grauPrevisto = calcularGrauObesidade(imcPrevisto);
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
        // Usar IMC arredondado para exibição e barra - garante que valor e posição batam
        const imcParaExibicao = imcParaCard && imcParaCard > 0 ? Math.round(imcParaCard * 10) / 10 : null;
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
        
        const classificacaoIMC = classificarIMC(imcParaExibicao);

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
                      {imcParaExibicao && imcParaExibicao > 0 && (
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
                                left: `${calcularPosicaoMarcador(imcParaExibicao)}%`,
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
                      
                      {(!imcParaExibicao || imcParaExibicao === 0) && (
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
          labLimitOverrides
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

                    return (
                      <div key={secao.sectionId} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Cabeçalho da seção */}
                        <button
                          onClick={() => toggleSecao(secaoKey)}
                          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${secaoComExameForaDaFaixa ? 'bg-red-500' : 'bg-green-500'}`}
                              aria-hidden="true"
                            />
                            <h4 className="font-semibold text-black text-left text-sm">
                              {secao.section}
                            </h4>
                          </div>
                          {isSecaoExpandida ? (
                            <ChevronUp className="w-4 h-4 text-black" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-black" />
                          )}
                        </button>
                        
                        {/* Conteúdo da seção */}
                        {isSecaoExpandida && (
                          <div className="p-2.5 space-y-2">
                            {camposComValor.map((campo) => {
                              const range = getLabRange(campo.key as string, pacienteSex, pacienteExamesSelecionado?.dadosIdentificacao?.dataNascimento, labLimitOverrides);
                              if (!range) return null;
                              
                              const value = exameSelecionado[campo.field] as number | undefined;
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
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal de Bio Impedância - Tela Cheia (mobile: mantém barra de menu inferior) */}
      {showModalBioImpedancia && pacienteBioImpedanciaSelecionado && (
        <div className="fixed top-0 left-0 right-0 bottom-16 lg:bottom-0 bg-white z-[70] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                  Bio Impedância
                </h2>
                <p className="text-sm text-gray-600">
                  Paciente: {pacienteBioImpedanciaSelecionado.nome}
                </p>
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
                    <h4 className="font-semibold text-gray-800 mb-2 text-xs">{LAB_SECTION_LABELS_PT[secaoKey] || secaoKey}</h4>
                    <div className="space-y-2">
                      {campoKeys.map((campoKey) => {
                        const field = keyToField[campoKey];
                        if (!field) return null;
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
                      await PagamentoService.salvarPagamentoNutricionistaPaciente(
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
      {showModalPrescricoes && pacientePrescricoesSelecionado && nutricionista && (
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
              {/* Body - scrollável: altura fixa, largura total do modal */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full px-4 py-4 overscroll-contain">
                {loadingPrescricoesModal ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando prescrições...</p>
                  </div>
                ) : abaPrescricoesModal === 'salvas' ? (
                  /* Aba Prescrições Salvas: lista agrupada por subtipo (mobile: maior, largura total) */
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
                                const data: Omit<Prescricao, 'id'> | Prescricao = prescricaoEditandoModal && !prescricaoEditandoModal.isTemplate && !isTemp
                                  ? { ...prescricaoEditandoModal, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, atualizadoEm: new Date() }
                                  : { medicoId: nutricionista.userId, pacienteId: pacientePrescricoesSelecionado.id, pacienteNome: pacientePrescricoesSelecionado.nome, nome: novaPrescricaoModal.nome, descricao: novaPrescricaoModal.descricao, itens: novaPrescricaoModal.itens, observacoes: novaPrescricaoModal.observacoes, criadoEm: new Date(), atualizadoEm: new Date(), criadoPor: user?.email || '', isTemplate: false, pesoPaciente: peso ?? undefined };
                                const id = await PrescricaoService.createOrUpdatePrescricao(data);
                                if (isTemp) setPrescricoesModal(prev => prev.filter(x => x.id !== 'temp-new'));
                                await loadPrescricoesModal(pacientePrescricoesSelecionado);
                                if (id) {
                                  const [tpl, prescricoes] = await Promise.all([PrescricaoService.getPrescricoesTemplate(), PrescricaoService.getPrescricoesByMedico(nutricionista.userId)]);
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
              <div className="flex-shrink-0 bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <UtensilsCrossed className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {pacienteNutriSelecionado.dadosIdentificacao?.nomeCompleto || pacienteNutriSelecionado.nome || 'Paciente'}
                  </h3>
                  <span className="text-sm text-gray-500 hidden sm:inline">Acompanhamento Nutricional</span>
                </div>
                <button
                  onClick={() => { setShowModalNutri(false); setPacienteNutriSelecionado(null); }}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <NutriContent
                    paciente={pacienteNutriSelecionado}
                    setPaciente={(p: PacienteCompleto) => setPacienteNutriSelecionado(p)}
                    modoNutricionista
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personal Trainer — mobile: não cobre a barra de menu inferior (bottom-16) */}
      {showModalPersonal && pacientePersonalSelecionado && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-stretch justify-center px-0 py-0 text-center sm:block sm:min-h-screen sm:p-0">
            <div className="fixed inset-0 bottom-16 lg:bottom-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModalPersonal(false)} aria-hidden="true" />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="fixed top-0 left-0 right-0 bottom-16 lg:inset-0 z-10 flex flex-col overflow-y-auto bg-white sm:static sm:my-8 sm:inline-block sm:max-h-[90vh] sm:w-full sm:max-w-4xl sm:rounded-lg sm:shadow-xl">
              {/* Header */}
              <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="w-6 h-6 text-pink-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Treinos: Paciente {pacientePersonalSelecionado.nome}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowModalPersonal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Calendário dos Treinos (modal /metanutri: wideRange = sempre incluir hoje, tentar userId + doc id) */}
                <div className="border-t border-gray-200 px-6 py-4">
                  <CalendarioTreinosPersonal
                    patientId={pacientePersonalSelecionado?.userId}
                    pacienteId={pacientePersonalSelecionado?.id}
                    wideRange
                  />
                </div>
              </div>
            </div>
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

    </div>
  );
}

export default MetaNutriPageV2;
