'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { UserService } from '@/services/userService';
import { User as UserType, Residente, Local, Servico, Escala, ServicoDia } from '@/types/auth';
import { Troca } from '@/types/troca';
import { Ferias } from '@/types/ferias';
import FeriasCalendar from '@/components/FeriasCalendar';
import { Users, UserPlus, MapPin, Settings, Calendar, Edit, Menu, X, UserCheck, Building, Wrench, Plus, BarChart3, RefreshCw, MessageSquare, Trash2, Eye, UserCircle, Stethoscope, Clock, Activity, CheckCircle, ArrowRight, ArrowLeft, MessageCircle, Printer, Save, DollarSign, ChevronDown, ChevronUp, User as UserIcon, MessageCircle as MessageCircleIcon, UtensilsCrossed, Droplet, Apple, Target, Moon, Coffee, Sun, Sunset, TrendingUp, Zap, Heart, Pill, Wind, Brain, Dumbbell, Weight, AlertTriangle as AlertTriangleIcon, XCircle, Monitor, HelpCircle, FlaskConical } from 'lucide-react';
import EditModal from '@/components/EditModal';
import EditResidenteForm from '@/components/EditResidenteForm';
import EditLocalForm from '@/components/EditLocalForm';
import EditServicoForm from '@/components/EditServicoForm';
import EditEscalaForm from '@/components/EditEscalaForm';
import { MensagemService } from '@/services/mensagemService';
import { Mensagem, MensagemResidenteParaAdmin } from '@/types/mensagem';
import { MedicoService } from '@/services/medicoService';
import { Medico } from '@/types/medico';
import { estadosCidades, estadosList } from '@/data/cidades-brasil';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { LabRangeBar } from '@/components/LabRangeBar';
import { labRanges, getLabRange, labOrderBySection, Sex } from '@/types/labRanges';
import { AlertBadges } from '@/components/AlertBadges';
import { ProgressPill } from '@/components/ProgressPill';
import { buildExpectedCurve, buildExpectedCurveDoseDrivenAnchored, buildSuggestedDoseSchedule, varianceStatus, predictHbA1c, predictWaistCircumference } from '@/utils/expectedCurve';
import { alertEngine, isDoseUpgradeBlocked, getSuggestedAction, getSeverityClasses } from '@/utils/alertEngine';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Info, AlertTriangle, AlertCircle, CheckCircle2, Send, Shield, ShieldCheck } from 'lucide-react';
import { PacienteMensagemService, PacienteMensagem } from '@/services/pacienteMensagemService';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import { SolicitacaoMedico } from '@/types/solicitacaoMedico';
import { LeadMedicoService } from '@/services/leadMedicoService';
import { LeadMedico, LeadMedicoStatus } from '@/types/leadMedico';
import KpiCard from '@/components/KpiCard';
import TrendLine from '@/components/TrendLine';
import StackedBars from '@/components/StackedBars';
import { CidadeCustomizadaService } from '@/services/cidadeCustomizadaService';
import { TirzepatidaService, TirzepatidaPreco } from '@/services/tirzepatidaService';
import { ShoppingCart, Minus, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import FAQChat from '@/components/FAQChat';
import { faqMedicoTotal, faqMedicoPlataforma, faqMedicoLeads, faqMedicoIndicacao, faqMedicoEdicaoPaciente, faqMedicoPlanoTerapeutico, faqMedicoMedicamento, faqMedicoSeguranca, faqMedicoNutricao, faqCategoriesMedico } from '@/components/FAQmedico';
import { faqCategoriesPaciente, nutriFaqItems } from '@/components/FAQpaciente';
import { PrescricaoService } from '@/services/prescricaoService';
import { Prescricao, PrescricaoItem } from '@/types/prescricao';
import { IndicacaoService } from '@/services/indicacaoService';
import { Indicacao } from '@/types/indicacao';

export default function MetaAdminPage() {
  const [activeMenu, setActiveMenu] = useState('estatisticas');
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificacoesTroca, setNotificacoesTroca] = useState(0);
  const [trocasPendentes, setTrocasPendentes] = useState<Troca[]>([]);
  const [loadingTrocas, setLoadingTrocas] = useState(false);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [feriasPendentes, setFeriasPendentes] = useState<Ferias[]>([]);
  const [loadingFerias, setLoadingFerias] = useState(false);
  
  // Estados para perfil médico
  const [medicoPerfil, setMedicoPerfil] = useState<Medico | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [perfilMedico, setPerfilMedico] = useState({
    crmNumero: '',
    crmEstado: '',
    endereco: '',
    cep: '',
    pontoReferencia: '',
    telefone: '',
    genero: '' as 'M' | 'F' | '',
    cidades: [] as { estado: string; cidade: string }[]
  });
  const [estadoSelecionado, setEstadoSelecionado] = useState<string>('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState<string>('');
  const [showModalNovaCidade, setShowModalNovaCidade] = useState(false);
  const [novaCidadeEstado, setNovaCidadeEstado] = useState<string>('');
  const [novaCidadeNome, setNovaCidadeNome] = useState<string>('');
  const [cidadesCustomizadas, setCidadesCustomizadas] = useState<{ estado: string; cidade: string }[]>([]);
  
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
  const [showCadastrarPacienteModal, setShowCadastrarPacienteModal] = useState(false);
  
  // Estados para paciente
  const [pacientes, setPacientes] = useState<PacienteCompleto[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: ''
  });
  const [showEditarPacienteModal, setShowEditarPacienteModal] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState<PacienteCompleto | null>(null);
  const [pacienteEditandoOriginal, setPacienteEditandoOriginal] = useState<PacienteCompleto | null>(null);
  const [pastaAtiva, setPastaAtiva] = useState<number>(1);
  const [showConfirmarSaidaModal, setShowConfirmarSaidaModal] = useState(false);
  const [acaoConfirmacaoSaida, setAcaoConfirmacaoSaida] = useState<{
    onSairSemSalvar: () => void;
    onSalvarESair: () => Promise<void>;
  } | null>(null);
  const [salvandoParaSair, setSalvandoParaSair] = useState(false);
  
  // Função helper para verificar se há alterações e mostrar modal se necessário
  const verificarAlteracoesESair = async (
    onSairSemAlteracoes: () => void,
    onSalvar: () => Promise<void>
  ) => {
    const hasChanges = pacienteEditando && pacienteEditandoOriginal && 
      JSON.stringify(pacienteEditando) !== JSON.stringify(pacienteEditandoOriginal);
    
    if (hasChanges) {
      // Mostrar modal de confirmação
      setAcaoConfirmacaoSaida({
        onSairSemSalvar: onSairSemAlteracoes,
        onSalvarESair: async () => {
          await onSalvar();
          onSairSemAlteracoes();
        }
      });
      setShowConfirmarSaidaModal(true);
    } else {
      // Não há alterações, sair diretamente
      onSairSemAlteracoes();
    }
  };
  
  const fecharModalSemSalvar = () => {
    if (acaoConfirmacaoSaida) {
      acaoConfirmacaoSaida.onSairSemSalvar();
    }
    setShowConfirmarSaidaModal(false);
    setAcaoConfirmacaoSaida(null);
  };
  
  const salvarESair = async () => {
    if (!acaoConfirmacaoSaida) return;
    
    setSalvandoParaSair(true);
    try {
      await acaoConfirmacaoSaida.onSalvarESair();
      setShowConfirmarSaidaModal(false);
      setAcaoConfirmacaoSaida(null);
    } catch (error) {
      // Se houver erro, manter o modal aberto para o usuário decidir
      console.error('Erro ao salvar:', error);
    } finally {
      setSalvandoParaSair(false);
    }
  };
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState<string>('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [graficoAtivoPasta6, setGraficoAtivoPasta6] = useState<'peso' | 'circunferencia' | 'hba1c' | 'imc'>('peso');

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
    if (!grau) return 'text-gray-500';
    if (grau.includes('Grau III')) return 'text-red-600 font-semibold';
    if (grau.includes('Grau II')) return 'text-orange-600 font-semibold';
    if (grau.includes('Grau I')) return 'text-yellow-600 font-semibold';
    if (grau === 'Sobrepeso') return 'text-amber-600';
    if (grau === 'Peso normal') return 'text-green-600';
    return 'text-blue-600';
  };
  const [indicadorAtivoPasta9, setIndicadorAtivoPasta9] = useState<'paciente' | 'adesao'>('paciente');

  // Estados para Tirzepatida (carrinho de compras)
  const [tirzepatidaPrecos, setTirzepatidaPrecos] = useState<TirzepatidaPreco[]>([]);
  const [loadingTirzepatidaPrecos, setLoadingTirzepatidaPrecos] = useState(false);
  const [carrinho, setCarrinho] = useState<{ tipo: string; quantidade: number; preco: number }[]>([]);
  
  // Estados para calendário de aplicações
  const [mesCalendario, setMesCalendario] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [aplicacoesDiaSelecionado, setAplicacoesDiaSelecionado] = useState<Array<{
    paciente: PacienteCompleto;
    semana: number;
    dose: number;
    localAplicacao: string;
  }>>([]);

  // Estados para Prescrições (Pasta 9)
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [loadingPrescricoes, setLoadingPrescricoes] = useState(false);
  const [prescricaoSelecionada, setPrescricaoSelecionada] = useState<Prescricao | null>(null);
  const [prescricaoEditando, setPrescricaoEditando] = useState<Prescricao | null>(null);
  const [novaPrescricao, setNovaPrescricao] = useState({
    nome: '',
    descricao: '',
    itens: [] as PrescricaoItem[],
    observacoes: ''
  });
  
  // Estados para Indicações
  const [indicacoesPendentes, setIndicacoesPendentes] = useState<Indicacao[]>([]);
  const [loadingIndicacoes, setLoadingIndicacoes] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [activeTabIndicacao, setActiveTabIndicacao] = useState<'minhas'>('minhas');
  const [showPlanoSalvoDialog, setShowPlanoSalvoDialog] = useState(false);
  const [indicacoesExpandidas, setIndicacoesExpandidas] = useState<Set<string>>(new Set());
  const [planoIndicacaoForm, setPlanoIndicacaoForm] = useState({
    temPlanoIndicacao: false,
    tipoValor: 'negociado' as 'negociado' | 'fixo',
    tipoComissao: 'por_dose' as 'por_dose' | 'por_tratamento',
    valorPorDose: 0,
    tempoTratamentoMeses: 0,
    totalMedicamentoMg: 0,
    valorComissaoTratamento: 0
  });
  const [indicacoesVisualizadas, setIndicacoesVisualizadas] = useState<Set<string>>(new Set());

  // Estados para Nutrologia (Pasta 3)
  interface PlanoNutricional {
    estilo: 'digestiva' | 'plant_based' | 'mediterranea' | 'rico_proteina' | 'low_carb_moderada';
    protDia_g: number;
    aguaDia_ml: number;
    refeicoes: number;
    distribuicaoProteina: {
      cafe: string;
      almoco: string;
      jantar: string;
      lanche1: string;
      lanche2: string;
    };
    modeloDia: {
      cafe: string;
      almoco: string;
      jantar: string;
      lanche1: string;
      lanche2: string;
    };
    opcoesSelecionadas?: {
      cafe: string;
      almoco: string;
      jantar: string;
      lanche1: string;
      lanche2: string;
    };
    evitar: string[];
    criadoEm: any;
    descricaoEstilo?: string;
    hipoteseComportamental?: string;
    suplementos?: {
      probiotico: string;
      whey: string;
      creatina: string;
    };
    restricoesPaciente?: string[];
    preferenciasProteinaPaciente?: string[];
    macrosPorRefeicao?: {
      cafe?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
      lanche1?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
      almoco?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
      lanche2?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
      jantar?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
    };
  }

  interface CheckInDiario {
    proteinaOk: boolean;
    frutasOk: boolean;
    aguaOk: boolean;
    lixoAlimentar: boolean;
    probioticoTomou: boolean;
    wheyTomou: boolean;
    creatinaTomou: boolean;
    sintomasGI: 'nenhum' | 'leve' | 'moderado' | 'grave';
    nauseas: 'nenhum' | 'leve' | 'moderado' | 'grave';
    constipacao: 'nenhum' | 'leve' | 'moderado' | 'grave';
    diarreia: 'nenhum' | 'leve' | 'moderado' | 'grave';
    horasSono: '<6h' | '6-8h' | '>8h';
    humorEnergia: number;
    atividadeFisicaHoje: 'nenhuma' | 'leve' | 'moderada' | 'intensa';
    diaAplicacao: 'nao_foi_dia' | 'aplicou_no_horario' | 'aplicou_atrasado' | 'esqueceu';
    localAplicacao?: 'abdome' | 'coxa' | 'braco' | 'outro';
    observacoes?: string;
    aderenciaPlano?: number;
    pesoHoje?: number;
    sintomasAumentoDose?: 'nenhum' | 'leve' | 'moderado' | 'intenso';
    caloriasDiarias_kcal?: number;
    score: number;
    data: string;
  }

  const [planoNutricional, setPlanoNutricional] = useState<PlanoNutricional | null>(null);
  const [loadingPlanoNutricional, setLoadingPlanoNutricional] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckInDiario[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  const [checkInPastaAtiva, setCheckInPastaAtiva] = useState<number>(0);

  // Função para carregar indicações pendentes
  const loadIndicacoesPendentes = useCallback(async () => {
    if (!medicoPerfil?.id) return;
    
    setLoadingIndicacoes(true);
    try {
      const indicacoes = await IndicacaoService.getIndicacoesPendentesPorMedico(medicoPerfil.id);
      setIndicacoesPendentes(indicacoes);
    } catch (error) {
      console.error('Erro ao carregar indicações pendentes:', error);
      setMessage('Erro ao carregar indicações pendentes.');
    } finally {
      setLoadingIndicacoes(false);
    }
  }, [medicoPerfil?.id]);

  // Carregar indicações quando médico perfil mudar
  useEffect(() => {
    if (medicoPerfil && activeMenu === 'indicacao' && activeTabIndicacao === 'minhas') {
      loadIndicacoesPendentes();
    }
  }, [medicoPerfil, activeMenu, activeTabIndicacao, loadIndicacoesPendentes]);

  // Carregar plano de encaminhamento quando entrar na aba
  useEffect(() => {
    if (false) { // Plano de Encaminhamento removido
      setPlanoIndicacaoForm({
        temPlanoIndicacao: medicoPerfil.temPlanoIndicacao || false,
        tipoValor: medicoPerfil.planoIndicacao?.tipoValor || 'negociado',
        tipoComissao: medicoPerfil.planoIndicacao?.tipoComissao || 'por_dose',
        valorPorDose: medicoPerfil.planoIndicacao?.valorPorDose || 0,
        tempoTratamentoMeses: medicoPerfil.planoIndicacao?.tempoTratamentoMeses || 0,
        totalMedicamentoMg: medicoPerfil.planoIndicacao?.totalMedicamentoMg || 0,
        valorComissaoTratamento: medicoPerfil.planoIndicacao?.valorComissaoTratamento || 0
      });
    }
  }, [medicoPerfil, activeMenu, activeTabIndicacao]);

  // Função para carregar plano nutricional
  const loadPlanoNutricional = useCallback(async (pacienteId: string) => {
    try {
      setLoadingPlanoNutricional(true);
      const planoRef = doc(db, 'pacientes_completos', pacienteId, 'nutricao', 'plano');
      const planoSnap = await getDoc(planoRef);
      
      if (planoSnap.exists()) {
        const planoData = planoSnap.data();
        const planoCarregado: PlanoNutricional = {
          ...planoData,
          criadoEm: planoData.criadoEm
        } as PlanoNutricional;
        setPlanoNutricional(planoCarregado);
      } else {
        setPlanoNutricional(null);
      }
    } catch (error) {
      console.error('Erro ao carregar plano nutricional:', error);
      setPlanoNutricional(null);
    } finally {
      setLoadingPlanoNutricional(false);
    }
  }, []);

  // Função para carregar check-ins
  const loadCheckIns = useCallback(async (pacienteId: string) => {
    try {
      setLoadingCheckIns(true);
      const nutricaoDadosRef = doc(db, 'pacientes_completos', pacienteId, 'nutricao', 'dados');
      const checkInsRef = collection(nutricaoDadosRef, 'checkins');
      const checkInsQuery = query(checkInsRef, orderBy('timestamp', 'desc'));
      const checkInsSnapshot = await getDocs(checkInsQuery);
      
      const checkInsData: CheckInDiario[] = [];
      
      checkInsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const dataCheckIn = docSnapshot.id.match(/^\d{4}-\d{2}-\d{2}$/) 
          ? docSnapshot.id 
          : (data.data || docSnapshot.id);
        
        const checkInData: CheckInDiario = {
          proteinaOk: data.proteinaOk ?? false,
          frutasOk: data.frutasOk ?? false,
          aguaOk: data.aguaOk ?? false,
          lixoAlimentar: data.lixoAlimentar ?? false,
          probioticoTomou: data.probioticoTomou ?? false,
          wheyTomou: data.wheyTomou ?? false,
          creatinaTomou: data.creatinaTomou ?? false,
          sintomasGI: data.sintomasGI || 'nenhum',
          nauseas: data.nauseas || 'nenhum',
          constipacao: data.constipacao || 'nenhum',
          diarreia: data.diarreia || 'nenhum',
          horasSono: data.horasSono || '6-8h',
          humorEnergia: data.humorEnergia ?? 3,
          atividadeFisicaHoje: data.atividadeFisicaHoje || 'nenhuma',
          diaAplicacao: data.diaAplicacao || 'nao_foi_dia',
          localAplicacao: data.localAplicacao,
          observacoes: data.observacoes || '',
          aderenciaPlano: data.aderenciaPlano ?? 100,
          pesoHoje: data.pesoHoje,
          sintomasAumentoDose: data.sintomasAumentoDose,
          score: data.score || 0,
          data: dataCheckIn
        };
        
        checkInsData.push(checkInData);
      });
      
      setCheckIns(checkInsData);
    } catch (error) {
      console.error('Erro ao carregar check-ins:', error);
      setCheckIns([]);
    } finally {
      setLoadingCheckIns(false);
    }
  }, []);

  // Carregar dados nutricionais quando pasta 3 estiver ativa e paciente selecionado
  useEffect(() => {
    if (pastaAtiva === 3 && pacienteEditando?.id) {
      loadPlanoNutricional(pacienteEditando.id);
      loadCheckIns(pacienteEditando.id);
    }
  }, [pastaAtiva, pacienteEditando?.id, loadPlanoNutricional, loadCheckIns]);
  
  // Estados para Pasta 4 (Exames Laboratoriais)
  const [exameDataSelecionada, setExameDataSelecionada] = useState<string>('');
  const [showAdicionarExameModal, setShowAdicionarExameModal] = useState(false);
  const [indiceExameEditando, setIndiceExameEditando] = useState<number | null>(null);
  const [dataSelecionadaModal, setDataSelecionadaModal] = useState<string>('');
  const [showSolicitarExamesModal, setShowSolicitarExamesModal] = useState(false);
  const [examesSelecionados, setExamesSelecionados] = useState<string[]>([]);
  const [examesCustomizados, setExamesCustomizados] = useState<string[]>(['']);
  const [novoExameData, setNovoExameData] = useState<{
    dataColeta: string;
    [key: string]: any;
  }>({
    dataColeta: new Date().toISOString().split('T')[0]
  });
  const [showAdicionarSeguimentoModal, setShowAdicionarSeguimentoModal] = useState(false);
  const [showEditarSeguimentoModal, setShowEditarSeguimentoModal] = useState(false);
  const [seguimentoEditando, setSeguimentoEditando] = useState<any>(null);
  const [novoSeguimento, setNovoSeguimento] = useState({
    peso: '',
    circunferenciaAbdominal: '',
    frequenciaCardiaca: '',
    paSistolica: '',
    paDiastolica: '',
    hba1c: '',
    doseAplicada: '',
    adesao: '',
    giSeverity: '',
    localAplicacao: '',
    observacoesPaciente: '',
    comentarioMedico: ''
  });
  
  // Estados para mensagens aos pacientes (Pasta 8)
  
  // Estados para solicitações de pacientes
  const [solicitacoesMedico, setSolicitacoesMedico] = useState<SolicitacaoMedico[]>([]);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);
  const [solicitacoesPendentesCount, setSolicitacoesPendentesCount] = useState(0);
  
  // Estados para leads médico
  const [leadsMedico, setLeadsMedico] = useState<LeadMedico[]>([]);
  const [loadingLeadsMedico, setLoadingLeadsMedico] = useState(false);
  const [leadsByStatus, setLeadsByStatus] = useState<Record<LeadMedicoStatus, LeadMedico[]>>({
    nao_qualificado: [],
    enviado_contato: [],
    contato_feito: [],
    em_tratamento: [],
    excluido: [],
  });
  const [novaMensagemPaciente, setNovaMensagemPaciente] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'clinico' as 'clinico' | 'alerta' | 'orientacao' | 'revisao'
  });
  const [mensagensPaciente, setMensagensPaciente] = useState<PacienteMensagem[]>([]);
  const [loadingMensagensPaciente, setLoadingMensagensPaciente] = useState(false);
  const [mensagensNaoLidasPacienteParaMedico, setMensagensNaoLidasPacienteParaMedico] = useState(0);
  const [mensagensNaoLidasPorPaciente, setMensagensNaoLidasPorPaciente] = useState<Record<string, number>>({}); // Mensagens não lidas por paciente (pacienteId -> count)
  const [abaAtivaMensagensAdmin, setAbaAtivaMensagensAdmin] = useState<'enviadas' | 'recebidas'>('recebidas'); // Aba ativa no histórico de mensagens
  
  const router = useRouter();

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

  // Função para carregar perfil do médico
  const loadMedicoPerfil = useCallback(async () => {
    if (!user) return null;
    
    setLoadingPerfil(true);
    try {
      const medico = await MedicoService.getMedicoByUserId(user.uid);
      
      if (medico) {
        console.log('Médico carregado:', medico);
        setMedicoPerfil(medico);
        setPerfilMedico({
          crmNumero: medico.crm.numero,
          crmEstado: medico.crm.estado,
          endereco: medico.localizacao.endereco,
          cep: medico.localizacao.cep || '',
          pontoReferencia: medico.localizacao.pontoReferencia || '',
          telefone: medico.telefone || '',
          genero: medico.genero || '',
          cidades: medico.cidades
        });
        return medico;
      } else {
        console.log('Nenhum médico encontrado para user.uid:', user.uid);
        return null;
      }
    } catch (error) {
      console.error('Erro ao carregar perfil médico:', error);
      return null;
    } finally {
      setLoadingPerfil(false);
    }
  }, [user]);

  // Função para salvar perfil do médico
  const handleSalvarPerfil = async () => {
    if (!user) return;
    
    if (!perfilMedico.crmNumero || !perfilMedico.crmEstado || !perfilMedico.endereco) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoadingPerfil(true);
    try {
      const medicoData = {
        userId: user.uid,
        email: user.email || '',
        nome: user.displayName || 'Médico',
        genero: perfilMedico.genero || undefined,
        telefone: perfilMedico.telefone || undefined,
        crm: {
          numero: perfilMedico.crmNumero,
          estado: perfilMedico.crmEstado
        },
        localizacao: {
          endereco: perfilMedico.endereco,
          cep: perfilMedico.cep || undefined,
          pontoReferencia: perfilMedico.pontoReferencia || undefined
        },
        cidades: perfilMedico.cidades,
        status: 'ativo' as const,
        isVerificado: medicoPerfil?.isVerificado || false
      };

      const medicoId = await MedicoService.createOrUpdateMedico(medicoData);
      console.log('Médico salvo com ID:', medicoId);
      
      // Verificar se é a primeira vez que o médico salva o perfil (não tinha perfil antes)
      const isNovoMedico = !medicoPerfil;
      
      // Enviar e-mail de bem-vindo médico se for a primeira vez
      if (isNovoMedico && user.email) {
        try {
          const bemVindoMedicoResponse = await fetch('/api/send-email-bem-vindo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              userEmail: user.email,
              userName: medicoData.nome,
              tipo: 'medico',
            }),
          });
          
          if (bemVindoMedicoResponse.ok) {
            console.log('✅ E-mail de bem-vindo médico enviado com sucesso');
          } else {
            console.error('❌ Erro ao enviar e-mail de bem-vindo médico');
          }
        } catch (emailError) {
          console.error('❌ Erro ao enviar e-mail de bem-vindo médico (não crítico):', emailError);
          // Não bloquear o fluxo se o e-mail falhar
        }
      }
      
      await loadMedicoPerfil();
      setMessage('Perfil salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil médico:', error);
      setMessage('Erro ao salvar perfil médico');
    } finally {
      setLoadingPerfil(false);
    }
  };

  // Função para calcular similaridade entre duas strings (Levenshtein simplificado)
  const calcularSimilaridade = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const s2 = str2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (s1 === s2) return 1;
    
    // Calcular distância de Levenshtein
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distancia = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - (distancia / maxLen);
  };

  // Função para buscar cidades similares
  const buscarCidadesSimilares = (estado: string, nomeCidade: string): { cidade: string; similaridade: number }[] => {
    const todasCidades: string[] = [];
    
    // Cidades padrão do estado
    if (estadosCidades[estado as keyof typeof estadosCidades]) {
      todasCidades.push(...estadosCidades[estado as keyof typeof estadosCidades].cidades);
    }
    
    // Cidades customizadas do estado
    cidadesCustomizadas
      .filter(c => c.estado === estado)
      .forEach(c => {
        if (!todasCidades.includes(c.cidade)) {
          todasCidades.push(c.cidade);
        }
      });
    
    // Calcular similaridade com todas as cidades
    const similares = todasCidades
      .map(cidade => ({
        cidade,
        similaridade: calcularSimilaridade(nomeCidade, cidade)
      }))
      .filter(item => item.similaridade > 0.7 && item.similaridade < 1) // Similaridade entre 70% e 100%
      .sort((a, b) => b.similaridade - a.similaridade)
      .slice(0, 3); // Top 3 mais similares
    
    return similares;
  };

  // Função para carregar cidades customizadas
  const loadCidadesCustomizadas = useCallback(async () => {
    try {
      const customizadas = await CidadeCustomizadaService.getAllCidadesCustomizadas();
      setCidadesCustomizadas(
        customizadas.map(c => ({ estado: c.estado, cidade: c.cidade }))
      );
    } catch (error) {
      console.error('Erro ao carregar cidades customizadas:', error);
    }
  }, []);

  // Carregar cidades customizadas quando o componente montar
  useEffect(() => {
    loadCidadesCustomizadas();
  }, [loadCidadesCustomizadas]);

  // Função para adicionar cidade
  const handleAdicionarCidade = () => {
    if (!estadoSelecionado || !cidadeSelecionada) {
      alert('Por favor, selecione estado e cidade');
      return;
    }

    const cidadeJaExiste = perfilMedico.cidades.some(
      c => c.estado === estadoSelecionado && c.cidade === cidadeSelecionada
    );

    if (cidadeJaExiste) {
      alert('Esta cidade já está na lista');
      return;
    }

    setPerfilMedico({
      ...perfilMedico,
      cidades: [...perfilMedico.cidades, { estado: estadoSelecionado, cidade: cidadeSelecionada }]
    });
    setEstadoSelecionado('');
    setCidadeSelecionada('');
  };

  // Função para remover cidade
  const handleRemoverCidade = (index: number) => {
    setPerfilMedico({
      ...perfilMedico,
      cidades: perfilMedico.cidades.filter((_, i) => i !== index)
    });
  };

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


  // Garantir que o tema sempre seja claro (modo escuro desativado)
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
      setUserLoading(false);
      
      if (!user) {
        // Se não estiver autenticado, redirecionar para a página principal
        // O usuário será induzido a fazer login ao clicar nos botões
        router.push('/');
        return;
      }
      
      // Qualquer usuário autenticado pode acessar /metaadmin
      // Tentar carregar perfil médico se existir (opcional)
      MedicoService.getMedicoByUserId(user.uid).then((medicoData) => {
        if (medicoData) {
          setMedicoPerfil(medicoData);
        }
        }).catch((error) => {
        console.error('Erro ao verificar médico:', error);
        // Não redirecionar, deixar acesso livre
        });
    });

    return () => unsubscribe();
  }, [router]);

  // Carregar dados para usuário master após inicialização completa
  useEffect(() => {
    if (user && user.email === 'ricpmota.med@gmail.com' && typeof loadData === 'function') {
      loadData();
    }
  }, [user, loadData]);

  const loadTrocasPendentes = useCallback(async () => {
    if (!user) return;
    
    setLoadingTrocas(true);
    try {
      const trocas = await UserService.getAllTrocas();
      const pendentes = trocas.filter(troca => troca.status === 'aceita' || troca.status === 'aprovada');
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
      const todasFerias = await UserService.getAllFerias();
      const pendentes = todasFerias.filter(ferias => ferias.status === 'pendente');
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
      const feriasData = await UserService.getAllFerias();
      console.log('📊 Todas as férias carregadas:', feriasData.length);
      console.log('📋 Status das férias:', feriasData.map(f => ({ id: f.id, status: f.status, residente: f.residenteEmail })));
      
      const pendentes = feriasData.filter(ferias => ferias.status === 'pendente');
      console.log('⏳ Férias pendentes:', pendentes.length);
      
      setFeriasPendentes(pendentes);
      setFerias(feriasData);
    } catch (error) {
      console.error('❌ Erro ao carregar férias:', error);
    } finally {
      setLoadingFerias(false);
    }
  }, [user]);

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

  // Função para carregar mensagens do paciente (Pasta 8)
  const loadMensagensPaciente = useCallback(async () => {
    if (!pacienteEditando?.email || !medicoPerfil?.id || !pacienteEditando?.id) return;
    
    setLoadingMensagensPaciente(true);
    try {
      console.log('📬 Buscando mensagens para:', {
        pacienteEmail: pacienteEditando.email,
        pacienteId: pacienteEditando.id,
        medicoId: medicoPerfil.id
      });
      
      // Carregar mensagens do paciente para o médico (RECEBIDAS pelo médico)
      const mensagensPacienteParaMedico = await PacienteMensagemService.getMensagensPacienteParaMedico(
        medicoPerfil.id,
        pacienteEditando.email
      );
      
      // VALIDAÇÃO ADICIONAL: Garantir que são realmente deste paciente e médico
      const mensagensRecebidasValidadas = mensagensPacienteParaMedico.filter(m => {
        const emailMatch = m.pacienteEmail === pacienteEditando.email;
        const medicoMatch = String(m.medicoId) === String(medicoPerfil.id);
        const pacienteIdMatch = !m.pacienteId || m.pacienteId === pacienteEditando.id;
        const direcaoMatch = m.direcao === 'paciente_para_medico';
        const notDeleted = !m.deletada;
        
        const isValid = emailMatch && medicoMatch && pacienteIdMatch && direcaoMatch && notDeleted;
        if (!isValid) {
          console.warn('⚠️ Mensagem recebida inválida filtrada:', {
            id: m.id,
            pacienteEmail: m.pacienteEmail,
            medicoId: m.medicoId,
            pacienteId: m.pacienteId,
            direcao: m.direcao,
            deletada: m.deletada
          });
        }
        return isValid;
      });
      
      console.log('📬 Mensagens RECEBIDAS (do paciente para o médico):', mensagensRecebidasValidadas.length, 'de', mensagensPacienteParaMedico.length);
      
      // Carregar mensagens do médico para o paciente (ENVIADAS pelo médico)
      // Buscar todas as mensagens do paciente e filtrar apenas as enviadas por este médico
      const todasMensagens = await PacienteMensagemService.getMensagensPaciente(pacienteEditando.email);
      
      // VALIDAÇÃO RIGOROSA: Apenas mensagens deste médico para este paciente específico
      const mensagensMedicoParaPaciente = todasMensagens.filter(m => {
        const emailMatch = m.pacienteEmail === pacienteEditando.email;
        const medicoMatch = String(m.medicoId) === String(medicoPerfil.id);
        const pacienteIdMatch = !m.pacienteId || m.pacienteId === pacienteEditando.id;
        const direcaoMatch = m.direcao === 'medico_para_paciente' || !m.direcao;
        const notDeleted = !m.deletada;
        
        const isValid = emailMatch && medicoMatch && pacienteIdMatch && direcaoMatch && notDeleted;
        if (!isValid) {
          console.warn('⚠️ Mensagem enviada inválida filtrada:', {
            id: m.id,
            pacienteEmail: m.pacienteEmail,
            medicoId: m.medicoId,
            pacienteId: m.pacienteId,
            direcao: m.direcao,
            deletada: m.deletada
          });
        }
        return isValid;
      });
      
      console.log('📬 Mensagens ENVIADAS (do médico para o paciente):', mensagensMedicoParaPaciente.length, 'de', todasMensagens.length);
      
      // Combinar e remover duplicatas por ID
      const mensagensIds = new Set<string>();
      const todasMensagensUnicas: PacienteMensagem[] = [];
      
      [...mensagensMedicoParaPaciente, ...mensagensRecebidasValidadas].forEach(msg => {
        if (!mensagensIds.has(msg.id)) {
          mensagensIds.add(msg.id);
          todasMensagensUnicas.push(msg);
        }
      });
      
      // Ordenar por data
      todasMensagensUnicas.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      
      console.log('📬 Total de mensagens únicas encontradas:', todasMensagensUnicas.length);
      console.log('📬 Mensagens por direção:', {
        medico_para_paciente: todasMensagensUnicas.filter(m => m.direcao === 'medico_para_paciente' || !m.direcao).length,
        paciente_para_medico: todasMensagensUnicas.filter(m => m.direcao === 'paciente_para_medico').length
      });
      
      // Log detalhado para debug
      todasMensagensUnicas.forEach(msg => {
        console.log('📋 Mensagem:', {
          id: msg.id,
          titulo: msg.titulo,
          direcao: msg.direcao,
          pacienteEmail: msg.pacienteEmail,
          pacienteId: msg.pacienteId,
          medicoId: msg.medicoId,
          criadoEm: msg.criadoEm
        });
      });
      
      setMensagensPaciente(todasMensagensUnicas);
      
      // Contar mensagens não lidas do paciente para o médico
      const naoLidas = await PacienteMensagemService.contarMensagensNaoLidasPacienteParaMedico(
        medicoPerfil.id,
        pacienteEditando.email
      );
      setMensagensNaoLidasPacienteParaMedico(naoLidas);
    } catch (error) {
      console.error('Erro ao carregar mensagens do paciente:', error);
      setMensagensPaciente([]);
    } finally {
      setLoadingMensagensPaciente(false);
    }
  }, [pacienteEditando?.email, pacienteEditando?.id, medicoPerfil?.id]);

  // Função para enviar mensagem ao paciente
  const handleEnviarMensagemPaciente = async () => {
    if (!pacienteEditando || !user || !novaMensagemPaciente.titulo.trim() || !novaMensagemPaciente.mensagem.trim()) {
      setMessage('Título e mensagem são obrigatórios');
      return;
    }

    setLoadingMensagensPaciente(true);
    
    try {
      console.log('Enviando mensagem para paciente:', pacienteEditando.email);
      const mensagemId = await PacienteMensagemService.criarMensagem({
        pacienteId: pacienteEditando.id,
        pacienteEmail: pacienteEditando.email,
        medicoId: medicoPerfil.id,
        medicoEmail: user.email,
        titulo: novaMensagemPaciente.titulo.trim(),
        mensagem: novaMensagemPaciente.mensagem.trim(),
        tipo: novaMensagemPaciente.tipo,
        lida: false,
        criadoPor: user.email,
        direcao: 'medico_para_paciente',
        pacienteNome: pacienteEditando.nome
      });
      console.log('Mensagem criada com ID:', mensagemId);
      
      setMessage('Mensagem enviada com sucesso!');
      setNovaMensagemPaciente({ titulo: '', mensagem: '', tipo: 'clinico' });
      
      console.log('Carregando mensagens atualizadas...');
      await loadMensagensPaciente();
      console.log('Mensagens carregadas');
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessage('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setLoadingMensagensPaciente(false);
    }
  };

  // Função para deletar mensagem do paciente
  const handleDeletarMensagemPaciente = async (mensagemId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta mensagem?')) {
      return;
    }

    setLoadingMensagensPaciente(true);
    
    try {
      await PacienteMensagemService.deletarMensagem(mensagemId);
      setMessage('Mensagem deletada com sucesso!');
      await loadMensagensPaciente();
      
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      setMessage('Erro ao deletar mensagem.');
    } finally {
      setLoadingMensagensPaciente(false);
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

  // Função para carregar pacientes do médico

  const loadPacientes = useCallback(async () => {
    if (!user || !medicoPerfil) return;
    
    setLoadingPacientes(true);
    try {
      console.log('Carregando pacientes para médico ID:', medicoPerfil.id);
      const pacientesData = await PacienteService.getPacientesByMedico(medicoPerfil.id);
      console.log('Pacientes encontrados:', pacientesData);
      setPacientes(pacientesData);
      
      // Carregar mensagens não lidas para cada paciente
      const mensagensNaoLidasMap: Record<string, number> = {};
      for (const paciente of pacientesData) {
        if (paciente.email) {
          try {
            const count = await PacienteMensagemService.contarMensagensNaoLidasPacienteParaMedico(
              medicoPerfil.id,
              paciente.email
            );
            if (count > 0) {
              mensagensNaoLidasMap[paciente.id] = count;
            }
          } catch (error) {
            console.error(`Erro ao contar mensagens não lidas para paciente ${paciente.id}:`, error);
          }
        }
      }
      setMensagensNaoLidasPorPaciente(mensagensNaoLidasMap);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoadingPacientes(false);
    }
  }, [user, medicoPerfil]);

  // Função para carregar solicitações do médico
  const loadSolicitacoesMedico = useCallback(async () => {
    if (!user || !medicoPerfil) return;
    
    setLoadingSolicitacoes(true);
    try {
      console.log('Carregando solicitações para médico ID:', medicoPerfil.id);
      const solicitacoesData = await SolicitacaoMedicoService.getSolicitacoesPorMedico(medicoPerfil.id);
      console.log('Solicitações encontradas:', solicitacoesData);
      setSolicitacoesMedico(solicitacoesData);
      
      // Contar solicitações pendentes
      const pendentes = solicitacoesData.filter(s => s.status === 'pendente').length;
      setSolicitacoesPendentesCount(pendentes);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
    } finally {
      setLoadingSolicitacoes(false);
    }
  }, [user, medicoPerfil]);

  // Função para carregar leads do médico
  const loadLeadsMedico = useCallback(async () => {
    if (!user || !medicoPerfil) return;
    
    setLoadingLeadsMedico(true);
    try {
      console.log('Carregando leads para médico ID:', medicoPerfil.id);
      
      // Buscar leads existentes no Firestore
      const leadsExistentes = await LeadMedicoService.getLeadsByMedico(medicoPerfil.id);
      console.log('Leads existentes encontrados:', leadsExistentes.length);
      
      // Buscar todas as solicitações deste médico
      const todasSolicitacoes = await SolicitacaoMedicoService.getSolicitacoesPorMedico(medicoPerfil.id);
      console.log('Solicitações encontradas:', todasSolicitacoes.length);
      
      // Buscar pacientes completos para enriquecer dados
      const pacientesCompletos = await PacienteService.getAllPacientes();
      const pacientesMap = new Map(pacientesCompletos.map(p => [p.userId || p.email?.toLowerCase(), p]));
      
      // Criar mapa de leads existentes por email
      const leadsExistentesMap = new Map(leadsExistentes.map(l => [l.email.toLowerCase(), l]));
      
      // Processar solicitações e criar/atualizar leads
      const leadsProcessados: LeadMedico[] = [];
      
      for (const solicitacao of todasSolicitacoes) {
        const email = solicitacao.pacienteEmail.toLowerCase();
        const paciente = pacientesMap.get(solicitacao.pacienteId || email);
        
        const leadExistente = leadsExistentesMap.get(email);
        
        if (leadExistente) {
          // IMPORTANTE: Atualizar dados do lead existente (mas manter status)
          // Seguir a mesma lógica do /metaadmingeral que funciona
          const leadAtualizado: LeadMedico = {
            ...leadExistente,
            name: solicitacao.pacienteNome,
            telefone: solicitacao.pacienteTelefone || paciente?.dadosIdentificacao?.telefone,
            cidade: paciente?.dadosIdentificacao?.endereco?.cidade,
            estado: paciente?.dadosIdentificacao?.endereco?.estado,
            solicitacaoId: solicitacao.id,
            // Preservar status e dataStatus exatamente como estão no Firestore
            status: leadExistente.status,
            dataStatus: leadExistente.dataStatus,
          };
          // Atualizar no Firestore (preservando o status)
          await LeadMedicoService.createOrUpdateLead(leadAtualizado);
          leadsProcessados.push(leadAtualizado);
        } else {
          // Criar novo lead - SEMPRE começa em "não qualificado"
          const novoLead: Omit<LeadMedico, 'id'> = {
            uid: solicitacao.pacienteId || email,
            email: solicitacao.pacienteEmail,
            name: solicitacao.pacienteNome,
            telefone: solicitacao.pacienteTelefone || paciente?.dadosIdentificacao?.telefone,
            cidade: paciente?.dadosIdentificacao?.endereco?.cidade,
            estado: paciente?.dadosIdentificacao?.endereco?.estado,
            createdAt: solicitacao.criadoEm,
            emailVerified: true,
            status: 'nao_qualificado', // SEMPRE começa em não qualificado
            dataStatus: new Date(),
            medicoId: medicoPerfil.id,
            solicitacaoId: solicitacao.id,
          };
          const leadId = await LeadMedicoService.createOrUpdateLead(novoLead);
          const leadComId = { ...novoLead, id: leadId } as LeadMedico;
          leadsProcessados.push(leadComId);
        }
      }
      
      // Organizar leads por status
          const leadsPorStatus: Record<LeadMedicoStatus, LeadMedico[]> = {
            nao_qualificado: [],
            enviado_contato: [],
            contato_feito: [],
            em_tratamento: [],
            excluido: [],
          };
      
      leadsProcessados.forEach(lead => {
        // Migrar leads com status 'aprovado' (removido) para 'enviado_contato'
        if ((lead.status as any) === 'aprovado') {
          lead.status = 'enviado_contato';
          lead.dataStatus = new Date();
          // Atualizar no Firestore
          LeadMedicoService.updateLeadStatus(lead.id, 'enviado_contato', user?.email || undefined).catch(console.error);
        }
        leadsPorStatus[lead.status].push(lead);
      });
      
      // Ordenar cada coluna por data de status (mais recente primeiro)
      Object.keys(leadsPorStatus).forEach(status => {
        leadsPorStatus[status as LeadMedicoStatus].sort((a, b) => {
          const dateA = a.dataStatus?.getTime() || 0;
          const dateB = b.dataStatus?.getTime() || 0;
          return dateB - dateA;
        });
      });
      
      setLeadsMedico(leadsProcessados);
      setLeadsByStatus(leadsPorStatus);
      console.log('Leads processados:', leadsProcessados.length);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoadingLeadsMedico(false);
    }
  }, [user, medicoPerfil]);

  // Configuração dos status do pipeline (definida fora do case para uso em funções)
  const statusConfigLeadMedico: Record<LeadMedicoStatus, { label: string; color: string; bgColor: string }> = {
    nao_qualificado: { label: 'Não Qualificado', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    enviado_contato: { label: 'Enviado Contato', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    contato_feito: { label: 'Contato Feito', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    em_tratamento: { label: 'Em Tratamento', color: 'text-green-700', bgColor: 'bg-green-100' },
    excluido: { label: 'Excluído', color: 'text-red-700', bgColor: 'bg-red-100' },
  };

  // Função para abrir mensagens do paciente a partir do lead
  const handleAbrirMensagensLead = async (lead: LeadMedico) => {
    try {
      // Buscar paciente pelo email
      const paciente = await PacienteService.getPacienteByEmail(lead.email);
      if (paciente) {
        // Abrir modal de edição do paciente
        setPacienteEditando(paciente);
        setPacienteEditandoOriginal(JSON.parse(JSON.stringify(paciente)));
        setPastaAtiva(8); // Pasta 8 = Mensagens
        setShowEditarPacienteModal(true);
        // Mudar para o menu de pacientes para melhor contexto
        setActiveMenu('pacientes');
      } else {
        setMessage(`Paciente não encontrado para o email ${lead.email}. O paciente precisa estar cadastrado para trocar mensagens.`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Erro ao abrir mensagens do lead:', error);
      setMessage('Erro ao abrir mensagens. Tente novamente.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Função para mover lead entre estágios
  const handleMoveLeadMedico = async (leadId: string, currentStatus: LeadMedicoStatus, direction: 'left' | 'right') => {
    try {
      const statusOrder: LeadMedicoStatus[] = ['nao_qualificado', 'enviado_contato', 'contato_feito', 'em_tratamento', 'excluido'];
      const currentIndex = statusOrder.indexOf(currentStatus);
      let newStatus: LeadMedicoStatus;
      
      if (direction === 'right' && currentIndex < statusOrder.length - 1) {
        newStatus = statusOrder[currentIndex + 1];
      } else if (direction === 'left' && currentIndex > 0) {
        newStatus = statusOrder[currentIndex - 1];
      } else {
        return; // Não pode mover
      }

      // Encontrar o lead para garantir que temos o ID correto (pode ser id ou uid)
      const leadAtual = leadsMedico.find(l => l.id === leadId);
      if (!leadAtual) {
        console.error('Lead não encontrado:', leadId);
        setMessage('Erro: Lead não encontrado.');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      // Usar o ID do documento (que pode ser o uid ou o doc.id)
      const idParaAtualizar = leadAtual.id || leadAtual.uid;
      console.log('Atualizando lead:', { leadId, idParaAtualizar, currentStatus, newStatus });
      
      await LeadMedicoService.updateLeadStatus(idParaAtualizar, newStatus, user?.email || undefined);
      
      // Atualizar estado local
      const updatedLeads = leadsMedico.map(l => 
        l.id === leadId ? { ...l, status: newStatus, dataStatus: new Date() } : l
      );
      
          const leadsPorStatus: Record<LeadMedicoStatus, LeadMedico[]> = {
            nao_qualificado: [],
            enviado_contato: [],
            contato_feito: [],
            em_tratamento: [],
            excluido: [],
          };
      
      updatedLeads.forEach(lead => {
        leadsPorStatus[lead.status].push(lead);
      });
      
      Object.keys(leadsPorStatus).forEach(status => {
        leadsPorStatus[status as LeadMedicoStatus].sort((a, b) => {
          const dateA = a.dataStatus?.getTime() || 0;
          const dateB = b.dataStatus?.getTime() || 0;
          return dateB - dateA;
        });
      });
      
      setLeadsMedico(updatedLeads);
      setLeadsByStatus(leadsPorStatus);
    } catch (error) {
      console.error('Erro ao mover lead:', error);
      setMessage('Erro ao mover lead. Tente novamente.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Função para carregar preços do Tirzepatida
  const loadTirzepatidaPrecos = useCallback(async () => {
    setLoadingTirzepatidaPrecos(true);
    try {
      const precosData = await TirzepatidaService.getPrecos();
      setTirzepatidaPrecos(precosData);
    } catch (error) {
      console.error('Erro ao carregar preços do Tirzepatida:', error);
    } finally {
      setLoadingTirzepatidaPrecos(false);
    }
  }, []);

  // Funções para gerenciar carrinho
  const adicionarAoCarrinho = (tipo: string, preco: number) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.tipo === tipo);
      if (itemExistente) {
        return prev.map(item =>
          item.tipo === tipo
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { tipo, quantidade: 1, preco }];
    });
  };

  const removerDoCarrinho = (tipo: string) => {
    setCarrinho(prev => prev.filter(item => item.tipo !== tipo));
  };

  const atualizarQuantidade = (tipo: string, quantidade: number) => {
    if (quantidade <= 0) {
      removerDoCarrinho(tipo);
      return;
    }
    setCarrinho(prev =>
      prev.map(item =>
        item.tipo === tipo ? { ...item, quantidade } : item
      )
    );
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
  };

  const limparCarrinho = () => {
    setCarrinho([]);
  };

  // Função para criar novo paciente
  const handleCriarPaciente = async () => {
    if (!user || !medicoPerfil) {
      alert('Por favor, complete seu perfil médico primeiro');
      return;
    }

    if (!novoPaciente.nome || !novoPaciente.email) {
      alert('Nome e email são obrigatórios');
      return;
    }

    console.log('Criando paciente para médico ID:', medicoPerfil.id);

    setLoadingPacientes(true);
    try {
      // Por enquanto, criar um paciente básico
      // TODO: Implementar cadastro completo com as 9 pastas
      const pacienteData = {
        userId: user.uid + '_' + Date.now(), // ID temporário até implementar Firebase Auth para pacientes
        email: novoPaciente.email,
        nome: novoPaciente.nome,
        medicoResponsavelId: medicoPerfil.id!,
        dadosIdentificacao: {
          nomeCompleto: novoPaciente.nome,
          email: novoPaciente.email,
          telefone: novoPaciente.telefone,
          cpf: novoPaciente.cpf,
          dataCadastro: new Date()
        },
        dadosClinicos: {
          comorbidades: {}
        },
        estiloVida: {},
        examesLaboratoriais: [],
        planoTerapeutico: {
          metas: {}
        },
        evolucaoSeguimento: [],
        alertas: [],
        comunicacao: {
          mensagens: [],
          anexos: [],
          logsAuditoria: []
        },
        indicadores: {
          tempoEmTratamento: {
            dias: 0,
            semanas: 0
          },
          adesaoMedia: 0,
          incidenciaEfeitosAdversos: {
            total: 0,
            grave: 0,
            moderado: 0,
            leve: 0
          }
        },
        status: 'ativo' as const,
        statusTratamento: 'pendente' as const
      };

      const pacienteId = await PacienteService.createOrUpdatePaciente(pacienteData);
      console.log('Paciente criado com ID:', pacienteId);
      await loadPacientes();
      setShowCadastrarPacienteModal(false);
      setNovoPaciente({ nome: '', email: '', telefone: '', cpf: '' });
      setMessage('Paciente cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      setMessage('Erro ao criar paciente');
    } finally {
      setLoadingPacientes(false);
    }
  };

  // Função para aceitar solicitação
  const handleAceitarSolicitacao = async (solicitacao: SolicitacaoMedico) => {
    if (!medicoPerfil) return;
    
    try {
      // Verificar se já existe paciente com este email
      const pacienteExistente = await PacienteService.getPacienteByEmail(solicitacao.pacienteEmail);
      
      if (pacienteExistente) {
        // Se paciente já existe e já tem médico responsável diferente
        if (pacienteExistente.medicoResponsavelId && pacienteExistente.medicoResponsavelId !== medicoPerfil.id) {
          const medicoAnterior = await MedicoService.getMedicoById(pacienteExistente.medicoResponsavelId);
          const nomeMedicoAnterior = medicoAnterior ? `${medicoAnterior.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoAnterior.nome}` : 'outro médico';
          
          const confirmar = confirm(
            `Este paciente já está sendo acompanhado por ${nomeMedicoAnterior}. ` +
            `Ao aceitar esta solicitação, você se tornará o médico responsável. ` +
            `Deseja continuar?`
          );
          
          if (!confirmar) {
            return;
          }
        }
        
        // Verificar se o paciente estava em abandono
        const estavaEmAbandono = pacienteExistente.statusTratamento === 'abandono';
        
        // Atualizar paciente existente com novo médico responsável
        const pacienteAtualizado: PacienteCompleto = {
          ...pacienteExistente,
          medicoResponsavelId: medicoPerfil.id!,
          nome: solicitacao.pacienteNome, // Atualizar nome se necessário
          // Atualizar telefone se fornecido na solicitação
          dadosIdentificacao: {
            ...pacienteExistente.dadosIdentificacao,
            telefone: solicitacao.pacienteTelefone || pacienteExistente.dadosIdentificacao?.telefone
          },
          // Se estava em abandono, voltar para em_tratamento e zerar dados do tratamento anterior
          statusTratamento: estavaEmAbandono ? 'em_tratamento' as const : (pacienteExistente.statusTratamento || 'pendente' as const),
          motivoAbandono: estavaEmAbandono ? undefined : pacienteExistente.motivoAbandono,
          dataAbandono: estavaEmAbandono ? undefined : pacienteExistente.dataAbandono,
          medicoResponsavelAnteriorId: estavaEmAbandono ? undefined : pacienteExistente.medicoResponsavelAnteriorId,
          // Zerar dados do tratamento anterior se estava em abandono
          evolucaoSeguimento: estavaEmAbandono ? [] : pacienteExistente.evolucaoSeguimento || [],
          planoTerapeutico: estavaEmAbandono ? {
            metas: {},
            startDate: undefined,
            lastDoseChangeAt: undefined,
            nextReviewDate: undefined
          } : pacienteExistente.planoTerapeutico || { metas: {} },
          alertas: estavaEmAbandono ? [] : pacienteExistente.alertas || [],
          indicadores: estavaEmAbandono ? {
            tempoEmTratamento: {
              dias: 0,
              semanas: 0
            },
            adesaoMedia: 0,
            incidenciaEfeitosAdversos: {
              total: 0,
              grave: 0,
              moderado: 0,
              leve: 0
            }
          } : pacienteExistente.indicadores || {
            tempoEmTratamento: { dias: 0, semanas: 0 },
            adesaoMedia: 0,
            incidenciaEfeitosAdversos: { total: 0, grave: 0, moderado: 0, leve: 0 }
          }
        };
        
        await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
        setMessage(estavaEmAbandono 
          ? 'Solicitação aceita! Paciente retornou ao tratamento. Dados anteriores foram zerados para iniciar novo tratamento.' 
          : 'Solicitação aceita! Paciente atualizado com sucesso.');
      } else {
        // Criar novo paciente
        const pacienteData = {
          userId: solicitacao.pacienteEmail + '_' + Date.now(), // ID temporário
          email: solicitacao.pacienteEmail,
          nome: solicitacao.pacienteNome,
          medicoResponsavelId: medicoPerfil.id!,
          dadosIdentificacao: {
            nomeCompleto: solicitacao.pacienteNome,
            email: solicitacao.pacienteEmail,
            telefone: solicitacao.pacienteTelefone,
            dataCadastro: new Date()
          },
          dadosClinicos: {
            comorbidades: {}
          },
          estiloVida: {},
          examesLaboratoriais: [],
          planoTerapeutico: {
            metas: {}
          },
          evolucaoSeguimento: [],
          alertas: [],
          comunicacao: {
            mensagens: [],
            anexos: [],
            logsAuditoria: []
          },
          indicadores: {
            tempoEmTratamento: {
              dias: 0,
              semanas: 0
            },
            adesaoMedia: 0,
            incidenciaEfeitosAdversos: {
              total: 0,
              grave: 0,
              moderado: 0,
              leve: 0
            }
          },
          status: 'ativo' as const,
          statusTratamento: 'pendente' as const
        };

        await PacienteService.createOrUpdatePaciente(pacienteData);
        setMessage('Solicitação aceita! Paciente criado com sucesso.');
      }
      
      // Cancelar todas as outras solicitações pendentes do paciente
      await SolicitacaoMedicoService.cancelarSolicitacoesPendentesPaciente(solicitacao.pacienteEmail);
      
      // Aceitar a solicitação atual
      await SolicitacaoMedicoService.aceitarSolicitacao(solicitacao.id);
      
      // Enviar e-mail de boas-vindas
      try {
        console.log('📧 Tentando enviar e-mail de boas-vindas para solicitação:', solicitacao.id);
        
        const emailResponse = await fetch('/api/send-email-solicitado-medico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitacaoId: solicitacao.id }),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error('❌ Erro ao enviar e-mail de boas-vindas:', emailResult);
        } else if (emailResult.jaEnviado) {
          console.log('ℹ️ E-mail de boas-vindas já foi enviado anteriormente para esta solicitação');
        } else {
          console.log('✅ E-mail de boas-vindas enviado com sucesso:', emailResult);
        }
      } catch (emailError) {
        console.error('❌ Erro ao enviar e-mail de boas-vindas:', emailError);
        // Não bloquear o fluxo se o e-mail falhar
      }
      
      // Recarregar dados
      await loadSolicitacoesMedico();
      await loadPacientes();
      await loadLeadsMedico(); // Recarregar leads para atualizar status
    } catch (error) {
      console.error('Erro ao aceitar solicitação:', error);
      alert('Erro ao aceitar solicitação');
    }
  };

  // Função para rejeitar solicitação
  const handleRejeitarSolicitacao = async (solicitacaoId: string) => {
    try {
      await SolicitacaoMedicoService.rejeitarSolicitacao(solicitacaoId);
      await loadSolicitacoesMedico();
      await loadLeadsMedico(); // Recarregar leads para atualizar status
      setMessage('Solicitação rejeitada.');
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      alert('Erro ao rejeitar solicitação');
    }
  };

  useEffect(() => {
    if (user && (activeMenu === 'meu-perfil' || activeMenu === 'estatisticas')) {
      loadMedicoPerfil();
    }
  }, [user, activeMenu, loadMedicoPerfil]);

  useEffect(() => {
    if (user && activeMenu === 'pacientes') {
      console.log('Menu pacientes ativado, carregando perfil médico primeiro...');
      loadMedicoPerfil();
    }
  }, [user, activeMenu, loadMedicoPerfil]);

  // Carregar pacientes quando menu estatísticas for ativado
  useEffect(() => {
    if (user && medicoPerfil && activeMenu === 'estatisticas') {
      loadPacientes();
      loadLeadsMedico();
    }
  }, [user, medicoPerfil, activeMenu, loadPacientes, loadLeadsMedico]);

  // Carregar prescrições quando a pasta 9 for ativada
  useEffect(() => {
    if (pastaAtiva === 9 && medicoPerfil) {
      const loadPrescricoesAsync = async () => {
        if (!medicoPerfil) return;
        
        try {
          setLoadingPrescricoes(true);
          
          // Garantir que templates globais existam
          await PrescricaoService.criarPrescricoesPadraoGlobais();
          
          // Buscar templates globais e prescrições do médico
          const [templates, prescricoesMedico] = await Promise.all([
            PrescricaoService.getPrescricoesTemplate(),
            PrescricaoService.getPrescricoesByMedico(medicoPerfil.id)
          ]);
          
          // Combinar templates e prescrições do médico (excluindo prescrições específicas de paciente)
          const todasPrescricoes = [
            ...templates,
            ...prescricoesMedico.filter(p => !p.pacienteId) // Apenas prescrições gerais do médico
          ];
          
          setPrescricoes(todasPrescricoes);
          
          // Selecionar automaticamente a primeira prescrição se não houver nenhuma selecionada
          if (todasPrescricoes.length > 0) {
            const primeira = todasPrescricoes[0];
            setPrescricaoSelecionada(primeira);
            setPrescricaoEditando(primeira);
            setNovaPrescricao({
              nome: primeira.nome,
              descricao: primeira.descricao || '',
              itens: primeira.itens || [],
              observacoes: primeira.observacoes || ''
            });
          }
        } catch (error) {
          console.error('Erro ao carregar prescrições:', error);
        } finally {
          setLoadingPrescricoes(false);
        }
      };
      
      loadPrescricoesAsync();
    }
  }, [pastaAtiva, medicoPerfil]);

  useEffect(() => {
    if (activeMenu === 'tirzepatida') {
      loadTirzepatidaPrecos();
    }
  }, [activeMenu, loadTirzepatidaPrecos]);

  useEffect(() => {
    if (user && medicoPerfil && activeMenu === 'pacientes') {
      loadPacientes();
      loadSolicitacoesMedico();
    }
  }, [user, medicoPerfil, activeMenu, loadPacientes, loadSolicitacoesMedico]);

  useEffect(() => {
    if (user && medicoPerfil && activeMenu === 'calendario') {
      loadPacientes();
    }
  }, [user, medicoPerfil, activeMenu, loadPacientes]);

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

  // Carregar mensagens do paciente quando a Pasta 8 estiver ativa
  useEffect(() => {
    if (pacienteEditando && showEditarPacienteModal) {
      loadMensagensPaciente();
    }
  }, [pacienteEditando, showEditarPacienteModal, loadMensagensPaciente]);

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

  // Função para carregar prescrições
  const loadPrescricoes = useCallback(async () => {
    if (!medicoPerfil) return;
    
    try {
      setLoadingPrescricoes(true);
      
      // Garantir que templates globais existam
      await PrescricaoService.criarPrescricoesPadraoGlobais();
      
      // Buscar templates globais e prescrições do médico
      const [templates, prescricoesMedico] = await Promise.all([
        PrescricaoService.getPrescricoesTemplate(),
        PrescricaoService.getPrescricoesByMedico(medicoPerfil.id)
      ]);
      
      // Combinar templates e prescrições do médico (excluindo prescrições específicas de paciente)
      const todasPrescricoes = [
        ...templates,
        ...prescricoesMedico.filter(p => !p.pacienteId) // Apenas prescrições gerais do médico
      ];
      
      setPrescricoes(todasPrescricoes);
      
      // Selecionar automaticamente a primeira prescrição se não houver nenhuma selecionada
      if (todasPrescricoes.length > 0) {
        const primeira = todasPrescricoes[0];
        setPrescricaoSelecionada(primeira);
        setPrescricaoEditando(primeira);
        setNovaPrescricao({
          nome: primeira.nome,
          descricao: primeira.descricao || '',
          itens: primeira.itens,
          observacoes: primeira.observacoes || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar prescrições:', error);
    } finally {
      setLoadingPrescricoes(false);
    }
  }, [medicoPerfil]);


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

  const renderContent = () => {
    switch (activeMenu) {
      case 'meu-perfil':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Meu Perfil Médico</h2>
            </div>

            {loadingPerfil ? (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando perfil...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <form onSubmit={(e) => { e.preventDefault(); handleSalvarPerfil(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CRM Número */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CRM Número *
                      </label>
                      <input
                        type="text"
                        value={perfilMedico.crmNumero}
                        onChange={(e) => setPerfilMedico({ ...perfilMedico, crmNumero: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Ex: 12345"
                        required
                      />
                    </div>

                    {/* CRM Estado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CRM Estado *
                      </label>
                      <select
                        value={perfilMedico.crmEstado}
                        onChange={(e) => setPerfilMedico({ ...perfilMedico, crmEstado: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        <option value="">Selecione o estado</option>
                        {estadosList.map((estado) => (
                          <option key={estado.sigla} value={estado.sigla}>
                            {estado.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Telefone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={perfilMedico.telefone || ''}
                        onChange={(e) => setPerfilMedico({ ...perfilMedico, telefone: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Ex: (11) 98765-4321"
                      />
                    </div>

                    {/* CEP e Endereço */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={perfilMedico.cep}
                        onChange={async (e) => {
                          const cep = e.target.value.replace(/\D/g, '');
                          setPerfilMedico({ ...perfilMedico, cep: cep });
                          
                          // Buscar endereço pelo CEP
                          if (cep.length === 8) {
                            try {
                              const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                              const data = await response.json();
                              if (!data.erro && data.logradouro) {
                                const enderecoCompleto = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
                                setPerfilMedico({
                                  ...perfilMedico,
                                  cep: cep,
                                  endereco: enderecoCompleto
                                });
                              }
                            } catch (error) {
                              console.error('Erro ao buscar CEP:', error);
                            }
                          }
                        }}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="00000-000"
                        maxLength={9}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endereço de Atendimento *
                      </label>
                      <input
                        type="text"
                        value={perfilMedico.endereco}
                        onChange={(e) => setPerfilMedico({ ...perfilMedico, endereco: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Ex: Rua Exemplo, 123 - Bairro - Cidade/UF"
                        required
                      />
                    </div>

                    {/* Ponto de Referência */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ponto de Referência
                      </label>
                      <input
                        type="text"
                        value={perfilMedico.pontoReferencia}
                        onChange={(e) => setPerfilMedico({ ...perfilMedico, pontoReferencia: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Ex: Próximo ao Shopping Center, ao lado da farmácia"
                      />
                    </div>

                    {/* Gênero */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gênero
                      </label>
                      <select
                        value={perfilMedico.genero}
                        onChange={(e) => setPerfilMedico({ ...perfilMedico, genero: e.target.value as 'M' | 'F' | '' })}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>

                    {/* Cidades de Atendimento */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cidades de Atendimento
                      </label>
                      
                      {/* Seleção de Estado e Cidade */}
                      <div className="flex gap-2 mb-4">
                        <select
                          value={estadoSelecionado}
                          onChange={(e) => {
                            setEstadoSelecionado(e.target.value);
                            setCidadeSelecionada('');
                          }}
                          className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Selecione o estado</option>
                          {estadosList.map((estado) => (
                            <option key={estado.sigla} value={estado.sigla}>
                              {estado.nome}
                            </option>
                          ))}
                        </select>
                        
                        <select
                          value={cidadeSelecionada}
                          onChange={(e) => setCidadeSelecionada(e.target.value)}
                          className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                          disabled={!estadoSelecionado}
                        >
                          <option value="">Selecione a cidade</option>
                          {estadoSelecionado && (() => {
                            // Combinar cidades padrão e customizadas
                            const cidadesPadrao = estadosCidades[estadoSelecionado as keyof typeof estadosCidades]?.cidades || [];
                            const cidadesCustomEstado = cidadesCustomizadas
                              .filter(c => c.estado === estadoSelecionado)
                              .map(c => c.cidade);
                            
                            const todasCidades = [...new Set([...cidadesPadrao, ...cidadesCustomEstado])].sort();
                            
                            return todasCidades.map((cidade) => (
                              <option key={cidade} value={cidade}>
                                {cidade}
                              </option>
                            ));
                          })()}
                        </select>
                        
                        <button
                          type="button"
                          onClick={handleAdicionarCidade}
                          disabled={!estadoSelecionado || !cidadeSelecionada}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                      
                      {/* Botão para adicionar cidade manualmente */}
                      <div className="mb-4">
                        <button
                          type="button"
                          onClick={() => setShowModalNovaCidade(true)}
                          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                        >
                          + Adicionar cidade que não está na lista
                        </button>
                      </div>

                      {/* Lista de Cidades Adicionadas */}
                      {perfilMedico.cidades.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 font-medium">Cidades adicionadas:</p>
                          <div className="flex flex-wrap gap-2">
                            {perfilMedico.cidades.map((cidade, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                              >
                                {estadosCidades[cidade.estado as keyof typeof estadosCidades]?.nome || cidade.estado} - {cidade.cidade}
                                <button
                                  type="button"
                                  onClick={() => handleRemoverCidade(index)}
                                  className="ml-2 hover:text-red-700"
                                >
                                  <X size={14} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {perfilMedico.cidades.length === 0 && (
                        <p className="text-sm text-gray-500">Nenhuma cidade adicionada ainda</p>
                      )}
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={loadingPerfil}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingPerfil ? 'Salvando...' : 'Salvar Perfil'}
                    </button>
                  </div>
                </form>

                {/* Alerta de Verificação */}
                {medicoPerfil && !medicoPerfil.isVerificado && (
                  <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-md">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                          Perfil Não Verificado
                        </h3>
                        <p className="text-sm text-yellow-800 mb-3">
                          Seu perfil ainda não foi verificado. Para garantir a segurança dos pacientes, envie os seguintes documentos para <strong>suporte@oftware.com.br</strong>:
                        </p>
                        <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1 mb-3">
                          <li>Cópia do CRM (verso e anverso)</li>
                          <li>CNH ou Passaporte com Foto</li>
                          <li>Self segurando um documento com Foto</li>
                          <li>Comprovante de quitação do CFM</li>
                        </ul>
                        <p className="text-sm text-yellow-800 font-medium">
                          Após o envio dos documentos, você receberá uma notificação quando seu perfil for verificado.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informações do Perfil Existentes */}
                {medicoPerfil && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações do Perfil</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Data de Cadastro</p>
                        <p className="text-sm font-medium text-gray-900">
                          {medicoPerfil.dataCadastro.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          medicoPerfil.status === 'ativo' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {medicoPerfil.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Verificação</p>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            medicoPerfil.isVerificado
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {medicoPerfil.isVerificado ? (
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
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'pacientes':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Meus Pacientes</h2>
              <button
                onClick={() => setShowCadastrarPacienteModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Novo Paciente
              </button>
            </div>
            
            {/* Lista de Pacientes */}
            {loadingPacientes ? (
              <div className="bg-white shadow rounded-lg p-12 text-center">
                <RefreshCw className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-600">Carregando pacientes...</p>
              </div>
            ) : pacientes.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="text-center py-12">
                  <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum paciente cadastrado</h3>
                  <p className="text-gray-500 mb-6">
                    Comece adicionando seus pacientes ou eles aparecerão aqui quando solicitarem atendimento.
                  </p>
                  <button
                    onClick={() => setShowCadastrarPacienteModal(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors inline-flex items-center"
                  >
                    <Plus size={18} className="mr-2" />
                    Cadastrar Primeiro Paciente
                  </button>
                </div>
              </div>
                        ) : (
              <>
                {/* Versão Desktop - Tabela */}
                <div className="hidden lg:block bg-white shadow rounded-lg overflow-hidden">        
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Telefone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data de Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {pacientes.map((paciente) => (
                          <tr key={paciente.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">{paciente.nome}</div>
                                {mensagensNaoLidasPorPaciente[paciente.id] > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={`${mensagensNaoLidasPorPaciente[paciente.id]} mensagem(ns) não lida(s)`}>
                                    <MessageSquare size={12} className="mr-1" />
                                    {mensagensNaoLidasPorPaciente[paciente.id]}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{paciente.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {paciente.dadosIdentificacao?.telefone || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {paciente.dataCadastro?.toLocaleDateString('pt-BR') || '-'}
                              </div>
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
                              {paciente.statusTratamento === 'abandono' && paciente.motivoAbandono && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Motivo: {paciente.motivoAbandono}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-3">
                                {paciente.statusTratamento === 'abandono' ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        // Buscar paciente de pacientes_abandono
                                        const pacienteAbandono = await PacienteService.getPacienteAbandonoById(paciente.id);
                                        if (pacienteAbandono) {
                                          setPacienteEditando(pacienteAbandono);
                                          setPacienteEditandoOriginal(JSON.parse(JSON.stringify(pacienteAbandono))); // Deep copy
                                          setShowEditarPacienteModal(true);
                                          setPastaAtiva(1);
                                        } else {
                                          // Se não encontrou em pacientes_abandono, usar o paciente atual
                                          setPacienteEditando(paciente);
                                          setPacienteEditandoOriginal(JSON.parse(JSON.stringify(paciente))); // Deep copy
                                          setShowEditarPacienteModal(true);
                                          setPastaAtiva(1);
                                        }
                                      } catch (error) {
                                        console.error('Erro ao carregar paciente:', error);
                                        // Fallback: usar paciente atual
                                        setPacienteEditando(paciente);
                                        setPacienteEditandoOriginal(JSON.parse(JSON.stringify(paciente))); // Deep copy
                                        setShowEditarPacienteModal(true);
                                        setPastaAtiva(1);
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-900 flex items-center"
                                  >
                                    <FileText size={16} className="mr-1" />
                                    Visualizar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setPacienteEditando(paciente);
                                      setPacienteEditandoOriginal(JSON.parse(JSON.stringify(paciente))); // Deep copy
                                      setShowEditarPacienteModal(true);
                                      setPastaAtiva(1);
                                    }}
                                    className="text-green-600 hover:text-green-900 flex items-center"
                                  >
                                    <Edit size={16} className="mr-1" />
                                    Editar
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    if (confirm(`Tem certeza que deseja excluir o paciente "${paciente.nome}"? Esta ação não pode ser desfeita.`)) {
                                      setLoadingPacientes(true);
                                      try {
                                        await PacienteService.deletePaciente(paciente.id);
                                        await loadPacientes();
                                        setMessage('Paciente excluído com sucesso!');
                                      } catch (error) {
                                        console.error('Erro ao excluir paciente:', error);
                                        setMessage('Erro ao excluir paciente');
                                      } finally {
                                        setLoadingPacientes(false);
                                      }
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 flex items-center"
                                >
                                  <Trash2 size={16} className="mr-1" />
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Versão Mobile - Cards */}
                <div className="lg:hidden space-y-3">
                  {pacientes.map((paciente) => (
                    <div key={paciente.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900 truncate">{paciente.nome}</h3>
                            {mensagensNaoLidasPorPaciente[paciente.id] > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0" title={`${mensagensNaoLidasPorPaciente[paciente.id]} mensagem(ns) não lida(s)`}>
                                <MessageSquare size={10} className="mr-1" />
                                {mensagensNaoLidasPorPaciente[paciente.id]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{paciente.email}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
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
                        {paciente.statusTratamento === 'abandono' && paciente.motivoAbandono && (
                          <div className="mt-1 text-xs text-gray-500">
                            Motivo: {paciente.motivoAbandono}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Telefone:</span>
                          <span className="text-gray-900">{paciente.dadosIdentificacao?.telefone || '-'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Cadastro:</span>
                          <span className="text-gray-900">{paciente.dataCadastro?.toLocaleDateString('pt-BR') || '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {paciente.statusTratamento === 'abandono' ? (
                          <button
                            onClick={async () => {
                              try {
                                // Buscar paciente de pacientes_abandono
                                const pacienteAbandono = await PacienteService.getPacienteAbandonoById(paciente.id);
                                if (pacienteAbandono) {
                                  setPacienteEditando(pacienteAbandono);
                                  setPacienteEditandoOriginal(JSON.parse(JSON.stringify(pacienteAbandono))); // Deep copy
                                  setShowEditarPacienteModal(true);
                                  setPastaAtiva(1);
                                } else {
                                  // Se não encontrou em pacientes_abandono, usar o paciente atual
                                  setPacienteEditando(paciente);
                                  setPacienteEditandoOriginal(JSON.parse(JSON.stringify(paciente))); // Deep copy
                                  setShowEditarPacienteModal(true);
                                  setPastaAtiva(1);
                                }
                              } catch (error) {
                                console.error('Erro ao carregar paciente:', error);
                                // Fallback: usar paciente atual
                                setPacienteEditando(paciente);
                                setPacienteEditandoOriginal(JSON.parse(JSON.stringify(paciente))); // Deep copy
                                setShowEditarPacienteModal(true);
                                setPastaAtiva(1);
                              }
                            }}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                          >
                            <FileText size={16} className="mr-2" />
                            Visualizar
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              alert('Para uma melhor experiência de edição, recomendamos usar a versão desktop. Por favor, acesse pelo computador para editar os dados completos do paciente.');
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                          >
                            <Edit size={16} className="mr-2" />
                            Editar
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm(`Tem certeza que deseja excluir o paciente "${paciente.nome}"? Esta ação não pode ser desfeita.`)) {
                              setLoadingPacientes(true);
                              try {
                                await PacienteService.deletePaciente(paciente.id);
                                await loadPacientes();
                                setMessage('Paciente excluído com sucesso!');
                              } catch (error) {
                                console.error('Erro ao excluir paciente:', error);
                                setMessage('Erro ao excluir paciente');
                              } finally {
                                setLoadingPacientes(false);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Lista de Encaminhamentos Pendentes */}
            <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Encaminhamentos Pendentes</h3>
                <button
                  onClick={() => loadIndicacoesPendentes()}
                  disabled={loadingIndicacoes}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Atualizar encaminhamentos"
                >
                  <RefreshCw size={16} className={loadingIndicacoes ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>
              </div>
              {loadingIndicacoes ? (
                <div className="px-6 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-4">Carregando encaminhamentos...</p>
                </div>
              ) : indicacoesPendentes.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <UserCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">Nenhum encaminhamento pendente.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {indicacoesPendentes.map((indicacao) => (
                    <div key={indicacao.id} className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm md:text-base font-medium text-gray-900 truncate">
                          {indicacao.nomePaciente}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-500 truncate">
                          Telefone: {indicacao.telefonePaciente}
                        </p>
                        <p className="text-xs text-gray-500">
                          {indicacao.cidade}, {indicacao.estado}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Encaminhado para você por: {indicacao.indicadoPorNome || indicacao.indicadoPor} em {indicacao.criadoEm.toLocaleDateString('pt-BR')}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                          indicacao.status === 'pendente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : indicacao.status === 'visualizada'
                            ? 'bg-blue-100 text-blue-800'
                            : indicacao.status === 'venda'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {indicacao.status === 'pendente' ? 'Pendente' :
                           indicacao.status === 'visualizada' ? 'Visualizada' :
                           indicacao.status === 'venda' ? 'Virou Venda' : 'Paga'}
                        </span>
                        {indicacao.virouVendaEm && (
                          <p className="text-xs text-green-600 mt-1">
                            Virou venda em: {indicacao.virouVendaEm.toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {indicacao.status === 'pendente' && (
                          <button
                            onClick={async () => {
                              try {
                                await IndicacaoService.marcarComoVisualizada(indicacao.id);
                                await loadIndicacoesPendentes();
                                setMessage('Encaminhamento marcado como visualizado.');
                              } catch (error) {
                                console.error('Erro ao marcar encaminhamento como visualizado:', error);
                                setMessage('Erro ao atualizar encaminhamento.');
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Eye size={16} />
                            Marcar como Visualizada
                          </button>
                        )}
                        {indicacao.status === 'venda' && (
                          <button
                            onClick={async () => {
                              if (confirm('Confirma que você finalizou este encaminhamento?')) {
                                try {
                                  await IndicacaoService.marcarComoPaga(indicacao.id);
                                  await loadIndicacoesPendentes();
                                  setMessage('Encaminhamento marcado como encerrado.');
                                } catch (error) {
                                  console.error('Erro ao marcar encaminhamento como encerrado:', error);
                                  setMessage('Erro ao atualizar encaminhamento.');
                                }
                              }
                            }}
                            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <DollarSign size={16} />
                            Marcar como Paga
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de Solicitações */}
            {solicitacoesMedico.length > 0 && (
              <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Solicitações de Pacientes</h3>
                  <button
                    onClick={() => loadSolicitacoesMedico()}
                    disabled={loadingSolicitacoes}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Atualizar solicitações"
                  >
                    <RefreshCw size={16} className={loadingSolicitacoes ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Atualizar</span>
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {solicitacoesMedico.map((solicitacao) => (
                    <div key={solicitacao.id} className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm md:text-base font-medium text-gray-900 truncate">{solicitacao.pacienteNome}</h4>
                        <p className="text-xs md:text-sm text-gray-500 truncate">{solicitacao.pacienteEmail}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Solicitado em: {solicitacao.criadoEm?.toLocaleDateString('pt-BR')}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                          solicitacao.status === 'pendente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : solicitacao.status === 'aceita'
                            ? 'bg-green-100 text-green-800'
                            : solicitacao.status === 'rejeitada'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {solicitacao.status === 'pendente' && 'Pendente'}
                          {solicitacao.status === 'aceita' && 'Aceita'}
                          {solicitacao.status === 'rejeitada' && 'Rejeitada'}
                          {solicitacao.status === 'desistiu' && 'Desistiu'}
                        </span>
                        {solicitacao.status === 'desistiu' && solicitacao.motivoDesistencia && (
                          <p className="text-xs text-gray-500 mt-2">
                            Motivo: {solicitacao.motivoDesistencia}
                          </p>
                        )}
                      </div>
                      {solicitacao.status === 'pendente' && (
                        <div className="flex items-center gap-2 md:gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleRejeitarSolicitacao(solicitacao.id)}
                            className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center flex-1 md:flex-none min-w-0"
                          >
                            <X size={14} className="md:mr-1 flex-shrink-0" />
                            <span className="hidden sm:inline">Rejeitar</span>
                          </button>
                          <button
                            onClick={() => handleAceitarSolicitacao(solicitacao)}
                            className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center flex-1 md:flex-none min-w-0"
                          >
                            <CheckCircle2 size={14} className="md:mr-1 flex-shrink-0" />
                            <span className="hidden sm:inline">Aceitar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'residentes':
        const residentesR1 = residentes.filter(r => r.nivel === 'R1');
        const residentesR2 = residentes.filter(r => r.nivel === 'R2');
        const residentesR3 = residentes.filter(r => r.nivel === 'R3');
        
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Residentes</h2>
              <button
                onClick={() => setShowCadastrarResidenteModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <UserPlus size={16} className="mr-2" />
                Adicionar Residente
              </button>
            </div>
            
            {/* Lista de Residentes por Nível */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* R1 */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">R1 ({residentesR1.length})</h3>
                </div>
                <div className="px-6 py-4">
                  {residentesR1.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum residente R1 cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                              {residentesR1.map((residente) => (
                                <div key={residente.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{residente.nome}</p>
                                    <p className="text-xs text-gray-500">{residente.email}</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => openEditModal('residente', residente)}
                                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                    >
                                      <Edit size={14} className="mr-1" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteResidente(residente.id)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              ))}
                    </div>
                  )}
                </div>
              </div>

              {/* R2 */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">R2 ({residentesR2.length})</h3>
                </div>
                <div className="px-6 py-4">
                  {residentesR2.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum residente R2 cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                              {residentesR2.map((residente) => (
                                <div key={residente.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{residente.nome}</p>
                                    <p className="text-xs text-gray-500">{residente.email}</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => openEditModal('residente', residente)}
                                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                    >
                                      <Edit size={14} className="mr-1" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteResidente(residente.id)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              ))}
                    </div>
                  )}
                </div>
              </div>

              {/* R3 */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">R3 ({residentesR3.length})</h3>
                </div>
                <div className="px-6 py-4">
                  {residentesR3.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum residente R3 cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                              {residentesR3.map((residente) => (
                                <div key={residente.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{residente.nome}</p>
                                    <p className="text-xs text-gray-500">{residente.email}</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => openEditModal('residente', residente)}
                                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                    >
                                      <Edit size={14} className="mr-1" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteResidente(residente.id)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'cadastrar-residente':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Cadastrar Residente</h2>
              <button
                onClick={() => setActiveMenu('residentes')}
                className="flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                ← Voltar para Residentes
              </button>
            </div>
            <form onSubmit={handleAddResidente} className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    value={newResidente.nome}
                    onChange={(e) => setNewResidente({ ...newResidente, nome: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nível</label>
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
                  <label className="block text-sm font-medium text-gray-700">Email</label>
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
              <h2 className="text-2xl font-bold text-gray-900">Cadastrar Local</h2>
              <button
                onClick={() => setActiveMenu('locais')}
                className="flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                ← Voltar para Locais
              </button>
            </div>
            <form onSubmit={handleAddLocal} className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome do Local</label>
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

              case 'locais':
                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">Locais</h2>
                      <button
                        onClick={() => setShowCadastrarLocalModal(true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <MapPin size={16} className="mr-2" />
                        Adicionar Local
                      </button>
                    </div>
                    <div className="bg-white shadow rounded-lg">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Lista de Locais ({locais.length})</h3>
                      </div>
                      <div className="px-6 py-4">
                        {locais.length === 0 ? (
                          <p className="text-gray-500 text-sm">Nenhum local cadastrado</p>
                        ) : (
                          <div className="space-y-2">
                            {locais.map((local) => (
                              <div key={local.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{local.nome}</p>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => openEditModal('local', local)}
                                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                  >
                                    <Edit size={14} className="mr-1" />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLocal(local.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );

              case 'servicos':
                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">Serviços</h2>
                      <button
                        onClick={() => setShowCadastrarServicoModal(true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Wrench size={16} className="mr-2" />
                        Adicionar Serviço
                      </button>
                    </div>
                    <div className="bg-white shadow rounded-lg">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Lista de Serviços ({servicos.length})</h3>
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
                                    <p className="text-sm font-medium text-gray-900">{servico.nome}</p>
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
                    <h2 className="text-2xl font-bold text-gray-900">Cadastrar Serviço</h2>
                    <form onSubmit={handleAddServico} className="bg-white shadow rounded-lg p-6">
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nome do Serviço</label>
                          <input
                            type="text"
                            value={newServico.nome}
                            onChange={(e) => setNewServico({ ...newServico, nome: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Local</label>
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
                    <h2 className="text-2xl font-bold text-gray-900">Criar Escala Semanal</h2>
                    <form onSubmit={handleCriarEscala} className="bg-white shadow rounded-lg p-6">
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                                <h3 className="text-lg font-medium text-gray-900">
                                  {nome} {data && `- ${data.toLocaleDateString('pt-BR')}`}
                                </h3>
                              </div>

                              {/* Lista de serviços do dia */}
                              <div className="space-y-4">
                                {(novaEscala.dias[key as keyof typeof novaEscala.dias] as ServicoDia[]).map((servico, index) => (
                                  <div key={servico.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-4">
                                      <h4 className="text-md font-medium text-gray-900">
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
                                          <label className="block text-sm font-medium text-gray-700 mb-2">Local</label>
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
                                          <label className="block text-sm font-medium text-gray-700 mb-2">Serviço</label>
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
                                          <label className="block text-sm font-medium text-gray-700 mb-2">Turno</label>
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
                                              <span className="text-sm text-gray-700">Manhã</span>
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
                                              <span className="text-sm text-gray-700">Tarde</span>
                                            </label>
                                          </div>
                                        </div>
                                      </div>

                                    {/* Coluna 2 e 3: Residentes por Nível */}
                                    <div className="lg:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                                        <span className="text-gray-900 font-medium truncate text-xs">
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
                                                        <span className="text-gray-900 font-medium truncate text-xs">
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
                                                        <span className="text-gray-900 font-medium truncate text-xs">
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
                    <h2 className="text-2xl font-bold text-gray-900">Escalas Cadastradas</h2>
                    <div className="bg-white shadow rounded-lg">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-900">Lista de Escalas ({escalas.length})</h3>
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
                                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        ) : (
                                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        )}
                                      </button>
                                      <div>
                                        <h4 className="text-lg font-medium text-gray-900">
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
                                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                                                  <div key={servicoDia.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
                                                        <p className="text-sm text-gray-600"><strong>Local:</strong> {local?.nome}</p>
                                                        <p className="text-sm text-gray-600"><strong>Serviço:</strong> {servico?.nome}</p>
                                                      </div>
                                                      <div>
                                                        <p className="text-xs text-gray-500 font-medium mb-1">Residentes:</p>
                                                        {residentesDia.length > 0 ? (
                                                          residentesDia.map(residente => (
                                                            <p key={residente.id} className="text-xs text-gray-700">
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
        // Calcular estatísticas de pacientes por status
        const totalPacientes = pacientes.length;
        const pacientesPendentes = pacientes.filter(p => p.statusTratamento === 'pendente').length;
        const pacientesEmTratamento = pacientes.filter(p => p.statusTratamento === 'em_tratamento').length;
        const pacientesConcluidos = pacientes.filter(p => p.statusTratamento === 'concluido').length;
        const pacientesAbandono = pacientes.filter(p => p.statusTratamento === 'abandono').length;
        
        // Calcular ranking de motivos de abandono
        const motivosAbandono: Record<string, number> = {};
        pacientes.filter(p => p.statusTratamento === 'abandono' && p.motivoAbandono).forEach(p => {
          const motivo = p.motivoAbandono || 'Não informado';
          motivosAbandono[motivo] = (motivosAbandono[motivo] || 0) + 1;
        });
        const rankingMotivos = Object.entries(motivosAbandono)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5); // Top 5 motivos
        
        // Estatísticas do pipeline de leads
        const totalLeadsNaoQualificado = leadsByStatus.nao_qualificado.length;
        const totalLeadsEnviadoContato = leadsByStatus.enviado_contato.length;
        const totalLeadsContatoFeito = leadsByStatus.contato_feito.length;
        const totalLeadsEmTratamento = leadsByStatus.em_tratamento.length;
        const totalLeadsExcluido = leadsByStatus.excluido.length;
        const totalLeadsAtivos = totalLeadsNaoQualificado + totalLeadsEnviadoContato + totalLeadsContatoFeito + totalLeadsEmTratamento;
        
        // Usar configuração de status definida fora do case
        const statusConfig = statusConfigLeadMedico;

        const statusOrder: LeadMedicoStatus[] = ['nao_qualificado', 'enviado_contato', 'contato_feito', 'em_tratamento', 'excluido'];
        
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
              <button
                onClick={loadLeadsMedico}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={loadingLeadsMedico}
              >
                <RefreshCw className={`w-4 h-4 ${loadingLeadsMedico ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {/* Pipeline de Leads */}
            {loadingLeadsMedico ? (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando leads...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline de Qualificação</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use as setas para mover os leads entre os estágios.
                </p>
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {statusOrder.map((status) => {
                      const config = statusConfig[status];
                      const leadsInStatus = leadsByStatus[status];
                      const currentIndex = statusOrder.indexOf(status);
                      
                      return (
                        <div key={status} className="flex-shrink-0 w-64 bg-gray-50 rounded-lg border border-gray-200">
                          <div className={`${config.bgColor} ${config.color} px-4 py-3 rounded-t-lg border-b border-gray-200`}>
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm">{config.label}</h3>
                              <span className={`${config.color} text-xs font-medium bg-white px-2 py-1 rounded-full`}>
                                {leadsInStatus.length}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                            {leadsInStatus.length === 0 ? (
                              <div className="text-center py-8 text-gray-400 text-sm">
                                Nenhum lead
                              </div>
                            ) : (
                              leadsInStatus.map((lead) => (
                                <div
                                  key={lead.id}
                                  className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-gray-900 truncate flex-1">{lead.name}</p>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAbrirMensagensLead(lead);
                                          }}
                                          className="flex-shrink-0 p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                                          title="Abrir mensagens com o paciente"
                                        >
                                          <MessageCircle size={16} />
                                        </button>
                                      </div>
                                      <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                                      {lead.telefone && (
                                        <p className="text-xs text-gray-500 truncate">{lead.telefone}</p>
                                      )}
                                      {lead.cidade && lead.estado && (
                                        <p className="text-xs text-gray-400 truncate">{lead.cidade}, {lead.estado}</p>
                                      )}
                                      {lead.createdAt && (
                                        <p className="text-xs text-gray-400 mt-1">
                                          {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-gray-100">
                                    <button
                                      onClick={() => handleMoveLeadMedico(lead.id, lead.status, 'left')}
                                      disabled={currentIndex === 0}
                                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                        currentIndex === 0
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                      title="Mover para esquerda"
                                    >
                                      ←
                                    </button>
                                    <button
                                      onClick={() => handleMoveLeadMedico(lead.id, lead.status, 'right')}
                                      disabled={currentIndex === statusOrder.length - 1}
                                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                        currentIndex === statusOrder.length - 1
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
              </div>
            )}

            {/* Estatísticas do Pipeline */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas do Pipeline</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Não Qualificado</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalLeadsNaoQualificado}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600">Enviado Contato</p>
                  <p className="text-2xl font-semibold text-yellow-900">{totalLeadsEnviadoContato}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-orange-600">Contato Feito</p>
                  <p className="text-2xl font-semibold text-orange-900">{totalLeadsContatoFeito}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Em Tratamento</p>
                  <p className="text-2xl font-semibold text-green-900">{totalLeadsEmTratamento}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-600">Excluído</p>
                  <p className="text-2xl font-semibold text-red-900">{totalLeadsExcluido}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Total de Leads Ativos:</span> {totalLeadsAtivos}
                </p>
              </div>
            </div>

            {/* Estatísticas de Pacientes (mantidas) */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Pacientes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total de Pacientes</p>
                      <p className="text-2xl font-semibold text-gray-900">{totalPacientes}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Pendentes</p>
                      <p className="text-2xl font-semibold text-gray-900">{pacientesPendentes}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Em Tratamento</p>
                      <p className="text-2xl font-semibold text-gray-900">{pacientesEmTratamento}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Concluído</p>
                      <p className="text-2xl font-semibold text-gray-900">{pacientesConcluidos}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <X className="h-8 w-8 text-red-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Abandonaram</p>
                      <p className="text-2xl font-semibold text-gray-900">{pacientesAbandono}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Ranking de motivos de abandono */}
            {pacientesAbandono > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ranking de Motivos de Abandono</h3>
                {rankingMotivos.length > 0 ? (
                  <div className="space-y-3">
                    {rankingMotivos.map(([motivo, count], index) => (
                      <div key={motivo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-semibold text-sm">
                            {index + 1}
                          </span>
                          <span className="text-gray-900 font-medium">{motivo}</span>
                        </div>
                        <span className="text-gray-600 font-semibold">{count} paciente{count !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhum motivo registrado</p>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'troca': {

        if (loadingTrocas) {
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Aprovar Trocas</h2>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Trocas</h2>
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
                  <div key={troca.id} className="bg-white shadow rounded-lg border border-gray-200">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                Solicitação de Troca #{troca.id}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Solicitado em {troca.createdAt.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">Detalhes da Troca</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Solicitante:</span>
                                  <span className="text-sm font-medium text-gray-900">{solicitante?.nome || troca.solicitanteEmail}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Solicitado:</span>
                                  <span className="text-sm font-medium text-gray-900">{solicitado?.nome || troca.solicitadoEmail}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Serviço:</span>
                                  <span className="text-sm font-medium text-gray-900">{servico?.nome || 'Serviço não encontrado'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Local:</span>
                                  <span className="text-sm font-medium text-gray-900">{local?.nome || 'Local não encontrado'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Dia:</span>
                                  <span className="text-sm font-medium text-gray-900">{troca.dia}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Turno:</span>
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
                              <h4 className="text-sm font-medium text-gray-700 mb-3">Motivo</h4>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300">{troca.motivo || 'Motivo não informado'}</p>
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
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Troca Disponível</h3>
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
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Férias</h2>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
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
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Férias</h2>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {feriasPendentes.length} pendente{feriasPendentes.length !== 1 ? 's' : ''}
                </span>
                <RefreshCw 
                  className="h-5 w-5 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors" 
                  onClick={() => loadFeriasAdmin()}
                />
              </div>
            </div>

            {feriasPendentes.length > 0 ? (
              <div className="space-y-4">
                {feriasPendentes.map((ferias) => {
                  const residente = residentes.find(r => r.email === ferias.residenteEmail);
                  
                  return (
                    <div key={ferias.id} className="bg-white shadow rounded-lg border border-gray-200">
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
                                <h3 className="text-lg font-medium text-gray-900">
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
                                    <span className="text-sm font-medium text-gray-900">{residente?.nome || ferias.residenteEmail}</span>
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
                                    <span className="text-sm font-medium text-gray-900">{ferias.dataInicio.toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Data de Fim:</span>
                                    <span className="text-sm font-medium text-gray-900">{ferias.dataFim.toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Duração:</span>
                                    <span className={`text-sm font-medium ${
                                      Math.ceil((ferias.dataFim.getTime() - ferias.dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1 > 30 
                                        ? 'text-amber-600' 
                                        : 'text-gray-900'
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
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{ferias.motivo || 'Motivo não informado'}</p>
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
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Solicitação de Férias Pendente</h3>
                  <p className="text-gray-500">
                    Não há solicitações de férias aguardando aprovação no momento.
                  </p>
                </div>
              </div>
            )}

            {/* Calendário de Férias - Estilo Gantt */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendário de Férias Aprovadas</h3>
              <FeriasCalendar ferias={ferias.filter(f => f.status === 'aprovada')} residentes={residentes} />
            </div>

            {/* Histórico de Férias */}
            {ferias.length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Histórico de Férias</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Residente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aprovado/Rejeitado por
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Solicitação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {ferias.map((ferias) => {
                        const residente = residentes.find(r => r.email === ferias.residenteEmail);
                        return (
                          <tr key={ferias.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Férias</h2>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
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
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Férias</h2>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {feriasPendentes.length} pendente{feriasPendentes.length !== 1 ? 's' : ''}
                </span>
                <RefreshCw 
                  className="h-5 w-5 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors" 
                  onClick={() => loadFeriasAdmin()}
                />
              </div>
            </div>

            {feriasPendentes.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma Solicitação Pendente</h3>
                <p className="mt-1 text-sm text-gray-500">Todas as solicitações de férias foram processadas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feriasPendentes.map((ferias) => (
                  <div key={ferias.id} className="bg-white shadow rounded-lg border border-gray-200">
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
                              <h4 className="text-lg font-medium text-gray-900">
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
                                  <span className="text-sm font-medium text-gray-900">
                                    {ferias.dataInicio.toLocaleDateString('pt-BR')} a {ferias.dataFim.toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Duração:</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {Math.ceil((ferias.dataFim.getTime() - ferias.dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
                                  </span>
                                </div>
                                {ferias.motivo && (
                                  <div>
                                    <span className="text-sm text-gray-500">Motivo:</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{ferias.motivo}</p>
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
              <h2 className="text-2xl font-bold text-gray-900">Mensagens</h2>
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
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Enviadas
                </button>
                <button
                  onClick={() => setActiveTabMensagens('recebidas')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTabMensagens === 'recebidas'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma mensagem enviada</h4>
                    <p className="text-gray-500">Suas mensagens enviadas para os residentes aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mensagens.map((mensagem) => (
                      <div 
                        key={mensagem.id} 
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer transition-colors hover:border-gray-300"
                        onClick={() => handleVisualizarMensagemEnviada(mensagem)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{mensagem.titulo}</h3>
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
                        <p className="text-gray-700 mb-3 line-clamp-2">{mensagem.mensagem}</p>
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
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma mensagem recebida</h4>
                    <p className="text-gray-500">Mensagens dos residentes aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mensagensResidentes.map((mensagem) => (
                      <div 
                        key={mensagem.id} 
                        className={`bg-white border rounded-lg p-4 shadow-sm cursor-pointer transition-colors ${
                          mensagem.lida 
                            ? 'border-gray-200 hover:border-gray-300' 
                            : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                        }`}
                        onClick={() => handleVisualizarMensagem(mensagem)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">{mensagem.titulo}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-gray-600">
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
                        <p className="text-gray-700 mb-3 line-clamp-2">{mensagem.mensagem}</p>
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
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Nova Mensagem</h3>
                    <button
                      onClick={() => setShowEnviarMensagem(false)}
                      className="text-gray-400 hover:text-gray-600"
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
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
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
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mensagem do Residente</h3>
                    <button
                      onClick={() => setShowMensagemModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">{mensagemSelecionada.titulo}</h4>
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-sm text-gray-600">
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
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mensagem Enviada</h3>
                    <button
                      onClick={() => setShowMensagemEnviadaModal(false)}
                      className="text-gray-400 hover:text-gray-600"
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
                          <p className="text-sm text-gray-600 mb-2">
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

      case 'calendario': {
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
            const dataDose = new Date(primeiraDose);
            dataDose.setDate(primeiraDose.getDate() + (semana * 7));

            // Verificar se está no intervalo do mês do calendário
            if (dataDose >= mesInicio && dataDose <= mesFim) {
              // Calcular dose planejada considerando atrasos (reinicia ciclo se atraso >= 4 dias)
              const dosePlanejada = calcularDoseComAtrasos(semana);
              
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
                semana: semana + 1,
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

          pacientes
            .filter(p => p.statusTratamento === 'em_tratamento')
            .forEach(paciente => {
              const aplicacoes = calcularAplicacoesPaciente(paciente, mesInicio, mesFim);
              todasAplicacoes.push(...aplicacoes);
            });

          return todasAplicacoes;
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
              const dataAplicacao = a.data;
              return dataAplicacao.getDate() === data.getDate() &&
                     dataAplicacao.getMonth() === data.getMonth() &&
                     dataAplicacao.getFullYear() === data.getFullYear();
            });

            setDiaSelecionado(data);
            setAplicacoesDiaSelecionado(aplicacoesDoDia);
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

                    const hoje = new Date();
                    const eHoje = dia && dia.getDate() === hoje.getDate() &&
                                  dia.getMonth() === hoje.getMonth() &&
                                  dia.getFullYear() === hoje.getFullYear();

                    return (
                      <div
                        key={index}
                        onClick={() => handleDiaClick(dia)}
                        className={`min-h-16 sm:min-h-24 border border-gray-200 p-1 sm:p-2 cursor-pointer transition-colors ${
                          dia === null
                            ? 'bg-gray-50'
                            : eHoje
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : aplicacoesDoDia.length > 0
                            ? 'bg-green-50 hover:bg-green-100'
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
                            {aplicacoesDoDia.length > 0 && (
                              <div className="space-y-0.5 sm:space-y-1">
                                {aplicacoesDoDia.slice(0, 2).map((aplicacao, idx) => (
                                  <div
                                    key={idx}
                                    className="text-[10px] sm:text-xs bg-green-600 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate"
                                    title={aplicacao.paciente.nome}
                                  >
                                    {aplicacao.paciente.nome}
                                  </div>
                                ))}
                                {aplicacoesDoDia.length > 2 && (
                                  <div className="text-[10px] sm:text-xs text-gray-600 font-medium">
                                    +{aplicacoesDoDia.length - 2} mais
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

              {/* Detalhes do dia selecionado abaixo do calendário */}
              {diaSelecionado && (
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                      Aplicações - {diaSelecionado.toLocaleDateString('pt-BR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
                      {/* Botão para adicionar todas as aplicações do mês ao Google Calendar */}
                      {user?.email && (() => {
                        const todasAplicacoes = obterAplicacoesMes();
                        const formatarDataGoogle = (data: Date) => {
                          const ano = data.getFullYear();
                          const mes = String(data.getMonth() + 1).padStart(2, '0');
                          const dia = String(data.getDate()).padStart(2, '0');
                          const hora = String(8).padStart(2, '0'); // 8h da manhã
                          return `${ano}${mes}${dia}T${hora}0000Z`;
                        };
                        
                        const formatarDataFimGoogle = (data: Date) => {
                          const ano = data.getFullYear();
                          const mes = String(data.getMonth() + 1).padStart(2, '0');
                          const dia = String(data.getDate()).padStart(2, '0');
                          const hora = String(9).padStart(2, '0'); // 9h da manhã (1 hora de duração)
                          return `${ano}${mes}${dia}T${hora}0000Z`;
                        };
                        
                        const adicionarTodasAplicacoesMes = () => {
                          if (todasAplicacoes.length === 0) return;
                          
                          // Avisar o usuário sobre popups
                          const confirmar = window.confirm(
                            `Serão abertas ${todasAplicacoes.length} abas do Google Calendar.\n\n` +
                            `IMPORTANTE: Permita popups para este site se solicitado pelo navegador.\n\n` +
                            `Deseja continuar?`
                          );
                          
                          if (!confirmar) return;
                          
                          let abertas = 0;
                          let bloqueadas = 0;
                          
                          todasAplicacoes.forEach((aplicacao, index) => {
                            setTimeout(() => {
                              try {
                                const dataInicio = formatarDataGoogle(aplicacao.data);
                                const dataFim = formatarDataFimGoogle(aplicacao.data);
                                const localNome = aplicacao.localAplicacao === 'abdome' ? 'Abdome' : aplicacao.localAplicacao === 'coxa' ? 'Coxa' : 'Braço';
                                const titulo = `${aplicacao.paciente.nome} - Tirzepatida Semana ${aplicacao.semana}`;
                                const detalhes = `Aplicação de Tirzepatida%0A%0APaciente: ${aplicacao.paciente.nome}%0ASemana: ${aplicacao.semana}%0ADose: ${aplicacao.dose}mg%0ALocal: ${localNome}`;
                                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${dataInicio}/${dataFim}&details=${encodeURIComponent(detalhes)}&ctz=America/Sao_Paulo`;
                                
                                const novaJanela = window.open(url, '_blank');
                                
                                // Verificar se a janela foi bloqueada
                                if (!novaJanela || novaJanela.closed || typeof novaJanela.closed === 'undefined') {
                                  bloqueadas++;
                                } else {
                                  abertas++;
                                }
                                
                                // Feedback final após todas as tentativas
                                if (index === todasAplicacoes.length - 1) {
                                  setTimeout(() => {
                                    if (bloqueadas > 0) {
                                      alert(
                                        `${abertas} evento(s) foram abertos com sucesso.\n` +
                                        `${bloqueadas} evento(s) foram bloqueados pelo navegador.\n\n` +
                                        `Para adicionar todos os eventos, permita popups para este site nas configurações do navegador.`
                                      );
                                    } else {
                                      alert(`${abertas} evento(s) foram abertos com sucesso!`);
                                    }
                                  }, (todasAplicacoes.length * 500) + 1000);
                                }
                              } catch (error) {
                                console.error('Erro ao abrir evento:', error);
                                bloqueadas++;
                              }
                            }, index * 600); // Delay aumentado para 600ms
                          });
                        };
                        
                        return todasAplicacoes.length > 0 ? (
                          <button
                            onClick={adicionarTodasAplicacoesMes}
                            className="px-3 sm:px-4 py-2 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 flex-1 sm:flex-none justify-center"
                          >
                            <Calendar size={14} className="sm:w-4 sm:h-4" />
                            <span className="whitespace-nowrap">Adicionar Mês Inteiro ({todasAplicacoes.length})</span>
                          </button>
                        ) : null;
                      })()}
                      
                      {/* Link para adicionar apenas o dia selecionado ao Google Calendar */}
                      {user?.email && aplicacoesDiaSelecionado.length > 0 && (() => {
                        // Formatar data para Google Calendar (YYYYMMDDTHHMMSSZ)
                        const dataInicio = new Date(diaSelecionado);
                        dataInicio.setHours(8, 0, 0, 0); // 8h da manhã
                        const dataFim = new Date(diaSelecionado);
                        dataFim.setHours(18, 0, 0, 0); // 6h da tarde
                        
                        const formatarDataGoogle = (data: Date) => {
                          const ano = data.getFullYear();
                          const mes = String(data.getMonth() + 1).padStart(2, '0');
                          const dia = String(data.getDate()).padStart(2, '0');
                          const hora = String(data.getHours()).padStart(2, '0');
                          const minuto = String(data.getMinutes()).padStart(2, '0');
                          return `${ano}${mes}${dia}T${hora}${minuto}00Z`;
                        };
                        
                        const dataInicioStr = formatarDataGoogle(dataInicio);
                        const dataFimStr = formatarDataGoogle(dataFim);
                        
                        const detalhes = aplicacoesDiaSelecionado
                          .map(a => `${a.paciente.nome} - Semana ${a.semana} - ${a.dose}mg - Local: ${a.localAplicacao === 'abdome' ? 'Abdome' : a.localAplicacao === 'coxa' ? 'Coxa' : 'Braço'}`)
                          .join('%0A');
                        
                        const titulo = `Aplicações Tirzepatida - ${diaSelecionado.toLocaleDateString('pt-BR')}`;
                        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${dataInicioStr}/${dataFimStr}&details=${encodeURIComponent(detalhes)}&ctz=America/Sao_Paulo`;
                        
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 flex-1 sm:flex-none justify-center"
                          >
                            <Calendar size={14} className="sm:w-4 sm:h-4" />
                            <span className="whitespace-nowrap">Adicionar Este Dia</span>
                          </a>
                        );
                      })()}
                      <button
                        onClick={() => {
                          setDiaSelecionado(null);
                          setAplicacoesDiaSelecionado([]);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X size={20} className="sm:w-6 sm:h-6" />
                      </button>
                    </div>
                  </div>
                  {aplicacoesDiaSelecionado.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Nenhuma aplicação agendada para este dia.
                    </p>
                  ) : (
                    <div className="space-y-4">
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
                  )}
                </div>
              )}
            </div>
          );
        };

        return renderizarCalendario();
      }

      case 'tirzepatida': {
        const tiposTirzepatida = ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'];
        const totalCarrinho = calcularTotal();
        const itensNoCarrinho = carrinho.length;

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Tirzepatida - Compras</h2>
              {itensNoCarrinho > 0 && (
                <button
                  onClick={limparCarrinho}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Limpar Carrinho
                </button>
              )}
            </div>

            {loadingTirzepatidaPrecos ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de Produtos */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Produtos Disponíveis</h3>
                    <div className="space-y-3">
                      {tiposTirzepatida.map((tipo) => {
                        const preco = tirzepatidaPrecos.find(p => p.tipo === tipo);
                        const itemNoCarrinho = carrinho.find(item => item.tipo === tipo);

                        return (
                          <div
                            key={tipo}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <Pill className="h-8 w-8 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">Tirzepatida {tipo}</p>
                                {preco ? (
                                  <p className="text-lg font-bold text-green-600">
                                    R$ {preco.preco.toFixed(2).replace('.', ',')}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-500">Preço não disponível</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {itemNoCarrinho ? (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => atualizarQuantidade(tipo, itemNoCarrinho.quantidade - 1)}
                                    className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                                  >
                                    <Minus className="h-4 w-4 text-gray-600" />
                                  </button>
                                  <span className="text-sm font-medium text-gray-900 w-8 text-center">
                                    {itemNoCarrinho.quantidade}
                                  </span>
                                  <button
                                    onClick={() => atualizarQuantidade(tipo, itemNoCarrinho.quantidade + 1)}
                                    className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                                  >
                                    <Plus className="h-4 w-4 text-gray-600" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => preco && adicionarAoCarrinho(tipo, preco.preco)}
                                  disabled={!preco}
                                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                                >
                                  <ShoppingCart className="h-4 w-4 mr-1" />
                                  Adicionar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Carrinho de Compras */}
                <div className="lg:col-span-1">
                  <div className="bg-white shadow rounded-lg p-6 sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Carrinho
                      </h3>
                      {itensNoCarrinho > 0 && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {itensNoCarrinho}
                        </span>
                      )}
                    </div>

                    {carrinho.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm">Seu carrinho está vazio</p>
                        <p className="text-xs text-gray-400 mt-1">Adicione produtos para começar</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {carrinho.map((item) => (
                            <div
                              key={item.tipo}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Tirzepatida {item.tipo}</p>
                                <p className="text-xs text-gray-500">
                                  {item.quantidade}x R$ {item.preco.toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                                </span>
                                <button
                                  onClick={() => removerDoCarrinho(item.tipo)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-gray-200 pt-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Subtotal</span>
                            <span className="text-sm text-gray-900">
                              R$ {totalCarrinho.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Frete</span>
                            <span className="text-sm text-gray-500">A calcular</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-base font-bold text-gray-900">Total</span>
                              <span className="text-xl font-bold text-green-600">
                                R$ {totalCarrinho.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            // TODO: Integrar com Stripe aqui
                            alert('Integração com Stripe será implementada em breve!');
                          }}
                          className="w-full py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
                        >
                          Finalizar Compra
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

      case 'indicacao': {
        const formatPhoneNumber = (phone: string) => {
          if (!phone) return '';
          const numbers = phone.replace(/\D/g, '');
          if (numbers.length <= 2) return `(${numbers}`;
          if (numbers.length <= 7) return `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
          return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
        };

        const getStatusLabel = (status: string) => {
          switch (status) {
            case 'pendente':
              return { label: 'Não visualizado', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
            case 'visualizada':
              return { label: 'Visualizado', color: 'bg-blue-100 text-blue-800', icon: Eye };
            case 'venda':
              return { label: 'Em consulta', color: 'bg-green-100 text-green-800', icon: CheckCircle };
            case 'paga':
              return { label: 'Encerrado', color: 'bg-purple-100 text-purple-800', icon: CheckCircle };
            default:
              return { label: 'Não visualizado', color: 'bg-gray-100 text-gray-800', icon: Clock };
          }
        };

        const handleVisualizarIndicacao = async (indicacaoId: string) => {
          try {
            await IndicacaoService.marcarComoVisualizada(indicacaoId);
            await loadIndicacoesPendentes();
            setMessage('Encaminhamento marcado como visualizado.');
          } catch (error) {
            console.error('Erro ao marcar como visualizada:', error);
            alert('Erro ao marcar encaminhamento como visualizado.');
          }
        };

        const handleMarcarComoPaga = async (indicacaoId: string) => {
          try {
            await IndicacaoService.marcarComoPaga(indicacaoId);
            await loadIndicacoesPendentes();
            setMessage('Encaminhamento marcado como encerrado.');
          } catch (error) {
            console.error('Erro ao marcar como paga:', error);
            alert('Erro ao marcar encaminhamento como encerrado.');
          }
        };

        const handleSalvarPlanoIndicacao = async () => {
          if (!medicoPerfil) return;
          
          try {
            const planoData = {
              ...planoIndicacaoForm,
              temPlanoIndicacao: planoIndicacaoForm.temPlanoIndicacao
            };
            
            const updates: Partial<Medico> = {
              temPlanoIndicacao: planoData.temPlanoIndicacao
            };
            
            if (planoData.temPlanoIndicacao) {
              updates.planoIndicacao = {
                tipoValor: planoData.tipoValor,
                tipoComissao: planoData.tipoComissao,
                ...(planoData.tipoComissao === 'por_dose' ? {
                  valorPorDose: planoData.valorPorDose
                } : {
                  tempoTratamentoMeses: planoData.tempoTratamentoMeses,
                  totalMedicamentoMg: planoData.totalMedicamentoMg,
                  valorComissaoTratamento: planoData.valorComissaoTratamento
                })
              };
            } else {
              updates.planoIndicacao = undefined;
            }
            
            await MedicoService.updateMedico(medicoPerfil.id, updates);
            
            await loadMedicoPerfil();
            setShowPlanoSalvoDialog(true);
          } catch (error) {
            console.error('Erro ao salvar plano:', error);
            alert('Erro ao salvar plano de encaminhamento.');
          }
        };

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Encaminhamentos</h2>
            
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTabIndicacao('minhas')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTabIndicacao === 'minhas'
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Encaminhamentos Recebidos
                </button>
              </div>

              <div className="p-6">
                {activeTabIndicacao === 'minhas' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Encaminhamentos Recebidos</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Acompanhe o andamento clínico dos pacientes encaminhados para você.
                        </p>
                      </div>
                      <button
                        onClick={loadIndicacoesPendentes}
                        disabled={loadingIndicacoes}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={16} className={loadingIndicacoes ? 'animate-spin' : ''} />
                        Atualizar
                      </button>
                    </div>

                    {loadingIndicacoes ? (
                      <div className="text-center py-8">
                        <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                        <p className="mt-2 text-gray-600">Carregando encaminhamentos...</p>
                      </div>
                    ) : indicacoesPendentes.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">Nenhum encaminhamento recebido ainda.</p>
                      </div>
                    ) : (
                      <>
                        {/* Estatísticas */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{indicacoesPendentes.length}</p>
                              <p className="text-xs text-gray-600">Total de encaminhamentos</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-yellow-600">
                                {indicacoesPendentes.filter(i => i.status === 'pendente' || i.status === 'visualizada').length}
                              </p>
                              <p className="text-xs text-gray-600">Aguardando primeiro contato</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">
                                {indicacoesPendentes.filter(i => i.status === 'venda' || i.status === 'paga').length}
                              </p>
                              <p className="text-xs text-gray-600">Em acompanhamento</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">
                                {indicacoesPendentes.filter(i => i.status === 'paga').length}
                              </p>
                              <p className="text-xs text-gray-600">Encerrados</p>
                            </div>
                          </div>
                          {indicacoesPendentes.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                                Adesão no acompanhamento: {((indicacoesPendentes.filter(i => i.status === 'venda' || i.status === 'paga').length / indicacoesPendentes.length) * 100).toFixed(1)}%
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Lista de Indicações */}
                        <div className="space-y-3">
                          {indicacoesPendentes.map((indicacao, index) => {
                            const statusInfo = getStatusLabel(indicacao.status);
                            const StatusIcon = statusInfo.icon;
                            const isExpanded = indicacoesExpandidas.has(indicacao.id);
                            
                            return (
                              <div key={indicacao.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                {/* Cabeçalho Compacto */}
                                <div 
                                  className="p-3 cursor-pointer"
                                  onClick={() => {
                                    const newExpanded = new Set(indicacoesExpandidas);
                                    if (isExpanded) {
                                      newExpanded.delete(indicacao.id);
                                    } else {
                                      newExpanded.add(indicacao.id);
                                    }
                                    setIndicacoesExpandidas(newExpanded);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-semibold text-gray-700">{index + 1}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                                            {indicacao.nomePaciente}
                                          </h4>
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusInfo.label}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600 truncate">
                                          Encaminhado por: Dr(a). {indicacao.indicadoPorNome || indicacao.indicadoPor}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {indicacao.status !== 'pendente' && (
                                        <a
                                          href={`https://wa.me/55${indicacao.telefonePaciente.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                          title="Contatar Paciente Encaminhado via WhatsApp"
                                        >
                                          <MessageCircleIcon size={16} />
                                        </a>
                                      )}
                                      {indicacao.indicadoPorTelefone && (
                                        <a
                                          href={`https://wa.me/55${indicacao.indicadoPorTelefone.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                          title="Contatar Quem Encaminhou via WhatsApp"
                                        >
                                          <MessageCircleIcon size={16} />
                                        </a>
                                      )}
                                      {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Conteúdo Expandido */}
                                {isExpanded && (
                                  <div className="border-t border-gray-200 p-4 space-y-4">
                                    {/* Quem Encaminhou */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <UserIcon className="w-4 h-4 text-blue-600" />
                                        <h5 className="text-xs font-semibold text-blue-900">Quem Encaminhou</h5>
                                      </div>
                                      <p className="text-sm font-medium text-gray-900 mb-1">
                                        {indicacao.indicadoPorNome || indicacao.indicadoPor}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Email: {indicacao.indicadoPor}
                                      </p>
                                      {indicacao.indicadoPorTelefone && (
                                        <p className="text-xs text-gray-600 mt-1">
                                          Telefone: {formatPhoneNumber(indicacao.indicadoPorTelefone)}
                                        </p>
                                      )}
                                    </div>

                                    {/* Paciente Encaminhado */}
                                    <div className="border-l-4 border-green-500 pl-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <UserPlus className="w-4 h-4 text-green-600" />
                                        <h5 className="text-xs font-semibold text-green-900">Paciente Encaminhado</h5>
                                      </div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                        {indicacao.nomePaciente}
                                      </h4>
                                      <p className="text-xs text-gray-600">
                                        {indicacao.cidade}, {indicacao.estado}
                                      </p>
                                      {indicacao.status !== 'pendente' && (
                                        <p className="text-xs text-gray-700 mt-1">
                                          <strong>Telefone:</strong> {formatPhoneNumber(indicacao.telefonePaciente)}
                                        </p>
                                      )}
                                    </div>

                                    {/* Datas e Status */}
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                                      <div>
                                        <p className="text-xs text-gray-500">Data do encaminhamento</p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {new Date(indicacao.criadoEm).toLocaleDateString('pt-BR')}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Status do atendimento</p>
                                        <p className="text-sm font-medium text-gray-900">
                                          {statusInfo.label}
                                        </p>
                                      </div>
                                      {indicacao.visualizadaEm && (
                                        <div>
                                          <p className="text-xs text-gray-500">Visualizada em</p>
                                          <p className="text-sm font-medium text-gray-900">
                                            {new Date(indicacao.visualizadaEm).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                      )}
                                      {indicacao.virouVendaEm && (
                                        <div>
                                          <p className="text-xs text-gray-500">Virou venda em</p>
                                          <p className="text-sm font-medium text-green-700">
                                            {new Date(indicacao.virouVendaEm).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                      )}
                                      {indicacao.pagaEm && (
                                        <div>
                                          <p className="text-xs text-gray-500">Paga em</p>
                                          <p className="text-sm font-medium text-purple-700">
                                            {new Date(indicacao.pagaEm).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Ações */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                                      {indicacao.status === 'pendente' && (
                                        <button
                                          onClick={() => handleVisualizarIndicacao(indicacao.id)}
                                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                                        >
                                          <Eye size={14} />
                                          Visualizar
                                        </button>
                                      )}
                                      {indicacao.status === 'venda' && (
                                        <button
                                          onClick={() => handleMarcarComoPaga(indicacao.id)}
                                          className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                                        >
                                          <DollarSign size={14} />
                                          Marcar como Paga
                                        </button>
                                      )}
                                    </div>
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
                    </div>
            </div>
          </div>
        );
      }

      default:
        return null;
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

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Será redirecionado
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        <div className={`hidden lg:block fixed inset-y-0 left-0 z-40 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <div className="flex flex-col h-full">
            {/* Logo e botão de toggle */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
              {!sidebarCollapsed && (
                <div className="flex items-center">
                  <img
                    src="/icones/oftware.png"
                    alt="Oftware Logo"
                    className="h-10 w-10"
                  />
                  <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Oftware</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
                </button>
              </div>
            </div>

            {/* User info */}
            {!sidebarCollapsed && (
              <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Bem-vindo, {medicoPerfil ? `${medicoPerfil.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoPerfil.nome}` : 'Admin'}
                  </p>
                  {medicoPerfil && (
                    medicoPerfil.isVerificado ? (
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <Shield className="h-4 w-4 text-red-600" />
                    )
                  )}
                </div>
                {medicoPerfil && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
                    medicoPerfil.isVerificado
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {medicoPerfil.isVerificado ? (
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
                )}
                <p className="text-xs text-gray-500">
                  {user.email}
                </p>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              <button
                onClick={() => setActiveMenu('indicacao')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'indicacao'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={sidebarCollapsed ? 'Encaminhados' : ''}
              >
                <UserPlus size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Encaminhados'}
              </button>
              <button
                onClick={() => setActiveMenu('estatisticas')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'estatisticas'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={sidebarCollapsed ? 'Leads' : ''}
              >
                <UserPlus size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Leads'}
              </button>
              <button
                onClick={() => setActiveMenu('pacientes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                  activeMenu === 'pacientes'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={sidebarCollapsed ? 'Pacientes' : ''}
              >
                <Users size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Pacientes'}
                {solicitacoesPendentesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {solicitacoesPendentesCount > 9 ? '9+' : solicitacoesPendentesCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveMenu('calendario')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'calendario'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-r-2 border-green-500 dark:border-green-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={sidebarCollapsed ? 'Calendário' : ''}
              >
                <Calendar size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Calendário'}
              </button>
              {/* Mensagens desativado - mantido para possível uso futuro */}
              {/* <button
                onClick={() => setActiveMenu('mensagens')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'mensagens'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Mensagens' : ''}
              >
                <MessageSquare size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Mensagens'}
              </button> */}
              <button
                onClick={() => setActiveMenu('tirzepatida')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'tirzepatida'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Tirzepatida' : ''}
              >
                <Pill size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Tirzepatida'}
              </button>
            </nav>

            {/* Profile button */}
            <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title={sidebarCollapsed ? 'Perfil' : ''}
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className={`w-8 h-8 rounded-full ${sidebarCollapsed ? '' : 'mr-3'}`}
                    />
                  ) : (
                    <UserCircle size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
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
                          setActiveMenu('meu-perfil');
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Stethoscope size={16} className="text-gray-600 dark:text-gray-400" />
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => {
                          // Navegar para área de exames (se existir) ou manter como está
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FlaskConical size={16} className="text-gray-600 dark:text-gray-400" />
                        Meus Exames
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          // Por enquanto apenas fecha o menu - funcionalidade de recomendações pode ser implementada futuramente
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <AlertTriangle size={16} className="text-gray-600 dark:text-gray-400" />
                        Recomendações
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
        
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-16' : 'ml-64'} overflow-x-hidden pb-20 lg:pb-0 bg-gray-50 dark:bg-gray-900`}>
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <img
                  src="/icones/oftware.png"
                  alt="Oftware Logo"
                  className="h-8 w-8 flex-shrink-0"
                />
                <div className="ml-2 flex items-center gap-1.5 min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {medicoPerfil ? `${medicoPerfil.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoPerfil.nome}` : 'Admin'}
                  </p>
                  {medicoPerfil && (
                    <>
                      {medicoPerfil.isVerificado ? (
                        <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Shield className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        medicoPerfil.isVerificado
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {medicoPerfil.isVerificado ? (
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
                    </>
                  )}
                </div>
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
                              setActiveMenu('meu-perfil');
                              setShowProfileDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Stethoscope size={16} className="text-gray-600 dark:text-gray-400" />
                            Meu Perfil
                          </button>
                          <button
                            onClick={() => {
                              // Navegar para área de exames (se existir) ou manter como está
                              setShowProfileDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <FlaskConical size={16} className="text-gray-600 dark:text-gray-400" />
                            Meus Exames
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              // Por enquanto apenas fecha o menu - funcionalidade de recomendações pode ser implementada futuramente
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <AlertTriangle size={16} className="text-gray-600 dark:text-gray-400" />
                            Recomendações
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
          
          <main className="p-6 bg-gray-50 dark:bg-gray-900">
            {message && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Editar Usuário
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
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
                  <label className="block text-sm font-medium text-gray-700">
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Cadastrar Residente</h3>
            </div>
            <form onSubmit={handleAddResidente} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    value={newResidente.nome}
                    onChange={(e) => setNewResidente({ ...newResidente, nome: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nível</label>
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
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newResidente.email}
                    onChange={(e) => setNewResidente({ ...newResidente, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone (opcional)</label>
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Cadastrar Local</h3>
            </div>
            <form onSubmit={handleAddLocal} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome do Local</label>
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Cadastrar Serviço</h3>
            </div>
            <form onSubmit={handleAddServico} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome do Serviço</label>
                  <input
                    type="text"
                    value={newServico.nome}
                    onChange={(e) => setNewServico({ ...newServico, nome: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Local</label>
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

      {/* Modal de Cadastrar Paciente */}
      {showCadastrarPacienteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cadastrar Novo Paciente</h2>
          <button
                onClick={() => {
                  setShowCadastrarPacienteModal(false);
                  setNovoPaciente({ nome: '', email: '', telefone: '', cpf: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
          </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCriarPaciente(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={novoPaciente.nome}
                    onChange={(e) => setNovoPaciente({ ...novoPaciente, nome: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Digite o nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={novoPaciente.email}
                    onChange={(e) => setNovoPaciente({ ...novoPaciente, email: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Digite o e-mail"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={novoPaciente.telefone}
                    onChange={(e) => setNovoPaciente({ ...novoPaciente, telefone: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={novoPaciente.cpf}
                    onChange={(e) => setNovoPaciente({ ...novoPaciente, cpf: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Importante:</strong> Após o cadastro, você poderá adicionar informações completas nas 9 pastas do paciente.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
          <button
                  type="button"
                  onClick={() => {
                    setShowCadastrarPacienteModal(false);
                    setNovoPaciente({ nome: '', email: '', telefone: '', cpf: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
          </button>
                <button
                  type="submit"
                  disabled={loadingPacientes}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loadingPacientes ? 'Salvando...' : 'Cadastrar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Editar Paciente com 9 Pastas */}
      {showEditarPacienteModal && pacienteEditando && (() => {
        const isAbandono = pacienteEditando.statusTratamento === 'abandono';
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col ${isAbandono ? 'paciente-abandono-view' : ''}`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {pacienteEditando.statusTratamento === 'abandono' ? 'Visualizar Paciente' : 'Editar Paciente'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{pacienteEditando.nome}</p>
                  {/* Aviso sobre leitura das recomendações */}
                  {pacienteEditando.recomendacoesLidas ? (
                    <div className="mt-2 flex items-center gap-2 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-md border border-green-200">
                      <AlertCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium">✓ Paciente leu e compreendeu as recomendações</span>
                      {pacienteEditando.dataLeituraRecomendacoes && pacienteEditando.dataLeituraRecomendacoes instanceof Date && !isNaN(pacienteEditando.dataLeituraRecomendacoes.getTime()) && (
                        <span className="text-xs text-green-600 ml-2">
                          ({new Date(pacienteEditando.dataLeituraRecomendacoes).toLocaleDateString('pt-BR')})
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-sm bg-orange-50 text-orange-700 px-3 py-1.5 rounded-md border border-orange-200">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">⚠ Paciente ainda não leu as recomendações</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <select
                    value={pacienteEditando.statusTratamento || 'pendente'}
                    onChange={(e) => {
                      setPacienteEditando({
                        ...pacienteEditando,
                        statusTratamento: e.target.value as 'pendente' | 'em_tratamento' | 'concluido' | 'abandono'
                      });
                    }}
                    disabled={pacienteEditando.statusTratamento === 'abandono'}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_tratamento">Em Tratamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="abandono">Abandono</option>
                  </select>
                  <button
                    onClick={async () => {
                      // Verificar se há alterações não salvas (apenas se não for abandono)
                      if (!isAbandono) {
                        await verificarAlteracoesESair(
                          () => {
                            // Sair sem salvar
                            setShowEditarPacienteModal(false);
                            setPacienteEditando(null);
                            setPacienteEditandoOriginal(null);
                            setPastaAtiva(1);
                          },
                          async () => {
                            // Salvar
                            setLoadingPacientes(true);
                            try {
                              // Criar registros de semanas canceladas que ainda não existem
                              const semanasCanceladas = pacienteEditando?.planoTerapeutico?.semanasCanceladas;
                              if (semanasCanceladas && semanasCanceladas.length > 0) {
                                const evolucao = pacienteEditando.evolucaoSeguimento || [];
                                const planoTerapeutico = pacienteEditando.planoTerapeutico;
                                const hoje = new Date();
                                hoje.setHours(0, 0, 0, 0);
                                
                                // Criar registros para semanas canceladas que ainda não existem
                                const novasSemanasPuladas: any[] = [];
                                for (const semanaCancelada of semanasCanceladas) {
                                  // Verificar se já existe registro para esta semana
                                  const jaExiste = evolucao.some((e: any) => e.weekIndex === semanaCancelada);
                                  if (!jaExiste && planoTerapeutico.startDate) {
                                    const dataSemanaPulada = new Date(planoTerapeutico.startDate);
                                    dataSemanaPulada.setDate(dataSemanaPulada.getDate() + (semanaCancelada - 1) * 7);
                                    
                                    // Só criar se a data já passou ou é hoje
                                    dataSemanaPulada.setHours(0, 0, 0, 0);
                                    if (dataSemanaPulada <= hoje) {
                                      const registroSemanaPulada = {
                                        id: 'seguimento-cancelada-' + semanaCancelada + '-' + Date.now(),
                                        weekIndex: semanaCancelada,
                                        dataRegistro: dataSemanaPulada,
                                        peso: undefined,
                                        circunferenciaAbdominal: undefined,
                                        frequenciaCardiaca: undefined,
                                        pressaoArterial: undefined,
                                        hba1c: undefined,
                                        doseAplicada: undefined,
                                        adherence: 'MISSED' as any,
                                        giSeverity: undefined,
                                        localAplicacao: undefined,
                                        observacoesPaciente: 'Semana cancelada pelo médico no plano terapêutico.',
                                        comentarioMedico: 'Registrado automaticamente: semana cancelada no item 5.2 (Dose e Titulação).',
                                        alerts: ['MISSED_DOSE']
                                      };
                                      novasSemanasPuladas.push(registroSemanaPulada);
                                    }
                                  }
                                }
                                
                                // Adicionar novos registros ao paciente
                                if (novasSemanasPuladas.length > 0) {
                                  const evolucaoAtualizada = [...evolucao, ...novasSemanasPuladas].sort((a: any, b: any) => (a.weekIndex || 0) - (b.weekIndex || 0));
                                  
                                  // Gerar alertas para semanas canceladas
                                  const alertasExistentes = pacienteEditando.alertas || [];
                                  const alertasNovos: any[] = [];
                                  for (const semanaCancelada of semanasCanceladas) {
                                    const alertasPulada = alertEngine({
                                      adherence: 'MISSED' as any,
                                      giSeverity: undefined as any,
                                      weekIndex: semanaCancelada
                                    });
                                    alertasPulada.forEach(alerta => {
                                      if (!alertasExistentes.some(existente => 
                                        existente.type === alerta.type && existente.linkedWeek === alerta.linkedWeek
                                      )) {
                                        alertasNovos.push(alerta);
                                      }
                                    });
                                  }
                                  
                                  pacienteEditando.evolucaoSeguimento = evolucaoAtualizada;
                                  if (alertasNovos.length > 0) {
                                    pacienteEditando.alertas = [...alertasExistentes, ...alertasNovos];
                                  }
                                }
                              }
                              
                              await PacienteService.createOrUpdatePaciente(pacienteEditando!);
                              
                              // Recarregar paciente atualizado do banco para garantir que todos os dados estão sincronizados
                              const pacienteRecarregado = await PacienteService.getPacienteById(pacienteEditando!.id);
                              if (pacienteRecarregado) {
                                setPacienteEditando(pacienteRecarregado);
                                setPacienteEditandoOriginal(JSON.parse(JSON.stringify(pacienteRecarregado))); // Deep copy
                              }
                              
                              await loadPacientes();
                              setMessage('Paciente atualizado com sucesso!');
                            } catch (error) {
                              console.error('Erro ao atualizar paciente:', error);
                              setMessage('Erro ao atualizar paciente');
                              throw error; // Re-throw para impedir fechamento se houver erro
                            } finally {
                              setLoadingPacientes(false);
                            }
                          }
                        );
                      } else {
                        // Se for abandono, sair diretamente
                        setShowEditarPacienteModal(false);
                        setPacienteEditando(null);
                        setPacienteEditandoOriginal(null);
                        setPastaAtiva(1);
                      }
                    }}
                    className="close-button text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                    aria-label="Fechar"
                    title="Fechar"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              {/* Alerta de abandono */}
              {pacienteEditando.statusTratamento === 'abandono' && (
                <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">
                        <strong>Paciente abandonou o tratamento.</strong> Este registro está bloqueado para edição.
                        {pacienteEditando.motivoAbandono && (
                          <span className="block mt-1 italic">Motivo: {pacienteEditando.motivoAbandono}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Alerta para alterar status de Pendente para Em Tratamento */}
              {pacienteEditando.statusTratamento === 'pendente' && (
                <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Importante:</strong> Por favor, altere o status de <strong>"Pendente"</strong> para <strong>"Em Tratamento"</strong> no seletor acima para iniciar o acompanhamento do paciente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs das 9 Pastas */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {[
                { id: 1, nome: 'Dados de Identificação' },
                { id: 2, nome: 'Dados Clínicos' },
                { id: 3, nome: 'Nutrologia' },
                { id: 4, nome: 'Exames Laboratoriais' },
                { id: 5, nome: 'Plano Terapêutico' },
                { id: 6, nome: 'Evolução/Seguimento' },
                { id: 7, nome: 'Alertas e Eventos' },
                { id: 8, nome: 'Comunicação' },
                { id: 9, nome: 'Prescrições' }
              ].map((pasta) => (
                <button
                  key={pasta.id}
                  onClick={() => setPastaAtiva(pasta.id)}
                  className={`tab-button px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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
            <div className={`flex-1 overflow-y-auto p-6 ${isAbandono ? 'paciente-abandono-view' : ''}`}>
              {pastaAtiva === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dados de Identificação</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                      <input
                        type="text"
                        value={pacienteEditando.dadosIdentificacao?.nomeCompleto || ''}
                        onChange={(e) => {
                          if (isAbandono) return;
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              nomeCompleto: e.target.value
                            }
                          });
                        }}
                        disabled={isAbandono}
                        readOnly={isAbandono}
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 ${isAbandono ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={pacienteEditando.dadosIdentificacao?.email || ''}
                        onChange={(e) => {
                          if (isAbandono) return;
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              email: e.target.value
                            }
                          });
                        }}
                        disabled={isAbandono}
                        readOnly={isAbandono}
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 ${isAbandono ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={pacienteEditando.dadosIdentificacao?.telefone || ''}
                        onChange={(e) => {
                          if (isAbandono) return;
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              telefone: e.target.value
                            }
                          });
                        }}
                        disabled={isAbandono}
                        readOnly={isAbandono}
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 ${isAbandono ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                      <input
                        type="text"
                        value={pacienteEditando.dadosIdentificacao?.cpf || ''}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              cpf: e.target.value
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                      <input
                        type="date"
                        value={(() => {
                          const date = pacienteEditando.dadosIdentificacao?.dataNascimento;
                          if (!date) return '';
                          try {
                            const d = new Date(date);
                            if (!isNaN(d.getTime())) {
                              return d.toISOString().split('T')[0];
                            }
                            return '';
                          } catch {
                            return '';
                          }
                        })()}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              dataNascimento: e.target.value ? new Date(e.target.value) : undefined
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sexo Biológico</label>
                      <select
                        value={pacienteEditando.dadosIdentificacao?.sexoBiologico || ''}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              sexoBiologico: e.target.value as 'M' | 'F' | 'Outro' | undefined
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    
                    {/* CEP */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pacienteEditando.dadosIdentificacao?.endereco?.cep || ''}
                          onChange={(e) => {
                            const cepValue = e.target.value.replace(/\D/g, '');
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosIdentificacao: {
                                ...pacienteEditando.dadosIdentificacao,
                                endereco: {
                                  ...pacienteEditando.dadosIdentificacao?.endereco,
                                  cep: cepValue.length <= 8 ? cepValue : cepValue.slice(0, 8)
                                }
                              }
                            });
                          }}
                          onBlur={async (e) => {
                            const cepValue = e.target.value.replace(/\D/g, '');
                            if (cepValue.length === 8) {
                              try {
                                const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
                                const data = await response.json();
                                if (!data.erro) {
                                  setPacienteEditando({
                                    ...pacienteEditando,
                                    dadosIdentificacao: {
                                      ...pacienteEditando.dadosIdentificacao,
                                      endereco: {
                                        ...pacienteEditando.dadosIdentificacao?.endereco,
                                        cep: data.cep?.replace(/\D/g, '') || cepValue,
                                        rua: data.logradouro || '',
                                        cidade: data.localidade || '',
                                        estado: data.uf || ''
                                      }
                                    }
                                  });
                                }
                              } catch (error) {
                                console.error('Erro ao buscar CEP:', error);
                              }
                            }
                          }}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          placeholder="Ex: 12345678"
                          maxLength={9}
                        />
          <button
                          type="button"
                          onClick={async () => {
                            const cepValue = pacienteEditando.dadosIdentificacao?.endereco?.cep?.replace(/\D/g, '');
                            if (cepValue && cepValue.length === 8) {
                              try {
                                const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
                                const data = await response.json();
                                if (!data.erro) {
                                  setPacienteEditando({
                                    ...pacienteEditando,
                                    dadosIdentificacao: {
                                      ...pacienteEditando.dadosIdentificacao,
                                      endereco: {
                                        ...pacienteEditando.dadosIdentificacao?.endereco,
                                        cep: data.cep?.replace(/\D/g, '') || cepValue,
                                        rua: data.logradouro || '',
                                        cidade: data.localidade || '',
                                        estado: data.uf || ''
                                      }
                                    }
                                  });
                                }
                              } catch (error) {
                                console.error('Erro ao buscar CEP:', error);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          Buscar
                        </button>
                      </div>
                    </div>

                    {/* Endereço - Rua */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Endereço (Rua)</label>
                      <input
                        type="text"
                        value={pacienteEditando.dadosIdentificacao?.endereco?.rua || ''}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              endereco: {
                                ...pacienteEditando.dadosIdentificacao?.endereco,
                                rua: e.target.value
                              }
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        placeholder="Ex: Rua Exemplo, 123"
                      />
                    </div>

                    {/* Cidade e Estado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                      <input
                        type="text"
                        value={pacienteEditando.dadosIdentificacao?.endereco?.cidade || ''}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              endereco: {
                                ...pacienteEditando.dadosIdentificacao?.endereco,
                                cidade: e.target.value
                              }
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        placeholder="Ex: São Paulo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                      <input
                        type="text"
                        value={pacienteEditando.dadosIdentificacao?.endereco?.estado || ''}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              endereco: {
                                ...pacienteEditando.dadosIdentificacao?.endereco,
                                estado: e.target.value
                              }
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        placeholder="Ex: SP"
                      />
                    </div>

                    {/* Data de Cadastro e Médico Responsável */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data de Cadastro</label>
                      <input
                        type="text"
                        value={(() => {
                          const date = pacienteEditando.dadosIdentificacao?.dataCadastro;
                          if (!date) return '';
                          try {
                            const d = new Date(date);
                            if (!isNaN(d.getTime())) {
                              return d.toLocaleDateString('pt-BR');
                            }
                            return '';
                          } catch {
                            return '';
                          }
                        })()}
                        readOnly
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Médico Responsável</label>
                      <input
                        type="text"
                        value={(() => {
                          const medico = medicoPerfil;
                          if (!medico) return '';
                          const titulo = medico.genero === 'F' ? 'Dra.' : 'Dr.';
                          return `${titulo} ${medico.nome}`;
                        })()}
                        readOnly
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {pastaAtiva === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dados Clínicos da Anamnese</h3>
                  
                  {/* 2.1 Medidas Iniciais */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.1 Medidas Iniciais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                        <input
                          type="number"
                          min="20"
                          max="400"
                          value={pacienteEditando.dadosClinicos?.medidasIniciais?.peso || ''}
                          onChange={(e) => {
                            const peso = parseFloat(e.target.value) || 0;
                            const altura = pacienteEditando.dadosClinicos?.medidasIniciais?.altura || 0;
                            const imc = altura > 0 ? (peso / Math.pow(altura / 100, 2)).toFixed(2) : 0;
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                medidasIniciais: {
                                  ...pacienteEditando.dadosClinicos?.medidasIniciais,
                                  peso,
                                  imc: parseFloat(imc.toString())
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label>
                        <input
                          type="number"
                          min="120"
                          max="230"
                          value={pacienteEditando.dadosClinicos?.medidasIniciais?.altura || ''}
                          onChange={(e) => {
                            const altura = parseFloat(e.target.value) || 0;
                            const peso = pacienteEditando.dadosClinicos?.medidasIniciais?.peso || 0;
                            const imc = altura > 0 ? (peso / Math.pow(altura / 100, 2)).toFixed(2) : 0;
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                medidasIniciais: {
                                  ...pacienteEditando.dadosClinicos?.medidasIniciais,
                                  altura,
                                  imc: parseFloat(imc.toString())
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">IMC (kg/m²)</label>
                        <input
                          type="text"
                          value={pacienteEditando.dadosClinicos?.medidasIniciais?.imc?.toFixed(2) || ''}
                          readOnly
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50"
                        />
                        {pacienteEditando.dadosClinicos?.medidasIniciais?.imc && (
                          <p className={`mt-2 text-sm ${getCorGrauObesidade(calcularGrauObesidade(pacienteEditando.dadosClinicos?.medidasIniciais?.imc))}`}>
                            <strong>Grau de Obesidade:</strong> {calcularGrauObesidade(pacienteEditando.dadosClinicos?.medidasIniciais?.imc)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Circunf. Abdominal (cm)</label>
                        <input
                          type="number"
                          min="40"
                          max="200"
                          value={pacienteEditando.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                medidasIniciais: {
                                  ...pacienteEditando.dadosClinicos?.medidasIniciais,
                                  circunferenciaAbdominal: parseFloat(e.target.value) || 0
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2.2 Diagnóstico Principal */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.2 Diagnóstico Principal</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="diagnosticoPrincipal"
                          value="dm2"
                          checked={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'dm2'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                diagnosticoPrincipal: { tipo: 'dm2' }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Diabetes mellitus tipo 2 (DM2)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="diagnosticoPrincipal"
                          value="obesidade"
                          checked={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'obesidade'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                diagnosticoPrincipal: { tipo: 'obesidade' }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Obesidade (IMC ≥ 30)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="diagnosticoPrincipal"
                          value="sobrepeso_comorbidade"
                          checked={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'sobrepeso_comorbidade'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                diagnosticoPrincipal: { tipo: 'sobrepeso_comorbidade' }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Sobrepeso com comorbidade (IMC 27-29,9 + comorbidade)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="diagnosticoPrincipal"
                          value="pre_diabetes"
                          checked={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'pre_diabetes'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                diagnosticoPrincipal: { tipo: 'pre_diabetes' }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Pré-diabetes (IFG/ITG)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="diagnosticoPrincipal"
                          value="resistencia_insulinica"
                          checked={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'resistencia_insulinica'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                diagnosticoPrincipal: { tipo: 'resistencia_insulinica' }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Resistência insulínica/Síndrome metabólica</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="diagnosticoPrincipal"
                          value="sop_ri"
                          checked={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'sop_ri'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                diagnosticoPrincipal: { tipo: 'sop_ri' }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Síndrome dos ovários policísticos (SOP) com RI</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="diagnosticoPrincipal"
                          value="ehna_sem_dm2"
                          checked={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'ehna_sem_dm2'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                diagnosticoPrincipal: { tipo: 'ehna_sem_dm2' }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Esteatose hepática não alcoólica (EHNA) sem DM2</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="diagnosticoPrincipal"
                          value="outro"
                          checked={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'outro'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                diagnosticoPrincipal: { tipo: 'outro' }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Outro (especificar)</span>
                      </label>
                      {pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.tipo === 'outro' && (
                        <div className="ml-6">
                          <input
                            type="text"
                            value={pacienteEditando.dadosClinicos?.diagnosticoPrincipal?.outro || ''}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  diagnosticoPrincipal: {
                                    tipo: 'outro',
                                    outro: e.target.value
                                  }
                                }
                              });
                            }}
                            placeholder="Especificar diagnóstico"
                            className="w-full md:w-96 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2.3 Comorbidades Associadas */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.3 Comorbidades Associadas</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.hipertensaoArterial || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  hipertensaoArterial: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Hipertensão arterial (HAS)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.dislipidemia || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  dislipidemia: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Dislipidemia (DLP)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.apneiaObstrutivaSono || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  apneiaObstrutivaSono: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Apneia obstrutiva do sono (AOS)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.esteatoseEHNA || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  esteatoseEHNA: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Esteatose/EHNA</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.doencaCardiovascular || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  doencaCardiovascular: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Doença cardiovascular (ex.: DAC, IC, AVE prévio)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.doencaRenalCronica || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  doencaRenalCronica: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Doença renal crônica (DRC)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.sop || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  sop: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">SOP</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.hipotireoidismo || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  hipotireoidismo: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Hipotireoidismo</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.asmaDPOC || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  asmaDPOC: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Asma/DPOC</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.transtornoAnsiedadeDepressao || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  transtornoAnsiedadeDepressao: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Transtorno de ansiedade/depressão</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.nenhuma || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  nenhuma: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Nenhuma</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.comorbidades?.outra || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                comorbidades: {
                                  ...pacienteEditando.dadosClinicos?.comorbidades,
                                  outra: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Outra (especificar)</span>
                      </label>
                      {pacienteEditando.dadosClinicos?.comorbidades?.outra && (
                        <div className="ml-6">
                          <input
                            type="text"
                            value={pacienteEditando.dadosClinicos?.comorbidades?.outraDescricao || ''}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  comorbidades: {
                                    ...pacienteEditando.dadosClinicos?.comorbidades,
                                    outraDescricao: e.target.value
                                  }
                                }
                              });
                            }}
                            placeholder="Especificar comorbidade"
                            className="w-full md:w-96 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2.4 Medicações em uso atual */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.4 Medicações em uso atual</h4>
                    <div className="space-y-3">
                      {pacienteEditando.dadosClinicos?.medicacoesUsoAtual?.map((med, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <select
                            value={med.categoria}
                            onChange={(e) => {
                              const meds = [...(pacienteEditando.dadosClinicos?.medicacoesUsoAtual || [])];
                              meds[index] = { ...med, categoria: e.target.value as any };
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  medicacoesUsoAtual: meds
                                }
                              });
                            }}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
                          >
                            <option value="metformina">Metformina</option>
                            <option value="sglt2i">SGLT2i (dapagliflozina/empagliflozina)</option>
                            <option value="insulina">Insulina basal/bolus</option>
                            <option value="statina">Estatina</option>
                            <option value="anti_hipertensivo">Anti-hipertensivo (IECA/BRA, BCC, tiazídico)</option>
                            <option value="antidepressivo">Antidepressivo/ansiolítico</option>
                            <option value="outro">Outro</option>
                          </select>
                          <input
                            type="text"
                            value={med.nomeFarmaco}
                            onChange={(e) => {
                              const meds = [...(pacienteEditando.dadosClinicos?.medicacoesUsoAtual || [])];
                              meds[index] = { ...med, nomeFarmaco: e.target.value };
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  medicacoesUsoAtual: meds
                                }
                              });
                            }}
                            placeholder="Nome do fármaco"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
                          />
                          <input
                            type="text"
                            value={med.dose}
                            onChange={(e) => {
                              const meds = [...(pacienteEditando.dadosClinicos?.medicacoesUsoAtual || [])];
                              meds[index] = { ...med, dose: e.target.value };
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  medicacoesUsoAtual: meds
                                }
                              });
                            }}
                            placeholder="Dose"
                            className="w-32 border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
                          />
                          <input
                            type="text"
                            value={med.frequencia}
                            onChange={(e) => {
                              const meds = [...(pacienteEditando.dadosClinicos?.medicacoesUsoAtual || [])];
                              meds[index] = { ...med, frequencia: e.target.value };
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  medicacoesUsoAtual: meds
                                }
                              });
                            }}
                            placeholder="Freq."
                            className="w-32 border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const meds = pacienteEditando.dadosClinicos?.medicacoesUsoAtual || [];
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  medicacoesUsoAtual: meds.filter((_, i) => i !== index)
                                }
                              });
                            }}
                            className="px-2 py-2 text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const meds = [...(pacienteEditando.dadosClinicos?.medicacoesUsoAtual || []), {
                            categoria: 'outro' as const,
                            nomeFarmaco: '',
                            dose: '',
                            frequencia: ''
                          }];
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosClinicos: {
                              ...pacienteEditando.dadosClinicos,
                              medicacoesUsoAtual: meds
                            }
                          });
                        }}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Plus size={16} className="mr-1" />
                        Adicionar medicação
                      </button>
                    </div>
                  </div>

                  {/* 2.5 Alergias */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.5 Alergias</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.alergias?.semAlergias || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                alergias: {
                                  ...pacienteEditando.dadosClinicos?.alergias,
                                  semAlergias: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Sem alergias conhecidas</span>
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!!pacienteEditando.dadosClinicos?.alergias?.medicamentosa}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  alergias: {
                                    ...pacienteEditando.dadosClinicos?.alergias,
                                    medicamentosa: e.target.checked ? { farmaco: '', reacao: '' } : undefined
                                  }
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">Medicamentosa</span>
                        </label>
                        {pacienteEditando.dadosClinicos?.alergias?.medicamentosa && (
                          <div className="ml-6 space-y-2">
                            <input
                              type="text"
                              value={pacienteEditando.dadosClinicos?.alergias?.medicamentosa?.farmaco || ''}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    alergias: {
                                      ...pacienteEditando.dadosClinicos?.alergias,
                                      medicamentosa: {
                                        ...pacienteEditando.dadosClinicos?.alergias?.medicamentosa!,
                                        farmaco: e.target.value
                                      }
                                    }
                                  }
                                });
                              }}
                              placeholder="Fármaco"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
                            />
                            <input
                              type="text"
                              value={pacienteEditando.dadosClinicos?.alergias?.medicamentosa?.reacao || ''}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    alergias: {
                                      ...pacienteEditando.dadosClinicos?.alergias,
                                      medicamentosa: {
                                        ...pacienteEditando.dadosClinicos?.alergias?.medicamentosa!,
                                        reacao: e.target.value
                                      }
                                    }
                                  }
                                });
                              }}
                              placeholder="Reação"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
                            />
                          </div>
                        )}
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!!pacienteEditando.dadosClinicos?.alergias?.alimento}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  alergias: {
                                    ...pacienteEditando.dadosClinicos?.alergias,
                                    alimento: e.target.checked ? '' : undefined
                                  }
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">Alimento</span>
                        </label>
                        {pacienteEditando.dadosClinicos?.alergias?.alimento !== undefined && (
                          <div className="ml-6">
                            <input
                              type="text"
                              value={pacienteEditando.dadosClinicos?.alergias?.alimento || ''}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    alergias: {
                                      ...pacienteEditando.dadosClinicos?.alergias,
                                      alimento: e.target.value
                                    }
                                  }
                                });
                              }}
                              placeholder="Especificar alimento"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
                            />
                          </div>
                        )}
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!!pacienteEditando.dadosClinicos?.alergias?.latexAdesivo}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  alergias: {
                                    ...pacienteEditando.dadosClinicos?.alergias,
                                    latexAdesivo: e.target.checked ? '' : undefined
                                  }
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">Látex/adesivo</span>
                        </label>
                        {pacienteEditando.dadosClinicos?.alergias?.latexAdesivo !== undefined && (
                          <div className="ml-6">
                            <input
                              type="text"
                              value={pacienteEditando.dadosClinicos?.alergias?.latexAdesivo || ''}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    alergias: {
                                      ...pacienteEditando.dadosClinicos?.alergias,
                                      latexAdesivo: e.target.value
                                    }
                                  }
                                });
                              }}
                              placeholder="Especificar"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2.6 Riscos e condições */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.6 Riscos e condições que impactam a tirzepatida</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pancreatite prévia</label>
                        <div className="space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="pancreatitePrevia"
                              value="sim"
                              checked={pacienteEditando.dadosClinicos?.riscos?.pancreatitePrevia === 'sim'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      pancreatitePrevia: 'sim' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Sim</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="pancreatitePrevia"
                              value="nao"
                              checked={pacienteEditando.dadosClinicos?.riscos?.pancreatitePrevia === 'nao'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      pancreatitePrevia: 'nao' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Não</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gastroparesia diagnosticada</label>
                        <div className="space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="gastroparesia"
                              value="sim"
                              checked={pacienteEditando.dadosClinicos?.riscos?.gastroparesia === 'sim'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      gastroparesia: 'sim' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Sim</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="gastroparesia"
                              value="nao"
                              checked={pacienteEditando.dadosClinicos?.riscos?.gastroparesia === 'nao'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      gastroparesia: 'nao' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Não</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Histórico familiar CMT ou MEN2</label>
                        <div className="space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="historicoCMT"
                              value="sim"
                              checked={pacienteEditando.dadosClinicos?.riscos?.historicoCMT_MEN2 === 'sim'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      historicoCMT_MEN2: 'sim' as const
                                    }
                                  }
                                });
                                // TODO: Gerar alerta MEN2_RISK e bloquear plano
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Sim</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="historicoCMT"
                              value="nao"
                              checked={pacienteEditando.dadosClinicos?.riscos?.historicoCMT_MEN2 === 'nao'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      historicoCMT_MEN2: 'nao' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Não</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="historicoCMT"
                              value="desconheco"
                              checked={pacienteEditando.dadosClinicos?.riscos?.historicoCMT_MEN2 === 'desconheco'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      historicoCMT_MEN2: 'desconheco' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Desconheço</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gestação</label>
                        <div className="space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="gestacao"
                              value="sim"
                              checked={pacienteEditando.dadosClinicos?.riscos?.gestacao === 'sim'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      gestacao: 'sim' as const
                                    }
                                  }
                                });
                                // TODO: Gerar alerta e bloquear plano
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Sim</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="gestacao"
                              value="nao"
                              checked={pacienteEditando.dadosClinicos?.riscos?.gestacao === 'nao'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      gestacao: 'nao' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Não</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="gestacao"
                              value="desconheco"
                              checked={pacienteEditando.dadosClinicos?.riscos?.gestacao === 'desconheco'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      gestacao: 'desconheco' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Desconheço</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Lactação</label>
                        <div className="space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="lactacao"
                              value="sim"
                              checked={pacienteEditando.dadosClinicos?.riscos?.lactacao === 'sim'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      lactacao: 'sim' as const
                                    }
                                  }
                                });
                                // TODO: Gerar alerta e bloquear plano
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Sim</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="lactacao"
                              value="nao"
                              checked={pacienteEditando.dadosClinicos?.riscos?.lactacao === 'nao'}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando,
                                  dadosClinicos: {
                                    ...pacienteEditando.dadosClinicos,
                                    riscos: {
                                      ...pacienteEditando.dadosClinicos?.riscos,
                                      lactacao: 'nao' as const
                                    }
                                  }
                                });
                              }}
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">Não</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2.7 História tireoidiana */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.7 História tireoidiana</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="historiaTireoidiana"
                          value="eutireoidismo"
                          checked={pacienteEditando.dadosClinicos?.historiaTireoidiana === 'eutireoidismo'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                historiaTireoidiana: 'eutireoidismo' as const
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Eutireoidismo (sem doença conhecida)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="historiaTireoidiana"
                          value="hipotireoidismo_tratado"
                          checked={pacienteEditando.dadosClinicos?.historiaTireoidiana === 'hipotireoidismo_tratado'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                historiaTireoidiana: 'hipotireoidismo_tratado' as const
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Hipotireoidismo tratado</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="historiaTireoidiana"
                          value="nodulo_bocio"
                          checked={pacienteEditando.dadosClinicos?.historiaTireoidiana === 'nodulo_bocio'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                historiaTireoidiana: 'nodulo_bocio' as const
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Nódulo/bócio sem malignidade</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="historiaTireoidiana"
                          value="tireoidite_previa"
                          checked={pacienteEditando.dadosClinicos?.historiaTireoidiana === 'tireoidite_previa'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                historiaTireoidiana: 'tireoidite_previa' as const
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Tireoidite prévia</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="historiaTireoidiana"
                          value="cmt_confirmado"
                          checked={pacienteEditando.dadosClinicos?.historiaTireoidiana === 'cmt_confirmado'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                historiaTireoidiana: 'cmt_confirmado' as const
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">CMT (carcinoma medular) confirmado</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="historiaTireoidiana"
                          value="outro"
                          checked={pacienteEditando.dadosClinicos?.historiaTireoidiana === 'outro'}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                historiaTireoidiana: 'outro' as const
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Outro (especificar)</span>
                      </label>
                      {pacienteEditando.dadosClinicos?.historiaTireoidiana === 'outro' && (
                        <div className="ml-6">
                          <input
                            type="text"
                            value={pacienteEditando.dadosClinicos?.historiaTireoidianaOutro || ''}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  historiaTireoidianaOutro: e.target.value
                                }
                              });
                            }}
                            placeholder="Especificar"
                            className="w-full md:w-96 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2.8 Função renal */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.8 Função renal (para enquadrar DRC)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">eGFR (ml/min/1,73m²)</label>
                        <input
                          type="number"
                          value={pacienteEditando.dadosClinicos?.funcaoRenal?.egfr || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                funcaoRenal: {
                                  ...pacienteEditando.dadosClinicos?.funcaoRenal,
                                  egfr: parseFloat(e.target.value) || undefined
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Estágio DRC</label>
                        <select
                          value={pacienteEditando.dadosClinicos?.funcaoRenal?.estagioDRC || ''}
                          onChange={(e) => {
                            const estagio = e.target.value as any;
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                funcaoRenal: {
                                  ...pacienteEditando.dadosClinicos?.funcaoRenal,
                                  estagioDRC: estagio
                                }
                              }
                            });
                            if (estagio === 'G5') {
                              // TODO: Gerar alerta LAB_ABNORMAL
                            }
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="G1">G1 (eGFR ≥ 90, com lesão renal)</option>
                          <option value="G2">G2 (eGFR 60-89)</option>
                          <option value="G3a">G3a (eGFR 45-59)</option>
                          <option value="G3b">G3b (eGFR 30-44)</option>
                          <option value="G4">G4 (eGFR 15-29)</option>
                          <option value="G5">G5 (eGFR &lt; 15 ou diálise)</option>
                          <option value="desconheco">Desconheço / Sem exame recente</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2.10 Sintomas basais GI */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.10 Sintomas basais relacionados ao trato GI</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.sintomasGI?.plenitudePosPrandial || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                sintomasGI: {
                                  ...pacienteEditando.dadosClinicos?.sintomasGI,
                                  plenitudePosPrandial: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Plenitude pós-prandial</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.sintomasGI?.nauseaLeve || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                sintomasGI: {
                                  ...pacienteEditando.dadosClinicos?.sintomasGI,
                                  nauseaLeve: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Náusea leve</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.sintomasGI?.constipacao || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                sintomasGI: {
                                  ...pacienteEditando.dadosClinicos?.sintomasGI,
                                  constipacao: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Constipação</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.sintomasGI?.refluxoPirose || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                sintomasGI: {
                                  ...pacienteEditando.dadosClinicos?.sintomasGI,
                                  refluxoPirose: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Refluxo/pirose</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.sintomasGI?.nenhum || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                sintomasGI: {
                                  ...pacienteEditando.dadosClinicos?.sintomasGI,
                                  nenhum: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Nenhum</span>
                      </label>
                    </div>
                  </div>

                  {/* 2.11 Objetivos do tratamento */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">2.11 Objetivos do tratamento</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.objetivosTratamento?.perdaPeso10Porcento || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                objetivosTratamento: {
                                  ...pacienteEditando.dadosClinicos?.objetivosTratamento,
                                  perdaPeso10Porcento: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Perda de ≥10% do peso inicial</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.objetivosTratamento?.hba1cMenor68 || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                objetivosTratamento: {
                                  ...pacienteEditando.dadosClinicos?.objetivosTratamento,
                                  hba1cMenor68: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">HbA1c &lt; 6,8%</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.objetivosTratamento?.reducaoCircunferencia10cm || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                objetivosTratamento: {
                                  ...pacienteEditando.dadosClinicos?.objetivosTratamento,
                                  reducaoCircunferencia10cm: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Redução de circunferência abdominal ≥ 10 cm</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.objetivosTratamento?.remissaoPreDiabetes || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                objetivosTratamento: {
                                  ...pacienteEditando.dadosClinicos?.objetivosTratamento,
                                  remissaoPreDiabetes: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Remissão de pré-diabetes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.objetivosTratamento?.melhoraEHNA || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                objetivosTratamento: {
                                  ...pacienteEditando.dadosClinicos?.objetivosTratamento,
                                  melhoraEHNA: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Melhora de EHNA (enzimas/esteatose)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando.dadosClinicos?.objetivosTratamento?.outro || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando,
                              dadosClinicos: {
                                ...pacienteEditando.dadosClinicos,
                                objetivosTratamento: {
                                  ...pacienteEditando.dadosClinicos?.objetivosTratamento,
                                  outro: e.target.checked
                                }
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Outro objetivo (especificar)</span>
                      </label>
                      {pacienteEditando.dadosClinicos?.objetivosTratamento?.outro && (
                        <div className="ml-6">
                          <input
                            type="text"
                            value={pacienteEditando.dadosClinicos?.objetivosTratamento?.outroDescricao || ''}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando,
                                dadosClinicos: {
                                  ...pacienteEditando.dadosClinicos,
                                  objetivosTratamento: {
                                    ...pacienteEditando.dadosClinicos?.objetivosTratamento,
                                    outroDescricao: e.target.value
                                  }
                                }
                              });
                            }}
                            placeholder="Especificar objetivo"
                            className="w-full md:w-96 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {pastaAtiva === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nutrologia</h3>
                  
                  {loadingPlanoNutricional ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-2" />
                      <span className="text-sm text-gray-600">Carregando informações nutricionais...</span>
                    </div>
                  ) : !planoNutricional ? (
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
                      <div className="flex items-start">
                        <AlertTriangleIcon className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                        <div>
                          <h4 className="text-base font-semibold text-amber-900 mb-1">
                            Informações Nutricionais Não Disponíveis
                          </h4>
                          <p className="text-sm text-amber-800">
                            O paciente ainda não preencheu suas informações nutricionais no sistema. 
                            Recomende ao paciente acessar a página "Nutri" no aplicativo para cadastrar 
                            seu plano nutricional e iniciar o acompanhamento alimentar.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Plano Nutricional */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <UtensilsCrossed className="w-5 h-5 text-green-600" />
                          <h4 className="text-base font-semibold text-gray-900">Plano Nutricional</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">Estilo Alimentar</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {planoNutricional.estilo === 'digestiva' ? 'Digestiva' :
                               planoNutricional.estilo === 'plant_based' ? 'Plant Based' :
                               planoNutricional.estilo === 'mediterranea' ? 'Mediterrânea' :
                               planoNutricional.estilo === 'rico_proteina' ? 'Rico em Proteína' :
                               planoNutricional.estilo === 'low_carb_moderada' ? 'Low Carb Moderada' :
                               planoNutricional.estilo || '-'}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">Meta de Proteína</p>
                            <p className="text-sm font-semibold text-gray-900">{planoNutricional.protDia_g ? `${planoNutricional.protDia_g}g/dia` : '-'}</p>
                          </div>
                          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 border border-cyan-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">Meta de Água</p>
                            <p className="text-sm font-semibold text-gray-900">{planoNutricional.aguaDia_ml ? `${Math.round(planoNutricional.aguaDia_ml / 1000)}L/dia` : '-'}</p>
                          </div>
                        </div>

                        {planoNutricional.hipoteseComportamental && (
                          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 mb-4">
                            <p className="text-xs font-medium text-gray-600 mb-2">Análise Comportamental</p>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                              {planoNutricional.hipoteseComportamental}
                            </p>
                        </div>
                      )}

                        {planoNutricional.restricoesPaciente?.length > 0 && (
                          <div className="mb-4">
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

                        {planoNutricional.suplementos && (
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

                        {planoNutricional.criadoEm && (
                          <p className="text-xs text-gray-500 text-right mt-4">
                            Plano criado em {planoNutricional.criadoEm?.toDate ? new Date(planoNutricional.criadoEm.toDate()).toLocaleDateString('pt-BR') : new Date(planoNutricional.criadoEm).toLocaleDateString('pt-BR')}
                          </p>
                      )}
                    </div>

                      {/* Cardápio Atual com Comparativo */}
                      {planoNutricional.modeloDia && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <div className="flex items-center gap-2 mb-6">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <h4 className="text-base font-semibold text-gray-900">Cardápio Atual</h4>
                  </div>

                          {/* Layout Desktop: Linhas Comparativas - Cada refeição na mesma linha que seu comparativo */}
                          <div className="hidden lg:block space-y-4">
                            <div className="grid grid-cols-12 gap-4 items-start mb-2">
                              <div className="col-span-5">
                                <h5 className="text-sm font-semibold text-gray-700">Refeições</h5>
                              </div>
                              <div className="col-span-7">
                                <h5 className="text-sm font-semibold text-gray-700">Comparativo de Macros</h5>
                              </div>
                            </div>
                            
                            {Object.entries(planoNutricional.modeloDia).map(([refeicao, descricao]: [string, any]) => {
                              if (!descricao) return null;
                              
                              const refeicaoLabels: Record<string, string> = {
                                cafe: 'Café da Manhã',
                                lanche1: 'Lanche da Manhã',
                                almoco: 'Almoço',
                                lanche2: 'Lanche da Tarde',
                                jantar: 'Jantar'
                              };
                              
                              const refeicaoColors: Record<string, string> = {
                                cafe: 'from-amber-50 to-amber-100 border-amber-200',
                                lanche1: 'from-blue-50 to-blue-100 border-blue-200',
                                almoco: 'from-orange-50 to-orange-100 border-orange-200',
                                lanche2: 'from-purple-50 to-purple-100 border-purple-200',
                                jantar: 'from-indigo-50 to-indigo-100 border-indigo-200'
                              };
                              
                              const macros = planoNutricional.macrosPorRefeicao?.[refeicao as 'cafe' | 'lanche1' | 'almoco' | 'lanche2' | 'jantar'];
                              
                              // Calcular valores sugeridos se não existirem
                              const calcularValoresSugeridos = (ref: string) => {
                                const distribuicao = planoNutricional.distribuicaoProteina?.[ref as keyof typeof planoNutricional.distribuicaoProteina];
                                let proteinaSugerida = 0;
                                if (distribuicao) {
                                  if (distribuicao.includes('%')) {
                                    const percent = parseFloat(distribuicao.replace('%', ''));
                                    proteinaSugerida = Math.round((planoNutricional.protDia_g * percent) / 100);
                                  }
                                }
                                const caloriasSugerida = ref === 'cafe' ? 400 :
                                                        ref === 'lanche1' ? 250 :
                                                        ref === 'almoco' ? 550 :
                                                        ref === 'lanche2' ? 200 : 450;
                                return { proteinaSugerida, caloriasSugerida };
                              };
                              
                              const valoresSugeridos = calcularValoresSugeridos(refeicao);
                              const proteinaSugerida = macros?.proteinaSugerida_g ?? valoresSugeridos.proteinaSugerida;
                              const proteinaEscolhida = macros?.proteinaEscolhida_g ?? 0;
                              const caloriasSugerida = macros?.caloriasSugerida_kcal ?? valoresSugeridos.caloriasSugerida;
                              const caloriasEscolhida = macros?.caloriasEscolhida_kcal ?? 0;
                              
                              const temEscolhido = proteinaEscolhida > 0 || caloriasEscolhida > 0;
                              const proteinaPercentual = proteinaSugerida > 0 ? Math.round((proteinaEscolhida / proteinaSugerida) * 100) : 0;
                              const caloriasPercentual = caloriasSugerida > 0 ? Math.round((caloriasEscolhida / caloriasSugerida) * 100) : 0;
                              
                              return (
                                <div key={refeicao} className="grid grid-cols-12 gap-4 items-start">
                                  {/* Cardápio da Refeição */}
                                  <div className={`col-span-5 bg-gradient-to-br ${refeicaoColors[refeicao] || 'from-gray-50 to-gray-100 border-gray-200'} rounded-lg p-4 border`}>
                                    <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                      {refeicaoLabels[refeicao] || refeicao}
                                    </p>
                                    <p className="text-sm text-gray-900 leading-relaxed">{descricao}</p>
                                  </div>
                                  
                                  {/* Comparativo de Macros */}
                                  <div className="col-span-7 bg-white border border-gray-200 rounded-lg p-4">
                                    {/* Proteína */}
                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Target className="w-4 h-4 text-blue-600" />
                                          <span className="text-xs font-medium text-gray-600">Proteína</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">Meta: {proteinaSugerida}g</span>
                                          {temEscolhido && (
                                            <span className={`text-xs font-semibold ${
                                              proteinaPercentual >= 80 ? 'text-green-600' : 
                                              proteinaPercentual >= 60 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                              {proteinaEscolhida.toFixed(1)}g ({proteinaPercentual}%)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {temEscolhido && (
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className={`h-2 rounded-full ${
                                              proteinaPercentual >= 80 ? 'bg-green-500' : 
                                              proteinaPercentual >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min(proteinaPercentual, 100)}%` }}
                                          />
                      </div>
                                      )}
                                    </div>
                                    
                                    {/* Calorias */}
                      <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Zap className="w-4 h-4 text-orange-600" />
                                          <span className="text-xs font-medium text-gray-600">Calorias</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">Meta: {caloriasSugerida} kcal</span>
                                          {temEscolhido && (
                                            <span className={`text-xs font-semibold ${
                                              caloriasPercentual >= 90 && caloriasPercentual <= 110 ? 'text-green-600' : 
                                              caloriasPercentual >= 80 && caloriasPercentual <= 120 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                              {caloriasEscolhida} kcal ({caloriasPercentual}%)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {temEscolhido && (
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className={`h-2 rounded-full ${
                                              caloriasPercentual >= 90 && caloriasPercentual <= 110 ? 'bg-green-500' : 
                                              caloriasPercentual >= 80 && caloriasPercentual <= 120 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min(caloriasPercentual, 100)}%` }}
                        />
                      </div>
                                      )}
                    </div>
                                  </div>
                                </div>
                              );
                            })}
                  </div>

                          {/* Layout Mobile: Coluna Única */}
                          <div className="lg:hidden space-y-3">
                            {Object.entries(planoNutricional.modeloDia).map(([refeicao, descricao]: [string, any]) => {
                              if (!descricao) return null;
                              
                              const macros = planoNutricional.macrosPorRefeicao?.[refeicao as keyof typeof planoNutricional.macrosPorRefeicao];
                              const refeicaoLabels: Record<string, string> = {
                                cafe: 'Café da Manhã',
                                lanche1: 'Lanche da Manhã',
                                almoco: 'Almoço',
                                lanche2: 'Lanche da Tarde',
                                jantar: 'Jantar'
                              };
                              
                              const calcularValoresSugeridos = (ref: string) => {
                                const distribuicao = planoNutricional.distribuicaoProteina?.[ref as keyof typeof planoNutricional.distribuicaoProteina];
                                let proteinaSugerida = 0;
                                if (distribuicao) {
                                  if (distribuicao.includes('%')) {
                                    const percent = parseFloat(distribuicao.replace('%', ''));
                                    proteinaSugerida = Math.round((planoNutricional.protDia_g * percent) / 100);
                                  }
                                }
                                const caloriasSugerida = ref === 'cafe' ? 400 :
                                                        ref === 'lanche1' ? 250 :
                                                        ref === 'almoco' ? 550 :
                                                        ref === 'lanche2' ? 200 : 450;
                                return { proteinaSugerida, caloriasSugerida };
                              };
                              
                              const valoresSugeridos = calcularValoresSugeridos(refeicao);
                              const proteinaSugerida = macros?.proteinaSugerida_g ?? valoresSugeridos.proteinaSugerida;
                              const proteinaEscolhida = macros?.proteinaEscolhida_g ?? 0;
                              const caloriasSugerida = macros?.caloriasSugerida_kcal ?? valoresSugeridos.caloriasSugerida;
                              const caloriasEscolhida = macros?.caloriasEscolhida_kcal ?? 0;
                              
                              const temEscolhido = proteinaEscolhida > 0 || caloriasEscolhida > 0;
                              
                              return (
                                <div key={refeicao} className="border border-gray-200 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">
                                    {refeicaoLabels[refeicao] || refeicao}
                                  </p>
                                  <p className="text-sm text-gray-900 mb-3">{descricao}</p>
                                  {temEscolhido && (
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                      <div>
                                        <p className="text-xs text-gray-600">Proteína</p>
                                        <p className="text-xs font-semibold text-gray-900">
                                          {proteinaEscolhida.toFixed(1)}g / {proteinaSugerida}g
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Calorias</p>
                                        <p className="text-xs font-semibold text-gray-900">
                                          {caloriasEscolhida} / {caloriasSugerida} kcal
                                        </p>
                                      </div>
                                    </div>
                                  )}
                    </div>
                              );
                            })}
                  </div>
                        </div>
                      )}

                      {/* Histórico de Check-ins */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-600" />
                            <h4 className="text-base font-semibold text-gray-900">Histórico de Check-ins</h4>
                          </div>
                          {loadingCheckIns && (
                            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                          )}
                        </div>

                        {checkIns.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-600 mb-1">Nenhum check-in registrado ainda</p>
                            <p className="text-xs text-gray-500">Os check-ins aparecerão aqui quando o paciente começar a registrar</p>
                          </div>
                        ) : (
                          <>
                            {/* Dashboard de Aderência */}
                            {(() => {
                              // Função helper para formatar datas (declarada primeiro)
                              const getDataFormatada = (data: any): Date => {
                                try {
                                  if (data?.toDate) return data.toDate();
                                  if (typeof data === 'string') return new Date(data);
                                  return new Date(data);
                                } catch {
                                  return new Date();
                                }
                              };
                              
                              // Ordenar check-ins por data (mais antigo primeiro para começar do dia 0)
                              const checkInsOrdenados = [...checkIns].sort((a, b) => {
                                const dataA = getDataFormatada(a.data);
                                const dataB = getDataFormatada(b.data);
                                return dataA.getTime() - dataB.getTime(); // Mais antigo primeiro
                              });

                              // Calcular métricas
                              const totalCheckIns = checkInsOrdenados.length;
                              const scores = checkInsOrdenados.map((ci: any) => ci.score || 0);
                              const mediaScore = totalCheckIns > 0 ? scores.reduce((a, b) => a + b, 0) / totalCheckIns : 0;
                              const checkInsDentro = scores.filter(s => s >= 80).length;
                              const checkInsFora = scores.filter(s => s < 80).length;
                              const taxaAderencia = totalCheckIns > 0 ? Math.round((checkInsDentro / totalCheckIns) * 100) : 0;
                              
                              // Calcular frequência desde o início do tratamento
                              const hoje = new Date();
                              hoje.setHours(0, 0, 0, 0); // Normalizar para comparar apenas datas
                              
                              // Obter data inicial do tratamento
                              let dataInicioTratamento: Date | null = null;
                              if (pacienteEditando?.planoTerapeutico?.startDate) {
                                const startDate = pacienteEditando.planoTerapeutico.startDate;
                                if (startDate instanceof Date) {
                                  dataInicioTratamento = new Date(startDate);
                                } else if (startDate?.toDate) {
                                  dataInicioTratamento = startDate.toDate();
                                } else {
                                  dataInicioTratamento = new Date(startDate);
                                }
                                dataInicioTratamento.setHours(0, 0, 0, 0);
                              } else if (pacienteEditando?.planoTerapeutico?.dataInicioTratamento) {
                                const dataInicio = pacienteEditando.planoTerapeutico.dataInicioTratamento;
                                if (dataInicio instanceof Date) {
                                  dataInicioTratamento = new Date(dataInicio);
                                } else if (dataInicio?.toDate) {
                                  dataInicioTratamento = dataInicio.toDate();
                                } else {
                                  dataInicioTratamento = new Date(dataInicio);
                                }
                                dataInicioTratamento.setHours(0, 0, 0, 0);
                              } else if (checkInsOrdenados.length > 0) {
                                // Se não houver data de início, usar a data do primeiro check-in
                                dataInicioTratamento = getDataFormatada(checkInsOrdenados[0].data);
                                dataInicioTratamento.setHours(0, 0, 0, 0);
                              }
                              
                              let frequenciaPreenchimento = 0;
                              let diasDesdeInicio = 0;
                              
                              if (dataInicioTratamento) {
                                // Calcular dias desde o início do tratamento até hoje
                                diasDesdeInicio = Math.ceil((hoje.getTime() - dataInicioTratamento.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia de hoje
                                
                                // Contar check-ins distintos (um por dia)
                                const checkInsDistintos = new Set(
                                  checkInsOrdenados.map((ci: any) => {
                                    const data = getDataFormatada(ci.data);
                                    data.setHours(0, 0, 0, 0);
                                    return data.getTime();
                                  })
                                );
                                
                                const totalCheckInsDistintos = checkInsDistintos.size;
                                frequenciaPreenchimento = diasDesdeInicio > 0 ? Math.round((totalCheckInsDistintos / diasDesdeInicio) * 100) : 0;
                              } else {
                                // Se não houver data de início, calcular apenas com os check-ins disponíveis
                                diasDesdeInicio = checkInsOrdenados.length;
                                frequenciaPreenchimento = 100; // Todos os dias com check-ins foram preenchidos
                              }

                              return (
                                <div className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                                  <h5 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-purple-600" />
                                    Dashboard de Aderência Nutricional
                                  </h5>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Média de Score */}
                                    <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-600">Média de Pontuação</span>
                                        <Activity className={`w-4 h-4 ${
                                          mediaScore >= 80 ? 'text-green-600' :
                                          mediaScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                        }`} />
                    </div>
                                      <p className={`text-2xl font-bold ${
                                        mediaScore >= 80 ? 'text-green-600' :
                                        mediaScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                        {mediaScore.toFixed(1)}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">de 100 pontos</p>
                  </div>

                                    {/* Taxa de Aderência */}
                                    <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-600">Taxa de Aderência</span>
                                        <CheckCircle className={`w-4 h-4 ${
                                          taxaAderencia >= 70 ? 'text-green-600' :
                                          taxaAderencia >= 50 ? 'text-yellow-600' : 'text-red-600'
                                        }`} />
                                      </div>
                                      <p className={`text-2xl font-bold ${
                                        taxaAderencia >= 70 ? 'text-green-600' :
                                        taxaAderencia >= 50 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                        {taxaAderencia}%
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {checkInsDentro} de {totalCheckIns} check-ins dentro
                                      </p>
                                    </div>

                                    {/* Frequência de Preenchimento */}
                                    <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-600">Frequência de Preenchimento</span>
                                        <Calendar className={`w-4 h-4 ${
                                          frequenciaPreenchimento >= 70 ? 'text-green-600' :
                                          frequenciaPreenchimento >= 50 ? 'text-yellow-600' : 'text-red-600'
                                        }`} />
                                      </div>
                                      <p className={`text-2xl font-bold ${
                                        frequenciaPreenchimento >= 70 ? 'text-green-600' :
                                        frequenciaPreenchimento >= 50 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                        {frequenciaPreenchimento}%
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {(() => {
                                          const checkInsDistintos = new Set(
                                            checkInsOrdenados.map((ci: any) => {
                                              const data = getDataFormatada(ci.data);
                                              data.setHours(0, 0, 0, 0);
                                              return data.getTime();
                                            })
                                          );
                                          return checkInsDistintos.size;
                                        })()} check-ins em {diasDesdeInicio} dias
                                      </p>
                                    </div>

                                    {/* Status Geral */}
                                    <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-600">Status Geral</span>
                                        {mediaScore >= 80 && taxaAderencia >= 70 ? (
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : mediaScore >= 60 && taxaAderencia >= 50 ? (
                                          <AlertTriangleIcon className="w-4 h-4 text-yellow-600" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                                      <p className={`text-lg font-bold ${
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
                              );
                            })()}

                            {/* Sistema de Pastas/Abas */}
                            {(() => {
                              // Função helper para formatar datas (declarada primeiro)
                              const getDataFormatada = (data: any): Date => {
                                try {
                                  if (data?.toDate) return data.toDate();
                                  if (typeof data === 'string') return new Date(data);
                                  return new Date(data);
                                } catch {
                                  return new Date();
                                }
                              };
                              
                              // Ordenar check-ins por data (mais antigo primeiro)
                              const checkInsOrdenados = [...checkIns].sort((a, b) => {
                                const dataA = getDataFormatada(a.data);
                                const dataB = getDataFormatada(b.data);
                                return dataA.getTime() - dataB.getTime();
                              });

                              // Inicializar pasta ativa para o primeiro check-in se não houver selecionado
                              if (checkInsOrdenados.length > 0 && checkInPastaAtiva >= checkInsOrdenados.length) {
                                setCheckInPastaAtiva(0);
                              }

                              const checkInSelecionado = checkInsOrdenados[checkInPastaAtiva] || null;

                              return (
                                <>
                                  {/* Abas/Pastas */}
                                  <div className="mb-6 border-b border-gray-200">
                                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                      {checkInsOrdenados.map((checkIn: any, idx: number) => {
                                        const dataFormatada = getDataFormatada(checkIn.data);
                                        const isActive = idx === checkInPastaAtiva;
                                        const score = checkIn.score || 0;

                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => setCheckInPastaAtiva(idx)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
                                              isActive
                                                ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold'
                                                : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                            }`}
                                          >
                                            <span className="text-xs font-medium">Dia {idx}</span>
                                            <span className="text-xs">
                                              {dataFormatada.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                              score >= 80 ? 'bg-green-100 text-green-700' :
                                              score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-red-100 text-red-700'
                                            }`}>
                                              {score}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Conteúdo do Check-in Selecionado */}
                                  {checkInSelecionado && (() => {
                                    const checkIn = checkInSelecionado;
                                    const score = checkIn.score || 0;
                                    const scoreBg = score >= 80 ? 'from-green-50 to-green-100 border-green-200' :
                                                  score >= 60 ? 'from-yellow-50 to-yellow-100 border-yellow-200' :
                                                  'from-red-50 to-red-100 border-red-200';
                                    
                                    const dataFormatada = getDataFormatada(checkIn.data);
                                    
                                    return (
                                      <div className={`bg-gradient-to-br ${scoreBg} rounded-lg p-5 border-2 shadow-sm`}>
                                  {/* Header com Data e Score */}
                                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-white/50">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-4 h-4 text-gray-600" />
                                        <p className="text-sm font-semibold text-gray-900">
                                          {dataFormatada.toLocaleDateString('pt-BR', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                          })}
                                        </p>
                                      </div>
                                      {checkIn.pesoHoje && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <Weight className="w-3 h-3 text-gray-500" />
                                          <span className="text-xs text-gray-600">Peso: {checkIn.pesoHoje} kg</span>
                                        </div>
                                      )}
                      </div>
                                    <div className="flex flex-col items-end">
                                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 ${
                                        score >= 80 ? 'border-green-300' :
                                        score >= 60 ? 'border-yellow-300' : 'border-red-300'
                                      }`}>
                                        {score >= 80 && <CheckCircle className="w-4 h-4 text-green-600" />}
                                        {score < 80 && score >= 60 && <AlertTriangleIcon className="w-4 h-4 text-yellow-600" />}
                                        {score < 60 && <XCircle className="w-4 h-4 text-red-600" />}
                                        <span className={`text-sm font-bold ${
                                          score >= 80 ? 'text-green-700' :
                                          score >= 60 ? 'text-yellow-700' : 'text-red-700'
                                        }`}>
                                          {score}/100
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Adesão Alimentar */}
                                  <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Adesão Alimentar</p>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                      <div className="bg-white/60 rounded-lg p-3 flex items-center gap-2">
                                        {checkIn.proteinaOk ? (
                                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        )}
                      <div>
                                          <p className="text-xs font-medium text-gray-900">Proteína</p>
                                          <p className="text-xs text-gray-500">{checkIn.proteinaOk ? 'OK' : 'Abaixo'}</p>
                                        </div>
                                      </div>
                                      <div className="bg-white/60 rounded-lg p-3 flex items-center gap-2">
                                        {checkIn.frutasOk ? (
                                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        )}
                                        <div>
                                          <p className="text-xs font-medium text-gray-900">Frutas</p>
                                          <p className="text-xs text-gray-500">{checkIn.frutasOk ? 'OK' : 'Abaixo'}</p>
                                        </div>
                                      </div>
                                      <div className="bg-white/60 rounded-lg p-3 flex items-center gap-2">
                                        {checkIn.aguaOk ? (
                                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        )}
                                        <div>
                                          <p className="text-xs font-medium text-gray-900">Água</p>
                                          <p className="text-xs text-gray-500">{checkIn.aguaOk ? 'OK' : 'Abaixo'}</p>
                                        </div>
                                      </div>
                                      <div className="bg-white/60 rounded-lg p-3 flex items-center gap-2">
                                        {!checkIn.lixoAlimentar ? (
                                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        )}
                                        <div>
                                          <p className="text-xs font-medium text-gray-900">Sem Lixo</p>
                                          <p className="text-xs text-gray-500">{!checkIn.lixoAlimentar ? 'OK' : 'Consumiu'}</p>
                                        </div>
                      </div>
                    </div>
                  </div>

                                  {/* Suplementos (se houver) */}
                                  {(checkIn.probioticoTomou || checkIn.wheyTomou || checkIn.creatinaTomou) && (
                                    <div className="mb-4">
                                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Suplementos</p>
                                      <div className="flex flex-wrap gap-2">
                                        {checkIn.probioticoTomou && (
                                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full border border-purple-200">
                                            Probiótico
                                          </span>
                                        )}
                                        {checkIn.wheyTomou && (
                                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200">
                                            Whey
                                          </span>
                                        )}
                                        {checkIn.creatinaTomou && (
                                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full border border-indigo-200">
                                            Creatina
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Estilo de Vida e Sintomas */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-white/60 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Estilo de Vida</p>
                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Moon className="w-3 h-3 text-gray-500" />
                                            <span className="text-xs text-gray-600">Sono</span>
                                          </div>
                                          <span className="text-xs font-medium text-gray-900">
                                            {checkIn.horasSono === '<6h' ? '< 6h' :
                                             checkIn.horasSono === '6-8h' ? '6-8h' :
                                             checkIn.horasSono === '>8h' ? '> 8h' :
                                             checkIn.horasSono || '-'}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Heart className="w-3 h-3 text-gray-500" />
                                            <span className="text-xs text-gray-600">Humor/Energia</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((n) => (
                                              <Heart
                                                key={n}
                                                className={`w-3 h-3 ${
                                                  n <= (checkIn.humorEnergia || 0)
                                                    ? 'fill-red-500 text-red-500'
                                                    : 'text-gray-300'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Dumbbell className="w-3 h-3 text-gray-500" />
                                            <span className="text-xs text-gray-600">Atividade Física</span>
                                          </div>
                                          <span className="text-xs font-medium text-gray-900">
                                            {checkIn.atividadeFisicaHoje === 'nenhuma' ? 'Nenhuma' :
                                             checkIn.atividadeFisicaHoje ? checkIn.atividadeFisicaHoje.charAt(0).toUpperCase() + checkIn.atividadeFisicaHoje.slice(1) : '-'}
                                          </span>
                                        </div>
                    </div>
                  </div>

                                    <div className="bg-white/60 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Sintomas GI</p>
                    <div className="space-y-2">
                                        {checkIn.nauseas && checkIn.nauseas !== 'nenhum' && (
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Náuseas</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                              checkIn.nauseas === 'grave' ? 'bg-red-100 text-red-700' :
                                              checkIn.nauseas === 'moderado' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-blue-100 text-blue-700'
                                            }`}>
                                              {checkIn.nauseas.charAt(0).toUpperCase() + checkIn.nauseas.slice(1)}
                                            </span>
                        </div>
                      )}
                                        {checkIn.constipacao && checkIn.constipacao !== 'nenhum' && (
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Constipação</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                              checkIn.constipacao === 'grave' ? 'bg-red-100 text-red-700' :
                                              checkIn.constipacao === 'moderado' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-blue-100 text-blue-700'
                                            }`}>
                                              {checkIn.constipacao.charAt(0).toUpperCase() + checkIn.constipacao.slice(1)}
                                            </span>
                                          </div>
                                        )}
                                        {checkIn.diarreia && checkIn.diarreia !== 'nenhum' && (
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Diarreia</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                              checkIn.diarreia === 'grave' ? 'bg-red-100 text-red-700' :
                                              checkIn.diarreia === 'moderado' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-blue-100 text-blue-700'
                                            }`}>
                                              {checkIn.diarreia.charAt(0).toUpperCase() + checkIn.diarreia.slice(1)}
                                            </span>
                                          </div>
                                        )}
                                        {(!checkIn.nauseas || checkIn.nauseas === 'nenhum') &&
                                         (!checkIn.constipacao || checkIn.constipacao === 'nenhum') &&
                                         (!checkIn.diarreia || checkIn.diarreia === 'nenhum') && (
                                          <p className="text-xs text-gray-500 italic">Nenhum sintoma registrado</p>
                                        )}
                                      </div>
                    </div>
                  </div>

                                  {/* Observações */}
                                  {checkIn.observacoes && (
                                    <div className="mt-4 pt-4 border-t border-white/50">
                                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Observações</p>
                                      <p className="text-xs text-gray-700 leading-relaxed bg-white/60 rounded p-3">{checkIn.observacoes}</p>
                  </div>
                                  )}
                                </div>
                                    );
                                  })()}
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {pastaAtiva === 4 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exames Laboratoriais</h3>
                  
                  {/* Mapeamento entre campos do paciente e chaves de labRanges */}
                  {(() => {
                    const pacienteSex = pacienteEditando?.dadosIdentificacao?.sexoBiologico as Sex;
                    const exames = pacienteEditando?.examesLaboratoriais || [];
                    
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
                          // Firestore Timestamp
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
                    }).filter(e => safeDateToString(e.dataColeta)); // Remover exames com datas inválidas
                    
                    // Inicializar data selecionada com o exame mais recente (se não estiver definida)
                    const dataInicial = examesOrdenados.length > 0 
                      ? safeDateToString(examesOrdenados[0].dataColeta)
                      : '';
                    
                    const dataSelecionada = exameDataSelecionada || dataInicial;
                    
                    // Encontrar exame da data selecionada
                    const exameSelecionado = exames.find(e => {
                      const dataExame = safeDateToString(e.dataColeta);
                      return dataExame === dataSelecionada;
                    }) || examesOrdenados[0] || {};
                    
                    // Preparar dados para gráfico de linha (todos os exames ao longo do tempo)
                    const dadosGrafico = examesOrdenados.map(exame => {
                      const dataExame = safeDateToString(exame.dataColeta);
                      return {
                        data: dataExame,
                        glicemiaJejum: exame.glicemiaJejum || null,
                        hemoglobinaGlicada: exame.hemoglobinaGlicada || null,
                        ureia: exame.ureia || null,
                        creatinina: exame.creatinina || null,
                        taxaFiltracaoGlomerular: exame.taxaFiltracaoGlomerular || null,
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
                        vitaminaD: exame.vitaminaD || null
                      };
                    }).reverse(); // Mais antigo primeiro para o gráfico
                    
                    // Definir todos os campos de exame para renderizar
                    const todosOsCampos = [
                      { section: 'Metabolismo Glicídico', fields: [
                        { key: 'fastingGlucose', label: 'Glicemia de Jejum', field: 'glicemiaJejum' },
                        { key: 'hba1c', label: 'Hemoglobina Glicada (HbA1c)', field: 'hemoglobinaGlicada' }
                      ]},
                      { section: 'Função Renal', fields: [
                        { key: 'urea', label: 'Uréia', field: 'ureia' },
                        { key: 'creatinine', label: 'Creatinina', field: 'creatinina' },
                        { key: 'egfr', label: 'Taxa de Filtração Glomerular (eGFR)', field: 'taxaFiltracaoGlomerular' }
                      ]},
                      { section: 'Função Hepática e Biliar', fields: [
                        { key: 'alt', label: 'TGP (ALT)', field: 'tgp' },
                        { key: 'ast', label: 'TGO (AST)', field: 'tgo' },
                        { key: 'ggt', label: 'GGT', field: 'ggt' },
                        { key: 'alp', label: 'Fosfatase Alcalina', field: 'fosfataseAlcalina' }
                      ]},
                      { section: 'Pâncreas', fields: [
                        { key: 'amylase', label: 'Amilase', field: 'amilase' },
                        { key: 'lipase', label: 'Lipase', field: 'lipase' }
                      ]},
                      { section: 'Perfil Lipídico', fields: [
                        { key: 'cholTotal', label: 'Colesterol Total', field: 'colesterolTotal' },
                        { key: 'ldl', label: 'LDL', field: 'ldl' },
                        { key: 'hdl', label: 'HDL', field: 'hdl' },
                        { key: 'tg', label: 'Triglicerídeos', field: 'triglicerides' }
                      ]},
                      { section: 'Tireóide / Rastreio MEN2', fields: [
                        { key: 'tsh', label: 'TSH', field: 'tsh' },
                        { key: 'calcitonin', label: 'Calcitonina', field: 'calcitonina' },
                        { key: 'ft4', label: 'T4 Livre (FT4)', field: 't4Livre' }
                      ]},
                      { section: 'Ferro e Vitaminas', fields: [
                        { key: 'ferritin', label: 'Ferritina', field: 'ferritina' },
                        { key: 'iron', label: 'Ferro sérico', field: 'ferroSerico' },
                        { key: 'b12', label: 'Vitamina B12', field: 'vitaminaB12' },
                        { key: 'vitaminD', label: 'Vitamina D (25-OH)', field: 'vitaminaD' }
                      ]}
                    ];

                    // Helper: verifica se algum exame tem valor preenchido para o campo
                    const campoTemAlgumValor = (fieldKey: string) => {
                      return exames.some((exame: any) => {
                        const v = (exame as any)[fieldKey];
                        return v !== null && v !== undefined && v !== '';
                      });
                    };
                    
                    return (
                      <div className="space-y-6">
                        {/* Seletor de Data e Botões de Ação */}
                        <div className="flex items-end gap-3 flex-wrap">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Selecionar Exame por Data
                            </label>
                            <select
                              value={dataSelecionada}
                              onChange={(e) => {
                                setExameDataSelecionada(e.target.value);
                              }}
                              disabled={examesOrdenados.length === 0}
                              className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 ${
                                examesOrdenados.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                            >
                              {examesOrdenados.map((exame, idx) => {
                                const dataExame = safeDateToString(exame.dataColeta);
                                // Formatar para exibição
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
                              {examesOrdenados.length === 0 && (
                                <option value="">Nenhum exame cadastrado</option>
                              )}
                            </select>
                          </div>
                          <button
                            onClick={() => {
                              setShowSolicitarExamesModal(true);
                              // Inicializar estados
                              setExamesSelecionados([]);
                              setExamesCustomizados(['']);
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-2 whitespace-nowrap"
                          >
                            <FileText size={16} />
                            Solicitar Exames
                          </button>
                          <button
                            onClick={() => {
                              setIndiceExameEditando(null);
                              setShowAdicionarExameModal(true);
                              // Inicializar novo exame com a estrutura vazia
                              setNovoExameData({
                                dataColeta: new Date().toISOString().split('T')[0]
                              });
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                          >
                            <Plus size={16} />
                            Adicionar Exames
                          </button>
                          <button
                            onClick={() => {
                              if (examesOrdenados.length === 0 || !pacienteEditando) return;

                              // Encontrar o exame correto usando a data selecionada
                              // Primeiro tenta encontrar em examesOrdenados (que já está ordenado e filtrado)
                              const exameParaEditar = examesOrdenados.find(e => {
                                const dataExame = safeDateToString(e.dataColeta);
                                return dataExame === dataSelecionada;
                              }) || examesOrdenados[0] || null;

                              if (!exameParaEditar) return;

                              // Agora encontrar o índice correto no array original do paciente
                              const examesPaciente = pacienteEditando.examesLaboratoriais || [];
                              // Primeiro tenta encontrar pela referência do objeto (mais eficiente)
                              let indexExame = examesPaciente.findIndex(e => e === exameParaEditar);
                              
                              // Se não encontrou pela referência, busca pela data (pode haver múltiplos exames com mesma data)
                              if (indexExame === -1) {
                                const dataExameParaEditar = safeDateToString(exameParaEditar.dataColeta);
                                indexExame = examesPaciente.findIndex(e => {
                                  const dataExame = safeDateToString(e.dataColeta);
                                  return dataExame === dataExameParaEditar;
                                });
                              }

                              const dataColetaStr =
                                safeDateToString(exameParaEditar.dataColeta) ||
                                new Date().toISOString().split('T')[0];

                              // Inicializar a data selecionada no modal
                              setDataSelecionadaModal(dataColetaStr);
                              setIndiceExameEditando(indexExame >= 0 ? indexExame : null);

                              setNovoExameData({
                                dataColeta: dataColetaStr,
                                ...Object.fromEntries(
                                  Object.entries(exameParaEditar)
                                    .filter(([key, value]) =>
                                      key !== 'dataColeta' &&
                                      key !== 'id' &&
                                      value !== undefined &&
                                      value !== null &&
                                      value !== ''
                                    )
                                )
                              });

                              setShowAdicionarExameModal(true);
                            }}
                            disabled={examesOrdenados.length === 0}
                            className={`px-4 py-2 rounded-md flex items-center gap-2 whitespace-nowrap ${
                              examesOrdenados.length === 0
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            <Edit size={16} />
                            Editar Exame
                          </button>
                        </div>
                        
                        {/* Mensagem quando não há exames cadastrados */}
                        {examesOrdenados.length === 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-amber-900 mb-2">
                                  Nenhum exame cadastrado
                                </h4>
                                <p className="text-sm text-amber-800 mb-4">
                                  Para cadastrar exames laboratoriais, clique no botão <strong>"Adicionar Exames"</strong> acima.
                                  Não é possível editar valores de exames antes de criar um registro de exame.
                                </p>
                                <button
                                  onClick={() => {
                                    setShowAdicionarExameModal(true);
                                    setNovoExameData({
                                      dataColeta: new Date().toISOString().split('T')[0]
                                    });
                                  }}
                                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center gap-2 inline-flex"
                                >
                                  <Plus size={16} />
                                  Adicionar Primeiro Exame
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Renderizar cada seção, apenas com campos que tenham algum dado preenchido */}
                        {todosOsCampos.map((secao, idxSecao) => {
                          const camposComValor = secao.fields.filter((campo) =>
                            campoTemAlgumValor(campo.field)
                          );

                          if (camposComValor.length === 0) return null;

                          return (
                          <div key={idxSecao} className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 mb-4">{secao.section}</h4>
                            
                              {camposComValor.map((campo) => {
                              const range = getLabRange(campo.key as any, pacienteSex);
                              // Para campos que dependem de sexo mas não está definido, usar range padrão ou ambos
                              let rangeToUse = range;
                              
                              // Se não tiver range, tentar criar um range padrão para campos específicos
                              if (!rangeToUse) {
                                if (campo.key === 'ferritin' || campo.key === 'iron') {
                                  const labRangeEntry = (labRanges as any)[campo.key];
                                  if (labRangeEntry && labRangeEntry.M && labRangeEntry.F) {
                                    // Usar range combinado (valores de ambos os sexos)
                                    const minValue = Math.min(labRangeEntry.M.min, labRangeEntry.F.min);
                                    const maxValue = Math.max(labRangeEntry.M.max, labRangeEntry.F.max);
                                    rangeToUse = {
                                      label: campo.key === 'ferritin' ? 'Ferritina' : 'Ferro sérico',
                                      unit: labRangeEntry.M.unit || campo.unit || '',
                                      min: minValue,
                                      max: maxValue
                                    };
                                  }
                                }
                              }
                              
                              // Se ainda não tiver range válido, não renderizar o campo
                              if (!rangeToUse || !rangeToUse.label || rangeToUse.min === undefined || rangeToUse.max === undefined) {
                                return null;
                              }
                              
                              // Pegar valor do exame selecionado
                              const value = exameSelecionado[campo.field as keyof typeof exameSelecionado] as number | undefined;
                              
                              return (
                                <div key={campo.field} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                  {/* Coluna 1: Input e LabRangeBar */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      {rangeToUse.label}
                                    </label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={value || ''}
                                      onChange={(e) => {
                                        // Não permitir edição se não houver exames cadastrados
                                        if (examesOrdenados.length === 0) {
                                          return;
                                        }
                                        
                                        const numValue = parseFloat(e.target.value) || 0;
                                        const examesAtualizados = [...(pacienteEditando?.examesLaboratoriais || [])];
                                        
                                        // Encontrar índice do exame selecionado
                                        const indexExame = examesAtualizados.findIndex(e => {
                                          const dataExame = safeDateToString(e.dataColeta);
                                          return dataExame === dataSelecionada;
                                        });
                                        
                                        // Só permitir edição se o exame já existir
                                        if (indexExame === -1) {
                                          // Não criar novo exame aqui - deve usar o botão "Adicionar Exames"
                                          return;
                                        }
                                        
                                        examesAtualizados[indexExame] = {
                                          ...examesAtualizados[indexExame],
                                          [campo.field]: numValue
                                        };
                                        setPacienteEditando({
                                          ...pacienteEditando!,
                                          examesLaboratoriais: examesAtualizados
                                        });
                                      }}
                                      disabled={examesOrdenados.length === 0 || !dataSelecionada}
                                      className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 mb-2 ${
                                        examesOrdenados.length === 0 || !dataSelecionada
                                          ? 'bg-gray-100 cursor-not-allowed'
                                          : ''
                                      }`}
                                      placeholder={examesOrdenados.length === 0 
                                        ? 'Adicione um exame primeiro' 
                                        : `${rangeToUse.min}-${rangeToUse.max} ${rangeToUse.unit}`
                                      }
                                      onClick={() => {
                                        // Se não houver exames, focar no botão de adicionar
                                        if (examesOrdenados.length === 0) {
                                          // Mostrar um alerta visual
                                          const button = document.querySelector('button[class*="bg-blue-600"]');
                                          if (button) {
                                            (button as HTMLElement).focus();
                                            (button as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }
                                        }
                                      }}
                                    />
                                    <LabRangeBar range={rangeToUse} value={value || null} />
                                    
                                    {/* Alertas específicos */}
                                    {campo.key === 'egfr' && value && value < 15 && (
                                      <p className="text-sm text-red-600 mt-1">⚠️ Alerta crítico: eGFR &lt; 15</p>
                                    )}
                                    {campo.key === 'calcitonin' && rangeToUse && value && value > rangeToUse.max && (
                                      <p className="text-sm text-red-600 mt-1">⚠️ Alerta MEN2: calcitonina elevada</p>
                                    )}
                                    {['amylase', 'lipase'].includes(campo.key) && rangeToUse && value && value > rangeToUse.max && (
                                      <p className="text-sm text-red-600 mt-1">⚠️ Alerta: valor acima do máximo</p>
                                    )}
                                  </div>
                                  
                                  {/* Coluna 2: Gráfico de evolução */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Evolução Temporal
                                    </label>
                                    {dadosGrafico.length > 0 && dadosGrafico.some(d => (d as any)[campo.field] !== null) ? (
                                      <TrendLine
                                        data={dadosGrafico}
                                        dataKeys={[
                                          { key: campo.field, name: rangeToUse.label, stroke: '#10b981', dot: true }
                                        ]}
                                        xKey="data"
                                        height={150}
                                        xAxisLabel="Data"
                                        yAxisLabel={rangeToUse.unit || ''}
                                        formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)}` : 'N/A'}
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
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {pastaAtiva === 5 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plano Terapêutico</h3>
                  
                  {/* 5.1 Metadados do plano */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">5.1 Metadados do Plano</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de início do tratamento *</label>
                        <input
                          type="date"
                          value={(() => {
                            const date = pacienteEditando?.planoTerapeutico?.startDate || pacienteEditando?.planoTerapeutico?.dataInicioTratamento;
                            if (!date) return '';
                            try {
                              const d = new Date(date);
                              if (!isNaN(d.getTime())) {
                                // Formatar data localmente sem conversão UTC para evitar mudança de dia
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                              }
                              return '';
                            } catch {
                              return '';
                            }
                          })()}
                          onChange={(e) => {
                            if (!e.target.value) {
                              setPacienteEditando({
                                ...pacienteEditando!,
                                planoTerapeutico: {
                                  ...pacienteEditando?.planoTerapeutico,
                                  startDate: undefined,
                                  dataInicioTratamento: undefined
                                }
                              });
                              return;
                            }
                            // Criar data no timezone local (meia-noite local) para evitar mudança de dia
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                startDate: localDate,
                                dataInicioTratamento: localDate
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dia da aplicação semanal *</label>
                        <select
                          value={pacienteEditando?.planoTerapeutico?.injectionDayOfWeek || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                injectionDayOfWeek: e.target.value as any
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="seg">Segunda-feira</option>
                          <option value="ter">Terça-feira</option>
                          <option value="qua">Quarta-feira</option>
                          <option value="qui">Quinta-feira</option>
                          <option value="sex">Sexta-feira</option>
                          <option value="sab">Sábado</option>
                          <option value="dom">Domingo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número de semanas do tratamento *
                          <span className="text-xs text-gray-500 ml-2">(padrão: 18, pode ser ampliado depois)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={pacienteEditando?.planoTerapeutico?.numeroSemanasTratamento || 18}
                          onChange={(e) => {
                            const valor = parseInt(e.target.value) || 18;
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                numeroSemanasTratamento: valor
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Defina a duração inicial do tratamento. Após finalizar essas semanas, você poderá ampliar o tratamento adicionando mais semanas.
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={pacienteEditando?.planoTerapeutico?.consentSigned || false}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando!,
                                planoTerapeutico: {
                                  ...pacienteEditando?.planoTerapeutico,
                                  consentSigned: e.target.checked
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">Termo de consentimento assinado *</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 5.2 Dose e titulação */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">5.2 Dose e Titulação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dose atual (mg) *</label>
                        <select
                          value={pacienteEditando?.planoTerapeutico?.currentDoseMg || pacienteEditando?.planoTerapeutico?.doseAtual?.quantidade || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            const now = new Date();
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                currentDoseMg: value as any,
                                lastDoseChangeAt: now,
                                nextReviewDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), // +28 dias
                                doseAtual: {
                                  quantidade: value,
                                  frequencia: 'semanal' as const,
                                  dataUltimaAjuste: now
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="2.5">2.5 mg</option>
                          <option value="5">5 mg</option>
                          <option value="7.5">7.5 mg</option>
                          <option value="10">10 mg</option>
                          <option value="12.5">12.5 mg</option>
                          <option value="15">15 mg</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status da titulação</label>
                        <select
                          value={pacienteEditando?.planoTerapeutico?.titrationStatus || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                titrationStatus: e.target.value as any
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="INICIADO">Iniciado</option>
                          <option value="EM_TITULACAO">Em titulação</option>
                          <option value="MANUTENCAO">Manutenção</option>
                          <option value="PAUSADO">Pausado</option>
                          <option value="ENCERRADO">Encerrado</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Observações de titulação</label>
                        <textarea
                          value={pacienteEditando?.planoTerapeutico?.titrationNotes || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                titrationNotes: e.target.value
                              }
                            });
                          }}
                          placeholder="Motivo de ajuste, intolerância GI, etc."
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Editor de Esquema de Doses por Semana */}
                    {(() => {
                      if (!pacienteEditando?.planoTerapeutico?.startDate || !pacienteEditando?.planoTerapeutico?.injectionDayOfWeek) {
                        return (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                              Configure a data de início e o dia da semana da aplicação na seção 5.1 para visualizar o esquema de doses.
                            </p>
                          </div>
                        );
                      }

                      // Usar a mesma lógica do calendário para calcular as semanas
                      const diasSemana: { [key: string]: number } = {
                        dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
                      };
                      const diaDesejado = diasSemana[pacienteEditando.planoTerapeutico.injectionDayOfWeek];
                      const startDateValue = pacienteEditando.planoTerapeutico.startDate;
                      const primeiraDose = startDateValue instanceof Date 
                        ? new Date(startDateValue)
                        : new Date(startDateValue as any);
                      primeiraDose.setHours(0, 0, 0, 0);
                      while (primeiraDose.getDay() !== diaDesejado) {
                        primeiraDose.setDate(primeiraDose.getDate() + 1);
                      }

                      const doseInicial = pacienteEditando.planoTerapeutico.currentDoseMg || 2.5;
                      const numeroSemanas = pacienteEditando.planoTerapeutico.numeroSemanasTratamento || 18;
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      const evolucao = pacienteEditando.evolucaoSeguimento || [];

                      // Função para calcular dose automática (mesma lógica do calendário)
                      const calcularDoseAutomatica = (semanaIndex: number) => {
                        let semanasDesdeUltimoCiclo = semanaIndex;
                        for (let s = 0; s < semanaIndex; s++) {
                          const dataPrevista = new Date(primeiraDose);
                          dataPrevista.setDate(primeiraDose.getDate() + (s * 7));
                          const registro = evolucao.find((e: any) => {
                            if (!e.dataRegistro) return false;
                            const dataRegistro = e.dataRegistro instanceof Date 
                              ? new Date(e.dataRegistro)
                              : new Date(e.dataRegistro as any);
                            if (isNaN(dataRegistro.getTime())) return false;
                            dataRegistro.setHours(0, 0, 0, 0);
                            const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDias <= 1;
                          });
                          if (registro && registro.dataRegistro) {
                            const dataRegistro = registro.dataRegistro instanceof Date 
                              ? new Date(registro.dataRegistro)
                              : new Date(registro.dataRegistro as any);
                            dataRegistro.setHours(0, 0, 0, 0);
                            const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
                            if (diffDias >= 4) {
                              semanasDesdeUltimoCiclo = semanaIndex - s - 1;
                              break;
                            }
                          }
                        }
                        return doseInicial + (Math.floor(semanasDesdeUltimoCiclo / 4) * 2.5);
                      };

                      // Criar array de semanas com dados
                      const semanasCanceladas = pacienteEditando.planoTerapeutico.semanasCanceladas || [];
                      const semanas = [];
                      for (let s = 0; s < numeroSemanas; s++) {
                        const dataDose = new Date(primeiraDose);
                        dataDose.setDate(primeiraDose.getDate() + (s * 7));
                        const semanaNum = s + 1;
                        const doseAutomatica = calcularDoseAutomatica(s);
                        const doseCustomizada = pacienteEditando.planoTerapeutico.esquemaDosesCustomizado?.[semanaNum];
                        const doseAtual = doseCustomizada || doseAutomatica;
                        const isPassada = dataDose < hoje;
                        const isFutura = dataDose >= hoje;
                        const isCancelada = semanasCanceladas.includes(semanaNum);

                        semanas.push({
                          semana: semanaNum,
                          data: dataDose,
                          doseAutomatica,
                          doseAtual,
                          doseCustomizada: doseCustomizada || undefined,
                          isPassada,
                          isFutura,
                          isCancelada
                        });
                      }

                      return (
                        <div className="mt-6 border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="text-sm font-semibold text-gray-800">Esquema de Doses por Semana</h5>
                              <p className="text-xs text-gray-500 mt-1">
                                Edite as doses futuras (semanas ainda não aplicadas). As semanas já aplicadas não podem ser alteradas.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                // Limpar todas as doses customizadas
                                setPacienteEditando({
                                  ...pacienteEditando!,
                                  planoTerapeutico: {
                                    ...pacienteEditando?.planoTerapeutico,
                                    esquemaDosesCustomizado: undefined
                                  }
                                });
                              }}
                              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            >
                              Resetar para Automático
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <div className="inline-flex gap-2 min-w-full pb-2" style={{ minWidth: 'max-content' }}>
                              {semanas.map((item) => {
                                const isEditable = item.isFutura;
                                return (
                                  <div
                                    key={item.semana}
                                    className={`flex-shrink-0 w-24 border rounded-lg p-2 ${
                                      item.isCancelada
                                        ? 'bg-red-50 border-red-300'
                                        : item.isPassada 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : item.isFutura 
                                        ? 'bg-blue-50 border-blue-200' 
                                        : 'bg-white border-gray-200'
                                    }`}
                                  >
                                    <div className="text-center">
                                      <div className="text-xs font-semibold text-gray-600 mb-1">
                                        Sem {item.semana}
                                      </div>
                                      <div className="text-xs text-gray-500 mb-2">
                                        {item.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      </div>
                                      {item.isCancelada ? (
                                        <div className="text-center">
                                          <div className="text-xs font-semibold text-red-700 mb-1">
                                            ⚠️ Cancelada
                                          </div>
                                          <button
                                            onClick={() => {
                                              const semanasCanceladasAtual = pacienteEditando?.planoTerapeutico?.semanasCanceladas || [];
                                              const novasCanceladas = semanasCanceladasAtual.filter(s => s !== item.semana);
                                              
                                              setPacienteEditando({
                                                ...pacienteEditando!,
                                                planoTerapeutico: {
                                                  ...pacienteEditando?.planoTerapeutico,
                                                  semanasCanceladas: novasCanceladas.length > 0 ? novasCanceladas : undefined
                                                }
                                              });
                                            }}
                                            className="text-[10px] text-red-600 hover:text-red-800 underline"
                                          >
                                            Reativar
                                          </button>
                                        </div>
                                      ) : isEditable ? (
                                        <div className="space-y-1">
                                          <select
                                            value={item.doseAtual}
                                            onChange={(e) => {
                                              const novaDose = parseFloat(e.target.value);
                                              const esquemaAtual = pacienteEditando?.planoTerapeutico?.esquemaDosesCustomizado || {};
                                              const novoEsquema = { ...esquemaAtual };
                                              
                                              if (novaDose === item.doseAutomatica) {
                                                // Se voltou para o valor automático, remover da customização
                                                delete novoEsquema[item.semana];
                                              } else {
                                                novoEsquema[item.semana] = novaDose;
                                              }
                                              
                                              setPacienteEditando({
                                                ...pacienteEditando!,
                                                planoTerapeutico: {
                                                  ...pacienteEditando?.planoTerapeutico,
                                                  esquemaDosesCustomizado: Object.keys(novoEsquema).length > 0 ? novoEsquema : undefined
                                                }
                                              });
                                            }}
                                            className="w-full text-xs border border-gray-300 rounded px-1 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          >
                                            <option value="2.5">2.5 mg</option>
                                            <option value="5">5 mg</option>
                                            <option value="7.5">7.5 mg</option>
                                            <option value="10">10 mg</option>
                                            <option value="12.5">12.5 mg</option>
                                            <option value="15">15 mg</option>
                                          </select>
                                          <label className="flex items-center justify-center cursor-pointer text-[10px] text-red-600 hover:text-red-800">
                                            <input
                                              type="checkbox"
                                              checked={false}
                                              onChange={(e) => {
                                                const semanasCanceladasAtual = pacienteEditando?.planoTerapeutico?.semanasCanceladas || [];
                                                const novasCanceladas = [...semanasCanceladasAtual, item.semana];
                                                
                                                setPacienteEditando({
                                                  ...pacienteEditando!,
                                                  planoTerapeutico: {
                                                    ...pacienteEditando?.planoTerapeutico,
                                                    semanasCanceladas: novasCanceladas
                                                  }
                                                });
                                              }}
                                              className="mr-1 h-3 w-3"
                                            />
                                            Cancelar
                                          </label>
                                        </div>
                                      ) : (
                                        <div className={`text-xs font-medium ${
                                          item.doseCustomizada ? 'text-blue-700' : 'text-gray-700'
                                        }`}>
                                          {item.doseAtual} mg
                                          {item.doseCustomizada && (
                                            <span className="block text-[10px] text-blue-500 mt-0.5">(custom)</span>
                                          )}
                                        </div>
                                      )}
                                      {item.isPassada && !item.isCancelada && (
                                        <div className="text-[10px] text-gray-400 mt-1">Aplicada</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {(semanas.some(s => pacienteEditando?.planoTerapeutico?.esquemaDosesCustomizado?.[s.semana]) || 
                            semanas.some(s => s.isCancelada)) && (
                            <div className="mt-3 space-y-2">
                              {semanas.some(s => pacienteEditando?.planoTerapeutico?.esquemaDosesCustomizado?.[s.semana]) && (
                                <p className="text-xs text-blue-600">
                                  <strong>Nota:</strong> Semanas com doses customizadas aparecem destacadas. As doses automáticas são calculadas considerando ajustes e atrasos do tratamento.
                                </p>
                              )}
                              {semanas.some(s => s.isCancelada) && (
                                <p className="text-xs text-red-600">
                                  <strong>Atenção:</strong> Semanas canceladas aparecem em vermelho. Ao salvar o paciente, essas semanas serão automaticamente registradas como puladas na Pasta 6 (Evolução/Seguimento) e não aparecerão nos calendários futuros.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 5.3 Metas do tratamento */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">5.3 Metas do Tratamento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de meta de perda de peso</label>
                        <select
                          value={pacienteEditando?.planoTerapeutico?.metas?.weightLossTargetType || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                metas: {
                                  ...pacienteEditando?.planoTerapeutico?.metas,
                                  weightLossTargetType: e.target.value as any
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="PERCENTUAL">Percentual</option>
                          <option value="PESO_ABSOLUTO">Peso absoluto (kg)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Valor da meta</label>
                        <input
                          type="number"
                          step="0.1"
                          value={pacienteEditando?.planoTerapeutico?.metas?.weightLossTargetValue || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                metas: {
                                  ...pacienteEditando?.planoTerapeutico?.metas,
                                  weightLossTargetValue: parseFloat(e.target.value) || 0
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          placeholder={pacienteEditando?.planoTerapeutico?.metas?.weightLossTargetType === 'PERCENTUAL' ? '%' : 'kg'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta de HbA1c</label>
                        <select
                          value={pacienteEditando?.planoTerapeutico?.metas?.hba1cTargetType || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                metas: {
                                  ...pacienteEditando?.planoTerapeutico?.metas,
                                  hba1cTargetType: e.target.value as any
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="≤7.0">≤7.0%</option>
                          <option value="≤6.8">≤6.8%</option>
                          <option value="≤6.5">≤6.5%</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Redução de circunferência (cm)</label>
                        <select
                          value={pacienteEditando?.planoTerapeutico?.metas?.waistReductionTargetCm || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                metas: {
                                  ...pacienteEditando?.planoTerapeutico?.metas,
                                  waistReductionTargetCm: parseInt(e.target.value) as any
                                }
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="5">5 cm</option>
                          <option value="10">10 cm</option>
                          <option value="15">15 cm</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Metas secundárias</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals?.remissaoPreDiabetes || false}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando!,
                                planoTerapeutico: {
                                  ...pacienteEditando?.planoTerapeutico,
                                  metas: {
                                    ...pacienteEditando?.planoTerapeutico?.metas,
                                    secondaryGoals: {
                                      ...pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals,
                                      remissaoPreDiabetes: e.target.checked
                                    }
                                  }
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">Remissão de pré-diabetes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals?.melhoraEHNA || false}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando!,
                                planoTerapeutico: {
                                  ...pacienteEditando?.planoTerapeutico,
                                  metas: {
                                    ...pacienteEditando?.planoTerapeutico?.metas,
                                    secondaryGoals: {
                                      ...pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals,
                                      melhoraEHNA: e.target.checked
                                    }
                                  }
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">Melhora de EHNA</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals?.reducaoTG || false}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando!,
                                planoTerapeutico: {
                                  ...pacienteEditando?.planoTerapeutico,
                                  metas: {
                                    ...pacienteEditando?.planoTerapeutico?.metas,
                                    secondaryGoals: {
                                      ...pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals,
                                      reducaoTG: e.target.checked
                                    }
                                  }
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">Redução de TG &lt;150 mg/dL</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals?.reducaoPA || false}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando!,
                                planoTerapeutico: {
                                  ...pacienteEditando?.planoTerapeutico,
                                  metas: {
                                    ...pacienteEditando?.planoTerapeutico?.metas,
                                    secondaryGoals: {
                                      ...pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals,
                                      reducaoPA: e.target.checked
                                    }
                                  }
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">PA sistólica &lt;130 mmHg</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals?.outro || false}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando!,
                                planoTerapeutico: {
                                  ...pacienteEditando?.planoTerapeutico,
                                  metas: {
                                    ...pacienteEditando?.planoTerapeutico?.metas,
                                    secondaryGoals: {
                                      ...pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals,
                                      outro: e.target.checked
                                    }
                                  }
                                }
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-900">Outro</span>
                        </label>
                        {pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals?.outro && (
                          <input
                            type="text"
                            value={pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals?.outroDescricao || ''}
                            onChange={(e) => {
                              setPacienteEditando({
                                ...pacienteEditando!,
                                planoTerapeutico: {
                                  ...pacienteEditando?.planoTerapeutico,
                                  metas: {
                                    ...pacienteEditando?.planoTerapeutico?.metas,
                                    secondaryGoals: {
                                      ...pacienteEditando?.planoTerapeutico?.metas?.secondaryGoals,
                                      outroDescricao: e.target.value
                                    }
                                  }
                                }
                              });
                            }}
                            placeholder="Especificar meta"
                            className="w-full md:w-96 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 5.4 Plano comportamental */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">5.4 Plano Comportamental</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plano nutricional</label>
                        <select
                          value={pacienteEditando?.planoTerapeutico?.nutritionPlan || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                nutritionPlan: e.target.value as any
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="Hipocalórico balanceado">Hipocalórico balanceado</option>
                          <option value="Low-carb moderado">Low-carb moderado</option>
                          <option value="Mediterrâneo">Mediterrâneo</option>
                          <option value="Proteína priorizada">Proteína priorizada</option>
                          <option value="Personalizado">Personalizado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plano de atividade física</label>
                        <select
                          value={pacienteEditando?.planoTerapeutico?.activityPlan || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                activityPlan: e.target.value as any
                              }
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="Iniciante">Iniciante</option>
                          <option value="Moderado">Moderado</option>
                          <option value="Vigoroso">Vigoroso</option>
                          <option value="Personalizado">Personalizado</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Observações nutricionais</label>
                        <textarea
                          value={pacienteEditando?.planoTerapeutico?.nutritionNotes || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                nutritionNotes: e.target.value
                              }
                            });
                          }}
                          placeholder="Macros, fracionamento, ingestão hídrica mínima (≥2 L/dia)"
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Observações de atividade física</label>
                        <textarea
                          value={pacienteEditando?.planoTerapeutico?.activityNotes || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                activityNotes: e.target.value
                              }
                            });
                          }}
                          placeholder="Metas semanais (minutos), tipo (força/cardio)"
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Suporte multiprofissional</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={pacienteEditando?.planoTerapeutico?.supportPlan?.nutricionista || false}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando!,
                                  planoTerapeutico: {
                                    ...pacienteEditando?.planoTerapeutico,
                                    supportPlan: {
                                      ...pacienteEditando?.planoTerapeutico?.supportPlan,
                                      nutricionista: e.target.checked
                                    }
                                  }
                                });
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-900">Nutricionista</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={pacienteEditando?.planoTerapeutico?.supportPlan?.psicologia || false}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando!,
                                  planoTerapeutico: {
                                    ...pacienteEditando?.planoTerapeutico,
                                    supportPlan: {
                                      ...pacienteEditando?.planoTerapeutico?.supportPlan,
                                      psicologia: e.target.checked
                                    }
                                  }
                                });
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-900">Psicologia</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={pacienteEditando?.planoTerapeutico?.supportPlan?.educacaoFisica || false}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando!,
                                  planoTerapeutico: {
                                    ...pacienteEditando?.planoTerapeutico,
                                    supportPlan: {
                                      ...pacienteEditando?.planoTerapeutico?.supportPlan,
                                      educacaoFisica: e.target.checked
                                    }
                                  }
                                });
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-900">Educação física</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={pacienteEditando?.planoTerapeutico?.supportPlan?.grupoApoio || false}
                              onChange={(e) => {
                                setPacienteEditando({
                                  ...pacienteEditando!,
                                  planoTerapeutico: {
                                    ...pacienteEditando?.planoTerapeutico,
                                    supportPlan: {
                                      ...pacienteEditando?.planoTerapeutico?.supportPlan,
                                      grupoApoio: e.target.checked
                                    }
                                  }
                                });
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-900">Grupo de apoio</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5.8 Auditoria */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">5.8 Auditoria e Educação</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando?.planoTerapeutico?.educationDelivered || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                educationDelivered: e.target.checked
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Orientação sobre técnica de aplicação, dieta, hidratação, efeitos GI, janela de 96h</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={pacienteEditando?.planoTerapeutico?.informedRisksDiscussed || false}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                informedRisksDiscussed: e.target.checked
                              }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-900">Riscos informados discutidos (MEN2/CMT, gestação/lactação, pancreatite)</span>
                      </label>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Observações de auditoria</label>
                        <textarea
                          value={pacienteEditando?.planoTerapeutico?.auditNotes || ''}
                          onChange={(e) => {
                            setPacienteEditando({
                              ...pacienteEditando!,
                              planoTerapeutico: {
                                ...pacienteEditando?.planoTerapeutico,
                                auditNotes: e.target.value
                              }
                            });
                          }}
                          placeholder="Justificativas clínicas de decisões fora da regra"
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pastaAtiva === 6 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolução / Seguimento Semanal</h3>
                  
                  {(() => {
                    const evolucao = pacienteEditando?.evolucaoSeguimento || [];
                    const planoTerapeutico = pacienteEditando?.planoTerapeutico;
                    const medidasIniciais = pacienteEditando?.dadosClinicos?.medidasIniciais;
                    
                    // Construir care plan a partir dos dados existentes
                    // Baseline weight: usar o peso real da primeira medição (weekIndex 1) ou peso inicial se não houver registros
                    const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
                    const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
                    const metaPeso = planoTerapeutico?.metas?.weightLossTargetType === 'PERCENTUAL' 
                      ? planoTerapeutico?.metas?.weightLossTargetValue || 0
                      : planoTerapeutico?.metas?.weightLossTargetValue || 0;
                    
                    // Usar modelo dose-driven anchored: schedule sugerido de titulação com âncoras clínicas
                    const suggestedSchedule = buildSuggestedDoseSchedule(1, [2.5, 5, 7.5, 10, 12.5, 15], 4);
                    
                    // Calcular semanas totais: usar número de semanas do plano terapêutico (padrão: 18)
                    const totalSemanasGrafico = planoTerapeutico?.numeroSemanasTratamento || 18;
                    
                    const expectedCurve = buildExpectedCurveDoseDrivenAnchored({
                      baselineWeightKg: baselineWeight,
                      doseSchedule: suggestedSchedule,
                      totalWeeks: totalSemanasGrafico,
                      targetType: planoTerapeutico?.metas?.weightLossTargetType,
                      targetValue: metaPeso,
                      useAnchorWeek: 18,
                      useAnchorPct: 9.0
                    });
                    
                    // Preparar dados para o gráfico de peso (todas as semanas até a última)
                    const pesoChartData = expectedCurve.slice(0, totalSemanasGrafico).map((week) => {
                      const registroSemana = evolucao.find(e => e.weekIndex === week.weekIndex);
                      return {
                        semana: week.weekIndex,
                        previsto: week.expectedWeightKg,
                        real: registroSemana?.peso || null
                      };
                    });
                    
                    // Preparar dados para gráfico de circunferência com curva prevista
                    const baseCircAbdominal = primeiroRegistro?.circunferenciaAbdominal || medidasIniciais?.circunferenciaAbdominal || 0;
                    const circData = expectedCurve.map(week => {
                      const registroSemana = evolucao.find(e => e.weekIndex === week.weekIndex);
                      const previsto = week.expectedCumulativePct 
                        ? predictWaistCircumference({ 
                            baselineWaistCm: baseCircAbdominal, 
                            cumulativeWeightLossPct: week.expectedCumulativePct 
                          })
                        : null;
                      return {
                        semana: week.weekIndex,
                        circunferencia: registroSemana?.circunferenciaAbdominal || null,
                        previsto: previsto
                      };
                    });
                    
                    // Preparar dados para gráfico de HbA1c com curva prevista (das semanas de seguimento)
                    const exames = pacienteEditando?.examesLaboratoriais || [];
                    const baseHbA1cFromExams = exames
                      .filter(ex => ex.hemoglobinaGlicada)
                      .sort((a, b) => new Date(a.dataColeta).getTime() - new Date(b.dataColeta).getTime())[0]?.hemoglobinaGlicada;
                    
                    // Baseline: usar o primeiro registro real (se houver) ou o baseline dos exames
                    const primeiroRegistroHbA1c = evolucao.find(e => e.hba1c);
                    const baseHbA1c = primeiroRegistroHbA1c?.hba1c || baseHbA1cFromExams;
                    
                    const metaHba1c = planoTerapeutico?.metas?.hba1cTargetType;
                    const metaValue = metaHba1c ? parseFloat(metaHba1c.replace('≤', '')) : null;
                    
                    // Definir faixa ideal de HbA1c (4.0% até a meta, ou 4.0-5.6% se não houver meta)
                    const faixaIdealMin = 4.0;
                    const faixaIdealMax = metaValue ? metaValue : 5.6; // Meta terapêutica ou faixa normal
                    
                    const hba1cData = expectedCurve.map(week => {
                      const registroSemana = evolucao.find(e => e.weekIndex === week.weekIndex);
                      
                      return {
                        semana: week.weekIndex,
                        hba1c: registroSemana?.hba1c || null,
                        faixaIdealMin: faixaIdealMin,
                        faixaIdealMax: faixaIdealMax
                      };
                    });
                    
                    return (
                      <div className="space-y-6">
                        {/* Tabs para selecionar gráfico */}
                        <div className="border border-gray-200 rounded-lg bg-white">
                          <div className="flex border-b border-gray-200">
                            <button
                              onClick={() => setGraficoAtivoPasta6('peso')}
                              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                                graficoAtivoPasta6 === 'peso'
                                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              📊 Peso
          </button>
                            <button
                              onClick={() => setGraficoAtivoPasta6('circunferencia')}
                              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                                graficoAtivoPasta6 === 'circunferencia'
                                  ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-700'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              📏 Circunferência
                            </button>
                            <button
                              onClick={() => setGraficoAtivoPasta6('hba1c')}
                              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                                graficoAtivoPasta6 === 'hba1c'
                                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              🩸 HbA1c
                            </button>
                            <button
                              onClick={() => setGraficoAtivoPasta6('imc')}
                              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                                graficoAtivoPasta6 === 'imc'
                                  ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              📈 IMC
                            </button>
                          </div>
                          
                          {/* Conteúdo do gráfico selecionado */}
                          <div className="p-6">
                            {graficoAtivoPasta6 === 'peso' && (
                              baselineWeight > 0 ? (
                                <div>
                                  <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-gray-900">
                                      {pacienteEditando?.nome}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      Peso inicial (primeira medição): {baselineWeight.toFixed(1)} kg
                                    </p>
                                  </div>
                                  
                                  {(() => {
                                    const domainMin = Math.max(0, baselineWeight - 20);
                                    const domainMax = baselineWeight + 20;
                                    
                                    return (
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
                                              domain={[domainMin, domainMax]}
                                            />
                                            <Tooltip 
                                              formatter={(value: any) => `${parseFloat(value).toFixed(1)} kg`}
                                              labelFormatter={(label) => `Semana ${label}`}
                                            />
                                            <Legend 
                                              wrapperStyle={{ paddingTop: '10px' }} 
                                              className="hidden md:block"
                                              iconSize={12}
                                            />
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
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="py-8 bg-amber-50">
                                  <p className="text-sm text-amber-800 text-center">
                                    ⚠️ Para visualizar o gráfico, é necessário preencher o peso inicial na Pasta 2 (Medidas Iniciais).
                                  </p>
                                </div>
                              )
                            )}
                            
                            {graficoAtivoPasta6 === 'circunferencia' && (
                              baseCircAbdominal > 0 ? (
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                    Circunferência Abdominal (cm)
                                  </h4>
                                  {(() => {
                                    const domainMin = Math.max(0, baseCircAbdominal - 20);
                                    const domainMax = baseCircAbdominal + 20;
                                    
                                    return (
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
                                              domain={[domainMin, domainMax]}
                                            />
                                            <Tooltip 
                                              formatter={(value: any) => `${parseFloat(value).toFixed(1)} cm`}
                                              labelFormatter={(label) => `Semana ${label}`}
                                            />
                                            <Legend 
                                              wrapperStyle={{ paddingTop: '10px' }} 
                                              className="hidden md:block"
                                              iconSize={12}
                                            />
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
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="py-8 bg-amber-50">
                                  <p className="text-sm text-amber-800 text-center">
                                    ⚠️ Para visualizar o gráfico, é necessário preencher a circunferência abdominal inicial na Pasta 2 e adicionar registros semanais.
                                  </p>
                                </div>
                              )
                            )}
                            
                            {graficoAtivoPasta6 === 'hba1c' && (
                              (baseHbA1c || metaValue) ? (
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                    Hemoglobina Glicada (HbA1c) %
                                    {metaValue && <span className="text-sm font-normal text-gray-600 ml-2">(Meta: {'<'} {metaValue}%)</span>}
                                  </h4>
                                  {(() => {
                                    const valuesWithReal = hba1cData.map(d => d.hba1c).filter(v => v !== null) as number[];
                                    const allValues = [...valuesWithReal, faixaIdealMin, faixaIdealMax];
                                    const minValue = Math.min(...allValues);
                                    const maxValue = Math.max(...allValues);
                                    const range = maxValue - minValue;
                                    const domainMin = Math.max(0, minValue - range * 0.2);
                                    const domainMax = maxValue + range * 0.2;
                                    
                                    return (
                                      <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <AreaChart data={hba1cData}>
                                            <defs>
                                              {/* Padrão de hachura diagonal para a faixa ideal */}
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
                                              domain={[domainMin, domainMax]}
                                            />
                                            <Tooltip 
                                              formatter={(value: any, name: string) => {
                                                if (name === 'faixaIdeal') return null; // Não mostrar no tooltip
                                                return value !== null ? `${parseFloat(value).toFixed(1)}%` : 'N/A';
                                              }}
                                              labelFormatter={(label) => `Semana ${label}`}
                                              contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '6px'
                                              }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            {/* Área da faixa ideal - não aparece na legenda */}
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
                                            {/* Linha superior da faixa ideal - aparece no gráfico e na legenda */}
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
                                            {/* Linha inferior da faixa ideal - aparece no gráfico mas não na legenda */}
                                            <Line
                                              type="monotone"
                                              dataKey="faixaIdealMin"
                                              stroke="#10b981"
                                              strokeWidth={1.5}
                                              strokeDasharray="3 3"
                                              dot={false}
                                              legendType="none"
                                            />
                                            {/* HbA1c Real */}
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
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="py-8 bg-amber-50">
                                  <p className="text-sm text-amber-800 text-center">
                                    ⚠️ Para visualizar o gráfico, é necessário adicionar exames laboratoriais com HbA1c na Pasta 4.
                                  </p>
                                </div>
                              )
                            )}

                            {graficoAtivoPasta6 === 'imc' && (() => {
                              const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
                              
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

                              // Preparar dados de IMC para cada semana
                              const imcData = expectedCurve.map(week => {
                                const registroSemana = evolucao.find(e => e.weekIndex === week.weekIndex);
                                const pesoReal = registroSemana?.peso || null;
                                const pesoPrevisto = week.expectedWeightKg;
                                
                                // Calcular IMC real se houver peso e altura
                                const imcReal = alturaMetros && pesoReal ? pesoReal / (alturaMetros * alturaMetros) : null;
                                
                                // Calcular IMC previsto
                                const imcPrevisto = alturaMetros && pesoPrevisto ? pesoPrevisto / (alturaMetros * alturaMetros) : null;
                                
                                // Calcular grau de obesidade
                                const grauReal = calcularGrauObesidade(imcReal);
                                const grauPrevisto = calcularGrauObesidade(imcPrevisto);
                                
                                // Converter para índice de grau para o eixo Y
                                const indiceGrauReal = imcParaIndiceGrau(imcReal);
                                const indiceGrauPrevisto = imcParaIndiceGrau(imcPrevisto);
                                
                                return {
                                  semana: week.weekIndex,
                                  imc: imcReal,
                                  previsto: imcPrevisto,
                                  grau: grauReal,
                                  grauPrevisto: grauPrevisto,
                                  indiceGrau: indiceGrauReal,
                                  indiceGrauPrevisto: indiceGrauPrevisto
                                };
                              }).filter(d => d.imc !== null || d.previsto !== null);

                              return alturaMetros && imcData.length > 0 ? (
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                    Índice de Massa Corporal (IMC) - kg/m²
                                  </h4>
                                  
                                  {/* Mostrar grau de obesidade por semana */}
                                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Evolução do Grau de Obesidade:</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                      {imcData.filter(d => d.imc !== null).slice(0, 12).map((item) => (
                                        <div key={item.semana} className="text-xs">
                                          <span className="font-medium text-gray-600">Sem. {item.semana}:</span>
                                          <span className={`ml-1 ${getCorGrauObesidade(item.grau)}`}>
                                            {item.grau ? item.grau.replace('Obesidade ', '') : 'N/A'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {(() => {
                                    const grausLabels = ['Abaixo do peso', 'Peso normal', 'Sobrepeso', 'Grau I', 'Grau II', 'Grau III'];
                                    
                                    return (
                                      <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={imcData}>
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
                                            <Legend 
                                              wrapperStyle={{ paddingTop: '10px' }} 
                                              className="hidden md:block"
                                              iconSize={12}
                                            />
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
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="py-8 bg-amber-50">
                                  <p className="text-sm text-amber-800 text-center">
                                    ⚠️ Para visualizar o gráfico de IMC, é necessário preencher a altura inicial na Pasta 2 e adicionar registros semanais com peso.
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Timeline de semanas */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-gray-900">Timeline Semanal</h4>
          <button
                              onClick={() => setShowAdicionarSeguimentoModal(true)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                            >
                              <Plus size={16} />
                              {evolucao.length === 0 ? 'Adicionar Primeiro Registro' : 'Adicionar Novo Registro'}
                            </button>
                          </div>
                          {evolucao.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-gray-500">Nenhum seguimento registrado ainda.</p>
                            </div>
                          ) : (
                            evolucao.map((registro, idx) => {
                              const expectedWeek = expectedCurve.find(e => e.weekIndex === registro.weekIndex);
                              // No primeiro registro (weekIndex 1), delta é sempre 0
                              const varianceKg = registro.weekIndex === 1 
                                ? 0 
                                : (expectedWeek && registro.peso 
                                  ? registro.peso - expectedWeek.expectedWeightKg 
                                  : null);
                              const status = varianceStatus(varianceKg);
                              
                              const planoTerapeutico = pacienteEditando?.planoTerapeutico;
                              const startDateStr = planoTerapeutico?.startDate || new Date();
                              const startDate = new Date(startDateStr);
                              const weekStart = new Date(startDate.getTime() + (registro.weekIndex - 1) * 7 * 24 * 60 * 60 * 1000);
                              const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                              
                              return (
                                <div 
                                  key={registro.id} 
                                  className={`border-2 rounded-lg p-4 bg-white ${
                                    registro.adherence === 'MISSED' && !registro.doseAplicada
                                      ? 'border-l-4 border-l-red-500 bg-red-50'
                                      : idx % 2 === 0 
                                        ? 'border-l-4 border-l-blue-500' 
                                        : 'border-l-4 border-l-green-500'
                                  }`}
                                >
                                  {/* Cabeçalho */}
                                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3 pb-3 border-b border-gray-200">
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-gray-900">
                                          Semana {registro.weekIndex}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} a {weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                                        </span>
                                      </div>
                                      {registro.doseAplicada ? (
                                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                          💉 Dose {registro.doseAplicada.quantidade} mg
                                        </span>
                                      ) : registro.adherence === 'MISSED' ? (
                                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">
                                          ⚠️ Semana Pulada - Medicação não realizada
                                        </span>
                                      ) : null}
                                    </div>
                                    
                                    {/* Comparativo de peso */}
                                    {expectedWeek && registro.peso ? (
                                      <div>
                                        <ProgressPill
                                          varianceKg={varianceKg}
                                          expectedWeight={expectedWeek.expectedWeightKg}
                                          actualWeight={registro.peso}
                                        />
                                      </div>
                                    ) : registro.adherence === 'MISSED' && !registro.doseAplicada ? (
                                      <span className="inline-block px-3 py-1 bg-red-600 text-white rounded-full text-xs font-medium">
                                        Semana Pulada
                                      </span>
                                    ) : null}
                                  </div>
                                  
                                  {/* Adesão, Sintomas e Medidas */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                    <div className="col-span-2 md:col-span-1">
                                      <span className="text-xs text-gray-500 block mb-1">Adesão</span>
                                      <span className={`text-sm font-semibold ${
                                        registro.adherence === 'ON_TIME' || registro.adesao === 'pontual' 
                                          ? 'text-green-600' 
                                          : registro.adherence === 'MISSED' || registro.adesao === 'esquecida'
                                          ? 'text-red-600'
                                          : 'text-yellow-600'
                                      }`}>
                                        {registro.adherence === 'ON_TIME' ? '⏰ Pontual' :
                                         registro.adherence === 'LATE_<96H' ? '⚠️ Atrasada' :
                                         registro.adherence === 'MISSED' ? '❌ Perdida' :
                                         registro.adesao === 'pontual' ? '⏰ Pontual' :
                                         registro.adesao === 'atrasada' ? '⚠️ Atrasada' :
                                         registro.adesao === 'esquecida' ? '❌ Perdida' :
                                         '❓ Não informado'}
                                      </span>
                                    </div>
                                    
                                    {registro.giSeverity && (
                                      <div className="col-span-2 md:col-span-1">
                                        <span className="text-xs text-gray-500 block mb-1">Efeitos GI</span>
                                        <span className={`text-sm font-semibold ${
                                          registro.giSeverity === 'LEVE' ? 'text-green-600' :
                                          registro.giSeverity === 'MODERADO' ? 'text-yellow-600' :
                                          'text-red-600'
                                        }`}>
                                          {registro.giSeverity === 'LEVE' ? '✅ Leve' :
                                           registro.giSeverity === 'MODERADO' ? '⚠️ Moderado' :
                                           '❌ Grave'}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {registro.localAplicacao && (
                                      <div className="col-span-2 md:col-span-1">
                                        <span className="text-xs text-gray-500 block mb-1">Local aplicação</span>
                                        <span className="text-sm font-semibold text-gray-900 capitalize">
                                          {registro.localAplicacao === 'abdome' ? '📍 Abdome' :
                                           registro.localAplicacao === 'coxa' ? '📍 Coxa' :
                                           '📍 Braço'}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {registro.circunferenciaAbdominal && (
                                      <div className="col-span-2 md:col-span-1">
                                        <span className="text-xs text-gray-500 block mb-1">Circunferência</span>
                                        <span className="text-sm font-semibold text-gray-900">
                                          {registro.circunferenciaAbdominal.toFixed(1)} cm
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Alertas */}
                                  {registro.alerts && registro.alerts.length > 0 && (
                                    <div className="mb-3">
                                      <AlertBadges alerts={registro.alerts} />
                                    </div>
                                  )}
                                  
                                  {/* Observações */}
                                  {(registro.observacoesPaciente || registro.comentarioMedico) && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                      {registro.observacoesPaciente && (
                                        <div className="text-sm">
                                          <span className="font-medium text-gray-700">Paciente: </span>
                                          <span className="text-gray-900">{registro.observacoesPaciente}</span>
                                        </div>
                                      )}
                                      {registro.comentarioMedico && (
                                        <div className="text-sm">
                                          <span className="font-medium text-blue-700">Médico: </span>
                                          <span className="text-gray-900">{registro.comentarioMedico}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Botões de ação */}
                                  <div className="mt-4 flex gap-2">
                                    <button
                                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
                                      onClick={() => {
                                        setSeguimentoEditando(registro);
                                        setNovoSeguimento({
                                          peso: registro.peso?.toString() || '',
                                          circunferenciaAbdominal: registro.circunferenciaAbdominal?.toString() || '',
                                          frequenciaCardiaca: registro.frequenciaCardiaca?.toString() || '',
                                          paSistolica: registro.pressaoArterial?.sistolica?.toString() || '',
                                          paDiastolica: registro.pressaoArterial?.diastolica?.toString() || '',
                                          hba1c: (registro as any).hba1c?.toString() || '',
                                          doseAplicada: registro.doseAplicada?.quantidade?.toString() || '',
                                          adesao: registro.adherence || registro.adesao || '',
                                          giSeverity: registro.giSeverity || '',
                                          localAplicacao: registro.localAplicacao || '',
                                          observacoesPaciente: registro.observacoesPaciente || '',
                                          comentarioMedico: registro.comentarioMedico || '',
                                        });
                                        setShowEditarSeguimentoModal(true);
                                      }}
                                    >
                                      <Edit size={14} />
                                      Editar
          </button>
                                    <button
                                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center justify-center gap-2"
                                      onClick={async () => {
                                        if (confirm('Tem certeza que deseja excluir este registro?')) {
                                          if (!pacienteEditando || !registro.id) return;
                                          setLoadingPacientes(true);
                                          try {
                                            const evolucaoAtualizada = evolucao.filter(e => e.id !== registro.id);
                                            const pacienteAtualizado: PacienteCompleto = {
                                              ...pacienteEditando,
                                              evolucaoSeguimento: evolucaoAtualizada
                                            };
                                            await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                                            const pacienteRecarregado = await PacienteService.getPacienteById(pacienteEditando.id);
                                            if (pacienteRecarregado) {
                                              setPacienteEditando(pacienteRecarregado);
                                            }
                                            setMessage('Registro excluído com sucesso!');
                                            await loadPacientes();
                                          } catch (error) {
                                            console.error('Erro ao excluir registro:', error);
                                            setMessage('Erro ao excluir registro');
                                          } finally {
                                            setLoadingPacientes(false);
                                          }
                                        }
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {pastaAtiva === 7 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alertas e Eventos Importantes</h3>
                    {(() => {
                      const alertas = pacienteEditando?.alertas || [];
                      const alertasAtivos = alertas.filter(a => a.status === 'ACTIVE');
                      const bloqueadoresAtivos = alertasAtivos.filter(a => a.severity === 'CRITICAL' || a.followUpRequired);
                      
                      return (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Ativos:</span>
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">{alertasAtivos.length}</span>
                          </div>
                          {isDoseUpgradeBlocked(alertasAtivos) && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                              <AlertCircle size={16} />
                              Dose bloqueada
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Filtros */}
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm rounded-md bg-blue-100 text-blue-700 font-medium">Todos</button>
                    <button className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">Ativos</button>
                    <button className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">Críticos</button>
                    <button className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">Resolvidos</button>
                  </div>

                  {/* Lista de alertas */}
                  {(() => {
                    const alertas = pacienteEditando?.alertas || [];
                    
                    if (alertas.length === 0) {
                      return (
                        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                          <p className="text-gray-600">Nenhum alerta registrado</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {alertas
                          .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
                          .map((alerta) => {
                            const IconComponent = 
                              alerta.severity === 'INFO' ? Info :
                              alerta.severity === 'MODERATE' ? AlertTriangle :
                              AlertCircle;
                            
                            return (
                              <div
                                key={alerta.id}
                                className={`border rounded-lg p-4 ${getSeverityClasses(alerta.severity)}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <IconComponent size={20} className="mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">{alerta.type}</span>
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-white/50 font-medium">
                                          {alerta.severity}
                                        </span>
                                        {alerta.linkedWeek && (
                                          <span className="text-xs text-gray-600">Semana {alerta.linkedWeek}</span>
                                        )}
                                      </div>
                                      <p className="text-sm mb-2">{alerta.description}</p>
                                      <div className="text-xs text-gray-600 mb-2">
                                        <span>Gerado: {new Date(alerta.generatedAt).toLocaleDateString('pt-BR')}</span>
                                        {alerta.resolvedAt && (
                                          <span className="ml-4">Resolvido: {new Date(alerta.resolvedAt).toLocaleDateString('pt-BR')}</span>
                                        )}
                                      </div>
                                      {alerta.followUpRequired && (
                                        <div className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded inline-block">
                                          ⚠️ Acompanhamento necessário
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    {alerta.status === 'ACTIVE' && (
                                      <>
          <button
                                          className="px-3 py-1.5 text-xs rounded-md bg-white/70 hover:bg-white font-medium border border-gray-300"
                                          onClick={() => {
                                            if (!pacienteEditando) return;
                                            const alertasAtualizados = pacienteEditando.alertas.map(a => 
                                              a.id === alerta.id ? { ...a, status: 'ACKNOWLEDGED' as const } : a
                                            );
                                            const pacienteAtualizado: PacienteCompleto = {
                                              ...pacienteEditando,
                                              alertas: alertasAtualizados
                                            };
                                            setPacienteEditando(pacienteAtualizado);
                                            setMessage('Alerta reconhecido');
                                          }}
                                        >
                                          Reconhecer
                                        </button>
                                        <button
                                          className="px-3 py-1.5 text-xs rounded-md bg-white/70 hover:bg-white font-medium border border-gray-300"
                                          onClick={() => {
                                            if (!pacienteEditando) return;
                                            const alertasAtualizados = pacienteEditando.alertas.map(a => 
                                              a.id === alerta.id ? { ...a, status: 'RESOLVED' as const, resolvedAt: new Date() } : a
                                            );
                                            const pacienteAtualizado: PacienteCompleto = {
                                              ...pacienteEditando,
                                              alertas: alertasAtualizados
                                            };
                                            setPacienteEditando(pacienteAtualizado);
                                            setMessage('Alerta resolvido');
                                          }}
                                        >
                                          Resolver
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })()}

                  {/* Histórico de Medicações */}
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Histórico de Medicações</h3>
                    {(() => {
                      const planoTerapeutico = pacienteEditando?.planoTerapeutico;
                      const evolucao = pacienteEditando?.evolucaoSeguimento || [];

                      // Função auxiliar para nome do dia da semana
                      const diaSemanaNome = (data: Date | string) => {
                        // Converter para Date se for string ou Timestamp
                        const dataObj = data instanceof Date ? data : new Date(data);
                        if (isNaN(dataObj.getTime())) {
                          return '';
                        }
                        const dias: { [key: number]: string } = {
                          0: 'Domingo',
                          1: 'Segunda-feira',
                          2: 'Terça-feira',
                          3: 'Quarta-feira',
                          4: 'Quinta-feira',
                          5: 'Sexta-feira',
                          6: 'Sábado'
                        };
                        return dias[dataObj.getDay()] || '';
                      };

                      // Função para criar calendário de doses
                      const criarCalendarioDoses = () => {
                        if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
                          return [];
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

                        // Ajustar primeira dose para o dia da semana correto
                        // Converter startDate para Date se for Timestamp ou string
                        const startDateValue = planoTerapeutico.startDate;
                        const primeiraDose = startDateValue instanceof Date 
                          ? new Date(startDateValue)
                          : new Date(startDateValue as any);
                        primeiraDose.setHours(0, 0, 0, 0);
                        while (primeiraDose.getDay() !== diaDesejado) {
                          primeiraDose.setDate(primeiraDose.getDate() + 1);
                        }

                        // Obter dose inicial do plano
                        const doseInicial = planoTerapeutico.currentDoseMg || 2.5;

                        // Obter número de semanas do tratamento (padrão: 18)
                        const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;

                        const calendario = [];
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);

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

                        // Obter semanas canceladas
                        const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
                        
                        // Criar calendário baseado no número de semanas definido
                        for (let semana = 0; semana < numeroSemanas; semana++) {
                          const semanaNum = semana + 1;
                          const isCancelada = semanasCanceladas.includes(semanaNum);
                          
                          // Calcular data da dose como primeiraDose + (semana * 7 dias)
                          const dataDose = new Date(primeiraDose);
                          dataDose.setDate(primeiraDose.getDate() + (semana * 7));

                          // Se semana cancelada, criar entrada marcada como cancelada
                          if (isCancelada) {
                            calendario.push({
                              data: dataDose,
                              semana: semanaNum,
                              dose: 0,
                              dosePlanejada: 0,
                              status: 'futura' as const,
                              isCancelada: true,
                              adherence: null,
                              localAplicacao: null
                            });
                            continue;
                          }

                          // Calcular dose planejada considerando atrasos (reinicia ciclo se atraso >= 4 dias)
                          const dosePlanejada = calcularDoseComAtrasos(semana);

                          // Encontrar registro de evolução para esta data (com tolerância de ±1 dia)
                          const registroEvolucao = evolucao.find(e => {
                            if (!e.dataRegistro) return false;
                            const dataRegistro = e.dataRegistro instanceof Date 
                              ? new Date(e.dataRegistro)
                              : new Date(e.dataRegistro as any);
                            if (isNaN(dataRegistro.getTime())) return false;
                            dataRegistro.setHours(0, 0, 0, 0);
                            const diffDias = Math.abs((dataRegistro.getTime() - dataDose.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDias <= 1; // Tolerância de 1 dia
                          });

                          // Determinar dose real (customizada > registro > planejada)
                          let doseReal = dosePlanejada;
                          // Primeiro, verificar se há dose customizada para esta semana
                          if (planoTerapeutico.esquemaDosesCustomizado && planoTerapeutico.esquemaDosesCustomizado[semana + 1]) {
                            doseReal = planoTerapeutico.esquemaDosesCustomizado[semana + 1];
                          } else if (registroEvolucao?.doseAplicada) {
                            // Se não houver customizada, usar a do registro (aplicada)
                            doseReal = registroEvolucao.doseAplicada.quantidade || dosePlanejada;
                          }

                          // Determinar status baseado em data e adesão
                          let status: 'tomada' | 'perdida' | 'hoje' | 'futura';
                          if (dataDose.getTime() === hoje.getTime()) {
                            status = 'hoje';
                          } else if (dataDose < hoje) {
                            // Dose no passado
                            if (registroEvolucao && registroEvolucao.adherence && registroEvolucao.adherence !== 'MISSED') {
                              status = 'tomada';
                            } else {
                              status = 'perdida';
                            }
                          } else {
                            status = 'futura';
                          }

                          calendario.push({
                            data: dataDose,
                            semana: semana + 1,
                            dose: doseReal,
                            dosePlanejada,
                            status,
                            isCancelada: false,
                            adherence: registroEvolucao?.adherence || null,
                            localAplicacao: registroEvolucao?.localAplicacao || null
                          });
                        }

                        return calendario;
                      };

                      const calendario = criarCalendarioDoses();

                      if (!planoTerapeutico || !planoTerapeutico.startDate || !planoTerapeutico.injectionDayOfWeek) {
                        return (
                          <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                            <Pill size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600">Plano terapêutico não configurado</p>
                            <p className="text-sm text-gray-500 mt-2">Configure a data de início e o dia da semana da aplicação no plano terapêutico.</p>
                          </div>
                        );
                      }

                      // Separar aplicações passadas e futuras
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      const aplicacoesPassadas = calendario.filter(item => {
                        const dataItem = item.data instanceof Date ? item.data : new Date(item.data as any);
                        return !isNaN(dataItem.getTime()) && dataItem < hoje && item.status !== 'futura';
                      });
                      const aplicacoesFuturas = calendario.filter(item => {
                        const dataItem = item.data instanceof Date ? item.data : new Date(item.data as any);
                        return !isNaN(dataItem.getTime()) && (dataItem >= hoje || item.status === 'futura');
                      });

                      return (
                        <div className="space-y-6">
                          {/* Botão para adicionar todo o tratamento ao Google Calendar */}
                          {aplicacoesFuturas.length > 0 && user?.email && (() => {
                            const formatarDataGoogle = (data: Date) => {
                              const ano = data.getFullYear();
                              const mes = String(data.getMonth() + 1).padStart(2, '0');
                              const dia = String(data.getDate()).padStart(2, '0');
                              const hora = String(8).padStart(2, '0'); // 8h da manhã
                              return `${ano}${mes}${dia}T${hora}0000Z`;
                            };
                            
                            const formatarDataFimGoogle = (data: Date) => {
                              const ano = data.getFullYear();
                              const mes = String(data.getMonth() + 1).padStart(2, '0');
                              const dia = String(data.getDate()).padStart(2, '0');
                              const hora = String(9).padStart(2, '0'); // 9h da manhã (1 hora de duração)
                              return `${ano}${mes}${dia}T${hora}0000Z`;
                            };
                            
                            // Criar URLs para todas as aplicações futuras
                            const eventosGoogle = aplicacoesFuturas.map(item => {
                              const dataItem = item.data instanceof Date ? item.data : new Date(item.data as any);
                              const dataInicio = formatarDataGoogle(dataItem);
                              const dataFim = formatarDataFimGoogle(dataItem);
                              const localNome = item.localAplicacao === 'abdome' ? 'Abdome' : item.localAplicacao === 'coxa' ? 'Coxa' : 'Braço';
                              const titulo = `Tirzepatida - Semana ${item.semana} - ${item.dose}mg`;
                              const detalhes = `Aplicação de Tirzepatida%0A%0ASemana: ${item.semana}%0ADose: ${item.dose}mg%0ALocal: ${localNome}%0APaciente: ${pacienteEditando?.nome || 'Paciente'}`;
                              
                              return {
                                url: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${dataInicio}/${dataFim}&details=${encodeURIComponent(detalhes)}&ctz=America/Sao_Paulo`,
                                data: dataItem,
                                semana: item.semana,
                                dose: item.dose,
                                local: localNome
                              };
                            });
                            
                            const adicionarTodosEventos = () => {
                              if (eventosGoogle.length === 0) return;
                              
                              // Avisar o usuário sobre popups
                              const confirmar = window.confirm(
                                `Serão abertas ${eventosGoogle.length} abas do Google Calendar.\n\n` +
                                `IMPORTANTE: Permita popups para este site se solicitado pelo navegador.\n\n` +
                                `Deseja continuar?`
                              );
                              
                              if (!confirmar) return;
                              
                              let abertas = 0;
                              let bloqueadas = 0;
                              
                              eventosGoogle.forEach((evento, index) => {
                                setTimeout(() => {
                                  try {
                                    const novaJanela = window.open(evento.url, '_blank');
                                    
                                    // Verificar se a janela foi bloqueada
                                    if (!novaJanela || novaJanela.closed || typeof novaJanela.closed === 'undefined') {
                                      bloqueadas++;
                                    } else {
                                      abertas++;
                                    }
                                    
                                    // Feedback final após todas as tentativas
                                    if (index === eventosGoogle.length - 1) {
                                      setTimeout(() => {
                                        if (bloqueadas > 0) {
                                          alert(
                                            `${abertas} evento(s) foram abertos com sucesso.\n` +
                                            `${bloqueadas} evento(s) foram bloqueados pelo navegador.\n\n` +
                                            `Para adicionar todos os eventos, permita popups para este site nas configurações do navegador.`
                                          );
                                        } else {
                                          alert(`${abertas} evento(s) foram abertos com sucesso!`);
                                        }
                                      }, (eventosGoogle.length * 600) + 1000);
                                    }
                                  } catch (error) {
                                    console.error('Erro ao abrir evento:', error);
                                    bloqueadas++;
                                  }
                                }, index * 600); // Delay aumentado para 600ms
                              });
                            };
                            
                            return (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-sm font-semibold text-blue-900 mb-1">
                                      Adicionar Tratamento ao Google Calendar
                                    </h4>
                                    <p className="text-xs text-blue-700">
                                      {aplicacoesFuturas.length} aplicação(ões) futura(s) serão adicionadas ao seu calendário
                                    </p>
                                  </div>
                                  <button
                                    onClick={adicionarTodosEventos}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                                  >
                                    <Calendar size={16} />
                                    Adicionar Todas
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Aplicações Passadas */}
                          {aplicacoesPassadas.length > 0 && (
                            <div>
                              <h4 className="text-md font-semibold text-gray-700 mb-3">Aplicações Realizadas</h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {aplicacoesPassadas.map((item, idx) => {
                                  // Garantir que item.data seja sempre Date
                                  const dataItem = item.data instanceof Date 
                                    ? item.data 
                                    : new Date(item.data as any);
                                  const dataFormatada = !isNaN(dataItem.getTime()) 
                                    ? dataItem.toLocaleDateString('pt-BR') 
                                    : 'Data inválida';
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center justify-between p-3 rounded-md border ${
                                        item.status === 'tomada'
                                          ? 'bg-green-50 border-green-200'
                                          : 'bg-red-50 border-red-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-16 text-center">
                                          <div className="text-xs text-gray-500">Semana</div>
                                          <div className="text-lg font-bold text-gray-900">{item.semana}</div>
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-sm text-gray-600">
                                            {dataFormatada} ({diaSemanaNome(dataItem)})
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Dose: {item.dose} mg
                                          </div>
                                          {item.localAplicacao && (
                                            <div className="text-xs text-gray-400 mt-1">
                                              Local: {item.localAplicacao === 'abdome' ? 'Abdome' : item.localAplicacao === 'coxa' ? 'Coxa' : 'Braço'}
                                            </div>
                                          )}
                                          {item.adherence && item.status === 'tomada' && (
                                            <div className="text-xs text-gray-400 mt-1">
                                              {item.adherence === 'ON_TIME' ? '✓ Pontual' : item.adherence === 'LATE_<96H' ? '⚠ Atrasada' : ''}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        {item.status === 'tomada' && (
                                          <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                                            ✓ Tomada
                                          </span>
                                        )}
                                        {item.status === 'perdida' && (
                                          <span className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-full">
                                            ✗ Perdida
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Próximas Aplicações */}
                          {aplicacoesFuturas.length > 0 && (
                            <div>
                              <h4 className="text-md font-semibold text-gray-700 mb-3">Próximas Aplicações</h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {aplicacoesFuturas.map((item, idx) => {
                                  // Garantir que item.data seja sempre Date
                                  const dataItem = item.data instanceof Date 
                                    ? item.data 
                                    : new Date(item.data as any);
                                  const dataFormatada = !isNaN(dataItem.getTime()) 
                                    ? dataItem.toLocaleDateString('pt-BR') 
                                    : 'Data inválida';
                                  
                                  const isCancelada = (item as any).isCancelada === true;
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center justify-between p-3 rounded-md border ${
                                        isCancelada
                                          ? 'bg-red-50 border-red-300'
                                          : item.status === 'hoje'
                                          ? 'bg-blue-50 border-blue-200'
                                          : 'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-16 text-center">
                                          <div className="text-xs text-gray-500">Semana</div>
                                          <div className={`text-lg font-bold ${isCancelada ? 'text-red-600' : 'text-gray-900'}`}>{item.semana}</div>
                                        </div>
                                        <div className="flex-1">
                                          <div className={`text-sm ${isCancelada ? 'text-red-600' : 'text-gray-600'}`}>
                                            {dataFormatada} ({diaSemanaNome(dataItem)})
                                          </div>
                                        {!isCancelada ? (
                                          <div className="text-xs text-gray-500">
                                            Dose: {item.dose} mg
                                            {planoTerapeutico?.esquemaDosesCustomizado?.[item.semana] && (
                                              <span className="ml-2 text-blue-600 font-medium">(customizada)</span>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-red-600 font-medium">
                                            ⚠️ Semana cancelada/pulada
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      {isCancelada ? (
                                        <span className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                                          Cancelada
                                        </span>
                                      ) : item.status === 'hoje' ? (
                                        <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                                          Hoje
                                        </span>
                                      ) : (
                                        <span className="px-3 py-1 bg-gray-400 text-white text-xs font-medium rounded-full">
                                          Futura
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {calendario.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                              <Pill size={48} className="mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-600">Nenhuma aplicação registrada</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {pastaAtiva === 8 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comunicação e Registro</h3>
                    <button
                      onClick={() => loadMensagensPaciente()}
                      className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Atualizar
                    </button>
                  </div>

                  {/* Alerta de mensagens não lidas */}
                  {mensagensNaoLidasPacienteParaMedico > 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Você tem {mensagensNaoLidasPacienteParaMedico} mensagem(ns) não lida(s) do paciente.</strong> Role para baixo para visualizar e marcar como lida.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Formulário para enviar nova mensagem */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Enviar Mensagem ao Paciente</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                        <input
                          type="text"
                          value={novaMensagemPaciente.titulo}
                          onChange={(e) => setNovaMensagemPaciente({ ...novaMensagemPaciente, titulo: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          placeholder="Ex: Lembrete de consulta"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Mensagem</label>
                        <select
                          value={novaMensagemPaciente.tipo}
                          onChange={(e) => setNovaMensagemPaciente({ ...novaMensagemPaciente, tipo: e.target.value as any })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                          value={novaMensagemPaciente.mensagem}
                          onChange={(e) => setNovaMensagemPaciente({ ...novaMensagemPaciente, mensagem: e.target.value })}
                          rows={4}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          placeholder="Digite sua mensagem..."
                        />
                      </div>
                      
                      <button
                        onClick={handleEnviarMensagemPaciente}
                        disabled={loadingMensagensPaciente}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Send size={16} />
                        {loadingMensagensPaciente ? 'Enviando...' : 'Enviar Mensagem'}
                      </button>
                    </div>
                  </div>

                  {/* Histórico de mensagens */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">Histórico de Mensagens</h4>
                    
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                      <button
                        onClick={() => setAbaAtivaMensagensAdmin('recebidas')}
                        className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          abaAtivaMensagensAdmin === 'recebidas'
                            ? 'border-blue-500 text-blue-700 bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Recebidas
                        {mensagensNaoLidasPacienteParaMedico > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {mensagensNaoLidasPacienteParaMedico}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setAbaAtivaMensagensAdmin('enviadas')}
                        className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          abaAtivaMensagensAdmin === 'enviadas'
                            ? 'border-blue-500 text-blue-700 bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Enviadas
                      </button>
                    </div>

                    {/* Conteúdo das abas */}
                    {loadingMensagensPaciente && mensagensPaciente.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                        <RefreshCw className="mx-auto animate-spin text-gray-400 mb-2" />
                        <p className="text-gray-600">Carregando mensagens...</p>
                      </div>
                    ) : (() => {
                      // Filtrar mensagens por aba
                      const mensagensFiltradas = mensagensPaciente.filter(msg => {
                        if (abaAtivaMensagensAdmin === 'recebidas') {
                          // Recebidas: mensagens do paciente para o médico
                          return msg.direcao === 'paciente_para_medico';
                        } else {
                          // Enviadas: mensagens do médico para o paciente
                          return msg.direcao === 'medico_para_paciente' || !msg.direcao;
                        }
                      });

                      if (mensagensFiltradas.length === 0) {
                        return (
                          <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                            <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600">
                              {abaAtivaMensagensAdmin === 'recebidas' 
                                ? 'Nenhuma mensagem recebida ainda' 
                                : 'Nenhuma mensagem enviada ainda'}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {mensagensFiltradas.map((msg) => (
                          <div
                            key={msg.id}
                            className={`border rounded-lg p-3 ${
                              msg.direcao === 'paciente_para_medico' 
                                ? (msg.lida ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-100 border-yellow-300')
                                : (msg.lida ? 'bg-gray-50' : 'bg-blue-50')
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900">{msg.titulo}</span>
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-white border border-gray-300">
                                    {msg.tipo}
                                  </span>
                                  {msg.direcao === 'paciente_para_medico' && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-200 text-yellow-800 font-medium">
                                      Do Paciente
                                    </span>
                                  )}
                                  {msg.direcao === 'medico_para_paciente' && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-200 text-blue-800 font-medium">
                                      Do Médico
                                    </span>
                                  )}
                                  {!msg.lida && msg.direcao === 'paciente_para_medico' && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 font-medium">
                                      Não lida
                                    </span>
                                  )}
                                  {!msg.lida && msg.direcao === 'medico_para_paciente' && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                                      Não lida
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{msg.mensagem}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(msg.criadoEm).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {msg.direcao === 'paciente_para_medico' && !msg.lida && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await PacienteMensagemService.marcarComoLida(msg.id);
                                        await loadMensagensPaciente();
                                      } catch (error) {
                                        console.error('Erro ao marcar como lida:', error);
                                      }
                                    }}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Marcar como lida
                                  </button>
                                )}
                                {/* Botão de excluir só aparece para mensagens enviadas pelo médico */}
                                {msg.direcao === 'medico_para_paciente' && (
                                  <button
                                    onClick={() => handleDeletarMensagemPaciente(msg.id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Excluir mensagem"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {pastaAtiva === 9 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prescrições</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Criar prescrição temporária
                          const prescricaoTemporaria: Prescricao = {
                            id: 'temp-new',
                            medicoId: medicoPerfil?.id || '',
                            nome: 'Nova prescrição',
                            descricao: '',
                            itens: [],
                            observacoes: '',
                            criadoEm: new Date(),
                            atualizadoEm: new Date(),
                            criadoPor: user?.email || '',
                            isTemplate: false
                          };
                          
                          // Adicionar à lista de prescrições (no início)
                          setPrescricoes(prev => [prescricaoTemporaria, ...(prev || [])]);
                          
                          // Selecionar a prescrição temporária
                          setPrescricaoSelecionada(prescricaoTemporaria);
                          setPrescricaoEditando(null);
                          
                          // Zerar os campos
                          setNovaPrescricao({
                            nome: 'Nova prescrição',
                            descricao: '',
                            itens: [],
                            observacoes: ''
                          });
                        }}
                        className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Nova Prescrição
                      </button>
                      <button
                        onClick={loadPrescricoes}
                        className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                      >
                        <RefreshCw size={16} />
                        Atualizar
                      </button>
                    </div>
                  </div>

                  {/* Lista de Prescrições */}
                  {loadingPrescricoes ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Carregando prescrições...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Lista de Prescrições - Lado Esquerdo */}
                      <div className="lg:col-span-1 space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Prescrições Salvas</h4>
                        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                          {!prescricoes || prescricoes.length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                              <p className="text-sm text-gray-500">Nenhuma prescrição cadastrada ainda.</p>
                            </div>
                          ) : (
                            prescricoes.map((prescricao) => {
                              const isTemplate = prescricao.isTemplate;
                              const isTemporaria = prescricao.id === 'temp-new';
                              const isSelected = prescricaoSelecionada?.id === prescricao.id;
                              return (
                                <button
                                  key={prescricao.id}
                                  onClick={() => {
                                    // Se for temporária, apenas selecionar e carregar os dados
                                    if (isTemporaria) {
                                      setPrescricaoSelecionada(prescricao);
                                      setPrescricaoEditando(null);
                                      setNovaPrescricao({
                                        nome: prescricao.nome,
                                        descricao: prescricao.descricao || '',
                                        itens: prescricao.itens || [],
                                        observacoes: prescricao.observacoes || ''
                                      });
                                      return;
                                    }
                                    
                                    // Se for template, recalcular dosagens baseadas no peso do paciente
                                    let prescricaoParaEditar = prescricao;
                                    if (isTemplate && pacienteEditando) {
                                      const pesoAtual = pacienteEditando.dadosClinicos?.medidasIniciais?.peso || 
                                                       pacienteEditando.evolucaoSeguimento?.[pacienteEditando.evolucaoSeguimento.length - 1]?.peso;
                                      
                                      if (!pesoAtual) {
                                        setMessage('Peso do paciente não encontrado. Por favor, cadastre o peso nas Medidas Iniciais (Aba 2 - Dados Clínicos).');
                                        setTimeout(() => setMessage(''), 5000);
                                        return;
                                      }
                                      
                                      const itensRecalculados = prescricao.itens.map(item => {
                                        if (item.medicamento === 'Whey Protein') {
                                          const wheyDosagemTotal = (pesoAtual * 1.6).toFixed(1);
                                          const wheyPorRefeicao = (pesoAtual * 1.6 / 3).toFixed(1);
                                          return {
                                            ...item,
                                            dosagem: `${wheyDosagemTotal}g por dia (1,6g por kg de peso corporal)`,
                                            instrucoes: `Tomar aproximadamente ${wheyPorRefeicao}g de whey protein 3 vezes ao dia (totalizando ${wheyDosagemTotal}g/dia). Preferencialmente após as refeições principais ou após exercícios físicos. A dosagem de 1,6g/kg/dia é recomendada para preservação de massa muscular durante processo de perda de peso.`,
                                            quantidade: `${wheyDosagemTotal}g/dia`
                                          };
                                        }
                                        // Garantir que creatina seja 3,5g
                                        if (item.medicamento === 'Creatina MAX' || item.medicamento.includes('Creatina')) {
                                          return {
                                            ...item,
                                            dosagem: '3,5g por dia',
                                            instrucoes: 'Tomar 3,5g por dia, diluído em 200ml de água. Preferencialmente após o treino ou junto com uma refeição. A creatina auxilia na preservação de força e massa muscular durante o processo de perda de peso.',
                                            quantidade: '3,5g/dia'
                                          };
                                        }
                                        return item;
                                      });
                                      
                                      prescricaoParaEditar = {
                                        ...prescricao,
                                        itens: itensRecalculados,
                                        pesoPaciente: pesoAtual
                                      };
                                    }
                                    setPrescricaoSelecionada(prescricaoParaEditar);
                                    setPrescricaoEditando(prescricaoParaEditar);
                                    setNovaPrescricao({
                                      nome: prescricaoParaEditar.nome,
                                      descricao: prescricaoParaEditar.descricao || '',
                                      itens: prescricaoParaEditar.itens,
                                      observacoes: prescricaoParaEditar.observacoes || ''
                                    });
                                  }}
                                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                    isSelected
                                      ? 'border-green-500 bg-green-50'
                                      : isTemporaria
                                      ? 'border-yellow-200 bg-yellow-50/50 hover:border-yellow-300'
                                      : isTemplate
                                      ? 'border-blue-200 bg-blue-50/50 hover:border-blue-300'
                                      : 'border-gray-200 bg-white hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-green-900' : 'text-gray-900'}`}>
                                        {prescricao.nome}
                                      </p>
                                      {isTemporaria && (
                                        <p className="text-xs text-yellow-600 mt-1">✏️ Em edição</p>
                                      )}
                                      {isTemplate && !isTemporaria && (
                                        <p className="text-xs text-blue-600 mt-1">📋 Padrão</p>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Editor de Prescrição - Centro */}
                      <div className="lg:col-span-2">
                        {prescricaoSelecionada ? (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            {prescricaoSelecionada.id === 'temp-new' && (
                              <div className="mb-4 px-3 py-2 bg-yellow-100 border border-yellow-200 rounded-md">
                                <p className="text-xs font-medium text-yellow-800">
                                  ✏️ Prescrição temporária - Preencha os dados e salve para criar a prescrição
                                </p>
                              </div>
                            )}
                            {prescricaoSelecionada.isTemplate && prescricaoSelecionada.id !== 'temp-new' && (
                              <div className="mb-4 px-3 py-2 bg-blue-100 border border-blue-200 rounded-md">
                                <p className="text-xs font-medium text-blue-800">
                                  📋 Prescrição Padrão (Disponível para todos os médicos)
                                </p>
                              </div>
                            )}
                            
                            {/* Nome da Prescrição */}
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nome da Prescrição *
                              </label>
                              <input
                                type="text"
                                value={novaPrescricao.nome}
                                onChange={(e) => setNovaPrescricao({ ...novaPrescricao, nome: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                placeholder="Ex: Prescrição Suplementar"
                              />
                            </div>

                            {/* Descrição */}
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descrição
                              </label>
                              <textarea
                                value={novaPrescricao.descricao}
                                onChange={(e) => setNovaPrescricao({ ...novaPrescricao, descricao: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                rows={2}
                                placeholder="Descrição da prescrição..."
                              />
                            </div>

                            {/* Itens da Prescrição */}
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Itens da Prescrição *
                                </label>
                                <button
                                  onClick={() => {
                                    setNovaPrescricao({
                                      ...novaPrescricao,
                                      itens: [...novaPrescricao.itens, {
                                        medicamento: '',
                                        dosagem: '',
                                        frequencia: '',
                                        instrucoes: ''
                                      }]
                                    });
                                  }}
                                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                                >
                                  <Plus size={14} />
                                  Adicionar Item
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                {(novaPrescricao.itens || []).map((item, index) => (
                                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex justify-between items-center mb-3">
                                      <h5 className="font-medium text-gray-900">Item {index + 1}</h5>
                                      <button
                                        onClick={() => {
                                          const novosItens = (novaPrescricao.itens || []).filter((_, i) => i !== index);
                                          setNovaPrescricao({ ...novaPrescricao, itens: novosItens });
                                        }}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Medicamento/Suplemento *
                                        </label>
                                        <input
                                          type="text"
                                          value={item.medicamento}
                                          onChange={(e) => {
                                            const novosItens = [...(novaPrescricao.itens || [])];
                                            novosItens[index].medicamento = e.target.value;
                                            setNovaPrescricao({ ...novaPrescricao, itens: novosItens });
                                          }}
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                          placeholder="Ex: Whey Protein"
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Dosagem *
                                        </label>
                                        <input
                                          type="text"
                                          value={item.dosagem}
                                          onChange={(e) => {
                                            const novosItens = [...(novaPrescricao.itens || [])];
                                            novosItens[index].dosagem = e.target.value;
                                            setNovaPrescricao({ ...novaPrescricao, itens: novosItens });
                                          }}
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                          placeholder="Ex: 1,6g por kg"
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Frequência *
                                        </label>
                                        <input
                                          type="text"
                                          value={item.frequencia}
                                          onChange={(e) => {
                                            const novosItens = [...(novaPrescricao.itens || [])];
                                            novosItens[index].frequencia = e.target.value;
                                            setNovaPrescricao({ ...novaPrescricao, itens: novosItens });
                                          }}
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                          placeholder="Ex: 3x ao dia"
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Quantidade (opcional)
                                        </label>
                                        <input
                                          type="text"
                                          value={item.quantidade || ''}
                                          onChange={(e) => {
                                            const novosItens = [...(novaPrescricao.itens || [])];
                                            novosItens[index].quantidade = e.target.value;
                                            setNovaPrescricao({ ...novaPrescricao, itens: novosItens });
                                          }}
                                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                          placeholder="Ex: 100g/dia"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="mt-3">
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Instruções Detalhadas *
                                      </label>
                                      <textarea
                                        value={item.instrucoes}
                                        onChange={(e) => {
                                          const novosItens = [...(novaPrescricao.itens || [])];
                                          novosItens[index].instrucoes = e.target.value;
                                          setNovaPrescricao({ ...novaPrescricao, itens: novosItens });
                                        }}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                        rows={2}
                                        placeholder="Instruções detalhadas de uso..."
                                      />
                                    </div>
                                  </div>
                                ))}
                                
                                {(!novaPrescricao.itens || novaPrescricao.itens.length === 0) && (
                                  <div className="text-center py-4 text-gray-500 text-sm">
                                    Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Observações */}
                            <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Observações
                              </label>
                              <textarea
                                value={novaPrescricao.observacoes}
                                onChange={(e) => setNovaPrescricao({ ...novaPrescricao, observacoes: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                                rows={3}
                                placeholder="Observações adicionais..."
                              />
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!medicoPerfil || !pacienteEditando) return;
                                    
                                    if (!novaPrescricao.nome.trim()) {
                                      setMessage('Nome da prescrição é obrigatório');
                                      setTimeout(() => setMessage(''), 3000);
                                      return;
                                    }
                                    
                                    if (!novaPrescricao.itens || novaPrescricao.itens.length === 0) {
                                      setMessage('Adicione pelo menos um item à prescrição');
                                      setTimeout(() => setMessage(''), 3000);
                                      return;
                                    }
                                    
                                    // Validar itens
                                    for (const item of (novaPrescricao.itens || [])) {
                                      if (!item.medicamento.trim() || !item.dosagem.trim() || !item.frequencia.trim() || !item.instrucoes.trim()) {
                                        setMessage('Preencha todos os campos obrigatórios dos itens');
                                        setTimeout(() => setMessage(''), 3000);
                                        return;
                                      }
                                    }
                                    
                                    try {
                                      const pesoAtual = pacienteEditando.dadosClinicos?.medidasIniciais?.peso || 
                                                       pacienteEditando.evolucaoSeguimento?.[pacienteEditando.evolucaoSeguimento.length - 1]?.peso;
                                      
                                      // Verificar se é uma prescrição temporária
                                      const isTemporaria = prescricaoSelecionada?.id === 'temp-new';
                                      
                                      const prescricaoData: Omit<Prescricao, 'id'> | Prescricao = prescricaoEditando && !prescricaoEditando.isTemplate && !isTemporaria ? {
                                        ...prescricaoEditando,
                                        nome: novaPrescricao.nome,
                                        descricao: novaPrescricao.descricao,
                                        itens: novaPrescricao.itens,
                                        observacoes: novaPrescricao.observacoes,
                                        atualizadoEm: new Date()
                                      } : {
                                        medicoId: medicoPerfil.id,
                                        pacienteId: undefined, // undefined = aparece para todos os pacientes deste médico
                                        nome: novaPrescricao.nome,
                                        descricao: novaPrescricao.descricao,
                                        itens: novaPrescricao.itens,
                                        observacoes: novaPrescricao.observacoes,
                                        criadoEm: new Date(),
                                        atualizadoEm: new Date(),
                                        criadoPor: user?.email || '',
                                        isTemplate: false,
                                        pesoPaciente: pesoAtual
                                      };
                                      
                                      const prescricaoId = await PrescricaoService.createOrUpdatePrescricao(prescricaoData);
                                      
                                      // Se era uma prescrição temporária, remover da lista
                                      if (prescricaoSelecionada?.id === 'temp-new') {
                                        setPrescricoes(prev => (prev || []).filter(p => p.id !== 'temp-new'));
                                      }
                                      
                                      // Recarregar prescrições para obter a nova prescrição salva
                                      await loadPrescricoes();
                                      
                                      // Selecionar a prescrição recém-salva
                                      if (prescricaoId) {
                                        const [templates, prescricoesMedico] = await Promise.all([
                                          PrescricaoService.getPrescricoesTemplate(),
                                          PrescricaoService.getPrescricoesByMedico(medicoPerfil.id)
                                        ]);
                                        const todasPrescricoes = [
                                          ...templates,
                                          ...prescricoesMedico.filter(p => !p.pacienteId)
                                        ];
                                        const prescricaoSalva = todasPrescricoes.find(p => p.id === prescricaoId);
                                        if (prescricaoSalva) {
                                          setPrescricaoSelecionada(prescricaoSalva);
                                          setPrescricaoEditando(prescricaoSalva);
                                          setNovaPrescricao({
                                            nome: prescricaoSalva.nome,
                                            descricao: prescricaoSalva.descricao || '',
                                            itens: prescricaoSalva.itens || [],
                                            observacoes: prescricaoSalva.observacoes || ''
                                          });
                                        }
                                      }
                                      
                                      setMessage(prescricaoEditando && !prescricaoEditando.isTemplate && !isTemporaria ? 'Prescrição atualizada com sucesso!' : 'Prescrição criada com sucesso!');
                                      setTimeout(() => setMessage(''), 3000);
                                      
                                      // Atualizar prescrição selecionada se for edição (não temporária)
                                      if (prescricaoEditando && !prescricaoEditando.isTemplate && !isTemporaria) {
                                        const prescricaoAtualizada = {
                                          ...prescricaoEditando,
                                          nome: novaPrescricao.nome,
                                          descricao: novaPrescricao.descricao,
                                          itens: novaPrescricao.itens,
                                          observacoes: novaPrescricao.observacoes
                                        };
                                        setPrescricaoSelecionada(prescricaoAtualizada);
                                      }
                                    } catch (error) {
                                      console.error('Erro ao salvar prescrição:', error);
                                      setMessage('Erro ao salvar prescrição');
                                      setTimeout(() => setMessage(''), 3000);
                                    }
                                  }}
                                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2"
                                >
                                  <Save size={16} />
                                  {prescricaoEditando && !prescricaoEditando.isTemplate ? 'Salvar Alterações' : 'Salvar Prescrição'}
                                </button>
                                
                                {prescricaoEditando && !prescricaoEditando.isTemplate && (
                                  <button
                                    onClick={async () => {
                                      if (confirm('Tem certeza que deseja excluir esta prescrição?')) {
                                        try {
                                          await PrescricaoService.deletePrescricao(prescricaoEditando.id);
                                          await loadPrescricoes();
                                          setPrescricaoSelecionada(null);
                                          setPrescricaoEditando(null);
                                          setNovaPrescricao({
                                            nome: '',
                                            descricao: '',
                                            itens: [],
                                            observacoes: ''
                                          });
                                          setMessage('Prescrição excluída com sucesso!');
                                          setTimeout(() => setMessage(''), 3000);
                                        } catch (error) {
                                          console.error('Erro ao excluir prescrição:', error);
                                          setMessage('Erro ao excluir prescrição');
                                          setTimeout(() => setMessage(''), 3000);
                                        }
                                      }
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2"
                                  >
                                    <Trash2 size={16} />
                                    Excluir
                                  </button>
                                )}
                              </div>
                              
                              <button
                                onClick={async () => {
                                  if (!medicoPerfil || !pacienteEditando || !prescricaoSelecionada) return;
                                  
                                  // Obter peso real do paciente
                                  const pesoRealPaciente = pacienteEditando.dadosClinicos?.medidasIniciais?.peso || 
                                                          pacienteEditando.evolucaoSeguimento?.[pacienteEditando.evolucaoSeguimento.length - 1]?.peso;
                                  
                                  if (!pesoRealPaciente) {
                                    setMessage('Peso do paciente não encontrado. Por favor, cadastre o peso nas Medidas Iniciais (Aba 2 - Dados Clínicos).');
                                    setTimeout(() => setMessage(''), 5000);
                                    return;
                                  }
                                  
                                  // Se for template, recalcular dosagens com peso real
                                  let itensParaImprimir = novaPrescricao.itens || [];
                                  if (prescricaoSelecionada.isTemplate) {
                                    itensParaImprimir = itensParaImprimir.map(item => {
                                      if (item.medicamento === 'Whey Protein') {
                                        const wheyDosagemTotal = (pesoRealPaciente * 1.6).toFixed(1);
                                        const wheyPorRefeicao = (pesoRealPaciente * 1.6 / 3).toFixed(1);
                                        return {
                                          ...item,
                                          dosagem: `${wheyDosagemTotal}g por dia (1,6g por kg de peso corporal)`,
                                          instrucoes: `Tomar aproximadamente ${wheyPorRefeicao}g de whey protein 3 vezes ao dia (totalizando ${wheyDosagemTotal}g/dia). Preferencialmente após as refeições principais ou após exercícios físicos. A dosagem de 1,6g/kg/dia é recomendada para preservação de massa muscular durante processo de perda de peso.`,
                                          quantidade: `${wheyDosagemTotal}g/dia`
                                        };
                                      }
                                      // Garantir que creatina seja 3,5g
                                      if (item.medicamento === 'Creatina MAX' || item.medicamento.includes('Creatina')) {
                                        return {
                                          ...item,
                                          dosagem: '3,5g por dia',
                                          instrucoes: 'Tomar 3,5g por dia, diluído em 200ml de água. Preferencialmente após o treino ou junto com uma refeição. A creatina auxilia na preservação de força e massa muscular durante o processo de perda de peso.',
                                          quantidade: '3,5g/dia'
                                        };
                                      }
                                      return item;
                                    });
                                  }
                                  
                                  // Usar a prescrição atual editada para imprimir
                                  const prescricaoParaImprimir = {
                                    ...prescricaoSelecionada,
                                    nome: novaPrescricao.nome,
                                    descricao: novaPrescricao.descricao,
                                    itens: itensParaImprimir,
                                    observacoes: novaPrescricao.observacoes,
                                    pesoPaciente: pesoRealPaciente
                                  };
                                  
                                  // Gerar PDF da prescrição
                                  const doc = new jsPDF();
                                  
                                  // Cores
                                  const darkColor = [44, 62, 80];
                                  
                                  // Determinar título do médico
                                  const tituloMedico = medicoPerfil.genero === 'F' ? 'Dra.' : 'Dr.';
                                  const medicoNome = medicoPerfil.nome || 'Médico';
                                  const medicoNomeCompleto = `${tituloMedico} ${medicoNome}`;
                                  
                                  // Header fixo e isolado com nome do médico e CRM
                                  doc.setTextColor(...darkColor);
                                  doc.setFontSize(18);
                                  doc.setFont('helvetica', 'bold');
                                  doc.text(medicoNomeCompleto, 20, 15);
                                  
                                  // Informações do médico (CRM)
                                  doc.setFontSize(9);
                                  doc.setFont('helvetica', 'normal');
                                  const crmText = `CRM-${medicoPerfil.crm?.estado || 'XX'} ${medicoPerfil.crm?.numero || '00000'}`;
                                  doc.text(crmText, 20, 22);
                                  
                                  // Logo Oftware
                                  try {
                                    const logoImg = new Image();
                                    logoImg.crossOrigin = 'anonymous';
                                    await new Promise<void>((resolve) => {
                                      logoImg.onload = () => {
                                        try {
                                          const logoWidth = 25;
                                          const logoHeight = 25;
                                          const logoX = 190 - logoWidth - 10;
                                          const logoY = 8;
                                          doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
                                        } catch (e) {
                                          doc.setFontSize(11);
                                          doc.setFont('helvetica', 'bold');
                                          doc.text('Oftware', 180, 15, { align: 'right' });
                                        }
                                        resolve();
                                      };
                                      logoImg.onerror = () => {
                                        doc.setFontSize(11);
                                        doc.setFont('helvetica', 'bold');
                                        doc.text('Oftware', 180, 15, { align: 'right' });
                                        resolve();
                                      };
                                      logoImg.src = '/icones/oftware.png';
                                    });
                                  } catch (e) {
                                    doc.setFontSize(11);
                                    doc.setFont('helvetica', 'bold');
                                    doc.text('Oftware', 180, 15, { align: 'right' });
                                  }
                                  
                                  // Linha separadora
                                  doc.setDrawColor(200, 200, 200);
                                  doc.line(20, 28, 190, 28);
                                  
                                  // Título da prescrição
                                  let yPos = 40;
                                  doc.setFontSize(16);
                                  doc.setFont('helvetica', 'bold');
                                  doc.text('PRESCRIÇÃO MÉDICA', 20, yPos);
                                  
                                  yPos += 10;
                                  
                                  // Informações do paciente
                                  doc.setFontSize(10);
                                  doc.setFont('helvetica', 'normal');
                                  const pacienteNome = pacienteEditando.dadosIdentificacao?.nomeCompleto || pacienteEditando.nome || 'Paciente';
                                  doc.text(`Paciente: ${pacienteNome}`, 20, yPos);
                                  yPos += 6;
                                  if (pacienteEditando.dadosIdentificacao?.cpf) {
                                    doc.text(`CPF: ${pacienteEditando.dadosIdentificacao.cpf}`, 20, yPos);
                                    yPos += 6;
                                  }
                                  if (prescricaoParaImprimir.pesoPaciente) {
                                    doc.text(`Peso: ${prescricaoParaImprimir.pesoPaciente.toFixed(1)} kg`, 20, yPos);
                                    yPos += 6;
                                  }
                                  
                                  yPos += 5;
                                  
                                  // Nome da prescrição
                                  doc.setFontSize(12);
                                  doc.setFont('helvetica', 'bold');
                                  doc.text(prescricaoParaImprimir.nome, 20, yPos);
                                  yPos += 8;
                                  
                                  // Descrição
                                  if (prescricaoParaImprimir.descricao) {
                                    doc.setFontSize(10);
                                    doc.setFont('helvetica', 'normal');
                                    const descLines = doc.splitTextToSize(prescricaoParaImprimir.descricao, 170);
                                    doc.text(descLines, 20, yPos);
                                    yPos += descLines.length * 5 + 5;
                                  }
                                  
                                  // Itens da prescrição
                                  doc.setFontSize(11);
                                  doc.setFont('helvetica', 'bold');
                                  doc.text('MEDICAMENTOS/SUPLEMENTOS:', 20, yPos);
                                  yPos += 8;
                                  
                                  prescricaoParaImprimir.itens.forEach((item, index) => {
                                    if (yPos > 270) {
                                      doc.addPage();
                                      yPos = 20;
                                    }
                                    
                                    doc.setFontSize(10);
                                    doc.setFont('helvetica', 'bold');
                                    doc.text(`${index + 1}. ${item.medicamento}`, 25, yPos);
                                    yPos += 6;
                                    
                                    doc.setFont('helvetica', 'normal');
                                    doc.text(`   Dosagem: ${item.dosagem}`, 25, yPos);
                                    yPos += 5;
                                    doc.text(`   Frequência: ${item.frequencia}`, 25, yPos);
                                    yPos += 5;
                                    
                                    const instrucoesLines = doc.splitTextToSize(`   ${item.instrucoes}`, 165);
                                    doc.text(instrucoesLines, 25, yPos);
                                    yPos += instrucoesLines.length * 5 + 3;
                                    
                                    if (item.quantidade) {
                                      doc.text(`   Quantidade: ${item.quantidade}`, 25, yPos);
                                      yPos += 5;
                                    }
                                    
                                    yPos += 3;
                                  });
                                  
                                  // Observações
                                  if (prescricaoParaImprimir.observacoes) {
                                    if (yPos > 250) {
                                      doc.addPage();
                                      yPos = 20;
                                    }
                                    yPos += 5;
                                    doc.setFontSize(10);
                                    doc.setFont('helvetica', 'bold');
                                    doc.text('OBSERVAÇÕES:', 20, yPos);
                                    yPos += 6;
                                    doc.setFont('helvetica', 'normal');
                                    const obsLines = doc.splitTextToSize(prescricaoParaImprimir.observacoes, 170);
                                    doc.text(obsLines, 20, yPos);
                                    yPos += obsLines.length * 5;
                                  }
                                  
                                  // Data e assinatura
                                  if (yPos > 250) {
                                    doc.addPage();
                                    yPos = 20;
                                  }
                                  yPos += 10;
                                  doc.setFontSize(9);
                                  doc.setFont('helvetica', 'normal');
                                  const dataAtual = new Date().toLocaleDateString('pt-BR');
                                  doc.text(`Data: ${dataAtual}`, 20, yPos);
                                  yPos += 15;
                                  
                                  // Linha para assinatura
                                  doc.line(20, yPos, 100, yPos);
                                  doc.setFontSize(8);
                                  doc.text('Assinatura do Médico', 20, yPos + 5);
                                  
                                  // Salvar PDF
                                  doc.save(`Prescricao_${pacienteNome.replace(/\s/g, '_')}_${dataAtual.replace(/\//g, '_')}.pdf`);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2"
                              >
                                <Printer size={16} />
                                Imprimir
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg mb-2">Nenhuma prescrição selecionada</p>
                            <p className="text-sm text-gray-500">Clique em uma prescrição na lista ao lado para editá-la ou crie uma nova</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer com botões */}
            <div className={`flex ${isAbandono ? 'justify-center' : 'justify-end'} space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0`}>
              {isAbandono ? (
                // Para pacientes em abandono, apenas botão Fechar
                <button
                  onClick={() => {
                    setShowEditarPacienteModal(false);
                    setPacienteEditando(null);
                    setPacienteEditandoOriginal(null);
                    setPastaAtiva(1);
                  }}
                  className="close-button px-6 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              ) : (
                // Para pacientes normais, botões Cancelar e Salvar
                <>
                  <button
                    onClick={async () => {
                      await verificarAlteracoesESair(
                        () => {
                          // Sair sem salvar
                          setShowEditarPacienteModal(false);
                          setPacienteEditando(null);
                          setPacienteEditandoOriginal(null);
                          setPastaAtiva(1);
                        },
                        async () => {
                          // Salvar
                          setLoadingPacientes(true);
                          try {
                            await PacienteService.createOrUpdatePaciente(pacienteEditando!);
                            await loadPacientes();
                            setMessage('Paciente atualizado com sucesso!');
                          } catch (error) {
                            console.error('Erro ao atualizar paciente:', error);
                            setMessage('Erro ao atualizar paciente');
                            throw error; // Re-throw para impedir fechamento se houver erro
                          } finally {
                            setLoadingPacientes(false);
                          }
                        }
                      );
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!pacienteEditando) return;
                      setLoadingPacientes(true);
                      try {
                        const pacienteId = await PacienteService.createOrUpdatePaciente(pacienteEditando);
                        await loadPacientes();
                        // Não fechar o modal, apenas mostrar mensagem
                        setPacienteEditandoOriginal(JSON.parse(JSON.stringify(pacienteEditando))); // Atualizar original após salvar
                        
                        // Verificar se o plano de tratamento foi editado e enviar e-mail
                        if (pacienteEditando.planoTerapeutico && (pacienteEditando.planoTerapeutico.startDate || pacienteEditando.planoTerapeutico.numeroSemanasTratamento)) {
                          try {
                            await fetch('/api/send-email-plano-editado', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ pacienteId: pacienteId || pacienteEditando.id }),
                            });
                          } catch (emailError) {
                            console.error('Erro ao enviar e-mail de plano editado:', emailError);
                            // Não bloquear o fluxo se o e-mail falhar
                          }
                        }
                        
                        setMessage('Paciente atualizado com sucesso!');
                        // Mostrar modal de sucesso
                        setModalMessage('Alterações salvas com sucesso!');
                        setModalType('success');
                        setShowMessageModal(true);
                      } catch (error) {
                        console.error('Erro ao atualizar paciente:', error);
                        setMessage('Erro ao atualizar paciente');
                        // Mostrar modal de erro
                        setModalMessage('Erro ao salvar alterações');
                        setModalType('error');
                        setShowMessageModal(true);
                      } finally {
                        setLoadingPacientes(false);
                      }
                    }}
                    disabled={loadingPacientes}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingPacientes ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal de Adicionar / Editar Exame Laboratorial */}
      {showAdicionarExameModal && pacienteEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {indiceExameEditando !== null ? 'Editar Exame Laboratorial' : 'Adicionar Novo Exame Laboratorial'}
              </h2>
              <button
                onClick={() => {
                  setShowAdicionarExameModal(false);
                  setIndiceExameEditando(null);
                  setDataSelecionadaModal('');
                  setNovoExameData({ dataColeta: new Date().toISOString().split('T')[0] });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Seletor de Data de Coleta */}
              {indiceExameEditando !== null ? (
                // Modo edição: mostrar select com lista de datas
                (() => {
                const exames = pacienteEditando?.examesLaboratoriais || [];
                
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
                
                // Inicializar data selecionada no modal se não estiver definida
                const dataInicialModal = dataSelecionadaModal || (examesOrdenados.length > 0 
                  ? safeDateToString(examesOrdenados[0].dataColeta)
                  : '');
                
                const dataAtualModal = dataSelecionadaModal || dataInicialModal;
                
                // Encontrar exame da data selecionada no modal
                const exameAtualModal = examesOrdenados.find(e => {
                  const dataExame = safeDateToString(e.dataColeta);
                  return dataExame === dataAtualModal;
                }) || examesOrdenados[0] || null;
                
                // Quando a data mudar no select, atualizar os dados do modal
                const handleDataChangeModal = (novaData: string) => {
                  setDataSelecionadaModal(novaData);
                  
                  // Encontrar o exame da nova data
                  const exameNovaData = examesOrdenados.find(e => {
                    const dataExame = safeDateToString(e.dataColeta);
                    return dataExame === novaData;
                  });
                  
                  if (exameNovaData) {
                    // Encontrar o índice no array original
                    const examesPaciente = pacienteEditando?.examesLaboratoriais || [];
                    const indexExame = examesPaciente.findIndex(e => {
                      const dataExame = safeDateToString(e.dataColeta);
                      return dataExame === novaData && e === exameNovaData;
                    });
                    
                    if (indexExame === -1) {
                      const indexExame2 = examesPaciente.findIndex(e => {
                        const dataExame = safeDateToString(e.dataColeta);
                        return dataExame === novaData;
                      });
                      setIndiceExameEditando(indexExame2 >= 0 ? indexExame2 : null);
                    } else {
                      setIndiceExameEditando(indexExame);
                    }
                    
                    // Atualizar os dados do modal com os dados do exame selecionado
                    setNovoExameData({
                      dataColeta: novaData,
                      ...Object.fromEntries(
                        Object.entries(exameNovaData)
                          .filter(([key, value]) =>
                            key !== 'dataColeta' &&
                            key !== 'id' &&
                            value !== undefined &&
                            value !== null &&
                            value !== ''
                          )
                      )
                    });
                  }
                };
                
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecionar Exame por Data *
                    </label>
                    <select
                      value={dataAtualModal}
                      onChange={(e) => handleDataChangeModal(e.target.value)}
                      disabled={examesOrdenados.length === 0}
                      className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 ${
                        examesOrdenados.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    >
                      {examesOrdenados.map((exame, idx) => {
                        const dataExame = safeDateToString(exame.dataColeta);
                        // Formatar para exibição
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
                      {examesOrdenados.length === 0 && (
                        <option value="">Nenhum exame cadastrado</option>
                      )}
                    </select>
                  </div>
                );
                })()
              ) : (
                // Modo adição: mostrar input de data normal
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data de Coleta *</label>
                <input
                  type="date"
                  value={novoExameData.dataColeta}
                  onChange={(e) => setNovoExameData({ ...novoExameData, dataColeta: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>
              )}

              {/* Todos os campos de exame */}
              {(() => {
                const pacienteSex = pacienteEditando?.dadosIdentificacao?.sexoBiologico as Sex;
                const camposExame = [
                  // Metabolismo Glicídico
                  { key: 'fastingGlucose', label: 'Glicemia de Jejum', field: 'glicemiaJejum', unit: 'mg/dL' },
                  { key: 'hba1c', label: 'Hemoglobina Glicada (HbA1c)', field: 'hemoglobinaGlicada', unit: '%' },
                  // Função Renal
                  { key: 'urea', label: 'Uréia', field: 'ureia', unit: 'mg/dL' },
                  { key: 'creatinine', label: 'Creatinina', field: 'creatinina', unit: 'mg/dL' },
                  { key: 'egfr', label: 'Taxa de Filtração Glomerular (eGFR)', field: 'taxaFiltracaoGlomerular', unit: 'mL/min/1,73m²' },
                  // Função Hepática
                  { key: 'alt', label: 'TGP (ALT)', field: 'tgp', unit: 'U/L' },
                  { key: 'ast', label: 'TGO (AST)', field: 'tgo', unit: 'U/L' },
                  { key: 'ggt', label: 'GGT', field: 'ggt', unit: 'U/L' },
                  { key: 'alp', label: 'Fosfatase Alcalina', field: 'fosfataseAlcalina', unit: 'U/L' },
                  // Pâncreas
                  { key: 'amylase', label: 'Amilase', field: 'amilase', unit: 'U/L' },
                  { key: 'lipase', label: 'Lipase', field: 'lipase', unit: 'U/L' },
                  // Perfil Lipídico
                  { key: 'cholTotal', label: 'Colesterol Total', field: 'colesterolTotal', unit: 'mg/dL' },
                  { key: 'ldl', label: 'LDL', field: 'ldl', unit: 'mg/dL' },
                  { key: 'hdl', label: 'HDL', field: 'hdl', unit: 'mg/dL' },
                  { key: 'tg', label: 'Triglicerídeos', field: 'triglicerides', unit: 'mg/dL' },
                  // Tireoide
                  { key: 'tsh', label: 'TSH', field: 'tsh', unit: 'mUI/L' },
                  { key: 'calcitonin', label: 'Calcitonina', field: 'calcitonina', unit: 'pg/mL' },
                  { key: 'ft4', label: 'T4 Livre (FT4)', field: 't4Livre', unit: 'ng/dL' },
                  // Ferro e Vitaminas
                  { key: 'ferritin', label: 'Ferritina', field: 'ferritina', unit: 'ng/mL' },
                  { key: 'iron', label: 'Ferro sérico', field: 'ferroSerico', unit: 'µg/dL' },
                  { key: 'b12', label: 'Vitamina B12', field: 'vitaminaB12', unit: 'pg/mL' },
                  { key: 'vitaminD', label: 'Vitamina D (25-OH)', field: 'vitaminaD', unit: 'ng/mL' }
                ];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {camposExame.map((campo) => {
                      const range = getLabRange(campo.key as any, pacienteSex);
                      // Para campos que dependem de sexo mas não está definido, usar range padrão ou ambos
                      let rangeToUse = range;
                      
                      // Se não tiver range, tentar criar um range padrão para campos específicos
                      if (!rangeToUse) {
                        if (campo.key === 'ferritin' || campo.key === 'iron') {
                          const labRangeEntry = (labRanges as any)[campo.key];
                          if (labRangeEntry && labRangeEntry.M && labRangeEntry.F) {
                            // Usar range combinado (valores de ambos os sexos)
                            const minValue = Math.min(labRangeEntry.M.min, labRangeEntry.F.min);
                            const maxValue = Math.max(labRangeEntry.M.max, labRangeEntry.F.max);
                            rangeToUse = {
                              label: campo.key === 'ferritin' ? 'Ferritina' : 'Ferro sérico',
                              unit: labRangeEntry.M.unit || campo.unit || '',
                              min: minValue,
                              max: maxValue
                            };
                          }
                        }
                      }
                      
                      // Se ainda não tiver range válido, não renderizar o campo
                      if (!rangeToUse || !rangeToUse.label || rangeToUse.min === undefined || rangeToUse.max === undefined) {
                        return null;
                      }
                      
                      // Verificar se precisa de sexo para este campo específico
                      const precisaSexo = (campo.key === 'ferritin' || campo.key === 'iron') && !pacienteSex;
                      const temValor = novoExameData[campo.field] !== undefined && novoExameData[campo.field] !== null && novoExameData[campo.field] !== '';
                      
                      return (
                        <div key={campo.field}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {rangeToUse?.label || campo.label}
                            {precisaSexo && (
                              <span className="ml-2 text-xs text-amber-600 font-normal">
                                (⚠️ Defina o sexo do paciente para valores de referência precisos)
                              </span>
                            )}
                          </label>
                          <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={novoExameData[campo.field] || ''}
                            onChange={(e) => {
                              const numValue = parseFloat(e.target.value) || 0;
                              setNovoExameData({
                                ...novoExameData,
                                [campo.field]: numValue > 0 ? numValue : undefined
                              });
                            }}
                              className={`flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 ${
                                precisaSexo ? 'border-amber-300 bg-amber-50' : ''
                              }`}
                            placeholder={rangeToUse ? `${rangeToUse.min}-${rangeToUse.max} ${rangeToUse.unit}` : 'Digite o valor'}
                          />
                            {temValor && (
                              <button
                                type="button"
                                onClick={() => {
                                  const novoData = { ...novoExameData };
                                  delete novoData[campo.field];
                                  setNovoExameData(novoData);
                                  
                                  // Se estiver editando, atualizar imediatamente no estado do paciente e salvar no Firebase
                                  if (indiceExameEditando !== null && pacienteEditando) {
                                    const examesExistentes = pacienteEditando.examesLaboratoriais || [];
                                    const examesAtualizados = [...examesExistentes];
                                    
                                    if (indiceExameEditando >= 0 && indiceExameEditando < examesAtualizados.length) {
                                      const exameAtualizado = {
                                        ...examesAtualizados[indiceExameEditando],
                                        [campo.field]: undefined
                                      };
                                      delete exameAtualizado[campo.field];
                                      
                                      examesAtualizados[indiceExameEditando] = exameAtualizado;
                                      
                                      const pacienteAtualizado = {
                                        ...pacienteEditando,
                                        examesLaboratoriais: examesAtualizados
                                      };
                                      
                                      setPacienteEditando(pacienteAtualizado);
                                      
                                      // Salvar no Firebase
                                      if (pacienteAtualizado.id) {
                                        PacienteService.createOrUpdatePaciente(pacienteAtualizado).catch(error => {
                                          console.error('Erro ao salvar alteração no Firebase:', error);
                                          setMessage('Erro ao salvar alteração. Tente novamente.');
                                        });
                                      }
                                    }
                                  }
                                }}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                title={`Remover ${rangeToUse?.label || campo.label}`}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                          {novoExameData[campo.field] && rangeToUse && (
                            <LabRangeBar range={rangeToUse} value={novoExameData[campo.field]} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
              {/* Botão Deletar Exame (só aparece em modo edição) */}
              {indiceExameEditando !== null && (
              <button
                onClick={() => {
                    if (!pacienteEditando || !dataSelecionadaModal) return;
                    
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
                    const examesExistentes = pacienteEditando.examesLaboratoriais || [];
                    const examesAtualizados = examesExistentes.filter(exame => {
                      const dataExame = safeDateToString(exame.dataColeta);
                      return dataExame !== dataSelecionadaModal;
                    });
                    
                    // Ajustar data selecionada
                    if (examesAtualizados.length === 0) {
                      setExameDataSelecionada('');
                    } else {
                      // Encontrar a próxima data disponível
                      const examesOrdenados = [...examesAtualizados].sort((a, b) => {
                        const dateA = safeDateToString(a.dataColeta);
                        const dateB = safeDateToString(b.dataColeta);
                        return dateB.localeCompare(dateA);
                      });
                      const proximaData = safeDateToString(examesOrdenados[0]?.dataColeta);
                      setExameDataSelecionada(proximaData || '');
                    }
                    
                    // Atualizar estado (não salva ainda - será salvo ao clicar em "Salvar Exame")
                    const pacienteAtualizado = {
                      ...pacienteEditando,
                      examesLaboratoriais: examesAtualizados
                    };
                    
                    setPacienteEditando(pacienteAtualizado);
                    
                    // Limpar dados do modal
                    setDataSelecionadaModal('');
                    setIndiceExameEditando(null);
                    setNovoExameData({ dataColeta: new Date().toISOString().split('T')[0] });
                    
                    // Fechar modal
                  setShowAdicionarExameModal(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Deletar Exame
                </button>
              )}
              
              {/* Botões à direita */}
              <div className="flex justify-end space-x-3 ml-auto">
              <button
                onClick={() => {
                  setShowAdicionarExameModal(false);
                  setIndiceExameEditando(null);
                  setDataSelecionadaModal('');
                  setNovoExameData({ dataColeta: new Date().toISOString().split('T')[0] });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                  onClick={async () => {
                  if (!pacienteEditando || !novoExameData.dataColeta) return;
                  
                    setLoadingPacientes(true);
                    try {
                      const camposValores = Object.fromEntries(
                        Object.entries(novoExameData).filter(
                          ([key, value]) => key !== 'dataColeta' && value !== undefined && value !== ''
                        )
                      );

                      const temAlgumValor = Object.keys(camposValores).length > 0;
                      const examesExistentes = pacienteEditando.examesLaboratoriais || [];
                      let examesAtualizados = [...examesExistentes];

                      if (indiceExameEditando !== null && indiceExameEditando >= 0 && indiceExameEditando < examesAtualizados.length) {
                        // Modo edição
                        if (!temAlgumValor) {
                          // Nenhum valor preenchido: remover exame (equivale a excluir)
                          examesAtualizados.splice(indiceExameEditando, 1);

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
                          examesAtualizados[indiceExameEditando] = {
                            ...examesAtualizados[indiceExameEditando],
                            dataColeta: new Date(novoExameData.dataColeta),
                            ...camposValores
                          };

                          setExameDataSelecionada(novoExameData.dataColeta);
                        }
                      } else {
                        // Modo adição
                  const novoExame = {
                    id: 'temp-' + Date.now(),
                    dataColeta: new Date(novoExameData.dataColeta),
                          ...camposValores
                  };
                  
                        examesAtualizados = [...examesAtualizados, novoExame];
                        setExameDataSelecionada(novoExameData.dataColeta);
                      }
                  
                      const pacienteAtualizado = {
                    ...pacienteEditando,
                    examesLaboratoriais: examesAtualizados
                      };

                      setPacienteEditando(pacienteAtualizado);

                      // Salvar no Firebase
                      if (pacienteAtualizado.id) {
                        await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                        setMessage('Exame salvo com sucesso!');
                      }
                  
                  // Fechar modal e limpar
                  setShowAdicionarExameModal(false);
                      setIndiceExameEditando(null);
                      setDataSelecionadaModal('');
                  setNovoExameData({ dataColeta: new Date().toISOString().split('T')[0] });
                    } catch (error) {
                      console.error('Erro ao salvar exame:', error);
                      setMessage('Erro ao salvar exame. Tente novamente.');
                    } finally {
                      setLoadingPacientes(false);
                    }
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Salvar Exame
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Seguimento Semanal */}
      {showAdicionarSeguimentoModal && pacienteEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Novo Registro Semanal</h2>
              <button
                onClick={() => setShowAdicionarSeguimentoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número da Semana *</label>
                <input
                  type="number"
                  min="1"
                  value={(() => {
                    // Encontrar a próxima semana ativa (não cancelada)
                    const planoTerapeutico = pacienteEditando?.planoTerapeutico;
                    if (!planoTerapeutico) return 1;
                    
                    const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
                    const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
                    
                    // Obter semanas já registradas
                    const semanasRegistradas = (pacienteEditando?.evolucaoSeguimento || []).map((e: any) => {
                      if (e.numeroSemana) return e.numeroSemana;
                      // Se não tiver numeroSemana, tentar inferir da data
                      if (e.dataRegistro && planoTerapeutico.startDate) {
                        const dataRegistro = e.dataRegistro.toDate ? e.dataRegistro.toDate() : new Date(e.dataRegistro);
                        const startDate = new Date(planoTerapeutico.startDate);
                        const diffMs = dataRegistro.getTime() - startDate.getTime();
                        const diffSemanas = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
                        return diffSemanas + 1;
                      }
                      return null;
                    }).filter((s: number | null): s is number => s !== null && s > 0);
                    
                    // Encontrar próxima semana ativa
                    for (let semana = 1; semana <= numeroSemanas; semana++) {
                      // Se a semana não está cancelada e não está registrada, é a próxima
                      if (!semanasCanceladas.includes(semana) && !semanasRegistradas.includes(semana)) {
                        return semana;
                      }
                    }
                    
                    // Se todas as semanas estão ocupadas, retornar a próxima disponível
                    return semanasRegistradas.length > 0 ? Math.max(...semanasRegistradas) + 1 : 1;
                  })()}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data do Registro *</label>
                <input
                  type="date"
                  value={(() => {
                    const planoTerapeutico = pacienteEditando?.planoTerapeutico;
                    if (!planoTerapeutico?.startDate) {
                      return new Date().toISOString().split('T')[0];
                    }
                    
                    // Calcular a próxima semana ativa
                    const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
                    const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
                    
                    // Obter semanas já registradas
                    const semanasRegistradas = (pacienteEditando?.evolucaoSeguimento || []).map((e: any) => {
                      if (e.numeroSemana) return e.numeroSemana;
                      if (e.dataRegistro && planoTerapeutico.startDate) {
                        const dataRegistro = e.dataRegistro.toDate ? e.dataRegistro.toDate() : new Date(e.dataRegistro);
                        const startDate = new Date(planoTerapeutico.startDate);
                        const diffMs = dataRegistro.getTime() - startDate.getTime();
                        const diffSemanas = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
                        return diffSemanas + 1;
                      }
                      return null;
                    }).filter((s: number | null): s is number => s !== null && s > 0);
                    
                    // Encontrar próxima semana ativa
                    let proximaSemanaAtiva = 1;
                    for (let semana = 1; semana <= numeroSemanas; semana++) {
                      if (!semanasCanceladas.includes(semana) && !semanasRegistradas.includes(semana)) {
                        proximaSemanaAtiva = semana;
                        break;
                      }
                    }
                    
                    // Calcular data baseada na semana ativa encontrada
                    const startDate = new Date(planoTerapeutico.startDate);
                    // Ajustar para o dia da semana correto da aplicação
                    if (planoTerapeutico.injectionDayOfWeek) {
                      const diasSemana: { [key: string]: number } = {
                        dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
                      };
                      const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
                      startDate.setHours(0, 0, 0, 0);
                      while (startDate.getDay() !== diaDesejado) {
                        startDate.setDate(startDate.getDate() + 1);
                      }
                    }
                    
                    const dataSemana = new Date(startDate);
                    dataSemana.setDate(startDate.getDate() + ((proximaSemanaAtiva - 1) * 7));
                    return dataSemana.toISOString().split('T')[0];
                  })()}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={novoSeguimento.peso}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, peso: e.target.value })}
                  placeholder="Digite o peso atual"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Circunferência Abdominal (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={novoSeguimento.circunferenciaAbdominal}
                    onChange={(e) => setNovoSeguimento({ ...novoSeguimento, circunferenciaAbdominal: e.target.value })}
                    placeholder="cm"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequência Cardíaca (bpm)</label>
                  <input
                    type="number"
                    value={novoSeguimento.frequenciaCardiaca}
                    onChange={(e) => setNovoSeguimento({ ...novoSeguimento, frequenciaCardiaca: e.target.value })}
                    placeholder="bpm"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PA Sistólica (mmHg)</label>
                  <input
                    type="number"
                    value={novoSeguimento.paSistolica}
                    onChange={(e) => setNovoSeguimento({ ...novoSeguimento, paSistolica: e.target.value })}
                    placeholder="mmHg"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PA Diastólica (mmHg)</label>
                  <input
                    type="number"
                    value={novoSeguimento.paDiastolica}
                    onChange={(e) => setNovoSeguimento({ ...novoSeguimento, paDiastolica: e.target.value })}
                    placeholder="mmHg"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">HbA1c (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="4"
                  max="15"
                  value={novoSeguimento.hba1c}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, hba1c: e.target.value })}
                  placeholder="%"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dose Aplicada (mg) *</label>
                <select 
                  value={novoSeguimento.doseAplicada}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, doseAplicada: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Selecione</option>
                  <option value="2.5">2.5 mg</option>
                  <option value="5">5 mg</option>
                  <option value="7.5">7.5 mg</option>
                  <option value="10">10 mg</option>
                  <option value="12.5">12.5 mg</option>
                  <option value="15">15 mg</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adesão *</label>
                <select 
                  value={novoSeguimento.adesao}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, adesao: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Selecione</option>
                  <option value="ON_TIME">Pontual (ON_TIME)</option>
                  <option value="LATE_<96H">Tardia &lt; 96h</option>
                  <option value="MISSED">Perdida</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Efeitos GI</label>
                <select 
                  value={novoSeguimento.giSeverity}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, giSeverity: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Nenhum</option>
                  <option value="LEVE">Leve</option>
                  <option value="MODERADO">Moderado</option>
                  <option value="GRAVE">Grave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Local da Aplicação</label>
                <select 
                  value={novoSeguimento.localAplicacao}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, localAplicacao: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Selecione</option>
                  <option value="abdome">Abdome</option>
                  <option value="coxa">Coxa</option>
                  <option value="braco">Braço</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações do Paciente</label>
                <textarea
                  value={novoSeguimento.observacoesPaciente}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, observacoesPaciente: e.target.value })}
                  placeholder="Como está se sentindo, sintomas, dificuldades..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentário Médico</label>
                <textarea
                  value={novoSeguimento.comentarioMedico}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, comentarioMedico: e.target.value })}
                  placeholder="Observações clínicas, orientações, ajustes..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAdicionarSeguimentoModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!novoSeguimento.peso || !novoSeguimento.doseAplicada || !novoSeguimento.adesao) {
                    alert('Por favor, preencha os campos obrigatórios: Peso, Dose Aplicada e Adesão');
                    return;
                  }
                  
                  if (!pacienteEditando) return;
                  
                  const evolucao = pacienteEditando.evolucaoSeguimento || [];
                  const planoTerapeutico = pacienteEditando.planoTerapeutico;
                  
                  // Encontrar próxima semana ativa (não cancelada e não registrada)
                  let weekIndex = 1;
                  let dataRegistro = new Date();
                  
                  if (planoTerapeutico?.startDate) {
                    const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
                    const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
                    
                    // Obter semanas já registradas
                    const semanasRegistradas = evolucao.map((e: any) => {
                      if (e.numeroSemana) return e.numeroSemana;
                      if (e.dataRegistro && planoTerapeutico.startDate) {
                        const dataReg = e.dataRegistro.toDate ? e.dataRegistro.toDate() : new Date(e.dataRegistro);
                        const startDate = new Date(planoTerapeutico.startDate);
                        const diffMs = dataReg.getTime() - startDate.getTime();
                        const diffSemanas = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
                        return diffSemanas + 1;
                      }
                      return null;
                    }).filter((s: number | null): s is number => s !== null && s > 0);
                    
                    // Encontrar próxima semana ativa
                    for (let semana = 1; semana <= numeroSemanas; semana++) {
                      if (!semanasCanceladas.includes(semana) && !semanasRegistradas.includes(semana)) {
                        weekIndex = semana;
                        break;
                      }
                    }
                    
                    // Calcular data baseada na semana ativa encontrada
                    const startDate = new Date(planoTerapeutico.startDate);
                    // Ajustar para o dia da semana correto da aplicação
                    if (planoTerapeutico.injectionDayOfWeek) {
                      const diasSemana: { [key: string]: number } = {
                        dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
                      };
                      const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
                      startDate.setHours(0, 0, 0, 0);
                      while (startDate.getDay() !== diaDesejado) {
                        startDate.setDate(startDate.getDate() + 1);
                      }
                    }
                    
                    dataRegistro = new Date(startDate);
                    dataRegistro.setDate(startDate.getDate() + ((weekIndex - 1) * 7));
                  }
                  
                  const novoRegistro: any = {
                    id: 'seguimento-' + Date.now(),
                    weekIndex: weekIndex,
                    numeroSemana: weekIndex, // Adicionar numeroSemana explicitamente
                    dataRegistro: dataRegistro,
                    peso: parseFloat(novoSeguimento.peso) || undefined,
                    circunferenciaAbdominal: novoSeguimento.circunferenciaAbdominal ? parseFloat(novoSeguimento.circunferenciaAbdominal) : undefined,
                    frequenciaCardiaca: novoSeguimento.frequenciaCardiaca ? parseInt(novoSeguimento.frequenciaCardiaca) : undefined,
                    pressaoArterial: (novoSeguimento.paSistolica && novoSeguimento.paDiastolica) ? {
                      sistolica: parseInt(novoSeguimento.paSistolica),
                      diastolica: parseInt(novoSeguimento.paDiastolica)
                    } : undefined,
                    hba1c: novoSeguimento.hba1c ? parseFloat(novoSeguimento.hba1c) : undefined,
                    doseAplicada: {
                      quantidade: parseFloat(novoSeguimento.doseAplicada),
                      data: dataRegistro,
                      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    },
                    adherence: novoSeguimento.adesao as any,
                    giSeverity: novoSeguimento.giSeverity as any,
                    localAplicacao: novoSeguimento.localAplicacao as any,
                    observacoesPaciente: novoSeguimento.observacoesPaciente || undefined,
                    comentarioMedico: novoSeguimento.comentarioMedico || undefined,
                    alerts: []
                  };
                  
                    // Gerar alertas automáticos usando alertEngine
                    const alertasGerados = alertEngine({
                      adherence: novoSeguimento.adesao as any,
                      giSeverity: novoSeguimento.giSeverity as any,
                      weekIndex: weekIndex
                    });
                    
                    // Adicionar alertas ao registro e ao paciente
                    if (alertasGerados.length > 0) {
                      novoRegistro.alerts = alertasGerados.map(a => a.type);
                      
                      // Adicionar alertas novos ao paciente (evitar duplicados)
                      const alertasExistentes = pacienteEditando.alertas || [];
                      const alertasNovos = alertasGerados.filter(
                        novo => !alertasExistentes.some(existente => 
                          existente.type === novo.type && existente.linkedWeek === novo.linkedWeek
                        )
                      );
                      
                      // Atualizar paciente com novo registro E novos alertas
                      const pacienteAtualizado: PacienteCompleto = {
                        ...pacienteEditando,
                        evolucaoSeguimento: [...evolucao, novoRegistro],
                        alertas: [...alertasExistentes, ...alertasNovos]
                      };
                    
                    // Salvar no Firestore
                    setLoadingPacientes(true);
                    try {
                      if (!pacienteAtualizado.id) {
                        setMessage('Erro: Paciente não possui ID. Por favor, feche e reabra o modal.');
                        setLoadingPacientes(false);
                        return;
                      }
                      
                      await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                      
                      // Recarregar paciente atualizado do Firestore
                      const pacienteRecarregado = await PacienteService.getPacienteById(pacienteAtualizado.id);
                      
                      if (pacienteRecarregado) {
                        setPacienteEditando(pacienteRecarregado);
                        setMessage(`Registro semanal adicionado com sucesso! ${alertasNovos.length > 0 ? `${alertasNovos.length} alerta(s) gerado(s).` : ''}`);
                      } else {
                        setPacienteEditando(pacienteAtualizado);
                        setMessage(`Registro semanal adicionado com sucesso! ${alertasNovos.length > 0 ? `${alertasNovos.length} alerta(s) gerado(s).` : ''}`);
                      }
                      
                      // Recarregar lista de pacientes
                      await loadPacientes();
                    } catch (error) {
                      console.error('Erro ao salvar registro:', error);
                      setMessage('Erro ao salvar registro semanal: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
                    } finally {
                      setLoadingPacientes(false);
                    }
                    
                    setNovoSeguimento({
                      peso: '',
                      circunferenciaAbdominal: '',
                      frequenciaCardiaca: '',
                      paSistolica: '',
                      paDiastolica: '',
                      hba1c: '',
                      doseAplicada: '',
                      adesao: '',
                      giSeverity: '',
                      localAplicacao: '',
                      observacoesPaciente: '',
                      comentarioMedico: '',
                    });
                    
                    setShowAdicionarSeguimentoModal(false);
                    return;
                  }
                  
                  // Atualizar paciente com novo registro (sem novos alertas)
                  const pacienteAtualizado: PacienteCompleto = {
                    ...pacienteEditando,
                    evolucaoSeguimento: [...evolucao, novoRegistro]
                  };
                  
                  // Salvar no Firestore
                  setLoadingPacientes(true);
                  try {
                    if (!pacienteAtualizado.id) {
                      setMessage('Erro: Paciente não possui ID. Por favor, feche e reabra o modal.');
                      setLoadingPacientes(false);
                      return;
                    }
                    
                    await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                    
                    // Recarregar paciente atualizado do Firestore
                    const pacienteRecarregado = await PacienteService.getPacienteById(pacienteAtualizado.id);
                    
                    if (pacienteRecarregado) {
                      setPacienteEditando(pacienteRecarregado);
                      setMessage('Registro semanal adicionado com sucesso!');
                    } else {
                      setPacienteEditando(pacienteAtualizado);
                      setMessage('Registro semanal adicionado com sucesso!');
                    }
                    
                    // Recarregar lista de pacientes
                    await loadPacientes();
                  } catch (error) {
                    console.error('Erro ao salvar registro:', error);
                    setMessage('Erro ao salvar registro semanal: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
                  } finally {
                    setLoadingPacientes(false);
                  }
                  
                  setNovoSeguimento({
                    peso: '',
                    circunferenciaAbdominal: '',
                    frequenciaCardiaca: '',
                    paSistolica: '',
                    paDiastolica: '',
                    hba1c: '',
                    doseAplicada: '',
                    adesao: '',
                    giSeverity: '',
                    localAplicacao: '',
                    observacoesPaciente: '',
                    comentarioMedico: ''
                  });
                  
                  setShowAdicionarSeguimentoModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                Adicionar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Seguimento Semanal */}
      {showEditarSeguimentoModal && pacienteEditando && seguimentoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Editar Registro Semanal - Semana {seguimentoEditando.weekIndex}</h2>
              <button
                onClick={() => {
                  setShowEditarSeguimentoModal(false);
                  setSeguimentoEditando(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={novoSeguimento.peso}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, peso: e.target.value })}
                  placeholder="Digite o peso atual"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Circunferência Abdominal (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={novoSeguimento.circunferenciaAbdominal}
                    onChange={(e) => setNovoSeguimento({ ...novoSeguimento, circunferenciaAbdominal: e.target.value })}
                    placeholder="cm"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequência Cardíaca (bpm)</label>
                  <input
                    type="number"
                    value={novoSeguimento.frequenciaCardiaca}
                    onChange={(e) => setNovoSeguimento({ ...novoSeguimento, frequenciaCardiaca: e.target.value })}
                    placeholder="bpm"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PA Sistólica (mmHg)</label>
                  <input
                    type="number"
                    value={novoSeguimento.paSistolica}
                    onChange={(e) => setNovoSeguimento({ ...novoSeguimento, paSistolica: e.target.value })}
                    placeholder="mmHg"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PA Diastólica (mmHg)</label>
                  <input
                    type="number"
                    value={novoSeguimento.paDiastolica}
                    onChange={(e) => setNovoSeguimento({ ...novoSeguimento, paDiastolica: e.target.value })}
                    placeholder="mmHg"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">HbA1c (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="4"
                  max="15"
                  value={novoSeguimento.hba1c}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, hba1c: e.target.value })}
                  placeholder="%"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dose Aplicada (mg) *</label>
                <select 
                  value={novoSeguimento.doseAplicada}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, doseAplicada: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Selecione</option>
                  <option value="2.5">2.5 mg</option>
                  <option value="5">5 mg</option>
                  <option value="7.5">7.5 mg</option>
                  <option value="10">10 mg</option>
                  <option value="12.5">12.5 mg</option>
                  <option value="15">15 mg</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adesão *</label>
                <select 
                  value={novoSeguimento.adesao}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, adesao: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Selecione</option>
                  <option value="ON_TIME">Pontual</option>
                  <option value="LATE_<96H">Atrasada</option>
                  <option value="MISSED">Perdida</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Efeitos GI</label>
                <select 
                  value={novoSeguimento.giSeverity}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, giSeverity: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Nenhum</option>
                  <option value="LEVE">Leve</option>
                  <option value="MODERADO">Moderado</option>
                  <option value="GRAVE">Grave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Local da Aplicação</label>
                <select 
                  value={novoSeguimento.localAplicacao}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, localAplicacao: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                >
                  <option value="">Selecione</option>
                  <option value="abdome">Abdome</option>
                  <option value="coxa">Coxa</option>
                  <option value="braco">Braço</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações do Paciente</label>
                <textarea
                  value={novoSeguimento.observacoesPaciente}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, observacoesPaciente: e.target.value })}
                  placeholder="Como está se sentindo, sintomas, dificuldades..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentário Médico</label>
                <textarea
                  value={novoSeguimento.comentarioMedico}
                  onChange={(e) => setNovoSeguimento({ ...novoSeguimento, comentarioMedico: e.target.value })}
                  placeholder="Observações clínicas, orientações, ajustes..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowEditarSeguimentoModal(false);
                  setSeguimentoEditando(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!novoSeguimento.peso || !novoSeguimento.doseAplicada || !novoSeguimento.adesao) {
                    alert('Por favor, preencha os campos obrigatórios: Peso, Dose Aplicada e Adesão');
                    return;
                  }
                  
                  if (!pacienteEditando || !seguimentoEditando) return;
                  
                  const evolucao = pacienteEditando.evolucaoSeguimento || [];
                  const planoTerapeutico = pacienteEditando.planoTerapeutico;
                  const dataRegistro = seguimentoEditando.dataRegistro || new Date();
                  
                  const registroAtualizado: any = {
                    ...seguimentoEditando,
                    peso: parseFloat(novoSeguimento.peso) || undefined,
                    circunferenciaAbdominal: novoSeguimento.circunferenciaAbdominal ? parseFloat(novoSeguimento.circunferenciaAbdominal) : undefined,
                    frequenciaCardiaca: novoSeguimento.frequenciaCardiaca ? parseInt(novoSeguimento.frequenciaCardiaca) : undefined,
                    pressaoArterial: (novoSeguimento.paSistolica && novoSeguimento.paDiastolica) ? {
                      sistolica: parseInt(novoSeguimento.paSistolica),
                      diastolica: parseInt(novoSeguimento.paDiastolica)
                    } : undefined,
                    hba1c: novoSeguimento.hba1c ? parseFloat(novoSeguimento.hba1c) : undefined,
                    doseAplicada: {
                      quantidade: parseFloat(novoSeguimento.doseAplicada),
                      data: dataRegistro,
                      horario: seguimentoEditando.doseAplicada?.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    },
                    adherence: novoSeguimento.adesao as any,
                    giSeverity: novoSeguimento.giSeverity as any,
                    localAplicacao: novoSeguimento.localAplicacao as any,
                    observacoesPaciente: novoSeguimento.observacoesPaciente || undefined,
                    comentarioMedico: novoSeguimento.comentarioMedico || undefined
                  };
                  
                  // Regenerar alertas automáticos
                  registroAtualizado.alerts = [];
                  if (novoSeguimento.adesao === 'MISSED') {
                    registroAtualizado.alerts.push('MISSED_DOSE');
                  }
                  if (novoSeguimento.giSeverity === 'GRAVE') {
                    registroAtualizado.alerts.push('GI_SEVERE');
                  }
                  
                  // Atualizar paciente com registro editado
                  const evolucaoAtualizada = evolucao.map(e => 
                    e.id === seguimentoEditando.id ? registroAtualizado : e
                  );
                  const pacienteAtualizado: PacienteCompleto = {
                    ...pacienteEditando,
                    evolucaoSeguimento: evolucaoAtualizada
                  };
                  
                  // Salvar no Firestore
                  setLoadingPacientes(true);
                  try {
                    if (!pacienteAtualizado.id) {
                      setMessage('Erro: Paciente não possui ID. Por favor, feche e reabra o modal.');
                      setLoadingPacientes(false);
                      return;
                    }
                    
                    await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                    
                    // Recarregar paciente atualizado do Firestore
                    const pacienteRecarregado = await PacienteService.getPacienteById(pacienteAtualizado.id);
                    
                    if (pacienteRecarregado) {
                      setPacienteEditando(pacienteRecarregado);
                      setMessage('Registro semanal editado com sucesso!');
                    } else {
                      setPacienteEditando(pacienteAtualizado);
                      setMessage('Registro semanal editado com sucesso!');
                    }
                    
                    // Recarregar lista de pacientes
                    await loadPacientes();
                    
                    setShowEditarSeguimentoModal(false);
                    setSeguimentoEditando(null);
                  } catch (error) {
                    console.error('Erro ao salvar registro:', error);
                    setMessage('Erro ao salvar registro semanal: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
                  } finally {
                    setLoadingPacientes(false);
                  }
                  
                  setNovoSeguimento({
                    peso: '',
                    circunferenciaAbdominal: '',
                    frequenciaCardiaca: '',
                    paSistolica: '',
                    paDiastolica: '',
                    doseAplicada: '',
                    adesao: '',
                    giSeverity: '',
                    localAplicacao: '',
                    hba1c: '',
                    observacoesPaciente: '',
                    comentarioMedico: ''
                  });
                }}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mensagem */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden shadow-xl">
            <div className={`px-6 py-4 border-b ${
              modalType === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${
                  modalType === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {modalType === 'success' ? 'Sucesso' : 'Erro'}
                </h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className={`${
                    modalType === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
                  }`}
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-900">{modalMessage}</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowMessageModal(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  modalType === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - Fixed at bottom, no logout button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex items-center justify-around py-2 px-1">
          <button
            onClick={() => setActiveMenu('estatisticas')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'estatisticas'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <UserPlus className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Leads</span>
          </button>

          <button
            onClick={() => setActiveMenu('indicacao')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'indicacao'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <UserPlus className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Encaminhados</span>
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

          {/* Mensagens desativado no mobile também */}
          {/* <button
            onClick={() => setActiveMenu('mensagens')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors relative whitespace-nowrap ${
              activeMenu === 'mensagens'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <MessageSquare className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Mensagens</span>
            {mensagensNaoLidasResidentes > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {mensagensNaoLidasResidentes}
              </span>
            )}
          </button> */}

          <button
            onClick={() => setActiveMenu('tirzepatida')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'tirzepatida'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Pill className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Tirzepatida</span>
          </button>
        </div>
      </div>

      {/* Modal para adicionar cidade manualmente */}
      {showModalNovaCidade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Adicionar Nova Cidade</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <select
                  value={novaCidadeEstado}
                  onChange={(e) => setNovaCidadeEstado(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Selecione o estado</option>
                  {estadosList.map((estado) => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Cidade *
                </label>
                <input
                  type="text"
                  value={novaCidadeNome}
                  onChange={(e) => setNovaCidadeNome(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="Digite o nome da cidade"
                />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModalNovaCidade(false);
                  setNovaCidadeEstado('');
                  setNovaCidadeNome('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!novaCidadeEstado || !novaCidadeNome.trim()) {
                    alert('Por favor, preencha todos os campos');
                    return;
                  }

                  const cidadeNomeNormalizado = novaCidadeNome.trim();

                  // Verificar se a cidade já foi adicionada nas cidades do médico
                  const jaExiste = perfilMedico.cidades.some(
                    c => c.estado === novaCidadeEstado && c.cidade.toLowerCase() === cidadeNomeNormalizado.toLowerCase()
                  );

                  if (jaExiste) {
                    alert('Esta cidade já foi adicionada à sua lista');
                    return;
                  }

                  // Buscar cidades similares
                  const similares = buscarCidadesSimilares(novaCidadeEstado, cidadeNomeNormalizado);
                  
                  if (similares.length > 0) {
                    const mensagemSimilares = similares.map((s, idx) => `${idx + 1}. ${s.cidade} (${Math.round(s.similaridade * 100)}% similar)`).join('\n');
                    const confirmar = confirm(
                      `Encontramos cidades similares:\n\n${mensagemSimilares}\n\n` +
                      `Você digitou: "${cidadeNomeNormalizado}"\n\n` +
                      `Deseja adicionar mesmo assim? (Clique em Cancelar se uma das cidades acima é a mesma que você quer)`
                    );
                    
                    if (!confirmar) {
                      return;
                    }
                  }

                  // Verificar se já existe exatamente igual (padrão ou customizada)
                  const todasCidadesEstado: string[] = [];
                  if (estadosCidades[novaCidadeEstado as keyof typeof estadosCidades]) {
                    todasCidadesEstado.push(...estadosCidades[novaCidadeEstado as keyof typeof estadosCidades].cidades);
                  }
                  cidadesCustomizadas
                    .filter(c => c.estado === novaCidadeEstado)
                    .forEach(c => todasCidadesEstado.push(c.cidade));

                  const existeExata = todasCidadesEstado.some(
                    c => c.toLowerCase() === cidadeNomeNormalizado.toLowerCase()
                  );

                  if (existeExata) {
                    alert('Esta cidade já existe na lista. Use a lista padrão para adicioná-la.');
                    return;
                  }

                  // Salvar cidade customizada no Firestore (se o usuário estiver logado)
                  if (user) {
                    try {
                      await CidadeCustomizadaService.criarCidadeCustomizada(
                        novaCidadeEstado,
                        cidadeNomeNormalizado,
                        user.uid
                      );
                      // Recarregar cidades customizadas
                      await loadCidadesCustomizadas();
                    } catch (error) {
                      console.error('Erro ao salvar cidade customizada:', error);
                      alert('Erro ao salvar cidade. Tentando adicionar localmente...');
                    }
                  }

                  // Adicionar a cidade ao perfil do médico
                  setPerfilMedico({
                    ...perfilMedico,
                    cidades: [...perfilMedico.cidades, { estado: novaCidadeEstado, cidade: cidadeNomeNormalizado }]
                  });

                  setShowModalNovaCidade(false);
                  setNovaCidadeEstado('');
                  setNovaCidadeNome('');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitar Exames */}
      {showSolicitarExamesModal && pacienteEditando && medicoPerfil && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Solicitar Exames</h2>
              <button
                onClick={() => {
                  setShowSolicitarExamesModal(false);
                  setExamesSelecionados([]);
                  setExamesCustomizados(['']);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Informações do Paciente */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 text-lg">Paciente</h3>
                <div className="space-y-2">
                  <p className="text-gray-800">
                    <strong className="text-gray-700">Nome:</strong>{' '}
                    <span className="text-gray-900 font-medium text-base">
                      {pacienteEditando?.dadosIdentificacao?.nome || pacienteEditando?.nome || 'N/A'}
                    </span>
                  </p>
                  <p className="text-gray-800">
                    <strong className="text-gray-700">CPF:</strong>{' '}
                    <span className="text-gray-900">{pacienteEditando.dadosIdentificacao?.cpf || 'N/A'}</span>
                  </p>
                  <p className="text-gray-800">
                    <strong className="text-gray-700">Data de Nascimento:</strong>{' '}
                    <span className="text-gray-900">
                      {pacienteEditando.dadosIdentificacao?.dataNascimento
                        ? new Date(pacienteEditando.dadosIdentificacao.dataNascimento).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Exames Disponíveis */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">Selecionar Exames Disponíveis</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {(() => {
                    const secoesNomes: Record<string, string> = {
                      metabolismo: 'Metabolismo Glicídico',
                      renal: 'Função Renal',
                      hepatobiliar: 'Função Hepática e Biliar',
                      pancreas: 'Pâncreas',
                      lipideos: 'Perfil Lipídico',
                      tireoide: 'Tireóide / MEN2',
                      hemograma: 'Hemograma Completo',
                      ferroVitaminas: 'Ferro e Vitaminas'
                    };

                    return Object.entries(labOrderBySection).map(([secaoKey, campos]) => {
                      const nomeSecao = secoesNomes[secaoKey] || secaoKey;
                      
                      // Tratamento especial para Hemograma Completo
                      if (secaoKey === 'hemograma') {
                        const hemogramaCompletoKey = 'hemogramaCompleto';
                        const temHemograma = examesSelecionados.some(f => ['hgb', 'wbc', 'platelets'].includes(f));
                        
                        return (
                          <div key={secaoKey} className="mb-4 pb-4 border-b border-gray-300 last:border-b-0">
                            <h4 className="font-semibold text-gray-800 mb-3 text-base">{nomeSecao}</h4>
                            <div className="space-y-2 ml-2">
                              <label 
                                className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={temHemograma}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Adicionar todos os campos do hemograma
                                      const novosExames = [...examesSelecionados];
                                      if (!novosExames.includes('hgb')) novosExames.push('hgb');
                                      if (!novosExames.includes('wbc')) novosExames.push('wbc');
                                      if (!novosExames.includes('platelets')) novosExames.push('platelets');
                                      setExamesSelecionados(novosExames);
                                    } else {
                                      // Remover todos os campos do hemograma
                                      setExamesSelecionados(examesSelecionados.filter(f => !['hgb', 'wbc', 'platelets'].includes(f)));
                                    }
                                  }}
                                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-700 flex-1">Hemograma Completo</span>
                              </label>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={secaoKey} className="mb-4 pb-4 border-b border-gray-300 last:border-b-0">
                          <h4 className="font-semibold text-gray-800 mb-3 text-base">{nomeSecao}</h4>
                          <div className="space-y-2 ml-2">
                            {Array.isArray(campos) && campos.map((campoKey) => {
                              const range = getLabRange(campoKey, pacienteEditando.dadosIdentificacao?.sexoBiologico as Sex);
                              // Para campos que dependem de sexo mas não está definido, usar range padrão
                              let rangeToUse = range;
                              
                              if (!rangeToUse && (campoKey === 'ferritin' || campoKey === 'iron')) {
                                const labRangeEntry = (labRanges as any)[campoKey];
                                if (labRangeEntry && labRangeEntry.M && labRangeEntry.F) {
                                  rangeToUse = {
                                    label: campoKey === 'ferritin' ? 'Ferritina' : 'Ferro sérico',
                                    unit: labRangeEntry.M.unit || '',
                                    min: Math.min(labRangeEntry.M.min, labRangeEntry.F.min),
                                    max: Math.max(labRangeEntry.M.max, labRangeEntry.F.max)
                                  };
                                }
                              }
                              
                              if (!rangeToUse || !rangeToUse.label) return null;
                              
                              return (
                                <label 
                                  key={campoKey} 
                                  className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={examesSelecionados.includes(campoKey)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setExamesSelecionados([...examesSelecionados, campoKey]);
                                      } else {
                                        setExamesSelecionados(examesSelecionados.filter(f => f !== campoKey));
                                      }
                                    }}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-700 flex-1">{rangeToUse.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Exames Customizados */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Adicionar Outros Exames</h3>
                <div className="space-y-2">
                  {examesCustomizados.map((exame, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={exame}
                        onChange={(e) => {
                          const novosExames = [...examesCustomizados];
                          novosExames[idx] = e.target.value;
                          setExamesCustomizados(novosExames);
                        }}
                        placeholder="Digite o nome do exame"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                      />
                      {examesCustomizados.length > 1 && (
                        <button
                          onClick={() => {
                            setExamesCustomizados(examesCustomizados.filter((_, i) => i !== idx));
                          }}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setExamesCustomizados([...examesCustomizados, '']);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Adicionar mais um exame
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowSolicitarExamesModal(false);
                  setExamesSelecionados([]);
                  setExamesCustomizados(['']);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  // Gerar PDF
                  const doc = new jsPDF();
                  
                  // Cores
                  const darkColor = [44, 62, 80]; // Azul escuro
                  
                  // Determinar título do médico (Dr. ou Dra.)
                  const tituloMedico = medicoPerfil.genero === 'F' ? 'Dra.' : 'Dr.';
                  const medicoNome = medicoPerfil.nome || 'Médico';
                  const medicoNomeCompleto = `${tituloMedico} ${medicoNome}`;
                  
                  // Header fixo e isolado com nome do médico e CRM
                  doc.setTextColor(...darkColor);
                  doc.setFontSize(18);
                  doc.setFont('helvetica', 'bold');
                  doc.text(medicoNomeCompleto, 20, 15);
                  
                  // Informações do médico (CRM)
                  doc.setFontSize(9);
                  doc.setFont('helvetica', 'normal');
                  const crmText = `CRM-${medicoPerfil.crm?.estado || 'XX'} ${medicoPerfil.crm?.numero || '00000'}`;
                  doc.text(crmText, 20, 22);
                  
                  // Logo Oftware no canto direito do cabeçalho
                  // Carregar a imagem e adicionar ao PDF
                  try {
                    const logoImg = new Image();
                    logoImg.crossOrigin = 'anonymous';
                    
                    // Usar Promise para carregar a imagem antes de adicionar ao PDF
                    await new Promise<void>((resolve) => {
                      logoImg.onload = () => {
                        try {
                          // Adicionar a logo no canto direito superior (melhor posicionamento)
                          const logoWidth = 25;
                          const logoHeight = 25;
                          const logoX = 190 - logoWidth - 10; // 10px da margem direita
                          const logoY = 8; // Mais próximo do topo
                          doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
                        } catch (e) {
                          // Se falhar, apenas adicionar texto
                          doc.setFontSize(11);
                          doc.setFont('helvetica', 'bold');
                          doc.text('Oftware', 180, 15, { align: 'right' });
                        }
                        resolve();
                      };
                      logoImg.onerror = () => {
                        // Se a imagem não carregar, usar texto
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Oftware', 180, 15, { align: 'right' });
                        resolve();
                      };
                      // Iniciar carregamento da imagem
                      logoImg.src = '/icones/oftware.png';
                      
                      // Timeout para não travar se a imagem demorar muito
                      setTimeout(() => {
                        if (logoImg.complete === false) {
                          doc.setFontSize(11);
                          doc.setFont('helvetica', 'bold');
                          doc.text('Oftware', 180, 15, { align: 'right' });
                          resolve();
                        }
                      }, 2000);
                    });
                  } catch (e) {
                    // Se falhar completamente, usar texto
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Oftware', 180, 15, { align: 'right' });
                  }
                  
                  // Espaço antes do título
                  // Título centralizado (mais abaixo, com mais espaço)
                  doc.setFontSize(16);
                  doc.setFont('helvetica', 'bold');
                  doc.text('REQUISIÇÃO DE EXAMES', 105, 32, { align: 'center' });
                  
                  // Linha divisória
                  doc.setDrawColor(...darkColor);
                  doc.setLineWidth(0.5);
                  doc.line(20, 40, 190, 40);
                  
                  let yPos = 52;
                  
                  // Dados do Paciente e Médico lado a lado
                  const colunaEsquerda = 20;
                  const colunaDireita = 115;
                  
                  // Dados do Paciente (esquerda)
                  doc.setFontSize(11);
                  doc.setFont('helvetica', 'bold');
                  doc.text('DADOS DO PACIENTE', colunaEsquerda, yPos);
                  yPos += 8;
                  
                  doc.setFontSize(9);
                  doc.setFont('helvetica', 'normal');
                  const nomePacienteDisplay = pacienteEditando?.dadosIdentificacao?.nome || pacienteEditando?.nome || 'N/A';
                  doc.text(`Nome: ${nomePacienteDisplay}`, colunaEsquerda, yPos);
                  yPos += 6;
                  
                  doc.text(`CPF: ${pacienteEditando.dadosIdentificacao?.cpf || 'N/A'}`, colunaEsquerda, yPos);
                  yPos += 6;
                  
                  const dataNasc = pacienteEditando.dadosIdentificacao?.dataNascimento
                    ? new Date(pacienteEditando.dadosIdentificacao.dataNascimento).toLocaleDateString('pt-BR')
                    : 'N/A';
                  doc.text(`Data Nasc.: ${dataNasc}`, colunaEsquerda, yPos);
                  yPos += 6;
                  
                  const sexo = pacienteEditando.dadosIdentificacao?.sexoBiologico === 'M' ? 'Masculino' : 
                               pacienteEditando.dadosIdentificacao?.sexoBiologico === 'F' ? 'Feminino' : 'N/A';
                  doc.text(`Sexo: ${sexo}`, colunaEsquerda, yPos);
                  
                  // Dados do Médico (direita)
                  let yPosMedico = 52;
                  doc.setFontSize(11);
                  doc.setFont('helvetica', 'bold');
                  doc.text('DADOS DO MÉDICO', colunaDireita, yPosMedico);
                  yPosMedico += 8;
                  
                  doc.setFontSize(9);
                  doc.setFont('helvetica', 'normal');
                  doc.text(`Nome: ${medicoNomeCompleto}`, colunaDireita, yPosMedico);
                  yPosMedico += 6;
                  
                  doc.text(crmText, colunaDireita, yPosMedico);
                  yPosMedico += 6;
                  
                  if (medicoPerfil.localizacao?.endereco) {
                    const endereco = medicoPerfil.localizacao.endereco.length > 40 
                      ? medicoPerfil.localizacao.endereco.substring(0, 37) + '...'
                      : medicoPerfil.localizacao.endereco;
                    doc.text(`Endereço: ${endereco}`, colunaDireita, yPosMedico);
                    yPosMedico += 6;
                  }
                  
                  if (medicoPerfil.localizacao?.cep) {
                    doc.text(`CEP: ${medicoPerfil.localizacao.cep}`, colunaDireita, yPosMedico);
                    yPosMedico += 6;
                  }
                  
                  if (medicoPerfil.telefone) {
                    doc.text(`Telefone: ${medicoPerfil.telefone}`, colunaDireita, yPosMedico);
                  }
                  
                  // Usar o maior yPos
                  yPos = Math.max(yPos, yPosMedico) + 10;
                  
                  // Exames Solicitados
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.text('EXAMES SOLICITADOS', 20, yPos);
                  yPos += 8;
                  
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  
                  // Coletar todos os exames
                  const todosExames: string[] = [];
                  
                  // Verificar se tem hemograma completo (todos os 3 campos)
                  const temHemogramaCompleto = ['hgb', 'wbc', 'platelets'].every(f => examesSelecionados.includes(f));
                  const camposHemograma = ['hgb', 'wbc', 'platelets'];
                  
                  // Exames selecionados
                  examesSelecionados.forEach((field) => {
                    // Se for hemograma completo, adicionar apenas uma vez como "Hemograma Completo"
                    if (temHemogramaCompleto && camposHemograma.includes(field)) {
                      // Adicionar apenas uma vez quando processar o primeiro campo do hemograma
                      if (field === 'hgb' && !todosExames.includes('Hemograma Completo')) {
                        todosExames.push('Hemograma Completo');
                      }
                    } else if (!camposHemograma.includes(field)) {
                      // Para outros exames, adicionar normalmente
                      const range = getLabRange(field as keyof typeof labRanges, pacienteEditando?.dadosIdentificacao?.sexoBiologico as Sex);
                      let rangeToUse = range;
                      
                      // Se não tiver range para ferritina ou ferro, criar range padrão
                      if (!rangeToUse && (field === 'ferritin' || field === 'iron')) {
                        const labRangeEntry = (labRanges as any)[field];
                        if (labRangeEntry && labRangeEntry.M && labRangeEntry.F) {
                          rangeToUse = {
                            label: field === 'ferritin' ? 'Ferritina' : 'Ferro sérico',
                            unit: labRangeEntry.M.unit || '',
                            min: Math.min(labRangeEntry.M.min, labRangeEntry.F.min),
                            max: Math.max(labRangeEntry.M.max, labRangeEntry.F.max)
                          };
                        }
                      }
                      
                      if (rangeToUse && rangeToUse.label) {
                        todosExames.push(rangeToUse.label);
                      }
                    }
                  });
                  
                  // Exames customizados
                  examesCustomizados.forEach((exame) => {
                    if (exame.trim()) {
                      todosExames.push(exame);
                    }
                  });
                  
                  if (todosExames.length === 0) {
                    if (yPos > 230) {
                      doc.addPage();
                      yPos = 52;
                    }
                    doc.text('Nenhum exame selecionado', 25, yPos);
                    yPos += 6;
                  } else {
                    // Verificar se precisa de 2 colunas (mais de 20 exames)
                    const usarDuasColunas = todosExames.length > 20;
                    const colunaEsquerdaExames = 25;
                    const colunaDireitaExames = 110;
                    const alturaLinha = 6;
                    const limiteY = 230;
                    
                    if (usarDuasColunas) {
                      // Dividir exames em duas colunas
                      const metade = Math.ceil(todosExames.length / 2);
                      const examesColunaEsquerda = todosExames.slice(0, metade);
                      const examesColunaDireita = todosExames.slice(metade);
                      
                      let yPosEsquerda = yPos;
                      let yPosDireita = yPos;
                      
                      // Escrever ambas as colunas simultaneamente
                      const maxLength = Math.max(examesColunaEsquerda.length, examesColunaDireita.length);
                      
                      for (let i = 0; i < maxLength; i++) {
                        // Verificar se precisa de nova página
                        if (yPosEsquerda > limiteY || yPosDireita > limiteY) {
                          doc.addPage();
                          yPosEsquerda = 52;
                          yPosDireita = 52;
                        }
                        
                        // Coluna esquerda
                        if (i < examesColunaEsquerda.length) {
                          doc.text(`• ${examesColunaEsquerda[i]}`, colunaEsquerdaExames, yPosEsquerda);
                          yPosEsquerda += alturaLinha;
                        }
                        
                        // Coluna direita
                        if (i < examesColunaDireita.length) {
                          doc.text(`• ${examesColunaDireita[i]}`, colunaDireitaExames, yPosDireita);
                          yPosDireita += alturaLinha;
                        }
                      }
                      
                      yPos = Math.max(yPosEsquerda, yPosDireita);
                    } else {
                      // Uma coluna apenas
                      let yPosAtual = yPos;
                      todosExames.forEach((exameLabel) => {
                        if (yPosAtual > limiteY) {
                          doc.addPage();
                          yPosAtual = 52;
                        }
                        doc.text(`• ${exameLabel}`, colunaEsquerdaExames, yPosAtual);
                        yPosAtual += alturaLinha;
                      });
                      yPos = yPosAtual;
                    }
                  }
                  
                  // Rodapé com assinatura fixa em todas as páginas
                  const pageCount = doc.getNumberOfPages();
                  const hoje = new Date().toLocaleDateString('pt-BR');
                  const local = medicoPerfil.localizacao?.endereco 
                    ? `${medicoPerfil.localizacao.endereco}${medicoPerfil.localizacao.cep ? ` - CEP: ${medicoPerfil.localizacao.cep}` : ''}`
                    : 'Local não informado';
                  
                  for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    
                    // Assinatura fixa no rodapé (centralizada)
                    const footerY = 250;
                    
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    
                    // Assinatura primeiro
                    doc.setDrawColor(...darkColor);
                    doc.setLineWidth(0.5);
                    doc.line(70, footerY, 140, footerY);
                    doc.text('Assinatura do Médico', 105, footerY + 6, { align: 'center' });
                    
                    // Local
                    doc.text(`Local: ${local}`, 105, footerY + 12, { align: 'center' });
                    
                    // Data
                    doc.text(`Data: ${hoje}`, 105, footerY + 18, { align: 'center' });
                    
                    // Numeração de páginas (abaixo da assinatura)
                    doc.setFontSize(8);
                    doc.setTextColor(128, 128, 128);
                    doc.text(
                      `Página ${i} de ${pageCount}`,
                      105,
                      footerY + 26,
                      { align: 'center' }
                    );
                  }
                  
                  // Salvar PDF
                  const nomePaciente = pacienteEditando.dadosIdentificacao?.nome?.replace(/\s+/g, '_') || 'Paciente';
                  const nomeArquivo = `Requisicao_Exames_${nomePaciente}_${new Date().toISOString().split('T')[0]}.pdf`;
                  doc.save(nomeArquivo);
                  
                  setShowSolicitarExamesModal(false);
                  setExamesSelecionados([]);
                  setExamesCustomizados(['']);
                  setMessage('Requisição de exames gerada com sucesso!');
                }}
                disabled={examesSelecionados.length === 0 && examesCustomizados.filter(e => e.trim()).length === 0}
                className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  examesSelecionados.length === 0 && examesCustomizados.filter(e => e.trim()).length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <FileText size={16} />
                Gerar Requisição em PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Saída */}
      {showConfirmarSaidaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Deseja sair sem salvar as alterações?
                </h3>
                <p className="text-sm text-gray-600">
                  Você tem alterações não salvas. O que deseja fazer?
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={async () => {
                  await salvarESair();
                }}
                disabled={salvandoParaSair}
                className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvandoParaSair ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Salvar e Sair
                  </>
                )}
              </button>
              
              <button
                onClick={fecharModalSemSalvar}
                disabled={salvandoParaSair}
                className="w-full px-4 py-2.5 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
                Sair sem Salvar
              </button>
              
              <button
                onClick={() => {
                  setShowConfirmarSaidaModal(false);
                  setAcaoConfirmacaoSaida(null);
                }}
                disabled={salvandoParaSair}
                className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Não Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Chat para Médico - Posicionado no canto inferior direito na versão desktop */}
      {user && (
        <FAQChat
          userName={medicoPerfil?.nome ? medicoPerfil.nome.split(' ')[0] : user.displayName?.split(' ')[0] || 'Médico'}
          showTabs={true}
          faqCategoriesMedico={faqCategoriesMedico}
          faqCategoriesPaciente={faqCategoriesPaciente}
          nutriFaqItemsPaciente={nutriFaqItems}
          position="right"
        />
      )}
    </div>
  );
}
