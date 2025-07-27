'use client';

import React from 'react';
import { PatientData } from '../types/clinical';

interface LensTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: PatientData;
  currentLensType: string;
  onSelectLensType: (lensType: string) => void;
}

export default function LensTypeModal({ 
  isOpen, 
  onClose, 
  patientData, 
  currentLensType, 
  onSelectLensType 
}: LensTypeModalProps) {
  
  if (!isOpen) {
    return null;
  }

  // Dados dos tipos de lentes
  const lensTypes = [
    {
      id: 'Monofocal',
      name: 'Monofocal',
      description: 'Lente com foco único para uma distância específica',
      advantages: [
        'Melhor qualidade visual para a distância prescrita',
        'Menor distorção',
        'Mais barata',
        'Adaptação rápida'
      ],
      disadvantages: [
        'Não corrige presbiopia',
        'Necessita trocar óculos para diferentes distâncias',
        'Limitação para atividades próximas'
      ],
      bestFor: [
        'Pacientes jovens sem presbiopia',
        'Uso específico (longe ou perto)',
        'Orçamento limitado'
      ],
      priceRange: 'R$ 50 - R$ 300',
      recommendation: patientData.age < 40 ? 'Alta' : 'Média'
    },
    {
      id: 'Bifocal',
      name: 'Bifocal',
      description: 'Lente com duas zonas de foco distintas',
      advantages: [
        'Corrige visão de longe e perto',
        'Linha de separação visível',
        'Preço intermediário',
        'Adaptação moderada'
      ],
      disadvantages: [
        'Linha de separação visível',
        'Zona intermediária limitada',
        'Aspecto menos moderno',
        'Pode causar saltos de imagem'
      ],
      bestFor: [
        'Pacientes com presbiopia',
        'Quem precisa de correção para longe e perto',
        'Orçamento intermediário'
      ],
      priceRange: 'R$ 150 - R$ 500',
      recommendation: patientData.age >= 40 && patientData.age < 60 ? 'Alta' : 'Média'
    },
    {
      id: 'Multifocal',
      name: 'Multifocal',
      description: 'Lente com múltiplas zonas de foco progressivas',
      advantages: [
        'Transição suave entre distâncias',
        'Aspecto moderno e discreto',
        'Corrige todas as distâncias',
        'Sem linha de separação'
      ],
      disadvantages: [
        'Adaptação mais longa',
        'Maior custo',
        'Pode ter distorções laterais',
        'Zonas de visão limitadas'
      ],
      bestFor: [
        'Pacientes ativos',
        'Quem valoriza estética',
        'Uso intensivo de visão intermediária'
      ],
      priceRange: 'R$ 300 - R$ 800',
      recommendation: patientData.age >= 40 ? 'Alta' : 'Baixa'
    },
    {
      id: 'Progressiva',
      name: 'Progressiva',
      description: 'Lente com transição contínua entre todas as distâncias',
      advantages: [
        'Visão natural em todas as distâncias',
        'Aspecto mais moderno',
        'Maior conforto visual',
        'Tecnologia avançada'
      ],
      disadvantages: [
        'Alto custo',
        'Adaptação mais complexa',
        'Pode ter distorções',
        'Necessita de medições precisas'
      ],
      bestFor: [
        'Pacientes com alto astigmatismo',
        'Quem busca máxima qualidade visual',
        'Orçamento flexível'
      ],
      priceRange: 'R$ 500 - R$ 1.200',
      recommendation: Math.abs(patientData.arMeasurements?.od?.[0]?.c || 0) > 2 ? 'Alta' : 'Média'
    }
  ];

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Alta': return 'text-green-600 bg-green-50';
      case 'Média': return 'text-yellow-600 bg-yellow-50';
      case 'Baixa': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Guia de Lentes
                </h3>
                <p className="text-blue-100 text-xs sm:text-sm mt-1">
                  Paciente: {patientData.name} ({patientData.age} anos)
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors p-1"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 py-4 sm:py-6 max-h-96 overflow-y-auto">
            <div className="mb-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800">
                <strong>Tipo atual:</strong> {currentLensType}
              </p>
            </div>
            
            {/* Gráfico visual comparativo */}
            <div className="mb-6">
              <h4 className="text-base font-semibold mb-2">Comparativo de Cobertura Visual</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 border border-gray-200 text-left">Tipo de Lente</th>
                      <th className="px-2 py-2 border border-gray-200 text-center">
                        <span className="inline-flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>Longe</span>
                      </th>
                      <th className="px-2 py-2 border border-gray-200 text-center">
                        <span className="inline-flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>Intermediário</span>
                      </th>
                      <th className="px-2 py-2 border border-gray-200 text-center">
                        <span className="inline-flex items-center"><span className="w-3 h-3 rounded-full bg-orange-400 mr-1"></span>Perto</span>
                      </th>
                      <th className="px-2 py-2 border border-gray-200 text-left">Comentário</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-2 border border-gray-200 font-medium">Monofocal</td>
                      <td className="px-2 py-2 border border-gray-200 text-center">✅</td>
                      <td className="px-2 py-2 border border-gray-200 text-center text-gray-400">❌</td>
                      <td className="px-2 py-2 border border-gray-200 text-center text-gray-400">❌</td>
                      <td className="px-2 py-2 border border-gray-200">Visão única</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 border border-gray-200 font-medium">Bifocal</td>
                      <td className="px-2 py-2 border border-gray-200 text-center">✅</td>
                      <td className="px-2 py-2 border border-gray-200 text-center text-gray-400">❌</td>
                      <td className="px-2 py-2 border border-gray-200 text-center">✅</td>
                      <td className="px-2 py-2 border border-gray-200">Linha visível</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 border border-gray-200 font-medium">Progressiva</td>
                      <td className="px-2 py-2 border border-gray-200 text-center">✅</td>
                      <td className="px-2 py-2 border border-gray-200 text-center">✅</td>
                      <td className="px-2 py-2 border border-gray-200 text-center">✅</td>
                      <td className="px-2 py-2 border border-gray-200">Transição suave</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 border border-gray-200 font-medium">Ocupacional (de perto)</td>
                      <td className="px-2 py-2 border border-gray-200 text-center text-gray-400">❌</td>
                      <td className="px-2 py-2 border border-gray-200 text-center">✅</td>
                      <td className="px-2 py-2 border border-gray-200 text-center">✅</td>
                      <td className="px-2 py-2 border border-gray-200">Para tela/leitura</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lista de tipos de lentes detalhada */}
            <div className="grid gap-4 sm:gap-6">
              {lensTypes.map((lens) => (
                <div key={lens.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-gray-800">{lens.name}</h4>
                      <p className="text-gray-700 text-xs sm:text-sm">{lens.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(lens.recommendation)}`}>
                        {lens.recommendation}
                      </span>
                      <button
                        onClick={() => {
                          onSelectLensType(lens.id);
                          onClose();
                        }}
                        className="px-2 sm:px-3 py-1 bg-blue-600 text-white text-xs sm:text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Selecionar
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-1">Vantagens:</h5>
                      <ul className="space-y-1">
                        {lens.advantages.map((advantage, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-500 mr-1 mt-0.5">✓</span>
                            <span className="text-gray-700">{advantage}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-1">Desvantagens:</h5>
                      <ul className="space-y-1">
                        {lens.disadvantages.map((disadvantage, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-500 mr-1 mt-0.5">✗</span>
                            <span className="text-gray-700">{disadvantage}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-4 grid md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-1">Melhor para:</h5>
                      <ul className="space-y-1">
                        {lens.bestFor.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-1 mt-0.5">•</span>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-1">Faixa de Preço:</h5>
                      <p className="text-gray-700 font-medium">{lens.priceRange}</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-1">Recomendação:</h5>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(lens.recommendation)}`}>
                        {lens.recommendation}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
            <p className="text-xs sm:text-sm text-gray-600">
              Baseado na idade ({patientData.age} anos)
            </p>
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-1 sm:py-2 bg-gray-600 text-white text-xs sm:text-sm rounded hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 