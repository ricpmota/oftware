'use client';

import React, { useState } from 'react';

interface CalculadoraRDModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormularioRD {
  olho: 'OD' | 'OS';
  classificacao: 'RDNP Leve' | 'RDNP Moderada' | 'RDNP Grave' | 'RDP' | 'RDP Alto Risco';
  emdPresente: 'ausente' | 'presente sem centro' | 'presente com centro';
  achadoOCT: 'espessamento macular' | 'desorganização camadas' | 'líquido subfoveal' | 'membrana epirretiniana' | 'tração vítreo-macular' | 'normal' | 'não realizado';
  espessuraMacular: string;
  edemaSubfoveal: boolean;
  visaoInicial: string;
  tratamentoPrevio: 'nunca tratou' | 'tratou parcialmente' | 'tratamento completo' | 'refratário';
  medicacoesDisponiveis: string[];
  comorbidades: string[];
  gestante: boolean;
}

export default function CalculadoraRDModal({ isOpen, onClose }: CalculadoraRDModalProps) {
  const [form, setForm] = useState<FormularioRD>({
    olho: 'OD',
    classificacao: 'RDNP Leve',
    emdPresente: 'ausente',
    achadoOCT: 'não realizado',
    espessuraMacular: '',
    edemaSubfoveal: false,
    visaoInicial: '',
    tratamentoPrevio: 'nunca tratou',
    medicacoesDisponiveis: [],
    comorbidades: [],
    gestante: false
  });

  const [condutaGerada, setCondutaGerada] = useState<string>('');

  const handleCheck = (campo: keyof FormularioRD, valor: string) => {
    setForm(prev => {
      if (campo === 'comorbidades' || campo === 'medicacoesDisponiveis') {
        const currentArray = prev[campo] as string[];
        const jaExiste = currentArray.includes(valor);
        const novoArray = jaExiste 
          ? currentArray.filter(v => v !== valor) 
          : [...currentArray, valor];
        return { ...prev, [campo]: novoArray };
      }
      return { ...prev, [campo]: valor };
    });
  };

  const gerarCondutaRD = () => {
    const { classificacao, emdPresente, achadoOCT, comorbidades, gestante, olho, espessuraMacular, edemaSubfoveal, visaoInicial, tratamentoPrevio, medicacoesDisponiveis } = form;

    let conduta = `Laudo e Conduta - Retinopatia Diabética ${olho}\n\n`;
    
    // Classificação
    conduta += `Classificação: ${classificacao}`;
    if (emdPresente !== 'ausente') {
      conduta += ` com ${emdPresente === 'presente com centro' ? 'EMD com comprometimento central' : 'EMD periférico'}`;
    }
    conduta += '.\n\n';

    // Achados
    conduta += 'Achados:\n';
    if (espessuraMacular) {
      conduta += `- Espessura macular: ${espessuraMacular}μm.\n`;
    }
    if (edemaSubfoveal) {
      conduta += '- Edema subfoveal presente.\n';
    }
    if (visaoInicial) {
      conduta += `- AV inicial: ${visaoInicial}.\n`;
    }
    if (achadoOCT !== 'não realizado') {
      conduta += `- OCT: ${achadoOCT}.\n`;
    }
    if (comorbidades.length > 0) {
      conduta += `- Comorbidades: ${comorbidades.join(', ')}.\n`;
    }
    conduta += `- Tratamento prévio: ${tratamentoPrevio}.\n`;
    conduta += '\n';

    // Conduta baseada na classificação e EMD
    conduta += 'Conduta Sugerida:\n\n';
    
    // Lógica para EMD com comprometimento central
    if (emdPresente === 'presente com centro') {
      if (gestante) {
        conduta += '⚠️ GESTANTE - Anti-VEGF contraindicado:\n';
        conduta += '- Considerar observação se edema leve.\n';
        conduta += '- Fotocoagulação focal se necessário.\n';
        conduta += '- Acompanhamento mensal.\n\n';
      } else {
        conduta += 'EMD com Comprometimento Central:\n';
        if (tratamentoPrevio === 'nunca tratou') {
          conduta += '- Iniciar Anti-VEGF com 3 doses mensais seguidas.\n';
          if (medicacoesDisponiveis.includes('Aflibercepte (Eylea)')) {
            conduta += '- Preferência por Aflibercepte (Eylea).\n';
          } else if (medicacoesDisponiveis.length > 0) {
            conduta += `- Usar ${medicacoesDisponiveis[0]}.\n`;
          }
        } else if (tratamentoPrevio === 'tratou parcialmente') {
          conduta += '- Completar 3 doses de Anti-VEGF.\n';
          conduta += '- Reavaliar após completar o protocolo.\n';
        } else if (tratamentoPrevio === 'refratário') {
          conduta += '- Considerar troca de Anti-VEGF.\n';
          conduta += '- Avaliar uso de Dexametasona intravítrea.\n';
        }
        conduta += '- Avaliar resposta após 3 doses com OCT.\n';
        conduta += '- Nota: Se resposta subótima após 3 doses, considerar troca do Anti-VEGF.\n\n';
      }
    }

    // Lógica para RDP de alto risco
    if (classificacao === 'RDP Alto Risco') {
      conduta += 'RDP de Alto Risco:\n';
      conduta += '- Priorizar Panfotocoagulação Retiniana (PRP) imediata.\n';
      if (emdPresente !== 'ausente' && !gestante) {
        conduta += '- Anti-VEGF adjuvante pode ser usado pré-PRP ou como terapia de resgate.\n';
      }
      conduta += '- Se já realizou PRP e ainda há neovascularização, considerar Anti-VEGF sequencial.\n';
      conduta += '- Reavaliação a cada 15 dias.\n';
      conduta += '- Avaliar risco de hemorragia vítrea.\n\n';
    }

    // Lógica para RDNP Grave ou RDP sem EMD
    else if ((classificacao === 'RDNP Grave' || classificacao === 'RDP') && emdPresente === 'ausente') {
      conduta += `${classificacao} sem EMD:\n`;
      conduta += '- Indicação de PRP se neovascularização presente.\n';
      if (achadoOCT === 'espessamento macular' || achadoOCT === 'líquido subfoveal') {
        conduta += '- OCT mostra alterações subclínicas - considerar Anti-VEGF de resgate.\n';
      }
      conduta += '- Acompanhamento mensal.\n\n';
    }

    // Lógica para RDNP Leve/Moderada
    else if (classificacao === 'RDNP Leve' || classificacao === 'RDNP Moderada') {
      conduta += `${classificacao}:\n`;
      if (emdPresente === 'ausente') {
        conduta += `- Controle rigoroso glicêmico.\n`;
        conduta += `- Acompanhamento em ${classificacao === 'RDNP Leve' ? '12' : '6'} meses.\n`;
      } else if (emdPresente === 'presente sem centro') {
        conduta += '- Considerar fotocoagulação focal se OCT com espessamento perifoveal.\n';
        conduta += '- Seguimento em 3 meses.\n';
      }
      conduta += '\n';
    }

    // Ajustes por achado de OCT
    if ((achadoOCT === 'espessamento macular' || achadoOCT === 'líquido subfoveal') && !conduta.includes('Anti-VEGF')) {
      conduta += 'OCT com alterações sugere início de Anti-VEGF imediato.\n\n';
    }

    // Ajustes por comorbidades
    if (comorbidades.includes('DRC') || comorbidades.includes('HAS')) {
      conduta += 'Considerações Especiais:\n';
      conduta += '- Monitorar pressão arterial e função renal.\n';
      conduta += '- A resposta ao Anti-VEGF pode ser alterada.\n\n';
    }

    // Recomendações gerais
    conduta += 'Recomendações Gerais:\n';
    conduta += '- Controle rigoroso da glicemia.\n';
    conduta += '- Controle da pressão arterial.\n';
    conduta += '- Suspender tabagismo se aplicável.\n';
    conduta += '- Dieta adequada e exercícios físicos.\n';

    setCondutaGerada(conduta);
  };

  const copiarConduta = async () => {
    try {
      await navigator.clipboard.writeText(condutaGerada);
      alert('Conduta copiada para a área de transferência!');
    } catch (err) {
      console.error('Falha ao copiar a conduta: ', err);
      alert('Erro ao copiar a conduta.');
    }
  };

  const zerarFormulario = () => {
    setForm({
      olho: 'OD',
      classificacao: 'RDNP Leve',
      emdPresente: 'ausente',
      achadoOCT: 'não realizado',
      espessuraMacular: '',
      edemaSubfoveal: false,
      visaoInicial: '',
      tratamentoPrevio: 'nunca tratou',
      medicacoesDisponiveis: [],
      comorbidades: [],
      gestante: false
    });
    setCondutaGerada('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Calculadora de Tratamento - Retinopatia Diabética</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="space-y-6">
              {/* Olho */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Olho</h3>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="olho"
                      value="OD"
                      checked={form.olho === 'OD'}
                      onChange={(e) => setForm({ ...form, olho: e.target.value as 'OD' | 'OS' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-blue-700">Olho Direito (OD)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="olho"
                      value="OS"
                      checked={form.olho === 'OS'}
                      onChange={(e) => setForm({ ...form, olho: e.target.value as 'OD' | 'OS' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-blue-700">Olho Esquerdo (OS)</span>
                  </label>
                </div>
              </div>

              {/* Classificação da RD */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-3">Classificação da RD</h3>
                <div className="space-y-2">
                  {['RDNP Leve', 'RDNP Moderada', 'RDNP Grave', 'RDP', 'RDP Alto Risco'].map((opcao) => (
                    <label key={opcao} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="classificacao"
                        value={opcao}
                        checked={form.classificacao === opcao}
                        onChange={(e) => setForm({ ...form, classificacao: e.target.value as FormularioRD['classificacao'] })}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-green-700">{opcao}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* EMD */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3">EMD Presente?</h3>
                <div className="space-y-2">
                  {[
                    { value: 'ausente', label: 'Não' },
                    { value: 'presente sem centro', label: 'EMD periférico' },
                    { value: 'presente com centro', label: 'EMD com comprometimento central' }
                  ].map((opcao) => (
                    <label key={opcao.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="emdPresente"
                        value={opcao.value}
                        checked={form.emdPresente === opcao.value}
                        onChange={(e) => setForm({ ...form, emdPresente: e.target.value as FormularioRD['emdPresente'] })}
                        className="text-yellow-600 focus:ring-yellow-500"
                      />
                      <span className="text-yellow-700">{opcao.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* OCT */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-800 mb-3">Alterações na OCT</h3>
                <div className="space-y-2">
                  {[
                    { value: 'espessamento macular', label: 'Espessamento macular' },
                    { value: 'desorganização camadas', label: 'Desorganização de camadas internas' },
                    { value: 'líquido subfoveal', label: 'Líquido subfoveal' },
                    { value: 'membrana epirretiniana', label: 'Membrana epirretiniana' },
                    { value: 'tração vítreo-macular', label: 'Tração vítreo-macular' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'não realizado', label: 'Não realizado' }
                  ].map((opcao) => (
                    <label key={opcao.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="achadoOCT"
                        value={opcao.value}
                        checked={form.achadoOCT === opcao.value}
                        onChange={(e) => setForm({ ...form, achadoOCT: e.target.value as FormularioRD['achadoOCT'] })}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-purple-700">{opcao.label}</span>
                    </label>
                  ))}
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Espessura Macular (μm)
                  </label>
                  <input
                    type="text"
                    value={form.espessuraMacular}
                    onChange={(e) => setForm({ ...form, espessuraMacular: e.target.value })}
                    className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                    placeholder="Ex: 320"
                  />
                </div>
              </div>

              {/* Tratamento Prévio */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-teal-800 mb-3">Histórico de Tratamento Prévio</h3>
                <div className="space-y-2">
                  {[
                    { value: 'nunca tratou', label: 'Nunca tratou' },
                    { value: 'tratou parcialmente', label: 'Tratou parcialmente (<3 doses)' },
                    { value: 'tratamento completo', label: 'Tratamento completo anterior (3+ injeções)' },
                    { value: 'refratário', label: 'Refratário (sem resposta após múltiplas injeções)' }
                  ].map((opcao) => (
                    <label key={opcao.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tratamentoPrevio"
                        value={opcao.value}
                        checked={form.tratamentoPrevio === opcao.value}
                        onChange={(e) => setForm({ ...form, tratamentoPrevio: e.target.value as FormularioRD['tratamentoPrevio'] })}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-teal-700">{opcao.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Medicações Disponíveis */}
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-pink-800 mb-3">Medicações Disponíveis</h3>
                <div className="space-y-2">
                  {['Aflibercepte (Eylea)', 'Ranibizumabe (Lucentis)', 'Bevacizumabe (Avastin)'].map((medicacao) => (
                    <label key={medicacao} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.medicacoesDisponiveis.includes(medicacao)}
                        onChange={() => handleCheck('medicacoesDisponiveis', medicacao)}
                        className="text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-pink-700">{medicacao}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Visão Inicial */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-indigo-800 mb-3">Visão Inicial (AV)</h3>
                <input
                  type="text"
                  value={form.visaoInicial}
                  onChange={(e) => setForm({ ...form, visaoInicial: e.target.value })}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  placeholder="Ex: 20/80"
                />
              </div>



              {/* Doenças Associadas */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-800 mb-3">Doenças Associadas</h3>
                <div className="space-y-2">
                  {['Hipertensão arterial', 'DRC (Doença Renal Crônica)', 'Cirurgia de catarata recente'].map((doenca) => (
                    <label key={doenca} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.comorbidades.includes(doenca)}
                        onChange={() => handleCheck('comorbidades', doenca)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-orange-700">{doenca}</span>
                    </label>
                  ))}
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gestante}
                      onChange={(e) => setForm({ ...form, gestante: e.target.checked })}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-orange-700">Gestante</span>
                  </label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex space-x-4">
                <button
                  onClick={gerarCondutaRD}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 font-semibold"
                >
                  Gerar Conduta Personalizada
                </button>
                <button
                  onClick={zerarFormulario}
                  className="bg-gray-500 text-white px-6 py-3 rounded-md hover:bg-gray-600 transition-colors duration-200 font-semibold"
                >
                  Zerar
                </button>
              </div>
            </div>

            {/* Resultado */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Conduta Gerada</h3>
                  {condutaGerada && (
                    <button
                      onClick={copiarConduta}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors duration-200 text-sm"
                    >
                      Copiar
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 min-h-[400px] whitespace-pre-wrap text-gray-800 text-sm">
                  {condutaGerada || 'Preencha o formulário e clique em "Gerar Conduta Personalizada" para ver a conduta.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 