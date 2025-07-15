'use client';

import React, { useState, useEffect } from 'react';
import { PatientData } from '../types/clinical';
import { formatBirthDate, formatPatientId } from '../utils/patientUtils';

interface Patient extends PatientData {
  lastVisit: string;
  nextVisit?: string;
  medications: string[];
  notes: string;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const handleAddPatient = () => {
    setShowAddPatient(true);
  };

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleClosePatient = () => {
    setSelectedPatient(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">👥 Prontuário de Pacientes</h1>
            <p className="text-sm text-gray-600">Gerencie os dados dos seus pacientes</p>
          </div>
          <button
            onClick={handleAddPatient}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            ➕ Novo Paciente
          </button>
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
          <p className="text-sm text-gray-600">{filteredPatients.length} paciente(s) encontrado(s)</p>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => handlePatientClick(patient)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{patient.name}</h3>
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
            </div>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">👥</div>
            <p>Nenhum paciente encontrado</p>
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{selectedPatient.name}</h2>
                  <p className="text-gray-600">
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
                  <h3 className="font-medium text-gray-800 mb-2">Informações de Contato</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Telefone:</span> {selectedPatient.phone || 'Não informado'}</p>
                    <p><span className="text-gray-600">Email:</span> {selectedPatient.email || 'Não informado'}</p>
                  </div>
                </div>

                {/* Visits */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Visitas</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Última visita:</span> {new Date(selectedPatient.lastVisit).toLocaleDateString('pt-BR')}</p>
                    {selectedPatient.nextVisit && (
                      <p><span className="text-gray-600">Próxima visita:</span> {new Date(selectedPatient.nextVisit).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                </div>

                {/* Diagnoses */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Diagnósticos</h3>
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
                  <h3 className="font-medium text-gray-800 mb-2">Medicações</h3>
                  <div className="space-y-1">
                    {selectedPatient.medications.map((medication, index) => (
                      <p key={index} className="text-sm">• {medication}</p>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Observações</h3>
                  <p className="text-sm text-gray-700">{selectedPatient.notes}</p>
                </div>
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

      {/* Add Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Novo Paciente</h2>
              <p className="text-gray-600 mb-4">Funcionalidade em desenvolvimento...</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddPatient(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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