'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EMERGENCIAS_OFTALMOLOGICAS } from '../cornea/emergencia-cornea';
import CalculadoraUlceraCorneanaModal from '../cornea/CalculadoraUlceraCorneanaModal';

// Tipos de córnea e conjuntiva disponíveis
const TIPOS_CORNEA = [
  {
    id: 'ulcera-corneana-infecciosa',
    titulo: 'Úlcera Corneana Infecciosa',
    descricao: 'Infecção corneana com infiltrado estromal'
  },
  {
    id: 'ceratite-bacteriana-leve',
    titulo: 'Ceratite Bacteriana Leve',
    descricao: 'Infecção bacteriana superficial da córnea'
  },
  {
    id: 'conjuntivite-viral',
    titulo: 'Conjuntivite Viral',
    descricao: 'Inflamação viral da conjuntiva'
  },
  {
    id: 'conjuntivite-bacteriana',
    titulo: 'Conjuntivite Bacteriana',
    descricao: 'Infecção bacteriana da conjuntiva'
  },
  {
    id: 'conjuntivite-alergica',
    titulo: 'Conjuntivite Alérgica',
    descricao: 'Reação alérgica da conjuntiva'
  },
  {
    id: 'calculadora-ulcera',
    titulo: 'Calculadora de Úlcera Corneana',
    descricao: 'Avaliação de risco e conduta para úlceras corneanas'
  }
];

export default function CorneaConjuntivaPage() {
  const router = useRouter();
  const [corneaSelecionada, setCorneaSelecionada] = useState<string | null>(null);
  const [showCalculadoraUlcera, setShowCalculadoraUlcera] = useState(false);
  
  // Filtra apenas as emergências relacionadas à córnea
  const corneaEmergencias = EMERGENCIAS_OFTALMOLOGICAS.filter(emergencia => 
    emergencia.id.includes('ulcera') || 
    emergencia.id.includes('ceratite') || 
    emergencia.id.includes('conjuntivite')
  );

  const handleBackClick = () => {
    router.push('/emergencia');
  };

  const handleCorneaClick = (id: string) => {
    if (id === 'calculadora-ulcera') {
      setShowCalculadoraUlcera(true);
    } else {
      setCorneaSelecionada(corneaSelecionada === id ? null : id);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao Menu de Emergências
          </button>
          
          <div className="flex items-center mb-6">
            <div className="text-gray-600 mr-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Córnea e Conjuntiva</h1>
              <p className="text-gray-600">Ceratites, úlceras e conjuntivites agudas - avaliação e condutas</p>
            </div>
          </div>
        </div>

        {/* Lista de Tipos de Córnea com Informações */}
        <div className="space-y-4">
          {TIPOS_CORNEA.map((tipo) => {
            const emergencia = corneaEmergencias.find(emergencia => emergencia.id === tipo.id);
            const isSelected = corneaSelecionada === tipo.id;
            const isCalculadora = tipo.id === 'calculadora-ulcera';
            
            return (
              <div key={tipo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Botão do Tipo */}
                <button
                  onClick={() => handleCorneaClick(tipo.id)}
                  className={`w-full p-4 text-left transition-all duration-300 ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : isCalculadora
                      ? 'bg-green-50 border-l-4 border-green-500 hover:bg-green-100'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{tipo.titulo}</h3>
                      <p className="text-sm text-gray-600 mt-1">{tipo.descricao}</p>
                      {isCalculadora && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Clique para abrir a calculadora de úlcera corneana
                        </p>
                      )}
                    </div>
                    <svg 
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isSelected ? 'rotate-180 text-blue-500' : isCalculadora ? 'text-green-500' : 'text-gray-400'
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Informações da Córnea */}
                {isSelected && emergencia && (
                  <div className="bg-gray-50 border-t border-gray-200 p-6 animate-fadeIn">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{emergencia.titulo}</h2>
                    
                    {/* Sinais */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Sinais e Sintomas
                      </h3>
                      <ul className="space-y-2">
                        {emergencia.sinais.map((sinal, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-500 mr-2 mt-1">•</span>
                            <span className="text-gray-700">{sinal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Conduta */}
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Conduta
                      </h3>
                      <ul className="space-y-2">
                        {emergencia.conduta.map((conduta, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            <span className="text-gray-700">{conduta}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Prescrição */}
                    {emergencia.prescricao && emergencia.prescricao.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Prescrição
                        </h3>
                        <ul className="space-y-2">
                          {emergencia.prescricao.map((prescricao, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2 mt-1">•</span>
                              <span className="text-gray-700">{prescricao}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Calculadora de Úlcera (se aplicável) */}
                    {isCalculadora && (
                      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-800 mb-3">Calculadora de Úlcera Corneana</h3>
                        <p className="text-gray-600 mb-3">
                          Avalie o risco e determine a conduta adequada para úlceras corneanas.
                        </p>
                        <button 
                          onClick={() => setShowCalculadoraUlcera(true)}
                          className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Abrir Calculadora
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Instruções */}
        {!corneaSelecionada && (
          <div className="text-center py-8 mt-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-600">Clique em um item acima para ver as informações específicas</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Para casos de extrema urgência, procure atendimento médico imediato
          </p>
        </div>
      </div>

      {/* Modal da Calculadora de Úlcera Corneana */}
      <CalculadoraUlceraCorneanaModal 
        isOpen={showCalculadoraUlcera} 
        onClose={() => setShowCalculadoraUlcera(false)} 
      />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
} 