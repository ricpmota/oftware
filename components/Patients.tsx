'use client';

import React, { useState, useEffect } from 'react';
import { PatientService, Patient, PendingShare } from '../services/patientService';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharingPatient, setSharingPatient] = useState<Patient | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [pendingShares, setPendingShares] = useState<PendingShare[]>([]);
  const [showPendingShares, setShowPendingShares] = useState(false);

  // Carregar pacientes do Firebase
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        const patientsData = await PatientService.getPatients();
        setPatients(patientsData);
      } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadPendingShares = async () => {
      try {
        const pendingData = await PatientService.getPendingShares();
        setPendingShares(pendingData);
      } catch (error) {
        console.error('Erro ao carregar solicitações pendentes:', error);
      }
    };

    loadPatients();
    loadPendingShares();
  }, []);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.phone && patient.phone.includes(searchTerm))
  );

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleClosePatient = () => {
    setSelectedPatient(null);
  };

  const handleSharePatient = (patient: Patient) => {
    setSharingPatient(patient);
    setShareEmail('');
    setShareError(null);
    setShowShareModal(true);
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingPatient || !shareEmail.trim()) return;

    try {
      setShareLoading(true);
      setShareError(null);
      
      await PatientService.requestShare(sharingPatient.id, shareEmail.trim());
      
      setShowShareModal(false);
      setSharingPatient(null);
      setShareEmail('');
      
      // Recarregar solicitações pendentes
      const pendingData = await PatientService.getPendingShares();
      setPendingShares(pendingData);
      
      alert('Solicitação de compartilhamento enviada com sucesso!');
    } catch (error: unknown) {
      setShareError((error as Error).message || 'Erro ao enviar solicitação');
    } finally {
      setShareLoading(false);
    }
  };

  const handleAcceptShare = async (share: PendingShare) => {
    try {
      await PatientService.acceptShare(share.patientId, share.fromDoctorId);
      
      // Recarregar dados
      const patientsData = await PatientService.getPatients();
      setPatients(patientsData);
      
      const pendingData = await PatientService.getPendingShares();
      setPendingShares(pendingData);
      
      alert('Compartilhamento aceito com sucesso!');
    } catch (error: unknown) {
      alert('Erro ao aceitar compartilhamento: ' + (error as Error).message);
    }
  };

  const handleRejectShare = async (share: PendingShare) => {
    try {
      await PatientService.rejectShare(share.patientId, share.fromDoctorId);
      
      // Recarregar solicitações pendentes
      const pendingData = await PatientService.getPendingShares();
      setPendingShares(pendingData);
      
      alert('Compartilhamento rejeitado.');
    } catch (error: unknown) {
      alert('Erro ao rejeitar compartilhamento: ' + (error as Error).message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">👥 Prontuário de Pacientes</h1>
            <p className="text-sm text-gray-600">Visualize relatórios dos seus pacientes</p>
          </div>
          <div className="flex space-x-2">
            {pendingShares.length > 0 && (
              <button
                onClick={() => setShowPendingShares(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🔔 Solicitações ({pendingShares.length})
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>



      {/* Patient List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Lista de Pacientes</h2>
          <p className="text-sm text-gray-600">
            {loading ? 'Carregando...' : `${filteredPatients.length} paciente(s) encontrado(s)`}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">⏳</div>
            <p>Carregando pacientes...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => handlePatientClick(patient)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-800">{patient.name}</h3>
                      {patient.isShared && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Compartilhado
                        </span>
                      )}
                      {patient.consultationCompleted && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          ✅ Concluído
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {patient.age} anos • {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Feminino' : 'Outro'}
                    </p>
                    <p className="text-sm text-gray-600">{patient.phone || 'Não informado'}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {patient.knownDiagnoses.map((diagnosis: string, index: number) => (
                        <span
                          key={index}
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                        >
                          {diagnosis}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Última visita:</div>
                    <div>{new Date(patient.lastVisit).toLocaleDateString('pt-BR')}</div>
                    {patient.nextVisit && (
                      <>
                        <div className="mt-1">Próxima visita:</div>
                        <div>{new Date(patient.nextVisit).toLocaleDateString('pt-BR')}</div>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSharePatient(patient);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    📤 Compartilhar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredPatients.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">👥</div>
            <p>Nenhum paciente encontrado</p>
            <p className="text-sm mt-2">Os pacientes serão adicionados automaticamente quando você confirmar os dados durante o exame de refração.</p>
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-semibold text-black">{selectedPatient.name}</h2>
                    {selectedPatient.isShared && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Compartilhado
                      </span>
                    )}
                  </div>
                  <p className="text-black">
                    {selectedPatient.age} anos • {selectedPatient.gender === 'male' ? 'Masculino' : selectedPatient.gender === 'female' ? 'Feminino' : 'Outro'}
                  </p>
                </div>
                <button
                  onClick={handleClosePatient}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-black mb-2">Informações de Contato</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-black">Telefone:</span> {selectedPatient.phone || 'Não informado'}</p>
                    <p><span className="text-black">Email:</span> {selectedPatient.email || 'Não informado'}</p>
                  </div>
                </div>

                {/* Visits */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-black mb-2">Visitas</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-black">Última visita:</span> {new Date(selectedPatient.lastVisit).toLocaleDateString('pt-BR')}</p>
                    {selectedPatient.nextVisit && (
                      <p><span className="text-black">Próxima visita:</span> {new Date(selectedPatient.nextVisit).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                </div>

                {/* Diagnoses */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-black mb-2">Diagnósticos</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.knownDiagnoses.map((diagnosis: string, index: number) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      >
                        {diagnosis}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Medications */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-black mb-2">Medicações</h3>
                  <div className="space-y-1">
                    {selectedPatient.medications.length > 0 ? (
                      selectedPatient.medications.map((medication, index) => (
                        <p key={index} className="text-sm text-black">• {medication}</p>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Nenhuma medicação registrada</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-black mb-2">Observações</h3>
                  <p className="text-sm text-black">{selectedPatient.notes || 'Nenhuma observação registrada'}</p>
                </div>

                {/* Sintomas */}
                {selectedPatient.symptoms && selectedPatient.symptoms.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-black mb-2">Sintomas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.symptoms.map((symptom, index) => (
                        <span
                          key={index}
                          className="bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prescrição Final */}
                {selectedPatient.finalPrescription && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-black mb-2">Prescrição Final</h3>
                    
                    {/* Para Longe */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-black mb-2">Para Longe</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-black font-medium">OD:</span>
                          <span className="ml-2 text-black">
                            {selectedPatient.finalPrescription.finalPrescription.od.s > 0 ? '+' : ''}{selectedPatient.finalPrescription.finalPrescription.od.s.toFixed(2)} 
                            {selectedPatient.finalPrescription.finalPrescription.od.c > 0 ? '+' : ''}{selectedPatient.finalPrescription.finalPrescription.od.c.toFixed(2)} 
                            {selectedPatient.finalPrescription.finalPrescription.od.e}° 
                            AV: {selectedPatient.finalPrescription.finalPrescription.od.av}
                          </span>
                        </div>
                        <div>
                          <span className="text-black font-medium">OE:</span>
                          <span className="ml-2 text-black">
                            {selectedPatient.finalPrescription.finalPrescription.oe.s > 0 ? '+' : ''}{selectedPatient.finalPrescription.finalPrescription.oe.s.toFixed(2)} 
                            {selectedPatient.finalPrescription.finalPrescription.oe.c > 0 ? '+' : ''}{selectedPatient.finalPrescription.finalPrescription.oe.c.toFixed(2)} 
                            {selectedPatient.finalPrescription.finalPrescription.oe.e}° 
                            AV: {selectedPatient.finalPrescription.finalPrescription.oe.av}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Para Perto */}
                    {selectedPatient.finalPrescription.addition > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-black mb-2">
                          Para Perto (Adição: +{selectedPatient.finalPrescription.addition.toFixed(2)})
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-black font-medium">OD:</span>
                            <span className="ml-2 text-black">
                              {selectedPatient.finalPrescription.nearPrescription.od.s > 0 ? '+' : ''}{selectedPatient.finalPrescription.nearPrescription.od.s.toFixed(2)} 
                              {selectedPatient.finalPrescription.nearPrescription.od.c > 0 ? '+' : ''}{selectedPatient.finalPrescription.nearPrescription.od.c.toFixed(2)} 
                              {selectedPatient.finalPrescription.nearPrescription.od.e}° 
                              AV: {selectedPatient.finalPrescription.nearAcuity?.od || 'J1'}
                            </span>
                          </div>
                          <div>
                            <span className="text-black font-medium">OE:</span>
                            <span className="ml-2 text-black">
                              {selectedPatient.finalPrescription.nearPrescription.oe.s > 0 ? '+' : ''}{selectedPatient.finalPrescription.nearPrescription.oe.s.toFixed(2)} 
                              {selectedPatient.finalPrescription.nearPrescription.oe.c > 0 ? '+' : ''}{selectedPatient.finalPrescription.nearPrescription.oe.c.toFixed(2)} 
                              {selectedPatient.finalPrescription.nearPrescription.oe.e}° 
                              AV: {selectedPatient.finalPrescription.nearAcuity?.oe || 'J1'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tipo de Lente */}
                    <div className="mb-4">
                      <span className="text-black font-medium">Tipo de Lente:</span>
                      <span className="ml-2 text-black">{selectedPatient.finalPrescription.suggestedLensType}</span>
                    </div>

                    {/* Melhora Subjetiva */}
                    <div>
                      <span className="text-black font-medium">Melhora Subjetiva:</span>
                      <span className="ml-2 text-black">
                        {selectedPatient.finalPrescription.subjectiveImprovement ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Observações Clínicas */}
                {selectedPatient.clinicalResult && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-black mb-2">Observações Clínicas</h3>
                    
                    {/* Variabilidade */}
                    <div className="mb-3">
                      <span className="text-black font-medium">Variabilidade AR:</span>
                      <span className="ml-2 text-black">
                        {selectedPatient.clinicalResult.variability.od.s <= 0.25 && selectedPatient.clinicalResult.variability.oe.s <= 0.25 
                          ? 'Baixa variabilidade - medições confiáveis'
                          : 'Alta variabilidade - considerar nova medição'}
                      </span>
                    </div>

                    {/* Tipo de Ametropia */}
                    <div className="mb-3">
                      <span className="text-black font-medium">Tipo de Ametropia:</span>
                      <span className="ml-2 text-black">
                        {selectedPatient.clinicalResult.ametropiaType.od} no olho direito, {selectedPatient.clinicalResult.ametropiaType.oe} no olho esquerdo
                      </span>
                    </div>

                    {/* Sugestões Clínicas */}
                    {selectedPatient.clinicalResult.clinicalSuggestions.length > 0 && (
                      <div className="mb-3">
                        <span className="text-black font-medium">Sugestões Clínicas:</span>
                        <div className="mt-1">
                          {selectedPatient.clinicalResult.clinicalSuggestions.map((suggestion, index) => (
                            <p key={index} className="text-sm text-black ml-4">• {suggestion}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Passos Clínicos */}
                    {selectedPatient.clinicalResult.clinicalSteps.length > 0 && (
                      <div>
                        <span className="text-black font-medium">Passos Clínicos:</span>
                        <div className="mt-1">
                          {selectedPatient.clinicalResult.clinicalSteps.map((step, index) => (
                            <p key={index} className="text-sm text-black ml-4">• {step}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleClosePatient}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Editar Paciente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && sharingPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Compartilhar Paciente</h2>
              <p className="text-gray-600 mb-4">
                Compartilhar prontuário de <strong>{sharingPatient.name}</strong> com outro médico.
              </p>
              
              <form onSubmit={handleShareSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email do Médico
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="medico@exemplo.com"
                    required
                  />
                </div>
                
                {shareError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {shareError}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={shareLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {shareLoading ? 'Enviando...' : 'Enviar Solicitação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pending Shares Modal */}
      {showPendingShares && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Solicitações de Compartilhamento</h2>
                <button
                  onClick={() => setShowPendingShares(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {pendingShares.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p>Nenhuma solicitação pendente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingShares.map((share, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-gray-800">{share.patientName}</h3>
                          <p className="text-sm text-gray-600">
                            Solicitado por: {share.fromDoctorName} ({share.fromDoctorEmail})
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(share.requestedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptShare(share)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            ✅ Aceitar
                          </button>
                          <button
                            onClick={() => handleRejectShare(share)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            ❌ Rejeitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 