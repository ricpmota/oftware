'use client';

import React, { useState } from 'react';

interface CalculadoraCeluliteOrbitariaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalculadoraCeluliteOrbitariaModal({ isOpen, onClose }: CalculadoraCeluliteOrbitariaModalProps) {
  const [proptose, setProptose] = useState(false);
  const [dorMovOcular, setDorMovOcular] = useState(false);
  const [oftalmoplegia, setOftalmoplegia] = useState(false);
  const [febre, setFebre] = useState(false);
  const [alteracaoVisao, setAlteracaoVisao] = useState(false);
  const [resultado, setResultado] = useState("");

  function avaliarRisco() {
    const score =
      (proptose ? 2 : 0) +
      (dorMovOcular ? 2 : 0) +
      (oftalmoplegia ? 2 : 0) +
      (febre ? 1 : 0) +
      (alteracaoVisao ? 3 : 0);

    if (score >= 6) {
      setResultado(`⚠️ Alto risco para CELULITE ORBITÁRIA.

Conduta:
- Encaminhar imediatamente para hospital com oftalmologia de plantão
- Solicitar TC de órbita e seios paranasais
- Iniciar antibiótico EV de amplo espectro (ex: Ceftriaxona + Clindamicina)
- Avaliação conjunta com otorrino se sinusite associada`);
    } else if (score >= 3) {
      setResultado(`🔸 Risco intermediário. Pode haver celulite orbitária incipiente.

Conduta:
- Encaminhar para avaliação presencial em até 6h
- TC de órbita se persistência ou piora
- Considerar início de antibiótico EV em ambiente hospitalar`);
    } else {
      setResultado(`✅ Provável celulite pré-septal.

Conduta:
- Antibiótico oral (Amoxicilina + Clavulanato)
- Acompanhamento em 24h
- Reavaliar se febre ou piora clínica`);
    }
  }

  const zerarFormulario = () => {
    setProptose(false);
    setDorMovOcular(false);
    setOftalmoplegia(false);
    setFebre(false);
    setAlteracaoVisao(false);
    setResultado("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-black">Calculadora de Celulite Orbitária</h2>
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
                checked={proptose}
                onChange={(e) => setProptose(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Proptose</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={dorMovOcular}
                onChange={(e) => setDorMovOcular(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Dor à movimentação ocular</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={oftalmoplegia}
                onChange={(e) => setOftalmoplegia(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Oftalmoplegia (limitação dos movimentos)</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={febre}
                onChange={(e) => setFebre(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Febre</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={alteracaoVisao}
                onChange={(e) => setAlteracaoVisao(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-black">Redução da acuidade visual</span>
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <button
              onClick={avaliarRisco}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Avaliar Risco
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
              <p className="text-sm text-black whitespace-pre-line">{resultado}</p>
              <p className="text-sm text-gray-600 mt-2">Pontuação: {(proptose ? 2 : 0) + (dorMovOcular ? 2 : 0) + (oftalmoplegia ? 2 : 0) + (febre ? 1 : 0) + (alteracaoVisao ? 3 : 0)}/10 pontos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}