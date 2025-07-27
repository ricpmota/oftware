'use client';

import React, { useState } from 'react';
import CataractTypesModal from './CataractTypesModal';

interface CataractProps {
  onModalStateChange?: (isOpen: boolean) => void;
}

export default function Cataract({ onModalStateChange }: CataractProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
    onModalStateChange?.(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    onModalStateChange?.(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <img 
            src="/icones/catarata.png" 
            alt="Catarata" 
            className="w-16 h-16 mr-4"
          />
          <h1 className="text-3xl font-bold text-gray-800">Avaliação de Catarata</h1>
        </div>
        <p className="text-lg text-gray-600">Avaliação clínica completa para diagnóstico e planejamento cirúrgico</p>
      </div>

      {/* Botão para abrir o modal */}
      <div className="text-center mb-8">
        <button
          onClick={openModal}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          📚 Ver Tipos de Catarata
        </button>
      </div>

      {/* Em Desenvolvimento */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-8 mb-8">
        <div className="flex items-center mb-6">
          <span className="text-cyan-600 text-3xl mr-4">🔧</span>
          <h3 className="text-2xl font-semibold text-cyan-800">Em Desenvolvimento</h3>
        </div>
        <p className="text-cyan-700 text-lg mb-4">
          O módulo de Catarata está sendo desenvolvido com foco em:
        </p>
        <ul className="text-cyan-700 space-y-2 text-lg">
          <li>• Avaliação clínica de catarata</li>
          <li>• Classificação por localização, causa e forma</li>
          <li>• Registro de sintomas e achados</li>
          <li>• Indicações cirúrgicas</li>
          <li>• Integração com dados do paciente da refração</li>
          <li>• Relatórios especializados</li>
        </ul>
        <div className="mt-6 p-4 bg-white rounded-lg border border-cyan-200">
          <p className="text-cyan-800 font-medium">
            <strong>Nota:</strong> Este módulo utilizará os mesmos dados do paciente da aba Refração, 
            garantindo consistência e integração entre os módulos clínicos.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Funcionalidades Planejadas</h3>
          <ul className="text-sm text-gray-600 space-y-3">
            <li>• Avaliação de sintomas de catarata</li>
            <li>• Classificação anatômica e etiológica</li>
            <li>• Registro de achados ao exame</li>
            <li>• Determinação de indicações cirúrgicas</li>
            <li>• Integração com dados do paciente</li>
            <li>• Relatórios clínicos especializados</li>
          </ul>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Objetivos do Módulo</h3>
          <ul className="text-sm text-gray-600 space-y-3">
            <li>• Diagnóstico preciso de catarata</li>
            <li>• Planejamento cirúrgico otimizado</li>
            <li>• Documentação clínica completa</li>
            <li>• Acompanhamento evolutivo</li>
            <li>• Integração com outros módulos</li>
            <li>• Suporte à decisão clínica</li>
          </ul>
        </div>
      </div>

      {/* Modal */}
      <CataractTypesModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </div>
  );
} 