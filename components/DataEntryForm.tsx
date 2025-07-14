'use client';

import { useState } from 'react';
import { PatientData } from '../types/clinical';
import { SYMPTOM_OPTIONS, DIAGNOSIS_OPTIONS } from '../utils/clinicalOptions';

interface DataEntryFormProps {
  patientData: PatientData;
  onSubmit: (data: PatientData) => void;
}

export default function DataEntryForm({ patientData, onSubmit }: DataEntryFormProps) {
  const [formData, setFormData] = useState<PatientData>(patientData);
  const [symptomSelections, setSymptomSelections] = useState<string[]>(['']);
  const [diagnosisSelections, setDiagnosisSelections] = useState<string[]>(['']);

  // Gerar opções para Esférico (+20.00 a -20.00 de 0.25 em 0.25)
  const sphereOptions: { value: number; label: string }[] = [];
  for (let i = 20; i >= -20; i -= 0.25) {
    const value = Math.round(i * 100) / 100; // Evitar problemas de ponto flutuante
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

  const handleInputChange = (field: keyof PatientData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (eye: 'od' | 'oe', index: number, field: 's' | 'c' | 'e', value: number) => {
    setFormData(prev => ({
      ...prev,
      arMeasurements: {
        ...prev.arMeasurements,
        [eye]: prev.arMeasurements[eye].map((m, i) => 
          i === index ? { ...m, [field]: value } : m
        )
      }
    }));
  };

  const handleSymptomSelectionChange = (index: number, value: string) => {
    const newSelections = [...symptomSelections];
    newSelections[index] = value;
    
    // Se selecionou algo, adicionar nova linha se for a última
    if (value && index === newSelections.length - 1) {
      newSelections.push('');
    }
    
    setSymptomSelections(newSelections);
    
    // Atualizar sintomas no formData
    const selectedSymptoms = newSelections.filter(s => s && s !== '');
    setFormData(prev => ({
      ...prev,
      symptoms: selectedSymptoms
    }));
  };

  const handleDiagnosisSelectionChange = (index: number, value: string) => {
    const newSelections = [...diagnosisSelections];
    newSelections[index] = value;
    
    // Se selecionou algo, adicionar nova linha se for a última
    if (value && index === newSelections.length - 1) {
      newSelections.push('');
    }
    
    setDiagnosisSelections(newSelections);
    
    // Atualizar diagnósticos no formData
    const selectedDiagnoses = newSelections.filter(d => d && d !== '');
    setFormData(prev => ({
      ...prev,
      knownDiagnoses: selectedDiagnoses
    }));
  };

  const removeSymptom = (index: number) => {
    const newSelections = symptomSelections.filter((_, i) => i !== index);
    if (newSelections.length === 0) {
      newSelections.push('');
    }
    setSymptomSelections(newSelections);
    
    const selectedSymptoms = newSelections.filter(s => s && s !== '');
    setFormData(prev => ({
      ...prev,
      symptoms: selectedSymptoms
    }));
  };

  const removeDiagnosis = (index: number) => {
    const newSelections = diagnosisSelections.filter((_, i) => i !== index);
    if (newSelections.length === 0) {
      newSelections.push('');
    }
    setDiagnosisSelections(newSelections);
    
    const selectedDiagnoses = newSelections.filter(d => d && d !== '');
    setFormData(prev => ({
      ...prev,
      knownDiagnoses: selectedDiagnoses
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dados Básicos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Dados do Paciente</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Paciente *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Idade *
            </label>
            <input
              type="number"
              value={formData.age || ''}
              onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gênero
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Selecione</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Já usa óculos?
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center text-gray-900">
                <input
                  type="radio"
                  checked={formData.usesGlasses === true}
                  onChange={() => handleInputChange('usesGlasses', true)}
                  className="mr-2"
                />
                Sim
              </label>
              <label className="flex items-center text-gray-900">
                <input
                  type="radio"
                  checked={formData.usesGlasses === false}
                  onChange={() => handleInputChange('usesGlasses', false)}
                  className="mr-2"
                />
                Não
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Medições do Auto Refrator */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Medições do Auto Refrator</h2>
        
        <div className="space-y-4">
          {(['od', 'oe'] as const).map((eye) => (
            <div key={eye} className="border border-gray-200 rounded-lg p-3">
              <h3 className="text-md font-medium text-gray-700 mb-3">
                {eye.toUpperCase()} - {eye === 'od' ? 'Olho Direito' : 'Olho Esquerdo'}
              </h3>
              
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">S (Esférico)</label>
                      <select
                        value={formData.arMeasurements[eye][index].s || 0}
                        onChange={(e) => handleMeasurementChange(eye, index, 's', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      >
                        {sphereOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">C (Cilindro)</label>
                      <select
                        value={formData.arMeasurements[eye][index].c || 0}
                        onChange={(e) => handleMeasurementChange(eye, index, 'c', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      >
                        {cylinderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">E (Eixo)</label>
                      <select
                        value={formData.arMeasurements[eye][index].e || 0}
                        onChange={(e) => handleMeasurementChange(eye, index, 'e', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      >
                        {axisOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sintomas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Sintomas</h2>
        
        <div className="space-y-3">
          {symptomSelections.map((selection, index) => (
            <div key={index} className="flex space-x-2">
              <select
                value={selection}
                onChange={(e) => handleSymptomSelectionChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                style={{ maxWidth: 'calc(100% - 60px)' }}
              >
                <option value="">Selecione um sintoma</option>
                {SYMPTOM_OPTIONS.map((symptom) => (
                  <option key={symptom} value={symptom}>
                    {symptom}
                  </option>
                ))}
              </select>
              {selection && (
                <button
                  type="button"
                  onClick={() => removeSymptom(index)}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Diagnósticos Conhecidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Diagnósticos Conhecidos</h2>
        
        <div className="space-y-3">
          {diagnosisSelections.map((selection, index) => (
            <div key={index} className="flex space-x-2">
              <select
                value={selection}
                onChange={(e) => handleDiagnosisSelectionChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                style={{ maxWidth: 'calc(100% - 60px)' }}
              >
                <option value="">Selecione um diagnóstico</option>
                {DIAGNOSIS_OPTIONS.map((diagnosis) => (
                  <option key={diagnosis} value={diagnosis}>
                    {diagnosis}
                  </option>
                ))}
              </select>
              {selection && (
                <button
                  type="button"
                  onClick={() => removeDiagnosis(index)}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Botão de Envio */}
      <div className="flex space-x-3">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Confirmar Dados
        </button>
      </div>
    </form>
  );
} 