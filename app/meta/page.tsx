'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { BarChart3, RefreshCw, Calendar, Menu, X, MessageSquare, Bell, Plus, Trash2, Edit, Stethoscope, FlaskConical, FileText, User as UserIcon, Shield, ShieldCheck, ChevronDown, ChevronUp, Activity, Weight, Send, AlertCircle, Clock, Phone, AlertTriangle, ChevronLeft, ChevronRight, UtensilsCrossed, Dumbbell, Eye, DollarSign, CheckCircle } from 'lucide-react';
import { UserService } from '@/services/userService';
import { Escala, Local, Servico, Residente } from '@/types/auth';
import { Troca } from '@/types/troca';
import { Ferias } from '@/types/ferias';
// import { InternalNotificationService } from '@/services/internalNotificationService';
import { MensagemService } from '@/services/mensagemService';
import { MensagemResidente, MensagemResidenteParaAdmin } from '@/types/mensagem';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { GoogleCalendarService } from '@/services/googleCalendarService';
import { PacienteMensagemService, PacienteMensagem } from '@/services/pacienteMensagemService';
import { MedicoService } from '@/services/medicoService';
import { Medico } from '@/types/medico';
import { estadosCidades, estadosList } from '@/data/cidades-brasil';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import { SolicitacaoMedico, MOTIVOS_DESISTENCIA, MOTIVOS_ABANDONO_TRATAMENTO } from '@/types/solicitacaoMedico';
import { CidadeCustomizadaService } from '@/services/cidadeCustomizadaService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { buildExpectedCurveDoseDrivenAnchored, buildSuggestedDoseSchedule, predictHbA1c, predictWaistCircumference } from '@/utils/expectedCurve';
import { getLabRange, Sex } from '@/types/labRanges';
import { LabRangeBar } from '@/components/LabRangeBar';
import TrendLine from '@/components/TrendLine';
import FAQChat from '@/components/FAQChat';
import NutriContent from '@/components/NutriContent';
import { IndicacaoService } from '@/services/indicacaoService';
import { Indicacao } from '@/types/indicacao';

export default function MetaPage() {
  const [activeMenu, setActiveMenu] = useState('estatisticas');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locais, setLocais] = useState<Local[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [userEscalas, setUserEscalas] = useState<Escala[]>([]);
  const [todasEscalas, setTodasEscalas] = useState<Escala[]>([]);
  const [filtroTempo, setFiltroTempo] = useState<'ano' | 'mes' | 'semana'>('semana');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  
  // Estados para exames
  const [exameDataSelecionada, setExameDataSelecionada] = useState('');
  const [showSeletorFlutuanteExames, setShowSeletorFlutuanteExames] = useState(false);
  
  // Estados para busca de médicos
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [estadoBuscaMedico, setEstadoBuscaMedico] = useState<string>('');
  const [cidadeBuscaMedico, setCidadeBuscaMedico] = useState<string>('');
  const [showModalMedico, setShowModalMedico] = useState(false);
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null);
  const [telefonePaciente, setTelefonePaciente] = useState<string>('');
  
  // Estados para Google Calendar
  const [googleCalendarAutorizado, setGoogleCalendarAutorizado] = useState(false);
  const [loadingGoogleCalendar, setLoadingGoogleCalendar] = useState(false);
  const [sincronizandoCalendar, setSincronizandoCalendar] = useState(false);
  const [mensagemCalendar, setMensagemCalendar] = useState<string>('');
  const [tipoMensagemCalendar, setTipoMensagemCalendar] = useState<'success' | 'error' | ''>('');

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
  const [abaAtivaMedicos, setAbaAtivaMedicos] = useState<'buscar' | 'solicitacoes' | 'meu-medico'>('buscar');
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
  
  // Estados para Indicação
  const [activeTabIndicar, setActiveTabIndicar] = useState<'indicar' | 'minhas'>('indicar');
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (!user) {
        // Se não estiver autenticado, redirecionar para a página principal
        // O usuário será induzido a fazer login ao clicar nos botões
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
    if (!user?.email) return;
    
    setLoadingPaciente(true);
    try {
      console.log('Carregando paciente para email:', user.email);
      const pacienteData = await PacienteService.getPacienteByEmail(user.email);
      console.log('Paciente encontrado:', pacienteData ? pacienteData.nome : 'nenhum');
      console.log('Status do tratamento:', pacienteData?.statusTratamento);
      setPaciente(pacienteData);
      
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
    } catch (error) {
      console.error('Erro ao carregar paciente:', error);
      setPaciente(null);
      setMedicoResponsavel(null);
    } finally {
      setLoadingPaciente(false);
    }
  }, [user?.email]);

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

  // Carregar dados do paciente e mensagens quando o usuário estiver logado
  useEffect(() => {
    if (user && user.email) {
      loadPaciente();
      loadMensagensPacienteAtual();
    }
  }, [user, loadPaciente, loadMensagensPacienteAtual]);

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
  }, [user, loadData, loadTrocas, loadFerias, loadMensagens, loadMensagensEnviadas]);

  // Carregar todos os médicos e extrair estados/cidades disponíveis quando entrar na página Médicos
  useEffect(() => {
    const loadMedicosDisponiveis = async () => {
      if (user && activeMenu === 'medicos' && abaAtivaMedicos === 'buscar') {
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

    loadMedicosDisponiveis();
  }, [user, activeMenu, abaAtivaMedicos]);

  // Carregar solicitações quando entrar na página Médicos
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

  const renderContent = () => {
    switch (activeMenu) {
      case 'estatisticas': {
        const evolucao = paciente?.evolucaoSeguimento || [];
        const planoTerapeutico = paciente?.planoTerapeutico;
        const medidasIniciais = paciente?.dadosClinicos?.medidasIniciais;
        
        // Calcular estatísticas básicas
        const semanasTratamento = evolucao.length;
        const pesoInicial = medidasIniciais?.peso || 0;
        // Peso Atual: sempre do último registro de aplicação (evolucaoSeguimento)
        const ultimoPeso = evolucao.length > 0 
          ? (evolucao[evolucao.length - 1]?.peso || null)
          : null;
        const perdaPesoAcumulado = pesoInicial > 0 && ultimoPeso && ultimoPeso > 0 ? pesoInicial - ultimoPeso : 0;
        
        // HbA1c atual (sempre do último registro de aplicação)
        const hba1cAtual = evolucao.length > 0 
          ? evolucao[evolucao.length - 1]?.hba1c || 0
          : 0;
        
        // Circunferência abdominal atual: sempre do último registro de aplicação
        const ultimaCircunferencia = evolucao.length > 0 
          ? (evolucao[evolucao.length - 1]?.circunferenciaAbdominal || null)
          : null;

        const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
        const imcAtual = alturaMetros && ultimoPeso > 0 ? ultimoPeso / (alturaMetros * alturaMetros) : null;
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
        const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
        const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
        
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

        // Preparar dados para gráfico de peso (últimas 4 semanas)
        const seguimentoOrdem = evolucao.sort((a, b) => {
          const dateA = new Date(a.dataRegistro);
          const dateB = new Date(b.dataRegistro);
          return dateA.getTime() - dateB.getTime();
        });
        
        const ultimas4Semanas = seguimentoOrdem.slice(-4);
        const indiceInicial = Math.max(1, semanasTratamento - ultimas4Semanas.length + 1);
        
        const pesoChartData = ultimas4Semanas.map((s) => {
          const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
          return {
            semana: s.weekIndex,
            previsto: expectedWeek?.expectedWeightKg || null,
            real: s.peso || null
          };
        });

        // Preparar dados para gráfico de circunferência abdominal (últimas 4 semanas)
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

        // Preparar dados para gráfico de HbA1c (últimas 4 semanas)
        // Base HbA1c sempre do primeiro registro de aplicação
        const primeiroRegistroHbA1c = evolucao.find(e => e.hba1c);
        const baseHbA1c = primeiroRegistroHbA1c?.hba1c || 0;
        
        const hba1cData = ultimas4Semanas.map((s) => {
          const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
          let previsto = null;
          if (baseHbA1c && expectedWeek?.doseMg) {
            if (s.weekIndex === 1) {
              previsto = baseHbA1c;
                    } else {
              previsto = predictHbA1c({
                baselineHbA1c: baseHbA1c,
                weekIndex: s.weekIndex,
                doseAchievedMg: expectedWeek.doseMg
              });
            }
          }
          
          return {
            semana: s.weekIndex,
            hba1c: s.hba1c || null,
            previsto: previsto
          };
        });
        
        const metaHba1c = planoTerapeutico?.metas?.hba1cTargetType;
        const metaValue = metaHba1c ? parseFloat(metaHba1c.replace('≤', '')) : null;

        // Preparar dados para gráfico de IMC (últimas 4 semanas)
        const imcChartData = alturaMetros ? ultimas4Semanas.map((s) => {
          const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
          const imcReal = s.peso && alturaMetros ? s.peso / (alturaMetros * alturaMetros) : null;
          const imcPrevisto = expectedWeek?.expectedWeightKg && alturaMetros 
            ? expectedWeek.expectedWeightKg / (alturaMetros * alturaMetros) 
            : null;
          return {
            semana: s.weekIndex,
            imc: imcReal,
            previsto: imcPrevisto
          };
        }) : [];

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Estatísticas de Tratamento</h2>
              {!paciente?.medicoResponsavelId && (
                <button
                  onClick={() => setActiveMenu('medicos')}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Stethoscope size={16} />
                  Encontrar um Médico
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Semanas de Tratamento</p>
                    <p className="text-2xl font-semibold text-gray-900">{semanasTratamento}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <RefreshCw className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Perda de Peso Acumulado</p>
                    <p className="text-2xl font-semibold text-gray-900">{perdaPesoAcumulado.toFixed(1)} kg</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">HbA1c Atual</p>
                    <p className="text-2xl font-semibold text-gray-900">{hba1cAtual > 0 ? hba1cAtual.toFixed(1) + '%' : '-'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <RefreshCw className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Circunferência Abdominal Atual</p>
                    <p className="text-2xl font-semibold text-gray-900">{ultimaCircunferencia && ultimaCircunferencia > 0 ? ultimaCircunferencia.toFixed(1) + ' cm' : '-'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-emerald-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">IMC Atual</p>
                    <p className="text-2xl font-semibold text-gray-900">{imcAtual ? imcAtual.toFixed(1) : '-'}</p>
                    <p className="text-sm text-gray-500">{tipoObesidade || 'Sem classificação'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Weight className="h-8 w-8 text-rose-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Peso Atual</p>
                    <p className="text-2xl font-semibold text-gray-900">{ultimoPeso && ultimoPeso > 0 ? `${ultimoPeso.toFixed(1)} kg` : '-'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Gráficos - Últimas 4 Semanas (Real vs Previsto) */}
            {semanasTratamento > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gráfico de Peso */}
                {baselineWeight > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Peso (últimas 4 semanas)</h3>
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
                                formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)} kg` : 'N/A'}
                                labelFormatter={(label) => `Semana ${label}`}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
                )}

                {/* Gráfico de Circunferência Abdominal */}
                {baseCircAbdominal > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Circunferência Abdominal (últimas 4 semanas)</h3>
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
                                formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)} cm` : 'N/A'}
                                labelFormatter={(label) => `Semana ${label}`}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
                )}

                {/* Gráfico de IMC */}
                {alturaMetros && imcChartData.length > 0 && imcChartData.some(d => d.imc !== null) && (
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">IMC (últimas 4 semanas)</h3>
                    {(() => {
                      const valuesWithPrevisto = imcChartData.map(d => d.previsto).filter(v => v !== null) as number[];
                      const valuesWithReal = imcChartData.map(d => d.imc).filter(v => v !== null) as number[];
                      const allValues = [...valuesWithPrevisto, ...valuesWithReal];
                      if (allValues.length === 0) return null;
                      const minValue = Math.min(...allValues);
                      const maxValue = Math.max(...allValues);
                      const range = maxValue - minValue;
                      // Ajustar escala para valores mais arredondados e com 2 casas decimais
                      const domainMin = Math.max(0, Math.floor((minValue - range * 0.1) * 100) / 100);
                      const domainMax = Math.ceil((maxValue + range * 0.1) * 100) / 100;

                      return (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={imcChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="semana" 
                                label={{ value: 'Semana', position: 'bottom', offset: -5, style: { textAnchor: 'middle' } }}
                              />
                              <YAxis 
                                label={{ value: 'IMC (kg/m²)', angle: -90, position: 'insideLeft' }}
                                domain={[domainMin, domainMax]}
                                tickFormatter={(value) => parseFloat(value.toFixed(2)).toString()}
                                width={60}
                              />
                              <Tooltip 
                                formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)} kg/m²` : 'N/A'}
                                labelFormatter={(label) => `Semana ${label}`}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Line 
                                type="monotone" 
                                dataKey="previsto" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="IMC Previsto"
                                dot={{ fill: '#3b82f6', r: 3 }}
                                legendType="line"
                              />
                              <Line 
                                type="monotone" 
                                dataKey="imc" 
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
                )}

                {/* Gráfico de HbA1c */}
                {baseHbA1c && (
                  <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      HbA1c (últimas 4 semanas)
                      {metaValue && <span className="text-sm font-normal text-gray-600 ml-2">(Meta: {'<'} {metaValue}%)</span>}
                    </h3>
                    {(() => {
                      const valuesWithPrevisto = hba1cData.map(d => d.previsto).filter(v => v !== null) as number[];
                      const valuesWithReal = hba1cData.map(d => d.hba1c).filter(v => v !== null) as number[];
                      const allValues = [...valuesWithPrevisto, ...valuesWithReal];
                      const minValue = Math.min(...allValues);
                      const maxValue = Math.max(...allValues);
                      const range = maxValue - minValue;
                      const domainMin = Math.max(0, minValue - range * 0.2);
                      const domainMax = maxValue + range * 0.2;

                        return (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hba1cData}>
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
                                formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)}%` : 'N/A'}
                                labelFormatter={(label) => `Semana ${label}`}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Line 
                                type="monotone" 
                                dataKey="previsto" 
                                stroke="#6366f1" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="HbA1c Prevista"
                                dot={false}
                                legendType="line"
                              />
                              <Line 
                                type="monotone" 
                                dataKey="hba1c" 
                                stroke="#8b5cf6" 
                                strokeWidth={2}
                                name="HbA1c Real"
                                dot={{ fill: '#8b5cf6', r: 4 }}
                              />
                              {metaValue && (
                                <Line 
                                  type="monotone" 
                                  data={hba1cData.map(d => ({ ...d, meta: metaValue }))}
                                  dataKey="meta" 
                                  stroke="#ef4444" 
                                  strokeWidth={1}
                                  strokeDasharray="5 5"
                                  name="Meta"
                                  dot={false}
                                  legendType="line"
                                />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
              </div>
                )}
            </div>
            )}

            {/* Link para buscar médico se não tiver */}
            {!paciente?.medicoResponsavelId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Stethoscope className="mx-auto h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Você ainda não tem um médico responsável</h3>
                <p className="text-gray-600 mb-4">Busque um médico na sua região para iniciar seu tratamento.</p>
                <button
                  onClick={() => setActiveMenu('medicos')}
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
        const exameSelecionado = {
          glicemiaJejum: exameOriginal.glicemiaJejum || null,
          hemoglobinaGlicada: exameOriginal.hemoglobinaGlicada || null,
          ureia: exameOriginal.ureia || null,
          creatinina: exameOriginal.creatinina || null,
          taxaFiltracaoGlomerular: exameOriginal.taxaFiltracaoGlomerular || null,
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
          vitaminaD: exameOriginal.vitaminaD || null
        };
        
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
        }).reverse();
        
        const pacienteSex = paciente?.dadosIdentificacao?.sexoBiologico as Sex;
        
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
            { key: 'ft4', label: 'T4 Livre (FT4)', field: 'ft4' }
          ]},
          { section: 'Ferro e Vitaminas', fields: [
            { key: 'ferritin', label: 'Ferritina', field: 'ferritina' },
            { key: 'iron', label: 'Ferro sérico', field: 'ferroSerico' },
            { key: 'b12', label: 'Vitamina B12', field: 'vitaminaB12' },
            { key: 'vitaminD', label: 'Vitamina D (25-OH)', field: 'vitaminaD' }
          ]}
        ];

        // Helper: verifica se algum exame tem valor preenchido para o campo
        // Mapeamento de campos do formulário para campos do exame original
        const campoMapping: Record<string, string> = {
          ft4: 't4Livre',
          ferritina: 'ferritina',
          ferroSerico: 'ferroSerico',
          vitaminaB12: 'vitaminaB12',
          vitaminaD: 'vitaminaD'
        };
        
        const campoTemAlgumValor = (fieldKey: string) => {
          // Se houver mapeamento, usar o campo original
          const campoOriginal = campoMapping[fieldKey] || fieldKey;
          return exames.some((exame: any) => {
            const v = (exame as any)[campoOriginal];
            return v !== null && v !== undefined && v !== '';
          });
        };

        if (exames.length === 0) {
                        return (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Exames Laboratoriais</h2>
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <FlaskConical className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum exame registrado</h3>
                <p className="text-gray-500">Seus exames laboratoriais aparecerão aqui.</p>
              </div>
            </div>
          );
        }

        return (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Exames Laboratoriais</h2>
            
            {/* Exibição dos exames */}
            <div className="space-y-6 pb-4">
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
                    if (!range) return null;
                    
                    const value = exameSelecionado[campo.field as keyof typeof exameSelecionado] as number | undefined;

                    return (
                      <div key={campo.field} className="grid grid-cols-1 gap-4 mb-4 last:mb-0">
                        {/* Input e LabRangeBar */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {range.label}
                          </label>
                          <div className="text-lg font-semibold text-gray-900 mb-2">
                            {value || '-'}
                            {value && range.unit && ` ${range.unit}`}
                          </div>
                          <LabRangeBar range={range} value={value || null} />
                        </div>
                        
                        {/* Gráfico de evolução */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Evolução Temporal
                          </label>
                          {dadosGrafico.length > 0 && dadosGrafico.some(d => d[campo.field as keyof typeof d[0]] !== null) ? (
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
          </div>
        );
      }

      case 'plano': {
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
        
        // Calcular próxima dose
        const calcularProximaDose = () => {
          if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
            return null;
          }
          
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          
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
          const diaHoje = hoje.getDay();
          
          let diasParaProximo = (diaDesejado - diaHoje + 7) % 7;
          if (diasParaProximo === 0) diasParaProximo = 7; // Semana que vem
          
          const proximaData = new Date(hoje);
          proximaData.setDate(hoje.getDate() + diasParaProximo);
          
          return proximaData;
        };
        
        const proximaDose = calcularProximaDose();
        
        // Criar calendário de doses
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
          
          // Ajustar primeira dose para o dia da semana correto (sem mutar startDate original)
          const primeiraDose = new Date(planoTerapeutico.startDate);
          primeiraDose.setHours(0, 0, 0, 0);
          while (primeiraDose.getDay() !== diaDesejado) {
            primeiraDose.setDate(primeiraDose.getDate() + 1);
          }
          
          // Obter dose inicial do plano
          const doseInicial = planoTerapeutico.currentDoseMg || 2.5;
          
          const calendario = [];
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          
          // Obter número de semanas do tratamento (padrão: 18)
          const numeroSemanas = planoTerapeutico?.numeroSemanasTratamento || 18;
          
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
                const dataRegistro = new Date(e.dataRegistro);
                if (isNaN(dataRegistro.getTime())) return false;
                dataRegistro.setHours(0, 0, 0, 0);
                const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
                return diffDias <= 1; // Tolerância de 1 dia
              });
              
              // Se encontrou registro e houve atraso de 4+ dias
              if (registro && registro.dataRegistro) {
                const dataRegistro = new Date(registro.dataRegistro);
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
          
          // Criar calendário baseado no número de semanas definido
          for (let semana = 0; semana < numeroSemanas; semana++) {
            // Calcular data da dose como primeiraDose + (semana * 7 dias)
            const dataDose = new Date(primeiraDose);
            dataDose.setDate(primeiraDose.getDate() + (semana * 7));
            
            // Calcular dose planejada considerando atrasos (reinicia ciclo se atraso >= 4 dias)
            const dosePlanejada = calcularDoseComAtrasos(semana);
            
            // Encontrar registro de evolução para esta data (com tolerância de ±1 dia)
            const registroEvolucao = evolucao.find(e => {
              const dataRegistro = new Date(e.dataRegistro);
              dataRegistro.setHours(0, 0, 0, 0);
              const diffDias = Math.abs((dataRegistro.getTime() - dataDose.getTime()) / (1000 * 60 * 60 * 24));
              return diffDias <= 1; // Tolerância de 1 dia
            });
            
            // Determinar dose real (do registro ou planejada)
            let doseReal = dosePlanejada;
            if (registroEvolucao?.doseAplicada) {
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
              adherence: registroEvolucao?.adherence || null,
              localAplicacao: registroEvolucao?.localAplicacao || null
            });
          }
          
          return calendario;
        };
        
        const calendario = criarCalendarioDoses();
        
        if (!planoTerapeutico) {
                                return (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Plano Terapêutico</h2>
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum plano cadastrado</h3>
                <p className="text-gray-500">Seu plano terapêutico aparecerá aqui.</p>
              </div>
            </div>
          );
        }
        
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Plano Terapêutico</h2>
            
            {/* Informações do Plano */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              {/* Botão de Google Calendar */}
              {user?.email && paciente && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  {/* Mensagem de feedback */}
                  {mensagemCalendar && (
                    <div className={`mb-4 p-3 rounded-md ${
                      tipoMensagemCalendar === 'success' 
                        ? 'bg-green-100 border border-green-400 text-green-800' 
                        : 'bg-red-100 border border-red-400 text-red-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{mensagemCalendar}</p>
                        <button
                          onClick={() => {
                            setMensagemCalendar('');
                            setTipoMensagemCalendar('');
                          }}
                          className="ml-4 text-current opacity-70 hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">
                        Sincronização com Google Calendar
                      </h4>
                      <p className="text-xs text-blue-700">
                        {googleCalendarAutorizado 
                          ? 'Suas aplicações estão sincronizadas. Novos eventos serão adicionados automaticamente.'
                          : 'Autorize o acesso ao Google Calendar para sincronizar todas as datas de aplicação automaticamente.'}
                      </p>
                      {sincronizandoCalendar && (
                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-2">
                          <RefreshCw size={12} className="animate-spin" />
                          Sincronizando eventos...
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!googleCalendarAutorizado ? (
                        <button
                          onClick={async () => {
                            if (!user?.email || !paciente?.id) return;
                            setLoadingGoogleCalendar(true);
                            setMensagemCalendar('');
                            setTipoMensagemCalendar('');
                            try {
                              const response = await fetch(`/api/google-calendar/auth?userId=${paciente.id}&email=${encodeURIComponent(user.email)}&tipo=paciente`);
                              
                              if (!response.ok) {
                                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                                throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
                              }
                              
                              const data = await response.json();
                              if (data.authUrl) {
                                window.location.href = data.authUrl;
                              } else {
                                const errorMsg = data.error || 'Erro ao obter URL de autorização. Verifique se GOOGLE_CLIENT_ID está configurado.';
                                setMensagemCalendar(errorMsg);
                                setTipoMensagemCalendar('error');
                              }
                            } catch (error) {
                              console.error('Erro ao autorizar Google Calendar:', error);
                              const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao autorizar Google Calendar';
                              setMensagemCalendar(`Erro: ${errorMessage}. Verifique se GOOGLE_CLIENT_ID está configurado no Vercel.`);
                              setTipoMensagemCalendar('error');
                            } finally {
                              setLoadingGoogleCalendar(false);
                            }
                          }}
                          disabled={loadingGoogleCalendar}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <Calendar size={16} />
                          {loadingGoogleCalendar ? 'Verificando...' : 'Autorizar Google Calendar'}
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            if (!paciente?.id) return;
                            setSincronizandoCalendar(true);
                            setMensagemCalendar('');
                            setTipoMensagemCalendar('');
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
                                setMensagemCalendar(`Sincronização concluída! ${data.eventsCreated || 0} eventos foram adicionados ao seu Google Calendar.`);
                                setTipoMensagemCalendar('success');
                                // Atualizar verificação
                                await verificarAutorizacaoGoogleCalendar();
                              } else {
                                setMensagemCalendar(`Erro ao sincronizar: ${data.error || 'Erro desconhecido'}`);
                                setTipoMensagemCalendar('error');
                              }
                            } catch (error) {
                              console.error('Erro ao sincronizar Google Calendar:', error);
                              setMensagemCalendar('Erro ao sincronizar eventos. Tente novamente.');
                              setTipoMensagemCalendar('error');
                            } finally {
                              setSincronizandoCalendar(false);
                              // Limpar mensagem após 10 segundos
                              setTimeout(() => {
                                setMensagemCalendar('');
                                setTipoMensagemCalendar('');
                              }, 10000);
                            }
                          }}
                          disabled={sincronizandoCalendar}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <RefreshCw size={16} className={sincronizandoCalendar ? 'animate-spin' : ''} />
                          {sincronizandoCalendar ? 'Sincronizando...' : 'Sincronizar Agora'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Início</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {planoTerapeutico.startDate 
                      ? new Date(planoTerapeutico.startDate).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dia da Aplicação</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {planoTerapeutico.injectionDayOfWeek 
                      ? diaSemanaNome(planoTerapeutico.injectionDayOfWeek)
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dose Atual</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {planoTerapeutico.currentDoseMg 
                      ? `${planoTerapeutico.currentDoseMg} mg`
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {planoTerapeutico.titrationStatus || '-'}
                  </p>
                </div>
                {proximaDose && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Próxima Dose</label>
                    <p className="text-lg font-semibold text-green-600">
                      {proximaDose.toLocaleDateString('pt-BR')} ({diaSemanaNome(planoTerapeutico.injectionDayOfWeek)})
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Calendário de Doses */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Medicações</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {calendario.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-md border ${
                      item.status === 'tomada' 
                        ? 'bg-green-50 border-green-200' 
                        : item.status === 'perdida'
                        ? 'bg-red-50 border-red-200'
                        : item.status === 'hoje'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 text-center">
                        <div className="text-xs text-gray-500">Semana</div>
                        <div className="text-lg font-bold text-gray-900">{item.semana}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-600">
                          {item.data.toLocaleDateString('pt-BR')} ({diaSemanaNome(planoTerapeutico.injectionDayOfWeek)})
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
                      {item.status === 'hoje' && (
                        <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                          Hoje
                                      </span>
                      )}
                      {item.status === 'futura' && (
                        <span className="px-3 py-1 bg-gray-400 text-white text-xs font-medium rounded-full">
                          Futura
                        </span>
                      )}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        );
      }

      case 'nutri': {
        if (!paciente) {
          return (
            <div className="space-y-4">
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Paciente não encontrado</h3>
                <p className="text-gray-500">Não foi possível carregar seus dados.</p>
              </div>
            </div>
          );
        }
        
        return <NutriContent paciente={paciente} />;
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
              nomePaciente: indicacaoForm.nomePaciente.trim(),
              telefonePaciente: telefoneNormalizado,
              estado: indicacaoForm.estado,
              cidade: indicacaoForm.cidade,
              medicoId: indicacaoForm.medicoId,
              medicoNome: medicoSelecionado.nome
            });

            alert('Indicação enviada com sucesso! O médico será notificado.');
            
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
            console.error('Erro ao salvar indicação:', error);
            alert('Erro ao salvar indicação. Tente novamente.');
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
            <h2 className="text-xl font-bold text-gray-900">Indicar</h2>
            
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
                  Plano de Indicação
                </button>
                <button
                  onClick={() => {
                    setActiveTabIndicar('minhas');
                    if (minhasIndicacoes.length === 0 && user?.email && !loadingIndicacoes) {
                      loadMinhasIndicacoes();
                    }
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTabIndicar === 'minhas'
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Minhas Indicações
                </button>
              </div>

              {/* Conteúdo das tabs */}
              <div className="p-6">
                {activeTabIndicar === 'indicar' ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">💰 Ganhe dinheiro indicando!</h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Indique pacientes para médicos cadastrados e ganhe comissão quando eles se tornarem clientes.
                      </p>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">
                          <strong>Como funciona:</strong>
                        </p>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                          <li>Selecione o médico que receberá a indicação</li>
                          <li>Preencha os dados do paciente que você está indicando</li>
                          <li>Quando o paciente se cadastrar, você recebe comissão!</li>
                        </ul>
                      </div>
                    </div>

                    {/* Seção: Seleção do Médico */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">Selecione o médico que receberá a indicação</h4>
                      
                      {/* Estado */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estado *
                        </label>
                      <select
                        value={indicacaoForm.estado}
                        onChange={(e) => {
                          setIndicacaoForm({
                            ...indicacaoForm,
                            estado: e.target.value,
                            cidade: '', // Resetar cidade quando mudar estado
                            medicoId: '' // Resetar médico quando mudar estado
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                      >
                        <option value="">Selecione o estado</option>
                        {estadosList.map((estado) => (
                          <option key={estado.sigla} value={estado.sigla}>
                            {estado.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                      {/* Cidade */}
                      {indicacaoForm.estado && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cidade *
                          </label>
                        <select
                          value={indicacaoForm.cidade}
                          onChange={(e) => {
                            setIndicacaoForm({
                              ...indicacaoForm,
                              cidade: e.target.value,
                              medicoId: '' // Resetar médico quando mudar cidade
                            });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                        >
                          <option value="">Selecione a cidade</option>
                          {cidadesDoEstado.map((cidade) => (
                            <option key={cidade} value={cidade}>
                              {cidade}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                      {/* Médico */}
                      {indicacaoForm.estado && indicacaoForm.cidade && medicosFiltrados.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Médico *
                          </label>
                          <select
                            value={indicacaoForm.medicoId}
                            onChange={(e) => setIndicacaoForm({ ...indicacaoForm, medicoId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                          >
                            <option value="">Selecione o médico</option>
                            {medicosFiltrados.map((medico) => (
                              <option key={medico.id} value={medico.id}>
                                {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                                {medico.temPlanoIndicacao !== false ? ' ✓ Plano de Indicação' : ' (Sem plano)'}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Médicos com "✓ Plano de Indicação" oferecem comissão por indicações.
                          </p>
                        </div>
                      )}

                      {indicacaoForm.estado && indicacaoForm.cidade && medicosFiltrados.length === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            Não há médicos disponíveis para esta cidade. Selecione outra cidade.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Seção: Dados do Paciente Indicado */}
                    {indicacaoForm.medicoId && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Dados do paciente que você está indicando</h4>
                        
                        {/* Nome do paciente */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nome do paciente *
                          </label>
                      <input
                        type="text"
                        value={indicacaoForm.nomePaciente}
                        onChange={(e) => setIndicacaoForm({ ...indicacaoForm, nomePaciente: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                        placeholder="Nome completo do paciente"
                      />
                    </div>

                        {/* Telefone do paciente */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Telefone do paciente * (DDD + 9 dígitos)
                          </label>
                          <input
                            type="tel"
                            value={indicacaoForm.telefonePaciente}
                            onChange={(e) => {
                              let valor = e.target.value.replace(/\D/g, '');
                              // Limitar a 11 dígitos (2 DDD + 9 número)
                              if (valor.length > 11) valor = valor.slice(0, 11);
                              // Formatar enquanto digita
                              let formatado = valor;
                              if (valor.length > 6) {
                                formatado = valor.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                              } else if (valor.length > 2) {
                                formatado = valor.replace(/(\d{2})(\d{0,5})/, '($1) $2');
                              } else if (valor.length > 0) {
                                formatado = `(${valor}`;
                              }
                              setIndicacaoForm({ ...indicacaoForm, telefonePaciente: formatado });
                            }}
                            onBlur={(e) => {
                              const telefone = e.target.value.replace(/\D/g, '');
                              if (telefone.length > 0 && !validarTelefone(telefone)) {
                                // Não limpar, apenas mostrar erro visual
                                e.target.classList.add('border-red-500');
                              } else {
                                e.target.classList.remove('border-red-500');
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                            placeholder="(11) 98765-4321"
                            maxLength={15}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Digite o DDD e o número com 9 dígitos. Este telefone será usado para identificar quando o paciente se cadastrar no sistema.
                          </p>
                          {indicacaoForm.telefonePaciente && !validarTelefone(indicacaoForm.telefonePaciente) && (
                            <p className="text-xs text-red-600 mt-1">
                              Telefone inválido. Digite o DDD (2 dígitos) e o número com 9 dígitos.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botão salvar */}
                    <button
                      onClick={handleSalvarIndicacao}
                      disabled={salvandoIndicacao || !indicacaoForm.estado || !indicacaoForm.cidade || !indicacaoForm.medicoId || !indicacaoForm.nomePaciente || !indicacaoForm.telefonePaciente}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      {salvandoIndicacao ? 'Enviando...' : 'Enviar Indicação'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Minhas Indicações</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Acompanhe o status das suas indicações e quando elas viram venda.
                      </p>
                    </div>

                    {loadingIndicacoes ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-4">Carregando indicações...</p>
                      </div>
                    ) : minhasIndicacoes.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Você ainda não fez nenhuma indicação.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {minhasIndicacoes.map((indicacao) => {
                          const statusInfo = getStatusLabel(indicacao.status);
                          const StatusIcon = statusInfo.icon;
                          
                          return (
                            <div key={indicacao.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="text-base font-semibold text-gray-900 mb-1">
                                    {indicacao.nomePaciente}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {indicacao.cidade}, {indicacao.estado}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Indicado para: {indicacao.medicoNome}
                                  </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusInfo.label}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200">
                                <div>
                                  <p className="text-xs text-gray-500">Data da indicação</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {indicacao.criadoEm.toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                {indicacao.visualizadaEm && (
                                  <div>
                                    <p className="text-xs text-gray-500">Visualizada em</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {indicacao.visualizadaEm.toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                )}
                                {indicacao.virouVendaEm && (
                                  <div>
                                    <p className="text-xs text-gray-500">Virou venda em</p>
                                    <p className="text-sm font-medium text-green-700">
                                      {indicacao.virouVendaEm.toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                )}
                                {indicacao.pagaEm && (
                                  <div>
                                    <p className="text-xs text-gray-500">Paga em</p>
                                    <p className="text-sm font-medium text-purple-700">
                                      {indicacao.pagaEm.toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                )}
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
        if (!paciente) {
          return (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Meu Perfil</h2>
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dados não encontrados</h3>
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
            <h2 className="text-xl font-bold text-gray-900">Meu Perfil</h2>
            
            {/* Dados de Identificação */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados de Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome Completo</label>
                  <p className="text-base font-semibold text-gray-900">{dados?.nomeCompleto || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">E-mail</label>
                  <p className="text-base font-semibold text-gray-900">{paciente.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telefone</label>
                  <p className="text-base font-semibold text-gray-900">{dados?.telefone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">CPF</label>
                  <p className="text-base font-semibold text-gray-900">{dados?.cpf || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Nascimento</label>
                  <p className="text-base font-semibold text-gray-900">
                    {dados?.dataNascimento 
                      ? new Date(dados.dataNascimento).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sexo Biológico</label>
                  <p className="text-base font-semibold text-gray-900">{formatarSexo(dados?.sexoBiologico)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">CEP</label>
                  <p className="text-base font-semibold text-gray-900">{dados?.cep || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Endereço</label>
                  <p className="text-base font-semibold text-gray-900">
                    {dados?.rua ? `${dados.rua}, ${dados.cidade}/${dados.estado}` : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Cadastro</label>
                  <p className="text-base font-semibold text-gray-900">
                    {dados?.dataCadastro 
                      ? new Date(dados.dataCadastro).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                </div>
                {medicoResponsavel && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Médico Responsável</label>
                    <p className="text-base font-semibold text-gray-900">
                      {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Dados Clínicos */}
            {clinicos && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Clínicos da Anamnese</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Medidas Iniciais */}
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Medidas Iniciais</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Peso</label>
                        <p className="text-sm font-semibold text-gray-900">
                          {clinicos.medidasIniciais?.peso ? `${clinicos.medidasIniciais.peso} kg` : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Altura</label>
                        <p className="text-sm font-semibold text-gray-900">
                          {clinicos.medidasIniciais?.altura ? `${clinicos.medidasIniciais.altura} cm` : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">IMC</label>
                        <p className="text-sm font-semibold text-gray-900">
                          {clinicos.medidasIniciais?.imc 
                            ? `${clinicos.medidasIniciais.imc.toFixed(1)} kg/m²` 
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Circunferência Abdominal</label>
                        <p className="text-sm font-semibold text-gray-900">
                          {clinicos.medidasIniciais?.circunferenciaAbdominal 
                            ? `${clinicos.medidasIniciais.circunferenciaAbdominal} cm` 
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Diagnóstico Principal */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Diagnóstico Principal</label>
                    <p className="text-base font-semibold text-gray-900">
                      {clinicos.diagnosticoPrincipal?.tipo || '-'}
                    </p>
                  </div>
                  
                  {/* Tireoide */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">História Tireoidiana</label>
                    <p className="text-base font-semibold text-gray-900">
                      {clinicos.historiaTireoidiana?.tipo || '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Estilo de Vida */}
            {estiloVida && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estilo de Vida</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Padrão Alimentar</label>
                    <p className="text-base font-semibold text-gray-900">
                      {formatarPadraoAlimentar(estiloVida.padraoAlimentar)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Frequência Alimentar</label>
                    <p className="text-base font-semibold text-gray-900">
                      {formatarFrequenciaAlimentar(estiloVida.frequenciaAlimentar)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ingestão de Líquidos</label>
                    <p className="text-base font-semibold text-gray-900">
                      {estiloVida.ingestaoLiquidos ? `${estiloVida.ingestaoLiquidos} L/dia` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Atividade Física</label>
                    <p className="text-base font-semibold text-gray-900">
                      {formatarAtividadeFisica(estiloVida.atividadeFisica?.intensidade)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Uso de Álcool</label>
                    <p className="text-base font-semibold text-gray-900">
                      {formatarUsoAlcool(estiloVida.usoAlcool)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tabagismo</label>
                    <p className="text-base font-semibold text-gray-900">
                      {formatarTabagismo(estiloVida.tabagismo)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Sono</label>
                    <p className="text-base font-semibold text-gray-900">
                      {estiloVida.sono ? `${estiloVida.sono} h/noite` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Estresse e Bem-estar</label>
                    <p className="text-base font-semibold text-gray-900">
                      {formatarEstresse(estiloVida.estresseEmocional?.nivel)}
                    </p>
                  </div>
                </div>
                
                {/* Observações Clínicas */}
                {estiloVida.observacoesClinicas && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-500">Observações Clínicas</label>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mt-2">
                      {estiloVida.observacoesClinicas}
                    </p>
                  </div>
                )}
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
              <h2 className="text-2xl font-bold text-gray-900">Trocas</h2>
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
              <h2 className="text-2xl font-bold text-gray-900">Trocas</h2>
              {solicitacoesPendentes.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {solicitacoesPendentes.length} solicitação(ões) pendente(s)
                </span>
              )}
            </div>

            {/* Formulário de Solicitação de Troca */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Solicitar Troca</h3>
              
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma solicitação de troca no momento</h3>
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
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma troca solicitada</h3>
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
                              <h4 className="text-sm font-medium text-gray-900">
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
              <h2 className="text-2xl font-bold text-gray-900">Minhas Escalas</h2>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma escala encontrada</h3>
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
                              <h3 className="text-lg font-semibold text-gray-900">
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
                                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
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
                                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
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
            <h2 className="text-2xl font-bold text-gray-900">Sistema de Trocas</h2>
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
              <h2 className="text-2xl font-bold text-gray-900">Férias</h2>
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
              <h2 className="text-2xl font-bold text-gray-900">Férias</h2>
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
                <h3 className="text-lg font-semibold text-gray-900">Minhas Férias</h3>
                
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
                                <h4 className="text-base font-medium text-gray-900">
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Solicitação de Férias</h3>
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
                      <h3 className="text-lg font-semibold text-gray-900">Solicitar Férias</h3>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
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
                    <h3 className="text-lg font-semibold text-gray-900">Editar Férias</h3>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
        // Função para abrir modal de médico
        const abrirModalMedico = (medico: Medico) => {
          // Bloquear se paciente está em tratamento
          if (paciente?.statusTratamento === 'em_tratamento') {
            alert(`Você já está sendo acompanhado por ${medicoResponsavel?.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoResponsavel?.nome}. Não é possível solicitar um novo médico durante o tratamento.`);
            return;
          }
          setMedicoSelecionado(medico);
          setShowModalMedico(true);
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Médicos</h2>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
              <nav className="flex space-x-4">
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
            {abaAtivaMedicos === 'buscar' && (
              <>
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
                <h3 className="text-lg font-semibold text-gray-900">
                  {medicos.length} médico(s) encontrado(s)
                </h3>
                {medicos.map((medico) => {
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

                  return (
                    <div key={medico.id} className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all border ${
                      medico.isVerificado ? 'border-green-200' : 'border-red-200'
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
                              <h4 className="text-base font-semibold text-gray-900 mb-1 break-words">
                                {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {formatarNomeMedico(medico.nome)}
                              </h4>
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
                              </div>
                            </div>

                            {/* Botão Detalhes (esquerda) e Solicitar (direita) na mesma linha */}
                            <div className="flex items-center justify-between gap-3">
                              {/* Botão Detalhes - Canto Esquerdo */}
                              <button
                                onClick={toggleExpandir}
                                className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium"
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
                              <p className="text-sm text-gray-900">
                                {medico.crm.estado} {medico.crm.numero}
                              </p>
                            </div>

                            {/* Endereço */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">📍 Endereço</p>
                              <p className="text-sm text-gray-700 leading-snug mb-1">
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
                                  <p className="text-sm text-gray-900">{medico.telefone}</p>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum médico encontrado</h3>
                <p className="text-gray-500">Não há médicos disponíveis nesta cidade.</p>
              </div>
            )}

            {!estadoBuscaMedico && !cidadeBuscaMedico && (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <Stethoscope className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Busque por localização</h3>
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
                              <h4 className="text-lg font-bold text-gray-900">
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
                                <span className="text-sm text-gray-900">{solicitacao.aceitaEm?.toLocaleDateString('pt-BR')}</span>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma solicitação</h3>
                <p className="text-gray-500">Você ainda não enviou nenhuma solicitação.</p>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Meu Médico</h3>
                  
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
                        <h4 className="text-lg font-bold text-gray-900">
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
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Comunicação</h4>
                    
                    {/* Mensagens recebidas do médico */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Mensagens do Médico</h5>
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
                                  <p className="text-sm text-gray-700 mb-2">{msg.mensagem}</p>
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
      cancelada: { color: 'bg-gray-100 text-gray-800', text: 'Cancelada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="flex">
        {/* Sidebar - Desktop Only */}
        <div className={`hidden lg:flex ${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 bg-white shadow-lg flex-col`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <h1 className="text-xl font-bold text-gray-900">META</h1>
              )}
              <div className="flex items-center space-x-2">
                {/* Novo botão de mensagens médico-paciente - só aparece se tiver médico responsável */}
                {medicoResponsavel && paciente?.statusTratamento === 'em_tratamento' && (
                  <button
                    onClick={() => {
                      setShowMensagensMedicoModal(true);
                      loadMensagensPacienteAtual();
                    }}
                    className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Mensagens com Médico"
                  >
                    <MessageSquare className="w-5 h-5" />
                    {mensagensNaoLidasPaciente > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {mensagensNaoLidasPaciente > 9 ? '9+' : mensagensNaoLidasPaciente}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-md hover:bg-gray-100"
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
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
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
              onClick={() => setActiveMenu('plano')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'plano'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Plano' : ''}
            >
              <FileText className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Plano'}
            </button>

            <button
              onClick={() => setActiveMenu('medicos')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'medicos'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
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

            </nav>

          {/* Profile button with dropdown */}
          <div className="px-4 py-4 border-t border-gray-200 relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              title={sidebarCollapsed ? 'Perfil' : ''}
            >
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Foto do perfil" 
                  className={`w-8 h-8 rounded-full ${sidebarCollapsed ? '' : 'mr-3'}`}
                />
              ) : (
                <div className={`w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center ${sidebarCollapsed ? '' : 'mr-3'}`}>
                  <UserIcon className="w-5 h-5 text-gray-600" />
                </div>
              )}
              {!sidebarCollapsed && (
                <span className="flex-1 text-left">{user?.displayName || 'Perfil'}</span>
              )}
              {!sidebarCollapsed && (
                <ChevronDown className={`w-4 h-4 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {/* Dropdown menu */}
            {showProfileDropdown && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                <button
                  onClick={() => {
                    setActiveMenu('perfil');
                    setShowProfileDropdown(false);
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserIcon className="w-5 h-5 mr-3 text-gray-600" />
                  Ver dados pessoais
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200"
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
        
        {/* Main Content - Full width on mobile, with sidebar offset on desktop */}
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} overflow-x-hidden pb-20 lg:pb-0`}>
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {medicoResponsavel && (
                  <div className="flex items-center">
                    <Stethoscope className="h-6 w-6 text-green-600" />
                    <div className="ml-2">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-bold text-gray-900">
                          {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
                        </div>
                        {medicoResponsavel.isVerificado ? (
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                        ) : (
                          <Shield className="h-4 w-4 text-red-600" />
                        )}
                      </div>
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
                      {paciente?.dadosIdentificacao?.nomeCompleto && (
                        <div className="text-xs text-gray-600">
                          Paciente: {paciente.dadosIdentificacao.nomeCompleto}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* Novo botão de mensagens médico-paciente - só aparece se tiver médico responsável */}
                {medicoResponsavel && paciente?.statusTratamento === 'em_tratamento' && (
                  <button
                    onClick={() => {
                      setShowMensagensMedicoModal(true);
                      loadMensagensPacienteAtual();
                    }}
                    className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Mensagens com Médico"
                  >
                    <MessageSquare className="w-5 h-5" />
                    {mensagensNaoLidasPaciente > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {mensagensNaoLidasPaciente > 9 ? '9+' : mensagensNaoLidasPaciente}
                      </span>
                    )}
                  </button>
                )}
                {/* Botão antigo de mensagens - DESATIVADO (comentado mas não removido) */}
                {/* <button
                  onClick={() => setShowMensagensModal(true)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors opacity-0 pointer-events-none"
                  title="Mensagens"
                  style={{ display: 'none' }}
                >
                  <MessageSquare className="w-5 h-5" />
                  {mensagensNaoLidasPaciente > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {mensagensNaoLidasPaciente > 9 ? '9+' : mensagensNaoLidasPaciente}
                    </span>
                  )}
                </button> */}
                <button
                  onClick={() => setShowRecomendacoesModal(true)}
                  className="relative p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                  title="Recomendações"
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>
                {/* Profile button with dropdown on mobile */}
                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
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
                  
                  {/* Dropdown menu for mobile */}
                  {showProfileDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowProfileDropdown(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[200px]">
                        <button
                          onClick={() => {
                            setActiveMenu('perfil');
                            setShowProfileDropdown(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <UserIcon className="w-5 h-5 mr-3 text-gray-600" />
                          Ver dados pessoais
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200"
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          
          <main className="p-3 lg:p-4">
            {/* Alerta para ler recomendações - Só aparece na página de Estatísticas */}
            {activeMenu === 'estatisticas' && paciente && paciente.medicoResponsavelId && !paciente.recomendacoesLidas && (
              <div className="mb-4 bg-gradient-to-r from-orange-50 to-purple-50 border-l-4 border-orange-500 rounded-lg p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Importante: Leia as Recomendações</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      Para obter os melhores resultados com o tratamento, é essencial que você leia e compreenda as recomendações de alimentação e exercícios físicos.
                    </p>
                    <button
                      onClick={() => setShowRecomendacoesModal(true)}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex justify-around items-center py-1.5">
          <button
            onClick={() => setActiveMenu('estatisticas')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'estatisticas'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Home</span>
          </button>

          <button
            onClick={() => setActiveMenu('exames')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'exames'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <FlaskConical className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Exames</span>
          </button>

          <button
            onClick={() => setActiveMenu('plano')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'plano'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Plano</span>
          </button>

          <button
            onClick={() => setActiveMenu('medicos')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'medicos'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Stethoscope className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Médicos</span>
          </button>

          <button
            onClick={() => setActiveMenu('nutri')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'nutri'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Nutri</span>
          </button>

          <button
            onClick={() => setActiveMenu('indicar')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors flex-1 ${
              activeMenu === 'indicar'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <UserIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Indicar</span>
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
              <div className="fixed bottom-32 right-4 bg-white rounded-lg shadow-xl p-4 z-40 border border-gray-200 w-64">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Selecionar Exame
                  </label>
                  <button
                    onClick={() => setShowSeletorFlutuanteExames(false)}
                    className="text-gray-400 hover:text-gray-600"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 text-sm"
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
              <h3 className="text-lg font-semibold text-gray-900">Mensagens</h3>
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
                            <h3 className="text-lg font-semibold text-gray-900">
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
              <h2 className="text-xl font-bold text-gray-900">Enviar Mensagem para Admin</h2>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Solicitar Médico</h3>
              <button
                onClick={() => {
                  setShowModalMedico(false);
                  setMedicoSelecionado(null);
                  setTelefonePaciente('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-lg font-bold text-gray-900 mb-3">
                  {medicoSelecionado.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoSelecionado.nome}
                </h4>
                
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold">CRM:</span> {medicoSelecionado.crm.estado}-{medicoSelecionado.crm.numero}
                  </p>
                  <p>
                    <span className="font-semibold">Localização:</span> {medicoSelecionado.localizacao.endereco}
                  </p>
                  {medicoSelecionado.telefone && (
                    <p>
                      <span className="font-semibold">Telefone:</span> {medicoSelecionado.telefone}
                    </p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seu número de telefone *
                </label>
                <input
                  type="tel"
                  value={telefonePaciente}
                  onChange={(e) => setTelefonePaciente(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  O médico usará este número para entrar em contato com você
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Ao enviar esta solicitação, o médico receberá uma notificação. Você poderá acompanhar o status da solicitação em suas notificações.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModalMedico(false);
                  setMedicoSelecionado(null);
                  setTelefonePaciente('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!user || !medicoSelecionado) return;

                  // Validar telefone
                  if (!telefonePaciente.trim()) {
                    alert('Por favor, informe seu número de telefone para que o médico possa entrar em contato.');
                    return;
                  }

                  // Bloquear se paciente está em tratamento
                  if (paciente?.statusTratamento === 'em_tratamento') {
                    alert(`Você já está sendo acompanhado por ${medicoResponsavel?.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoResponsavel?.nome}. Não é possível solicitar um novo médico durante o tratamento.`);
                    setShowModalMedico(false);
                    setMedicoSelecionado(null);
                    setTelefonePaciente('');
                    return;
                  }

                  // Verificar se já tem solicitação ativa
                  const solicitacoesExistentes = await SolicitacaoMedicoService.getSolicitacoesPorPaciente(user.email || '');
                  const hasActiveSolicitation = solicitacoesExistentes.some(s => 
                    s.status === 'pendente' || s.status === 'aceita'
                  );

                  if (hasActiveSolicitation) {
                    alert('Você já possui uma solicitação ativa ou aceita. Cancele a solicitação anterior antes de fazer uma nova.');
                    setShowModalMedico(false);
                    setMedicoSelecionado(null);
                    setTelefonePaciente('');
                    return;
                  }

                  try {
                    await SolicitacaoMedicoService.criarSolicitacao({
                      pacienteId: paciente?.id,
                      pacienteEmail: user.email || '',
                      pacienteNome: user.displayName || paciente?.nome || 'Paciente',
                      pacienteTelefone: telefonePaciente.trim(),
                      medicoId: medicoSelecionado.id,
                      medicoNome: medicoSelecionado.nome,
                      status: 'pendente'
                    });

                    // Atualizar listas
                    await loadMinhasSolicitacoes();

                    alert('Solicitação enviada com sucesso! O médico será notificado.');
                    
                    // Abrir WhatsApp com mensagem pré-definida (usar setTimeout para não ser bloqueado pelo alert)
                    setTimeout(() => {
                      if (medicoSelecionado.telefone) {
                        try {
                          // Formatar número de telefone (remover caracteres especiais)
                          let telefoneFormatado = medicoSelecionado.telefone.replace(/\D/g, ''); // Remove tudo que não é dígito
                          
                          // Remover zero inicial se houver
                          if (telefoneFormatado.startsWith('0')) {
                            telefoneFormatado = telefoneFormatado.substring(1);
                          }
                          
                          // Adicionar código do país (55) se não tiver
                          if (!telefoneFormatado.startsWith('55')) {
                            telefoneFormatado = '55' + telefoneFormatado;
                          }
                          
                          console.log('Telefone original:', medicoSelecionado.telefone);
                          console.log('Telefone formatado:', telefoneFormatado);
                          
                          // Criar mensagem pré-definida
                          const tituloMedico = medicoSelecionado.genero === 'F' ? 'Dra.' : 'Dr.';
                          const mensagem = `Olá, ${tituloMedico} ${medicoSelecionado.nome}, estou enviando uma solicitação para cotação de um tratamento com Tirzepatida. Poderia me dar mais informações, por favor.`;
                          
                          // Codificar mensagem para URL
                          const mensagemCodificada = encodeURIComponent(mensagem);
                          
                          // Abrir WhatsApp
                          const whatsappUrl = `https://wa.me/${telefoneFormatado}?text=${mensagemCodificada}`;
                          console.log('URL do WhatsApp:', whatsappUrl);
                          window.open(whatsappUrl, '_blank');
                        } catch (error) {
                          console.error('Erro ao abrir WhatsApp:', error);
                        }
                      } else {
                        console.warn('Médico não possui telefone cadastrado:', medicoSelecionado);
                      }
                    }, 100);
                    
                    setShowModalMedico(false);
                    setMedicoSelecionado(null);
                    setTelefonePaciente('');
                  } catch (error) {
                    console.error('Erro ao solicitar médico:', error);
                    alert('Erro ao enviar solicitação');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Confirmar Solicitação
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
              <h3 className="text-lg font-semibold text-gray-900">Desistir da Solicitação</h3>
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
                  <h2 className="text-xl font-bold text-gray-900">Mensagens com Médico</h2>
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
                                <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{msg.mensagem}</p>
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
                                  <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{msg.mensagem}</p>
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
                  <h2 className="text-xl font-bold text-gray-900">Enviar Mensagem ao Médico</h2>
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
              <h3 className="text-lg font-semibold text-gray-900">Abandonar Tratamento</h3>
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

      {/* FAQ Chat para Paciente - Posicionado no canto inferior esquerdo, acima do menu */}
      {user && (
        <FAQChat
          userName={(paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || user.displayName || 'Paciente').split(' ')[0]}
          position="left"
        />
      )}

      {/* Modal de Recomendações */}
      {showRecomendacoesModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowRecomendacoesModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-6 flex items-center justify-between flex-shrink-0">
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
                      <p className="text-sm text-gray-700 leading-relaxed">
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
                      <p className="text-sm text-gray-700 leading-relaxed">
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

            {/* Checkbox Lido e Compreendido - Só mostra se ainda não leu */}
            {!recomendacoesLidas && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={recomendacoesLidas}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      setRecomendacoesLidas(checked);
                    if (checked && paciente) {
                      try {
                        const pacienteAtualizado = {
                          ...paciente,
                          recomendacoesLidas: true,
                          dataLeituraRecomendacoes: new Date()
                        };
                        await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
                        setPaciente(pacienteAtualizado);
                        
                        // Enviar e-mail para o médico
                        try {
                          await fetch('/api/send-email-check-recomendacoes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pacienteId: paciente.id }),
                          });
                        } catch (emailError) {
                          console.error('Erro ao enviar e-mail de check recomendações:', emailError);
                          // Não bloquear o fluxo se o e-mail falhar
                        }
                        
                        alert('Obrigado por confirmar! Seu médico foi notificado.');
                      } catch (error) {
                        console.error('Erro ao salvar confirmação:', error);
                        alert('Erro ao salvar. Tente novamente.');
                        setRecomendacoesLidas(false);
                      }
                    }
                    }}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    Li e compreendi as recomendações
                  </span>
                </label>
              </div>
            )}

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
    </div>
  );
}