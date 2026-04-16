'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { BarChart3, RefreshCw, Calendar, Activity, Weight, TrendingUp, TrendingDown, Target, Award } from 'lucide-react';
import { PacienteCompleto } from '@/types/obesidade';
import { buildExpectedCurveDoseDrivenAnchored, buildSuggestedDoseSchedule } from '@/utils/expectedCurve';

interface LayoutModernoProps {
  paciente: PacienteCompleto;
}

export default function LayoutModerno({ paciente }: LayoutModernoProps) {
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
  const perdaPesoPercentual = pesoInicial > 0 ? (perdaPesoAcumulado / pesoInicial) * 100 : 0;
  const hba1cAtual = evolucao.length > 0 ? evolucao[evolucao.length - 1]?.hba1c || 0 : 0;
  const ultimaCircunferencia = evolucao.length > 0 ? (evolucao[evolucao.length - 1]?.circunferenciaAbdominal || null) : null;
  const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
  const imcAtual = alturaMetros && ultimoPeso && ultimoPeso > 0 ? ultimoPeso / (alturaMetros * alturaMetros) : null;
  const imcInicial = alturaMetros && pesoInicial > 0 ? pesoInicial / (alturaMetros * alturaMetros) : null;
  const reducaoIMC = imcInicial && imcAtual ? imcInicial - imcAtual : 0;

  // Preparar dados para gráficos
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

  const ultimas4Semanas = seguimentoOrdem.slice(-4);
  const pesoChartData = ultimas4Semanas.map((s) => {
    const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
    return {
      semana: `Sem ${s.weekIndex}`,
      previsto: expectedWeek?.expectedWeightKg || null,
      real: s.peso || null
    };
  });

  const baseCircAbdominal = primeiroRegistro?.circunferenciaAbdominal || medidasIniciais?.circunferenciaAbdominal || 0;
  const circData = ultimas4Semanas.map((s) => {
    const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
    const previsto = expectedWeek?.expectedCumulativePct 
      ? baseCircAbdominal * (1 - expectedWeek.expectedCumulativePct / 100)
      : null;
    return {
      semana: `Sem ${s.weekIndex}`,
      circunferencia: s.circunferenciaAbdominal || null,
      previsto: previsto
    };
  });

  // Dados para gráfico de progresso geral
  const progressoData = seguimentoOrdem.map((s, index) => ({
    semana: s.weekIndex,
    peso: s.peso || null,
    perdaPeso: pesoInicial > 0 && s.peso ? pesoInicial - s.peso : null
  }));

  return (
    <div className="space-y-6">
      {/* Header com título grande */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
        <h1 className="text-4xl font-bold mb-2">Dashboard de Tratamento</h1>
        <p className="text-blue-100 text-lg">Acompanhe sua evolução em tempo real</p>
      </div>

      {/* Cards de Estatísticas Principais - Layout Grande */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card Peso */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <Weight className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            <TrendingDown className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Peso Atual</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {ultimoPeso && ultimoPeso > 0 ? `${ultimoPeso.toFixed(1)} kg` : '-'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Inicial: {pesoInicial > 0 ? `${pesoInicial.toFixed(1)} kg` : '-'}
          </p>
        </div>

        {/* Card Perda de Peso */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-2xl p-6 shadow-lg border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-4">
            <Award className="h-10 w-10 text-green-600 dark:text-green-400" />
            <TrendingDown className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Perda de Peso</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {perdaPesoAcumulado.toFixed(1)} kg
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {perdaPesoPercentual.toFixed(1)}% do peso inicial
          </p>
        </div>

        {/* Card IMC */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-6 shadow-lg border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            {reducaoIMC > 0 && <TrendingDown className="h-6 w-6 text-green-600" />}
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">IMC Atual</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {imcAtual ? imcAtual.toFixed(1) : '-'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {reducaoIMC > 0 ? `Redução: ${reducaoIMC.toFixed(1)}` : 'Sem dados'}
          </p>
        </div>

        {/* Card Semanas */}
        <div className="bg-gradient-to-br from-orange-50 to-pink-100 dark:from-orange-900/20 dark:to-pink-800/20 rounded-2xl p-6 shadow-lg border-2 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Semanas</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {semanasTratamento}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Em tratamento
          </p>
        </div>
      </div>

      {/* Gráfico Principal - Progresso Completo */}
      {progressoData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Evolução do Peso</h2>
            <Target className="h-6 w-6 text-gray-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressoData}>
                <defs>
                  <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="semana" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: any) => value !== null ? `${parseFloat(value).toFixed(1)} kg` : 'N/A'}
                />
                <Area 
                  type="monotone" 
                  dataKey="peso" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fill="url(#colorPeso)"
                  name="Peso (kg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráficos Secundários - Grid 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Peso - Últimas 4 Semanas */}
        {baselineWeight > 0 && pesoChartData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Peso: Real vs Previsto</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pesoChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="previsto" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Previsto"
                    dot={{ fill: '#6366f1', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="real" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Real"
                    dot={{ fill: '#10b981', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfico Circunferência */}
        {baseCircAbdominal > 0 && circData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Circunferência Abdominal</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={circData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="circunferencia" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    name="Real"
                    dot={{ fill: '#f59e0b', r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="previsto" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Previsto"
                    dot={{ fill: '#6366f1', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Cards de Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-6 shadow-lg border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">HbA1c Atual</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {hba1cAtual > 0 ? `${hba1cAtual.toFixed(1)}%` : '-'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-xl p-6 shadow-lg border border-teal-200 dark:border-teal-800">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Circunferência</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {ultimaCircunferencia && ultimaCircunferencia > 0 ? `${ultimaCircunferencia.toFixed(1)} cm` : '-'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 rounded-xl p-6 shadow-lg border border-rose-200 dark:border-rose-800">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Meta de Perda</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {planoTerapeutico?.metas?.weightLossTargetValue 
              ? `${planoTerapeutico.metas.weightLossTargetValue}%`
              : '-'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
