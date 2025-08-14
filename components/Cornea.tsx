'use client';

import React, { useState } from 'react';
import { MicroscopyInput } from "../app/Cornea/microscopyInputs";
import { TopographyInput } from "../app/Cornea/topoInputs";
import { 
  defaultMicroscopyInput, 
  validateMicroscopyInput, 
  renderMicroscopyReport,
  defaultTopographyInput, 
  validateTopographyInput, 
  renderTopographyReport 
} from "../app/Cornea/oftware_cornea_4_arquivos_microscopia_topografia";

export default function Cornea() {
  const [activeTab, setActiveTab] = useState<'microscopia' | 'topografia' | 'paquimetria'>('microscopia');
  const [selectedEye, setSelectedEye] = useState<'OD' | 'OE'>('OD');
  
  // Estados para Microscopia
  const [microscopyOD, setMicroscopyOD] = useState<MicroscopyInput>(defaultMicroscopyInput('OD'));
  const [microscopyOE, setMicroscopyOE] = useState<MicroscopyInput>(defaultMicroscopyInput('OE'));
  
  // Estados para Topografia
  const [topoOD, setTopoOD] = useState<TopographyInput>(defaultTopographyInput('OD'));
  const [topoOE, setTopoOE] = useState<TopographyInput>(defaultTopographyInput('OE'));
  
  // Estado para o laudo
  const [reportLines, setReportLines] = useState<string[]>([]);

  // Handlers genéricos para atualizar campos
  function handleMicroscopyChange(eye: "OD" | "OE", field: keyof MicroscopyInput, value: MicroscopyInput[keyof MicroscopyInput]) {
    if (eye === "OD") setMicroscopyOD(prev => ({ ...prev, [field]: value }));
    else setMicroscopyOE(prev => ({ ...prev, [field]: value }));
  }

  function handleTopoChange(eye: "OD" | "OE", field: keyof TopographyInput, value: TopographyInput[keyof TopographyInput]) {
    if (eye === "OD") setTopoOD(prev => ({ ...prev, [field]: value }));
    else setTopoOE(prev => ({ ...prev, [field]: value }));
  }

  // Funções de análise
  function analisarMicroscopia() {
    const valOD = validateMicroscopyInput(microscopyOD);
    const valOE = validateMicroscopyInput(microscopyOE);
    if (!valOD.ok || !valOE.ok) {
      alert([...valOD.errors, ...valOE.errors].join("\n"));
      return;
    }
    setReportLines(renderMicroscopyReport(microscopyOD, microscopyOE));
  }

  function analisarTopografia() {
    const valOD = validateTopographyInput(topoOD);
    const valOE = validateTopographyInput(topoOE);
    if (!valOD.ok || !valOE.ok) {
      alert([...valOD.errors, ...valOE.errors].join("\n"));
      return;
    }
    setReportLines(renderTopographyReport(topoOD, topoOE));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('microscopia')}
            className={`px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              activeTab === 'microscopia'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Microscopia Especular
          </button>
          <button
            onClick={() => setActiveTab('topografia')}
            className={`px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              activeTab === 'topografia'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Topografia/Tomografia
          </button>
          <button
            onClick={() => setActiveTab('paquimetria')}
            className={`px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              activeTab === 'paquimetria'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Paquimetria
          </button>
        </div>
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'microscopia' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Microscopia Especular</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Seleção de olho */}
            <div className="col-span-2">
              <div className="flex justify-center mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => setSelectedEye('OD')}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        selectedEye === 'OD' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Olho Direito (OD)
                    </button>
                    <button 
                      onClick={() => setSelectedEye('OE')}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        selectedEye === 'OE' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Olho Esquerdo (OE)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados principais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Dados Principais</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Densidade Endotelial (células/mm²)
                </label>
                <input
                  type="number"
                  value={selectedEye === 'OD' ? microscopyOD.endothelialDensity || '' : microscopyOE.endothelialDensity || ''}
                  onChange={(e) => handleMicroscopyChange(selectedEye, 'endothelialDensity', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 2500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coeficiente de Variação (%)
                </label>
                <input
                  type="number"
                  value={selectedEye === 'OD' ? microscopyOD.coefVariationPct || '' : microscopyOE.coefVariationPct || ''}
                  onChange={(e) => handleMicroscopyChange(selectedEye, 'coefVariationPct', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hexagonalidade (%)
                </label>
                <input
                  type="number"
                  value={selectedEye === 'OD' ? microscopyOD.hexagonalityPct || '' : microscopyOE.hexagonalityPct || ''}
                  onChange={(e) => handleMicroscopyChange(selectedEye, 'hexagonalityPct', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 65"
                />
              </div>
            </div>

            {/* Achados morfológicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Achados Morfológicos</h3>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedEye === 'OD' ? microscopyOD.guttata : microscopyOE.guttata}
                    onChange={(e) => handleMicroscopyChange(selectedEye, 'guttata', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Presença de Guttata</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedEye === 'OD' ? microscopyOD.beatenMetalAspect : microscopyOE.beatenMetalAspect}
                    onChange={(e) => handleMicroscopyChange(selectedEye, 'beatenMetalAspect', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Aspecto Metal-Batido</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paquimetria Central (µm)
                </label>
                <input
                  type="number"
                  value={selectedEye === 'OD' ? microscopyOD.centralCCTum || '' : microscopyOE.centralCCTum || ''}
                  onChange={(e) => handleMicroscopyChange(selectedEye, 'centralCCTum', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 540"
                />
              </div>
            </div>
          </div>

          {/* Botão de análise */}
          <div className="mt-6 text-center">
            <button 
              onClick={analisarMicroscopia}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Analisar Dados
            </button>
          </div>

          {/* Exibição do laudo */}
          {reportLines.length > 0 && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              {reportLines.map((line, idx) => (
                <p key={idx} className="text-sm text-gray-800">{line}</p>
              ))}
              <button
                onClick={() => navigator.clipboard.writeText(reportLines.join("\n"))}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Copiar Laudo
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'topografia' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Topografia/Tomografia</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Seleção de olho */}
            <div className="col-span-2">
              <div className="flex justify-center mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => setSelectedEye('OD')}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        selectedEye === 'OD' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Olho Direito (OD)
                    </button>
                    <button 
                      onClick={() => setSelectedEye('OE')}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        selectedEye === 'OE' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Olho Esquerdo (OE)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados principais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Dados Principais</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kmax (D)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedEye === 'OD' ? topoOD.KmaxD || '' : topoOE.KmaxD || ''}
                  onChange={(e) => handleTopoChange(selectedEye, 'KmaxD', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 45.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ks (D)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedEye === 'OD' ? topoOD.KsD || '' : topoOE.KsD || ''}
                  onChange={(e) => handleTopoChange(selectedEye, 'KsD', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 44.2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kf (D)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedEye === 'OD' ? topoOD.KfD || '' : topoOE.KfD || ''}
                  onChange={(e) => handleTopoChange(selectedEye, 'KfD', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 42.8"
                />
              </div>
            </div>

            {/* Paquimetria e elevações */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Paquimetria e Elevações</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paquimetria Mínima (µm)
                </label>
                <input
                  type="number"
                  value={selectedEye === 'OD' ? topoOD.pachyMinUm || '' : topoOE.pachyMinUm || ''}
                  onChange={(e) => handleTopoChange(selectedEye, 'pachyMinUm', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 520"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Elevação Posterior (µm)
                </label>
                <input
                  type="number"
                  value={selectedEye === 'OD' ? topoOD.posteriorElevUm || '' : topoOE.posteriorElevUm || ''}
                  onChange={(e) => handleTopoChange(selectedEye, 'posteriorElevUm', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Índice de Suspeição
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedEye === 'OD' ? topoOD.ISvalue || '' : topoOE.ISvalue || ''}
                  onChange={(e) => handleTopoChange(selectedEye, 'ISvalue', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 1.2"
                />
              </div>
            </div>
          </div>

          {/* Botão de análise */}
          <div className="mt-6 text-center">
            <button 
              onClick={analisarTopografia}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Analisar Topografia
            </button>
          </div>

          {/* Exibição do laudo */}
          {reportLines.length > 0 && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              {reportLines.map((line, idx) => (
                <p key={idx} className="text-sm text-gray-800">{line}</p>
              ))}
              <button
                onClick={() => navigator.clipboard.writeText(reportLines.join("\n"))}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Copiar Laudo
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'paquimetria' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Paquimetria</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Dados de paquimetria */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Medidas de Paquimetria</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Central (µm)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 540"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Superior (µm)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 550"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inferior (µm)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 530"
                />
              </div>
            </div>

            {/* Mapa de paquimetria */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Mapa de Paquimetria</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-xs text-gray-500">Superior</div>
                    <div className="font-semibold">550 µm</div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="text-xs text-gray-500">Central</div>
                    <div className="font-semibold">540 µm</div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="text-xs text-gray-500">Inferior</div>
                    <div className="font-semibold">530 µm</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold">
                  Gerar Mapa
                </button>
              </div>
            </div>
          </div>

          {/* Botão de análise */}
          <div className="mt-6 text-center">
            <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              Analisar Paquimetria
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 