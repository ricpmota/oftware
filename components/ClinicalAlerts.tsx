'use client';

import React from 'react';
import { PatientData, ClinicalResult, FinalPrescriptionData } from '../types/clinical';

interface ClinicalAlertsProps {
  patientData: PatientData;
  clinicalResult: ClinicalResult | null;
  finalPrescriptionData: FinalPrescriptionData | null;
}

export default function ClinicalAlerts({ 
  patientData, 
  clinicalResult, 
  finalPrescriptionData 
}: ClinicalAlertsProps) {
  
  const generateAlerts = () => {
    const alerts: Array<{ type: 'warning' | 'error' | 'info'; message: string }> = [];

    // Alertas baseados na idade
    if (patientData.age > 0) {
      if (patientData.age < 6) {
        alerts.push({
          type: 'warning',
          message: 'Paciente pediátrico - considerar cicloplegia para refração'
        });
      }
      
      if (patientData.age > 60) {
        alerts.push({
          type: 'info',
          message: 'Paciente idoso - avaliar presença de catarata'
        });
      }
    }

    // Alertas baseados na variabilidade do AR
    if (clinicalResult) {
      const highVariability = clinicalResult.variability.od.s > 0.5 || 
                             clinicalResult.variability.oe.s > 0.5 ||
                             clinicalResult.variability.od.c > 0.5 || 
                             clinicalResult.variability.oe.c > 0.5;
      
      if (highVariability) {
        alerts.push({
          type: 'error',
          message: 'Alta variabilidade nas medições do AR - considerar nova medição'
        });
      }
    }



    // Alertas baseados nos sintomas
    if (patientData.symptoms.eyePain) {
      alerts.push({
        type: 'error',
        message: 'Dor nos olhos relatada - avaliar urgência oftalmológica'
      });
    }

    if (patientData.symptoms.photophobia) {
      alerts.push({
        type: 'warning',
        message: 'Fotofobia - considerar lentes fotocromáticas'
      });
    }

    // Alertas baseados nos diagnósticos conhecidos
    if (patientData.knownDiagnoses.includes('Ceratocone')) {
      alerts.push({
        type: 'error',
        message: 'Ceratocone diagnosticado - indicar topografia corneana'
      });
    }

    if (patientData.knownDiagnoses.includes('Catarata')) {
      alerts.push({
        type: 'info',
        message: 'Catarata conhecida - monitorar progressão'
      });
    }

    // Alertas baseados na prescrição final
    if (finalPrescriptionData) {
      const highPrescription = Math.abs(finalPrescriptionData.finalPrescription.od.s) > 6 ||
                              Math.abs(finalPrescriptionData.finalPrescription.oe.s) > 6;
      
      if (highPrescription) {
        alerts.push({
          type: 'warning',
          message: 'Prescrição alta - considerar lentes de alto índice'
        });
      }

      const astigmatism = Math.abs(finalPrescriptionData.finalPrescription.od.c) > 2 ||
                          Math.abs(finalPrescriptionData.finalPrescription.oe.c) > 2;
      
      if (astigmatism) {
        alerts.push({
          type: 'info',
          message: 'Astigmatismo alto - considerar lentes tóricas'
        });
      }
    }

    // Alertas baseados na diferença entre olhos
    if (clinicalResult && finalPrescriptionData) {
      const odDiff = Math.abs(finalPrescriptionData.finalPrescription.od.s - clinicalResult.averageMeasurements.od.s);
      const oeDiff = Math.abs(finalPrescriptionData.finalPrescription.oe.s - clinicalResult.averageMeasurements.oe.s);
      
      if (odDiff > 1 || oeDiff > 1) {
        alerts.push({
          type: 'warning',
          message: 'Grande diferença entre AR e prescrição - revisar subjetiva'
        });
      }
    }

    return alerts;
  };

  const alerts = generateAlerts();

  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: 'warning' | 'error' | 'info') => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getAlertColor = (type: 'warning' | 'error' | 'info') => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="mt-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Alertas Clínicos</h2>
        
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div 
              key={index} 
              className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">{getAlertIcon(alert.type)}</span>
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 