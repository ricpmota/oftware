'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EMERGENCIAS_OFTALMOLOGICAS } from '../Corpo Estranho/emergencia-corpo-estranho';
import CalculadoraCEIOModal from '../Corpo Estranho/CalculadoraCEIOModal';

export default function CorpoEstranhoPage() {
  const router = useRouter();
  const [selectedCorpo, setSelectedCorpo] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const handleBackClick = () => {
    router.push('/emergencia');
  };

  const handleCorpoClick = (id: string) => {
    setSelectedCorpo(selectedCorpo === id ? null : id);
  };

  const corpoEmergencias = EMERGENCIAS_OFTALMOLOGICAS;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Botão Voltar */}
        <div className="mb-6">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao Menu de Emergências
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Corpo Estranho
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Avaliação e condutas para diferentes tipos de corpo estranho ocular
          </p>
        </div>

        {/* Calculadora */}
        <div className="mb-8">
          <button
            onClick={() => setShowCalculator(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Calculadora de Suspeita de CE Intraocular
          </button>
        </div>

        {/* Lista de Emergências de Corpo Estranho */}
        <div className="space-y-6">
          {corpoEmergencias.map((corpo) => (
            <div key={corpo.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => handleCorpoClick(corpo.id)}
                className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
              >
                <h3 className="text-lg font-semibold text-gray-900">{corpo.titulo}</h3>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    selectedCorpo === corpo.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {selectedCorpo === corpo.id && (
                <div className="px-6 py-4 space-y-6">
                  {/* Sinais */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Sinais e Sintomas:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {corpo.sinais.map((sinal, index) => (
                        <li key={index}>{sinal}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Conduta */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Conduta:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {corpo.conduta.map((conduta, index) => (
                        <li key={index}>{conduta}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Prescrição */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Prescrição:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {corpo.prescricao.map((prescricao, index) => (
                        <li key={index}>{prescricao}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal da Calculadora */}
      <CalculadoraCEIOModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </div>
  );
} 