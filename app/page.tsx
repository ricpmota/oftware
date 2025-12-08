'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import FAQChat from '@/components/FAQChat';
import { faqPacienteTotal, nutriFaqItems, faqCategoriesPaciente } from '@/components/FAQpaciente';
import { faqCategoriesMedico } from '@/components/FAQmedico';
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

// FAQSection removido - agora usando FAQChat do componente


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
                          // Após login, verificar se há ref no localStorage e incluir na URL
                          const ref = typeof window !== 'undefined' ? localStorage.getItem('indicacao_ref') : null;
                          const urlComRef = ref ? `/meta?ref=${encodeURIComponent(ref)}` : '/meta';
                          router.push(urlComRef);
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
                        // Verificar se há ref no localStorage e incluir na URL
                        const ref = typeof window !== 'undefined' ? localStorage.getItem('indicacao_ref') : null;
                        const urlComRef = ref ? `/meta?ref=${encodeURIComponent(ref)}` : '/meta';
                        setTimeout(() => {
                          router.push(urlComRef);
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
      <FAQChat 
        userName={firstName || 'Visitante'}
        position="right"
        faqItems={faqPacienteTotal}
        nutriFaqItems={nutriFaqItems}
      />
      
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
