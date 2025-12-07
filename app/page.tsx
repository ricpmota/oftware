'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { 
  Home as HomeIcon,
  Settings, 
  UserCheck, 
  Users, 
  Stethoscope,
  LogOut,
  X,
  Shield,
  Heart,
  Search,
  FileText,
  Users as UsersIcon,
  ArrowRight,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';

// Componente de loading simples com seta da balança caindo
const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        {/* Balança simples com seta caindo */}
        <svg width="120" height="100" viewBox="0 0 120 100" className="mx-auto">
          {/* Base da balança */}
          <rect x="50" y="85" width="20" height="12" fill="#9CA3AF" rx="2" />
          
          {/* Haste central */}
          <rect x="58" y="40" width="4" height="45" fill="#9CA3AF" />
          
          {/* Plataforma da balança */}
          <rect x="20" y="40" width="80" height="6" fill="#D1D5DB" rx="3" />
          
          {/* Prato esquerdo */}
          <ellipse cx="40" cy="46" rx="18" ry="4" fill="#E5E7EB" />
          <ellipse cx="40" cy="46" rx="15" ry="3" fill="#F3F4F6" />
          
          {/* Prato direito */}
          <ellipse cx="80" cy="46" rx="18" ry="4" fill="#E5E7EB" />
          <ellipse cx="80" cy="46" rx="15" ry="3" fill="#F3F4F6" />
          
          {/* Linhas de conexão */}
          <line x1="40" y1="46" x2="32" y2="40" stroke="#D1D5DB" strokeWidth="2" />
          <line x1="80" y1="46" x2="88" y2="40" stroke="#D1D5DB" strokeWidth="2" />
          
          {/* Seta caindo (indicador de peso diminuindo) */}
          <g className="animate-arrow-falling">
            <line 
              x1="60" 
              y1="15" 
              x2="60" 
              y2="40" 
              stroke="#10B981" 
              strokeWidth="3" 
              strokeLinecap="round"
            />
            <polygon 
              points="60,15 55,25 65,25" 
              fill="#10B981"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};

// Componente de fundo animado
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradiente animado de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 animate-gradient-shift"></div>
      
      {/* Partículas flutuantes */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              background: `linear-gradient(135deg, ${
                i % 3 === 0 ? 'rgba(139, 92, 246, 0.3)' : i % 3 === 1 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(249, 115, 22, 0.3)'
              }, transparent)`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}
      </div>

      {/* Ondas suaves */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white/30 to-transparent"></div>
      
      {/* Efeito de brilho sutil */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-orange-300/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
    </div>
  );
};

// Função para extrair primeiro nome
const getFirstName = (displayName: string | null): string => {
  if (!displayName) return 'Usuário';
  return displayName.split(' ')[0];
};

// Interface para mensagens do chat
interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

// Componente FAQ estilo WhatsApp
const FAQSection = ({ userName }: { userName: string | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'paciente' | 'medico'>('paciente');

  const faqItemsPaciente = [
    {
      question: "Vou encontrar médicos próximos com preços melhores?",
      answer: "Sim! A plataforma conecta você com médicos especializados em toda região, especialmente no interior onde os preços são mais acessíveis que nos grandes centros. Você pode buscar médicos por cidade e estado, comparar orçamentos, e encontrar o melhor custo-benefício para seu tratamento com Tirzepatida. Muitos pacientes economizam significativamente ao encontrar médicos no interior!"
    },
    {
      question: "Como encontro um médico próximo de mim?",
      answer: "É muito simples! Ao acessar a área do paciente, você pode buscar médicos cadastrados na plataforma por cidade e estado. Cada médico mostra suas informações de contato e cidades onde atende. Você pode enviar uma solicitação de orçamento diretamente pela plataforma e o médico entrará em contato com você para negociar o tratamento. Tudo de forma transparente e organizada!"
    },
    {
      question: "Por que usar esta plataforma?",
      answer: "A plataforma é 100% gratuita e oferece: busca de médicos por região com preços diferenciados (especialmente no interior), acompanhamento completo do tratamento com gráficos interativos, acesso a todos os seus exames e histórico médico, comunicação direta com seu médico, e muito mais! Tudo sem custos para você."
    },
    {
      question: "Quanto custa para usar a plataforma?",
      answer: "Absolutamente nada! A plataforma é 100% gratuita para pacientes e médicos. Não há taxas de cadastro, mensalidades ou custos ocultos. O único investimento é no tratamento com Tirzepatida, que você negocia diretamente com o médico escolhido. A plataforma existe para unir médicos e pacientes, proporcionando um acompanhamento profissional e completo."
    },
    {
      question: "Como funciona o acompanhamento do tratamento?",
      answer: "Seu médico registra todas as informações do tratamento na plataforma: peso, medidas, exames, doses aplicadas, e muito mais. Você acompanha tudo em tempo real através de gráficos interativos que mostram sua evolução. A plataforma também envia alertas automáticos quando exames estão fora do normal, lembretes de consultas, e você pode se comunicar diretamente com seu médico a qualquer momento."
    },
    {
      question: "Meus dados estão seguros?",
      answer: "Sim! Utilizamos criptografia de ponta a ponta e seguimos rigorosamente os padrões de segurança para proteção de dados de saúde (LGPD). Seus dados são armazenados de forma segura e o acesso é restrito apenas ao médico responsável e a você. O login é feito através do Google, uma das empresas mais seguras do mundo, garantindo autenticação confiável."
    },
    {
      question: "Como começar agora mesmo?",
      answer: "É muito fácil! Clique em 'Acessar Área do Paciente', faça login com sua conta Google (é rápido e seguro), e comece a buscar médicos na sua região. Você pode enviar solicitações de orçamento para quantos médicos quiser, comparar opções, e escolher o que melhor se adequa às suas necessidades e orçamento. Tudo em poucos minutos!"
    }
  ];

  const faqItemsMedico = [
    {
      question: "Como a plataforma me ajuda a conseguir pacientes?",
      answer: "Ao cadastrar suas cidades de atendimento, você fica visível para pacientes que buscam médicos por região. Especialmente no interior, onde há menos médicos disponíveis, você terá grande visibilidade. Pacientes interessados em tratamento com Tirzepatida vão encontrá-lo e enviar solicitações de contato diretamente pela plataforma, criando um pipeline organizado de leads."
    },
    {
      question: "Por que me cadastrar na plataforma?",
      answer: "A plataforma é 100% gratuita e oferece: visibilidade para pacientes que buscam médicos por região (especialmente importante no interior), sistema de leads organizado que traz pacientes direto para você, gestão completa de pacientes em um só lugar, organização automática de dados clínicos, e muito mais! Tudo sem custos para você."
    },
    {
      question: "Como funciona para médicos do interior?",
      answer: "A plataforma é especialmente vantajosa para médicos do interior! Pacientes de cidades menores e do interior buscam médicos próximos, e você terá grande visibilidade nessa busca. Como há menos médicos disponíveis no interior, você receberá mais solicitações de pacientes da sua região que procuram tratamento com Tirzepatida."
    },
    {
      question: "Quanto custa para usar a plataforma?",
      answer: "Absolutamente nada! A plataforma é 100% gratuita para médicos. Não há taxas de cadastro, mensalidades ou custos ocultos. Você pode cadastrar quantas cidades quiser, receber quantos leads quiser, e gerenciar quantos pacientes quiser - tudo sem custos. A plataforma existe para unir médicos e pacientes."
    },
    {
      question: "Como cadastrar minhas cidades de atendimento?",
      answer: "Após fazer login na área do médico, acesse o menu 'Perfil' e cadastre todas as cidades onde você atende. Quanto mais cidades cadastrar, mais visibilidade você terá. Pacientes podem filtrar médicos por cidade e estado, então você aparecerá nas buscas dos pacientes da sua região."
    },
    {
      question: "Como funciona o sistema de leads?",
      answer: "Pacientes interessados em tratamento com Tirzepatida buscam médicos na plataforma e enviam solicitações de contato. Você recebe essas solicitações na seção 'Leads' e pode gerenciá-las em um pipeline visual. Cada lead mostra nome, cidade, data de solicitação e um ícone do WhatsApp para contato direto. Você pode organizar os leads por status e acompanhar todo o processo de conversão."
    },
    {
      question: "Como começar agora mesmo?",
      answer: "É muito fácil! Clique em 'Acessar Área do Médico', faça login com sua conta Google, complete seu cadastro com CRM e informações profissionais, e cadastre as cidades onde você atende. Em pouco tempo, pacientes da sua região começarão a encontrá-lo e enviar solicitações de contato!"
    }
  ];

  const faqItems = activeTab === 'paciente' ? faqItemsPaciente : faqItemsMedico;

  // Inicializar com mensagem de boas-vindas
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        text: userName 
          ? `Olá, ${userName}! 👋\n\nComo posso te ajudar hoje?`
          : `Olá, seja bem vindo! 👋\n\nComo posso te ajudar hoje?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, userName, messages.length]);

  const handleOptionClick = (item: typeof faqItems[0]) => {
    // Fechar modal
    setShowOptionsModal(false);
    
    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: item.question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Mostrar indicador de "digitando..."
    setIsTyping(true);

    // Adicionar resposta do bot após um delay (simulando digitação)
    setTimeout(() => {
      setIsTyping(false);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        text: item.answer,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1500 + Math.random() * 1000); // Delay variável entre 1.5s e 2.5s para parecer mais real
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
    setShowOptionsModal(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
          aria-label="Abrir FAQ"
        >
          <MessageCircle size={24} className="md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
        </button>
      ) : (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-[calc(100vw-2rem)] md:w-[90vw] max-w-md h-[600px] md:h-[700px] flex flex-col border border-gray-200 animate-expand-in">
          {/* Header estilo WhatsApp */}
          <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-3 md:p-4 rounded-t-xl md:rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle size={18} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold">Oftware Assistente</h3>
                <p className="text-xs text-white/80">Online</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Fechar FAQ"
            >
              <X size={18} className="md:w-5 md:h-5" />
            </button>
          </div>

          {/* Área de mensagens estilo WhatsApp */}
          <div className="flex-1 overflow-y-auto bg-[#e5ddd5] p-3 md:p-4 space-y-2 md:space-y-3" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='%23d4d4d4' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)' opacity='0.3'/%3E%3C/svg%3E")`
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] md:max-w-[80%] rounded-lg px-3 md:px-4 py-2 md:py-3 shadow-sm ${
                    message.type === 'user'
                      ? 'bg-[#dcf8c6] rounded-tr-none'
                      : 'bg-white rounded-tl-none'
                  }`}
                >
                  <p className="text-sm md:text-base text-gray-800 whitespace-pre-line break-words">
                    {message.text}
                  </p>
                  <p className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Indicador de "digitando..." */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg rounded-tl-none px-3 md:px-4 py-2 md:py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            {/* Botão para abrir modal de opções */}
            {messages.length > 0 && !isTyping && (
              <div className="flex justify-start mt-2">
                <button
                  onClick={() => setShowOptionsModal(true)}
                  className="bg-white hover:bg-gray-50 rounded-lg px-4 py-2 shadow-sm border border-gray-200 transition-colors flex items-center gap-2"
                >
                  <span className="text-sm font-medium text-gray-900">Ver opções de perguntas</span>
                  <ChevronDown size={18} className="text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de opções de perguntas */}
      {showOptionsModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowOptionsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold">Perguntas Frequentes</h3>
              <button
                onClick={() => setShowOptionsModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Abas Paciente/Médico */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('paciente')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'paciente'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Paciente
              </button>
              <button
                onClick={() => setActiveTab('medico')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'medico'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Médico
              </button>
            </div>

            {/* Lista de perguntas */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                {faqItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(item)}
                    className={`w-full text-left rounded-lg px-4 py-3 border transition-colors ${
                      activeTab === 'paciente'
                        ? 'bg-gray-50 hover:bg-orange-50 border-gray-200'
                        : 'bg-gray-50 hover:bg-purple-50 border-gray-200'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {item.question}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default function OftalmoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showMedicoModal, setShowMedicoModal] = useState(false);
  const [showPacienteModal, setShowPacienteModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Debounce para evitar múltiplas chamadas
    let timeoutId: NodeJS.Timeout;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Debounce para suavizar transições
      timeoutId = setTimeout(() => {
        setLoading(false);
      }, 100);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return; // Prevenir múltiplos cliques
    
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      console.error('Error signing in with Google:', error);
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'auth/popup-closed-by-user') {
        setLoginError('Login cancelado pelo usuário.');
      } else if (errorCode === 'auth/popup-blocked') {
        setLoginError('Popup bloqueado pelo navegador. Permita popups para este site.');
      } else {
        setLoginError('Erro ao fazer login com Google. Tente novamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Página inicial - funciona com ou sem login
  const firstName = user ? getFirstName(user.displayName) : null;
  
  return (
    <div className="min-h-screen h-screen md:min-h-screen md:h-auto relative overflow-hidden bg-white">
      {/* Loading durante navegação */}
      {isNavigating && <LoadingSpinner />}
      
      {/* Fundo animado */}
      <AnimatedBackground />
      
      {/* Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">   
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img
                src="/icones/oftware.png"
                alt="Oftware"
                className="w-8 h-8 md:w-10 md:h-10"
              />
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-gray-900">Oftware</h1>    
                <p className="text-sm text-gray-600">Sistema de Gestão Médica</p>                                                                             
              </div>
              <div className="md:hidden">
                <h1 className="text-lg font-bold text-gray-900">Oftware</h1>    
              </div>
            </div>
            {user && (
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"                                                  
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-6 md:py-12">
        {/* Mensagem de Boas-vindas */}
        <div className="w-full max-w-6xl mx-auto mb-6 md:mb-12 text-center animate-fade-in">
          <div className="inline-block">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-3">
              {user ? (
                <>Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-600">{firstName}</span></>
              ) : (
                <>Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-600">seja bem vindo!</span></>
              )}
            </h2>
            <p className="text-sm md:text-lg text-gray-600 md:text-gray-700 font-medium">
              {user ? 'Escolha uma opção abaixo.' : 'Escolha uma opção abaixo para acessar sua área.'}
            </p>
          </div>
        </div>

        {/* Cards Grid - Desktop: lado a lado, Mobile: lado a lado estilo app */}
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-8 lg:gap-12">
            {/* Médico */}
            <div className={`relative transition-all duration-500 ease-out ${
              showMedicoModal ? 'col-span-2 md:col-span-2' : showPacienteModal ? 'hidden' : ''
            }`}>
              {!showMedicoModal ? (
                <button
                  onClick={() => setShowMedicoModal(true)}
                  className="group relative bg-white/80 backdrop-blur-md rounded-2xl md:rounded-2xl shadow-xl md:shadow-2xl p-3 md:p-10 hover:shadow-2xl md:hover:shadow-3xl hover:scale-105 transition-all duration-300 border border-white/50 transform hover:-translate-y-1 md:hover:-translate-y-2 w-full"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-2.5 md:p-6 rounded-xl md:rounded-2xl mb-2 md:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md md:shadow-lg">
                      <Stethoscope size={24} className="md:w-12 md:h-12 text-white" />
                    </div>
                    <h3 className="text-sm md:text-3xl font-bold text-gray-900 mb-1 md:mb-3">Médico</h3>
                    <p className="text-[10px] md:text-base text-gray-700 md:text-gray-600 leading-tight md:leading-relaxed px-1">Área restrita para Médico. Cadastre seus locais de atendimento.</p>
                    <div className="mt-2 md:mt-6 flex items-center text-purple-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                      <span className="text-[10px] md:text-base">Acessar</span>
                      <svg className="w-3 h-3 md:w-5 md:h-5 ml-1 md:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl md:rounded-2xl bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </button>
              ) : (
                <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-4 md:p-8 border border-purple-200/50 animate-expand-in">
                  <button
                    onClick={() => setShowMedicoModal(false)}
                    className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-10"
                  >
                    <X size={20} />
                  </button>
                  
                  <div className="flex flex-col items-center mb-4 md:mb-6">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-3 md:p-5 rounded-2xl mb-3 shadow-lg">
                      <Stethoscope size={32} className="md:w-16 md:h-16 text-white" />
                    </div>
                    <h3 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">Área do Médico</h3>
                    <div className="flex items-center gap-2 text-purple-600 mb-4">
                      <Shield size={18} />
                      <span className="text-xs md:text-sm font-semibold">Área Exclusiva</span>
                    </div>
                  </div>

                  <p className="text-sm md:text-base text-gray-700 text-center mb-4 leading-relaxed">
                    Esta é uma <span className="font-semibold text-purple-600">área restrita exclusivamente para médicos</span> cadastrados no sistema.
                  </p>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-3 md:p-4 border border-purple-200/50 mb-4">
                    <h4 className="text-sm md:text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="text-purple-600" size={18} />
                      Funcionalidades:
                    </h4>
                    <ul className="space-y-1.5 text-xs md:text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span><span className="font-semibold">Cadastrar suas cidades de atendimento</span> para que pacientes possam encontrá-lo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>Pacientes vão <span className="font-semibold">visualizar seu perfil</span> e <span className="font-semibold">solicitar orçamentos</span> para tratamento</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>Gerenciar pacientes em tratamento com Tirzepatida</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>Acompanhar evolução clínica e resultados</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={async () => {
                      setShowMedicoModal(false);
                      if (!user) {
                        // Se não estiver logado, fazer login primeiro
                        try {
                          setIsNavigating(true);
                          const provider = new GoogleAuthProvider();
                          provider.addScope('profile');
                          provider.addScope('email');
                          provider.setCustomParameters({ prompt: 'select_account' });
                          await signInWithPopup(auth, provider);
                          // Após login, redirecionar
                          router.push('/metaadmin');
                        } catch (error: unknown) {
                          console.error('Error signing in with Google:', error);
                          const errorCode = (error as { code?: string }).code;
                          if (errorCode === 'auth/popup-closed-by-user') {
                            setLoginError('Login cancelado pelo usuário.');
                          } else if (errorCode === 'auth/popup-blocked') {
                            setLoginError('Popup bloqueado pelo navegador. Permita popups para este site.');
                          } else {
                            setLoginError('Erro ao fazer login com Google. Tente novamente.');
                          }
                          setIsNavigating(false);
                        }
                      } else {
                        setIsNavigating(true);
                        setTimeout(() => {
                          router.push('/metaadmin');
                        }, 100);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group text-sm md:text-base"
                  >
                    <span>Acessar Área do Médico</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>

            {/* Paciente */}
            <div className={`relative transition-all duration-500 ease-out ${
              showPacienteModal ? 'col-span-2 md:col-span-2' : showMedicoModal ? 'hidden' : ''
            }`}>
              {!showPacienteModal ? (
                <button
                  onClick={() => setShowPacienteModal(true)}
                  className="group relative bg-white/80 backdrop-blur-md rounded-2xl md:rounded-2xl shadow-xl md:shadow-2xl p-3 md:p-10 hover:shadow-2xl md:hover:shadow-3xl hover:scale-105 transition-all duration-300 border border-white/50 transform hover:-translate-y-1 md:hover:-translate-y-2 w-full"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-2.5 md:p-6 rounded-xl md:rounded-2xl mb-2 md:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md md:shadow-lg">
                      <UserCheck size={24} className="md:w-12 md:h-12 text-white" />
                    </div>
                    <h3 className="text-sm md:text-3xl font-bold text-gray-900 mb-1 md:mb-3">Paciente</h3>
                    <p className="text-[10px] md:text-base text-gray-700 md:text-gray-600 leading-tight md:leading-relaxed px-1">Busque por um médico mais próximo e solicite um orçamento</p>
                    <div className="mt-2 md:mt-6 flex items-center text-orange-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                      <span className="text-[10px] md:text-base">Acessar</span>
                      <svg className="w-3 h-3 md:w-5 md:h-5 ml-1 md:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl md:rounded-2xl bg-gradient-to-r from-orange-400/0 via-orange-400/20 to-orange-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </button>
              ) : (
                <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-4 md:p-8 border border-orange-200/50 animate-expand-in">
                  <button
                    onClick={() => setShowPacienteModal(false)}
                    className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-10"
                  >
                    <X size={20} />
                  </button>
                  
                  <div className="flex flex-col items-center mb-4 md:mb-6">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-3 md:p-5 rounded-2xl mb-3 shadow-lg">
                      <UserCheck size={32} className="md:w-16 md:h-16 text-white" />
                    </div>
                    <h3 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">Área do Paciente</h3>
                    <div className="flex items-center gap-2 text-orange-600 mb-4">
                      <Heart size={18} />
                      <span className="text-xs md:text-sm font-semibold">Seu Acompanhamento</span>
                    </div>
                  </div>

                  <p className="text-sm md:text-base text-gray-700 text-center mb-4 leading-relaxed">
                    Esta é a <span className="font-semibold text-orange-600">Área do Paciente</span>, onde você pode <span className="font-semibold text-orange-600">iniciar sua busca por um médico mais próximo</span> e solicitar orçamento para seu tratamento.
                  </p>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-3 md:p-4 border border-orange-200/50 mb-4">
                    <h4 className="text-sm md:text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Search className="text-orange-600" size={18} />
                      Funcionalidades:
                    </h4>
                    <ul className="space-y-1.5 text-xs md:text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span><span className="font-semibold">Buscar médicos especializados</span> na sua região e solicitar orçamento para tratamento</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span>Acompanhar tratamento de obesidade com Tirzepatida</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span>Visualizar evolução e resultados clínicos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span>Comunicar-se diretamente com seu médico</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={async () => {
                      setShowPacienteModal(false);
                      if (!user) {
                        // Se não estiver logado, fazer login primeiro
                        try {
                          setIsNavigating(true);
                          const provider = new GoogleAuthProvider();
                          provider.addScope('profile');
                          provider.addScope('email');
                          provider.setCustomParameters({ prompt: 'select_account' });
                          await signInWithPopup(auth, provider);
                          // Após login, redirecionar
                          router.push('/meta');
                        } catch (error: unknown) {
                          console.error('Error signing in with Google:', error);
                          const errorCode = (error as { code?: string }).code;
                          if (errorCode === 'auth/popup-closed-by-user') {
                            setLoginError('Login cancelado pelo usuário.');
                          } else if (errorCode === 'auth/popup-blocked') {
                            setLoginError('Popup bloqueado pelo navegador. Permita popups para este site.');
                          } else {
                            setLoginError('Erro ao fazer login com Google. Tente novamente.');
                          }
                          setIsNavigating(false);
                        }
                      } else {
                        setIsNavigating(true);
                        setTimeout(() => {
                          router.push('/meta');
                        }, 100);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group text-sm md:text-base"
                  >
                    <span>Acessar Área do Paciente</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Chat Icon - Sempre visível */}
      <FAQSection userName={firstName} />
      
      {/* Mensagem de erro de login (se houver) */}
      {loginError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm shadow-lg z-50 max-w-md">
          {loginError}
          <button
            onClick={() => setLoginError(null)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
