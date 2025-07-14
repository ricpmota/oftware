'use client';

import React from 'react';
import { DoctorProfile } from '../types/doctor';

interface HomeProps {
  doctorProfile: DoctorProfile | null;
  onEditProfile: () => void;
  onLogout: () => void;
}

export default function Home({ doctorProfile, onEditProfile, onLogout }: HomeProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6" style={{ paddingBottom: 100 }}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src="/icones/oftware.png" 
              alt="Oftalmo Assist" 
              className="w-32 h-32 md:w-40 md:h-40"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oftalmo Assist</h1>
          <p className="text-gray-600">Sistema de assistência oftalmológica</p>
        </div>

        {doctorProfile ? (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Dados do Médico</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Nome:</span>
                  <span className="font-medium text-white">{doctorProfile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">CRM:</span>
                  <span className="font-medium text-white">{doctorProfile.crm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Especialidade:</span>
                  <span className="font-medium text-white">{doctorProfile.specialty}</span>
                </div>
                {doctorProfile.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Gênero:</span>
                    <span className="font-medium text-white">
                      {doctorProfile.gender === 'male' ? 'Masculino' : 
                       doctorProfile.gender === 'female' ? 'Feminino' : 'Outro'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onEditProfile}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors border border-gray-700"
              >
                Editar
              </button>
              <button
                onClick={onLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">👨‍⚕️</div>
            <h2 className="text-xl font-semibold text-gray-800">Perfil Médico</h2>
            <p className="text-gray-600">Configure seus dados profissionais para começar</p>
            <button
              onClick={onEditProfile}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg transition-colors border border-gray-700"
            >
              ➕ Criar Perfil
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 