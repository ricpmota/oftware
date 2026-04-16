'use client';

import React, { useState } from 'react';

interface CalculadoraHifemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraHifemaModal({ isOpen, onClose }: CalculadoraHifemaModalProps) {
  const [pio, setPio] = useState('');
  const [dias, setDias] = useState('');
  const [hifemaTotal, setHifemaTotal] = useState(false);
  const [traçoFalciforme, setTraçoFalciforme] = useState(false);
  const [impregnacao, setImpregnacao] = useState(false);
  const [crianca, setCrianca] = useState(false);
  const [reducaoInsuficiente, setReducaoInsuficiente] = useState(false);
  const [resultado, setResultado] = useState('');

  const calcular = () => {
    const pioNum = parseFloat(pio);
    const diasNum = parseInt(dias);
    let indicacao = false;
    const motivos: string[] = [];

    if (hifemaTotal && diasNum >= 5) {
      indicacao = true;
      motivos.push('Hifema total por ≥ 5 dias');
    }

    if (pioNum >= 60 && diasNum >= 2) {
      indicacao = true;
      motivos.push('PIO ≥ 60 mmHg por 48h');
    }

    if (hifemaTotal && pioNum >= 25 && diasNum >= 5) {
      indicacao = true;
      motivos.push('PIO ≥ 25 mmHg com hifema total por ≥ 5 dias');
    }

    if (traçoFalciforme && pioNum >= 24 && diasNum >= 1) {
      indicacao = true;
      motivos.push('PIO ≥ 24 mmHg por 24h em falcêmico');
    }

    if (reducaoInsuficiente) {
      indicacao = true;
      motivos.push('Hifema não reduziu a ≤ 50% em 8 dias');
    }

    if (impregnacao) {
      indicacao = true;
      motivos.push('Impregnação hemática da córnea');
    }

    if (crianca) {
      indicacao = true;
      motivos.push('Criança em risco de ambliopia');
    }

    if (indicacao) {
      setResultado(`✅ Indicação de lavagem anterior:\n• ${motivos.join('\n• ')}`);
    } else {
      setResultado('🔍 Não há indicação formal de lavagem no momento.');
    }
  };

  const zerarFormulario = () => {
    setPio('');
    setDias('');
    setHifemaTotal(false);
    setTraçoFalciforme(false);
    setImpregnacao(false);
    setCrianca(false);
    setReducaoInsuficiente(false);
    setResultado('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-black">Calculadora de Lavagem em Hifema</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                PIO atual (mmHg):
              </label>
              <input 
                type="number" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                value={pio} 
                onChange={(e) => setPio(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Dias desde o trauma:
              </label>
              <input 
                type="number" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                value={dias} 
                onChange={(e) => setDias(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={hifemaTotal} 
                  onChange={(e) => setHifemaTotal(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">Hifema total</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={traçoFalciforme} 
                  onChange={(e) => setTraçoFalciforme(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">Paciente com traço falciforme</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={reducaoInsuficiente} 
                  onChange={(e) => setReducaoInsuficiente(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">Hifema não reduziu a ≤ 50% em 8 dias</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={impregnacao} 
                  onChange={(e) => setImpregnacao(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">Impregnação hemática da córnea</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={crianca} 
                  onChange={(e) => setCrianca(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">Criança em risco de ambliopia</span>
              </label>
            </div>
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
              <pre className="whitespace-pre-wrap text-sm text-black font-mono">
                {resultado}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
