'use client';

import React, { useState } from 'react';
import { PatientData, ClinicalResult, FinalPrescriptionData } from '../types/clinical';
import { generateClinicalAlerts } from '../utils/clinicalAlerts';
import { DoctorProfile } from '../types/doctor';

interface FinalPrescriptionProps {
  patientData: PatientData;
  clinicalResult: ClinicalResult;
  finalPrescriptionData: FinalPrescriptionData;
  doctorProfile?: DoctorProfile | null;
  onBack?: () => void;
  onEditPatient?: (updatedPatient: PatientData) => void;
}

export default function FinalPrescription({ 
  patientData, 
  clinicalResult, 
  finalPrescriptionData,
  doctorProfile,
  onBack,
  onEditPatient
}: FinalPrescriptionProps) {
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData>(patientData);
  
  // Gerar alertas clínicos
  const clinicalAlerts = generateClinicalAlerts({
    age: patientData.age,
    finalPrescription: finalPrescriptionData.finalPrescription,
    arAverages: clinicalResult.averageMeasurements,
    arStability: clinicalResult.stability,
    subjectiveImprovement: finalPrescriptionData.subjectiveImprovement,
    knownDiagnoses: patientData.knownDiagnoses,
    previousGlasses: patientData.usesGlasses,
    symptoms: patientData.symptoms
  });
  
  const getAgeGroup = (age: number) => {
    if (age < 18) return 'Pediatria';
    if (age < 40) return 'Adulto Jovem';
    if (age < 60) return 'Adulto';
    return 'Idoso';
  };

  const handleSavePatient = () => {
    if (onEditPatient) {
      onEditPatient(editingPatient);
    }
    setShowEditPatientModal(false);
  };

  const handleAddDiagnosis = () => {
    const newDiagnosis = prompt('Digite o diagnóstico:');
    if (newDiagnosis && newDiagnosis.trim()) {
      setEditingPatient(prev => ({
        ...prev,
        knownDiagnoses: [...prev.knownDiagnoses, newDiagnosis.trim()]
      }));
    }
  };

  const handleRemoveDiagnosis = (index: number) => {
    setEditingPatient(prev => ({
      ...prev,
      knownDiagnoses: prev.knownDiagnoses.filter((_, i) => i !== index)
    }));
  };

  const handleAddSymptom = () => {
    const newSymptom = prompt('Digite o sintoma:');
    if (newSymptom && newSymptom.trim()) {
      setEditingPatient(prev => ({
        ...prev,
        symptoms: [...prev.symptoms, newSymptom.trim()]
      }));
    }
  };

  const handleRemoveSymptom = (index: number) => {
    setEditingPatient(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index)
    }));
  };

  const handlePrint = () => {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescrição Oftálmica</title>
          <style>
            @media print {
              body { margin: 0; padding: 15px; font-family: Arial, sans-serif; }
              .no-print { display: none !important; }
              .print-only { display: block !important; }
              .prescription-page { page-break-after: always; }
              table { width: 100%; border-collapse: collapse; margin: 8px 0; }
              th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 12px; }
              th { background-color: #f3f4f6; }
              .header { display: flex; align-items: center; margin-bottom: 20px; }
              .logo { width: 200px; height: 200px; margin-right: 15px; }
              .title-section { flex: 1; }
              .title { font-size: 20px; font-weight: bold; margin-bottom: 3px; }
              .date { font-size: 12px; color: #666; }
              .section { margin: 15px 0; }
              .section-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
              .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
              .info-item { display: flex; justify-content: space-between; font-size: 12px; }
              .signature-section { margin-top: 30px; text-align: center; }
              .signature-line { border-top: 1px solid #000; width: 200px; margin: 5px auto; }
              .doctor-signature { width: 120px; height: 50px; margin: 0 auto 5px; display: block; position: relative; z-index: 2; }
              .signature-container { position: relative; }
              .signature-overlay { position: absolute; top: -25px; left: 50%; transform: translateX(-50%); z-index: 3; }
            }
            @media screen {
              .print-only { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="prescription-page">
            <!-- Cabeçalho -->
            <div class="header">
              <img src="/icones/oftware.png" alt="Logo" class="logo">
              <div class="title-section">
                <h1 class="title">PRESCRIÇÃO OFTÁLMICA</h1>
                <p class="date">Data: ${finalPrescriptionData.prescriptionDate}</p>
              </div>
            </div>

            <!-- Resumo do Paciente -->
            <div class="section">
              <div class="section-title">RESUMO DO PACIENTE</div>
              <div class="patient-info">
                <div class="info-item">
                  <span><strong>Nome:</strong></span>
                  <span>${patientData.name || 'Não informado'}</span>
                </div>
                <div class="info-item">
                  <span><strong>Idade:</strong></span>
                  <span>${patientData.age} anos</span>
                </div>
                <div class="info-item">
                  <span><strong>Gênero:</strong></span>
                  <span>${patientData.gender === 'male' ? 'Masculino' : patientData.gender === 'female' ? 'Feminino' : 'Não informado'}</span>
                </div>
                <div class="info-item">
                  <span><strong>Usa óculos:</strong></span>
                  <span>${patientData.usesGlasses ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </div>

            <!-- Prescrição Final -->
            <div class="section">
              <div class="section-title">PRESCRIÇÃO FINAL</div>
              
              <!-- Para Longe -->
              <h3 style="font-size: 14px; margin: 8px 0;">Para Longe</h3>
              <table>
                <thead>
                  <tr>
                    <th>Olho</th>
                    <th>Esférico</th>
                    <th>Cilindro</th>
                    <th>Eixo</th>
                    <th>Acuidade Visual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>OD</td>
                    <td>${finalPrescriptionData.finalPrescription.od.s > 0 ? '+' : ''}${finalPrescriptionData.finalPrescription.od.s.toFixed(2)}</td>
                    <td>${finalPrescriptionData.finalPrescription.od.c > 0 ? '+' : ''}${finalPrescriptionData.finalPrescription.od.c.toFixed(2)}</td>
                    <td>${finalPrescriptionData.finalPrescription.od.e}°</td>
                    <td>${finalPrescriptionData.finalPrescription.od.av}</td>
                  </tr>
                  <tr>
                    <td>OE</td>
                    <td>${finalPrescriptionData.finalPrescription.oe.s > 0 ? '+' : ''}${finalPrescriptionData.finalPrescription.oe.s.toFixed(2)}</td>
                    <td>${finalPrescriptionData.finalPrescription.oe.c > 0 ? '+' : ''}${finalPrescriptionData.finalPrescription.oe.c.toFixed(2)}</td>
                    <td>${finalPrescriptionData.finalPrescription.oe.e}°</td>
                    <td>${finalPrescriptionData.finalPrescription.oe.av}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Para Perto -->
              <h3 style="font-size: 14px; margin: 8px 0;">Para Perto</h3>
              <table>
                <thead>
                  <tr>
                    <th>Olho</th>
                    <th>Esférico</th>
                    <th>Cilindro</th>
                    <th>Eixo</th>
                    <th>Acuidade Visual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>OD</td>
                    <td>${finalPrescriptionData.nearPrescription.od.s > 0 ? '+' : ''}${finalPrescriptionData.nearPrescription.od.s.toFixed(2)}</td>
                    <td>${finalPrescriptionData.nearPrescription.od.c > 0 ? '+' : ''}${finalPrescriptionData.nearPrescription.od.c.toFixed(2)}</td>
                    <td>${finalPrescriptionData.nearPrescription.od.e}°</td>
                    <td>${finalPrescriptionData.nearPrescription.od.av}</td>
                  </tr>
                  <tr>
                    <td>OE</td>
                    <td>${finalPrescriptionData.nearPrescription.oe.s > 0 ? '+' : ''}${finalPrescriptionData.nearPrescription.oe.s.toFixed(2)}</td>
                    <td>${finalPrescriptionData.nearPrescription.oe.c > 0 ? '+' : ''}${finalPrescriptionData.nearPrescription.oe.c.toFixed(2)}</td>
                    <td>${finalPrescriptionData.nearPrescription.oe.e}°</td>
                    <td>${finalPrescriptionData.nearPrescription.oe.av}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Tipo de Lente -->
              <div style="margin: 15px 0; font-size: 12px;">
                <strong>Tipo de Lente Sugerida:</strong> ${finalPrescriptionData.suggestedLensType}
              </div>
            </div>

            <!-- Assinatura -->
            <div class="signature-section">
              <div class="signature-container">
                ${doctorProfile?.digitalSignature ? `<img src="${doctorProfile.digitalSignature}" alt="Assinatura" class="signature-overlay">` : ''}
                <div class="signature-line"></div>
              </div>
              <p style="font-size: 12px; margin: 5px 0;"><strong>${doctorProfile?.name || 'Dr. Médico'}</strong></p>
              <p style="font-size: 11px; margin: 3px 0; color: #666;">CRM: ${doctorProfile?.crm || '00000'}</p>
              <p style="font-size: 11px; margin: 3px 0; color: #666;">Especialista em Oftalmologia</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Aguardar um pouco para carregar e imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      {onBack && (
        <div className="flex justify-start">
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            ← Voltar
          </button>
        </div>
      )}

      {/* Resumo do Paciente */}
      <div className="bg-black rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Resumo do Paciente</h2>
          <button
            onClick={() => setShowEditPatientModal(true)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            ✏️ Editar Informações
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-gray-300">Nome:</span>
            <span className="ml-2 font-medium text-white">{patientData.name || 'Não informado'}</span>
          </div>
          <div>
            <span className="text-gray-300">Idade:</span>
            <span className="ml-2 font-medium text-white">{patientData.age} anos ({getAgeGroup(patientData.age)})</span>
          </div>
          <div>
            <span className="text-gray-300">Gênero:</span>
            <span className="ml-2 font-medium text-white">
              {patientData.gender === 'male' ? 'Masculino' : 
               patientData.gender === 'female' ? 'Feminino' : 
               patientData.gender === 'other' ? 'Outro' : 'Não informado'}
            </span>
          </div>
          <div>
            <span className="text-gray-300">Usa óculos:</span>
            <span className="ml-2 font-medium text-white">{patientData.usesGlasses ? 'Sim' : 'Não'}</span>
          </div>
          <div>
            <span className="text-gray-300">Ametropia:</span>
            <span className="ml-2 font-medium text-white">
              {clinicalResult.ametropiaType.od} / {clinicalResult.ametropiaType.oe}
            </span>
          </div>
          <div>
            <span className="text-gray-300">Data da Prescrição:</span>
            <span className="ml-2 font-medium text-white">{finalPrescriptionData.prescriptionDate}</span>
          </div>
        </div>

        {patientData.knownDiagnoses.length > 0 && (
          <div className="mt-3">
            <span className="text-gray-300 text-sm">Diagnósticos conhecidos:</span>
            <div className="mt-1">
              {patientData.knownDiagnoses.map((diagnosis, index) => (
                <span key={index} className="inline-block bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded mr-2 mb-1">
                  {diagnosis}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prescrição Final */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Prescrição Final</h2>
        
        <div className="space-y-6">
          {/* Grau para Longe */}
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">Para Longe</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Olho</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Esférico</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Cilindro</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Eixo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">OD</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.finalPrescription.od.s > 0 ? '+' : ''}{finalPrescriptionData.finalPrescription.od.s.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.finalPrescription.od.c > 0 ? '+' : ''}{finalPrescriptionData.finalPrescription.od.c.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.finalPrescription.od.e}°
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">OE</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.finalPrescription.oe.s > 0 ? '+' : ''}{finalPrescriptionData.finalPrescription.oe.s.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.finalPrescription.oe.c > 0 ? '+' : ''}{finalPrescriptionData.finalPrescription.oe.c.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.finalPrescription.oe.e}°
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Grau para Perto (sempre mostrar, mesmo que seja zero) */}
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">
              Para Perto {finalPrescriptionData.addition > 0 ? `(Adição: +${finalPrescriptionData.addition.toFixed(2)})` : ''}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Olho</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Esférico</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Cilindro</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Eixo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">OD</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.nearPrescription.od.s > 0 ? '+' : ''}{finalPrescriptionData.nearPrescription.od.s.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.nearPrescription.od.c > 0 ? '+' : ''}{finalPrescriptionData.nearPrescription.od.c.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.nearPrescription.od.e}°
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">OE</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.nearPrescription.oe.s > 0 ? '+' : ''}{finalPrescriptionData.nearPrescription.oe.s.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.nearPrescription.oe.c > 0 ? '+' : ''}{finalPrescriptionData.nearPrescription.oe.c.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900">
                      {finalPrescriptionData.nearPrescription.oe.e}°
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tipo de Lente */}
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-2">Tipo de Lente Sugerida</h3>
            <div className="bg-purple-50 border border-purple-200 rounded p-3">
              <div className="text-lg font-medium text-purple-800">
                {finalPrescriptionData.suggestedLensType}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acuidades Visuais Finais */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Acuidades Visuais Finais</h2>
        
        <div className="space-y-4">
          {/* AV Para Perto */}
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">AV Para Perto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">OD:</span>
                  <span className="text-lg font-semibold text-gray-900">{finalPrescriptionData.nearAcuity?.od || 'J1'}</span>
                </div>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">OE:</span>
                  <span className="text-lg font-semibold text-gray-900">{finalPrescriptionData.nearAcuity?.oe || 'J1'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AV Para Longe */}
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">AV Para Longe</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">OD:</span>
                  <span className="text-lg font-semibold text-gray-900">{finalPrescriptionData.finalPrescription.od.av}</span>
                </div>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">OE:</span>
                  <span className="text-lg font-semibold text-gray-900">{finalPrescriptionData.finalPrescription.oe.av}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Observações Clínicas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Observações Clínicas</h2>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <span className="font-medium text-gray-900">Variabilidade AR:</span>
              <span className="ml-1 text-gray-900">
                {clinicalResult.variability.od.s <= 0.25 && clinicalResult.variability.oe.s <= 0.25 
                  ? 'Baixa variabilidade - medições confiáveis'
                  : 'Alta variabilidade - considerar nova medição'}
              </span>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <span className="font-medium text-gray-900">Tipo de ametropia:</span>
              <span className="ml-1 text-gray-900">
                {clinicalResult.ametropiaType.od} no olho direito, {clinicalResult.ametropiaType.oe} no olho esquerdo
              </span>
            </div>
          </div>

          {patientData.age >= 40 && (
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-medium text-gray-900">Presbiopia:</span>
                <span className="ml-1 text-gray-900">
                  Paciente com {patientData.age} anos - prescrição para perto incluída
                </span>
              </div>
            </div>
          )}

          {clinicalAlerts.alerts.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Alertas Clínicos:</h4>
              <div className="space-y-2">
                {clinicalAlerts.alerts.map((alert: { type: string; message: string }, index: number) => (
                  <div key={index} className={`p-2 rounded text-sm ${
                    alert.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                    alert.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botão de Imprimir */}
      <div className="flex justify-center">
        <button
          onClick={handlePrint}
          className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          🖨️ Imprimir Prescrição
        </button>
      </div>

      {/* Modal para Editar Paciente */}
      {showEditPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Editar Informações do Paciente</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={editingPatient.name}
                  onChange={(e) => setEditingPatient(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
                <input
                  type="number"
                  value={editingPatient.age}
                  onChange={(e) => setEditingPatient(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
                <select
                  value={editingPatient.gender}
                  onChange={(e) => setEditingPatient(prev => ({ ...prev, gender: e.target.value as "" | "male" | "female" | "other" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Selecione</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usa óculos</label>
                <select
                  value={editingPatient.usesGlasses.toString()}
                  onChange={(e) => setEditingPatient(prev => ({ ...prev, usesGlasses: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sintomas</label>
                <div className="space-y-2">
                  {editingPatient.symptoms.map((symptom, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="flex-1 text-sm">{symptom}</span>
                      <button
                        onClick={() => handleRemoveSymptom(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddSymptom}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Adicionar Sintoma
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnósticos Conhecidos</label>
                <div className="space-y-2">
                  {editingPatient.knownDiagnoses.map((diagnosis, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="flex-1 text-sm">{diagnosis}</span>
                      <button
                        onClick={() => handleRemoveDiagnosis(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddDiagnosis}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Adicionar Diagnóstico
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditPatientModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePatient}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 