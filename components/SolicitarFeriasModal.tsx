'use client';

import React, { useState } from 'react';
import { X, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface SolicitarFeriasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolicitar: (dataInicio: string, dataFim: string, motivo: string) => Promise<void>;
  loading?: boolean;
}

export default function SolicitarFeriasModal({ 
  isOpen, 
  onClose, 
  onSolicitar, 
  loading = false 
}: SolicitarFeriasModalProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Validar formulário
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!dataInicio) {
      newErrors.dataInicio = 'Data de início é obrigatória';
    } else {
      const inicio = new Date(dataInicio);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      if (inicio < hoje) {
        newErrors.dataInicio = 'Não é possível solicitar férias para datas passadas';
      }
    }

    if (!dataFim) {
      newErrors.dataFim = 'Data de fim é obrigatória';
    } else if (dataInicio && new Date(dataFim) <= new Date(dataInicio)) {
      newErrors.dataFim = 'A data de fim deve ser posterior à data de início';
    }

    if (motivo.trim().length < 10) {
      newErrors.motivo = 'O motivo deve ter pelo menos 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calcular duração das férias
  const calcularDuracao = () => {
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      const diffTime = fim.getTime() - inicio.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const duracao = calcularDuracao();
  const isLonga = duracao > 30;

  // Limpar formulário
  const resetForm = () => {
    setDataInicio('');
    setDataFim('');
    setMotivo('');
    setErrors({});
  };

  // Fechar modal
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSolicitar(dataInicio, dataFim, motivo);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Erro ao solicitar férias:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Solicitar Férias</h2>
              <p className="text-sm text-gray-500">Preencha os dados para solicitar seu período de férias</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Data de Início */}
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-2">
              Data de Início *
            </label>
            <input
              type="date"
              id="dataInicio"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={`
                w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500
                ${errors.dataInicio ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.dataInicio && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.dataInicio}
              </p>
            )}
          </div>

          {/* Data de Fim */}
          <div>
            <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-2">
              Data de Fim *
            </label>
            <input
              type="date"
              id="dataFim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              min={dataInicio || new Date().toISOString().split('T')[0]}
              className={`
                w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500
                ${errors.dataFim ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.dataFim && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.dataFim}
              </p>
            )}
          </div>

          {/* Duração */}
          {duracao > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Duração: {duracao} {duracao === 1 ? 'dia' : 'dias'}
                  </p>
                  {isLonga && (
                    <p className="text-xs text-blue-700 mt-1">
                      ⚠️ Período longo - verifique se está de acordo com as regras
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label htmlFor="motivo" className="block text-sm font-medium text-gray-700 mb-2">
              Motivo da Solicitação *
            </label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              placeholder="Descreva o motivo da sua solicitação de férias..."
              className={`
                w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none
                ${errors.motivo ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.motivo ? (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.motivo}
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Mínimo 10 caracteres
                </p>
              )}
              <p className="text-xs text-gray-500">
                {motivo.length}/10
              </p>
            </div>
          </div>

          {/* Informações importantes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Informações Importantes:</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Sua solicitação será analisada pela administração</li>
              <li>• Você receberá uma notificação quando for aprovada ou rejeitada</li>
              <li>• Verifique se não há conflitos com outros residentes</li>
            </ul>
          </div>

          {/* Botões */}
          <div className="flex items-center space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !dataInicio || !dataFim || motivo.trim().length < 10}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Solicitar Férias</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
