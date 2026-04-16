'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EMERGENCIAS_OFTALMOLOGICAS } from '../emergencia';
import CalculadoraETOModal from '../../../components/CalculadoraETOModal';

// Tipos de trauma disponíveis
const TIPOS_TRAUMA = [
  {
    id: 'trauma-ocular-abrasao',
    titulo: 'Abrasão Corneana / Corpo Estranho',
    descricao: 'Traumas superficiais com corpos estranhos'
  },
  {
    id: 'trauma-ocular-laceracao-parcial',
    titulo: 'Laceração de Espessura Parcial',
    descricao: 'Lesões corneanas superficiais'
  },
  {
    id: 'trauma-ocular-laceracao-total-auto-selante',
    titulo: 'Laceração Total Auto-selante',
    descricao: 'Perfurações que se fecham espontaneamente'
  },
  {
    id: 'trauma-ocular-perfurante',
    titulo: 'Perfuração com Vazamento',
    descricao: 'Perfurações com vazamento ativo'
  },
  {
    id: 'trauma-ocular-lesao-interna',
    titulo: 'Trauma Contuso - Lesões Internas',
    descricao: 'Lesões internas por trauma contuso'
  },
  {
    id: 'trauma-ocular-eto',
    titulo: 'Calculadora ETO',
    descricao: 'Escore de Trauma Ocular'
  }
];

export default function TraumaOcularPage() {
  const router = useRouter();
  const [traumaSelecionado, setTraumaSelecionado] = useState<string | null>(null);
  const [showCalculadoraETO, setShowCalculadoraETO] = useState(false);
  
  // Filtra apenas as emergências relacionadas ao trauma ocular
  const traumaEmergencias = EMERGENCIAS_OFTALMOLOGICAS.filter(emergencia => 
    emergencia.id.includes('trauma-ocular')
  );

  const handleBackClick = () => {
    router.push('/emergencia');
  };

  const handleTraumaClick = (id: string) => {
    if (id === 'trauma-ocular-eto') {
      setShowCalculadoraETO(true);
    } else {
      setTraumaSelecionado(traumaSelecionado === id ? null : id);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trauma Ocular</h1>
              <p className="text-gray-600">Selecione o tipo de trauma para ver as condutas específicas</p>
            </div>
          </div>
        </div>

        {/* Lista de Tipos de Trauma com Informações */}
        <div className="space-y-4">
          {TIPOS_TRAUMA.map((tipo) => {
            const emergencia = traumaEmergencias.find(emergencia => emergencia.id === tipo.id);
            const isSelected = traumaSelecionado === tipo.id;
            const isCalculadora = tipo.id === 'trauma-ocular-eto';
            
            return (
              <div key={tipo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Botão do Tipo */}
                <button
                  onClick={() => handleTraumaClick(tipo.id)}
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
                          Clique para abrir a calculadora ETO
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

                {/* Informações do Trauma */}
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
                      <div>
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

                    {/* Calculadora ETO (se aplicável) */}
                    {emergencia.calculadora && (
                      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-800 mb-3">Calculadora ETO</h3>
                        <p className="text-gray-600 mb-3">
                          Esta emergência inclui uma calculadora para estimar o prognóstico visual.
                        </p>
                        <button 
                          onClick={() => setShowCalculadoraETO(true)}
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
        {!traumaSelecionado && (
          <div className="text-center py-8 mt-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-600">Clique em um tipo de trauma acima para ver as condutas específicas</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Para casos de extrema urgência, procure atendimento médico imediato
          </p>
        </div>
      </div>

      {/* Modal da Calculadora ETO */}
      <CalculadoraETOModal 
        isOpen={showCalculadoraETO} 
        onClose={() => setShowCalculadoraETO(false)} 
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