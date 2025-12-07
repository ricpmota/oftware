'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserService } from '@/services/userService';
import { User as UserType, Residente, Local, Servico, Escala, ServicoDia } from '@/types/auth';
import { Troca } from '@/types/troca';
import { Ferias } from '@/types/ferias';
import FeriasCalendar from '@/components/FeriasCalendar';
import { Users, UserPlus, MapPin, Settings, Calendar, Edit, Menu, X, UserCheck, Building, Wrench, Plus, BarChart3, RefreshCw, MessageSquare, Trash2, Eye, Target, Mail, Folder } from 'lucide-react';
import EditModal from '@/components/EditModal';
import EditResidenteForm from '@/components/EditResidenteForm';
import EditLocalForm from '@/components/EditLocalForm';
import EditServicoForm from '@/components/EditServicoForm';
import EditEscalaForm from '@/components/EditEscalaForm';
import { MensagemService } from '@/services/mensagemService';
import { Mensagem, MensagemResidenteParaAdmin } from '@/types/mensagem';
import { MedicoService } from '@/services/medicoService';
import { Medico } from '@/types/medico';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { TirzepatidaService, TirzepatidaPreco } from '@/services/tirzepatidaService';
import { Stethoscope, CheckCircle, XCircle, Shield, ShieldCheck, Pill, DollarSign } from 'lucide-react';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import { SolicitacaoMedico } from '@/types/solicitacaoMedico';
import { LeadService } from '@/services/leadService';
import { Lead, LeadStatus } from '@/types/lead';
import EmailManagement from '@/components/EmailManagement';

export default function MetaAdminGeralPage() {
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
  
  // Estados para médicos
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  
  // Estados para pacientes
  const [pacientes, setPacientes] = useState<PacienteCompleto[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [filtroBuscaPaciente, setFiltroBuscaPaciente] = useState('');
  const [filtroMedicoPaciente, setFiltroMedicoPaciente] = useState<string>('todos');
  const [filtroStatusPaciente, setFiltroStatusPaciente] = useState<string>('todos');
  const [filtroRecomendacoesPaciente, setFiltroRecomendacoesPaciente] = useState<string>('todos');
  
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
  
  // Estados para monitoramento de e-mails
  const [emailEnvios, setEmailEnvios] = useState<any[]>([]);
  const [loadingEmailEnvios, setLoadingEmailEnvios] = useState(false);
  const [pastaEmailSelecionada, setPastaEmailSelecionada] = useState<string | null>(null);

  // Função para carregar e-mails enviados
  const loadEmailEnvios = useCallback(async () => {
    setLoadingEmailEnvios(true);
    try {
      const response = await fetch('/api/email-envios');
      if (response.ok) {
        const data = await response.json();
        setEmailEnvios(data.envios || []);
      }
    } catch (error) {
      console.error('Erro ao carregar e-mails enviados:', error);
    } finally {
      setLoadingEmailEnvios(false);
    }
  }, []);

  // Carregar e-mails quando o menu de e-mails for ativado
  useEffect(() => {
    if (activeMenu === 'emails') {
      loadEmailEnvios();
    }
  }, [activeMenu, loadEmailEnvios]);
  
  // Estados para modais de edição
  const [showEditarMedicoModal, setShowEditarMedicoModal] = useState(false);
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setUserLoading(false);
      
      if (!user) {
        router.push('/');
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
  }, [router, loadData]);

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

  // Função para carregar pacientes
  const loadPacientes = useCallback(async () => {
    setLoadingPacientes(true);
    try {
      const pacientesData = await PacienteService.getAllPacientes();
      setPacientes(pacientesData);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoadingPacientes(false);
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
      
      // Ordenar cada coluna por data de status (mais recente primeiro)
      Object.keys(leadsPorStatus).forEach(status => {
        leadsPorStatus[status as LeadStatus].sort((a, b) => {
          const dateA = a.dataStatus?.getTime() || 0;
          const dateB = b.dataStatus?.getTime() || 0;
          return dateB - dateA;
        });
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


  // Carregar médicos e pacientes sempre que o menu estatísticas for ativado
  useEffect(() => {
    if (activeMenu === 'estatisticas') {
      loadMedicos();
      loadPacientes();
      loadSolicitacoesPendentes();
    }
  }, [activeMenu, loadMedicos, loadPacientes, loadSolicitacoesPendentes]);

  // Carregar médicos quando a página medicos for ativada
  useEffect(() => {
    if (activeMenu === 'medicos') {
      loadMedicos();
    }
  }, [activeMenu, loadMedicos]);

  // Carregar pacientes quando a página pacientes for ativada
  useEffect(() => {
    if (activeMenu === 'pacientes') {
      loadPacientes();
      loadMedicos(); // Precisa carregar médicos para mostrar o médico responsável
    }
  }, [activeMenu, loadPacientes, loadMedicos]);

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

  const renderContent = () => {
    switch (activeMenu) {
      case 'medicos':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Médicos</h2>
            </div>
            {loadingMedicos ? (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando médicos...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CRM
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Telefone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Verificação
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {medicos.map((medico) => (
                      <tr key={medico.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
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
                          <div className="flex space-x-2">
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
                              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleVerificacaoMedico(medico.id, medico.isVerificado || false)}
                              className={`p-2 rounded-md transition-colors flex items-center justify-center ${
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
                {medicos.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum médico encontrado</p>
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

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Pacientes</h2>
              <div className="text-sm text-gray-500">
                {pacientesFiltrados.length} de {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="bg-white shadow rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Busca por nome/email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar por Nome/Email
                  </label>
                  <input
                    type="text"
                    value={filtroBuscaPaciente}
                    onChange={(e) => setFiltroBuscaPaciente(e.target.value)}
                    placeholder="Digite nome ou email..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Filtro por Médico */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Médico Responsável
                  </label>
                  <select
                    value={filtroMedicoPaciente}
                    onChange={(e) => setFiltroMedicoPaciente(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status do Tratamento
                  </label>
                  <select
                    value={filtroStatusPaciente}
                    onChange={(e) => setFiltroStatusPaciente(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recomendações
                  </label>
                  <select
                    value={filtroRecomendacoesPaciente}
                    onChange={(e) => setFiltroRecomendacoesPaciente(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
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
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                </div>
              )}
            </div>
            {loadingPacientes ? (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando pacientes...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Médico Responsável
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doses Aplicadas
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tempo de Tratamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data de Cadastro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recomendações
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pacientesFiltrados.map((paciente, index) => {
                      const medico = medicos.find(m => m.id === paciente.medicoResponsavelId);
                      const dosesAplicadas = calcularDosesAplicadas(paciente);
                      const tempoTratamento = calcularTempoTratamento(paciente);
                      const tempoTexto = tempoTratamento.meses > 0
                        ? `${tempoTratamento.meses} ${tempoTratamento.meses === 1 ? 'mês' : 'meses'}`
                        : tempoTratamento.semanas > 0
                        ? `${tempoTratamento.semanas} ${tempoTratamento.semanas === 1 ? 'semana' : 'semanas'}`
                        : `${tempoTratamento.dias} ${tempoTratamento.dias === 1 ? 'dia' : 'dias'}`;

                      return (
                        <tr key={paciente.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {paciente.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {medico ? `${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${medico.nome}` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-medium">
                            {dosesAplicadas}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
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

                            case 'leads':
                const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
                  nao_qualificado: { label: 'Não Qualificado', color: 'text-gray-700', bgColor: 'bg-gray-100' },
                  enviado_contato: { label: 'Enviado Contato', color: 'text-blue-700', bgColor: 'bg-blue-100' },
                  contato_feito: { label: 'Contato Feito', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
                  qualificado: { label: 'Qualificado', color: 'text-green-700', bgColor: 'bg-green-100' },
                  excluido: { label: 'Excluído', color: 'text-red-700', bgColor: 'bg-red-100' },
                };

                const statusOrder: LeadStatus[] = ['nao_qualificado', 'enviado_contato', 'contato_feito', 'qualificado', 'excluido'];

                const handleMoveLead = async (leadId: string, currentStatus: LeadStatus, direction: 'left' | 'right') => {
                  try {
                    const currentIndex = statusOrder.indexOf(currentStatus);
                    let newStatus: LeadStatus;
                    
                    if (direction === 'right' && currentIndex < statusOrder.length - 1) {
                      newStatus = statusOrder[currentIndex + 1];
                    } else if (direction === 'left' && currentIndex > 0) {
                      newStatus = statusOrder[currentIndex - 1];
                    } else {
                      return; // Não pode mover
                    }

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
                      leadsPorStatus[status as LeadStatus].sort((a, b) => {
                        const dateA = a.dataStatus?.getTime() || 0;
                        const dateB = b.dataStatus?.getTime() || 0;
                        return dateB - dateA;
                      });
                    });
                    
                    setLeads(updatedLeads);
                    setLeadsByStatus(leadsPorStatus);
                  } catch (error) {
                    console.error('Erro ao mover lead:', error);
                    setMessage('Erro ao mover lead');
                    setTimeout(() => setMessage(''), 3000);
                  }
                };

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">Pipeline de Qualificação de Leads</h2>
                      <button
                        onClick={loadLeads}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Atualizar
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Use as setas para mover os leads entre os estágios do pipeline.
                    </p>
                    {loadingLeads ? (
                      <div className="bg-white shadow rounded-lg p-6">
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                          <p className="mt-4 text-gray-600">Carregando leads...</p>
                        </div>
                      </div>
                    ) : (
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
                                <div className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
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
                                            <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                                            {lead.createdAt && (
                                              <p className="text-xs text-gray-400 mt-1">
                                                {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-gray-100">
                                          <button
                                            onClick={() => handleMoveLead(lead.id, lead.status, 'left')}
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
                                            onClick={() => handleMoveLead(lead.id, lead.status, 'right')}
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
                    )}
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
                      <h2 className="text-2xl font-bold text-gray-900">Precificação Tirzepatida</h2>
                    </div>
                    <div className="bg-white shadow rounded-lg">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Tipos de Tirzepatida</h3>
                        <p className="text-sm text-gray-500 mt-1">Configure os preços dos diferentes tipos de Tirzepatida para que os médicos possam encomendar.</p>
                      </div>
                      <div className="px-6 py-4">
                        <div className="space-y-4">
                          {tiposTirzepatida.map((tipo) => {
                            const precoAtual = tirzepatidaPrecos.find(p => p.tipo === tipo);
                            const editando = editandoTirzepatidaTipo === tipo;

                            return (
                              <div key={tipo} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-4">
                                  <Pill className="h-6 w-6 text-green-600" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Tirzepatida {tipo}</p>
                                    {!editando && precoAtual && (
                                      <p className="text-xs text-gray-500">Preço atual: R$ {precoAtual.preco.toFixed(2).replace('.', ',')}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {editando ? (
                                    <>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-700">R$</span>
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
        // Calcular estatísticas de médicos
        const totalMedicos = medicos.length;
        const medicosVerificados = medicos.filter(m => m.isVerificado).length;
        const medicosNaoVerificados = totalMedicos - medicosVerificados;
        const totalPacientes = pacientes.length;
        
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
              <h2 className="text-2xl font-bold text-gray-900">Estatísticas</h2>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Stethoscope className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total de Médicos</p>
                    <p className="text-2xl font-semibold text-gray-900">{totalMedicos}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <ShieldCheck className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Médicos Verificados</p>
                    <p className="text-2xl font-semibold text-gray-900">{medicosVerificados}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Médicos não Verificados</p>
                    <p className="text-2xl font-semibold text-gray-900">{medicosNaoVerificados}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total de Pacientes</p>
                    <p className="text-2xl font-semibold text-gray-900">{totalPacientes}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline de Leads */}
            <div className="mt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Pipeline de Leads</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-500">Não Qualificado</p>
                  <p className="text-2xl font-semibold text-gray-700">{totalLeadsNaoQualificado}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-700">Enviado Contato</p>
                  <p className="text-2xl font-semibold text-blue-700">{totalLeadsEnviadoContato}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-700">Contato Feito</p>
                  <p className="text-2xl font-semibold text-yellow-700">{totalLeadsContatoFeito}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-700">Qualificado</p>
                  <p className="text-2xl font-semibold text-green-700">{totalLeadsQualificado}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-700">Excluído</p>
                  <p className="text-2xl font-semibold text-red-700">{totalLeadsExcluido}</p>
                </div>
              </div>
              
              {/* Taxa de Conversão */}
              {leadsQualificadosDesaparecidos > 0 && (
                <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Taxa de Conversão</p>
                      <p className="text-xs text-green-600 mt-1">
                        Leads qualificados que encontraram médico
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-green-700">{taxaConversao}%</p>
                      <p className="text-xs text-green-600">
                        {leadsQualificadosDesaparecidos} de {totalLeadsNaoQualificado}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ranking de abandonos por motivo */}
            {rankingAbandonos.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ranking de Abandonos por Motivo</h3>
                <div className="space-y-3">
                  {rankingAbandonos.map(([motivo, quantidade]: [string, number], index: number) => (
                    <div key={motivo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-500 text-white' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">{motivo}</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{quantidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking de médicos por número de pacientes */}
            {rankingMedicosOrdenado.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ranking de Médicos por Número de Pacientes</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pendente</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Em Tratamento</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Concluído</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Abandono</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitação Pendente</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rankingMedicosOrdenado.map((item, index) => (
                        <tr key={item.medico.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center inline-block ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              index === 2 ? 'bg-orange-500 text-white' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.medico.genero === 'F' ? 'Dra.' : 'Dr.'} {item.medico.nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{item.pendente}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-600 font-medium">{item.emTratamento}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-medium">{item.concluido}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600 font-medium">{item.abandono}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-orange-600 font-medium">{item.solicitacoesPendentes}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {rankingMedicosOrdenado.length === 0 && (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                Nenhum médico encontrado com pacientes cadastrados.
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
                                <p className="text-sm text-gray-700">{troca.motivo || 'Motivo não informado'}</p>
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
              <div className="bg-white shadow rounded-lg p-6">
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
                                  <p className="text-sm text-gray-700">{ferias.motivo || 'Motivo não informado'}</p>
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
              <div className="bg-white shadow rounded-lg p-6">
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
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendário de Férias Aprovadas</h3>
              <FeriasCalendar ferias={ferias.filter(f => f.status === 'aprovada')} residentes={residentes} />
            </div>

            {/* Histórico de Férias */}
            {ferias.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Férias</h3>
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
                          <h3 className="text-lg font-semibold text-gray-900">{mensagem.titulo}</h3>
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
                    <h3 className="text-lg font-semibold text-gray-900">Mensagem do Residente</h3>
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
                    <h3 className="text-lg font-semibold text-gray-900">Mensagem Enviada</h3>
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

      case 'emails': {

        // Organizar e-mails por tipo
        const emailsPorTipo: Record<string, any[]> = {};
        emailEnvios.forEach((envio) => {
          const tipo = envio.emailTipo || 'outros';
          if (!emailsPorTipo[tipo]) {
            emailsPorTipo[tipo] = [];
          }
          emailsPorTipo[tipo].push(envio);
        });

        // Mapear tipos de e-mail para nomes amigáveis
        const tiposEmail: Record<string, { nome: string; descricao: string; cor: string }> = {
          'lead_avulso_novo_lead': { 
            nome: 'Lead Avulso - Novo Lead', 
            descricao: 'E-mail enviado quando um novo usuário se cadastra',
            cor: 'blue'
          },
          'novo_lead_medico_novo_lead': { 
            nome: 'Novo Lead Médico', 
            descricao: 'Aviso ao médico sobre novo paciente',
            cor: 'green'
          },
          'solicitado_medico_boas_vindas': { 
            nome: 'Solicitado Médico - Boas-vindas', 
            descricao: 'E-mail de boas-vindas quando solicitação é aceita',
            cor: 'purple'
          },
          'em_tratamento_plano_editado': { 
            nome: 'Em Tratamento - Plano Editado', 
            descricao: 'E-mail quando o plano de tratamento é editado',
            cor: 'orange'
          },
          'aplicacao_aplicacao_antes': { 
            nome: 'Aplicação - Antes', 
            descricao: 'Lembrete 1 dia antes da aplicação',
            cor: 'yellow'
          },
          'aplicacao_aplicacao_dia': { 
            nome: 'Aplicação - Dia', 
            descricao: 'Lembrete no dia da aplicação',
            cor: 'amber'
          },
          'check_recomendacoes_recomendacoes_lidas': { 
            nome: 'Check Recomendações', 
            descricao: 'Aviso ao médico quando paciente lê recomendações',
            cor: 'indigo'
          },
          'novidades_novidade': { 
            nome: 'Novidades', 
            descricao: 'E-mail em massa para pacientes ou médicos',
            cor: 'pink'
          },
          'leads_email1': { nome: 'Leads - E-mail 1', descricao: 'E-mail imediato (1h)', cor: 'cyan' },
          'leads_email2': { nome: 'Leads - E-mail 2', descricao: 'E-mail 24h depois', cor: 'teal' },
          'leads_email3': { nome: 'Leads - E-mail 3', descricao: 'E-mail 72h depois', cor: 'emerald' },
          'leads_email4': { nome: 'Leads - E-mail 4', descricao: 'E-mail 7 dias depois', cor: 'lime' },
          'leads_email5': { nome: 'Leads - E-mail 5', descricao: 'E-mail 14 dias depois', cor: 'green' },
        };

        // Calcular estatísticas por tipo
        const getEstatisticasTipo = (tipo: string) => {
          const envios = emailsPorTipo[tipo] || [];
          const enviados = envios.filter(e => e.status === 'enviado').length;
          const falharam = envios.filter(e => e.status === 'falhou').length;
          const pendentes = envios.filter(e => e.status === 'pendente').length;
          return { total: envios.length, enviados, falharam, pendentes };
        };

        // Filtrar e-mails da pasta selecionada
        const emailsFiltrados = pastaEmailSelecionada 
          ? emailsPorTipo[pastaEmailSelecionada] || []
          : [];

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Mail className="mr-2" size={24} />
                Monitoramento de E-mails
              </h2>
              <button
                onClick={loadEmailEnvios}
                disabled={loadingEmailEnvios}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                <RefreshCw className={`mr-2 ${loadingEmailEnvios ? 'animate-spin' : ''}`} size={18} />
                Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Painel de Pastas */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Folder className="mr-2" size={20} />
                    Pastas
                  </h3>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    <button
                      onClick={() => setPastaEmailSelecionada(null)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        pastaEmailSelecionada === null
                          ? 'bg-green-100 text-green-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Todos os E-mails</span>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                          {emailEnvios.length}
                        </span>
                      </div>
                    </button>
                    {Object.keys(emailsPorTipo).map((tipo) => {
                      const info = tiposEmail[tipo] || { nome: tipo, descricao: '', cor: 'gray' };
                      const stats = getEstatisticasTipo(tipo);
                      return (
                        <button
                          key={tipo}
                          onClick={() => setPastaEmailSelecionada(tipo)}
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                            pastaEmailSelecionada === tipo
                              ? 'bg-green-100 text-green-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{info.nome}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              stats.falharam > 0 
                                ? 'bg-red-100 text-red-700'
                                : stats.enviados > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {stats.total}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate" title={info.descricao}>
                            {info.descricao}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-green-600">✓ {stats.enviados}</span>
                            {stats.falharam > 0 && (
                              <span className="text-xs text-red-600">✗ {stats.falharam}</span>
                            )}
                            {stats.pendentes > 0 && (
                              <span className="text-xs text-yellow-600">⏳ {stats.pendentes}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {Object.keys(emailsPorTipo).length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        Nenhum e-mail enviado ainda
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de E-mails */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {pastaEmailSelecionada 
                        ? tiposEmail[pastaEmailSelecionada]?.nome || pastaEmailSelecionada
                        : 'Todos os E-mails Enviados'}
                    </h3>
                    {pastaEmailSelecionada && tiposEmail[pastaEmailSelecionada] && (
                      <p className="text-sm text-gray-600 mt-1">
                        {tiposEmail[pastaEmailSelecionada].descricao}
                      </p>
                    )}
                  </div>
                  <div className="p-4">
                    {loadingEmailEnvios ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Carregando e-mails...</p>
                      </div>
                    ) : emailsFiltrados.length === 0 && pastaEmailSelecionada ? (
                      <div className="text-center py-8 text-gray-500">
                        <Mail size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Nenhum e-mail deste tipo encontrado</p>
                      </div>
                    ) : emailEnvios.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Mail size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>Nenhum e-mail enviado ainda</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(pastaEmailSelecionada ? emailsFiltrados : emailEnvios)
                          .sort((a, b) => {
                            const dateA = a.enviadoEm?.toDate ? a.enviadoEm.toDate() : new Date(a.enviadoEm);
                            const dateB = b.enviadoEm?.toDate ? b.enviadoEm.toDate() : new Date(b.enviadoEm);
                            return dateB.getTime() - dateA.getTime();
                          })
                          .map((envio) => {
                            const dataEnvio = envio.enviadoEm?.toDate 
                              ? envio.enviadoEm.toDate() 
                              : new Date(envio.enviadoEm);
                            const tipoInfo = tiposEmail[envio.emailTipo] || { nome: envio.emailTipo, cor: 'gray' };
                            
                            return (
                              <div
                                key={envio.id}
                                className={`border rounded-lg p-4 transition-colors ${
                                  envio.status === 'enviado'
                                    ? 'border-green-200 bg-green-50'
                                    : envio.status === 'falhou'
                                    ? 'border-red-200 bg-red-50'
                                    : 'border-yellow-200 bg-yellow-50'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-gray-900">
                                        {envio.assunto || 'Sem assunto'}
                                      </span>
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        envio.status === 'enviado'
                                          ? 'bg-green-100 text-green-700'
                                          : envio.status === 'falhou'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {envio.status === 'enviado' ? '✓ Enviado' : envio.status === 'falhou' ? '✗ Falhou' : '⏳ Pendente'}
                                      </span>
                                      {!pastaEmailSelecionada && (
                                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                          {tipoInfo.nome}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <div>
                                        <span className="font-medium">Para:</span>{' '}
                                        {envio.leadEmail || envio.destinatarioEmail || 'N/A'}
                                        {envio.leadNome && ` (${envio.leadNome})`}
                                      </div>
                                      {envio.medicoNome && (
                                        <div>
                                          <span className="font-medium">Médico:</span> {envio.medicoNome}
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-500">
                                        {dataEnvio.toLocaleString('pt-BR')}
                                      </div>
                                    </div>
                                    {envio.erro && (
                                      <div className="mt-2 text-xs text-red-600 p-2 bg-red-100 rounded">
                                        <span className="font-medium">Erro:</span> {envio.erro}
                                      </div>
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
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className={`hidden lg:block fixed inset-y-0 left-0 z-40 bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <div className="flex flex-col h-full">
            {/* Logo e botão de toggle */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              {!sidebarCollapsed && (
                <div className="flex items-center">
                  <img
                    src="/icones/oftware.png"
                    alt="Oftware Logo"
                    className="h-10 w-10"
                  />
                  <span className="ml-2 text-xl font-bold text-gray-900">Oftware</span>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
              </button>
            </div>

            {/* User info */}
            {!sidebarCollapsed && (
              <div className="px-4 py-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">
                  Bem-vindo, Admin Geral
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {user.email}
                </p>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              <button
                onClick={() => setActiveMenu('estatisticas')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'estatisticas'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Estatísticas' : ''}
              >
                <BarChart3 size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Estatísticas'}
              </button>
              <button
                onClick={() => setActiveMenu('medicos')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'medicos'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Médicos' : ''}
              >
                <Stethoscope size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Médicos'}
              </button>
              <button
                onClick={() => setActiveMenu('pacientes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'pacientes'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Pacientes' : ''}
              >
                <Users size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Pacientes'}
              </button>
              <button
                onClick={() => setActiveMenu('leads')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'leads'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Leads' : ''}
              >
                <Target size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Leads'}
              </button>
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
              <button
                onClick={() => setActiveMenu('emails')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'emails'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'E-mails' : ''}
              >
                <Mail size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'E-mails'}
              </button>
              
            </nav>

            {/* Logout button */}
            <div className="px-4 py-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
        
        <div className={`flex-1 transition-all duration-300 lg:${sidebarCollapsed ? 'ml-16' : 'ml-64'} overflow-x-hidden pb-20 lg:pb-0`}>
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src="/icones/oftware.png"
                  alt="Oftware Logo"
                  className="h-8 w-8"
                />
                <span className="ml-2 text-lg font-semibold text-gray-900">Meta Admin Geral</span>
              </div>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <main className="p-6">
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

      {/* Modal de Edição de Médico */}
      {showEditarMedicoModal && medicoEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Editar Dados do Médico</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.nome}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, nome: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={dadosMedicoEditando.email}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={dadosMedicoEditando.telefone}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, telefone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">CRM Número *</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.crmNumero}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, crmNumero: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CRM Estado *</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.crmEstado}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, crmEstado: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço *</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.endereco}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, endereco: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={dadosMedicoEditando.cep}
                      onChange={(e) => setDadosMedicoEditando({ ...dadosMedicoEditando, cep: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ponto de Referência</label>
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

      {/* Modal de Edição de Paciente */}
      {showEditarPacienteModal && pacienteEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Editar Dados de Identificação do Paciente</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.nomeCompleto}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, nomeCompleto: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={dadosPacienteEditando.email}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={dadosPacienteEditando.telefone}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, telefone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.cpf}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, cpf: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={dadosPacienteEditando.dataNascimento}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, dataNascimento: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sexo Biológico</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.rua}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, rua: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.cidade}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, cidade: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <input
                      type="text"
                      value={dadosPacienteEditando.estado}
                      onChange={(e) => setDadosPacienteEditando({ ...dadosPacienteEditando, estado: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
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

      {/* Mobile Bottom Navigation - Fixed at bottom, no logout button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex justify-between items-center py-2 px-2 w-full">
          <button
            onClick={() => setActiveMenu('estatisticas')}
            className={`flex flex-col items-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'estatisticas'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Estatísticas</span>
          </button>

          <button
            onClick={() => setActiveMenu('medicos')}
            className={`flex flex-col items-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
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
            className={`flex flex-col items-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'pacientes'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Users className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Pacientes</span>
          </button>

          <button
            onClick={() => setActiveMenu('tirzepatida')}
            className={`flex flex-col items-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'tirzepatida'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Pill className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Tirzepatida</span>
          </button>

          <button
            onClick={() => setActiveMenu('leads')}
            className={`flex flex-col items-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'leads'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Target className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Leads</span>
          </button>

          <button
            onClick={() => setActiveMenu('emails')}
            className={`flex flex-col items-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
              activeMenu === 'emails'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Mail className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">E-mails</span>
          </button>
        </div>
      </div>
    </div>
  );
}
