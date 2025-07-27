'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PIORecord {
  date: string;
  pio: number;
}

interface GlaucomaFormData {
  // Identificação e Contexto Clínico
  patientName: string;
  eye: 'OD' | 'OE' | 'Ambos';
  age: number;
  previousDiagnosis: boolean;
  glaucomaType: string;
  
  // Curva Tensional e Histórico de PIO
  pioHistory: PIORecord[];
  newPIO: string;
  newPIODate: string;
  
  // Tratamento Atual
  isOnTreatment: boolean;
  currentMedications: string[];
  hasIntolerance: boolean;
  intoleranceDetails: string;
  
  // Conduta Automatizada
  suggestedConduct: string;
}

const glaucomaTypes = [
  'Glaucoma primário de ângulo aberto',
  'Glaucoma de ângulo fechado', 
  'Glaucoma secundário',
  'Glaucoma congênito'
];

const medications = [
  'Timolol',
  'Brimonidina', 
  'Dorzolamida',
  'Latanoprosta',
  'Travoprosta',
  'Bimatoprosta',
  'Pilocarpina',
  'Acetazolamida VO'
];

export default function GlaucomaForm() {
  const [formData, setFormData] = useState<GlaucomaFormData>({
    patientName: '',
    eye: 'OD',
    age: 0,
    previousDiagnosis: false,
    glaucomaType: '',
    pioHistory: [],
    newPIO: '',
    newPIODate: '',
    isOnTreatment: false,
    currentMedications: [],
    hasIntolerance: false,
    intoleranceDetails: '',
    suggestedConduct: ''
  });

  const [laudo, setLaudo] = useState<string>('');

  // Adicionar novo valor de PIO ao histórico
  const addPIO = () => {
    if (formData.newPIO && formData.newPIODate) {
      const newRecord: PIORecord = {
        date: formData.newPIODate,
        pio: parseFloat(formData.newPIO)
      };
      
      setFormData(prev => ({
        ...prev,
        pioHistory: [...prev.pioHistory, newRecord],
        newPIO: '',
        newPIODate: ''
      }));
    }
  };

  // Remover valor de PIO do histórico
  const removePIO = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pioHistory: prev.pioHistory.filter((_, i) => i !== index)
    }));
  };

  // Toggle de medicamento
  const toggleMedication = (medication: string) => {
    setFormData(prev => ({
      ...prev,
      currentMedications: prev.currentMedications.includes(medication)
        ? prev.currentMedications.filter(m => m !== medication)
        : [...prev.currentMedications, medication]
    }));
  };

  // Análise automática para sugerir conduta
  const analyzeAndSuggestConduct = () => {
    if (formData.pioHistory.length === 0) {
      setFormData(prev => ({ ...prev, suggestedConduct: 'Necessário adicionar valores de PIO para análise.' }));
      return;
    }

    const recentPIOs = formData.pioHistory.slice(-3); // Últimos 3 valores
    const averagePIO = recentPIOs.reduce((sum, record) => sum + record.pio, 0) / recentPIOs.length;
    const maxPIO = Math.max(...recentPIOs.map(r => r.pio));
    const medicationCount = formData.currentMedications.length;

    let conduct = '';

    // Lógica baseada no PDF GLAUCOMA.pdf
    if (averagePIO > 21 && maxPIO > 21) {
      if (medicationCount === 0) {
        conduct = 'Iniciar tratamento com monoterapia. Considerar prostaglandina como primeira escolha.';
      } else if (medicationCount === 1) {
        conduct = 'PIO persistente > 21 mmHg com monoterapia. Sugerir associação de segunda droga.';
      } else if (medicationCount === 2) {
        conduct = 'Já em uso de 2 drogas sem controle adequado. Considerar terceira droga ou avaliação cirúrgica.';
      } else {
        conduct = 'Múltiplas drogas sem resposta adequada. Avaliar necessidade de trabeculoplastia ou cirurgia filtrante.';
      }
    } else if (averagePIO <= 21) {
      if (medicationCount > 0) {
        conduct = 'PIO controlada. Manter tratamento atual e seguimento regular.';
      } else {
        conduct = 'PIO normal. Monitoramento clínico sem necessidade de tratamento medicamentoso.';
      }
    }

    // Considerações especiais
    if (formData.hasIntolerance) {
      conduct += ' Paciente apresenta intolerância. Considerar substituição da classe medicamentosa.';
    }

    if (formData.glaucomaType === 'Glaucoma de ângulo fechado') {
      conduct += ' Atenção especial para ângulo fechado - considerar iridotomia se necessário.';
    }

    setFormData(prev => ({ ...prev, suggestedConduct: conduct }));
  };

  // Gerar laudo completo
  const generateLaudo = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    
    let laudoText = `LAUDO DE AVALIAÇÃO DE GLAUCOMA
Data: ${today}
Paciente: ${formData.patientName}
Idade: ${formData.age} anos

IDENTIFICAÇÃO E CONTEXTO CLÍNICO:
Olho avaliado: ${formData.eye}
Diagnóstico prévio de glaucoma: ${formData.previousDiagnosis ? 'Sim' : 'Não'}
${formData.previousDiagnosis ? `Tipo de glaucoma: ${formData.glaucomaType}` : ''}

CURVA TENSIONAL E HISTÓRICO DE PIO:
`;

    if (formData.pioHistory.length > 0) {
      laudoText += 'Histórico de PIO:\n';
      formData.pioHistory.forEach((record) => {
        laudoText += `- ${record.date}: ${record.pio} mmHg\n`;
      });
      
      const averagePIO = formData.pioHistory.reduce((sum, record) => sum + record.pio, 0) / formData.pioHistory.length;
      laudoText += `PIO média: ${averagePIO.toFixed(1)} mmHg\n`;
    } else {
      laudoText += 'Nenhum valor de PIO registrado.\n';
    }

    laudoText += `
TRATAMENTO ATUAL:
Em tratamento: ${formData.isOnTreatment ? 'Sim' : 'Não'}
`;

    if (formData.isOnTreatment && formData.currentMedications.length > 0) {
      laudoText += `Medicamentos em uso: ${formData.currentMedications.join(', ')}\n`;
    }

    if (formData.hasIntolerance) {
      laudoText += `Intolerância referida: ${formData.intoleranceDetails}\n`;
    }

    laudoText += `
CONDUTA SUGERIDA:
${formData.suggestedConduct || 'Análise automática não realizada.'}

OBSERVAÇÕES:
- Manter seguimento regular
- Reavaliação em 3-6 meses conforme gravidade
- Monitoramento de campo visual e nervo óptico
- Ajuste terapêutico conforme evolução

Assinatura: _________________
Data: ${today}`;

    setLaudo(laudoText);
  };

  // Dados para o gráfico
  const chartData = formData.pioHistory.map((record) => ({
    name: record.date,
    PIO: record.pio,
    'Limite Normal': 21
  }));

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">

      {/* Identificação e Contexto Clínico */}
      <div className="bg-blue-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">Identificação e Contexto Clínico</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Paciente
            </label>
            <input
              type="text"
              value={formData.patientName}
              onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Olho
            </label>
            <select
              value={formData.eye}
              onChange={(e) => setFormData(prev => ({ ...prev, eye: e.target.value as 'OD' | 'OE' | 'Ambos' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="OD">OD</option>
              <option value="OE">OE</option>
              <option value="Ambos">Ambos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idade
            </label>
            <input
              type="number"
              value={formData.age || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Idade em anos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnóstico prévio de glaucoma?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={formData.previousDiagnosis === true}
                  onChange={() => setFormData(prev => ({ ...prev, previousDiagnosis: true }))}
                  className="mr-2"
                />
                Sim
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={formData.previousDiagnosis === false}
                  onChange={() => setFormData(prev => ({ ...prev, previousDiagnosis: false }))}
                  className="mr-2"
                />
                Não
              </label>
            </div>
          </div>
        </div>

        {formData.previousDiagnosis && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Glaucoma
            </label>
            <select
              value={formData.glaucomaType}
              onChange={(e) => setFormData(prev => ({ ...prev, glaucomaType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o tipo</option>
              {glaucomaTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Curva Tensional e Histórico de PIO */}
      <div className="bg-green-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-green-800 mb-4">Curva Tensional e Histórico de PIO</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <input
              type="date"
              value={formData.newPIODate}
              onChange={(e) => setFormData(prev => ({ ...prev, newPIODate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIO (mmHg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.newPIO}
              onChange={(e) => setFormData(prev => ({ ...prev, newPIO: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex: 18.5"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={addPIO}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Adicionar PIO
            </button>
          </div>
        </div>

        {/* Gráfico da Curva Tensional */}
        {formData.pioHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Curva Tensional</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 'dataMax + 5']} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="PIO" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Limite Normal" 
                    stroke="#dc2626" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Lista de valores de PIO */}
        {formData.pioHistory.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Histórico de PIO</h3>
            <div className="bg-white rounded-lg border">
              {formData.pioHistory.map((record, index) => (
                <div key={index} className="flex justify-between items-center p-3 border-b last:border-b-0">
                  <span className="text-gray-700">
                    {record.date}: {record.pio} mmHg
                  </span>
                  <button
                    onClick={() => removePIO(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tratamento Atual */}
      <div className="bg-yellow-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-yellow-800 mb-4">Tratamento Atual</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Está em tratamento?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.isOnTreatment === true}
                onChange={() => setFormData(prev => ({ ...prev, isOnTreatment: true }))}
                className="mr-2"
              />
              Sim
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.isOnTreatment === false}
                onChange={() => setFormData(prev => ({ ...prev, isOnTreatment: false }))}
                className="mr-2"
              />
              Não
            </label>
          </div>
        </div>

        {formData.isOnTreatment && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Colírio(s) em uso:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {medications.map(medication => (
                  <label key={medication} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.currentMedications.includes(medication)}
                      onChange={() => toggleMedication(medication)}
                      className="mr-2"
                    />
                    {medication}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referiu intolerância a algum colírio?
              </label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.hasIntolerance === true}
                    onChange={() => setFormData(prev => ({ ...prev, hasIntolerance: true }))}
                    className="mr-2"
                  />
                  Sim
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.hasIntolerance === false}
                    onChange={() => setFormData(prev => ({ ...prev, hasIntolerance: false }))}
                    className="mr-2"
                  />
                  Não
                </label>
              </div>
              
              {formData.hasIntolerance && (
                <textarea
                  value={formData.intoleranceDetails}
                  onChange={(e) => setFormData(prev => ({ ...prev, intoleranceDetails: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Descreva o colírio e os sintomas de intolerância..."
                  rows={3}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Conduta Automatizada */}
      <div className="bg-purple-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-purple-800 mb-4">Conduta Automatizada</h2>
        
        <button
          onClick={analyzeAndSuggestConduct}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
        >
          Analisar e Sugerir Conduta
        </button>

        {formData.suggestedConduct && (
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-medium text-gray-800 mb-2">Sugestão de Conduta:</h3>
            <p className="text-gray-700">{formData.suggestedConduct}</p>
          </div>
        )}
      </div>

      {/* Botão Gerar Laudo */}
      <div className="text-center">
        <button
          onClick={generateLaudo}
          className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
        >
          Gerar Laudo
        </button>
      </div>

      {/* Modal com o Laudo */}
      {laudo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Laudo de Glaucoma</h2>
                <button
                  onClick={() => setLaudo('')}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {laudo}
                </pre>
              </div>
              
              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(laudo);
                    alert('Laudo copiado para a área de transferência!');
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Copiar Laudo
                </button>
                <button
                  onClick={() => setLaudo('')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
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