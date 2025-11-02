'use client';

import React, { useState } from 'react';
import { DoctorProfile } from '../types/doctor';
import LensTypeModal from './LensTypeModal';
import CataractTypesModal from './CataractTypesModal';
import GlaucomaForm from './GlaucomaForm';
import CirurgiaRefrativaForm from './CirurgiaRefrativaForm';
import Refraction from './Refraction';
import Cataract from './Cataract';
import Retina from './Retina';
import Cornea from './Cornea';
import Patients from './Patients';
import EmergenciaMenu from './EmergenciaMenu';
import Farmacos from '../app/Farmacologia/Farmacos';

interface HomeProps {
  doctorProfile: DoctorProfile | null;
  onEditProfile: () => void;
  onLogout: () => void;
}

// Componente da aba Glaucoma Teórico
function GlaucomaTab() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Glaucoma</h1>
        <p className="text-lg text-gray-600">Sistema completo de avaliação e tratamento do glaucoma</p>
      </div>

      {/* O que é o Glaucoma? */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
            <img src="/icones/Glaucoma.png" alt="Glaucoma" className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">O que é o Glaucoma?</h2>
        </div>
        <p className="text-gray-700 mb-4 leading-relaxed">
          O glaucoma é uma doença ocular que danifica o nervo óptico, geralmente causada por pressão intraocular elevada. É uma das principais causas de cegueira irreversível no mundo.
        </p>
        <div className="grid md:grid-cols-2 gap-6 mb-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">Glaucoma de Ângulo Aberto</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Forma mais comum, progressão lenta e assintomática. O ângulo de drenagem está aberto mas não funciona adequadamente.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">Glaucoma de Ângulo Fechado</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Forma aguda que pode causar dor intensa e perda súbita da visão. Requer tratamento imediato.
            </p>
          </div>
        </div>
      </div>

      {/* Fatores de Risco */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mr-4">
            <span className="text-white text-xl font-bold">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Fatores de Risco</h2>
      </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Idade</h3>
            <p className="text-gray-700 text-sm">Maior risco após 40 anos</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Histórico Familiar</h3>
            <p className="text-gray-700 text-sm">Parentes com glaucoma</p>
        </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Pressão Intraocular</h3>
                         <p className="text-gray-700 text-sm">PIO {'>'} 21 mmHg</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Etnia</h3>
            <p className="text-gray-700 text-sm">Afrodescendentes têm maior risco</p>
          </div>
        </div>
      </div>

      {/* Tratamento */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
            <span className="text-white text-xl font-bold">💊</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Tratamento</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">💧</span>
            </div>
            <h3 className="font-semibold text-blue-800 mb-2">Colírios</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Primeira linha de tratamento para reduzir a pressão intraocular.
            </p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200 text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">⚡</span>
            </div>
            <h3 className="font-semibold text-purple-800 mb-2">Laser</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Trabeculoplastia a laser para melhorar o fluxo de humor aquoso.
            </p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200 text-center">
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">🔪</span>
            </div>
            <h3 className="font-semibold text-orange-800 mb-2">Cirurgia</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Trabeculectomia ou implantes para casos avançados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 

export default function Home({ doctorProfile, onEditProfile, onLogout }: HomeProps) {
  const [activeSubTab, setActiveSubTab] = useState('');
  const [showLensModal, setShowLensModal] = useState(false);
  const [showCataractModal, setShowCataractModal] = useState(false);

  // Se estiver em uma sub-aba específica, mostrar o conteúdo
  if (activeSubTab) {
  return (
      <div className="min-h-screen bg-gray-50">
        {/* Header com botão voltar - apenas para módulos sem header personalizado */}
        {activeSubTab !== 'glaucoma' && activeSubTab !== 'glaucoma-theory' && (
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center">
            <button
                onClick={() => setActiveSubTab('')}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
            </button>
              <h1 className="ml-4 text-lg font-semibold text-gray-800">
                {activeSubTab === 'refraction' && 'Refração'}
                {activeSubTab === 'cataract' && 'Catarata'}
                {activeSubTab === 'retina' && 'Retina'}
                {activeSubTab === 'patients' && 'Pacientes'}
                {activeSubTab === 'cirurgia-refrativa' && 'Cirurgia Refrativa'}
                {activeSubTab === 'cornea' && 'Córnea'}
                {activeSubTab === 'emergencia' && 'Emergência'}
                {activeSubTab === 'estrabismo' && 'Estrabismo'}
                {activeSubTab === 'farmacologia' && 'Farmacologia'}
                {activeSubTab === 'genetica' && 'Genética'}
                {activeSubTab === 'lentes-contato' && 'Lentes de Contato'}
                {activeSubTab === 'neuroftalmo' && 'Neuroftalmo'}
                {activeSubTab === 'oncologia-ocular' && 'Oncologia Ocular'}
                {activeSubTab === 'plastica' && 'Plástica'}
                {activeSubTab === 'uveites' && 'Uveítes'}
              </h1>
        </div>
      </div>
        )}

        {/* Conteúdo específico */}
        {activeSubTab === 'refraction' && (
          <Refraction doctorProfile={doctorProfile} />
        )}
        
        {activeSubTab === 'cataract' && (
          <Cataract onModalStateChange={() => {}} />
        )}
        
        {activeSubTab === 'glaucoma' && (
          <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveSubTab('')}
                    className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-4"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Voltar
                  </button>
                  <h1 className="text-lg font-semibold text-gray-800">Glaucoma</h1>
    </div>
                <button
                  onClick={() => setActiveSubTab('glaucoma-theory')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Teórico
                </button>
        </div>
      </div>
            <GlaucomaForm />
        </div>
        )}
        
        {activeSubTab === 'retina' && (
          <Retina />
        )}

        {activeSubTab === 'patients' && (
          <Patients />
        )}

        {/* Cirurgia Refrativa */}
        {activeSubTab === 'cirurgia-refrativa' && (
          <CirurgiaRefrativaForm />
        )}

        {activeSubTab === 'cornea' && (
          <Cornea />
        )}

        {activeSubTab === 'emergencia' && (
          <EmergenciaMenu />
        )}

        {activeSubTab === 'estrabismo' && (
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Estrabismo</h1>
              <p className="text-lg text-gray-600">Módulo em desenvolvimento</p>
            </div>
          </div>
        )}

        {activeSubTab === 'farmacologia' && (
          <Farmacos />
        )}

        {activeSubTab === 'genetica' && (
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Genética</h1>
              <p className="text-lg text-gray-600">Módulo em desenvolvimento</p>
      </div>
    </div>
        )}

        {activeSubTab === 'lentes-contato' && (
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Lentes de Contato</h1>
              <p className="text-lg text-gray-600">Módulo em desenvolvimento</p>
        </div>
      </div>
        )}

        {activeSubTab === 'neuroftalmo' && (
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Neuroftalmo</h1>
              <p className="text-lg text-gray-600">Módulo em desenvolvimento</p>
            </div>
          </div>
        )}

        {activeSubTab === 'oncologia-ocular' && (
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Oncologia Ocular</h1>
              <p className="text-lg text-gray-600">Módulo em desenvolvimento</p>
      </div>
    </div>
        )}

        {activeSubTab === 'plastica' && (
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Plástica</h1>
              <p className="text-lg text-gray-600">Módulo em desenvolvimento</p>
        </div>
      </div>
        )}

        {activeSubTab === 'uveites' && (
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Uveítes</h1>
              <p className="text-lg text-gray-600">Módulo em desenvolvimento</p>
            </div>
          </div>
        )}
      
        {activeSubTab === 'glaucoma-theory' && (
          <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="max-w-4xl mx-auto flex items-center">
        <button
                  onClick={() => setActiveSubTab('glaucoma')}
                  className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Voltar
        </button>
                <h1 className="ml-4 text-lg font-semibold text-gray-800">Glaucoma - Teórico</h1>
    </div>
            </div>
            <GlaucomaTab />
  </div>
)}
        
        {/* Modais */}
        <CataractTypesModal 
          isOpen={showCataractModal} 
          onClose={() => setShowCataractModal(false)} 
        />
        
        <LensTypeModal 
          isOpen={showLensModal} 
          onClose={() => setShowLensModal(false)} 
          patientData={{ name: 'Paciente', age: 40, arMeasurements: { od: [{ s: 0, c: 0, e: 0 }], oe: [{ s: 0, c: 0, e: 0 }] }, usesGlasses: false, symptoms: [], knownDiagnoses: [], id: '', birthDate: '', gender: '', createdAt: '', updatedAt: '' }}
          currentLensType={''}
          onSelectLensType={() => {}}
        />
      </div>
    );
  }

  // Página principal estilo app de iPhone
  return (
    <div className="min-h-screen bg-gray-50 px-4 relative">
      {/* Logo no canto superior esquerdo - Posicionamento absoluto */}
      <div className="absolute -top-6 left-4 z-10">
        <img src="/icones/oftware.png" alt="Oftware" className="w-24 h-auto" />
      </div>


      {/* Grid de botões estilo app - Centralizado */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-2xl">
          {/* Refração */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('refraction')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
                              <img src="/icones/greens.png" alt="Refração" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Refração</h3>
          </div>

          {/* Catarata */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('cataract')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
                              <img src="/icones/catarata.png" alt="Catarata" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Catarata</h3>
          </div>

          {/* Glaucoma */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('glaucoma')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
                              <img src="/icones/Glaucoma.png" alt="Glaucoma" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Glaucoma</h3>
          </div>

          {/* Retina */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('retina')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
                              <img src="/icones/Retina.png" alt="Retina" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Retina</h3>
          </div>

          {/* Cirurgia Refrativa */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('cirurgia-refrativa')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/cirurgia-refrativa.png" alt="Cirurgia Refrativa" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Cirurgia Refrativa</h3>
          </div>

          {/* Córnea */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('cornea')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/cornea.png" alt="Córnea" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Córnea</h3>
          </div>

          {/* Emergência */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('emergencia')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/Emergência.png" alt="Emergência" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Emergência</h3>
          </div>

          {/* Estrabismo */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('estrabismo')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/Estrabismo.png" alt="Estrabismo" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Estrabismo</h3>
          </div>

          {/* Farmacologia */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('farmacologia')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/Farmacologia.png" alt="Farmacologia" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Farmacologia</h3>
          </div>

          {/* Genética */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('genetica')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/Genetica.png" alt="Genética" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Genética</h3>
          </div>

          {/* Lentes de Contato */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('lentes-contato')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/Lentes.png" alt="Lentes de Contato" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Lentes de Contato</h3>
          </div>

          {/* Neuroftalmo */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('neuroftalmo')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/neurooftalmo.png" alt="Neuroftalmo" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Neuroftalmo</h3>
          </div>

          {/* Oncologia Ocular */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('oncologia-ocular')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/oncologia.png" alt="Oncologia Ocular" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Oncologia Ocular</h3>
          </div>

          {/* Plástica */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('plastica')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/plastica.png" alt="Plástica" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Plástica</h3>
          </div>

          {/* Uveítes */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActiveSubTab('uveites')}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
            >
              <img src="/icones/uveite.png" alt="Uveítes" className="w-10 h-10 md:w-12 md:h-12" />
            </button>
            <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Uveítes</h3>
          </div>

          {/* Última linha - Pacientes, Perfil do Médico e Sair */}
          <div className="col-span-3 flex justify-center items-center gap-8 mt-4">
            {/* Pacientes */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => setActiveSubTab('patients')}
                className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
              >
                <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </button>
              <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Pacientes</h3>
            </div>

            {/* Perfil do Médico */}
            {doctorProfile && (
              <div className="flex flex-col items-center">
                <button
                  onClick={onEditProfile}
                  className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 flex items-center justify-center"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {doctorProfile.name?.charAt(0)}
                    </span>
                  </div>
                </button>
                <div className="text-center mt-2">
                  <h3 className="font-semibold text-gray-800 text-xs md:text-sm">{doctorProfile.name}</h3>
                </div>
              </div>
            )}

            {/* Botão de Sair */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  console.log('Botão de logout clicado!');
                  onLogout();
                }}
                className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-red-200 flex items-center justify-center"
                title="Sair"
              >
                <svg className="w-10 h-10 md:w-12 md:h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              <h3 className="font-semibold text-gray-800 text-xs md:text-sm mt-2 text-center">Sair</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 