'use client';

import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Ferias } from '@/types/ferias';

interface FeriasCalendarViewProps {
  ferias: Ferias[];
  onSolicitarClick: () => void;
}

export default function FeriasCalendarView({ ferias, onSolicitarClick }: FeriasCalendarViewProps) {
  // Filtrar apenas férias aprovadas
  const feriasAprovadas = ferias.filter(f => f.status === 'aprovada');
  
  // Obter ano atual
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  // Nomes dos meses
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  // Gerar dias do mês
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  // Verificar se uma data está em férias aprovadas
  const isDateInFerias = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return feriasAprovadas.some(f => {
      const inicio = new Date(f.dataInicio);
      const fim = new Date(f.dataFim);
      return date >= inicio && date <= fim;
    });
  };
  
  // Obter informações das férias para um dia específico
  const getFeriasForDay = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return feriasAprovadas.find(f => {
      const inicio = new Date(f.dataInicio);
      const fim = new Date(f.dataFim);
      return date >= inicio && date <= fim;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header do Calendário */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Minhas Férias Aprovadas</h2>
              <p className="text-green-100 text-sm">
                {monthNames[currentMonth]} {currentYear}
              </p>
            </div>
          </div>
          <button
            onClick={onSolicitarClick}
            className="flex items-center space-x-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Solicitar Férias</span>
          </button>
        </div>
      </div>

      {/* Calendário */}
      <div className="p-6">
        {feriasAprovadas.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Férias Aprovada</h3>
            <p className="text-gray-500 mb-6">
              Você ainda não tem férias aprovadas para este mês.
            </p>
            <button
              onClick={onSolicitarClick}
              className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Solicitar Primeira Férias</span>
            </button>
          </div>
        ) : (
          <>
            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-1">
              {/* Espaços vazios para o primeiro dia do mês */}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="h-12"></div>
              ))}
              
              {/* Dias do mês */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const isInFerias = isDateInFerias(day);
                const feriasInfo = getFeriasForDay(day);
                const isToday = day === new Date().getDate() && 
                               currentMonth === new Date().getMonth() &&
                               currentYear === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    className={`
                      h-12 flex items-center justify-center text-sm font-medium relative cursor-pointer
                      ${isToday ? 'bg-green-100 text-green-800 rounded-lg' : ''}
                      ${isInFerias ? 'bg-green-500 text-white rounded-lg hover:bg-green-600' : 'hover:bg-gray-100 rounded-lg'}
                    `}
                    title={isInFerias ? `Férias: ${feriasInfo?.dataInicio.toLocaleDateString('pt-BR')} - ${feriasInfo?.dataFim.toLocaleDateString('pt-BR')}` : ''}
                  >
                    {day}
                    {isInFerias && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-700">Dias de férias</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 rounded border"></div>
                <span className="text-gray-700">Hoje</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Resumo das férias */}
      {feriasAprovadas.length > 0 && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Resumo das Férias Aprovadas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feriasAprovadas.map(ferias => (
              <div key={ferias.id} className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {ferias.dataInicio.toLocaleDateString('pt-BR')} - {ferias.dataFim.toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.ceil((ferias.dataFim.getTime() - ferias.dataInicio.getTime()) / (1000 * 60 * 60 * 24))} dias
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Aprovada</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
