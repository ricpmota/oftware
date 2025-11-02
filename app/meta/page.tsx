'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { BarChart3, RefreshCw, Calendar, Menu, X, MessageSquare, Bell, Plus, Trash2, Edit } from 'lucide-react';
import { UserService } from '@/services/userService';
import { Escala, Local, Servico, Residente } from '@/types/auth';
import { Troca } from '@/types/troca';
import { Ferias } from '@/types/ferias';
// import { InternalNotificationService } from '@/services/internalNotificationService';
import { MensagemService } from '@/services/mensagemService';
import { MensagemResidente, MensagemResidenteParaAdmin } from '@/types/mensagem';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { PacienteMensagemService, PacienteMensagem } from '@/services/pacienteMensagemService';

export default function MetaPage() {
  const [activeMenu, setActiveMenu] = useState('estatisticas');
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
        router.push('/');
        return;
      }
      
      // Verificar se é o usuário master
      if (user.email === 'ricpmota.med@gmail.com') {
        // Usuário master tem acesso a tudo
      } else {
        // Verificar se é admin ou recepção e redirecionar para suas páginas
        UserService.getUserByUid(user.uid).then((userData) => {
          if (userData?.role === 'admin') {
            router.push('/metaadmin');
          } else if (userData?.role === 'recepcao') {
            router.push('/recepcao');
          }
          // Caso contrário, permanece na página /meta (acesso liberado)
        }).catch((error) => {
          console.error('Erro ao verificar role do usuário:', error);
          // Permanece na página /meta mesmo em caso de erro
        });
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Carregar dados do paciente e mensagens quando o usuário estiver logado
  useEffect(() => {
    if (user && user.email) {
      loadPaciente();
      loadMensagensPacienteAtual();
    }
  }, [user, loadPaciente, loadMensagensPacienteAtual]);

  // Função para carregar dados do paciente
  const loadPaciente = useCallback(async () => {
    if (!user?.email) return;
    
    setLoadingPaciente(true);
    try {
      console.log('Carregando paciente para email:', user.email);
      const pacienteData = await PacienteService.getPacienteByEmail(user.email);
      console.log('Paciente encontrado:', pacienteData ? pacienteData.nome : 'nenhum');
      setPaciente(pacienteData);
    } catch (error) {
      console.error('Erro ao carregar paciente:', error);
      setPaciente(null);
    } finally {
      setLoadingPaciente(false);
    }
  }, [user?.email]);

  // Função para carregar mensagens do paciente
  const loadMensagensPacienteAtual = useCallback(async () => {
    if (!user?.email) return;
    
    setLoadingMensagensPaciente(true);
    try {
      const mensagensData = await PacienteMensagemService.getMensagensPaciente(user.email);
      setMensagensPaciente(mensagensData.filter(m => !m.deletada));
      
      // Contar não lidas
      const naoLidas = mensagensData.filter(m => !m.lida && !m.deletada).length;
      setMensagensNaoLidasPaciente(naoLidas);
    } catch (error) {
      console.error('Erro ao carregar mensagens do paciente:', error);
      setMensagensPaciente([]);
    } finally {
      setLoadingMensagensPaciente(false);
    }
  }, [user?.email]);

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
        const totalEscalas = userEscalas.length;
        const totalServicos = userEscalas.reduce((total, escala) => {
          return total + Object.values(escala.dias).reduce((diaTotal, dia) => {
            if (Array.isArray(dia)) {
              return diaTotal + dia.filter(servico => servico.residentes.includes(user?.email || '')).length;
            }
            return diaTotal;
          }, 0);
        }, 0);

        // Encontrar o nível do usuário atual
        const usuarioAtual = residentes.find(r => r.email === user?.email);
        const nivelUsuario = usuarioAtual?.nivel || 'R1'; // Fallback para R1 se não encontrar
        
        // Debug logs para verificar personalização do usuário
        console.log('🔍 DEBUG PERSONALIZAÇÃO DO USUÁRIO:');
        console.log('- Email do usuário logado:', user?.email);
        console.log('- Usuário atual encontrado:', usuarioAtual);
        console.log('- Nível do usuário:', nivelUsuario);
        console.log('- Escalas do usuário:', userEscalas.length);
        console.log('- Total de escalas:', todasEscalas.length);

        // Estatísticas de serviços por turno - agrupado por serviço e local
        const servicosPorTurno = todasEscalas.reduce((acc, escala) => {
          Object.values(escala.dias).forEach(dia => {
            if (Array.isArray(dia)) {
              dia.forEach(servico => {
                const servicoInfo = servicos.find(s => s.id === servico.servicoId);
                const localInfo = locais.find(l => l.id === servico.localId);
                if (!servicoInfo || !localInfo) return;

                const servicoKey = `${servicoInfo.nome} - ${localInfo.nome}`;
                if (!acc[servicoKey]) {
                  acc[servicoKey] = {};
                }

                // Para cada residente do mesmo nível neste serviço
                servico.residentes.forEach(email => {
                  const residente = residentes.find(r => r.email === email);
                  if (residente?.nivel === nivelUsuario && residente) {
                    if (!acc[servicoKey][residente.nome]) {
                      acc[servicoKey][residente.nome] = { 
                        manha: 0, 
                        tarde: 0 
                      };
                    }
                    if (servico.turno === 'manha') {
                      acc[servicoKey][residente.nome].manha += 1;
                    } else {
                      acc[servicoKey][residente.nome].tarde += 1;
                    }
                  }
                });
              });
            }
          });
          return acc;
        }, {} as Record<string, Record<string, { manha: number; tarde: number }>>);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Estatísticas</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFiltroTempo('semana')}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    filtroTempo === 'semana'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setFiltroTempo('mes')}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    filtroTempo === 'mes'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Mês
                </button>
                <button
                  onClick={() => setFiltroTempo('ano')}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    filtroTempo === 'ano'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Ano
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Suas Escalas</p>
                    <p className="text-2xl font-semibold text-gray-900">{totalEscalas}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Serviços Atribuídos</p>
                    <p className="text-2xl font-semibold text-gray-900">{totalServicos}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <RefreshCw className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Trocas Solicitadas</p>
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-3 lg:p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Resumo Semanal</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-600">Dia</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-600">Seg</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-600">Ter</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-600">Qua</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-600">Qui</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-600">Sex</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-600">Sáb</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-600">Dom</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-2 text-sm font-medium text-gray-900">Manhã</td>
                      {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].map((dia) => {
                        const escalasSemanaAtual = getEscalasSemanaAtual();
                        
                        const servicosDoDia = escalasSemanaAtual.flatMap(escala => {
                          const diaData = escala.dias[dia as keyof typeof escala.dias];
                          if (Array.isArray(diaData)) {
                            return diaData.filter(servico => 
                              servico.residentes.includes(user?.email || '') && servico.turno === 'manha'
                            );
                          }
                          return [];
                        });

                        // Verificar se algum serviço é folga
                        const servicoFolga = servicosDoDia.find(servico => {
                          const servicoInfo = servicos.find(s => s.id === servico.servicoId);
                          return servicoInfo?.nome?.toLowerCase().includes('folga');
                        });

                        return (
                          <td key={dia} className="text-center py-2 px-2">
                            {servicoFolga ? (
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full font-bold">
                                F
                              </span>
                            ) : servicosDoDia.length > 0 ? (
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                {servicosDoDia.length}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-sm font-medium text-gray-900">Tarde</td>
                      {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].map((dia) => {
                        const escalasSemanaAtual = getEscalasSemanaAtual();
                        
                        const servicosDoDia = escalasSemanaAtual.flatMap(escala => {
                          const diaData = escala.dias[dia as keyof typeof escala.dias];
                          if (Array.isArray(diaData)) {
                            return diaData.filter(servico => 
                              servico.residentes.includes(user?.email || '') && servico.turno === 'tarde'
                            );
                          }
                          return [];
                        });

                        // Verificar se algum serviço é folga
                        const servicoFolga = servicosDoDia.find(servico => {
                          const servicoInfo = servicos.find(s => s.id === servico.servicoId);
                          return servicoInfo?.nome?.toLowerCase().includes('folga');
                        });

                        return (
                          <td key={dia} className="text-center py-2 px-2">
                            {servicoFolga ? (
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full font-bold">
                                F
                              </span>
                            ) : servicosDoDia.length > 0 ? (
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                {servicosDoDia.length}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>


            {/* Estatísticas por serviço e local */}
            {Object.keys(servicosPorTurno).length > 0 && (
              <div className="bg-white shadow rounded-lg p-3 lg:p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Estatísticas por Serviço - Nível {nivelUsuario}
                </h3>
                <div className="space-y-4">
                  {Object.entries(servicosPorTurno).map(([servicoKey, residentesData]) => (
                    <div key={servicoKey} className="border border-gray-200 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-3 text-center text-sm">{servicoKey}</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1 px-2 text-xs font-medium text-gray-600">Residente</th>
                              <th className="text-center py-1 px-1 text-xs font-medium text-gray-600">M</th>
                              <th className="text-center py-1 px-1 text-xs font-medium text-gray-600">T</th>
                              <th className="text-center py-1 px-1 text-xs font-medium text-gray-600">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // Separar usuário atual dos outros residentes
                              const entries = Object.entries(residentesData);
                              const currentUserEntry = entries.find(([nome]) => nome === usuarioAtual?.nome);
                              const otherEntries = entries.filter(([nome]) => nome !== usuarioAtual?.nome);
                              
                              // Ordenar: usuário atual primeiro, depois os outros
                              const sortedEntries = currentUserEntry ? [currentUserEntry, ...otherEntries] : otherEntries;
                              
                              return sortedEntries.map(([residenteNome, turnos]) => {
                                const isCurrentUser = residenteNome === usuarioAtual?.nome;
                                // Abreviar nome: Ricardo Pinto Mota -> Ricardo P.
                                const nomeAbreviado = residenteNome.split(' ').slice(0, 2).map((parte, index) => 
                                  index === 1 ? `${parte.charAt(0)}.` : parte
                                ).join(' ');
                                
                                return (
                                  <tr 
                                    key={residenteNome} 
                                    className={`border-b border-gray-100 ${
                                      isCurrentUser ? 'bg-green-50' : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <td className={`py-2 px-2 text-xs font-medium ${
                                      isCurrentUser ? 'text-green-800' : 'text-gray-900'
                                    }`}>
                                      {nomeAbreviado}
                                      {isCurrentUser && ' (Você)'}
                                    </td>
                                    <td className="text-center py-2 px-1">
                                      <span className="inline-block px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                        {turnos.manha}
                                      </span>
                                    </td>
                                    <td className="text-center py-2 px-1">
                                      <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                        {turnos.tarde}
                                      </span>
                                    </td>
                                    <td className="text-center py-2 px-1">
                                      <span className="inline-block px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                                        {turnos.manha + turnos.tarde}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
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
                <button
                  onClick={() => setShowMensagensModal(true)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  title="Mensagens"
                >
                  <MessageSquare className="w-5 h-5" />
                  {mensagensNaoLidas > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {mensagensNaoLidas > 9 ? '9+' : mensagensNaoLidas}
                    </span>
                  )}
                </button>
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
              onClick={() => setActiveMenu('escalas')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMenu === 'escalas'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Escalas' : ''}
            >
              <Calendar className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Minhas Escalas'}
            </button>

            <button
              onClick={() => setActiveMenu('troca')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                activeMenu === 'troca'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Trocas' : ''}
            >
              <RefreshCw className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Trocas'}
            </button>

            <button
              onClick={() => setActiveMenu('ferias')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                activeMenu === 'ferias'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Férias' : ''}
            >
              <Calendar className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Férias'}
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
        
        {/* Main Content - Full width on mobile, with sidebar offset on desktop */}
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} overflow-x-hidden pb-20 lg:pb-0`}>
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src="/icones/oftware.png"
                  alt="Oftware Logo"
                  className="h-8 w-8"
                />
                <span className="ml-2 text-lg font-bold text-gray-900">Oftware</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowMensagensModal(true)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  title="Mensagens"
                >
                  <MessageSquare className="w-5 h-5" />
                  {mensagensNaoLidas > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {mensagensNaoLidas > 9 ? '9+' : mensagensNaoLidas}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <main className="p-3 lg:p-4">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Fixed at bottom, no logout button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex justify-around items-center py-2">
          <button
            onClick={() => setActiveMenu('estatisticas')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeMenu === 'estatisticas'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Estatísticas</span>
          </button>

          <button
            onClick={() => setActiveMenu('escalas')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeMenu === 'escalas'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Escalas</span>
          </button>

          <button
            onClick={() => setActiveMenu('troca')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors relative ${
              activeMenu === 'troca'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <RefreshCw className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Trocas</span>
          </button>

          <button
            onClick={() => setActiveMenu('ferias')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors relative ${
              activeMenu === 'ferias'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600'
            }`}
          >
            <Calendar className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Férias</span>
          </button>
        </div>
      </div>

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
    </div>
  );
}