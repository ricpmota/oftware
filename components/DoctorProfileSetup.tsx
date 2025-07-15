'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { DoctorService } from '../services/doctorService';
import { DoctorProfile, DoctorProfileFormData } from '../types/doctor';
import DigitalSignature from './DigitalSignature';

interface DoctorProfileSetupProps {
  onComplete: (profile: DoctorProfile) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export default function DoctorProfileSetup({ onComplete, onCancel, isEditing = false }: DoctorProfileSetupProps) {
  const [formData, setFormData] = useState<DoctorProfileFormData>({
    name: '',
    crm: '',
    specialty: '',
    digitalSignature: '',
    gender: undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [originalProfile, setOriginalProfile] = useState<DoctorProfile | null>(null);

  useEffect(() => {
    // Verificar se já existe perfil salvo e obter nome do usuário
    const checkExistingProfile = async () => {
      if (auth.currentUser) {
        // Definir nome do usuário logado
        setUserName(auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Usuário');
        
        try {
          const existingProfile = await DoctorService.getDoctorProfile();
          if (existingProfile) {
            setOriginalProfile(existingProfile);
            setFormData({
              name: existingProfile.name.replace(/^(Dr\.|Dra\.)\s/, ''), // Remove título para edição
              crm: existingProfile.crm,
              specialty: existingProfile.specialty,
              digitalSignature: existingProfile.digitalSignature,
              gender: existingProfile.gender
            });
          } else {
            // Se não existe perfil, usar o nome do usuário logado
            setFormData(prev => ({
              ...prev,
              name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || ''
            }));
          }
        } catch {
          console.log('Perfil não encontrado ou erro de permissão - continuando com configuração inicial');
          // Mesmo com erro, usar o nome do usuário logado
          setFormData(prev => ({
            ...prev,
            name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || ''
          }));
        }
      }
    };

    checkExistingProfile();
  }, []);

  const handleInputChange = (field: keyof DoctorProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Função para formatar o nome com título baseado no sexo
  const formatNameWithTitle = (name: string, gender?: string) => {
    if (!name.trim()) return '';
    
    const title = gender === 'female' ? 'Dra.' : gender === 'male' ? 'Dr.' : '';
    return title ? `${title} ${name}` : name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setError('Usuário não autenticado. Faça login novamente.');
      return;
    }

    console.log('🔐 Usuário atual:', auth.currentUser.email, auth.currentUser.uid);

    // Validação básica
    if (!formData.name.trim()) {
      setError('Nome do profissional é obrigatório');
      return;
    }

    if (!formData.crm.trim()) {
      setError('CRM é obrigatório');
      return;
    }

    if (!formData.specialty.trim()) {
      setError('Especialidade é obrigatória');
      return;
    }

    if (!formData.digitalSignature) {
      setError('Assinatura digital é obrigatória');
      return;
    }

    if (!formData.gender) {
      setError('Selecione o sexo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Formatar nome com título
      const formattedName = formatNameWithTitle(formData.name, formData.gender);
      
      const profileData = {
        uid: auth.currentUser.uid,
        name: formattedName,
        crm: formData.crm,
        specialty: formData.specialty,
        digitalSignature: formData.digitalSignature,
        gender: formData.gender,
        createdAt: originalProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('📝 Salvando perfil:', profileData);

      // Tentar salvar via API do cliente primeiro
      try {
        await DoctorService.saveDoctorProfile(auth.currentUser.uid, profileData);
        console.log('✅ Perfil salvo com sucesso via cliente');
              } catch (clientError: unknown) {
          console.log('⚠️ Erro via cliente, tentando via Admin SDK:', (clientError as Error).message);
        
        // Fallback para API Admin
        const response = await fetch('/api/admin/create-doctor-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao salvar perfil');
        }

        console.log('✅ Perfil salvo com sucesso via Admin SDK');
      }

      onComplete(profileData);
            } catch (error: unknown) {
      console.error('❌ Erro ao salvar perfil:', error);
      setError((error as Error).message || 'Erro ao salvar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Welcome Message */}
        {userName && !isEditing && (
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Olá, {userName}!
            </h1>
            <p className="text-gray-600">
              Seja bem-vindo ao sistema de refração assistida.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Favor preencher os dados abaixo para configurar seu perfil profissional.
            </p>
          </div>
        )}

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Editar Perfil Profissional' : 'Configuração do Profissional'}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {isEditing 
              ? 'Atualize seus dados profissionais conforme necessário'
              : 'Configure seus dados para aparecer no laudo final'
            }
          </p>
        </div>



        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sexo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sexo *
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            >
              <option value="">Selecione o sexo</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
              <option value="other">Outro</option>
            </select>
          </div>

          {/* Nome do Profissional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder={formData.gender === 'female' ? 'Maria Silva' : formData.gender === 'male' ? 'João Silva' : 'Nome completo'}
              required
            />
            {formData.gender && formData.name && (
              <p className="text-xs text-blue-600 mt-1">
                Nome que aparecerá: {formatNameWithTitle(formData.name, formData.gender)}
              </p>
            )}
          </div>

          {/* CRM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CRM *
            </label>
            <input
              type="text"
              value={formData.crm}
              onChange={(e) => handleInputChange('crm', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="12345-SP"
              required
            />
          </div>

          {/* Especialidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialidade *
            </label>
            <select
              value={formData.specialty}
              onChange={(e) => handleInputChange('specialty', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            >
              <option value="">Selecione a especialidade</option>
              <option value="Oftalmologia">Oftalmologia</option>
              <option value="Oftalmopediatria">Oftalmopediatria</option>
              <option value="Retina">Retina</option>
              <option value="Glaucoma">Glaucoma</option>
              <option value="Córnea">Córnea</option>
              <option value="Plástica Ocular">Plástica Ocular</option>
              <option value="Neuro-oftalmologia">Neuro-oftalmologia</option>
              <option value="Outra">Outra</option>
            </select>
          </div>

          {/* Assinatura Digital */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isEditing ? 'Assinatura Digital (clique para alterar)' : 'Assinatura Digital'} *
            </label>
            <DigitalSignature
              onSignatureChange={(signature) => handleInputChange('digitalSignature', signature)}
              initialSignature={formData.digitalSignature}
            />
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            {isEditing && onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`${isEditing && onCancel ? 'flex-1' : 'w-full'} bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Salvando...' : (isEditing ? 'Atualizar Perfil' : 'Salvar Perfil')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 