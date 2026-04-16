'use client';

import React, { useState } from 'react';

interface CalculadoraDuaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraDuaModal({ isOpen, onClose }: CalculadoraDuaModalProps) {
  const [limboHoras, setLimboHoras] = useState('');
  const [necrose, setNecrose] = useState('');
  const [resultado, setResultado] = useState('');

  const calcular = () => {
    const h = parseFloat(limboHoras);
    const n = parseFloat(necrose);
    
    // Validação dos inputs
    if (isNaN(h) || isNaN(n) || h < 0 || n < 0 || n > 100) {
      setResultado('❌ Por favor, insira valores válidos:\n• Horas: 0-12+\n• Necrose: 0-100%');
      return;
    }

    let grau = '';
    let prognostico = '';

    // Lógica de classificação baseada no Escore de Dua
    if (h === 0 && n === 0) {
      grau = 'Grau I';
      prognostico = 'Excelente prognóstico';
    } else if (h < 3 && n === 0) {
      grau = 'Grau II';
      prognostico = 'Muito bom prognóstico';
    } else if (h >= 3 && h <= 6 && n < 30) {
      grau = 'Grau III';
      prognostico = 'Bom prognóstico';
    } else if (h > 6 && h <= 9 && n >= 30 && n <= 50) {
      grau = 'Grau IV';
      prognostico = 'Prognóstico reservado';
    } else if (h > 9 && h < 12 && n > 50 && n <= 75) {
      grau = 'Grau V';
      prognostico = 'Prognóstico ruim';
    } else if (h >= 12 || n > 75) {
      grau = 'Grau VI';
      prognostico = 'Péssimo prognóstico';
    } else {
      // Casos intermediários que não se encaixam perfeitamente nos critérios
      if (h < 3 && n > 0 && n < 30) {
        grau = 'Grau II-III';
        prognostico = 'Prognóstico bom a muito bom';
      } else if (h >= 3 && h <= 6 && n >= 30 && n <= 50) {
        grau = 'Grau III-IV';
        prognostico = 'Prognóstico bom a reservado';
      } else if (h > 6 && h <= 9 && n < 30) {
        grau = 'Grau III-IV';
        prognostico = 'Prognóstico bom a reservado';
      } else if (h > 9 && h < 12 && n <= 50) {
        grau = 'Grau IV-V';
        prognostico = 'Prognóstico reservado a ruim';
      } else {
        grau = 'Classificação Intermediária';
        prognostico = 'Considere critérios clínicos adicionais';
      }
    }

    setResultado(`🔎 ${grau}\n📊 ${prognostico}\n\n📋 Dados inseridos:\n• Limbo perdido: ${h}h\n• Necrose conjuntival: ${n}%`);
  };

  const zerarFormulario = () => {
    setLimboHoras('');
    setNecrose('');
    setResultado('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-black">Classificação de Queimadura Química — Escore de Dua</h2>
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
                Horas de limbo perdido:
              </label>
              <input 
                type="number" 
                min="0"
                max="24"
                step="0.5"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                value={limboHoras} 
                onChange={(e) => setLimboHoras(e.target.value)} 
                placeholder="0-12+"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Porcentagem de necrose conjuntival (%):
              </label>
              <input 
                type="number" 
                min="0"
                max="100"
                step="1"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                value={necrose} 
                onChange={(e) => setNecrose(e.target.value)} 
                placeholder="0-100"
              />
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

          {/* Informações Adicionais */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Critérios de Classificação:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Grau I:</strong> 0h limbo perdido, sem necrose</li>
              <li>• <strong>Grau II:</strong> &lt;3h limbo perdido, sem necrose</li>
              <li>• <strong>Grau III:</strong> 3-6h limbo perdido, &lt;30% necrose</li>
              <li>• <strong>Grau IV:</strong> 6-9h limbo perdido, 30-50% necrose</li>
              <li>• <strong>Grau V:</strong> 9-&lt;12h limbo perdido, 50-75% necrose</li>
              <li>• <strong>Grau VI:</strong> ≥12h limbo perdido, &gt;75% necrose</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
