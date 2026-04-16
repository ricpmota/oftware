'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Weight, Activity, Calendar, RefreshCw } from 'lucide-react';
import { PacienteCompleto } from '@/types/obesidade';
import { buildExpectedCurveDoseDrivenAnchored, buildSuggestedDoseSchedule } from '@/utils/expectedCurve';

interface LayoutMinimalistaProps {
  paciente: PacienteCompleto;
}

export default function LayoutMinimalista({ paciente }: LayoutMinimalistaProps) {
  const evolucao = paciente?.evolucaoSeguimento || [];
  const planoTerapeutico = paciente?.planoTerapeutico;
  const medidasIniciais = paciente?.dadosClinicos?.medidasIniciais;

  // Calcular estatísticas
  const semanasTratamento = evolucao.length;
  const pesoInicial = medidasIniciais?.peso || 0;
  
  // Peso Atual: sempre do último registro de aplicação (evolucaoSeguimento) ordenado por data
  let ultimoPeso: number | null = null;
  if (evolucao.length > 0) {
    const evolucaoOrdenada = [...evolucao].sort((a, b) => {
      const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
      const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
      return dataB - dataA; // Mais recente primeiro
    });
    
    const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
    ultimoPeso = ultimoRegistroComPeso?.peso || null;
  }
  
  // Perda de Peso Acumulado: Peso da última medição - Peso inicial do paciente
  const perdaPesoAcumulado = pesoInicial > 0 && ultimoPeso && ultimoPeso > 0 ? ultimoPeso - pesoInicial : 0;
  const hba1cAtual = evolucao.length > 0 ? evolucao[evolucao.length - 1]?.hba1c || 0 : 0;
  const ultimaCircunferencia = evolucao.length > 0 ? (evolucao[evolucao.length - 1]?.circunferenciaAbdominal || null) : null;
  const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
  const imcAtual = alturaMetros && ultimoPeso && ultimoPeso > 0 ? ultimoPeso / (alturaMetros * alturaMetros) : null;

  // Preparar dados
  const seguimentoOrdem = evolucao.sort((a, b) => {
    const dateA = new Date(a.dataRegistro);
    const dateB = new Date(b.dataRegistro);
    return dateA.getTime() - dateB.getTime();
  });

  const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
  const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
  const suggestedSchedule = buildSuggestedDoseSchedule(1, [2.5, 5, 7.5, 10, 12.5, 15], 4);
  const totalSemanasGrafico = planoTerapeutico?.numeroSemanasTratamento || 18;

  const expectedCurve = buildExpectedCurveDoseDrivenAnchored({
    baselineWeightKg: baselineWeight,
    doseSchedule: suggestedSchedule,
    totalWeeks: totalSemanasGrafico,
    targetType: planoTerapeutico?.metas?.weightLossTargetType,
    targetValue: planoTerapeutico?.metas?.weightLossTargetValue || 0,
    useAnchorWeek: 18,
    useAnchorPct: 9.0
  });

  const progressoData = seguimentoOrdem.map((s) => ({
    semana: s.weekIndex,
    peso: s.peso || null
  }));

  const ultimas4Semanas = seguimentoOrdem.slice(-4);
  const pesoChartData = ultimas4Semanas.map((s) => {
    const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
    return {
      semana: s.weekIndex,
      previsto: expectedWeek?.expectedWeightKg || null,
      real: s.peso || null
    };
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Minimalista */}
      <div className="text-center pb-8 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-light text-gray-900 dark:text-white mb-2">Estatísticas de Tratamento</h1>
        <p className="text-gray-500 dark:text-gray-400 font-light">Acompanhamento do seu progresso</p>
      </div>

      {/* Métricas Principais - Design Limpo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <BarChart3 className="h-6 w-6 text-gray-400 mx-auto mb-3" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Semanas</p>
          <p className="text-2xl font-light text-gray-900 dark:text-white">{semanasTratamento}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <Weight className="h-6 w-6 text-gray-400 mx-auto mb-3" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Peso Atual</p>
          <p className="text-2xl font-light text-gray-900 dark:text-white">
            {ultimoPeso && ultimoPeso > 0 ? `${ultimoPeso.toFixed(1)} kg` : '-'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <Activity className="h-6 w-6 text-gray-400 mx-auto mb-3" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Perda Acumulada</p>
          <p className="text-2xl font-light text-gray-900 dark:text-white">{perdaPesoAcumulado.toFixed(1)} kg</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <Activity className="h-6 w-6 text-gray-400 mx-auto mb-3" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">IMC Atual</p>
          <p className="text-2xl font-light text-gray-900 dark:text-white">{imcAtual ? imcAtual.toFixed(1) : '-'}</p>
        </div>
      </div>

      {/* Gráfico Principal - Simples e Elegante */}
      {progressoData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          <h2 className="text-lg font-light text-gray-900 dark:text-white mb-6 text-center">Evolução do Peso</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="semana" 
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '12px',
                    padding: '8px'
                  }}
                  formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)} kg` : 'N/A'}
                />
                <Line 
                  type="monotone" 
                  dataKey="peso" 
                  stroke="#4b5563" 
                  strokeWidth={2}
                  dot={{ fill: '#4b5563', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráfico Comparativo - Últimas 4 Semanas */}
      {pesoChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          <h2 className="text-lg font-light text-gray-900 dark:text-white mb-6 text-center">Últimas 4 Semanas: Real vs Previsto</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pesoChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="semana" 
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="previsto" 
                  stroke="#9ca3af" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#9ca3af', r: 3 }}
                  name="Previsto"
                />
                <Line 
                  type="monotone" 
                  dataKey="real" 
                  stroke="#4b5563" 
                  strokeWidth={2}
                  dot={{ fill: '#4b5563', r: 4 }}
                  name="Real"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Métricas Secundárias - Layout Horizontal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">HbA1c</p>
          </div>
          <p className="text-xl font-light text-gray-900 dark:text-white">
            {hba1cAtual > 0 ? `${hba1cAtual.toFixed(1)}%` : '-'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Circunferência</p>
          </div>
          <p className="text-xl font-light text-gray-900 dark:text-white">
            {ultimaCircunferencia && ultimaCircunferencia > 0 ? `${ultimaCircunferencia.toFixed(1)} cm` : '-'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <Weight className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Peso Inicial</p>
          </div>
          <p className="text-xl font-light text-gray-900 dark:text-white">
            {pesoInicial > 0 ? `${pesoInicial.toFixed(1)} kg` : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
