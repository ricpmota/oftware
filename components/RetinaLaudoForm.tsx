'use client';

import React, { useState } from 'react';
import RetinopatiaDiabeticaModal from './RetinopatiaDiabeticaModal';
import AchadosAdicionaisModal from './AchadosAdicionaisModal';
import PatologiasBinocularesModal from './PatologiasBinocularesModal';
import CalculadoraRDModal from './CalculadoraRDModal';

interface DiscoOptico {
  cor: string;
  contornos: string;
  escavacao: string;
  tipoEscavacao: string;
  tamanhoEscavacao: string;
  atrofia: boolean;
  palidez: string;
  inclinacao: boolean;
  crescente: boolean;
}

interface OlhoData {
  meiosOpticos: string;
  disco: DiscoOptico;
  macula: string[];
  vasos: string[];
  poloPosterior: string[];
  periferia: string[];
  retinopatiaDiabetica: string;
  edemaMacular: boolean;
  adicionais: string[];
}

interface FormData {
  tipoExame: string;
  olhoDireito: OlhoData;
  olhoEsquerdo: OlhoData;
  patologiasBinoculares: string[];
  recomendacoes: string[];
}

export default function RetinaLaudoForm() {
  const [form, setForm] = useState<FormData>({
    tipoExame: '',
    olhoDireito: {
      meiosOpticos: '',
      disco: {
        cor: '',
        contornos: '',
        escavacao: '',
        tipoEscavacao: '',
        tamanhoEscavacao: '',
        atrofia: false,
        palidez: '',
        inclinacao: false,
        crescente: false
      },
      macula: [],
      vasos: [],
      poloPosterior: [],
      periferia: [],
      retinopatiaDiabetica: '',
      edemaMacular: false,
      adicionais: []
    },
    olhoEsquerdo: {
      meiosOpticos: '',
      disco: {
        cor: '',
        contornos: '',
        escavacao: '',
        tipoEscavacao: '',
        tamanhoEscavacao: '',
        atrofia: false,
        palidez: '',
        inclinacao: false,
        crescente: false
      },
      macula: [],
      vasos: [],
      poloPosterior: [],
      periferia: [],
      retinopatiaDiabetica: '',
      edemaMacular: false,
      adicionais: []
    },
    patologiasBinoculares: [],
    recomendacoes: []
  });

  const [activeAccordion, setActiveAccordion] = useState<string>('tipoExame');
  const [olhoAtivo, setOlhoAtivo] = useState<'OD' | 'OE'>('OD');
  const [laudoGerado, setLaudoGerado] = useState<string>('');
  const [modalRetinopatia, setModalRetinopatia] = useState(false);
  const [modalAchados, setModalAchados] = useState(false);
  const [modalPatologias, setModalPatologias] = useState(false);
  const [modalCalculadoraRD, setModalCalculadoraRD] = useState(false);

  const opcoes = {
    tipoExame: [
      'Mapeamento de Retina',
      'RSH (Retinografia Simples Horizontal)',
      'MRM (Mapeamento de Retina Monocular)',
      'Retinografia Colorida',
      'Retinografia com Filtro Verde',
      'Retinografia com Filtro Vermelho',
      'Retinografia com Filtro Azul'
    ],
    meiosOpticos: [
      'Transparentes',
      'Opacidades leves',
      'Opacidades moderadas',
      'Opacidades densas',
      'Hemorragia vítrea leve',
      'Hemorragia vítrea moderada',
      'Hemorragia vítrea densa',
      'Catarata incipiente',
      'Catarata moderada',
      'Catarata densa'
    ],
    discoCor: [
      'Rósea',
      'Pálida',
      'Pálida temporal',
      'Pálida difusa',
      'Pálida nasal',
      'Hiperêmica',
      'Cianótica'
    ],
    discoContornos: [
      'Bem definidos',
      'Borrados',
      'Borrados temporalmente',
      'Borrados nasalmente',
      'Borrados superiormente',
      'Borrados inferiormente',
      'Irregulares'
    ],
    discoEscavacao: [
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
    discoPalidez: [
      'Ausente',
      'Temporal',
      'Nasal',
      'Superior',
      'Inferior',
      'Difusa',
      'Setorial'
    ],
    macula: [
      'Reflexo foveal preservado',
      'Drusas',
      'Atrofia do EPR',
      'Descolamento de retina seroso',
      'Hemorragia sub-retiniana',
      'Edema macular',
      'Membrana epirretiniana',
      'Buraco macular'
    ],
    vasos: [
      'Vasos normais',
      'Tortuosos',
      'Ateroescleróticos',
      'Finas',
      'Vasculite',
      'Telangiectasias',
      'Sheathing'
    ],
    poloPosterior: [
      'Normal',
      'Exsudatos duros',
      'Hemorragias intrarretinianas',
      'Microaneurismas'
    ],
    periferia: [
      'Sem alterações periféricas',
      'Degeneração lattice',
      'Buracos atróficos',
      'Ruptura de retina',
      'Descolamento de retina',
      'Hialóide tracionando periferia',
      'Retinosquise'
    ],
    retinopatiaDiabetica: [
      'Sem sinais de RD',
      'RDNP leve',
      'RDNP moderada',
      'RDNP severa',
      'RD proliferativa'
    ],
    adicionais: [
      'Nevo de coroide',
      'Lesão hiperpigmentada de aspecto benigno',
      'Atrofia corioretiniana periférica',
      'Asteroidose vítrea',
      'Drusas de disco óptico',
      'Papiledema',
      'Atrofia óptica',
      'Coloboma de disco óptico',
      'Mielinização de fibras nervosas',
      'Coloboma',
      'Ruptura da membrana de Bruch',
      'Angioid streaks',
      'Retinopatia hipertensiva',
      'Retinopatia da prematuridade',
      'Retinose pigmentar',
      'Coriorretinopatia serosa central',
      'Uveíte',
      'Tumores'
    ],
    patologiasBinoculares: [
      'Retinopatia diabética bilateral',
      'Retinopatia hipertensiva bilateral',
      'Degeneração macular relacionada à idade bilateral',
      'Retinose pigmentar',
      'Doença de Stargardt',
      'Doença de Best',
      'Retinopatia da prematuridade bilateral',
      'Uveíte posterior bilateral',
      'Coroideremia',
      'Amaurose congênita de Leber',
      'Síndrome de Usher',
      'Síndrome de Bardet-Biedl',
      'Síndrome de Alport',
      'Síndrome de Stickler'
    ],
    recomendacoes: [
      'Manter acompanhamento anual',
                      'Solicitar <span className="medical-term notranslate" translate="no" lang="en">OCT</span> macular',
      'Encaminhar para especialista de retina',
      'Iniciar fotocoagulação a laser',
      'Solicitar angiofluoresceinografia',
      'Solicitar campo visual',
      'Solicitar ERG',
      'Solicitar genética',
      'Encaminhar para baixa visão',
      'Iniciar tratamento com anti-VEGF',
      'Solicitar ultrassom ocular'
    ],
    tipoEscavacao: ['Fisiológica', 'Aumentada'],
    tamanhoEscavacao: ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9']
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
      const laudoMacula = dados.macula.length ? `Mácula com ${dados.macula.join(', ')}.` : '';
      
      // Lógica melhorada para vasos
      let laudoVasos = '';
      if (dados.vasos.length > 0) {
        if (dados.vasos.includes('Vasos normais')) {
          laudoVasos = 'Vasos retinianos de trajeto e calibre preservados.';
        } else {
          laudoVasos = `Vasos com alterações: ${dados.vasos.filter(v => v !== 'Vasos normais').join(', ')}.`;
        }
      }
      
      // Lógica melhorada para polo posterior
      let laudoPolo = '';
      if (dados.poloPosterior.length > 0) {
        if (dados.poloPosterior.includes('Normal')) {
          laudoPolo = 'Polo posterior sem alterações.';
        } else {
          laudoPolo = `Polo posterior apresenta: ${dados.poloPosterior.filter(p => p !== 'Normal').join(', ')}.`;
        }
      }
      
      // Lógica melhorada para periferia
      let laudoPeriferia = '';
      if (dados.periferia.length > 0) {
        if (dados.periferia.includes('Sem alterações periféricas')) {
          laudoPeriferia = 'Periferia sem sinais de degenerações, roturas ou desinserções.';
        } else {
          laudoPeriferia = `Periferia com: ${dados.periferia.filter(p => p !== 'Sem alterações periféricas').join(', ')}.`;
        }
      }

      let laudoRD = '';
      switch (dados.retinopatiaDiabetica) {
        case 'RDNP leve':
          laudoRD = 'Presença de RD não proliferativa leve, com poucos microaneurismas e exsudatos.';
          break;
        case 'RDNP moderada':
          laudoRD = 'RD não proliferativa moderada, com microaneurismas, hemorragias e exsudatos moderados.';
          break;
        case 'RDNP severa':
          laudoRD = 'RD não proliferativa severa, com mais de 20 hemorragias em 4 quadrantes e sinais de isquemia.';
          break;
        case 'RD proliferativa':
          laudoRD = 'RD proliferativa, com neovasos e possível hemorragia vítrea.';
          break;
        case 'Sem sinais de RD':
          laudoRD = 'Sem sinais de retinopatia diabética.';
          break;
      }

      if (dados.edemaMacular) {
        laudoRD += ' Edema macular diabético presente.';
      }

      const laudoOutros = dados.adicionais.length ? `Outros achados: ${dados.adicionais.join(', ')}.` : '';

      return `${olho}:
Meios ópticos ${dados.meiosOpticos.toLowerCase()}.

Disco óptico ${dados.disco.cor.toLowerCase()}, de contornos ${dados.disco.contornos.toLowerCase()}, com escavação ${dados.disco.tipoEscavacao.toLowerCase()} de tamanho ${dados.disco.tamanhoEscavacao}, relação escavação/disco ${dados.disco.escavacao.toLowerCase()}.
${dados.disco.atrofia ? 'Atrofia peripapilar presente. ' : ''}${dados.disco.crescente ? 'Crescente escleral presente. ' : ''}${dados.disco.palidez ? `Palidez ${dados.disco.palidez.toLowerCase()}. ` : ''}${dados.disco.inclinacao ? 'Disco óptico inclinado. ' : ''}

${laudoMacula}
${laudoVasos}
${laudoPolo}
${laudoPeriferia}
${laudoRD}
${laudoOutros}`;
    };

    const laudoOD = gerarLaudoOlho('OD', form.olhoDireito);
    const laudoOE = gerarLaudoOlho('OE', form.olhoEsquerdo);
    const laudoBinocular = form.patologiasBinoculares.length ? `\nPatologias Binoculares: ${form.patologiasBinoculares.join(', ')}.` : '';
    const laudoRecomendacoes = form.recomendacoes.length ? `\nRecomendações: ${form.recomendacoes.join(', ')}.` : '';

    const laudo = `Laudo de ${form.tipoExame}:

${laudoOD}

${laudoOE}${laudoBinocular}${laudoRecomendacoes}`;

    setLaudoGerado(laudo);
    return laudo;
  };

  const zerarFormulario = () => {
    setForm({
      tipoExame: '',
      olhoDireito: {
        meiosOpticos: '',
        disco: {
          cor: '',
          contornos: '',
          escavacao: '',
          tipoEscavacao: '',
          tamanhoEscavacao: '',
          atrofia: false,
          palidez: '',
          inclinacao: false,
          crescente: false
        },
        macula: [],
        vasos: [],
        poloPosterior: [],
        periferia: [],
        retinopatiaDiabetica: '',
        edemaMacular: false,
        adicionais: []
      },
      olhoEsquerdo: {
        meiosOpticos: '',
        disco: {
          cor: '',
          contornos: '',
          escavacao: '',
          tipoEscavacao: '',
          tamanhoEscavacao: '',
          atrofia: false,
          palidez: '',
          inclinacao: false,
          crescente: false
        },
        macula: [],
        vasos: [],
        poloPosterior: [],
        periferia: [],
        retinopatiaDiabetica: '',
        edemaMacular: false,
        adicionais: []
      },
      patologiasBinoculares: [],
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
          <h1 className="text-3xl font-bold text-gray-800">Laudo de Mapeamento de Retina</h1>
        </div>
        <p className="text-lg text-gray-600">Formulário interativo para geração de laudos oftalmológicos</p>
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
                  Tipo de Exame
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

          <AccordionItem title={`Meios Ópticos (${olhoAtivo})`} section="meiosOpticos">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado dos Meios Ópticos
              </label>
              <select
                value={getOlhoData().meiosOpticos}
                onChange={(e) => setForm({
                  ...form,
                  [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                    ...getOlhoData(),
                    meiosOpticos: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="">Selecione o estado dos meios ópticos</option>
                {opcoes.meiosOpticos.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
          </AccordionItem>

          <AccordionItem title={`Disco Óptico (${olhoAtivo})`} section="disco">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
                  <select
                    value={getOlhoData().disco.cor}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          cor: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione a cor</option>
                    {opcoes.discoCor.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contornos</label>
                  <select
                    value={getOlhoData().disco.contornos}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          contornos: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione os contornos</option>
                    {opcoes.discoContornos.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Escavação</label>
                  <select
                    value={getOlhoData().disco.tipoEscavacao}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          tipoEscavacao: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione</option>
                    {opcoes.tipoEscavacao.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tamanho da Escavação</label>
                  <select
                    value={getOlhoData().disco.tamanhoEscavacao}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          tamanhoEscavacao: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione</option>
                    {opcoes.tamanhoEscavacao.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relação E/D</label>
                  <select
                    value={getOlhoData().disco.escavacao}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          escavacao: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione a relação E/D</option>
                    {opcoes.discoEscavacao.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Palidez</label>
                  <select
                    value={getOlhoData().disco.palidez}
                    onChange={(e) => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          palidez: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Selecione a palidez</option>
                    {opcoes.discoPalidez.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getOlhoData().disco.atrofia}
                    onChange={() => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          atrofia: !getOlhoData().disco.atrofia
                        }
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Atrofia peripapilar</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getOlhoData().disco.inclinacao}
                    onChange={() => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          inclinacao: !getOlhoData().disco.inclinacao
                        }
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Inclinação do disco</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getOlhoData().disco.crescente}
                    onChange={() => setForm({
                      ...form,
                      [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                        ...getOlhoData(),
                        disco: {
                          ...getOlhoData().disco,
                          crescente: !getOlhoData().disco.crescente
                        }
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Crescente escleral</span>
                </label>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem title={`Mácula (${olhoAtivo})`} section="macula">
            <CheckboxGroup
              title="Achados Maculares"
              options={opcoes.macula}
              selected={getOlhoData().macula}
              onChange={(value) => handleCheck('macula', value, olhoAtivo)}
            />
          </AccordionItem>

          <AccordionItem title={`Vasos (${olhoAtivo})`} section="vasos">
            <CheckboxGroup
              title="Alterações Vasculares"
              options={opcoes.vasos}
              selected={getOlhoData().vasos}
              onChange={(value) => handleCheck('vasos', value, olhoAtivo)}
            />
          </AccordionItem>

          <AccordionItem title={`Polo Posterior (${olhoAtivo})`} section="poloPosterior">
            <CheckboxGroup
              title="Achados do Polo Posterior"
              options={opcoes.poloPosterior}
              selected={getOlhoData().poloPosterior}
              onChange={(value) => handleCheck('poloPosterior', value, olhoAtivo)}
            />
          </AccordionItem>

          <AccordionItem title={`Periferia da Retina (${olhoAtivo})`} section="periferia">
            <CheckboxGroup
              title="Achados Periféricos"
              options={opcoes.periferia}
              selected={getOlhoData().periferia}
              onChange={(value) => handleCheck('periferia', value, olhoAtivo)}
            />
          </AccordionItem>

          <AccordionItem title={`Retinopatia Diabética (${olhoAtivo})`} section="retinopatiaDiabetica">
            <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Classificação da Retinopatia Diabética
                </label>
                <button
                  onClick={() => setModalRetinopatia(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver Classificações
                </button>
              </div>
              <div>
                <select
                  value={getOlhoData().retinopatiaDiabetica}
                  onChange={(e) => setForm({
                    ...form,
                    [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                      ...getOlhoData(),
                      retinopatiaDiabetica: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">Selecione</option>
                  {opcoes.retinopatiaDiabetica.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={getOlhoData().edemaMacular}
                  onChange={() => setForm({
                    ...form,
                    [olhoAtivo === 'OD' ? 'olhoDireito' : 'olhoEsquerdo']: {
                      ...getOlhoData(),
                      edemaMacular: !getOlhoData().edemaMacular
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Edema macular diabético</span>
              </label>
            </div>
          </AccordionItem>

          <AccordionItem title={`Achados Adicionais (${olhoAtivo})`} section="adicionais">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-700">Outros Achados</h4>
                <button
                  onClick={() => setModalAchados(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver Explicações
                </button>
              </div>
              <CheckboxGroup
                title=""
                options={opcoes.adicionais}
                selected={getOlhoData().adicionais}
                onChange={(value) => handleCheck('adicionais', value, olhoAtivo)}
              />
            </div>
          </AccordionItem>

          <AccordionItem title="Patologias Binoculares" section="patologiasBinoculares">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-700">Patologias que Acometem Ambos os Olhos</h4>
                <button
                  onClick={() => setModalPatologias(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver Explicações
                </button>
              </div>
              <CheckboxGroup
                title=""
                options={opcoes.patologiasBinoculares}
                selected={form.patologiasBinoculares}
                onChange={(value) => handleCheck('patologiasBinoculares', value)}
              />
            </div>
          </AccordionItem>

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
                <div className="space-y-2">
                  <button
                    onClick={copiarLaudo}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors duration-200"
                  >
                    Copiar Laudo
                  </button>
                  <button
                    onClick={() => setModalCalculadoraRD(true)}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors duration-200"
                  >
                    Calculadora de Tratamento RD
                  </button>
                </div>
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

      {/* Modais */}
      <RetinopatiaDiabeticaModal 
        isOpen={modalRetinopatia} 
        onClose={() => setModalRetinopatia(false)} 
      />
      
      <AchadosAdicionaisModal 
        isOpen={modalAchados} 
        onClose={() => setModalAchados(false)} 
      />
      
      <PatologiasBinocularesModal 
        isOpen={modalPatologias} 
        onClose={() => setModalPatologias(false)} 
      />
      
      <CalculadoraRDModal 
        isOpen={modalCalculadoraRD} 
        onClose={() => setModalCalculadoraRD(false)} 
      />
    </div>
  );
} 