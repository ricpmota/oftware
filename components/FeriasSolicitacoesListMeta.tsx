'use client';

import React from 'react';
import { Clock, CheckCircle, XCircle, Calendar, User, MessageSquare } from 'lucide-react';
import { Ferias } from '@/types/ferias';

interface FeriasSolicitacoesListProps {
  ferias: Ferias[];
}

export default function FeriasSolicitacoesList({ ferias }: FeriasSolicitacoesListProps) {
  // Separar férias por status
  const feriasPendentes = ferias.filter(f => f.status === 'pendente');
  const feriasAprovadas = ferias.filter(f => f.status === 'aprovada');
  const feriasRejeitadas = ferias.filter(f => f.status === 'rejeitada');

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'aprovada':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejeitada':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'aprovada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejeitada':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Função para obter texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'aprovada':
        return 'Aprovada';
      case 'rejeitada':
        return 'Rejeitada';
      default:
        return 'Desconhecido';
    }
  };

  // Função para formatar data
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para calcular duração
  const calcularDuracao = (inicio: Date, fim: Date) => {
    const diffTime = fim.getTime() - inicio.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Componente para item de férias
  const FeriasItem = ({ ferias }: { ferias: Ferias }) => {
    const duracao = calcularDuracao(ferias.dataInicio, ferias.dataFim);
    const isLonga = duracao > 30;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {getStatusIcon(ferias.status)}
            <div>
              <h4 className="font-medium text-gray-900">
                {formatDate(ferias.dataInicio)} - {formatDate(ferias.dataFim)}
              </h4>
              <p className="text-sm text-gray-500">
                {duracao} {duracao === 1 ? 'dia' : 'dias'}
                {isLonga && ' • Período longo'}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ferias.status)}`}>
            {getStatusText(ferias.status)}
          </span>
        </div>

        {ferias.motivo && (
          <div className="mb-3">
            <div className="flex items-start space-x-2">
              <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{ferias.motivo}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Solicitado em {formatDate(ferias.createdAt)}</span>
            </div>
            {ferias.aprovadoPor && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>Aprovado por {ferias.aprovadoPor}</span>
              </div>
            )}
            {ferias.rejeitadoPor && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>Rejeitado por {ferias.rejeitadoPor}</span>
              </div>
            )}
          </div>
          {ferias.observacoes && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Observações disponíveis</p>
            </div>
          )}
        </div>

        {ferias.observacoes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Observações:</span> {ferias.observacoes}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Férias Pendentes */}
      {feriasPendentes.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Solicitações Pendentes ({feriasPendentes.length})
            </h3>
          </div>
          <div className="space-y-3">
            {feriasPendentes.map(ferias => (
              <FeriasItem key={ferias.id} ferias={ferias} />
            ))}
          </div>
        </div>
      )}

      {/* Férias Aprovadas */}
      {feriasAprovadas.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Férias Aprovadas ({feriasAprovadas.length})
            </h3>
          </div>
          <div className="space-y-3">
            {feriasAprovadas.map(ferias => (
              <FeriasItem key={ferias.id} ferias={ferias} />
            ))}
          </div>
        </div>
      )}

      {/* Férias Rejeitadas */}
      {feriasRejeitadas.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <XCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Férias Rejeitadas ({feriasRejeitadas.length})
            </h3>
          </div>
          <div className="space-y-3">
            {feriasRejeitadas.map(ferias => (
              <FeriasItem key={ferias.id} ferias={ferias} />
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando não há solicitações */}
      {ferias.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Solicitação de Férias</h3>
          <p className="text-gray-500">
            Você ainda não fez nenhuma solicitação de férias.
          </p>
        </div>
      )}
    </div>
  );
}
