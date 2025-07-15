'use client';

import React, { useState, useEffect } from 'react';
import DataEntryForm from './DataEntryForm';
import ClinicalAnalysis from './ClinicalAnalysis';
import FinalPrescription from './FinalPrescription';
import { analyzeARData, calculateNearAddition } from '../utils/analyzeARData';
import { suggestSubjectivePath } from '../utils/suggestSubjectivePath';
import { DoctorProfile } from '../types/doctor';
import { PatientData, ClinicalResult, FinalPrescriptionData } from '../types/clinical';
import { PatientService, Patient } from '../services/patientService';
import { usePatientContext } from '../contexts/PatientContext';
import SaveConfirmationModal from './SaveConfirmationModal';
import SelectPatientModal from './SelectPatientModal';
import { generatePatientId } from '../utils/patientUtils';

interface RefractionProps {
  doctorProfile: DoctorProfile | null;
}

export default function Refraction({ doctorProfile }: RefractionProps) {
  const { currentPatient, setCurrentPatient, isPatientInEdit, setIsPatientInEdit } = usePatientContext();
  const [currentStep, setCurrentStep] = useState<'data-entry' | 'analysis' | 'prescription'>('data-entry');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [patientData, setPatientData] = useState<PatientData>({
    id: generatePatientId(),
    name: '',
    birthDate: '',
    age: 0,
    gender: '',
    usesGlasses: false,
    arMeasurements: {
      od: [{ s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }],
      oe: [{ s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }]
    },
    symptoms: [],
    knownDiagnoses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Sincronizar com o paciente global quando disponível
  useEffect(() => {
    console.log('🔄 useEffect de sincronização executado:');
    console.log('  - currentPatient:', currentPatient ? 'existe' : 'não existe');
    console.log('  - isPatientInEdit:', isPatientInEdit);
    console.log('  - currentStep atual:', currentStep);
    console.log('  - Stack trace:', new Error().stack?.split('\n').slice(1, 4).join('\n'));
    
    // Só sincronizar se não estivermos na etapa de prescrição
    if (currentPatient && isPatientInEdit && currentStep !== 'prescription') {
      console.log('⚠️ Sincronizando com contexto global - MUDANDO PARA ANALYSIS');
      setPatientData(currentPatient);
      setCurrentStep('analysis');
      setHasUnsavedChanges(false);
    } else {
      console.log('✅ useEffect não sincronizou (já na prescrição ou condições não atendidas)');
    }
  }, [currentPatient, isPatientInEdit, currentStep]);

  // Detectar mudanças não salvas
  useEffect(() => {
    if (currentPatient && isPatientInEdit) {
      const hasChanges = JSON.stringify(patientData) !== JSON.stringify(currentPatient);
      setHasUnsavedChanges(hasChanges);
    }
  }, [patientData, currentPatient, isPatientInEdit]);

  const [clinicalResult, setClinicalResult] = useState<ClinicalResult | null>(null);
  const [finalPrescriptionData, setFinalPrescriptionData] = useState<FinalPrescriptionData | null>(null);

  const handleDataSubmit = async (data: PatientData) => {
    try {
      // Salvar paciente automaticamente no Firebase
      await PatientService.savePatient(data);
      console.log('✅ Paciente salvo automaticamente:', data.name);
    } catch (error) {
      console.error('❌ Erro ao salvar paciente:', error);
      // Continuar mesmo se houver erro ao salvar
    }
    
    setPatientData(data);
    // Definir como paciente atual global
    setCurrentPatient(data);
    setIsPatientInEdit(true);
    
    const result = performClinicalAnalysis(data);
    setClinicalResult(result);
    setCurrentStep('analysis');
  };

  const handleAnalysisComplete = async (prescriptionData: FinalPrescriptionData) => {
    console.log('🔄 Iniciando finalização da prescrição...');
    console.log('📋 Dados da prescrição:', prescriptionData);
    console.log('👤 Dados do paciente:', patientData);
    
    let updatedPatient: PatientData;
    
    try {
      // Salvar a prescrição final no paciente
      updatedPatient = {
        ...patientData,
        finalPrescription: prescriptionData,
        updatedAt: new Date().toISOString()
      };
      
      console.log('💾 Salvando paciente atualizado:', updatedPatient);
      
      // Salvar no Firebase
      await PatientService.savePatient(updatedPatient);
      
      // Atualizar estado local
      setPatientData(updatedPatient);
      setFinalPrescriptionData(prescriptionData);
      setHasUnsavedChanges(false);
      
      console.log('✅ Prescrição final salva com sucesso');
      console.log('📱 Estado após salvar:');
      console.log('  - finalPrescriptionData:', prescriptionData);
      console.log('  - currentStep será definido como:', 'prescription');
    } catch (error) {
      console.error('❌ Erro ao salvar prescrição final:', error);
      // Continuar mesmo com erro para não quebrar o fluxo
      updatedPatient = {
        ...patientData,
        finalPrescription: prescriptionData,
        updatedAt: new Date().toISOString()
      };
    }
    
    console.log('📱 Mudando para etapa de prescrição...');
    setCurrentStep('prescription');
    
    // Atualizar o contexto global
    setCurrentPatient(updatedPatient);
    
    // Log adicional após a mudança de estado
    setTimeout(() => {
      console.log('🔍 Estado após mudança:');
      console.log('  - currentStep atual:', currentStep);
      console.log('  - finalPrescriptionData atual:', finalPrescriptionData);
    }, 100);
  };

  const handleBackToDataEntry = () => {
    setCurrentStep('data-entry');
  };

  const handleBackToAnalysis = () => {
    setCurrentStep('analysis');
  };

  const handleEditPatient = (updatedPatient: PatientData) => {
    setPatientData(updatedPatient);
    // Atualizar paciente global
    setCurrentPatient(updatedPatient);
    // Recalcular análise clínica com dados atualizados
    const result = performClinicalAnalysis(updatedPatient);
    setClinicalResult(result);
  };

  const handleNewRefraction = () => {
    if (hasUnsavedChanges && currentPatient) {
      setShowSaveModal(true);
      return;
    }
    
    resetToNewPatient();
  };

  const handleOpenExistingPatient = () => {
    if (hasUnsavedChanges && currentPatient) {
      setShowSaveModal(true);
      return;
    }
    
    setShowSelectModal(true);
  };

  const resetToNewPatient = () => {
    setCurrentStep('data-entry');
    setPatientData({
      id: generatePatientId(),
      name: '',
      birthDate: '',
      age: 0,
      gender: '',
      usesGlasses: false,
      arMeasurements: {
        od: [{ s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }],
        oe: [{ s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }]
      },
      symptoms: [],
      knownDiagnoses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    // Limpar paciente global
    setCurrentPatient(null);
    setIsPatientInEdit(false);
    setHasUnsavedChanges(false);
    setClinicalResult(null);
    setFinalPrescriptionData(null);
  };

  const handleSaveChanges = async () => {
    try {
      await PatientService.savePatient(patientData);
      setCurrentPatient(patientData);
      setHasUnsavedChanges(false);
      setShowSaveModal(false);
      console.log('✅ Alterações salvas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar alterações:', error);
    }
  };

  const handleDiscardChanges = () => {
    setShowSaveModal(false);
    resetToNewPatient();
  };

  const handleSelectPatient = (patient: Patient) => {
    setPatientData(patient);
    setCurrentPatient(patient);
    setIsPatientInEdit(true);
    setCurrentStep('analysis');
    setHasUnsavedChanges(false);
    
    // Recalcular análise clínica
    const result = performClinicalAnalysis(patient);
    setClinicalResult(result);
  };

  const handleFinishConsultation = async () => {
    try {
      // Marcar consulta como concluída
      const completedPatient = {
        ...patientData,
        consultationCompleted: true,
        consultationCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Salvar no Firebase
      await PatientService.savePatient(completedPatient);
      
      // Limpar estado de edição
      setCurrentPatient(null);
      setIsPatientInEdit(false);
      setHasUnsavedChanges(false);
      
      console.log('✅ Consulta finalizada com sucesso');
      
      // Mostrar modal de sucesso
      setShowFinishModal(true);
    } catch (error) {
      console.error('❌ Erro ao finalizar consulta:', error);
      alert('Erro ao finalizar consulta. Tente novamente.');
    }
  };

  const performClinicalAnalysis = (data: PatientData): ClinicalResult => {
    const analysisResult = analyzeARData({
      od: data.arMeasurements.od,
      oe: data.arMeasurements.oe,
      patientInfo: {
        age: data.age,
        usesGlasses: data.usesGlasses,
        knownConditions: data.knownDiagnoses
      }
    });

    const nearAddition = calculateNearAddition(data.age);

    const subjectivePath = suggestSubjectivePath({
      age: data.age,
      averages: analysisResult.averages,
      ametropiaType: analysisResult.ametropiaType,
      stability: analysisResult.stability,
      clinicalSuggestions: analysisResult.clinicalSuggestions,
      usesGlasses: data.usesGlasses
    });

    return {
      averageMeasurements: analysisResult.averages,
      variability: analysisResult.stability.details,
      stability: {
        od: analysisResult.stability.od,
        oe: analysisResult.stability.oe
      },
      ametropiaType: analysisResult.ametropiaType,
      pathologyPattern: analysisResult.clinicalSuggestions,
      subjectiveTestStart: analysisResult.averages,
      clinicalSteps: [
        `Inicie com ${analysisResult.averages.od.s > 0 ? '+' : ''}${analysisResult.averages.od.s.toFixed(2)}D esférico OD`,
        `Se AV melhorar, subir para ${analysisResult.averages.od.s > 0 ? '+' : ''}${(analysisResult.averages.od.s + 0.25).toFixed(2)}D`,
        `Ajustar cilindro se necessário: ${analysisResult.averages.od.c > 0 ? '+' : ''}${analysisResult.averages.od.c.toFixed(2)}D no eixo ${analysisResult.averages.od.e}°`,
        ...(nearAddition > 0 ? [`Adição para perto: +${nearAddition.toFixed(2)}D`] : [])
      ],
      clinicalSuggestions: analysisResult.clinicalSuggestions,
      subjectivePath: {
        od: {
          start: subjectivePath.od.startEsferico,
          path: subjectivePath.od.etapas,
          maxAdjustment: subjectivePath.od.cilindro
        },
        oe: {
          start: subjectivePath.oe.startEsferico,
          path: subjectivePath.oe.etapas,
          maxAdjustment: subjectivePath.oe.cilindro
        },
        recommendations: subjectivePath.observacoes,
        specialConsiderations: subjectivePath.alertasClinicos
      }
    };
  };

  // Scroll to top when step changes
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  // Debug: Monitorar mudanças específicas no currentStep
  React.useEffect(() => {
    console.log('🎯 currentStep mudou para:', currentStep);
    console.log('  - Timestamp:', new Date().toISOString());
    console.log('  - Stack trace:', new Error().stack?.split('\n').slice(1, 6).join('\n'));
  }, [currentStep]);

  // Debug: Monitorar mudanças no estado
  React.useEffect(() => {
    console.log('🔍 Estado atualizado:');
    console.log('  - currentStep:', currentStep);
    console.log('  - finalPrescriptionData:', finalPrescriptionData ? 'existe' : 'não existe');
    console.log('  - clinicalResult:', clinicalResult ? 'existe' : 'não existe');
    console.log('  - Stack trace:', new Error().stack?.split('\n').slice(1, 4).join('\n'));
    
    if (currentStep === 'prescription') {
      console.log('📋 Renderizando etapa de prescrição:');
      console.log('  - finalPrescriptionData:', finalPrescriptionData);
      console.log('  - clinicalResult:', clinicalResult);
    }
  }, [currentStep, finalPrescriptionData, clinicalResult]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Refração Assistida</h2>
            <p className="text-sm text-gray-600">Análise clínica e prescrição oftálmica</p>
            {currentPatient && isPatientInEdit && (
              <div className="mt-2 flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">
                  {currentStep === 'prescription' ? (
                    <>
                      Paciente: {currentPatient.name} • Prescrição Finalizada
                    </>
                  ) : (
                    <>
                      Paciente em edição: {currentPatient.name}
                      {hasUnsavedChanges && (
                        <span className="ml-2 text-orange-600">• Alterações não salvas</span>
                      )}
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <div className={`w-3 h-3 rounded-full ${currentStep === 'data-entry' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep === 'analysis' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep === 'prescription' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleNewRefraction}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Novo Paciente</span>
          </button>
          
          <button
            onClick={handleOpenExistingPatient}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Abrir Prontuário</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {currentStep === 'data-entry' && (
        <DataEntryForm 
          patientData={patientData} 
          onSubmit={handleDataSubmit} 
        />
      )}

      {currentStep === 'analysis' && clinicalResult && (
        <ClinicalAnalysis 
          patientData={patientData}
          clinicalResult={clinicalResult}
          onComplete={handleAnalysisComplete}
        />
      )}

      {currentStep === 'prescription' && (
        <div className="space-y-4">
          {finalPrescriptionData && clinicalResult ? (
            <>
              <FinalPrescription
                patientData={patientData}
                clinicalResult={clinicalResult}
                finalPrescriptionData={finalPrescriptionData}
                doctorProfile={doctorProfile}
                onBack={handleBackToAnalysis}
                onEditPatient={handleEditPatient}
              />
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex space-x-3">
                  <button
                    onClick={handleFinishConsultation}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    ✅ Finalizar Consulta
                  </button>
                  <button
                    onClick={handleNewRefraction}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Nova Refração
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ Aguardando dados da prescrição... 
                {!finalPrescriptionData && ' finalPrescriptionData não disponível'}
                {!clinicalResult && ' clinicalResult não disponível'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botões de Navegação */}
      {currentStep === 'analysis' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
          <button
            onClick={handleBackToDataEntry}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            ← Voltar para Dados do Paciente
          </button>
        </div>
      )}

      {/* Modais */}
      <SaveConfirmationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveChanges}
        onDiscard={handleDiscardChanges}
        patientName={currentPatient?.name || 'Paciente'}
      />

      <SelectPatientModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onSelectPatient={handleSelectPatient}
      />

      {/* Modal de Confirmação de Finalização */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Refração Finalizada!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                A consulta foi concluída com sucesso. O paciente está disponível no prontuário.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowFinishModal(false);
                    resetToNewPatient();
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Nova Refração
                </button>
                <button
                  onClick={() => {
                    setShowFinishModal(false);
                    resetToNewPatient();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 