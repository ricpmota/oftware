'use client';

import React, { useState } from 'react';

interface UltrassomFormData {
  olho: 'OD' | 'OE';
  midriase: boolean;
  acuidadeVisual: string;
  pressaoIntraocular: string;
  corpoVitreo: string[];
  retina: string[];
  nervoOptico: string[];
  outrasEstruturas: string[];
  conduta: string[];
}

export default function UltrassomLaudoForm() {
  const [form, setForm] = useState<UltrassomFormData>({
    olho: 'OD',
    midriase: false,
    acuidadeVisual: '',
    pressaoIntraocular: '',
    corpoVitreo: [],
    retina: [],
    nervoOptico: [],
    outrasEstruturas: [],
    conduta: []
  });

  const [laudoGerado, setLaudoGerado] = useState('');

  const opcoes = {
    olhos: ['OD', 'OE'],
    corpoVitreo: [
      'Padrão anecogênico normal',
      'Hemorragia vítrea',
      'Descolamento do vítreo posterior (DVP)',
      'Membrana vítrea condensada',
      'Corpos estranhos intravítreos',
      'Opacidades vítreas',
      'Sinéreses vítreas',
      'Hifema',
      'Endoftalmite'
    ],
    retina: [
      'Retina aplicada',
      'Descolamento de retina total',
      'Descolamento de retina localizado',
      'Descolamento regmatogênico',
      'Descolamento tracional',
      'Proliferação vítreo-retiniana (PVR)',
      'Retinose pigmentar',
      'Retinoblastoma',
      'Melanoma de coroide',
      'Metástases'
    ],
    nervoOptico: [
      'Excavação preservada',
      'Aumento da escavação',
      'Papiledema',
      'Drusas de papila',
      'Atrofia óptica',
      'Neurite óptica',
      'Glioma do nervo óptico',
      'Meningioma'
    ],
    outrasEstruturas: [
      'Espessamento escleral',
      'Tumor intraocular',
      'Calcificações',
      'Afácico / pseudofácico',
      'Lente intraocular',
      'Catarata',
      'Subluxação de cristalino',
      'Microftalmia',
      'Buftalmia',
      'Fístula arteriovenosa'
    ],
    condutas: [
      'Acompanhamento clínico',
      'Indicação de vitrectomia',
      'Encaminhamento para especialista em retina',
      'Solicitar TC / RM complementares',
      'Indicação de cirurgia de catarata',
      'Avaliação neuro-oftalmológica',
      'Biópsia para confirmação diagnóstica',
      'Tratamento oncológico',
      'Fotocoagulação a laser',
      'Crioterapia'
    ]
  };

  const handleCheck = (campo: keyof UltrassomFormData, valor: string) => {
    setForm(prev => {
      const currentArray = prev[campo] as string[];
      const jaExiste = currentArray.includes(valor);
      const novoArray = jaExiste ? currentArray.filter(v => v !== valor) : [...currentArray, valor];
      return { ...prev, [campo]: novoArray };
    });
  };

  const gerarLaudo = () => {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Cabeçalho do laudo
    let laudo = `LAUDO DE ULTRASSONOGRAFIA OCULAR (MODO B)\n`;
    laudo += `Data: ${dataAtual} - Hora: ${horaAtual}\n`;
    laudo += `Examinador: Dr. _________________\n`;
    laudo += `Paciente: _________________\n`;
    laudo += `Idade: ___ anos\n`;
    if (form.acuidadeVisual) {
      laudo += `Acuidade Visual: ${form.acuidadeVisual}\n`;
    }
    if (form.pressaoIntraocular) {
      laudo += `Pressão Intraocular: ${form.pressaoIntraocular} mmHg\n`;
    }
    laudo += `\n`;
    
    // Informações técnicas
    laudo += `INFORMAÇÕES TÉCNICAS:\n`;
    laudo += `- Equipamento: Ultrassom ocular (modo B)\n`;
    laudo += `- Frequência: 10-50 MHz\n`;
    laudo += `- Olho examinado: ${form.olho}\n`;
    laudo += `- Condição pupilar: ${form.midriase ? 'Pupila dilatada' : 'Pupila não dilatada'}\n\n`;
    
    // Achados por seção
    laudo += `ACHADOS ULTRASSONOGRÁFICOS:\n\n`;
    
    // Corpo Vítreo
    if (form.corpoVitreo.length > 0) {
      laudo += `1. CORPO VÍTREO:\n`;
      form.corpoVitreo.forEach((achado, index) => {
        laudo += `   ${index + 1}.1. ${achado}\n`;
      });
      laudo += `\n`;
    }
    
    // Retina
    if (form.retina.length > 0) {
      laudo += `2. RETINA:\n`;
      form.retina.forEach((achado, index) => {
        laudo += `   ${index + 1}.1. ${achado}\n`;
      });
      laudo += `\n`;
    }
    
    // Nervo Óptico
    if (form.nervoOptico.length > 0) {
      laudo += `3. NERVO ÓPTICO:\n`;
      form.nervoOptico.forEach((achado, index) => {
        laudo += `   ${index + 1}.1. ${achado}\n`;
      });
      laudo += `\n`;
    }
    
    // Outras Estruturas
    if (form.outrasEstruturas.length > 0) {
      laudo += `4. OUTRAS ESTRUTURAS:\n`;
      form.outrasEstruturas.forEach((achado, index) => {
        laudo += `   ${index + 1}.1. ${achado}\n`;
      });
      laudo += `\n`;
    }
    
    // Se nenhum achado foi selecionado
    if (form.corpoVitreo.length === 0 && form.retina.length === 0 && 
        form.nervoOptico.length === 0 && form.outrasEstruturas.length === 0) {
      laudo += `Nenhum achado patológico detectado.\n\n`;
    }
    
    // Impressão diagnóstica
    laudo += `IMPRESSÃO DIAGNÓSTICA:\n`;
    
    // Condições do corpo vítreo
    if (form.corpoVitreo.includes('Hemorragia vítrea')) {
      laudo += `- Hemorragia vítrea\n`;
    }
    if (form.corpoVitreo.includes('Descolamento do vítreo posterior (DVP)')) {
      laudo += `- Descolamento do vítreo posterior\n`;
    }
    if (form.corpoVitreo.includes('Endoftalmite')) {
      laudo += `- Endoftalmite\n`;
    }
    if (form.corpoVitreo.includes('Hifema')) {
      laudo += `- Hifema\n`;
    }
    
    // Condições da retina
    if (form.retina.includes('Descolamento de retina total')) {
      laudo += `- Descolamento de retina total\n`;
    } else if (form.retina.includes('Descolamento de retina localizado')) {
      laudo += `- Descolamento de retina localizado\n`;
    }
    if (form.retina.includes('Descolamento tracional')) {
      laudo += `- Descolamento de retina tracional\n`;
    }
    if (form.retina.includes('Proliferação vítreo-retiniana (PVR)')) {
      laudo += `- Proliferação vítreo-retiniana (PVR)\n`;
    }
    if (form.retina.includes('Retinoblastoma')) {
      laudo += `- Retinoblastoma\n`;
    }
    if (form.retina.includes('Melanoma de coroide')) {
      laudo += `- Melanoma de coroide\n`;
    }
    if (form.retina.includes('Metástases')) {
      laudo += `- Metástases oculares\n`;
    }
    
    // Condições do nervo óptico
    if (form.nervoOptico.includes('Papiledema')) {
      laudo += `- Papiledema\n`;
    }
    if (form.nervoOptico.includes('Atrofia óptica')) {
      laudo += `- Atrofia óptica\n`;
    }
    if (form.nervoOptico.includes('Neurite óptica')) {
      laudo += `- Neurite óptica\n`;
    }
    if (form.nervoOptico.includes('Glioma do nervo óptico')) {
      laudo += `- Glioma do nervo óptico\n`;
    }
    if (form.nervoOptico.includes('Meningioma')) {
      laudo += `- Meningioma\n`;
    }
    
    // Outras condições
    if (form.outrasEstruturas.includes('Tumor intraocular')) {
      laudo += `- Tumor intraocular\n`;
    }
    if (form.outrasEstruturas.includes('Catarata')) {
      laudo += `- Catarata\n`;
    }
    if (form.outrasEstruturas.includes('Subluxação de cristalino')) {
      laudo += `- Subluxação de cristalino\n`;
    }
    if (form.outrasEstruturas.includes('Microftalmia')) {
      laudo += `- Microftalmia\n`;
    }
    if (form.outrasEstruturas.includes('Buftalmia')) {
      laudo += `- Buftalmia\n`;
    }
    if (form.outrasEstruturas.includes('Fístula arteriovenosa')) {
      laudo += `- Fístula arteriovenosa\n`;
    }
    
    // Se nenhum achado foi selecionado
    if (form.corpoVitreo.length === 0 && form.retina.length === 0 && 
        form.nervoOptico.length === 0 && form.outrasEstruturas.length === 0) {
      laudo += `- Ultrassonografia ocular normal\n`;
    }
    laudo += `\n`;
    
    // Conduta
    if (form.conduta.length > 0) {
      laudo += `CONDUTA SUGERIDA:\n`;
      form.conduta.forEach((conduta, index) => {
        laudo += `${index + 1}. ${conduta}\n`;
      });
      laudo += `\n`;
    }
    
    // Observações adicionais
    laudo += `OBSERVAÇÕES:\n`;
    laudo += `- Exame realizado conforme protocolo padrão\n`;
    laudo += `- Imagens arquivadas no sistema\n`;
    laudo += `- Laudo assinado eletronicamente\n\n`;
    
    // Assinatura
    laudo += `_________________________________\n`;
    laudo += `Dr. _________________\n`;
    laudo += `CRM: _______________\n`;
    laudo += `Especialista em Oftalmologia\n`;
    
    setLaudoGerado(laudo);
  };

  const zerarFormulario = () => {
    setForm({
      olho: 'OD',
      midriase: false,
      acuidadeVisual: '',
      pressaoIntraocular: '',
      corpoVitreo: [],
      retina: [],
      nervoOptico: [],
      outrasEstruturas: [],
      conduta: []
    });
    setLaudoGerado('');
  };

  const copiarLaudo = async () => {
    try {
      await navigator.clipboard.writeText(laudoGerado);
      alert('Laudo copiado para a área de transferência!');
    } catch {
      alert('Erro ao copiar o laudo');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Laudo de Ultrassom Ocular</h1>
        <p className="text-lg text-gray-600">Ultrassonografia Ocular (modo B) - Análise de estruturas intraoculares</p>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        {/* Seleção do Olho */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Olho</h3>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {opcoes.olhos.map((olho) => (
              <label key={olho} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="olho"
                  value={olho}
                  checked={form.olho === olho}
                  onChange={(e) => setForm({ ...form, olho: e.target.value as 'OD' | 'OE' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium">{olho}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Midríase */}
        <div className="mb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.midriase}
              onChange={(e) => setForm({ ...form, midriase: e.target.checked })}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Pupila dilatada</span>
          </label>
        </div>

        {/* Acuidade Visual e Pressão Intraocular */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acuidade Visual
            </label>
            <input
              type="text"
              value={form.acuidadeVisual}
              onChange={(e) => setForm({ ...form, acuidadeVisual: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Ex: 20/20, CF, LP, NLP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pressão Intraocular (mmHg)
            </label>
            <input
              type="text"
              value={form.pressaoIntraocular}
              onChange={(e) => setForm({ ...form, pressaoIntraocular: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Ex: 16, 25, T+1"
            />
          </div>
        </div>

        {/* Corpo Vítreo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Corpo Vítreo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opcoes.corpoVitreo.map((opcao) => (
              <label key={opcao} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors duration-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.corpoVitreo.includes(opcao)}
                  onChange={() => handleCheck('corpoVitreo', opcao)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className={`${form.corpoVitreo.includes(opcao) ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                  {opcao}
                </span>
                {form.corpoVitreo.includes(opcao) && (
                  <span className="ml-auto text-green-500 text-xs">✓</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Retina */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Retina</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opcoes.retina.map((opcao) => (
              <label key={opcao} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors duration-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.retina.includes(opcao)}
                  onChange={() => handleCheck('retina', opcao)}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className={`${form.retina.includes(opcao) ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                  {opcao}
                </span>
                {form.retina.includes(opcao) && (
                  <span className="ml-auto text-green-500 text-xs">✓</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Nervo Óptico */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Nervo Óptico</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opcoes.nervoOptico.map((opcao) => (
              <label key={opcao} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors duration-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.nervoOptico.includes(opcao)}
                  onChange={() => handleCheck('nervoOptico', opcao)}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className={`${form.nervoOptico.includes(opcao) ? 'text-purple-700 font-medium' : 'text-gray-700'}`}>
                  {opcao}
                </span>
                {form.nervoOptico.includes(opcao) && (
                  <span className="ml-auto text-green-500 text-xs">✓</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Outras Estruturas */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Outras Estruturas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opcoes.outrasEstruturas.map((opcao) => (
              <label key={opcao} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors duration-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.outrasEstruturas.includes(opcao)}
                  onChange={() => handleCheck('outrasEstruturas', opcao)}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <span className={`${form.outrasEstruturas.includes(opcao) ? 'text-orange-700 font-medium' : 'text-gray-700'}`}>
                  {opcao}
                </span>
                {form.outrasEstruturas.includes(opcao) && (
                  <span className="ml-auto text-green-500 text-xs">✓</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Conduta */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Conduta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opcoes.condutas.map((opcao) => (
              <label key={opcao} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors duration-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.conduta.includes(opcao)}
                  onChange={() => handleCheck('conduta', opcao)}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className={`${form.conduta.includes(opcao) ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                  {opcao}
                </span>
                {form.conduta.includes(opcao) && (
                  <span className="ml-auto text-green-500 text-xs">✓</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={gerarLaudo}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Gerar Laudo
          </button>
          <button
            onClick={zerarFormulario}
            className="bg-gray-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Zerar Formulário
          </button>
        </div>
      </div>

      {/* Pré-visualização do Laudo */}
      {laudoGerado && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Pré-visualização do Laudo</h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <pre className="whitespace-pre-wrap text-gray-800 font-mono text-sm">{laudoGerado}</pre>
          </div>
          <button
            onClick={copiarLaudo}
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200"
          >
            Copiar Laudo
          </button>
        </div>
      )}
    </div>
  );
} 