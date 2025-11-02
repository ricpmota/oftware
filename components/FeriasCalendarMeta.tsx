'use client';

import React, { useMemo, useState } from 'react';
import { Ferias } from '@/types/ferias';
import { Residente } from '@/types/auth';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [mesAtual, setMesAtual] = useState(new Date());

  // Funções de navegação do calendário
  const irParaMesAnterior = () => {
    setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const irParaProximoMes = () => {
    setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const irParaMesAtual = () => {
    setMesAtual(new Date());
  };

  // Calcular dados para o gráfico de férias por residente
  const feriasPorResidente = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    return residentes.map(residente => {
      const feriasResidente = ferias.filter(f => 
        f.residenteEmail === residente.email && 
        new Date(f.dataInicio).getFullYear() === currentYear
      );
      
      const periodos = feriasResidente.map(f => {
        const dataInicio = new Date(f.dataInicio);
        const dataFim = new Date(f.dataFim);
        // Calcular diferença em dias incluindo ambos os dias
        const diffTime = dataFim.getTime() - dataInicio.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        return {
          dataInicio,
          dataFim,
          duracao: diffDays
        };
      });
      
      const totalDias = periodos.reduce((total, periodo) => total + periodo.duracao, 0);
      
      return {
        residente,
        ferias: feriasResidente,
        totalDias,
        periodos
      };
    }).filter(item => item.totalDias > 0).sort((a, b) => b.totalDias - a.totalDias);
  }, [ferias, residentes]);

  // Calcular dados para o gráfico de Gantt
  const dadosGantt = useMemo(() => {
    const inicioMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const fimMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
    const diasNoMes = fimMes.getDate();
    
    // Filtrar férias que se sobrepõem com o mês
    const feriasDoMes = ferias.filter(f => {
      const dataInicio = new Date(f.dataInicio);
      const dataFim = new Date(f.dataFim);
      return (dataInicio <= fimMes && dataFim >= inicioMes) && f.status === 'aprovada';
    });
    
    // Agrupar por residente e calcular posições das barras
    const residentesComFerias = feriasDoMes.map(f => {
      const residente = residentes.find(r => r.email === f.residenteEmail);
      if (!residente) return null;
      
      const dataInicio = new Date(f.dataInicio);
      const dataFim = new Date(f.dataFim);
      
      // Calcular posição e largura da barra no gráfico
      const diaInicio = Math.max(1, dataInicio.getDate());
      const diaFim = Math.min(diasNoMes, dataFim.getDate());
      
      // Corrigir cálculo: se a férias começa antes do mês, ajustar posição
      let posicao, largura;
      if (dataInicio < inicioMes) {
        // Férias começou antes do mês
        posicao = 0;
        largura = diaFim; // Largura vai do dia 1 até diaFim
      } else if (dataFim > fimMes) {
        // Férias termina depois do mês
        posicao = diaInicio - 1;
        largura = diasNoMes - diaInicio + 1; // Largura vai do diaInicio até o fim do mês
      } else {
        // Férias totalmente dentro do mês
        posicao = diaInicio - 1;
        largura = diaFim - diaInicio + 1;
      }
      
      return {
        residente,
        ferias: f,
        diaInicio,
        diaFim,
        largura,
        posicao,
        dataInicio,
        dataFim,
        duracao: largura // Usar a largura calculada corretamente
      };
    }).filter(Boolean);
    
    // Agrupar por residente para combinar múltiplas férias
    const residentesAgrupados = new Map();
    residentesComFerias.forEach(item => {
      if (!residentesAgrupados.has(item.residente.id)) {
        residentesAgrupados.set(item.residente.id, {
          residente: item.residente,
          ferias: []
        });
      }
      residentesAgrupados.get(item.residente.id).ferias.push(item);
    });
    
    // Ordenar residentes por nível (R1, R2, R3)
    const residentesOrdenados = Array.from(residentesAgrupados.values()).sort((a, b) => {
      const nivelA = a.residente.nivel;
      const nivelB = b.residente.nivel;
      
      // Ordem: R1, R2, R3
      const ordem = { 'R1': 1, 'R2': 2, 'R3': 3 };
      const ordemA = ordem[nivelA] || 4;
      const ordemB = ordem[nivelB] || 4;
      
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      
      // Se mesmo nível, ordenar por nome
      return a.residente.nome.localeCompare(b.residente.nome);
    });
    
    return {
      diasNoMes,
      residentes: residentesOrdenados,
      inicioMes,
      fimMes
    };
  }, [ferias, residentes, mesAtual]);

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


  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const hoje = new Date();
  const ehMesAtual = mesAtual.getMonth() === hoje.getMonth() && mesAtual.getFullYear() === hoje.getFullYear();

  return (
    <div className="space-y-6">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h4 className="text-lg font-medium text-gray-900">
            Calendário de Férias
          </h4>
          {!ehMesAtual && (
            <button
              onClick={irParaMesAtual}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Voltar ao mês atual
            </button>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {dadosGantt.residentes.length} residente{dadosGantt.residentes.length !== 1 ? 's' : ''} de férias
        </div>
      </div>

      {/* Navegação do Mês */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <button
          onClick={irParaMesAnterior}
          className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Mês Anterior</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {nomesMeses[mesAtual.getMonth()]} {mesAtual.getFullYear()}
          </h3>
          {ehMesAtual && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              Mês Atual
            </span>
          )}
        </div>
        
        <button
          onClick={irParaProximoMes}
          className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        >
          <span className="text-sm font-medium">Próximo Mês</span>
          <ChevronRight className="h-5 w-5" />
        </button>
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

      {/* Gráfico de Gantt */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {dadosGantt.residentes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma férias neste mês</h3>
            <p className="mt-1 text-sm text-gray-500">Não há férias aprovadas para {nomesMeses[mesAtual.getMonth()]} {mesAtual.getFullYear()}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cabeçalho com dias do mês */}
            <div className="flex mb-4">
              <div className="w-48 flex-shrink-0"></div> {/* Espaço para nomes dos residentes */}
              <div className="flex-1 flex">
                {Array.from({ length: dadosGantt.diasNoMes }, (_, i) => i + 1).map(dia => (
                  <div key={dia} className="flex-1 text-center text-xs font-medium text-gray-600 py-2 border-r border-gray-200 min-w-0">
                    {dia}
                  </div>
                ))}
              </div>
            </div>

            {/* Linhas dos residentes */}
            {dadosGantt.residentes.map((item) => (
              <div key={item.residente.id} className="flex items-center mb-2">
                {/* Nome do residente */}
                <div className="w-48 flex-shrink-0 flex items-center space-x-3 pr-4">
                  <div className={`w-3 h-3 rounded-full ${getNivelColor(item.residente.nivel)}`}></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.residente.nome}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getNivelColor(item.residente.nivel)} text-white flex-shrink-0`}>
                        {item.residente.nivel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.ferias.length} período{item.ferias.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Barras de férias */}
                <div className="flex-1 relative h-8 bg-gray-50 rounded border">
                  {item.ferias.map((feriasItem, index) => (
                    <div
                      key={`${feriasItem.ferias.id}-${index}`}
                      className={`absolute h-full ${getNivelColor(item.residente.nivel)} rounded-sm border border-white shadow-sm`}
                      style={{
                        left: `${(feriasItem.posicao / dadosGantt.diasNoMes) * 100}%`,
                        width: `${(feriasItem.largura / dadosGantt.diasNoMes) * 100}%`,
                        zIndex: 10
                      }}
                      title={`${item.residente.nome} - ${feriasItem.dataInicio.toLocaleDateString('pt-BR')} a ${feriasItem.dataFim.toLocaleDateString('pt-BR')} (${feriasItem.duracao} dias)`}
                    >
                      <div className="flex items-center justify-center h-full">
                        <span className="text-xs font-medium text-white truncate px-1">
                          {feriasItem.duracao}d
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo Anual (mantido do layout anterior) */}
      {feriasPorResidente.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h5 className="text-lg font-medium text-gray-900 mb-4">Resumo Anual {new Date().getFullYear()}</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(conflitosPorNivel).map(([nivel, residentes]) => {
              if (residentes.length === 0) return null;
              
              const totalDiasNivel = residentes.reduce((total, item) => total + item.totalDias, 0);
              
              return (
                <div key={nivel} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${getNivelColor(nivel)}`}></div>
                    <h6 className="font-medium text-gray-900">{nivel}</h6>
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
        </div>
      )}
    </div>
  );
}
