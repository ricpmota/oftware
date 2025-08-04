'use client';

import React, { useState } from 'react';

// Regras clínicas extraídas da apostila 'Cirurgia Refrativa 2023'
const criteriosDesejaveis = [
  'Idade > 18 anos (ideal > 21 anos)',
  'Estabilidade refrativa por 1 ano (variação < 0.5D)',
  'Ametropia entre +4,00 e -10,00 DE e até 4,00 DC',
  'Topografia regular e simétrica',
  'Paquimetria > 460μm'
];

const contraindicacoesRelativas = [
  'Colagenoses (AR, LES, Sjögren, etc)',
  'Ectasias corneanas',
  'Distrofias estromais e de Fuchs',
  'Retinopatia diabética',
  'Olho seco grave',
  'Monoculares',
  'Neurotrofismo corneano',
  'Gravidez ou lactação',
  'Expectativas irreais',
  'Herpes ocular prévio',
  'Oftalmopatia distireoidiana',
  'Diabetes mellitus descompensado'
];

const criteriosRiscoEctasia = [
  'Paquimetria < 500μm',
  'PTA > 40%',
  'Elevação posterior > 15μm',
  'Padrão topográfico suspeito',
  'Idade < 21 anos',
  'Histórico familiar de ceratocone'
];

const tecnicasRefrativas = [
  {
    tecnica: 'LASIK',
    indicacao: 'Córnea espessa, topografia regular'
  },
  {
    tecnica: 'PRK',
    indicacao: 'Córnea fina, topografia regular'
  },
  {
    tecnica: 'PTK',
    indicacao: 'Irregularidade superficial, cicatrizes'
  },
  {
    tecnica: 'LASEK / Epi-LASIK',
    indicacao: 'Alternativa à PRK com reposição epitelial'
  },
  {
    tecnica: 'Lente fáquica',
    indicacao: 'Contraindicação à cirurgia corneana'
  },
  {
    tecnica: 'Cirurgia personalizada',
    indicacao: 'Corrigir aberrações de alta ordem com aberrometria'
  }
];

const tiposAberracaoAltaOrdem = [
  'Esférica',
  'Coma',
  'Trifoil'
];

const complicacoesPorTecnica = {
  PRK: ['Haze', 'Regressão', 'Aberrações ópticas', 'Infiltrados', 'Defeito epitelial'],
  LASIK: ['Flap irregular', 'Deslocamento do flap', 'Ectasia'],
  RK: ['Instabilidade refrativa', 'Hipermetropização', 'Ruptura tardia']
};

const mitomicinaC = {
  indicacoes: [
    'Ametropias altas (> -6D)',
    'Reoperações',
    'Risco de haze'
  ],
  dosagem: '0,002–0,2%',
  tempo: '12 a 120 segundos'
};

interface CirurgiaRefrativaData {
  // Dados do Paciente
  idade: number;
  ametropia: string;
  estabilidadeRefrativa: boolean;
  historiaFamiliarEctasia: boolean;
  
  // Exames Corneanos
  paquimetriaCentral: number;
  espessuraFlap: number;
  profundidadeAblacao: number;
  elevacaoPosterior: number;
  indiceBelinAmbrosio?: number;
  tipoPadraoTopografico: string;
  aberrometria: boolean;
  tipoAberracaoAltaOrdem?: string;
  
  // Análise automática
  ptaCalculado: string;
  riscoEctasia: string;
  tecnicaSugerida: string;
  laudoClinico: string;
}

const opcoes = {
  ametropias: ['Miopia', 'Hipermetropia', 'Astigmatismo', 'Mista'],
  padroesTopograficos: [
    'Normal (esférica ou astigmatismo simétrico)',
    'Baby bow-tie',
    'Crab claw',
    'Assimétrico com elevação',
    'Suspeito de ectasia'
  ],
  aberracoesAltaOrdem: ['Coma', 'Esférica', 'Trifoil']
};

export default function CirurgiaRefrativaForm() {
  const [formData, setFormData] = useState<CirurgiaRefrativaData>({
    idade: 0,
    ametropia: '',
    estabilidadeRefrativa: true,
    historiaFamiliarEctasia: false,
    paquimetriaCentral: 0,
    espessuraFlap: 0,
    profundidadeAblacao: 0,
    elevacaoPosterior: 0,
    tipoPadraoTopografico: '',
    aberrometria: false,
    ptaCalculado: '0.0',
    riscoEctasia: '',
    tecnicaSugerida: '',
    laudoClinico: ''
  });

  const [showModalCriterios, setShowModalCriterios] = useState(false);
  const [showModalContraindicacoes, setShowModalContraindicacoes] = useState(false);
  const [showModalTecnicas, setShowModalTecnicas] = useState(false);

  // Calcular PTA automaticamente
  const calcularPTA = () => {
    const { espessuraFlap, profundidadeAblacao, paquimetriaCentral } = formData;
    if (paquimetriaCentral > 0) {
      const pta = ((espessuraFlap + profundidadeAblacao) / paquimetriaCentral) * 100;
      return pta.toFixed(1);
    }
    return '0.0';
  };

  // Avaliar risco de ectasia
  const avaliarRiscoEctasia = () => {
    const riscos = [];
    const { idade, paquimetriaCentral, elevacaoPosterior, tipoPadraoTopografico, historiaFamiliarEctasia } = formData;
    const pta = parseFloat(calcularPTA());

    if (idade < 21) riscos.push('Idade < 21 anos');
    if (paquimetriaCentral < 500) riscos.push('Córnea fina (< 500μm)');
    if (pta > 40) riscos.push('PTA > 40%');
    if (elevacaoPosterior > 15) riscos.push('Elevação posterior > 15μm');
    if (tipoPadraoTopografico.includes('suspeito')) riscos.push('Padrão topográfico suspeito');
    if (historiaFamiliarEctasia) riscos.push('Histórico familiar positivo');

    if (riscos.length === 0) return 'Baixo';
    if (riscos.length <= 2) return 'Intermediário';
    return 'Alto';
  };

  // Sugerir técnica cirúrgica
  const sugerirTecnica = () => {
    const { paquimetriaCentral, tipoPadraoTopografico, aberrometria } = formData;
    const risco = avaliarRiscoEctasia();

    if (risco === 'Alto') return 'Contraindicado. Encaminhar para especialista em ectasias';
    if (paquimetriaCentral < 520) return 'PRK';
    if (tipoPadraoTopografico.includes('irregular')) return 'PTK';
    if (aberrometria) return 'Cirurgia personalizada (customizada por aberrometria)';
    return 'LASIK';
  };

  // Gerar laudo clínico
  const gerarLaudoClinico = () => {
    const { idade, ametropia, estabilidadeRefrativa, paquimetriaCentral, ptaCalculado, riscoEctasia, tecnicaSugerida } = formData;
    
    let laudo = `PACIENTE: ${idade} anos, ${ametropia.toLowerCase()}\n\n`;
    laudo += `ESTABILIDADE REFRATIVA: ${estabilidadeRefrativa ? 'Estável' : 'Instável'}\n`;
    laudo += `PAQUIMETRIA CENTRAL: ${paquimetriaCentral}μm\n`;
    laudo += `PTA CALCULADO: ${ptaCalculado}%\n`;
    laudo += `RISCO DE ECTASIA: ${riscoEctasia}\n\n`;
    
    if (riscoEctasia === 'Alto') {
      laudo += `CONTRAINDICADO para cirurgia refrativa corneana.\n`;
      laudo += `Encaminhar para especialista em ectasias corneanas.\n`;
      laudo += `Considerar lente fáquica como alternativa.\n`;
    } else {
      laudo += `TÉCNICA SUGERIDA: ${tecnicaSugerida}\n`;
      laudo += `Candidato adequado para cirurgia refrativa.\n`;
    }
    
    return laudo;
  };

  // Análise automática
  const analisarDados = () => {
    // Validar campos obrigatórios
    if (!formData.idade || !formData.ametropia || !formData.paquimetriaCentral || 
        !formData.espessuraFlap || !formData.profundidadeAblacao || !formData.tipoPadraoTopografico) {
      alert('Por favor, preencha todos os campos obrigatórios antes de gerar o laudo.');
      return;
    }

    const pta = calcularPTA();
    const risco = avaliarRiscoEctasia();
    const tecnica = sugerirTecnica();
    const laudo = gerarLaudoClinico();

    setFormData(prev => ({
      ...prev,
      ptaCalculado: pta,
      riscoEctasia: risco,
      tecnicaSugerida: tecnica,
      laudoClinico: laudo
    }));
  };

  return (
    <div className="max-w-7xl mx-auto p-1 sm:p-2 md:p-4 bg-white min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-2 sm:p-3 md:p-4 mb-3 sm:mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
          Formulário de Avaliação Pré-operatória - Cirurgia Refrativa
        </h1>

        {/* Dados do Paciente */}
        <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6 rounded-lg mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
            🧾 Dados do Paciente
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idade *
              </label>
              <input
                type="number"
                value={formData.idade || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, idade: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Ex: 25"
                required
              />
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
                Estabilidade Refrativa *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.estabilidadeRefrativa === true}
                    onChange={() => setFormData(prev => ({ ...prev, estabilidadeRefrativa: true }))}
                    className="mr-2"
                    required
                  />
                  Estável
                </label>
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.estabilidadeRefrativa === false}
                    onChange={() => setFormData(prev => ({ ...prev, estabilidadeRefrativa: false }))}
                    className="mr-2"
                    required
                  />
                  Instável
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Histórico Familiar de Ectasia *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.historiaFamiliarEctasia === true}
                    onChange={() => setFormData(prev => ({ ...prev, historiaFamiliarEctasia: true }))}
                    className="mr-2"
                    required
                  />
                  Sim
                </label>
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.historiaFamiliarEctasia === false}
                    onChange={() => setFormData(prev => ({ ...prev, historiaFamiliarEctasia: false }))}
                    className="mr-2"
                    required
                  />
                  Não
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Exames Corneanos */}
        <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6 rounded-lg mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
            🧪 Exames Corneanos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paquimetria Central (μm) *
              </label>
              <input
                type="number"
                value={formData.paquimetriaCentral || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, paquimetriaCentral: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Ex: 540"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Espessura do Flap Planejado (μm) *
              </label>
              <input
                type="number"
                value={formData.espessuraFlap || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, espessuraFlap: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Ex: 110"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profundidade Estimada da Ablação (μm) *
              </label>
              <input
                type="number"
                value={formData.profundidadeAblacao || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, profundidadeAblacao: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Ex: 80"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Elevação Posterior (μm)
              </label>
              <input
                type="number"
                value={formData.elevacaoPosterior || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, elevacaoPosterior: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Ex: 12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Índice de Belin-Ambrósio (opcional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.indiceBelinAmbrosio || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, indiceBelinAmbrosio: parseFloat(e.target.value) || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Ex: 1.23"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Padrão Topográfico *
              </label>
              <select
                value={formData.tipoPadraoTopografico}
                onChange={(e) => setFormData(prev => ({ ...prev, tipoPadraoTopografico: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.padroesTopograficos.map(padrao => (
                  <option key={padrao} value={padrao}>{padrao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aberrometria Disponível?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.aberrometria === true}
                    onChange={() => setFormData(prev => ({ ...prev, aberrometria: true }))}
                    className="mr-2"
                  />
                  Sim
                </label>
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.aberrometria === false}
                    onChange={() => setFormData(prev => ({ ...prev, aberrometria: false }))}
                    className="mr-2"
                  />
                  Não
                </label>
              </div>
            </div>

            {formData.aberrometria && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Aberração de Alta Ordem
                </label>
                <select
                  value={formData.tipoAberracaoAltaOrdem || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipoAberracaoAltaOrdem: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">Selecione</option>
                  {opcoes.aberracoesAltaOrdem.map(aberracao => (
                    <option key={aberracao} value={aberracao}>{aberracao}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
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
            onClick={() => setShowModalCriterios(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            Critérios Desejáveis
          </button>
          
          <button
            onClick={() => setShowModalContraindicacoes(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Contraindicações
          </button>
          
          <button
            onClick={() => setShowModalTecnicas(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200"
          >
            Técnicas Cirúrgicas
          </button>
        </div>

        {/* Resultados da Análise */}
        {(formData.ptaCalculado !== '0.0' || formData.riscoEctasia || formData.tecnicaSugerida) && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🎯 Resultados da Análise
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">PTA Estimado</h3>
                <p className="text-2xl font-bold text-blue-600">{formData.ptaCalculado}%</p>
                <p className="text-sm text-blue-700 mt-2">
                  {parseFloat(formData.ptaCalculado) > 40 ? '⚠️ Risco elevado' : '✅ Dentro do normal'}
                </p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">Risco de Ectasia</h3>
                <p className={`text-2xl font-bold ${
                  formData.riscoEctasia === 'Alto' ? 'text-red-600' : 
                  formData.riscoEctasia === 'Intermediário' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {formData.riscoEctasia}
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  {formData.riscoEctasia === 'Alto' ? '❌ Contraindicado' : 
                   formData.riscoEctasia === 'Intermediário' ? '⚠️ Cuidado' : '✅ Baixo risco'}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Técnica Sugerida</h3>
                <p className="text-lg font-medium text-green-700">{formData.tecnicaSugerida}</p>
                <p className="text-sm text-green-600 mt-2">
                  {formData.tecnicaSugerida.includes('Contraindicado') ? '❌ Não recomendado' : '✅ Recomendado'}
                </p>
              </div>
            </div>

            {/* Laudo Clínico */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">📋 Laudo Clínico</h3>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {formData.laudoClinico}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Modal Critérios Desejáveis */}
        {showModalCriterios && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-light text-gray-800 mb-2">Critérios Desejáveis</h2>
                  <p className="text-gray-600 text-sm">Candidatos ideais para cirurgia refrativa</p>
                </div>
                <button
                  onClick={() => setShowModalCriterios(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors duration-200"
                >
                  ×
                </button>
              </div>
              
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="text-xl font-medium text-green-900 mb-4">✅ Critérios Ideais</h3>
                <ul className="space-y-3">
                  {criteriosDesejaveis.map((criterio, index) => (
                    <li key={index} className="flex items-start text-green-800">
                      <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {criterio}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal Contraindicações */}
        {showModalContraindicacoes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-light text-gray-800 mb-2">Contraindicações Relativas</h2>
                  <p className="text-gray-600 text-sm">Condições que requerem avaliação cuidadosa</p>
                </div>
                <button
                  onClick={() => setShowModalContraindicacoes(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors duration-200"
                >
                  ×
                </button>
              </div>
              
              <div className="bg-red-50 rounded-xl p-6">
                <h3 className="text-xl font-medium text-red-900 mb-4">⚠️ Contraindicações</h3>
                <ul className="space-y-3">
                  {contraindicacoesRelativas.map((contraindicacao, index) => (
                    <li key={index} className="flex items-start text-red-800">
                      <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {contraindicacao}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal Técnicas Cirúrgicas */}
        {showModalTecnicas && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-light text-gray-800 mb-2">Técnicas Cirúrgicas</h2>
                  <p className="text-gray-600 text-sm">Opções disponíveis para cirurgia refrativa</p>
                </div>
                <button
                  onClick={() => setShowModalTecnicas(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors duration-200"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tecnicasRefrativas.map((tecnica, index) => (
                  <div key={index} className="bg-blue-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">{tecnica.tecnica}</h3>
                    <p className="text-blue-800 text-sm">{tecnica.indicacao}</p>
                    {complicacoesPorTecnica[tecnica.tecnica as keyof typeof complicacoesPorTecnica] && (
                      <div className="mt-4">
                        <h4 className="font-medium text-blue-900 mb-2 text-sm">Complicações:</h4>
                        <ul className="space-y-1">
                          {complicacoesPorTecnica[tecnica.tecnica as keyof typeof complicacoesPorTecnica]?.map((complicacao, idx) => (
                            <li key={idx} className="text-blue-700 text-xs flex items-start">
                              <span className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                              {complicacao}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Mitomicina C */}
              <div className="mt-6 bg-yellow-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">Mitomicina C</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2 text-sm">Indicações:</h4>
                    <ul className="space-y-1">
                      {mitomicinaC.indicacoes.map((indicacao, index) => (
                        <li key={index} className="text-yellow-700 text-xs flex items-start">
                          <span className="w-1 h-1 bg-yellow-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          {indicacao}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2 text-sm">Dosagem:</h4>
                    <p className="text-yellow-700 text-sm">{mitomicinaC.dosagem}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2 text-sm">Tempo:</h4>
                    <p className="text-yellow-700 text-sm">{mitomicinaC.tempo}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 