'use client';

import React, { useState } from 'react';
import DataEntryForm from './DataEntryForm';
import ClinicalAnalysis from './ClinicalAnalysis';
import FinalPrescription from './FinalPrescription';
import { analyzeARData, calculateNearAddition } from '../utils/analyzeARData';
import { suggestSubjectivePath } from '../utils/suggestSubjectivePath';
import { DoctorProfile } from '../types/doctor';
import { PatientData, ClinicalResult, FinalPrescriptionData } from '../types/clinical';

interface RefractionProps {
  doctorProfile: DoctorProfile | null;
}

export default function Refraction({ doctorProfile }: RefractionProps) {
  const [currentStep, setCurrentStep] = useState<'data-entry' | 'analysis' | 'prescription'>('data-entry');
  
  const [patientData, setPatientData] = useState<PatientData>({
    name: '',
    age: 0,
    gender: '',
    usesGlasses: false,
    arMeasurements: {
      od: [{ s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }],
      oe: [{ s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }]
    },
    symptoms: [],
    knownDiagnoses: []
  });

  const [clinicalResult, setClinicalResult] = useState<ClinicalResult | null>(null);
  const [finalPrescriptionData, setFinalPrescriptionData] = useState<FinalPrescriptionData | null>(null);

  const handleDataSubmit = (data: PatientData) => {
    setPatientData(data);
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
    // Recalcular análise clínica com dados atualizados
    const result = performClinicalAnalysis(updatedPatient);
    setClinicalResult(result);
  };

  const handleNewRefraction = () => {
    setCurrentStep('data-entry');
    setPatientData({
      name: '',
      age: 0,
      gender: '',
      usesGlasses: false,
      arMeasurements: {
        od: [{ s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }],
        oe: [{ s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }, { s: 0, c: 0, e: 0 }]
      },
      symptoms: [],
      knownDiagnoses: []
    });
    setClinicalResult(null);
    setFinalPrescriptionData(null);
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Refração Assistida</h2>
            <p className="text-sm text-gray-600">Análise clínica e prescrição oftálmica</p>
          </div>
          <div className="flex space-x-2">
            <div className={`w-3 h-3 rounded-full ${currentStep === 'data-entry' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep === 'analysis' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep === 'prescription' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          </div>
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
    </div>
  );
} 