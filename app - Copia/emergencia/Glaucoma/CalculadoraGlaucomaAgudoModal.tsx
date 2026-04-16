'use client';

import React, { useState } from 'react';

interface CalculadoraGlaucomaAgudoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraGlaucomaAgudoModal({ isOpen, onClose }: CalculadoraGlaucomaAgudoModalProps) {
  const [dorOcular, setDorOcular] = useState(false);
  const [visaoHalos, setVisaoHalos] = useState(false);
  const [olhoVermelho, setOlhoVermelho] = useState(false);
  const [midriase, setMidriase] = useState(false);
  const [nauseas, setNauseas] = useState(false);
  const [camaraRasa, setCamaraRasa] = useState(false);
  const [pioAlta, setPioAlta] = useState(false);
  const [resultado, setResultado] = useState('');

  const calcular = () => {
    const score =
      (dorOcular ? 2 : 0) +
      (visaoHalos ? 2 : 0) +
      (olhoVermelho ? 1 : 0) +
      (midriase ? 2 : 0) +
      (nauseas ? 1 : 0) +
      (camaraRasa ? 1 : 0) +
      (pioAlta ? 2 : 0);

    let resultadoTexto = '';
    let condutaTexto = '';

    if (score >= 7) {
      resultadoTexto = 'Alta suspeita de Glaucoma Agudo de Ângulo Fechado. Inicie imediatamente o tratamento e encaminhe com urgência:';
      condutaTexto = `CONDUTA MEDICAMENTOSA IMEDIATA:
• Acetazolamida 500mg VO ou EV (exceto contraindicação renal)
• Manitol 20% 250 mL EV em 30 minutos, se PIO estimada > 50 mmHg
• Pilocarpina 2% colírio: 1 gota a cada 15 min por 1 hora
• Timolol 0,5% colírio: 1 gota agora
• Brimonidina 0,2% colírio: 1 gota agora

Encaminhar para iridotomia a laser após controle da pressão.`;
    } else if (score >= 4) {
      resultadoTexto = 'Suspeita moderada de Glaucoma Agudo de Ângulo Fechado';
      condutaTexto = `CONDUTA:
• Reavaliar sinais e sintomas
• Verificar PIO e sinais adicionais
• Iniciar tratamento se confirmado:
  - Acetazolamida 500mg VO
  - Timolol 0,5% 1 gota
  - Brimonidina 0,2% 1 gota
• Monitorar evolução
• Encaminhar para avaliação especializada em 24h`;
    } else {
      resultadoTexto = 'Baixa probabilidade de Glaucoma Agudo de Ângulo Fechado';
      condutaTexto = `CONDUTA:
• Considere outros diagnósticos diferenciais
• Avaliar outras causas de dor ocular
• Se sintomas persistirem, reavaliar em 24h
• Manter acompanhamento se necessário`;
    }

    setResultado(`${resultadoTexto}\n\n${condutaTexto}\n\nPontuação: ${score}/11 pontos`);
  };

  const zerarFormulario = () => {
    setDorOcular(false);
    setVisaoHalos(false);
    setOlhoVermelho(false);
    setMidriase(false);
    setNauseas(false);
    setCamaraRasa(false);
    setPioAlta(false);
    setResultado('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-black">Calculadora de Glaucoma Agudo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={dorOcular}
                onChange={(e) => setDorOcular(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Dor ocular intensa</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={visaoHalos}
                onChange={(e) => setVisaoHalos(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Halos ao redor da luz</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={olhoVermelho}
                onChange={(e) => setOlhoVermelho(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Olho vermelho unilateral</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={midriase}
                onChange={(e) => setMidriase(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Midríase fixa ou semi-reativa</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={nauseas}
                onChange={(e) => setNauseas(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Náuseas ou vômitos</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={camaraRasa}
                onChange={(e) => setCamaraRasa(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Câmara anterior rasa</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={pioAlta}
                onChange={(e) => setPioAlta(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">PIO elevada (&gt;40 mmHg)</span>
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <button
              onClick={calcular}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Calcular
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
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold text-black mb-2">Resultado:</h3>
              <p className="text-sm text-black">{resultado}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}