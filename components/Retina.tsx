'use client';

import React, { useState } from 'react';
import RetinaLaudoForm from './RetinaLaudoForm';
import OctLaudoForm from './OctLaudoForm';
import UltrassomLaudoForm from './UltrassomLaudoForm';

export default function Retina() {
  const [activeTab, setActiveTab] = useState<'retinografia' | 'oct' | 'ultrassom'>('retinografia');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>


      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('retinografia')}
            className={`px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              activeTab === 'retinografia'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Retinografia
          </button>
                      <button
              onClick={() => setActiveTab('oct')}
              className={`px-6 py-3 rounded-md font-medium transition-colors duration-200 medical-term ${
                activeTab === 'oct'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              translate="no"
              lang="en"
            >
              OCT
            </button>
          <button
            onClick={() => setActiveTab('ultrassom')}
            className={`px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
              activeTab === 'ultrassom'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Ultrassom
          </button>
        </div>
      </div>



      {activeTab === 'retinografia' && (
        <RetinaLaudoForm />
      )}

      {activeTab === 'oct' && (
        <OctLaudoForm />
      )}

      {activeTab === 'ultrassom' && (
        <UltrassomLaudoForm />
      )}
    </div>
  );
} 