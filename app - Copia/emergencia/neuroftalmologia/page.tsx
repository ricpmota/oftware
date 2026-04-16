'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EMERGENCIAS_OFTALMOLOGICAS } from '../Neuroftalmo/emergencia-neuroftalmo';
import CalculadoraNeuriteOpticaModal from '../Neuroftalmo/CalculadoraNeuriteOpticaModal';

export default function NeuroftalmologiaPage() {
  const router = useRouter();
  const [selectedNeuro, setSelectedNeuro] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const handleBackClick = () => {
    router.push('/emergencia');
  };

  const handleNeuroClick = (id: string) => {
    setSelectedNeuro(selectedNeuro === id ? null : id);
  };

  const neuroEmergencias = EMERGENCIAS_OFTALMOLOGICAS;

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
            Neuroftalmologia
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Emergências neuroftalmológicas que exigem avaliação rápida para evitar sequelas visuais e neurológicas permanentes
          </p>
        </div>

        {/* Calculadora */}
        <div className="mb-8">
          <button
            onClick={() => setShowCalculator(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Calculadora de Risco para Neurite Óptica
          </button>
        </div>

        {/* Lista de Emergências Neuroftalmológicas */}
        <div className="space-y-6">
          {neuroEmergencias.map((neuro) => (
            <div key={neuro.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => handleNeuroClick(neuro.id)}
                className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
              >
                <h3 className="text-lg font-semibold text-gray-900">{neuro.titulo}</h3>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    selectedNeuro === neuro.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {selectedNeuro === neuro.id && (
                <div className="px-6 py-4 space-y-6">
                  {/* Sinais */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Sinais e Sintomas:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {neuro.sinais.map((sinal, index) => (
                        <li key={index}>{sinal}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Conduta */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Conduta:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {neuro.conduta.map((conduta, index) => (
                        <li key={index}>{conduta}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Prescrição */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Prescrição:</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {neuro.prescricao.map((prescricao, index) => (
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
      <CalculadoraNeuriteOpticaModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </div>
  );
} 