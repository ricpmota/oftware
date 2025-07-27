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

  const [activeAccordion, setActiveAccordion] = useState<string>('dadosBasicos');
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

  const toggleAccordion = (section: string) => {
    setActiveAccordion(activeAccordion === section ? '' : section);
  };

  const gerarLaudo = () => {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    let laudo = `Laudo de Ultrassonografia Ocular (Modo B)

Data: ${dataAtual} - Hora: ${horaAtual}
Olho examinado: ${form.olho}
Condição pupilar: ${form.midriase ? 'Pupila dilatada' : 'Pupila não dilatada'}`;

    // Dados clínicos (apenas se preenchidos)
    if (form.acuidadeVisual) {
      laudo += `\nAcuidade Visual: ${form.acuidadeVisual}`;
    }
    if (form.pressaoIntraocular) {
      laudo += `\nPressão Intraocular: ${form.pressaoIntraocular} mmHg`;
    }

    laudo += `\n\nACHADOS ULTRASSONOGRÁFICOS:`;

    // Corpo Vítreo
    if (form.corpoVitreo.length > 0) {
      laudo += `\n\nCorpo Vítreo: ${form.corpoVitreo.join(', ')}.`;
    }
    
    // Retina
    if (form.retina.length > 0) {
      laudo += `\n\nRetina: ${form.retina.join(', ')}.`;
    }
    
    // Nervo Óptico
    if (form.nervoOptico.length > 0) {
      laudo += `\n\nNervo Óptico: ${form.nervoOptico.join(', ')}.`;
    }
    
    // Outras Estruturas
    if (form.outrasEstruturas.length > 0) {
      laudo += `\n\nOutras Estruturas: ${form.outrasEstruturas.join(', ')}.`;
    }
    
    // Se nenhum achado foi selecionado
    if (form.corpoVitreo.length === 0 && form.retina.length === 0 && 
        form.nervoOptico.length === 0 && form.outrasEstruturas.length === 0) {
      laudo += `\n\nNenhum achado patológico detectado.`;
    }
    
    // Conduta
    if (form.conduta.length > 0) {
      laudo += `\n\nConduta: ${form.conduta.join(', ')}.`;
    }
    
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
    if (laudoGerado) {
      try {
        await navigator.clipboard.writeText(laudoGerado);
        alert('Laudo copiado para a área de transferência!');
      } catch (err) {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar o laudo');
      }
    }
  };

  const AccordionItem = ({ title, section, children }: { title: string; section: string; children: React.ReactNode }) => (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => toggleAccordion(section)}
        className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex justify-between items-center"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        <span className="text-gray-500">
          {activeAccordion === section ? '▼' : '▶'}
        </span>
      </button>
      {activeAccordion === section && (
        <div className="p-6 bg-white">
          {children}
        </div>
      )}
    </div>
  );

  const CheckboxGroup = ({ title, options, selected, onChange }: { 
    title: string; 
    options: string[]; 
    selected: string[]; 
    onChange: (value: string) => void;
  }) => (
    <div className="mb-4">
      <h4 className="font-medium text-gray-700 mb-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors duration-200 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onChange(option)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${selected.includes(option) ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
              {option}
            </span>
            {selected.includes(option) && (
              <span className="ml-auto text-green-500 text-xs">✓</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <img 
            src="/icones/Retina.png" 
            alt="Retina" 
            className="w-16 h-16 mr-4"
          />
          <h1 className="text-3xl font-bold text-gray-800">Laudo de Ultrassom Ocular</h1>
        </div>
        <p className="text-lg text-gray-600">Ultrassonografia Ocular (modo B) - Análise de estruturas intraoculares</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Formulário */}
        <div className="space-y-4">
          <AccordionItem title="Dados Básicos" section="dadosBasicos">
            <div className="space-y-4">
              {/* Seleção do Olho */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Olho</h4>
                <div className="flex space-x-4">
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
              <div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </AccordionItem>

          <AccordionItem title="Corpo Vítreo" section="corpoVitreo">
            <CheckboxGroup
              title="Achados do Corpo Vítreo"
              options={opcoes.corpoVitreo}
              selected={form.corpoVitreo}
              onChange={(value) => handleCheck('corpoVitreo', value)}
            />
          </AccordionItem>

          <AccordionItem title="Retina" section="retina">
            <CheckboxGroup
              title="Achados da Retina"
              options={opcoes.retina}
              selected={form.retina}
              onChange={(value) => handleCheck('retina', value)}
            />
          </AccordionItem>

          <AccordionItem title="Nervo Óptico" section="nervoOptico">
            <CheckboxGroup
              title="Achados do Nervo Óptico"
              options={opcoes.nervoOptico}
              selected={form.nervoOptico}
              onChange={(value) => handleCheck('nervoOptico', value)}
            />
          </AccordionItem>

          <AccordionItem title="Outras Estruturas" section="outrasEstruturas">
            <CheckboxGroup
              title="Outras Estruturas"
              options={opcoes.outrasEstruturas}
              selected={form.outrasEstruturas}
              onChange={(value) => handleCheck('outrasEstruturas', value)}
            />
          </AccordionItem>

          <AccordionItem title="Conduta" section="conduta">
            <CheckboxGroup
              title="Conduta Sugerida"
              options={opcoes.condutas}
              selected={form.conduta}
              onChange={(value) => handleCheck('conduta', value)}
            />
          </AccordionItem>
        </div>

        {/* Pré-visualização do Laudo */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Pré-visualização do Laudo</h3>
              <div className="space-x-2">
                <button
                  onClick={gerarLaudo}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Gerar Laudo
                </button>
                <button
                  onClick={zerarFormulario}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors duration-200"
                >
                  Zerar
                </button>
              </div>
            </div>
            
            {laudoGerado && (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                    {laudoGerado}
                  </pre>
                </div>
                <button
                  onClick={copiarLaudo}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors duration-200"
                >
                  Copiar Laudo
                </button>
              </div>
            )}
            
            {!laudoGerado && (
              <div className="text-center text-gray-500 py-8">
                <p>Clique em &quot;Gerar Laudo&quot; para ver a pré-visualização</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 