'use client';

import { useState, useEffect } from 'react';
import { MetricasEvolucao } from '@/types/calendario';
import { MetricasService } from '@/services/metricasService';
import { BarChart3, Users, Activity, TrendingUp, RefreshCw } from 'lucide-react';

export default function DashboardEvolucao() {
  const [metricas, setMetricas] = useState<MetricasEvolucao | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMetricas = async () => {
    setLoading(true);
    try {
      const metricasData = await MetricasService.calcularMetricas();
      setMetricas(metricasData);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetricas();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Carregando métricas...</p>
      </div>
    );
  }

  if (!metricas) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Não foi possível carregar as métricas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-2" size={28} />
            Dashboard de Evolução
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Indicadores globais do tratamento com Tirzepatida
          </p>
        </div>
        <button
          onClick={loadMetricas}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Pacientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metricas.totalPacientes}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Aplicações</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metricas.totalAplicacoes}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Activity size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de mg Aplicadas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metricas.totalMgAplicadas.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Média mg por Paciente</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metricas.mediaMgPorPaciente.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <BarChart3 size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Ciclo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribuição por Ciclo de Tratamento
          </h3>
          {metricas.distribuicaoCiclos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhum dado disponível
            </p>
          ) : (
            <div className="space-y-3">
              {metricas.distribuicaoCiclos.map((item) => (
                <div key={item.ciclo} className="flex items-center">
                  <div className="w-16 text-sm font-medium text-gray-700">
                    {item.ciclo}ª aplicação
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${(item.quantidade / metricas.totalAplicacoes) * 100}%`,
                        }}
                      >
                        <span className="text-xs font-medium text-white">
                          {item.quantidade}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progresso Mensal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Progresso Mensal
          </h3>
          {metricas.progressoMensal.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhum dado disponível
            </p>
          ) : (
            <div className="space-y-4">
              {metricas.progressoMensal.slice(-6).map((item) => {
                const maxMg = Math.max(...metricas.progressoMensal.map(p => p.totalMg));
                return (
                  <div key={item.mes}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(item.mes + '-01').toLocaleDateString('pt-BR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-sm text-gray-600">
                        {item.totalMg.toFixed(1)} mg | {item.totalPacientes} paciente(s)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full"
                        style={{
                          width: `${(item.totalMg / maxMg) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

