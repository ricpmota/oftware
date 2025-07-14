'use client';

import React from 'react';

export default function Glaucoma() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Módulo Glaucoma</h2>
          <p className="text-gray-600 mb-6">
            Monitoramento de pressão intraocular e análise de campo visual.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Em desenvolvimento:</strong> Este módulo será implementado em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 