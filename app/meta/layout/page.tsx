'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Check, Sparkles, LayoutDashboard, Zap, ArrowLeft } from 'lucide-react';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';

export default function LayoutSelectionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const pacienteData = await PacienteService.getPacienteByUserId(currentUser.uid);
          setPaciente(pacienteData);
          setSelectedLayout(pacienteData?.preferenciaLayout || null);
        } catch (error) {
          console.error('Erro ao carregar paciente:', error);
        }
      } else {
        router.push('/meta');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSelectLayout = async (layoutId: string) => {
    if (!user || !paciente) return;

    setSaving(true);
    try {
      // Salvar preferência no Firestore
      const pacienteRef = doc(db, 'pacientes', paciente.id);
      await setDoc(pacienteRef, {
        preferenciaLayout: layoutId
      }, { merge: true });

      setSelectedLayout(layoutId);
      
      // Redirecionar para a página principal com o layout selecionado
      router.push(`/meta?layout=${layoutId}`);
    } catch (error) {
      console.error('Erro ao salvar preferência:', error);
      alert('Erro ao salvar preferência. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const layouts = [
    {
      id: 'modern',
      name: 'Layout Moderno',
      description: 'Dashboard com cards grandes, gráficos em destaque e visualizações interativas',
      icon: LayoutDashboard,
      color: 'from-blue-500 to-purple-600',
      features: [
        'Cards de estatísticas grandes e visíveis',
        'Gráficos interativos com animações',
        'Visualização de progresso em tempo real',
        'Design responsivo e moderno'
      ]
    },
    {
      id: 'minimal',
      name: 'Layout Minimalista',
      description: 'Design elegante e limpo, focado na apresentação clara dos dados',
      icon: Sparkles,
      color: 'from-emerald-500 to-teal-600',
      features: [
        'Interface limpa e organizada',
        'Foco na clareza dos dados',
        'Gráficos simplificados e elegantes',
        'Experiência visual refinada'
      ]
    },
    {
      id: 'interactive',
      name: 'Layout Interativo',
      description: 'Visualizações avançadas com animações, comparações e insights detalhados',
      icon: Zap,
      color: 'from-orange-500 to-pink-600',
      features: [
        'Animações suaves e transições',
        'Comparações visuais avançadas',
        'Insights e recomendações',
        'Gráficos interativos com zoom'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/meta')}
            className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Escolha seu Layout
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Selecione o estilo de visualização que melhor se adapta ao seu perfil
          </p>
        </div>

        {/* Layout Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {layouts.map((layout) => {
            const Icon = layout.icon;
            const isSelected = selectedLayout === layout.id;
            
            return (
              <div
                key={layout.id}
                onClick={() => handleSelectLayout(layout.id)}
                className={`
                  relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg 
                  border-2 transition-all duration-300 cursor-pointer
                  hover:shadow-2xl hover:scale-105
                  ${isSelected 
                    ? 'border-green-500 shadow-green-500/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-2 shadow-lg">
                    <Check size={20} />
                  </div>
                )}

                {/* Icon Header */}
                <div className={`bg-gradient-to-br ${layout.color} p-6 rounded-t-2xl`}>
                  <div className="flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl mb-4">
                    <Icon size={32} className="text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {layout.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {layout.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2">
                    {layout.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Select Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLayout(layout.id);
                    }}
                    disabled={saving}
                    className={`
                      w-full mt-6 py-3 rounded-lg font-semibold transition-all
                      ${isSelected
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                      ${saving ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {saving && selectedLayout === layout.id
                      ? 'Salvando...'
                      : isSelected
                      ? 'Selecionado'
                      : 'Selecionar'
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview Section */}
        {selectedLayout && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Preview do Layout Selecionado
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                O layout <strong className="text-gray-900 dark:text-white">{layouts.find(l => l.id === selectedLayout)?.name}</strong> será aplicado na sua página de estatísticas.
                <br />
                <span className="text-sm mt-2 block">
                  Clique em "Voltar" ou navegue para a página principal para ver o novo layout.
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
