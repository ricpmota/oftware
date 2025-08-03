'use client';

import React, { useState } from 'react';

interface CalculadoraUlceraCorneanaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraUlceraCorneanaModal({ isOpen, onClose }: CalculadoraUlceraCorneanaModalProps) {
  const [localizacao, setLocalizacao] = useState('');
  const [hipopio, setHipopio] = useState(false);
  const [usoLente, setUsoLente] = useState(false);
  const [tamanho, setTamanho] = useState('');
  const [imunossuprimido, setImunossuprimido] = useState(false);
  const [resultado, setResultado] = useState('');

  const avaliar = () => {
    const condutas: string[] = [];

    if (localizacao === 'central') {
      condutas.push('Úlcera central → alto risco visual, encaminhar');
    }

    if (hipopio) {
      condutas.push('Presença de hipópio → infecção grave, encaminhar');
    }

    if (tamanho === 'grande') {
      condutas.push('Úlcera extensa → risco de perfuração, avaliar internamento');
    }

    if (usoLente) {
      condutas.push('Suspender uso de lente de contato imediatamente');
    }

    if (imunossuprimido) {
      condutas.push('Paciente imunossuprimido → risco elevado, considerar internamento');
    }

    if (condutas.length === 0) {
      setResultado('🔍 Conduta: úlcera leve, seguir com antibiótico tópico e reavaliar em 24–48h.');
    } else {
      setResultado(`⚠️ Avaliação:\n• ${condutas.join('\n• ')}`);
    }
  };

  const zerarFormulario = () => {
    setLocalizacao('');
    setHipopio(false);
    setUsoLente(false);
    setTamanho('');
    setImunossuprimido(false);
    setResultado('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-black">Classificação de Úlcera Corneana</h2>
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
                Localização da úlcera:
              </label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                value={localizacao} 
                onChange={(e) => setLocalizacao(e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="periferica">Periférica</option>
                <option value="central">Central</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Tamanho da úlcera:
              </label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                value={tamanho} 
                onChange={(e) => setTamanho(e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="pequena">Pequena</option>
                <option value="grande">Grande</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={hipopio} 
                  onChange={(e) => setHipopio(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">Presença de hipópio</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={usoLente} 
                  onChange={(e) => setUsoLente(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">Uso de lente de contato</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={imunossuprimido} 
                  onChange={(e) => setImunossuprimido(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-black">Paciente imunossuprimido</span>
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <button
              onClick={avaliar}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Avaliar
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
            <h4 className="font-semibold text-blue-800 mb-2">Critérios de Risco:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Úlcera Central:</strong> Alto risco visual</li>
              <li>• <strong>Hipópio:</strong> Infecção grave</li>
              <li>• <strong>Úlcera Grande:</strong> Risco de perfuração</li>
              <li>• <strong>Imunossuprimido:</strong> Risco elevado</li>
              <li>• <strong>Lente de Contato:</strong> Suspender imediatamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
