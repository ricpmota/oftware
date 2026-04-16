'use client';

import React, { useState } from 'react';

interface CalculadoraUveiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraUveiteModal({ isOpen, onClose }: CalculadoraUveiteModalProps) {
  const [fotofobia, setFotofobia] = useState(false);
  const [dor, setDor] = useState(false);
  const [hiperemia, setHiperemia] = useState(false);
  const [visaoBorrada, setVisaoBorrada] = useState(false);
  const [miose, setMiose] = useState(false);
  const [semSecrecao, setSemSecrecao] = useState(false);
  const [resultado, setResultado] = useState('');

  const calcular = () => {
    const score =
      (fotofobia ? 2 : 0) +
      (dor ? 1 : 0) +
      (hiperemia ? 1 : 0) +
      (visaoBorrada ? 1 : 0) +
      (miose ? 2 : 0) +
      (semSecrecao ? 1 : 0);

    let resultadoTexto = '';
    let prescricaoTexto = '';

    if (score >= 7) {
      resultadoTexto = 'Alta suspeita de Uveíte Anterior Aguda';
      prescricaoTexto = `PRESCRIÇÃO IMEDIATA:
• Prednisolona acetato 1% colírio – 1 gota de 4/4h
• Ciclopentolato 1% – 1 gota 8/8h (para dor e evitar sinequias)
• Lubrificante ocular – 1 gota de 6/6h
• Avaliar PIO antes e durante o uso prolongado de corticoides
• Não usar antibióticos tópicos de rotina
• Encaminhar para oftalmologista em 24-48h para investigação etiológica`;
    } else if (score >= 4) {
      resultadoTexto = 'Suspeita moderada de Uveíte Anterior Aguda';
      prescricaoTexto = `CONDUTA E PRESCRIÇÃO:
• Confirmar diagnóstico com lâmpada de fenda se disponível
• Investigar doenças autoimunes ou infecciosas associadas
• Iniciar corticoide tópico se não houver suspeita infecciosa:
  - Prednisolona acetato 1% colírio – 1 gota de 6/6h
• Evitar corticoide se houver úlcera ou ceratite ativa
• Lubrificante ocular – 1 gota de 6/6h
• Monitorar evolução e reavaliar em 24h
• Encaminhar para oftalmologista se sintomas persistirem`;
    } else {
      resultadoTexto = 'Baixa probabilidade de Uveíte Anterior Aguda';
      prescricaoTexto = `CONDUTA:
• Considere outros diagnósticos diferenciais:
  - Glaucoma agudo: dor intensa + midríase + PIO elevada
  - Ceratite infecciosa: defeito epitelial + dor + fotofobia
  - Conjuntivite: secreção, ausência de fotofobia ou miose
• Avaliar outras causas de dor ocular
• Se sintomas persistirem, reavaliar em 24h
• Manter acompanhamento se necessário
• Não iniciar corticoides sem confirmação diagnóstica`;
    }

    setResultado(`${resultadoTexto}\n\n${prescricaoTexto}\n\nPontuação: ${score}/8 pontos`);
  };

  const zerarFormulario = () => {
    setFotofobia(false);
    setDor(false);
    setHiperemia(false);
    setVisaoBorrada(false);
    setMiose(false);
    setSemSecrecao(false);
    setResultado('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-black">Calculadora de Uveíte Anterior Aguda</h2>
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
                checked={fotofobia}
                onChange={(e) => setFotofobia(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Fotofobia intensa</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={dor}
                onChange={(e) => setDor(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Dor ocular leve a moderada</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={hiperemia}
                onChange={(e) => setHiperemia(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Hiperemia pericorneana</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={visaoBorrada}
                onChange={(e) => setVisaoBorrada(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Visão borrada</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={miose}
                onChange={(e) => setMiose(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Miose (pupila pequena e reativa)</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={semSecrecao}
                onChange={(e) => setSemSecrecao(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Ausência de secreção</span>
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