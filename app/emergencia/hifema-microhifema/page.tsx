'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EMERGENCIAS_OFTALMOLOGICAS } from '../hifema/emergencia-hifema';
import CalculadoraHifemaModal from '../hifema/CalculadoraHifemaModal';

// Tipos de hifema disponíveis
const TIPOS_HIFEMA = [
  {
    id: 'hifema-e-microhifema',
    titulo: 'Hifema e Microhifema Traumáticos',
    descricao: 'Sangramento na câmara anterior por trauma'
  },
  {
    id: 'calculadora-lavagem',
    titulo: 'Calculadora de Lavagem',
    descricao: 'Indicações para lavagem da câmara anterior'
  }
];

export default function HifemaMicrohifemaPage() {
  const router = useRouter();
  const [hifemaSelecionado, setHifemaSelecionado] = useState<string | null>(null);
  const [showCalculadoraLavagem, setShowCalculadoraLavagem] = useState(false);
  
  // Filtra apenas as emergências relacionadas ao hifema
  const hifemaEmergencias = EMERGENCIAS_OFTALMOLOGICAS.filter(emergencia => 
    emergencia.id.includes('hifema')
  );

  const handleBackClick = () => {
    router.push('/emergencia');
  };

  const handleHifemaClick = (id: string) => {
    if (id === 'calculadora-lavagem') {
      setShowCalculadoraLavagem(true);
    } else {
      setHifemaSelecionado(hifemaSelecionado === id ? null : id);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hifema e Microhifema</h1>
              <p className="text-gray-600">Sangramento na câmara anterior - avaliação e condutas</p>
            </div>
          </div>
        </div>

        {/* Lista de Tipos de Hifema com Informações */}
        <div className="space-y-4">
          {TIPOS_HIFEMA.map((tipo) => {
            const emergencia = hifemaEmergencias.find(emergencia => emergencia.id === tipo.id);
            const isSelected = hifemaSelecionado === tipo.id;
            const isCalculadora = tipo.id === 'calculadora-lavagem';
            
            return (
              <div key={tipo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Botão do Tipo */}
                <button
                  onClick={() => handleHifemaClick(tipo.id)}
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
                          Clique para abrir a calculadora de lavagem
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

                {/* Informações do Hifema */}
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

                    {/* Critérios de Lavagem */}
                    {emergencia.criteriosLavagem && emergencia.criteriosLavagem.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Critérios para Lavagem da Câmara Anterior
                        </h3>
                        <ul className="space-y-2">
                          {emergencia.criteriosLavagem.map((criterio, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-orange-500 mr-2 mt-1">•</span>
                              <span className="text-gray-700">{criterio}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Calculadora de Lavagem (se aplicável) */}
                    {isCalculadora && (
                      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-800 mb-3">Calculadora de Lavagem</h3>
                        <p className="text-gray-600 mb-3">
                          Avalie os critérios para indicação de lavagem da câmara anterior.
                        </p>
                        <button 
                          onClick={() => setShowCalculadoraLavagem(true)}
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
        {!hifemaSelecionado && (
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

      {/* Modal da Calculadora de Lavagem */}
      <CalculadoraHifemaModal 
        isOpen={showCalculadoraLavagem} 
        onClose={() => setShowCalculadoraLavagem(false)} 
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