'use client';

import React, { useState } from 'react';

interface CalculadoraDRRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraDRRModal({ isOpen, onClose }: CalculadoraDRRModalProps) {
  const [resposta, setResposta] = useState<string | null>(null);
  const [pontuacao, setPontuacao] = useState(0);

  const fatores = [
    { id: "fotopsias", label: "Presença de flashes (fotopsias)", valor: 2 },
    { id: "moscas", label: "Moscas volantes novas", valor: 2 },
    { id: "sombra", label: "Sombra ou cortina no campo visual", valor: 3 },
    { id: "visao", label: "Redução súbita da visão", valor: 2 },
    { id: "trauma", label: "História de trauma ocular recente", valor: 1 },
    { id: "cirurgia", label: "Cirurgia ocular prévia (ex: catarata)", valor: 1 },
    { id: "idade", label: "Idade acima de 50 anos", valor: 1 }
  ];

  const [checks, setChecks] = useState<{ [key: string]: boolean }>({});

  const handleChange = (id: string, valor: number) => {
    const novoCheck = !checks[id];
    const novaPontuacao = pontuacao + (novoCheck ? valor : -valor);
    setChecks({ ...checks, [id]: novoCheck });
    setPontuacao(novaPontuacao);
  };

  const calcularRisco = () => {
    if (pontuacao >= 6) {
      setResposta(`🔴 Alto risco de Descolamento de Retina Regmatogênico. 
Instruções:
- Manter repouso absoluto.
- Evitar movimentos bruscos ou atividades físicas.
- Encaminhar com urgência para avaliação com retinólogo.
- Considerar não ocluir o olho afetado.
- Solicitar mapeamento de retina o mais breve possível.`);
    } else if (pontuacao >= 3) {
      setResposta(`🟠 Risco moderado para DRR.
Instruções:
- Orientar paciente a evitar esforço físico e acompanhar evolução dos sintomas.
- Agendar mapeamento de retina em até 48 horas.
- Sinais de alerta devem ser monitorados (aumento de sombras, flashes persistentes).`);
    } else {
      setResposta(`🟢 Baixo risco para DRR neste momento.
Instruções:
- Orientar paciente a observar possíveis novos sintomas.
- Não há urgência, mas seguir com avaliação oftalmológica de rotina.`);
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
          <h2 className="text-xl font-bold text-black">Calculadora de Risco para Descolamento de Retina (DRR)</h2>
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
              <p className="text-sm text-gray-600 mt-2">Pontuação: {pontuacao}/12 pontos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}