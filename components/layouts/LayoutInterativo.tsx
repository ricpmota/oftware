'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BarChart3, Weight, Activity, Calendar, RefreshCw, TrendingUp, TrendingDown, Target, Award, Zap, Sparkles, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { PacienteCompleto } from '@/types/obesidade';
import { buildExpectedCurveDoseDrivenAnchored, buildSuggestedDoseSchedule } from '@/utils/expectedCurve';

interface LayoutInterativoProps {
  paciente: PacienteCompleto;
}

export default function LayoutInterativo({ paciente }: LayoutInterativoProps) {
  const [animatedValues, setAnimatedValues] = useState({
    peso: 0,
    perdaPeso: 0,
    imc: 0,
    semanas: 0
  });
  const [isAnimating, setIsAnimating] = useState(true);

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

  // Animação dos valores
  useEffect(() => {
    if (isAnimating) {
      const duration = 2000;
      const steps = 60;
      const stepTime = duration / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);

        setAnimatedValues({
          peso: (ultimoPeso || 0) * easeOut,
          perdaPeso: perdaPesoAcumulado * easeOut,
          imc: (imcAtual || 0) * easeOut,
          semanas: semanasTratamento * easeOut
        });

        if (currentStep >= steps) {
          setIsAnimating(false);
          clearInterval(interval);
        }
      }, stepTime);

      return () => clearInterval(interval);
    }
  }, [isAnimating, ultimoPeso, perdaPesoAcumulado, imcAtual, semanasTratamento]);

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
    peso: s.peso || null,
    perdaPeso: pesoInicial > 0 && s.peso ? pesoInicial - s.peso : null
  }));

  const ultimas4Semanas = seguimentoOrdem.slice(-4);
  const pesoChartData = ultimas4Semanas.map((s) => {
    const expectedWeek = expectedCurve.find(e => e.weekIndex === s.weekIndex);
    return {
      semana: `Sem ${s.weekIndex}`,
      previsto: expectedWeek?.expectedWeightKg || null,
      real: s.peso || null
    };
  });

  // Dados para radar chart (análise multidimensional)
  const radarData = [
    {
      subject: 'Peso',
      atual: imcAtual ? Math.min(100, (imcAtual / 50) * 100) : 0,
      meta: 70,
      fullMark: 100
    },
    {
      subject: 'IMC',
      atual: imcAtual ? Math.min(100, (imcAtual / 50) * 100) : 0,
      meta: 70,
      fullMark: 100
    },
    {
      subject: 'HbA1c',
      atual: hba1cAtual > 0 ? Math.min(100, (hba1cAtual / 10) * 100) : 0,
      meta: 50,
      fullMark: 100
    },
    {
      subject: 'Circunf.',
      atual: ultimaCircunferencia ? Math.min(100, (ultimaCircunferencia / 150) * 100) : 0,
      meta: 60,
      fullMark: 100
    },
    {
      subject: 'Progresso',
      atual: semanasTratamento > 0 ? Math.min(100, (semanasTratamento / 18) * 100) : 0,
      meta: 100,
      fullMark: 100
    }
  ];

  // Calcular insights
  const estaNoPrazo = perdaPesoPercentual >= (planoTerapeutico?.metas?.weightLossTargetValue || 0) * 0.8;
  const velocidadePerda = semanasTratamento > 0 ? perdaPesoAcumulado / semanasTratamento : 0;

  return (
    <div className="space-y-6">
      {/* Header Interativo */}
      <div className="relative bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Dashboard Interativo</h1>
              <p className="text-orange-100 text-lg">Visualizações avançadas e insights em tempo real</p>
            </div>
            <Zap className="h-12 w-12 text-yellow-300 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Cards Animados com Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <Weight className="h-10 w-10" />
            {perdaPesoAcumulado > 0 && <TrendingDown className="h-6 w-6 text-green-200" />}
          </div>
          <p className="text-sm text-blue-100 mb-1">Peso Atual</p>
          <p className="text-3xl font-bold mb-2">
            {isAnimating ? animatedValues.peso.toFixed(1) : (ultimoPeso?.toFixed(1) || '0')} kg
          </p>
          <div className="flex items-center gap-2 text-xs text-blue-100">
            <Info className="h-3 w-3" />
            <span>Inicial: {pesoInicial.toFixed(1)} kg</span>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <Award className="h-10 w-10" />
            <TrendingDown className="h-6 w-6 text-green-200" />
          </div>
          <p className="text-sm text-green-100 mb-1">Perda de Peso</p>
          <p className="text-3xl font-bold mb-2">
            {isAnimating ? animatedValues.perdaPeso.toFixed(1) : perdaPesoAcumulado.toFixed(1)} kg
          </p>
          <div className="flex items-center gap-2 text-xs text-green-100">
            <ArrowDownRight className="h-3 w-3" />
            <span>{perdaPesoPercentual.toFixed(1)}% do inicial</span>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-10 w-10" />
            {imcInicial && imcAtual && imcAtual < imcInicial && <TrendingDown className="h-6 w-6 text-purple-200" />}
          </div>
          <p className="text-sm text-purple-100 mb-1">IMC Atual</p>
          <p className="text-3xl font-bold mb-2">
            {isAnimating ? animatedValues.imc.toFixed(1) : (imcAtual?.toFixed(1) || '0')}
          </p>
          <div className="flex items-center gap-2 text-xs text-purple-100">
            <Sparkles className="h-3 w-3" />
            <span>Redução: {imcInicial && imcAtual ? (imcInicial - imcAtual).toFixed(1) : '0'}</span>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="h-10 w-10" />
            <TrendingUp className="h-6 w-6 text-orange-200" />
          </div>
          <p className="text-sm text-orange-100 mb-1">Semanas</p>
          <p className="text-3xl font-bold mb-2">
            {isAnimating ? Math.round(animatedValues.semanas) : semanasTratamento}
          </p>
          <div className="flex items-center gap-2 text-xs text-orange-100">
            <ArrowUpRight className="h-3 w-3" />
            <span>{velocidadePerda.toFixed(2)} kg/semana</span>
          </div>
        </div>
      </div>

      {/* Insights e Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-xl p-6 shadow-lg border-2 ${
          estaNoPrazo 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <Target className={`h-6 w-6 ${estaNoPrazo ? 'text-green-600' : 'text-yellow-600'}`} />
            <h3 className="font-bold text-gray-900 dark:text-white">Status da Meta</h3>
          </div>
          <p className={`text-sm ${estaNoPrazo ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
            {estaNoPrazo 
              ? `✅ Você está no caminho certo! ${perdaPesoPercentual.toFixed(1)}% de perda já alcançada.`
              : `⚠️ Continue focado! Você está em ${perdaPesoPercentual.toFixed(1)}% da meta.`
            }
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="h-6 w-6 text-blue-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">Velocidade de Perda</h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Você está perdendo em média <strong>{velocidadePerda.toFixed(2)} kg por semana</strong>, 
            o que é {velocidadePerda > 0.5 ? 'excelente' : 'bom'} para um tratamento seguro e sustentável.
          </p>
        </div>
      </div>

      {/* Gráfico Principal com Animações */}
      {progressoData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Evolução Completa do Tratamento</h2>
            <Sparkles className="h-6 w-6 text-purple-500" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressoData}>
                <defs>
                  <linearGradient id="colorPesoInterativo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
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
                  label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
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
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  fill="url(#colorPesoInterativo)"
                  name="Peso (kg)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Grid de Gráficos Comparativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Real vs Previsto */}
        {pesoChartData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Real vs Previsto (Últimas 4 Semanas)</h3>
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
                    animationDuration={1500}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="real" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Real"
                    dot={{ fill: '#10b981', r: 5 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Radar Chart - Análise Multidimensional */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Análise Multidimensional</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Radar 
                  name="Atual" 
                  dataKey="atual" 
                  stroke="#f59e0b" 
                  fill="#f59e0b" 
                  fillOpacity={0.6}
                  animationDuration={1500}
                />
                <Radar 
                  name="Meta" 
                  dataKey="meta" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                  strokeDasharray="5 5"
                  animationDuration={1500}
                />
                <Legend />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Métricas Secundárias com Hover Effects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <Calendar className="h-8 w-8 mb-3" />
          <p className="text-sm text-indigo-100 mb-1">HbA1c Atual</p>
          <p className="text-2xl font-bold">{hba1cAtual > 0 ? `${hba1cAtual.toFixed(1)}%` : '-'}</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <RefreshCw className="h-8 w-8 mb-3" />
          <p className="text-sm text-teal-100 mb-1">Circunferência</p>
          <p className="text-2xl font-bold">
            {ultimaCircunferencia && ultimaCircunferencia > 0 ? `${ultimaCircunferencia.toFixed(1)} cm` : '-'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <Target className="h-8 w-8 mb-3" />
          <p className="text-sm text-rose-100 mb-1">Meta de Perda</p>
          <p className="text-2xl font-bold">
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
