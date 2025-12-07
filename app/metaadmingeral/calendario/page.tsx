'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import CalendarioAplicacoes from '@/components/CalendarioAplicacoes';
import DashboardEvolucao from '@/components/DashboardEvolucao';
import { Calendar, BarChart3 } from 'lucide-react';

export default function CalendarioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [pacientes, setPacientes] = useState<PacienteCompleto[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendario' | 'dashboard'>('calendario');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        router.push('/');
      }
      setUserLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadPacientes();
    }
  }, [user]);

  const loadPacientes = async () => {
    setLoadingPacientes(true);
    try {
      const pacientesData = await PacienteService.getAllPacientes();
      setPacientes(pacientesData);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoadingPacientes(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('calendario')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'calendario'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="mr-2" size={18} />
              Calendário de Aplicações
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'dashboard'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="mr-2" size={18} />
              Dashboard de Evolução
            </button>
          </nav>
        </div>

        {/* Conteúdo */}
        {activeTab === 'calendario' ? (
          <CalendarioAplicacoes pacientes={pacientes} />
        ) : (
          <DashboardEvolucao />
        )}
      </div>
    </div>
  );
}

