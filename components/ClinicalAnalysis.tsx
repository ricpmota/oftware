'use client';

import React, { useState, useEffect } from 'react';
import { PatientData, ClinicalResult, FinalPrescriptionData } from '../types/clinical';
import SubjectiveAdjustmentGuide from './SubjectiveAdjustmentGuide';
import LensTypeModal from './LensTypeModal';

interface ClinicalAnalysisProps {
  patientData: PatientData;
  clinicalResult: ClinicalResult;
  onComplete: (prescriptionData: FinalPrescriptionData) => void;
}

export default function ClinicalAnalysis({ patientData, clinicalResult, onComplete }: ClinicalAnalysisProps) {
  const [showLensModal, setShowLensModal] = useState(false);
  
  const [prescriptionData, setPrescriptionData] = useState<FinalPrescriptionData>({
    finalPrescription: {
      od: { s: 0, c: 0, e: 0, av: '20/20' },
      oe: { s: 0, c: 0, e: 0, av: '20/20' }
    },
    nearPrescription: {
      od: { s: 0, c: 0, e: 0, av: '20/20' },
      oe: { s: 0, c: 0, e: 0, av: '20/20' }
    },
    nearAcuity: {
      od: 'J1',
      oe: 'J1'
    },
    suggestedLensType: 'Monofocal',
    subjectiveImprovement: false,
    addition: 0,
    prescriptionDate: new Date().toISOString().split('T')[0]
  });

  // Inicializar dados da prescrição com valores da análise clínica
  useEffect(() => {
    setPrescriptionData(prev => ({
      ...prev,
      finalPrescription: {
        od: { 
          s: clinicalResult.averageMeasurements.od.s, 
          c: clinicalResult.averageMeasurements.od.c, 
          e: clinicalResult.averageMeasurements.od.e,
          av: '20/20'
        },
        oe: { 
          s: clinicalResult.averageMeasurements.oe.s, 
          c: clinicalResult.averageMeasurements.oe.c, 
          e: clinicalResult.averageMeasurements.oe.e,
          av: '20/20'
        }
      },
      nearPrescription: {
        od: { 
          s: clinicalResult.averageMeasurements.od.s, 
          c: clinicalResult.averageMeasurements.od.c, 
          e: clinicalResult.averageMeasurements.od.e,
          av: '20/20'
        },
        oe: { 
          s: clinicalResult.averageMeasurements.oe.s, 
          c: clinicalResult.averageMeasurements.oe.c, 
          e: clinicalResult.averageMeasurements.oe.e,
          av: '20/20'
        }
      }
    }));
  }, [clinicalResult]);

  // Gerar opções para Esférico (+20.00 a -20.00 de 0.25 em 0.25)
  const sphereOptions: { value: number; label: string }[] = [];
  for (let i = 20; i >= -20; i -= 0.25) {
    const value = Math.round(i * 100) / 100;
    sphereOptions.push({
      value: value,
      label: value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
    });
  }

  // Gerar opções para Cilindro (0 a -8.00 de 0.25 em 0.25)
  const cylinderOptions: { value: number; label: string }[] = [];
  for (let i = 0; i >= -8; i -= 0.25) {
    const value = Math.round(i * 100) / 100;
    cylinderOptions.push({
      value: value,
      label: value.toFixed(2)
    });
  }

  // Gerar opções para Eixo (0 a 180 graus)
  const axisOptions: { value: number; label: string }[] = [];
  for (let i = 0; i <= 180; i++) {
    axisOptions.push({
      value: i,
      label: `${i}°`
    });
  }

  // Opções de Acuidade Visual
  const acuityOptions = [
    '20/20', '20/25', '20/30', '20/35', '20/40', '20/50', '20/60', '20/70', '20/80', '20/100', 
    '20/120', '20/160', '20/320', '20/400', '20/600', 'Conta Dedos', 'Movimento de Mãos', 
    'Presença de Luz', 'Sem Presença de Luz'
  ];

  // Opções de Acuidade Visual para Perto
  const nearAcuityOptions = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'];

  const handlePrescriptionChange = (eye: 'od' | 'oe', field: 's' | 'c' | 'e' | 'av', value: number | string) => {
    setPrescriptionData(prev => ({
      ...prev,
      finalPrescription: {
        ...prev.finalPrescription,
        [eye]: { ...prev.finalPrescription[eye], [field]: value }
      }
    }));
  };

  const handleAdditionChange = (addition: number) => {
    setPrescriptionData(prev => ({
      ...prev,
      addition
    }));
  };

  const handleNearAcuityChange = (eye: 'od' | 'oe', value: string) => {
    setPrescriptionData(prev => ({
      ...prev,
      nearAcuity: {
        ...prev.nearAcuity,
        [eye]: value
      }
    }));
  };

  // Calcular automaticamente o grau para perto quando a adição ou grau final mudar
  useEffect(() => {
    if (prescriptionData.addition > 0) {
      const newNearPrescription = {
        od: {
          s: prescriptionData.finalPrescription.od.s + prescriptionData.addition,
          c: prescriptionData.finalPrescription.od.c,
          e: prescriptionData.finalPrescription.od.e,
          av: prescriptionData.finalPrescription.od.av
        },
        oe: {
          s: prescriptionData.finalPrescription.oe.s + prescriptionData.addition,
          c: prescriptionData.finalPrescription.oe.c,
          e: prescriptionData.finalPrescription.oe.e,
          av: prescriptionData.finalPrescription.oe.av
        }
      };
      
      setPrescriptionData(prev => ({
        ...prev,
        nearPrescription: newNearPrescription
      }));
    }
  }, [prescriptionData.addition, prescriptionData.finalPrescription.od.s, prescriptionData.finalPrescription.oe.s, prescriptionData.finalPrescription.od.c, prescriptionData.finalPrescription.oe.c, prescriptionData.finalPrescription.od.e, prescriptionData.finalPrescription.oe.e, prescriptionData.finalPrescription.od.av, prescriptionData.finalPrescription.oe.av]);

  const handleLensTypeChange = (lensType: string) => {
    setPrescriptionData(prev => ({ ...prev, suggestedLensType: lensType }));
  };

  const handleOpenLensModal = () => {
    setShowLensModal(true);
  };

  const handleCloseLensModal = () => {
    setShowLensModal(false);
  };

  const handleComplete = () => {
    onComplete(prescriptionData);
  };

  const getVariabilityColor = (value: number) => {
    if (value <= 0.25) return 'text-green-600';
    if (value <= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVariabilityText = (value: number) => {
    if (value <= 0.25) return 'Baixa';
    if (value <= 0.5) return 'Média';
    return 'Alta';
  };

  const getStabilityStatus = (isStable: boolean) => {
    return isStable ? 'Estável' : 'Instável';
  };

  // Formatar valor para exibição com sinal
  const formatValue = (value: number) => {
    if (value > 0) return `+${value.toFixed(2)}`;
    return value.toFixed(2);
  };

  // Lógica adaptativa baseada na idade e tipo de ametropia
  const getLensRecommendation = () => {
    const age = patientData.age;
    const odSphere = prescriptionData.finalPrescription.od.s;
    const oeSphere = prescriptionData.finalPrescription.oe.s;
    const odCylinder = Math.abs(prescriptionData.finalPrescription.od.c);
    const oeCylinder = Math.abs(prescriptionData.finalPrescription.oe.c);

    // Presbiopia (idade ≥ 40 anos)
    if (age >= 40) {
      if (age >= 50) {
        return 'Multifocal ou Progressiva';
      } else {
        return 'Bifocal ou Multifocal';
      }
    }

    // Astigmatismo alto (> 2D)
    if (odCylinder > 2.0 || oeCylinder > 2.0) {
      return 'Monofocal com lente tórica';
    }

    // Ametropia alta
    if (Math.abs(odSphere) > 4.0 || Math.abs(oeSphere) > 4.0) {
      return 'Monofocal com lente de alto índice';
    }

    return 'Monofocal';
  };

  // Verificar diferença significativa entre olhos (> 3D)
  const getAnisometropiaAlert = () => {
    const sphereDiff = Math.abs(prescriptionData.finalPrescription.od.s - prescriptionData.finalPrescription.oe.s);
    const cylinderDiff = Math.abs(prescriptionData.finalPrescription.od.c - prescriptionData.finalPrescription.oe.c);
    
    if (sphereDiff > 3.0 || cylinderDiff > 3.0) {
      return {
        alert: true,
        message: `Diferença entre olhos: ${sphereDiff.toFixed(2)}D esfera, ${cylinderDiff.toFixed(2)}D cilindro - Alto risco de diplopia`,
        severity: 'high'
      };
    }
    
    return { alert: false, message: '', severity: 'none' };
  };

  // Verificar se AV esperada seria < 20/40
  const getLowVisionAlert = () => {
    const odSphere = Math.abs(prescriptionData.finalPrescription.od.s);
    const oeSphere = Math.abs(prescriptionData.finalPrescription.oe.s);
    const odCylinder = Math.abs(prescriptionData.finalPrescription.od.c);
    const oeCylinder = Math.abs(prescriptionData.finalPrescription.oe.c);

    // Estimativa grosseira: ametropia alta pode resultar em AV < 20/40
    if (odSphere > 6.0 || oeSphere > 6.0 || odCylinder > 3.0 || oeCylinder > 3.0) {
      return {
        alert: true,
        message: 'Ametropia alta - AV esperada pode ser < 20/40. Sugerir avaliação complementar (catarata, retina)',
        severity: 'medium'
      };
    }

    return { alert: false, message: '', severity: 'none' };
  };

  // Identificar indícios de ambliopia funcional
  const getAmblyopiaAlert = () => {
    const sphereDiff = Math.abs(prescriptionData.finalPrescription.od.s - prescriptionData.finalPrescription.oe.s);
    const cylinderDiff = Math.abs(prescriptionData.finalPrescription.od.c - prescriptionData.finalPrescription.oe.c);
    const age = patientData.age;

    // Critérios para suspeita de ambliopia:
    // - Diferença > 1D em crianças < 8 anos
    // - Diferença > 2D em qualquer idade
    // - Astigmatismo unilateral > 1.5D
    if ((age < 8 && sphereDiff > 1.0) || sphereDiff > 2.0 || cylinderDiff > 1.5) {
      return {
        alert: true,
        message: 'Suspeita de ambliopia funcional - Contraindicar óculos bilateral até investigação',
        severity: 'high'
      };
    }

    return { alert: false, message: '', severity: 'none' };
  };

  // Aplicar recomendações automáticas
  useEffect(() => {
    const recommendedLens = getLensRecommendation();
    if (recommendedLens !== prescriptionData.suggestedLensType) {
      setPrescriptionData(prev => ({ ...prev, suggestedLensType: recommendedLens }));
    }
  }, [patientData.age, prescriptionData.finalPrescription]);

  const anisometropiaAlert = getAnisometropiaAlert();
  const lowVisionAlert = getLowVisionAlert();
  const amblyopiaAlert = getAmblyopiaAlert();

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
        {/* Resultados da Análise */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Análise Clínica</h2>
          
          {/* Médias Calculadas */}
          <div className="space-y-4">
            {/* Médias do AR */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">Médias do Auto Refrator</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(['od', 'oe'] as const).map((eye) => (
                  <div key={eye} className="border border-gray-200 rounded p-3">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      {eye.toUpperCase()} - {eye === 'od' ? 'Olho Direito' : 'Olho Esquerdo'}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">S:</span>
                        <span className="ml-1 font-mono text-gray-900">
                          {clinicalResult.averageMeasurements[eye].s > 0 ? '+' : ''}{clinicalResult.averageMeasurements[eye].s.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">C:</span>
                        <span className="ml-1 font-mono text-gray-900">
                          {clinicalResult.averageMeasurements[eye].c > 0 ? '+' : ''}{clinicalResult.averageMeasurements[eye].c.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">E:</span>
                        <span className="ml-1 font-mono text-gray-900">{clinicalResult.averageMeasurements[eye].e}°</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">Tipo:</span>
                      <span className={`ml-1 font-medium ${
                        clinicalResult.ametropiaType[eye] === 'Miopia' ? 'text-blue-600' :
                        clinicalResult.ametropiaType[eye] === 'Hipermetropia' ? 'text-green-600' :
                        clinicalResult.ametropiaType[eye] === 'Astigmatismo' ? 'text-purple-600' :
                        'text-gray-600'
                      }`}>
                        {clinicalResult.ametropiaType[eye]}
                      </span>
                      <span className="mx-2">|</span>
                      <span className="text-gray-500">Estabilidade:</span>
                      <span className={`ml-1 font-medium ${clinicalResult.stability[eye] ? 'text-green-600' : 'text-red-600'}`}>
                        {getStabilityStatus(clinicalResult.stability[eye])}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Variabilidade */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">Variabilidade das Medições</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(['od', 'oe'] as const).map((eye) => (
                  <div key={eye} className="border border-gray-200 rounded p-3">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      {eye.toUpperCase()} - {eye === 'od' ? 'Olho Direito' : 'Olho Esquerdo'}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">S:</span>
                        <span className={`ml-1 font-mono ${getVariabilityColor(clinicalResult.variability[eye].s)}`}>
                          {clinicalResult.variability[eye].s.toFixed(2)} ({getVariabilityText(clinicalResult.variability[eye].s)})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">C:</span>
                        <span className={`ml-1 font-mono ${getVariabilityColor(clinicalResult.variability[eye].c)}`}>
                          {clinicalResult.variability[eye].c.toFixed(2)} ({getVariabilityText(clinicalResult.variability[eye].c)})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">E:</span>
                        <span className={`ml-1 font-mono ${getVariabilityColor(clinicalResult.variability[eye].e)}`}>
                          {clinicalResult.variability[eye].e.toFixed(1)}° ({getVariabilityText(clinicalResult.variability[eye].e)})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alertas Clínicos */}
        {(anisometropiaAlert.alert || lowVisionAlert.alert || amblyopiaAlert.alert) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">⚠️ Alertas Clínicos</h2>
            
            <div className="space-y-3">
              {anisometropiaAlert.alert && (
                <div className={`p-3 rounded-lg border-l-4 ${
                  anisometropiaAlert.severity === 'high' 
                    ? 'bg-red-50 border-red-400 text-red-800' 
                    : 'bg-yellow-50 border-yellow-400 text-yellow-800'
                }`}>
                  <div className="flex items-start">
                    <span className="text-lg mr-2">🚨</span>
                    <div>
                      <h4 className="font-medium">Anisometropia Significativa</h4>
                      <p className="text-sm mt-1">{anisometropiaAlert.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {lowVisionAlert.alert && (
                <div className={`p-3 rounded-lg border-l-4 ${
                  lowVisionAlert.severity === 'high' 
                    ? 'bg-red-50 border-red-400 text-red-800' 
                    : 'bg-orange-50 border-orange-400 text-orange-800'
                }`}>
                  <div className="flex items-start">
                    <span className="text-lg mr-2">👁️</span>
                    <div>
                      <h4 className="font-medium">Baixa Visão Esperada</h4>
                      <p className="text-sm mt-1">{lowVisionAlert.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {amblyopiaAlert.alert && (
                <div className={`p-3 rounded-lg border-l-4 ${
                  amblyopiaAlert.severity === 'high' 
                    ? 'bg-red-50 border-red-400 text-red-800' 
                    : 'bg-yellow-50 border-yellow-400 text-yellow-800'
                }`}>
                  <div className="flex items-start">
                    <span className="text-lg mr-2">⚠️</span>
                    <div>
                      <h4 className="font-medium">Suspeita de Ambliopia</h4>
                      <p className="text-sm mt-1">{amblyopiaAlert.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Informações Gerais */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">Dados do Paciente</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nome:</span>
                  <span className="font-medium text-gray-900">{patientData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Idade:</span>
                  <span className="font-medium text-gray-900">{patientData.age} anos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gênero:</span>
                  <span className="font-medium text-gray-900">
                    {patientData.gender === 'male' ? 'Masculino' : 
                     patientData.gender === 'female' ? 'Feminino' : 
                     patientData.gender === 'other' ? 'Outro' : 'Não informado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Usa óculos:</span>
                  <span className="font-medium text-gray-900">{patientData.usesGlasses ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">Valores Iniciais</h3>
              
              {/* OD */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">OD - Olho Direito</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Esférico:</span>
                    <span className="font-medium text-gray-900">
                      {clinicalResult.subjectiveTestStart.od.s > 0 ? '+' : ''}{clinicalResult.subjectiveTestStart.od.s.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cilindro:</span>
                    <span className="font-medium text-gray-900">
                      {clinicalResult.subjectiveTestStart.od.c > 0 ? '+' : ''}{clinicalResult.subjectiveTestStart.od.c.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Eixo:</span>
                    <span className="font-medium text-gray-900">{clinicalResult.subjectiveTestStart.od.e}°</span>
                  </div>
                </div>
              </div>
              
              {/* OE */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">OE - Olho Esquerdo</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Esférico:</span>
                    <span className="font-medium text-gray-900">
                      {clinicalResult.subjectiveTestStart.oe.s > 0 ? '+' : ''}{clinicalResult.subjectiveTestStart.oe.s.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cilindro:</span>
                    <span className="font-medium text-gray-900">
                      {clinicalResult.subjectiveTestStart.oe.c > 0 ? '+' : ''}{clinicalResult.subjectiveTestStart.oe.c.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Eixo:</span>
                    <span className="font-medium text-gray-900">{clinicalResult.subjectiveTestStart.oe.e}°</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roteiro de Ajuste Subjetivo */}
        <SubjectiveAdjustmentGuide 
          patientData={patientData}
          clinicalResult={clinicalResult}
        />

        {/* Prescrição Final */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Prescrição Final</h2>
          
          {/* Data da Prescrição */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Data da Prescrição</label>
            <input
              type="date"
              value={prescriptionData.prescriptionDate}
              onChange={(e) => setPrescriptionData(prev => ({ ...prev, prescriptionDate: e.target.value }))}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          
          <div className="space-y-4">
            {/* Grau Final */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">Grau Final Prescrito</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Olho Direito */}
                <div className="border border-gray-200 rounded p-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">
                    OD - Olho Direito
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">S (Esférico)</label>
                      <select
                        value={prescriptionData.finalPrescription.od.s || 0}
                        onChange={(e) => handlePrescriptionChange('od', 's', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {sphereOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">C (Cilindro)</label>
                      <select
                        value={prescriptionData.finalPrescription.od.c || 0}
                        onChange={(e) => handlePrescriptionChange('od', 'c', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {cylinderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">E (Eixo)</label>
                      <select
                        value={prescriptionData.finalPrescription.od.e || 0}
                        onChange={(e) => handlePrescriptionChange('od', 'e', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {axisOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-600 mb-2">AV (Acuidade Visual)</label>
                    <select
                      value={prescriptionData.finalPrescription.od.av || '20/20'}
                      onChange={(e) => handlePrescriptionChange('od', 'av', e.target.value)}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {acuityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Olho Esquerdo */}
                <div className="border border-gray-200 rounded p-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">
                    OE - Olho Esquerdo
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">S (Esférico)</label>
                      <select
                        value={prescriptionData.finalPrescription.oe.s || 0}
                        onChange={(e) => handlePrescriptionChange('oe', 's', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {sphereOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">C (Cilindro)</label>
                      <select
                        value={prescriptionData.finalPrescription.oe.c || 0}
                        onChange={(e) => handlePrescriptionChange('oe', 'c', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {cylinderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">E (Eixo)</label>
                      <select
                        value={prescriptionData.finalPrescription.oe.e || 0}
                        onChange={(e) => handlePrescriptionChange('oe', 'e', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {axisOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-600 mb-2">AV (Acuidade Visual)</label>
                    <select
                      value={prescriptionData.finalPrescription.oe.av || '20/20'}
                      onChange={(e) => handlePrescriptionChange('oe', 'av', e.target.value)}
                      className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {acuityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Adição para Perto */}
            {patientData.age >= 40 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Adição para Perto</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Valor da Adição</label>
                  <select
                    value={prescriptionData.addition}
                    onChange={(e) => handleAdditionChange(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value={0}>Selecione a adição</option>
                    <option value={1.00}>+1.00</option>
                    <option value={1.25}>+1.25</option>
                    <option value={1.50}>+1.50</option>
                    <option value={1.75}>+1.75</option>
                    <option value={2.00}>+2.00</option>
                    <option value={2.25}>+2.25</option>
                    <option value={2.50}>+2.50</option>
                    <option value={2.75}>+2.75</option>
                    <option value={3.00}>+3.00</option>
                  </select>
                </div>
                
                {/* Grau para Perto (calculado automaticamente) */}
                {prescriptionData.addition > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Grau para Perto (Calculado Automaticamente)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(['od', 'oe'] as const).map((eye) => (
                        <div key={eye} className="border border-gray-200 rounded p-3">
                          <h5 className="text-sm font-medium text-gray-600 mb-2">
                            {eye.toUpperCase()} - {eye === 'od' ? 'Olho Direito' : 'Olho Esquerdo'}
                          </h5>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">S</label>
                              <div className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-900 font-mono">
                                {formatValue(prescriptionData.nearPrescription[eye].s)}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">C</label>
                              <div className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-900 font-mono">
                                {formatValue(prescriptionData.nearPrescription[eye].c)}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">E</label>
                              <div className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-900 font-mono">
                                {prescriptionData.nearPrescription[eye].e}°
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Acuidade Visual para Perto */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">Acuidade Visual para Perto</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* OD */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">OD - Olho Direito</label>
                  <select
                    value={prescriptionData.nearAcuity.od}
                    onChange={(e) => handleNearAcuityChange('od', e.target.value)}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    {nearAcuityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* OE */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">OE - Olho Esquerdo</label>
                  <select
                    value={prescriptionData.nearAcuity.oe}
                    onChange={(e) => handleNearAcuityChange('oe', e.target.value)}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    {nearAcuityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tipo de Lente */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-gray-700">Tipo de Lente Sugerida</h3>
                <button
                  type="button"
                  onClick={handleOpenLensModal}
                  className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <span className="mr-1">🔍</span>
                  Guia de Lentes
                </button>
              </div>
              <select
                value={prescriptionData.suggestedLensType}
                onChange={(e) => handleLensTypeChange(e.target.value)}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="Monofocal">Monofocal</option>
                <option value="Bifocal">Bifocal</option>
                <option value="Multifocal">Multifocal</option>
                <option value="Progressiva">Progressiva</option>
              </select>
            </div>

            {/* Melhora Subjetiva */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">Melhora Subjetiva</h3>
              <div className="flex space-x-4">
                <label className="flex items-center text-gray-900">
                  <input
                    type="radio"
                    checked={prescriptionData.subjectiveImprovement === true}
                    onChange={() => setPrescriptionData(prev => ({ ...prev, subjectiveImprovement: true }))}
                    className="mr-2"
                  />
                  Sim
                </label>
                <label className="flex items-center text-gray-900">
                  <input
                    type="radio"
                    checked={prescriptionData.subjectiveImprovement === false}
                    onChange={() => setPrescriptionData(prev => ({ ...prev, subjectiveImprovement: false }))}
                    className="mr-2"
                  />
                  Não
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Conclusão */}
        <div className="flex space-x-3">
          <button
            onClick={handleComplete}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Finalizar Prescrição
          </button>
        </div>




      </div>

      {/* Modal de Tipos de Lentes - Movido para fora do container principal */}
      <LensTypeModal
        isOpen={showLensModal}
        onClose={handleCloseLensModal}
        patientData={patientData}
        currentLensType={prescriptionData.suggestedLensType}
        onSelectLensType={handleLensTypeChange}
      />
    </>
  );
} 