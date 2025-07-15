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

interface RefractionProps {
  doctorProfile: DoctorProfile | null;
}

export default function Refraction({ doctorProfile }: RefractionProps) {
  const { currentPatient, setCurrentPatient, isPatientInEdit, setIsPatientInEdit } = usePatientContext();
  const [currentStep, setCurrentStep] = useState<'data-entry' | 'analysis' | 'prescription'>('data-entry');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [patientData, setPatientData] = useState<PatientData>({
    id: '',
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
    if (currentPatient && isPatientInEdit) {
      setPatientData(currentPatient);
      setCurrentStep('analysis');
      setHasUnsavedChanges(false);
    }
  }, [currentPatient, isPatientInEdit]);

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

  const handleAnalysisComplete = (prescriptionData: FinalPrescriptionData) => {
    setFinalPrescriptionData(prescriptionData);
    setCurrentStep('prescription');
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
      id: '',
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
                  Paciente em edição: {currentPatient.name}
                  {hasUnsavedChanges && (
                    <span className="ml-2 text-orange-600">• Alterações não salvas</span>
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

      {currentStep === 'prescription' && finalPrescriptionData && (
        <div className="space-y-4">
          <FinalPrescription
            patientData={patientData}
            clinicalResult={clinicalResult!}
            finalPrescriptionData={finalPrescriptionData}
            doctorProfile={doctorProfile}
            onBack={handleBackToAnalysis}
            onEditPatient={handleEditPatient}
          />
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <button
              onClick={handleNewRefraction}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Nova Refração
            </button>
          </div>
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
    </div>
  );
} 