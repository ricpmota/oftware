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
import { Users, UserPlus, MapPin, Settings, Calendar, Edit, Menu, X, UserCheck, Building, Wrench, Plus, BarChart3, RefreshCw, MessageSquare, Trash2, Eye, UserCircle, Stethoscope } from 'lucide-react';
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
    genero: '' as 'M' | 'F' | '',
    cidades: [] as { estado: string; cidade: string }[]
  });
  const [estadoSelecionado, setEstadoSelecionado] = useState<string>('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState<string>('');
  
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
  const [pastaAtiva, setPastaAtiva] = useState<number>(1);
  
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
        crm: {
          numero: perfilMedico.crmNumero,
          estado: perfilMedico.crmEstado
        },
        localizacao: {
          endereco: perfilMedico.endereco
        },
        cidades: perfilMedico.cidades,
        status: 'ativo' as const
      };

      const medicoId = await MedicoService.createOrUpdateMedico(medicoData);
      console.log('Médico salvo com ID:', medicoId);
      await loadMedicoPerfil();
      setMessage('Perfil salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil médico:', error);
      setMessage('Erro ao salvar perfil médico');
    } finally {
      setLoadingPerfil(false);
    }
  };

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


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setUserLoading(false);
      
      if (!user) {
        router.push('/');
        return;
      }
      
      // Verificar se é o usuário master ou tem role de admin
      if (user.email === 'ricpmota.med@gmail.com') {
        loadData();
      } else {
        UserService.getUserByUid(user.uid).then((userData) => {
          if (userData?.role !== 'admin') {
            // Redirecionar baseado no role
            if (userData?.role === 'residente') {
              router.push('/cenoft');
            } else if (userData?.role === 'recepcao') {
              router.push('/recepcao');
            } else {
              router.push('/');
            }
            return;
          }
          loadData();
        }).catch((error) => {
          console.error('Erro ao verificar role do usuário:', error);
          router.push('/');
        });
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

  // Função para carregar pacientes do médico
  const loadPacientes = useCallback(async () => {
    if (!user || !medicoPerfil) return;
    
    setLoadingPacientes(true);
    try {
      console.log('Carregando pacientes para médico ID:', medicoPerfil.id);
      const pacientesData = await PacienteService.getPacientesByMedico(medicoPerfil.id);
      console.log('Pacientes encontrados:', pacientesData);
      setPacientes(pacientesData);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoadingPacientes(false);
    }
  }, [user, medicoPerfil]);

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

  useEffect(() => {
    if (user && activeMenu === 'meu-perfil') {
      loadMedicoPerfil();
    }
  }, [user, activeMenu, loadMedicoPerfil]);

  useEffect(() => {
    if (user && activeMenu === 'pacientes') {
      console.log('Menu pacientes ativado, carregando perfil médico primeiro...');
      loadMedicoPerfil();
    }
  }, [user, activeMenu, loadMedicoPerfil]);

  useEffect(() => {
    if (user && medicoPerfil && activeMenu === 'pacientes') {
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
      case 'meu-perfil':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Meu Perfil Médico</h2>
            </div>

            {loadingPerfil ? (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando perfil...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6">
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

                    {/* Endereço */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endereço Completo *
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
                          {estadoSelecionado && estadosCidades[estadoSelecionado as keyof typeof estadosCidades].cidades.map((cidade) => (
                            <option key={cidade} value={cidade}>
                              {cidade}
                            </option>
                          ))}
                        </select>
                        
                        <button
                          type="button"
                          onClick={handleAdicionarCidade}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          <Plus size={20} />
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

                {/* Informações do Perfil Existentes */}
                {medicoPerfil && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Perfil</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="bg-white shadow rounded-lg p-6">
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
              <div className="bg-white shadow rounded-lg overflow-hidden">
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
                          <div className="text-sm font-medium text-gray-900">{paciente.nome}</div>
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
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(paciente.statusTratamento || 'pendente') === 'em_tratamento'
                              ? 'Em Tratamento'
                              : (paciente.statusTratamento || 'pendente') === 'concluido'
                              ? 'Concluído'
                              : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setPacienteEditando(paciente);
                              setShowEditarPacienteModal(true);
                              setPastaAtiva(1);
                            }}
                            className="text-green-600 hover:text-green-900 mr-4 flex items-center"
                          >
                            <Edit size={16} className="mr-1" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        // Calcular escalas filtradas baseado no período selecionado
        const agora = new Date();
        let dataInicio: Date;
        let dataFim: Date;

        switch (filtroPeriodo) {
          case 'semana':
            dataInicio = new Date(agora);
            dataInicio.setDate(agora.getDate() - agora.getDay() + 1);
            dataInicio.setHours(0, 0, 0, 0);
            
            dataFim = new Date(dataInicio);
            dataFim.setDate(dataInicio.getDate() + 6);
            dataFim.setHours(23, 59, 59, 999);
            break;
          
          case 'mes':
            dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
            dataInicio.setHours(0, 0, 0, 0);
            
            dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
            dataFim.setHours(23, 59, 59, 999);
            break;
          
          case 'ano':
            dataInicio = new Date(agora.getFullYear(), 0, 1);
            dataInicio.setHours(0, 0, 0, 0);
            
            dataFim = new Date(agora.getFullYear(), 11, 31);
            dataFim.setHours(23, 59, 59, 999);
            break;
          
          default:
            dataInicio = new Date(agora);
            dataInicio.setDate(agora.getDate() - agora.getDay() + 1);
            dataInicio.setHours(0, 0, 0, 0);
            
            dataFim = new Date(dataInicio);
            dataFim.setDate(dataInicio.getDate() + 6);
            dataFim.setHours(23, 59, 59, 999);
        }

        const escalasFiltradas = escalas.filter(escala => {
          const dataInicioEscala = new Date(escala.dataInicio);
          return dataInicioEscala >= dataInicio && dataInicioEscala <= dataFim;
        });

        const estatisticas = calcularEstatisticasDetalhadas(escalasFiltradas);
        
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Estatísticas Detalhadas</h2>
              <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFiltroPeriodo('semana')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filtroPeriodo === 'semana'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setFiltroPeriodo('mes')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filtroPeriodo === 'mes'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => setFiltroPeriodo('ano')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filtroPeriodo === 'ano'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Ano
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  {filtroPeriodo === 'semana' && 'Semana atual'}
                  {filtroPeriodo === 'mes' && 'Mês atual'}
                  {filtroPeriodo === 'ano' && 'Ano atual'}
                </div>
              </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total de Usuários</p>
                    <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <UserPlus className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Residentes</p>
                    <p className="text-2xl font-semibold text-gray-900">{residentes.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <MapPin className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Locais</p>
                    <p className="text-2xl font-semibold text-gray-900">{locais.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Settings className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Serviços</p>
                    <p className="text-2xl font-semibold text-gray-900">{servicos.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Somatórios por nível */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* R1 Somatório */}
              <div className="bg-blue-50 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-900">R1 - Total</h3>
                  <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">
                    {estatisticas.totalResidentes.R1} residentes
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Manhã:</span>
                    <span className="font-semibold text-blue-900">{estatisticas.somatoriosPorNivel.R1.manha}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Tarde:</span>
                    <span className="font-semibold text-blue-900">{estatisticas.somatoriosPorNivel.R1.tarde}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Folgas:</span>
                    <span className="font-semibold text-green-600">{estatisticas.somatoriosPorNivel.R1.folgas}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2">
                    <span className="text-sm font-medium text-blue-800">Total:</span>
                    <span className="text-lg font-bold text-blue-900">{estatisticas.somatoriosPorNivel.R1.total}</span>
                  </div>
                </div>
              </div>

              {/* R2 Somatório */}
              <div className="bg-green-50 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-900">R2 - Total</h3>
                  <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-medium rounded-full">
                    {estatisticas.totalResidentes.R2} residentes
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Manhã:</span>
                    <span className="font-semibold text-green-900">{estatisticas.somatoriosPorNivel.R2.manha}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Tarde:</span>
                    <span className="font-semibold text-green-900">{estatisticas.somatoriosPorNivel.R2.tarde}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Folgas:</span>
                    <span className="font-semibold text-green-600">{estatisticas.somatoriosPorNivel.R2.folgas}</span>
                  </div>
                  <div className="flex justify-between border-t border-green-200 pt-2">
                    <span className="text-sm font-medium text-green-800">Total:</span>
                    <span className="text-lg font-bold text-green-900">{estatisticas.somatoriosPorNivel.R2.total}</span>
                  </div>
                </div>
              </div>

              {/* R3 Somatório */}
              <div className="bg-purple-50 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-900">R3 - Total</h3>
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs font-medium rounded-full">
                    {estatisticas.totalResidentes.R3} residentes
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Manhã:</span>
                    <span className="font-semibold text-purple-900">{estatisticas.somatoriosPorNivel.R3.manha}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Tarde:</span>
                    <span className="font-semibold text-purple-900">{estatisticas.somatoriosPorNivel.R3.tarde}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Folgas:</span>
                    <span className="font-semibold text-green-600">{estatisticas.somatoriosPorNivel.R3.folgas}</span>
                  </div>
                  <div className="flex justify-between border-t border-purple-200 pt-2">
                    <span className="text-sm font-medium text-purple-800">Total:</span>
                    <span className="text-lg font-bold text-purple-900">{estatisticas.somatoriosPorNivel.R3.total}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estatísticas por nível */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* R1 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">R1 ({estatisticas.totalResidentes.R1})</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {estatisticas.totalResidentes.R1} residentes
                  </span>
                </div>
                <div className="space-y-3">
                  {Object.keys(estatisticas.servicosPorResidente.R1).length > 0 ? (
                    Object.entries(estatisticas.servicosPorResidente.R1).map(([nome, servicos]) => {
                      const folgas = estatisticas.folgasPorResidente.R1[nome] || 0;
                      return (
                        <div key={nome} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{nome}</p>
                            <p className="text-sm text-gray-500">
                              {servicos.manha} manhã • {servicos.tarde} tarde
                              {folgas > 0 && <span className="text-green-600 ml-2">• {folgas} folga{folgas > 1 ? 's' : ''}</span>}
                            </p>
                          </div>
                          <span className="text-lg font-semibold text-blue-600">{servicos.total}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum serviço atribuído</p>
                  )}
                </div>
              </div>

              {/* R2 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">R2 ({estatisticas.totalResidentes.R2})</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    {estatisticas.totalResidentes.R2} residentes
                  </span>
                </div>
                <div className="space-y-3">
                  {Object.keys(estatisticas.servicosPorResidente.R2).length > 0 ? (
                    Object.entries(estatisticas.servicosPorResidente.R2).map(([nome, servicos]) => {
                      const folgas = estatisticas.folgasPorResidente.R2[nome] || 0;
                      return (
                        <div key={nome} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{nome}</p>
                            <p className="text-sm text-gray-500">
                              {servicos.manha} manhã • {servicos.tarde} tarde
                              {folgas > 0 && <span className="text-green-600 ml-2">• {folgas} folga{folgas > 1 ? 's' : ''}</span>}
                            </p>
                          </div>
                          <span className="text-lg font-semibold text-green-600">{servicos.total}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum serviço atribuído</p>
                  )}
                </div>
              </div>

              {/* R3 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">R3 ({estatisticas.totalResidentes.R3})</h3>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    {estatisticas.totalResidentes.R3} residentes
                  </span>
                </div>
                <div className="space-y-3">
                  {Object.keys(estatisticas.servicosPorResidente.R3).length > 0 ? (
                    Object.entries(estatisticas.servicosPorResidente.R3).map(([nome, servicos]) => {
                      const folgas = estatisticas.folgasPorResidente.R3[nome] || 0;
                      return (
                        <div key={nome} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{nome}</p>
                            <p className="text-sm text-gray-500">
                              {servicos.manha} manhã • {servicos.tarde} tarde
                              {folgas > 0 && <span className="text-green-600 ml-2">• {folgas} folga{folgas > 1 ? 's' : ''}</span>}
                            </p>
                          </div>
                          <span className="text-lg font-semibold text-purple-600">{servicos.total}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum serviço atribuído</p>
                  )}
                </div>
              </div>
            </div>

            {/* Brechas nas escalas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Brechas nas Escalas - {filtroPeriodo === 'semana' ? 'Semana Atual' : filtroPeriodo === 'mes' ? 'Mês Atual' : 'Ano Atual'} (Por Turno)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* R1 Brechas */}
                <div>
                  <h4 className="text-md font-medium text-blue-600 mb-3">R1 - Turnos sem serviços</h4>
                  {Object.keys(estatisticas.brechasPorNivel.R1).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(estatisticas.brechasPorNivel.R1).map(([nome, turnos]) => (
                        <div key={nome} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="font-medium text-red-800">{nome}</p>
                          <div className="text-sm text-red-600 mt-1">
                            {turnos.map(({ dia, turno }) => (
                              <span key={`${dia}-${turno}`} className="inline-block mr-2 mb-1 px-2 py-1 bg-red-100 rounded text-xs">
                                {dia.charAt(0).toUpperCase() + dia.slice(1)} - {turno === 'manha' ? 'Manhã' : 'Tarde'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Todos os R1 têm serviços em todos os turnos</p>
                  )}
                </div>

                {/* R2 Brechas */}
                <div>
                  <h4 className="text-md font-medium text-green-600 mb-3">R2 - Turnos sem serviços</h4>
                  {Object.keys(estatisticas.brechasPorNivel.R2).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(estatisticas.brechasPorNivel.R2).map(([nome, turnos]) => (
                        <div key={nome} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="font-medium text-red-800">{nome}</p>
                          <div className="text-sm text-red-600 mt-1">
                            {turnos.map(({ dia, turno }) => (
                              <span key={`${dia}-${turno}`} className="inline-block mr-2 mb-1 px-2 py-1 bg-red-100 rounded text-xs">
                                {dia.charAt(0).toUpperCase() + dia.slice(1)} - {turno === 'manha' ? 'Manhã' : 'Tarde'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Todos os R2 têm serviços em todos os turnos</p>
                  )}
                </div>

                {/* R3 Brechas */}
                <div>
                  <h4 className="text-md font-medium text-purple-600 mb-3">R3 - Turnos sem serviços</h4>
                  {Object.keys(estatisticas.brechasPorNivel.R3).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(estatisticas.brechasPorNivel.R3).map(([nome, turnos]) => (
                        <div key={nome} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="font-medium text-red-800">{nome}</p>
                          <div className="text-sm text-red-600 mt-1">
                            {turnos.map(({ dia, turno }) => (
                              <span key={`${dia}-${turno}`} className="inline-block mr-2 mb-1 px-2 py-1 bg-red-100 rounded text-xs">
                                {dia.charAt(0).toUpperCase() + dia.slice(1)} - {turno === 'manha' ? 'Manhã' : 'Tarde'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Todos os R3 têm serviços em todos os turnos</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabela de Serviços por Residente */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Serviços por Residente</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Serviço
                      </th>
                      <th className="px-2 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">
                        Local
                      </th>
                      <th className="px-2 py-2 text-center font-medium text-blue-600 uppercase tracking-wider border-l-2 border-blue-300">
                        R1
                      </th>
                      {residentes
                        .filter(r => r.nivel === 'R1')
                        .map(residente => (
                          <th key={residente.id} className="px-1 py-2 text-center font-medium text-blue-600 text-xs">
                            {residente.nome}
                          </th>
                        ))}
                      <th className="px-2 py-2 text-center font-medium text-green-600 uppercase tracking-wider border-l-2 border-green-300">
                        R2
                      </th>
                      {residentes
                        .filter(r => r.nivel === 'R2')
                        .map(residente => (
                          <th key={residente.id} className="px-1 py-2 text-center font-medium text-green-600 text-xs">
                            {residente.nome}
                          </th>
                        ))}
                      <th className="px-2 py-2 text-center font-medium text-purple-600 uppercase tracking-wider border-l-2 border-purple-300">
                        R3
                      </th>
                      {residentes
                        .filter(r => r.nivel === 'R3')
                        .map(residente => (
                          <th key={residente.id} className="px-1 py-2 text-center font-medium text-purple-600 text-xs">
                            {residente.nome}
                          </th>
                        ))}
                      <th className="px-2 py-2 text-center font-medium text-gray-500 uppercase tracking-wider border-l-2 border-gray-300">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {servicos
                      .map(servico => {
                        const local = locais.find(l => l.id === servico.localId);
                        return { servico, local };
                      })
                      .sort((a, b) => {
                        // Primeiro ordena por local (alfabético)
                        const localA = a.local?.nome || 'ZZZ';
                        const localB = b.local?.nome || 'ZZZ';
                        if (localA !== localB) {
                          return localA.localeCompare(localB);
                        }
                        // Se o local for igual, ordena por serviço (alfabético)
                        return a.servico.nome.localeCompare(b.servico.nome);
                      })
                      .map(({ servico, local }, index) => {
                        const servicoResidentes = new Set<string>();
                        
                        // Contar quantas vezes cada residente aparece neste serviço
                        const contagemResidentes: Record<string, number> = {};
                        
                        escalasFiltradas.forEach(escala => {
                          Object.values(escala.dias).forEach(dia => {
                            if (Array.isArray(dia)) {
                              dia.forEach(servicoDia => {
                                if (servicoDia.servicoId === servico.id) {
                                  servicoDia.residentes.forEach(email => {
                                    const residente = residentes.find(r => r.email === email);
                                    if (residente) {
                                      servicoResidentes.add(residente.nome);
                                      contagemResidentes[residente.nome] = (contagemResidentes[residente.nome] || 0) + 1;
                                    }
                                  });
                                }
                              });
                            }
                          });
                        });

                        const totalServicos = Object.values(contagemResidentes).reduce((sum, count) => sum + count, 0);

                        // Calcular totais por nível
                        const totalR1 = residentes
                          .filter(r => r.nivel === 'R1')
                          .reduce((sum, residente) => sum + (contagemResidentes[residente.nome] || 0), 0);
                        
                        const totalR2 = residentes
                          .filter(r => r.nivel === 'R2')
                          .reduce((sum, residente) => sum + (contagemResidentes[residente.nome] || 0), 0);
                        
                        const totalR3 = residentes
                          .filter(r => r.nivel === 'R3')
                          .reduce((sum, residente) => sum + (contagemResidentes[residente.nome] || 0), 0);

                        return (
                          <tr key={servico.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className={`px-2 py-2 text-sm font-medium text-gray-900 sticky left-0 z-10 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              {servico.nome}
                            </td>
                            <td className="px-2 py-2 text-sm text-black text-center">
                              {local?.nome || 'N/A'}
                            </td>
                            <td className="px-2 py-2 text-center font-semibold text-blue-600 border-l-2 border-blue-300">
                              {totalR1}
                            </td>
                            {residentes
                              .filter(r => r.nivel === 'R1')
                              .map(residente => (
                                <td key={residente.id} className="px-1 py-2 text-center text-xs text-black">
                                  {contagemResidentes[residente.nome] || 0}
                                </td>
                              ))}
                            <td className="px-2 py-2 text-center font-semibold text-green-600 border-l-2 border-green-300">
                              {totalR2}
                            </td>
                            {residentes
                              .filter(r => r.nivel === 'R2')
                              .map(residente => (
                                <td key={residente.id} className="px-1 py-2 text-center text-xs text-black">
                                  {contagemResidentes[residente.nome] || 0}
                                </td>
                              ))}
                            <td className="px-2 py-2 text-center font-semibold text-purple-600 border-l-2 border-purple-300">
                              {totalR3}
                            </td>
                            {residentes
                              .filter(r => r.nivel === 'R3')
                              .map(residente => (
                                <td key={residente.id} className="px-1 py-2 text-center text-xs text-black">
                                  {contagemResidentes[residente.nome] || 0}
                                </td>
                              ))}
                            <td className="px-2 py-2 text-center font-semibold text-black border-l-2 border-gray-300">
                              {totalServicos}
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
                  Bem-vindo, Admin
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {user.email}
                </p>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              <button
                onClick={() => setActiveMenu('meu-perfil')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'meu-perfil'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Meu Perfil' : ''}
              >
                <Stethoscope size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Meu Perfil Médico'}
              </button>
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
                onClick={() => setActiveMenu('residentes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'residentes'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Residentes' : ''}
              >
                <UserCheck size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Residentes'}
              </button>
              <button
                onClick={() => setActiveMenu('locais')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'locais'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Locais' : ''}
              >
                <Building size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Locais'}
              </button>
              <button
                onClick={() => setActiveMenu('servicos')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'servicos'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Serviços' : ''}
              >
                <Wrench size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Serviços'}
              </button>
              <button
                onClick={() => setActiveMenu('escalas')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'escalas'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Escalas' : ''}
              >
                <Calendar size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Escalas'}
              </button>
              <button
                onClick={() => setActiveMenu('criar-escala')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeMenu === 'criar-escala'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Criar Escala' : ''}
              >
                <Calendar size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Criar Escala'}
              </button>
              <button
                onClick={() => setActiveMenu('troca')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                  activeMenu === 'troca'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Troca' : ''}
              >
                <RefreshCw size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Aprovar Trocas'}
                {notificacoesTroca > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notificacoesTroca > 9 ? '9+' : notificacoesTroca}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveMenu('ferias')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                  activeMenu === 'ferias'
                    ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? 'Férias' : ''}
              >
                <Calendar size={20} className={sidebarCollapsed ? '' : 'mr-3'} />
                {!sidebarCollapsed && 'Gerenciar Férias'}
                {feriasPendentes.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {feriasPendentes.length > 9 ? '9+' : feriasPendentes.length}
                  </span>
                )}
              </button>
              
              <button
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
                <span className="ml-2 text-lg font-semibold text-gray-900">Admin</span>
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

      {/* Modal de Cadastrar Paciente */}
      {showCadastrarPacienteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Cadastrar Novo Paciente</h2>
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
      {showEditarPacienteModal && pacienteEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Editar Paciente</h2>
                <p className="text-sm text-gray-500 mt-1">{pacienteEditando.nome}</p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={pacienteEditando.statusTratamento || 'pendente'}
                  onChange={(e) => {
                    setPacienteEditando({
                      ...pacienteEditando,
                      statusTratamento: e.target.value as 'pendente' | 'em_tratamento' | 'concluido'
                    });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_tratamento">Em Tratamento</option>
                  <option value="concluido">Concluído</option>
                </select>
                <button
                  onClick={() => {
                    setShowEditarPacienteModal(false);
                    setPacienteEditando(null);
                    setPastaAtiva(1);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs das 9 Pastas */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {[
                { id: 1, nome: 'Dados de Identificação' },
                { id: 2, nome: 'Dados Clínicos' },
                { id: 3, nome: 'Estilo de Vida' },
                { id: 4, nome: 'Exames Laboratoriais' },
                { id: 5, nome: 'Plano Terapêutico' },
                { id: 6, nome: 'Evolução/Seguimento' },
                { id: 7, nome: 'Alertas e Eventos' },
                { id: 8, nome: 'Comunicação' },
                { id: 9, nome: 'Indicadores' }
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
                      <input
                        type="text"
                        value={pacienteEditando.dadosIdentificacao?.nomeCompleto || ''}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              nomeCompleto: e.target.value
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={pacienteEditando.dadosIdentificacao?.email || ''}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              email: e.target.value
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={pacienteEditando.dadosIdentificacao?.telefone || ''}
                        onChange={(e) => {
                          setPacienteEditando({
                            ...pacienteEditando,
                            dadosIdentificacao: {
                              ...pacienteEditando.dadosIdentificacao,
                              telefone: e.target.value
                            }
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Clínicos da Anamnese</h3>
                  
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

                  {/* Placeholder para demais seções */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      Seções 2.4 a 2.11 serão implementadas em seguida.
                    </p>
                  </div>
                </div>
              )}

              {pastaAtiva === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estilo de Vida</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">Formulário completo será implementado em seguida.</p>
                  </div>
                </div>
              )}

              {pastaAtiva === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Exames Laboratoriais</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">Formulário completo será implementado em seguida.</p>
                  </div>
                </div>
              )}

              {pastaAtiva === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Plano Terapêutico</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">Formulário completo será implementado em seguida.</p>
                  </div>
                </div>
              )}

              {pastaAtiva === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução / Seguimento Semanal</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">Formulário completo será implementado em seguida.</p>
                  </div>
                </div>
              )}

              {pastaAtiva === 7 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas e Eventos Importantes</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">Formulário completo será implementado em seguida.</p>
                  </div>
                </div>
              )}

              {pastaAtiva === 8 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Comunicação e Registro</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">Formulário completo será implementado em seguida.</p>
                  </div>
                </div>
              )}

              {pastaAtiva === 9 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Derivados / Indicadores</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">Formulário completo será implementado em seguida.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer com botões */}
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowEditarPacienteModal(false);
                  setPacienteEditando(null);
                  setPastaAtiva(1);
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
                    await PacienteService.createOrUpdatePaciente(pacienteEditando);
                    await loadPacientes();
                    setShowEditarPacienteModal(false);
                    setPacienteEditando(null);
                    setPastaAtiva(1);
                    setMessage('Paciente atualizado com sucesso!');
                  } catch (error) {
                    console.error('Erro ao atualizar paciente:', error);
                    setMessage('Erro ao atualizar paciente');
                  } finally {
                    setLoadingPacientes(false);
                  }
                }}
                disabled={loadingPacientes}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loadingPacientes ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - Fixed at bottom, no logout button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex overflow-x-auto scrollbar-hide items-center py-2 px-2 space-x-1">
          <button
            onClick={() => setActiveMenu('meu-perfil')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
              activeMenu === 'meu-perfil'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Stethoscope className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Meu Perfil</span>
          </button>
          
          <button
            onClick={() => setActiveMenu('estatisticas')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
              activeMenu === 'estatisticas'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Estatísticas</span>
          </button>

          <button
            onClick={() => setActiveMenu('pacientes')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
              activeMenu === 'pacientes'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Users className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Pacientes</span>
          </button>

          <button
            onClick={() => setActiveMenu('residentes')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
              activeMenu === 'residentes'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <UserCheck className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Residentes</span>
          </button>

          <button
            onClick={() => setActiveMenu('locais')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
              activeMenu === 'locais'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <MapPin className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Locais</span>
          </button>

          <button
            onClick={() => setActiveMenu('servicos')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
              activeMenu === 'servicos'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Wrench className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Serviços</span>
          </button>

          <button
            onClick={() => setActiveMenu('escalas')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
              activeMenu === 'escalas'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Escalas</span>
          </button>

          <button
            onClick={() => setActiveMenu('criar-escala')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
              activeMenu === 'criar-escala'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Plus className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Criar Escala</span>
          </button>

          <button
            onClick={() => setActiveMenu('troca')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors relative whitespace-nowrap ${
              activeMenu === 'troca'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <RefreshCw className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Trocas</span>
            {notificacoesTroca > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {notificacoesTroca}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMenu('ferias')}
            className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors relative whitespace-nowrap ${
              activeMenu === 'ferias'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Férias</span>
            {feriasPendentes.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {feriasPendentes.length}
              </span>
            )}
          </button>

          <button
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
          </button>
        </div>
      </div>
    </div>
  );
}
