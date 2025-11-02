'use client';

import React, { useMemo } from 'react';
import { Ferias } from '@/types/ferias';
import { Residente } from '@/types/auth';

interface FeriasCalendarProps {
  ferias: Ferias[];
  residentes: Residente[];
}

interface FeriasResidente {
  residente: Residente;
  ferias: Ferias[];
  totalDias: number;
  periodos: {
    dataInicio: Date;
    dataFim: Date;
    duracao: number;
  }[];
}

export default function FeriasCalendar({ ferias, residentes }: FeriasCalendarProps) {

  // Calcular dados para o gráfico de férias por residente
  const feriasPorResidente = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    return residentes.map(residente => {
      const feriasResidente = ferias.filter(f => 
        f.residenteEmail === residente.email && 
        new Date(f.dataInicio).getFullYear() === currentYear
      );
      
      const periodos = feriasResidente.map(f => ({
        dataInicio: new Date(f.dataInicio),
        dataFim: new Date(f.dataFim),
        duracao: Math.ceil((new Date(f.dataFim).getTime() - new Date(f.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1
      }));
      
      const totalDias = periodos.reduce((total, periodo) => total + periodo.duracao, 0);
      
      return {
        residente,
        ferias: feriasResidente,
        totalDias,
        periodos
      };
    }).filter(item => item.totalDias > 0).sort((a, b) => b.totalDias - a.totalDias);
  }, [ferias, residentes]);

  // Calcular duração máxima para escala do gráfico
  const maxDias = useMemo(() => {
    return Math.max(...feriasPorResidente.map(item => item.totalDias), 30);
  }, [feriasPorResidente]);

  // Verificar conflitos por nível
  const conflitosPorNivel = useMemo(() => {
    const conflitos: { [key: string]: FeriasResidente[] } = { R1: [], R2: [], R3: [] };
    
    feriasPorResidente.forEach(item => {
      const nivel = item.residente.nivel;
      if (nivel && conflitos[nivel]) {
        conflitos[nivel].push(item);
      }
    });
    
    return conflitos;
  }, [feriasPorResidente]);

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'R1': return 'bg-blue-500';
      case 'R2': return 'bg-green-500';
      case 'R3': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getNivelBorderColor = (nivel: string) => {
    switch (nivel) {
      case 'R1': return 'border-blue-500';
      case 'R2': return 'border-green-500';
      case 'R3': return 'border-purple-500';
      default: return 'border-gray-500';
    }
  };


  return (
    <div className="space-y-4">
      {/* Header do Gráfico */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">
          Férias Anuais {new Date().getFullYear()}
        </h4>
        <div className="text-sm text-gray-500">
          Total de {feriasPorResidente.length} residentes com férias
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-gray-700">R1</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-700">R2</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-gray-700">R3</span>
        </div>
      </div>

      {/* Gráfico de Barras Horizontal */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {feriasPorResidente.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma férias aprovada</h3>
            <p className="mt-1 text-sm text-gray-500">Não há férias aprovadas para o ano atual.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Linha de escala */}
            <div className="flex justify-between text-xs text-gray-500 border-b border-gray-200 pb-2">
              <span>0</span>
              <span>{Math.ceil(maxDias / 4)}</span>
              <span>{Math.ceil(maxDias / 2)}</span>
              <span>{Math.ceil(maxDias * 3 / 4)}</span>
              <span>{maxDias} dias</span>
            </div>

            {/* Barras dos residentes */}
            <div className="space-y-3">
              {feriasPorResidente.map((item) => {
                const largura = (item.totalDias / maxDias) * 100;
                const nivel = item.residente.nivel;
                
                return (
                  <div key={item.residente.id} className="group">
                    {/* Nome do residente */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getNivelColor(nivel)}`}></div>
                        <span className="text-sm font-medium text-gray-900">
                          {item.residente.nome}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getNivelColor(nivel)} text-white`}>
                          {nivel}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.totalDias} dias
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div
                          className={`h-6 rounded-full ${getNivelColor(nivel)} transition-all duration-300 ease-in-out`}
                          style={{ width: `${largura}%` }}
                        >
                          {/* Períodos individuais */}
                          <div className="h-full flex">
                            {item.periodos.map((periodo, pIndex) => {
                              const periodoLargura = (periodo.duracao / item.totalDias) * 100;
                              return (
                                <div
                                  key={pIndex}
                                  className={`h-full border-r ${getNivelBorderColor(nivel)} border-opacity-30`}
                                  style={{ width: `${periodoLargura}%` }}
                                  title={`${periodo.dataInicio.toLocaleDateString('pt-BR')} - ${periodo.dataFim.toLocaleDateString('pt-BR')} (${periodo.duracao} dias)`}
                                ></div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tooltip com detalhes */}
                      <div className="absolute top-8 left-0 bg-gray-900 text-white text-xs rounded-md px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 min-w-max">
                        <div className="font-medium mb-1">{item.residente.nome} ({nivel})</div>
                        <div className="space-y-1">
                          {item.periodos.map((periodo, pIndex) => (
                            <div key={pIndex} className="text-xs">
                              {periodo.dataInicio.toLocaleDateString('pt-BR')} - {periodo.dataFim.toLocaleDateString('pt-BR')} 
                              <span className="text-gray-300"> ({periodo.duracao} dias)</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-700 mt-2 pt-1 text-xs font-medium">
                          Total: {item.totalDias} dias
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Resumo por nível */}
      {feriasPorResidente.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(conflitosPorNivel).map(([nivel, residentes]) => {
            if (residentes.length === 0) return null;
            
            const totalDiasNivel = residentes.reduce((total, item) => total + item.totalDias, 0);
            
            return (
              <div key={nivel} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getNivelColor(nivel)}`}></div>
                  <h5 className="font-medium text-gray-900">{nivel}</h5>
                </div>
                <div className="text-sm text-gray-600">
                  {residentes.length} residente{residentes.length !== 1 ? 's' : ''} • {totalDiasNivel} dias totais
                </div>
                <div className="mt-2 space-y-1">
                  {residentes.map(item => (
                    <div key={item.residente.id} className="text-xs text-gray-500">
                      {item.residente.nome}: {item.totalDias} dias
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
