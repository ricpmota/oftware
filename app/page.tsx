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
  LogOut
} from 'lucide-react';

// Componente de loading otimizado
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Carregando...</p>
    </div>
  </div>
);

export default function OftalmoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/icones/oftware.png" 
              alt="Oftware" 
              className="w-24 h-24"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oftware</h1>
          <p className="text-gray-600 mb-6">Sistema de Gestão Médica</p>
          
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continuar com Google</span>
                </>
              )}
            </button>
            
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            
            <div className="text-xs text-gray-500 mt-6">
              <p>Acesse suas áreas do sistema</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Página de seleção após login
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
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
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4">
        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 md:max-w-full md:grid-cols-2">
          {/* Médico */}
          <button
            onClick={() => router.push('/metaadmin')}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all border border-gray-200"
          >
            <div className="flex items-center mb-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Stethoscope size={18} className="text-purple-600" />
              </div>
              <h3 className="ml-3 text-base font-semibold text-gray-900">Médico</h3>
            </div>
            <p className="text-xs text-gray-600">Tratamento de obesidade com Monjauro</p>
          </button>

          {/* Paciente */}
          <button
            onClick={() => router.push('/meta')}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all border border-gray-200"
          >
            <div className="flex items-center mb-2">
              <div className="bg-orange-100 p-2 rounded-lg">
                <UserCheck size={18} className="text-orange-600" />
              </div>
              <h3 className="ml-3 text-base font-semibold text-gray-900">Paciente</h3>
            </div>
            <p className="text-xs text-gray-600">Acompanhamento Monjauro</p>
          </button>
        </div>
      </div>
    </div>
  );
}
