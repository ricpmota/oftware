'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PIORecord {
  time: string;
  pioOD: number;
  pioOE: number;
}

interface GlaucomaFormData {
  // Campos obrigatórios
  idade: number;
  raca: string;
  historicoFamiliar: boolean;
  ametropia: string;
  tipoAngulo: string;
  curvaTensional: PIORecord[];
  escavacaoVertical: number;
  
  // Tratamento atual
  usaColirio: boolean;
  coliriosAtuais: string[];
  efeitosAdversos: boolean;
  desejaTrocar: boolean;
  
  // Análise automática
  riscoTensional: string;
  tipoGlaucomaProvavel: string;
  avaliacaoEscavacao: string;
  condutaTerapeutica: string;
  sugestaoMedicacao: string;
}

const opcoes = {
  racas: ['Negra', 'Asiática', 'Branca', 'Outra'],
  ametropias: ['Miopia', 'Hipermetropia', 'Nenhuma'],
  angulos: ['Aberto', 'Estreito', 'Fechado'],
  escavacao: ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9'],
  colirios: [
    'Latanoprosta 0,005%',
    'Travoprosta 0,004%',
    'Bimatoprosta 0,01%',
    'Timolol 0,5%',
    'Timolol 0,25%',
    'Dorzolamida 2%',
    'Brimonidina 0,2%',
    'Pilocarpina 2%',
    'Dorzolamida + Timolol',
    'Brimonidina + Timolol'
  ]
};

const classesColirios = {
  prostaglandinas: {
    nome: 'Prostaglandinas',
    exemplos: ['Latanoprosta 0,005% 1x/noite', 'Travoprosta 0,004% 1x/noite', 'Bimatoprosta 0,01% 1x/noite'],
    mecanismo: 'Aumenta drenagem uveoscleral',
    observacoes: '1ª linha de tratamento, pode causar hiperemia e crescimento de cílios'
  },
  betabloqueadores: {
    nome: 'Betabloqueadores',
    exemplos: ['Timolol 0,5% 1-2x/dia', 'Timolol 0,25% 1-2x/dia'],
    mecanismo: 'Reduz produção do humor aquoso',
    observacoes: 'Contraindicado em asma e bradicardia'
  },
  inibidoresAnidrase: {
    nome: 'Inibidores da Anidrase Carbônica',
    exemplos: ['Dorzolamida 2% 2x/dia'],
    mecanismo: 'Reduz produção do humor aquoso',
    observacoes: 'Pode causar gosto amargo'
  },
  agonistasAlfa: {
    nome: 'Agonistas Alfa-2',
    exemplos: ['Brimonidina 0,2% 2x/dia'],
    mecanismo: 'Reduz produção e aumenta drenagem',
    observacoes: 'Pode causar hiperemia, prurido e sonolência'
  },
  coliriosCombinados: {
    nome: 'Colírios Combinados',
    exemplos: ['Dorzolamida + Timolol', 'Brimonidina + Timolol'],
    mecanismo: 'Combinação de mecanismos diferentes',
    observacoes: 'Úteis para reduzir número de instilações'
  }
};

const classificacoesGlaucoma = {
  gpaa: {
    nome: 'Glaucoma Primário de Ângulo Aberto (GPAA)',
    caracteristicas: 'Silencioso, bilateral, >40 anos, progressão lenta',
    fatoresRisco: 'Idade avançada, raça negra, história familiar, miopia'
  },
  anguloEstreito: {
    nome: 'Glaucoma de Ângulo Estreito',
    caracteristicas: 'Episódios agudos, dor, midríase, halos',
    fatoresRisco: 'Hipermetropia, ângulo estreito, catarata'
  },
  secundario: {
    nome: 'Glaucoma Secundário',
    caracteristicas: 'Causas uveíticas, pós-trauma, neovascular',
    fatoresRisco: 'Uveíte, trauma, diabetes, oclusão venosa'
  },
  congenito: {
    nome: 'Glaucoma Congênito',
    caracteristicas: 'Buftalmo, lacrimejamento, fotofobia',
    fatoresRisco: 'Hereditário, <3 anos de idade'
  },
  normotensivo: {
    nome: 'Glaucoma Normotensivo',
    caracteristicas: 'PIO normal, escavação e perda de campo visual',
    fatoresRisco: 'Vasospasmo, hipotensão noturna, história familiar'
  }
};

export default function GlaucomaForm() {
  const [formData, setFormData] = useState<GlaucomaFormData>({
    idade: 0,
    raca: '',
    historicoFamiliar: false,
    ametropia: '',
    tipoAngulo: '',
    curvaTensional: [],
    escavacaoVertical: 0,
    usaColirio: false,
    coliriosAtuais: [],
    efeitosAdversos: false,
    desejaTrocar: false,
    riscoTensional: '',
    tipoGlaucomaProvavel: '',
    avaliacaoEscavacao: '',
    condutaTerapeutica: '',
    sugestaoMedicacao: ''
  });

  const [showModalColirios, setShowModalColirios] = useState(false);
  const [showModalClassificacoes, setShowModalClassificacoes] = useState(false);
  const [newPIO, setNewPIO] = useState({ time: '', pioOD: '', pioOE: '' });

  // Adicionar novo valor de PIO
  const addPIO = () => {
    if (newPIO.time && newPIO.pioOD && newPIO.pioOE) {
      setFormData(prev => ({
        ...prev,
        curvaTensional: [...prev.curvaTensional, {
          time: newPIO.time,
          pioOD: parseFloat(newPIO.pioOD),
          pioOE: parseFloat(newPIO.pioOE)
        }]
      }));
      setNewPIO({ time: '', pioOD: '', pioOE: '' });
    }
  };

  // Remover valor de PIO
  const removePIO = (index: number) => {
    setFormData(prev => ({
      ...prev,
      curvaTensional: prev.curvaTensional.filter((_, i) => i !== index)
    }));
  };

  // Toggle de colírio
  const toggleColirio = (colirio: string) => {
    setFormData(prev => ({
      ...prev,
      coliriosAtuais: prev.coliriosAtuais.includes(colirio)
        ? prev.coliriosAtuais.filter(c => c !== colirio)
        : [...prev.coliriosAtuais, colirio]
    }));
  };

  // Análise automática
  const analisarDados = () => {
    // Validar campos obrigatórios
    if (!formData.idade || !formData.raca || formData.historicoFamiliar === undefined || 
        !formData.ametropia || !formData.tipoAngulo || formData.curvaTensional.length === 0 || 
        !formData.escavacaoVertical) {
      alert('Por favor, preencha todos os campos obrigatórios antes de gerar o laudo.');
      return;
    }

    // Análise do risco tensional (considera ambos os olhos)
    let riscoTensional = '';
    const todasPIOs = formData.curvaTensional.flatMap(record => [record.pioOD, record.pioOE]);
    
    if (todasPIOs.length > 0) {
      const maxPIO = Math.max(...todasPIOs);
      const minPIO = Math.min(...todasPIOs);
      const variacao = maxPIO - minPIO;
      
      if (maxPIO > 21 || variacao > 5) {
        riscoTensional = `Risco aumentado: PIO máxima ${maxPIO} mmHg, variação ${variacao.toFixed(1)} mmHg`;
      } else {
        riscoTensional = `Risco normal: PIO máxima ${maxPIO} mmHg, variação ${variacao.toFixed(1)} mmHg`;
      }
    }

    // Análise da escavação
    let avaliacaoEscavacao = '';
    if (formData.escavacaoVertical > 0.6) {
      avaliacaoEscavacao = 'Escavação aumentada (>0.6) - sugestivo de dano glaucomatoso';
    } else if (formData.escavacaoVertical > 0.3) {
      avaliacaoEscavacao = 'Escavação moderada (0.3-0.6) - monitorar';
    } else {
      avaliacaoEscavacao = 'Escavação normal (<0.3)';
    }

    // Classificação do tipo de glaucoma
    let tipoGlaucomaProvavel = '';
    if (formData.idade > 40 && formData.tipoAngulo === 'Aberto') {
      tipoGlaucomaProvavel = 'Glaucoma Primário de Ângulo Aberto (GPAA)';
    } else if (formData.tipoAngulo === 'Estreito' || formData.tipoAngulo === 'Fechado') {
      tipoGlaucomaProvavel = 'Glaucoma de Ângulo Estreito';
    } else if (formData.idade < 40) {
      tipoGlaucomaProvavel = 'Glaucoma Congênito ou Secundário';
    } else {
      tipoGlaucomaProvavel = 'Glaucoma Secundário';
    }

    // Conduta terapêutica
    let condutaTerapeutica = '';
    let sugestaoMedicacao = '';

    if (!formData.usaColirio) {
      condutaTerapeutica = 'Iniciar monoterapia';
      sugestaoMedicacao = 'Latanoprosta 0,005% 1x/noite (prostaglandina)';
    } else if (formData.coliriosAtuais.length === 1) {
      const maxPIO = Math.max(...todasPIOs);
      if (maxPIO > 18) {
        condutaTerapeutica = 'Associar segunda droga';
        sugestaoMedicacao = 'Adicionar Timolol 0,5% 2x/dia ou Dorzolamida 2% 2x/dia';
      } else {
        condutaTerapeutica = 'Manter tratamento atual';
        sugestaoMedicacao = 'PIO controlada - continuar medicação atual';
      }
    } else if (formData.coliriosAtuais.length >= 2) {
      condutaTerapeutica = 'Considerar troca ou cirurgia';
      sugestaoMedicacao = 'Avaliar trabeculoplastia ou cirurgia filtrante';
    }

    if (formData.efeitosAdversos || formData.desejaTrocar) {
      condutaTerapeutica += ' - Trocar classe medicamentosa';
      sugestaoMedicacao = 'Considerar outra classe de medicação';
    }

    setFormData(prev => ({
      ...prev,
      riscoTensional,
      tipoGlaucomaProvavel,
      avaliacaoEscavacao,
      condutaTerapeutica,
      sugestaoMedicacao
    }));
  };

  // Dados para o gráfico
  const chartData = formData.curvaTensional.map((record, index) => ({
    name: `T${index + 1}`,
    'OD': record.pioOD,
    'OE': record.pioOE,
    'Limite Normal': 21
  }));

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Formulário de Avaliação de Glaucoma
        </h1>

        {/* Campos Obrigatórios */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Dados Clínicos Essenciais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idade *
              </label>
              <input
                type="number"
                value={formData.idade || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, idade: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Ex: 65"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raça *
              </label>
              <select
                value={formData.raca}
                onChange={(e) => setFormData(prev => ({ ...prev, raca: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.racas.map(raca => (
                  <option key={raca} value={raca}>{raca}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Histórico Familiar *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.historicoFamiliar === true}
                    onChange={() => setFormData(prev => ({ ...prev, historicoFamiliar: true }))}
                    className="mr-2"
                    required
                  />
                  Sim
                </label>
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.historicoFamiliar === false}
                    onChange={() => setFormData(prev => ({ ...prev, historicoFamiliar: false }))}
                    className="mr-2"
                    required
                  />
                  Não
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ametropia *
              </label>
              <select
                value={formData.ametropia}
                onChange={(e) => setFormData(prev => ({ ...prev, ametropia: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.ametropias.map(ametropia => (
                  <option key={ametropia} value={ametropia}>{ametropia}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ângulo *
              </label>
              <select
                value={formData.tipoAngulo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipoAngulo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.angulos.map(angulo => (
                  <option key={angulo} value={angulo}>{angulo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escavação Vertical *
              </label>
              <select
                value={formData.escavacaoVertical || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, escavacaoVertical: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.escavacao.map(escavacao => (
                  <option key={escavacao} value={escavacao}>{escavacao}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Curva Tensional */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Curva Tensional (PIO em mmHg)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário
              </label>
              <input
                type="text"
                value={newPIO.time}
                onChange={(e) => setNewPIO(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Ex: 8:40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIO OD (mmHg)
              </label>
              <input
                type="number"
                step="0.1"
                value={newPIO.pioOD}
                onChange={(e) => setNewPIO(prev => ({ ...prev, pioOD: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Ex: 15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIO OE (mmHg)
              </label>
              <input
                type="number"
                step="0.1"
                value={newPIO.pioOE}
                onChange={(e) => setNewPIO(prev => ({ ...prev, pioOE: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Ex: 15"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={addPIO}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Gráfico da Curva Tensional */}
          {formData.curvaTensional.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Gráfico da Curva Tensional</h3>
              <div className="h-64 bg-white rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 'dataMax + 5']} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="OD" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="OE" 
                      stroke="#dc2626" 
                      strokeWidth={3}
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Limite Normal" 
                      stroke="#6b7280" 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Lista de valores de PIO */}
          {formData.curvaTensional.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Valores Registrados</h3>
              <div className="bg-white rounded-lg border">
                {formData.curvaTensional.map((record, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border-b last:border-b-0">
                    <span className="text-gray-700 font-medium">
                      T{index + 1} ({record.time}): OD {record.pioOD} mmHg | OE {record.pioOE} mmHg
                    </span>
                    <button
                      onClick={() => removePIO(index)}
                      className="text-red-600 hover:text-red-800 text-sm bg-red-50 px-2 py-1 rounded"
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
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Tratamento Atual
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paciente já usa colírio? *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center text-black">
                <input
                  type="radio"
                  checked={formData.usaColirio === true}
                  onChange={() => setFormData(prev => ({ ...prev, usaColirio: true }))}
                  className="mr-2"
                  required
                />
                Sim
              </label>
              <label className="flex items-center text-black">
                <input
                  type="radio"
                  checked={formData.usaColirio === false}
                  onChange={() => setFormData(prev => ({ ...prev, usaColirio: false }))}
                  className="mr-2"
                  required
                />
                Não
              </label>
            </div>
          </div>

          {formData.usaColirio && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quais colírios utiliza atualmente?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {opcoes.colirios.map(colirio => (
                    <label key={colirio} className="flex items-center p-2 rounded-md transition-colors duration-200 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.coliriosAtuais.includes(colirio)}
                        onChange={() => toggleColirio(colirio)}
                        className="mr-2"
                      />
                      <span className={`text-sm ${formData.coliriosAtuais.includes(colirio) ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                        {colirio}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teve efeitos adversos?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      checked={formData.efeitosAdversos === true}
                      onChange={() => setFormData(prev => ({ ...prev, efeitosAdversos: true }))}
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      checked={formData.efeitosAdversos === false}
                      onChange={() => setFormData(prev => ({ ...prev, efeitosAdversos: false }))}
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deseja trocar o colírio?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      checked={formData.desejaTrocar === true}
                      onChange={() => setFormData(prev => ({ ...prev, desejaTrocar: true }))}
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      checked={formData.desejaTrocar === false}
                      onChange={() => setFormData(prev => ({ ...prev, desejaTrocar: false }))}
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={analisarDados}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Gerar Análise
          </button>
          
          <button
            onClick={() => setShowModalColirios(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            Classes de Colírios
          </button>
          
          <button
            onClick={() => setShowModalClassificacoes(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200"
          >
            Classificações de Glaucoma
          </button>
        </div>

        {/* Resultados da Análise */}
        {(formData.riscoTensional || formData.tipoGlaucomaProvavel) && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Resultados da Análise
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Risco Tensional</h3>
                <p className="text-gray-700">{formData.riscoTensional}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Tipo de Glaucoma Provável</h3>
                <p className="text-gray-700">{formData.tipoGlaucomaProvavel}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Avaliação da Escavação</h3>
                <p className="text-gray-700">{formData.avaliacaoEscavacao}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Conduta Terapêutica</h3>
                <p className="text-gray-700">{formData.condutaTerapeutica}</p>
              </div>

              <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Sugestão de Medicação</h3>
                <p className="text-gray-700">{formData.sugestaoMedicacao}</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Classes de Colírios */}
        {showModalColirios && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Classes de Colírios</h2>
                <button
                  onClick={() => setShowModalColirios(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {Object.entries(classesColirios).map(([key, classe]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">{classe.nome}</h3>
                    <div className="space-y-2">
                      <p><strong>Exemplos:</strong> {classe.exemplos.join(', ')}</p>
                      <p><strong>Mecanismo:</strong> {classe.mecanismo}</p>
                      <p><strong>Observações:</strong> {classe.observacoes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Classificações de Glaucoma */}
        {showModalClassificacoes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Classificações de Glaucoma</h2>
                <button
                  onClick={() => setShowModalClassificacoes(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {Object.entries(classificacoesGlaucoma).map(([key, classificacao]) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-black mb-2">{classificacao.nome}</h3>
                    <div className="space-y-2">
                      <p className="text-black"><strong>Características:</strong> {classificacao.caracteristicas}</p>
                      <p className="text-black"><strong>Fatores de Risco:</strong> {classificacao.fatoresRisco}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}