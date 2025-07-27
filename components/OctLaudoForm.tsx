'use client';

import React, { useState } from 'react';

interface PapilaData {
  escavacaoVertical: string;
  escavacaoHorizontal: string;
  assimetria: boolean;
  rnfl: {
    superior: string;
    inferior: string;
    nasal: string;
    temporal: string;
    mediaGlobal: string;
  };
  camadaGanglionar: string;
  curvaTSNI: string;
  localizacaoPerda: string;
  tamanhoDisco: string;
  mapaCalor: string;
  outros: string;
}

interface OlhoData {
  espessuraFoveal: string;
  espessuraMedia: string;
  alteracoesMaculares: string[];
  alteracoesVitreas: string[];
  integridadeEPR: string;
  integridadeZEL: string;
  sinaisAdicionais: string[];
  papila: PapilaData;
}

interface FormData {
  tipoExame: string;
  olhoDireito: OlhoData;
  olhoEsquerdo: OlhoData;
  recomendacoes: string[];
}

export default function OctLaudoForm() {
  const [form, setForm] = useState<FormData>({
    tipoExame: '',
    olhoDireito: {
      espessuraFoveal: '',
      espessuraMedia: '',
      alteracoesMaculares: [],
      alteracoesVitreas: [],
      integridadeEPR: '',
      integridadeZEL: '',
      sinaisAdicionais: [],
      papila: {
        escavacaoVertical: '',
        escavacaoHorizontal: '',
        assimetria: false,
        rnfl: {
          superior: '',
          inferior: '',
          nasal: '',
          temporal: '',
          mediaGlobal: ''
        },
        camadaGanglionar: '',
        curvaTSNI: '',
        localizacaoPerda: '',
        tamanhoDisco: '',
        mapaCalor: '',
        outros: ''
      }
    },
    olhoEsquerdo: {
      espessuraFoveal: '',
      espessuraMedia: '',
      alteracoesMaculares: [],
      alteracoesVitreas: [],
      integridadeEPR: '',
      integridadeZEL: '',
      sinaisAdicionais: [],
      papila: {
        escavacaoVertical: '',
        escavacaoHorizontal: '',
        assimetria: false,
        rnfl: {
          superior: '',
          inferior: '',
          nasal: '',
          temporal: '',
          mediaGlobal: ''
        },
        camadaGanglionar: '',
        curvaTSNI: '',
        localizacaoPerda: '',
        tamanhoDisco: '',
        mapaCalor: '',
        outros: ''
      }
    },
    recomendacoes: []
  });

  const [activeAccordion, setActiveAccordion] = useState<string>('tipoExame');
  const [olhoAtivo, setOlhoAtivo] = useState<'OD' | 'OE'>('OD');
  const [laudoGerado, setLaudoGerado] = useState<string>('');

  const opcoes = {
    tipoExame: [
      'OCT de Mácula',
      'OCT de Papila',
      'OCT Completo'
    ],
    alteracoesMaculares: [
      'Edema intrarretiniano',
      'Edema sub-retiniano',
      'Descolamento de retina neurossensorial',
      'Descolamento do EPR',
      'Drusas',
      'Hiporreflectividade subfoveal',
      'Atrofia central',
      'Buraco macular',
      'Membrana epirretiniana',
      'Cistos intrarretinianos'
    ],
    alteracoesVitreas: [
      'Tração vítreo-macular',
      'Descolamento do vítreo posterior',
      'Membrana epirretiniana',
      'Hialóide posterior',
      'Pucker macular'
    ],
    integridade: [
      'Integra',
      'Discreta desorganização',
      'Ausente',
      'Desorganizada',
      'Fragmentada'
    ],
    sinaisAdicionais: [
      'Atrofia central',
      'Degeneração macular relacionada à idade',
      'Edema macular diabético',
      'Buraco macular',
      'Membrana epirretiniana',
      'Tração vítreo-macular',
      'Drusas',
      'Neovascularização'
    ],
    papilaEscavacao: [
      '0.1',
      '0.2',
      '0.3',
      '0.4',
      '0.5',
      '0.6',
      '0.7',
      '0.8',
      '0.9'
    ],
    rNFL: [
      'Preservado',
      'Aumentado',
      'Reduzido',
      'Assimétrico',
      'Normal',
      'Atrofiado'
    ],
    camadaGanglionar: [
      'Preservada',
      'Reduzida',
      'Ausente',
      'Normal',
      'Atrofiada'
    ],
    curvaTSNI: [
      'Normal',
      'Alterada',
      'Aplanada',
      'Invertida',
      'Não avaliada'
    ],
    localizacaoPerda: [
      'Superior',
      'Inferior',
      'Nasal',
      'Temporal',
      'Superior-temporal',
      'Superior-nasal',
      'Inferior-temporal',
      'Inferior-nasal',
      'Difusa',
      'Não identificada'
    ],
    tamanhoDisco: [
      'Pequeno (<1.5mm)',
      'Normal (1.5-2.0mm)',
      'Grande (>2.0mm)',
      'Muito grande (>2.5mm)'
    ],
    mapaCalor: [
      'Normal (verde)',
      'Atenção (amarelo)',
      'Alterado (vermelho)',
      'Muito alterado (vermelho escuro)',
      'Defeito localizado',
      'Defeito difuso'
    ],
    recomendacoes: [
      'Acompanhamento clínico',
      'Iniciar anti-VEGF',
      'Solicitar angiofluoresceinografia',
      'Encaminhar para especialista em retina',
      'Solicitar campo visual',
      'Iniciar fotocoagulação a laser',
      'Solicitar ERG',
      'Acompanhamento em 3 meses',
      'Acompanhamento em 6 meses',
      'Solicitar ultrassom ocular'
    ]
  };

  const handleCheck = (campo: string, valor: string, olho?: 'OD' | 'OE') => {
    setForm(prev => {
      if (olho) {
        const olhoData = olho === 'OD' ? prev.olhoDireito : prev.olhoEsquerdo;
        const currentArray = olhoData[campo as keyof OlhoData] as string[];
        const jaExiste = currentArray.includes(valor);
        const novoArray = jaExiste 
          ? currentArray.filter(v => v !== valor) 
          : [...currentArray, valor];
        
        return {
          ...prev,
          [olho === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
            ...olhoData,
            [campo]: novoArray
          }
        };
      } else {
        const currentArray = prev[campo as keyof FormData] as string[];
        const jaExiste = currentArray.includes(valor);
        const novoArray = jaExiste 
          ? currentArray.filter(v => v !== valor) 
          : [...currentArray, valor];
        return { ...prev, [campo]: novoArray };
      }
    });
  };

  const toggleAccordion = (section: string) => {
    setActiveAccordion(activeAccordion === section ? '' : section);
  };

  const gerarLaudo = () => {
    const gerarLaudoOlho = (olho: 'OD' | 'OE', dados: OlhoData) => {
      let laudo = `${olho}:\n`;
      
      // Determinar se inclui mácula e/ou papila baseado no tipo de exame
      const incluiMacula = form.tipoExame === 'OCT de Mácula' || form.tipoExame === 'OCT Completo';
      const incluiPapila = form.tipoExame === 'OCT de Papila' || form.tipoExame === 'OCT Completo';
      
      if (incluiMacula) {
        laudo += 'MÁCULA:\n';
        
        // Medidas
        if (dados.espessuraFoveal) {
          laudo += `Espessura foveal de ${dados.espessuraFoveal}µm. `;
        }
        if (dados.espessuraMedia) {
          laudo += `Espessura média central de ${dados.espessuraMedia}µm (VN: 250-300µm). `;
        }

        // Alterações maculares
        if (dados.alteracoesMaculares.length > 0) {
          laudo += `Alterações maculares: ${dados.alteracoesMaculares.join(', ')}. `;
        }

        // Alterações vítreas
        if (dados.alteracoesVitreas.length > 0) {
          laudo += `Alterações vítreas: ${dados.alteracoesVitreas.join(', ')}. `;
        }

        // Integridade
        if (dados.integridadeEPR) {
          laudo += `Integridade do EPR: ${dados.integridadeEPR.toLowerCase()}. `;
        }
        if (dados.integridadeZEL) {
          laudo += `ZEL ${dados.integridadeZEL.toLowerCase()}. `;
        }

        // Sinais adicionais
        if (dados.sinaisAdicionais.length > 0) {
          laudo += `Sinais adicionais: ${dados.sinaisAdicionais.join(', ')}. `;
        }
        
        laudo += '\n';
      }

      // Papila (apenas se tipo de exame incluir papila)
      if (incluiPapila) {
        laudo += 'PAPILA:\n';
        if (dados.papila.escavacaoVertical || dados.papila.escavacaoHorizontal || dados.papila.assimetria || dados.papila.rnfl.superior || dados.papila.rnfl.inferior || dados.papila.rnfl.nasal || dados.papila.rnfl.temporal || dados.papila.rnfl.mediaGlobal || dados.papila.camadaGanglionar || dados.papila.curvaTSNI || dados.papila.localizacaoPerda || dados.papila.tamanhoDisco || dados.papila.mapaCalor) {
          if (dados.papila.escavacaoVertical) {
            laudo += `Escavação vertical de ${dados.papila.escavacaoVertical} (VN: até 0.6). `;
          }
          if (dados.papila.escavacaoHorizontal) {
            laudo += `Escavação horizontal de ${dados.papila.escavacaoHorizontal} (VN: até 0.6). `;
          }
          if (dados.papila.assimetria) {
            laudo += `Assimetria na papila. `;
          }
          if (dados.papila.rnfl.superior) {
            laudo += `RNFL superior ${dados.papila.rnfl.superior.toLowerCase()}. `;
          }
          if (dados.papila.rnfl.inferior) {
            laudo += `RNFL inferior ${dados.papila.rnfl.inferior.toLowerCase()}. `;
          }
          if (dados.papila.rnfl.nasal) {
            laudo += `RNFL nasal ${dados.papila.rnfl.nasal.toLowerCase()}. `;
          }
          if (dados.papila.rnfl.temporal) {
            laudo += `RNFL temporal ${dados.papila.rnfl.temporal.toLowerCase()}. `;
          }
          if (dados.papila.rnfl.mediaGlobal) {
            laudo += `RNFL média global ${dados.papila.rnfl.mediaGlobal.toLowerCase()}. `;
          }
          if (dados.papila.camadaGanglionar) {
            laudo += `Camada de células ganglionares ${dados.papila.camadaGanglionar.toLowerCase()}. `;
          }
          if (dados.papila.curvaTSNI) {
            laudo += `Curva TSNI ${dados.papila.curvaTSNI.toLowerCase()}. `;
          }
          if (dados.papila.localizacaoPerda) {
            laudo += `Localização da perda de fibras: ${dados.papila.localizacaoPerda}. `;
          }
          if (dados.papila.tamanhoDisco) {
            laudo += `Tamanho do disco: ${dados.papila.tamanhoDisco}. `;
          }
          if (dados.papila.mapaCalor) {
            laudo += `Mapa de calor: ${dados.papila.mapaCalor}. `;
          }
          if (dados.papila.outros) {
            laudo += dados.papila.outros;
          }
        }
      }

      return laudo.trim();
    };

    const laudoOD = gerarLaudoOlho('OD', form.olhoDireito);
    const laudoOE = gerarLaudoOlho('OE', form.olhoEsquerdo);
    const laudoRecomendacoes = form.recomendacoes.length > 0 ? `\n\nConduta: ${form.recomendacoes.join(', ')}.` : '';

    const laudo = `Laudo de ${form.tipoExame}:

${laudoOD}

${laudoOE}${laudoRecomendacoes}`;

    setLaudoGerado(laudo);
    return laudo;
  };

  const zerarFormulario = () => {
    setForm({
      tipoExame: '',
      olhoDireito: {
        espessuraFoveal: '',
        espessuraMedia: '',
        alteracoesMaculares: [],
        alteracoesVitreas: [],
        integridadeEPR: '',
        integridadeZEL: '',
        sinaisAdicionais: [],
        papila: {
          escavacaoVertical: '',
          escavacaoHorizontal: '',
          assimetria: false,
          rnfl: {
            superior: '',
            inferior: '',
            nasal: '',
            temporal: '',
            mediaGlobal: ''
          },
          camadaGanglionar: '',
          curvaTSNI: '',
          localizacaoPerda: '',
          tamanhoDisco: '',
          mapaCalor: '',
          outros: ''
        }
      },
      olhoEsquerdo: {
        espessuraFoveal: '',
        espessuraMedia: '',
        alteracoesMaculares: [],
        alteracoesVitreas: [],
        integridadeEPR: '',
        integridadeZEL: '',
        sinaisAdicionais: [],
        papila: {
          escavacaoVertical: '',
          escavacaoHorizontal: '',
          assimetria: false,
          rnfl: {
            superior: '',
            inferior: '',
            nasal: '',
            temporal: '',
            mediaGlobal: ''
          },
          camadaGanglionar: '',
          curvaTSNI: '',
          localizacaoPerda: '',
          tamanhoDisco: '',
          mapaCalor: '',
          outros: ''
        }
      },
      recomendacoes: []
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

  const getOlhoData = () => olhoAtivo === 'OD' ? form.olhoDireito : form.olhoEsquerdo;

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
          <h1 className="text-3xl font-bold text-gray-800">Laudo de <span className="medical-term notranslate" translate="no" lang="en">OCT</span></h1>
        </div>
        <p className="text-lg text-gray-600">Formulário interativo para geração de laudos de <span className="medical-term notranslate" translate="no" lang="en">OCT</span></p>
      </div>

      {/* Seleção de Olho */}
      <div className="flex justify-center mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setOlhoAtivo('OD')}
            className={`px-4 sm:px-8 py-3 rounded-md font-medium transition-colors duration-200 ${
              olhoAtivo === 'OD'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            OD
          </button>
          <button
            onClick={() => setOlhoAtivo('OE')}
            className={`px-4 sm:px-8 py-3 rounded-md font-medium transition-colors duration-200 ${
              olhoAtivo === 'OE'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            OE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Formulário */}
        <div className="space-y-4">
          <AccordionItem title="Tipo de Exame" section="tipoExame">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Exame <span className="medical-term notranslate" translate="no" lang="en">OCT</span>
                </label>
                <select
                  value={form.tipoExame}
                  onChange={(e) => setForm({ ...form, tipoExame: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">Selecione o tipo de exame</option>
                  {opcoes.tipoExame.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            </div>
          </AccordionItem>

          {(form.tipoExame === 'OCT de Mácula' || form.tipoExame === 'OCT Completo') && (
            <AccordionItem title={`Medidas Maculares (${olhoAtivo})`} section="medidas">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Espessura Foveal (µm)</label>
                    <input
                      type="text"
                      value={getOlhoData().espessuraFoveal}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          espessuraFoveal: e.target.value
                        }
                      })}
                      placeholder="Ex: 250"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Espessura Média (µm)</label>
                    <input
                      type="text"
                      value={getOlhoData().espessuraMedia}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          espessuraMedia: e.target.value
                        }
                      })}
                      placeholder="Ex: 275"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                </div>
              </div>
            </AccordionItem>
          )}

          {(form.tipoExame === 'OCT de Mácula' || form.tipoExame === 'OCT Completo') && (
            <AccordionItem title={`Alterações Maculares (${olhoAtivo})`} section="alteracoesMaculares">
              <CheckboxGroup
                title="Alterações Maculares"
                options={opcoes.alteracoesMaculares}
                selected={getOlhoData().alteracoesMaculares}
                onChange={(value) => handleCheck('alteracoesMaculares', value, olhoAtivo)}
              />
            </AccordionItem>
          )}

          {(form.tipoExame === 'OCT de Mácula' || form.tipoExame === 'OCT Completo') && (
            <AccordionItem title={`Alterações Vítreas (${olhoAtivo})`} section="alteracoesVitreas">
              <CheckboxGroup
                title="Alterações Vítreas"
                options={opcoes.alteracoesVitreas}
                selected={getOlhoData().alteracoesVitreas}
                onChange={(value) => handleCheck('alteracoesVitreas', value, olhoAtivo)}
              />
            </AccordionItem>
          )}

          {(form.tipoExame === 'OCT de Mácula' || form.tipoExame === 'OCT Completo') && (
            <AccordionItem title={`Integridade (${olhoAtivo})`} section="integridade">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Integridade do EPR</label>
                  <select
                    value={getOlhoData().integridadeEPR}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        integridadeEPR: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione a integridade</option>
                    {opcoes.integridade.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Integridade da ZEL</label>
                  <select
                    value={getOlhoData().integridadeZEL}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        integridadeZEL: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione a integridade</option>
                    {opcoes.integridade.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>
            </AccordionItem>
          )}

          {(form.tipoExame === 'OCT de Mácula' || form.tipoExame === 'OCT Completo') && (
            <AccordionItem title={`Sinais Adicionais (${olhoAtivo})`} section="sinaisAdicionais">
              <CheckboxGroup
                title="Sinais Adicionais"
                options={opcoes.sinaisAdicionais}
                selected={getOlhoData().sinaisAdicionais}
                onChange={(value) => handleCheck('sinaisAdicionais', value, olhoAtivo)}
              />
            </AccordionItem>
          )}

          {(form.tipoExame === 'OCT de Papila' || form.tipoExame === 'OCT Completo') && (
            <AccordionItem title={`Papila (${olhoAtivo})`} section="papila">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Escavação Vertical</label>
                    <select
                      value={getOlhoData().papila.escavacaoVertical}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          papila: {
                            ...getOlhoData().papila,
                            escavacaoVertical: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="">Selecione</option>
                      {opcoes.papilaEscavacao.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Escavação Horizontal</label>
                    <select
                      value={getOlhoData().papila.escavacaoHorizontal}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          papila: {
                            ...getOlhoData().papila,
                            escavacaoHorizontal: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="">Selecione</option>
                      {opcoes.papilaEscavacao.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assimetria</label>
                    <select
                      value={getOlhoData().papila.assimetria ? 'Sim' : 'Não'}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          papila: {
                            ...getOlhoData().papila,
                            assimetria: e.target.value === 'Sim'
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RNFL Superior</label>
                    <select
                      value={getOlhoData().papila.rnfl.superior}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          papila: {
                            ...getOlhoData().papila,
                            rnfl: {
                              ...getOlhoData().papila.rnfl,
                              superior: e.target.value
                            }
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="">Selecione</option>
                      {opcoes.rNFL.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RNFL Inferior</label>
                    <select
                      value={getOlhoData().papila.rnfl.inferior}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          papila: {
                            ...getOlhoData().papila,
                            rnfl: {
                              ...getOlhoData().papila.rnfl,
                              inferior: e.target.value
                            }
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="">Selecione</option>
                      {opcoes.rNFL.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RNFL Nasal</label>
                    <select
                      value={getOlhoData().papila.rnfl.nasal}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          papila: {
                            ...getOlhoData().papila,
                            rnfl: {
                              ...getOlhoData().papila.rnfl,
                              nasal: e.target.value
                            }
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="">Selecione</option>
                      {opcoes.rNFL.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RNFL Temporal</label>
                    <select
                      value={getOlhoData().papila.rnfl.temporal}
                      onChange={(e) => setForm({
                        ...form,
                        [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                          ...getOlhoData(),
                          papila: {
                            ...getOlhoData().papila,
                            rnfl: {
                              ...getOlhoData().papila.rnfl,
                              temporal: e.target.value
                            }
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    >
                      <option value="">Selecione</option>
                      {opcoes.rNFL.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">RNFL Média Global</label>
                  <select
                    value={getOlhoData().papila.rnfl.mediaGlobal}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        papila: {
                          ...getOlhoData().papila,
                          rnfl: {
                            ...getOlhoData().papila.rnfl,
                            mediaGlobal: e.target.value
                          }
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione</option>
                    {opcoes.rNFL.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Camada Ganglionar</label>
                  <select
                    value={getOlhoData().papila.camadaGanglionar}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        papila: {
                          ...getOlhoData().papila,
                          camadaGanglionar: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione</option>
                    {opcoes.camadaGanglionar.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">Curva TSNI</label>
                   <select
                     value={getOlhoData().papila.curvaTSNI}
                     onChange={(e) => setForm({
                       ...form,
                       [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                         ...getOlhoData(),
                         papila: {
                           ...getOlhoData().papila,
                           curvaTSNI: e.target.value
                         }
                       }
                     })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                   >
                     <option value="">Selecione</option>
                     {opcoes.curvaTSNI.map((op) => (
                       <option key={op} value={op}>{op}</option>
                     ))}
                   </select>
                </div>
                <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">Localização da Perda de Fibras</label>
                   <select
                     value={getOlhoData().papila.localizacaoPerda}
                     onChange={(e) => setForm({
                       ...form,
                       [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                         ...getOlhoData(),
                         papila: {
                           ...getOlhoData().papila,
                           localizacaoPerda: e.target.value
                         }
                       }
                     })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                   >
                     <option value="">Selecione</option>
                     {opcoes.localizacaoPerda.map((op) => (
                       <option key={op} value={op}>{op}</option>
                     ))}
                   </select>
                </div>
                <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">Tamanho do Disco</label>
                   <select
                     value={getOlhoData().papila.tamanhoDisco}
                     onChange={(e) => setForm({
                       ...form,
                       [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                         ...getOlhoData(),
                         papila: {
                           ...getOlhoData().papila,
                           tamanhoDisco: e.target.value
                         }
                       }
                     })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                   >
                     <option value="">Selecione</option>
                     {opcoes.tamanhoDisco.map((op) => (
                       <option key={op} value={op}>{op}</option>
                     ))}
                   </select>
                </div>
                <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">Mapa de Calor</label>
                   <select
                     value={getOlhoData().papila.mapaCalor}
                     onChange={(e) => setForm({
                       ...form,
                       [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                         ...getOlhoData(),
                         papila: {
                           ...getOlhoData().papila,
                           mapaCalor: e.target.value
                         }
                       }
                     })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                   >
                     <option value="">Selecione</option>
                     {opcoes.mapaCalor.map((op) => (
                       <option key={op} value={op}>{op}</option>
                     ))}
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outros achados na papila</label>
                  <input
                    type="text"
                    value={getOlhoData().papila.outros}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        papila: {
                          ...getOlhoData().papila,
                          outros: e.target.value
                        }
                      }
                    })}
                    placeholder="Descreva outros achados..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>
              </div>
            </AccordionItem>
          )}

          <AccordionItem title="Recomendações" section="recomendacoes">
            <CheckboxGroup
              title="Recomendações Clínicas"
              options={opcoes.recomendacoes}
              selected={form.recomendacoes}
              onChange={(value) => handleCheck('recomendacoes', value)}
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