'use client';

import React, { useState } from 'react';

interface CalculadoraCEIOModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraCEIOModal({ isOpen, onClose }: CalculadoraCEIOModalProps) {
  const [resposta, setResposta] = useState<string | null>(null);
  const [pontuacao, setPontuacao] = useState(0);

  const perguntas = [
    "História de trauma com alta velocidade (esmerilhadeira, explosão)?",
    "Dor ocular intensa e persistente?",
    "Redução importante da acuidade visual?",
    "Ausência de corpo estranho visível externamente?",
    "Presença de defeito pupilar aferente (RAPD)?",
    "Sinais de perfuração corneana ou escleral (teste de Seidel positivo)?",
    "Presença de hifema, catarata ou vítreo turvo sem causa aparente?"
  ];

  const [checks, setChecks] = useState<{ [key: string]: boolean }>({});

  const handleChange = (id: string) => {
    const novoCheck = !checks[id];
    const novaPontuacao = pontuacao + (novoCheck ? 1 : -1);
    setChecks({ ...checks, [id]: novoCheck });
    setPontuacao(novaPontuacao);
  };

  const calcularRisco = () => {
    let resultado = '';
    let condutaTexto = '';
    let prescricaoTexto = '';

    if (pontuacao >= 4) {
      resultado = 'Alto risco de CE intraocular';
      condutaTexto = `• Solicitar TC de órbita imediatamente
• Encaminhar ao oftalmologista com urgência
• Não tentar remoção no pronto atendimento
• Oclusão protetora
• Monitorização da acuidade visual`;
      prescricaoTexto = `• TC de órbita imediatamente
• Antibiótico sistêmico: Ciprofloxacino 500mg 12/12h
• Oclusão protetora
• Encaminhamento urgente ao oftalmologista
• Não coçar ou pressionar o olho
• Retorno imediato se piora da visão`;
    } else if (pontuacao >= 2) {
      resultado = 'Risco moderado de CE intraocular';
      condutaTexto = `• Considerar Rx simples de órbita
• Acompanhamento com especialista em 24h
• Exame com lâmpada de fenda
• Monitorização dos sintomas
• Retorno se piora da visão`;
      prescricaoTexto = `• Rx simples de órbita
• Colírio lubrificante 4-6x/dia
• Analgésico se necessário (Dipirona ou Paracetamol)
• Antibiótico tópico: Tobramicina 4x/dia
• Retorno em 24h para reavaliação
• Evitar coçar os olhos`;
    } else {
      resultado = 'Risco muito baixo de CE intraocular';
      condutaTexto = `• Conduta conservadora
• Exame com lâmpada de fenda para excluir penetração
• Acompanhamento ambulatorial
• Retorno se piora dos sintomas
• Orientação sobre sinais de alarme`;
      prescricaoTexto = `• Colírio lubrificante (lágrima artificial) 4-6x/dia
• Analgésico se necessário (Dipirona ou Paracetamol)
• Evitar coçar os olhos
• Retorno em 24h se sintomas persistirem
• Proteção ocular com óculos`;
    }

    setResposta(`${resultado}

CONDUTA:
${condutaTexto}

PRESCRIÇÃO:
${prescricaoTexto}`);
  };

  const zerarFormulario = () => {
    setChecks({});
    setPontuacao(0);
    setResposta(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-black">Calculadora de Suspeita de CE Intraocular</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {perguntas.map((pergunta, index) => (
              <label key={index} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checks[index] || false}
                  onChange={() => handleChange(index.toString())}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />
                <span className="text-black text-sm">{pergunta}</span>
              </label>
            ))}
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <button
              onClick={calcularRisco}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Calcular Risco
            </button>
            <button
              onClick={zerarFormulario}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-black"
            >
              Zerar
            </button>
          </div>

          {/* Resultado */}
          {resposta && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold text-black mb-2">Resultado:</h3>
              <p className="text-sm text-black whitespace-pre-line">{resposta}</p>
              <p className="text-sm text-gray-600 mt-2">Pontuação: {pontuacao}/7 pontos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}