'use client';

import React, { useState } from 'react';

interface CalculadoraNeuriteOpticaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraNeuriteOpticaModal({ isOpen, onClose }: CalculadoraNeuriteOpticaModalProps) {
  const [resposta, setResposta] = useState<string | null>(null);
  const [pontuacao, setPontuacao] = useState(0);

  const fatores = [
    { id: "visao", label: "Perda visual monocular subaguda", valor: 3 },
    { id: "dor", label: "Dor à movimentação ocular", valor: 2 },
    { id: "rapd", label: "Presença de reflexo pupilar aferente relativo (RAPD)", valor: 2 },
    { id: "normal_fundo", label: "Disco óptico normal ao fundo de olho (neurite retrobulbar)", valor: 1 },
    { id: "idade", label: "Idade entre 18-45 anos", valor: 1 },
    { id: "esclerose", label: "História prévia de esclerose múltipla", valor: 2 }
  ];

  const [checks, setChecks] = useState<{ [key: string]: boolean }>({});

  const handleChange = (id: string, valor: number) => {
    const novoCheck = !checks[id];
    const novaPontuacao = pontuacao + (novoCheck ? valor : -valor);
    setChecks({ ...checks, [id]: novoCheck });
    setPontuacao(novaPontuacao);
  };

  const calcularRisco = () => {
    if (pontuacao >= 7) {
      setResposta(`🔴 Alta suspeita de Neurite Óptica.
Conduta:
- Encaminhar para avaliação neurológica e neuroftalmológica urgente.
- Solicitar RNM de encéfalo com contraste.
- Iniciar pulsoterapia: Metilprednisolona 1g EV/dia por 3 a 5 dias.
- Monitorar evolução visual diariamente.`);
    } else if (pontuacao >= 4) {
      setResposta(`🟠 Suspeita moderada de Neurite Óptica.
Conduta:
- Avaliação especializada com neurologista e exame de imagem em até 72h.
- Se confirmação clínica, iniciar corticoide sob supervisão médica.
- Considerar acompanhamento com campo visual e potencial visual evocado.`);
    } else {
      setResposta(`🟢 Baixa probabilidade de Neurite Óptica.
Conduta:
- Avaliação ambulatorial.
- Orientar paciente sobre sinais de alerta (piora da visão, dor ocular, etc).
- Seguir com investigação de outras causas de baixa visual monocular.`);
    }
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
          <h2 className="text-xl font-bold text-black">Calculadora de Risco para Neurite Óptica</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {fatores.map((fator) => (
              <label key={fator.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checks[fator.id] || false}
                  onChange={() => handleChange(fator.id, fator.valor)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">{fator.label}</span>
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
              <p className="text-sm text-gray-600 mt-2">Pontuação: {pontuacao}/11 pontos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}