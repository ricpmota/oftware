'use client';

import React, { useState } from 'react';

interface CalculadoraETOModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormularioETO {
  olho: 'OD' | 'OS';
  acuidadeVisual: '20/20' | '20/40' | '20/200' | '5/200' | '1/200' | 'NPL';
  rupturaGlobo: 'ausente' | 'presente';
  perfuracaoGlobo: 'ausente' | 'presente';
  feridaPenetrante: 'ausente' | 'presente';
  corpoEstranhoIntraocular: 'ausente' | 'presente';
  catarataTraumatica: 'ausente' | 'presente';
  descolamentoRetina: 'ausente' | 'presente';
  hemorragiaVitrea: 'ausente' | 'presente';
  afacia: 'ausente' | 'presente';
  hipotonia: 'ausente' | 'presente';
  endoftalmite: 'ausente' | 'presente';
}

export default function CalculadoraETOModal({ isOpen, onClose }: CalculadoraETOModalProps) {
  const [form, setForm] = useState<FormularioETO>({
    olho: 'OD',
    acuidadeVisual: '20/20',
    rupturaGlobo: 'ausente',
    perfuracaoGlobo: 'ausente',
    feridaPenetrante: 'ausente',
    corpoEstranhoIntraocular: 'ausente',
    catarataTraumatica: 'ausente',
    descolamentoRetina: 'ausente',
    hemorragiaVitrea: 'ausente',
    afacia: 'ausente',
    hipotonia: 'ausente',
    endoftalmite: 'ausente'
  });

  const [resultado, setResultado] = useState<{
    escore: number;
    classificacao: string;
    prognostico: string;
    conduta: string;
  } | null>(null);

  const handleChange = (campo: keyof FormularioETO, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
  };

  const calcularETO = () => {
    let escore = 0;

    // Acuidade Visual
    switch (form.acuidadeVisual) {
      case '20/20': escore += 0; break;
      case '20/40': escore += 1; break;
      case '20/200': escore += 2; break;
      case '5/200': escore += 3; break;
      case '1/200': escore += 4; break;
      case 'NPL': escore += 5; break;
    }

    // Ruptura do Globo
    if (form.rupturaGlobo === 'presente') escore += 2;

    // Perfuração do Globo
    if (form.perfuracaoGlobo === 'presente') escore += 2;

    // Ferida Penetrante
    if (form.feridaPenetrante === 'presente') escore += 2;

    // Corpo Estranho Intraocular
    if (form.corpoEstranhoIntraocular === 'presente') escore += 2;

    // Catarata Traumática
    if (form.catarataTraumatica === 'presente') escore += 1;

    // Descolamento de Retina
    if (form.descolamentoRetina === 'presente') escore += 1;

    // Hemorragia Vítrea
    if (form.hemorragiaVitrea === 'presente') escore += 1;

    // Afacia
    if (form.afacia === 'presente') escore += 1;

    // Hipotonia
    if (form.hipotonia === 'presente') escore += 1;

    // Endoftalmite
    if (form.endoftalmite === 'presente') escore += 1;

    // Classificação e Prognóstico
    let classificacao = '';
    let prognostico = '';
    let conduta = '';

    if (escore <= 2) {
      classificacao = 'Trauma Leve';
      prognostico = 'Bom prognóstico visual';
      conduta = `CONDUTA - Trauma Leve ${form.olho}:\n\n` +
        '• Observação clínica\n' +
        '• Antibiótico tópico profilático\n' +
        '• Retorno em 1 semana\n' +
        '• Monitorar sinais de infecção\n' +
        '• Considerar OCT se necessário';
    } else if (escore <= 5) {
      classificacao = 'Trauma Moderado';
      prognostico = 'Prognóstico visual reservado';
      conduta = `CONDUTA - Trauma Moderado ${form.olho}:\n\n` +
        '• Avaliação oftalmológica urgente\n' +
        '• Antibiótico tópico e sistêmico\n' +
        '• Corticosteroide tópico se indicado\n' +
        '• Retorno em 48-72h\n' +
        '• Considerar cirurgia se necessário\n' +
        '• Monitorar PIO e sinais de infecção';
    } else if (escore <= 8) {
      classificacao = 'Trauma Grave';
      prognostico = 'Prognóstico visual ruim';
      conduta = `CONDUTA - Trauma Grave ${form.olho}:\n\n` +
        '• INTERNAÇÃO IMEDIATA\n' +
        '• Cirurgia de urgência\n' +
        '• Antibiótico sistêmico EV\n' +
        '• Corticosteroide sistêmico\n' +
        '• Monitoramento intensivo\n' +
        '• Considerar enucleação se necessário';
    } else {
      classificacao = 'Trauma Muito Grave';
      prognostico = 'Prognóstico visual muito ruim';
      conduta = `CONDUTA - Trauma Muito Grave ${form.olho}:\n\n` +
        '• INTERNAÇÃO URGENTE\n' +
        '• Cirurgia imediata\n' +
        '• Antibiótico sistêmico EV\n' +
        '• Corticosteroide sistêmico\n' +
        '• Monitoramento intensivo\n' +
        '• Alta probabilidade de enucleação\n' +
        '• Considerar prótese ocular';
    }

    setResultado({
      escore,
      classificacao,
      prognostico,
      conduta
    });
  };

  const zerarFormulario = () => {
    setForm({
      olho: 'OD',
      acuidadeVisual: '20/20',
      rupturaGlobo: 'ausente',
      perfuracaoGlobo: 'ausente',
      feridaPenetrante: 'ausente',
      corpoEstranhoIntraocular: 'ausente',
      catarataTraumatica: 'ausente',
      descolamentoRetina: 'ausente',
      hemorragiaVitrea: 'ausente',
      afacia: 'ausente',
      hipotonia: 'ausente',
      endoftalmite: 'ausente'
    });
    setResultado(null);
  };

  const copiarResultado = async () => {
    if (!resultado) return;
    
    const texto = `ESCORE DE TRAUMA OCULAR (ETO) - ${form.olho}\n\n` +
      `Escore Total: ${resultado.escore}\n` +
      `Classificação: ${resultado.classificacao}\n` +
      `Prognóstico: ${resultado.prognostico}\n\n` +
      resultado.conduta;

    try {
      await navigator.clipboard.writeText(texto);
      alert('Resultado copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-black">Calculadora ETO - Escore de Trauma Ocular</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Formulário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Olho */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Olho
              </label>
              <select
                value={form.olho}
                onChange={(e) => handleChange('olho', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="OD">Olho Direito (OD)</option>
                <option value="OS">Olho Esquerdo (OS)</option>
              </select>
            </div>

            {/* Acuidade Visual */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Acuidade Visual (2 pontos)
              </label>
              <select
                value={form.acuidadeVisual}
                onChange={(e) => handleChange('acuidadeVisual', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="20/20">20/20 (0 pontos)</option>
                <option value="20/40">20/40 (1 ponto)</option>
                <option value="20/200">20/200 (2 pontos)</option>
                <option value="5/200">5/200 (3 pontos)</option>
                <option value="1/200">1/200 (4 pontos)</option>
                <option value="NPL">NPL (5 pontos)</option>
              </select>
            </div>

            {/* Ruptura do Globo */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Ruptura do Globo (2 pontos)
              </label>
              <select
                value={form.rupturaGlobo}
                onChange={(e) => handleChange('rupturaGlobo', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (2 pontos)</option>
              </select>
            </div>

            {/* Perfuração do Globo */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Perfuração do Globo (2 pontos)
              </label>
              <select
                value={form.perfuracaoGlobo}
                onChange={(e) => handleChange('perfuracaoGlobo', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (2 pontos)</option>
              </select>
            </div>

            {/* Ferida Penetrante */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Ferida Penetrante (2 pontos)
              </label>
              <select
                value={form.feridaPenetrante}
                onChange={(e) => handleChange('feridaPenetrante', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (2 pontos)</option>
              </select>
            </div>

            {/* Corpo Estranho Intraocular */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Corpo Estranho Intraocular (2 pontos)
              </label>
              <select
                value={form.corpoEstranhoIntraocular}
                onChange={(e) => handleChange('corpoEstranhoIntraocular', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (2 pontos)</option>
              </select>
            </div>

            {/* Catarata Traumática */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Catarata Traumática (1 ponto)
              </label>
              <select
                value={form.catarataTraumatica}
                onChange={(e) => handleChange('catarataTraumatica', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (1 ponto)</option>
              </select>
            </div>

            {/* Descolamento de Retina */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Descolamento de Retina (1 ponto)
              </label>
              <select
                value={form.descolamentoRetina}
                onChange={(e) => handleChange('descolamentoRetina', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (1 ponto)</option>
              </select>
            </div>

            {/* Hemorragia Vítrea */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Hemorragia Vítrea (1 ponto)
              </label>
              <select
                value={form.hemorragiaVitrea}
                onChange={(e) => handleChange('hemorragiaVitrea', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (1 ponto)</option>
              </select>
            </div>

            {/* Afacia */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Afacia (1 ponto)
              </label>
              <select
                value={form.afacia}
                onChange={(e) => handleChange('afacia', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (1 ponto)</option>
              </select>
            </div>

            {/* Hipotonia */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Hipotonia (1 ponto)
              </label>
              <select
                value={form.hipotonia}
                onChange={(e) => handleChange('hipotonia', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (1 ponto)</option>
              </select>
            </div>

            {/* Endoftalmite */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Endoftalmite (1 ponto)
              </label>
              <select
                value={form.endoftalmite}
                onChange={(e) => handleChange('endoftalmite', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ausente">Ausente (0 pontos)</option>
                <option value="presente">Presente (1 ponto)</option>
              </select>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={calcularETO}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Calcular ETO
            </button>
            <button
              onClick={zerarFormulario}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-black"
            >
              Zerar
            </button>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-semibold text-black mb-4">Resultado do ETO</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600">{resultado.escore}</div>
                  <div className="text-sm text-black">Escore Total</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-lg font-semibold text-black">{resultado.classificacao}</div>
                  <div className="text-sm text-black">Classificação</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm font-medium text-black">{resultado.prognostico}</div>
                  <div className="text-sm text-black">Prognóstico</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-black mb-2">Conduta Recomendada:</h4>
                <pre className="whitespace-pre-wrap text-sm text-black font-mono bg-gray-50 p-3 rounded">
                  {resultado.conduta}
                </pre>
              </div>

              <button
                onClick={copiarResultado}
                className="mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Copiar Resultado
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 