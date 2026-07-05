'use client';

import { useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  FaseTratamentoSegmento,
  MarcoClinicoGrafico,
  PontoGraficoTratamento,
} from '@/lib/treatment-designer/types';
import { coresFaseGrafico } from '@/lib/treatment-designer/graficoPlano';

export type ModoGraficoPlano = 'peso' | 'dose' | 'acompanhamento' | 'marcos';

type Props = {
  dados: PontoGraficoTratamento[];
  chartId: string;
  rotuloLinhaAlvo?: string;
  marcosClinicos?: MarcoClinicoGrafico[];
  fases?: FaseTratamentoSegmento[];
};

type MarcadorTimelineUi = PontoGraficoTratamento['marcadores'][number];

const COR_MARCADOR: Record<MarcadorTimelineUi['tipo'], string> = {
  consulta: '#2563eb',
  bioimpedancia: '#7c3aed',
  exame: '#0891b2',
  reavaliacao: '#64748b',
};

const ROTULO_MARCADOR: Record<MarcadorTimelineUi['tipo'], string> = {
  consulta: 'Consultas',
  bioimpedancia: 'Bioimpedâncias',
  exame: 'Análise de Exames',
  reavaliacao: 'Reavaliações',
};

const MODOS_GRAFICO: { id: ModoGraficoPlano; label: string }[] = [
  { id: 'peso', label: 'Peso' },
  { id: 'dose', label: 'Dose' },
  { id: 'acompanhamento', label: 'Acompanhamento' },
  { id: 'marcos', label: 'Marcos' },
];

const TEXTO_RODAPE: Record<ModoGraficoPlano, string> = {
  peso: 'Esta é uma estimativa. A evolução individual pode variar.',
  dose: 'A dose é definida e ajustada pelo médico conforme resposta clínica e tolerabilidade.',
  acompanhamento:
    'Estes pontos indicam momentos previstos de acompanhamento durante o plano.',
  marcos: 'Os marcos ajudam a acompanhar a evolução do tratamento ao longo do tempo.',
};

type VisibilidadeModo = {
  faixa: boolean;
  meta: boolean;
  dose: boolean;
  marcadores: boolean;
  marcos: boolean;
  fases: boolean;
  pesoLinha: boolean;
  pesoDestaque: 'alto' | 'suave' | 'discreto';
  doseAxis: boolean;
};

function visibilidadePorModo(modo: ModoGraficoPlano): VisibilidadeModo {
  switch (modo) {
    case 'dose':
      return {
        faixa: false,
        meta: false,
        dose: true,
        marcadores: false,
        marcos: false,
        fases: true,
        pesoLinha: true,
        pesoDestaque: 'discreto',
        doseAxis: true,
      };
    case 'acompanhamento':
      return {
        faixa: false,
        meta: false,
        dose: false,
        marcadores: true,
        marcos: false,
        fases: false,
        pesoLinha: true,
        pesoDestaque: 'suave',
        doseAxis: false,
      };
    case 'marcos':
      return {
        faixa: false,
        meta: true,
        dose: false,
        marcadores: false,
        marcos: true,
        fases: false,
        pesoLinha: true,
        pesoDestaque: 'alto',
        doseAxis: false,
      };
    case 'peso':
    default:
      return {
        faixa: true,
        meta: true,
        dose: false,
        marcadores: false,
        marcos: false,
        fases: false,
        pesoLinha: true,
        pesoDestaque: 'alto',
        doseAxis: false,
      };
  }
}

type TooltipContentProps = {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  rotuloLinhaAlvo: string;
  modo: ModoGraficoPlano;
};

function ConteudoTooltipGrafico({
  active,
  payload,
  rotuloLinhaAlvo,
  modo,
}: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as
    | (PontoGraficoTratamento & Partial<MarcoClinicoGrafico>)
    | undefined;
  if (!row) return null;

  if (modo === 'marcos' && row.rotuloCurto) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-slate-900">{row.rotuloCurto}</p>
        <p className="text-slate-500 mt-0.5">Semana {row.semana}</p>
      </div>
    );
  }

  const base = row.semana === 0 ? 'Início do plano' : `Semana ${row.semana}`;
  const linhas: { rotulo: string; valor: string }[] = [];

  if (modo !== 'dose' && row.pesoPrevisto != null) {
    linhas.push({
      rotulo: 'Peso estimado',
      valor: `${row.pesoPrevisto.toFixed(1)} kg`,
    });
  }

  if (modo === 'dose' && row.doseSemanalMg != null && row.doseSemanalMg > 0) {
    linhas.push({
      rotulo: 'Dose semanal prevista',
      valor: `${row.doseSemanalMg.toFixed(1)} mg`,
    });
  }

  if (modo === 'acompanhamento' && row.marcadores?.length) {
    linhas.push({
      rotulo: 'Acompanhamento',
      valor: row.marcadores.map((m) => m.rotulo).join(', '),
    });
  }

  if ((modo === 'peso' || modo === 'marcos') && row.pesoAlvo != null) {
    linhas.push({
      rotulo: rotuloLinhaAlvo,
      valor: `${row.pesoAlvo.toFixed(1)} kg`,
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md max-w-[220px]">
      <p className="font-medium text-slate-700 mb-1">{base}</p>
      {linhas.map((l) => (
        <p key={l.rotulo} className="text-slate-600">
          {l.rotulo}: <span className="font-medium text-slate-900">{l.valor}</span>
        </p>
      ))}
    </div>
  );
}

function MarcoClinicoDot({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      <circle cx={cx} cy={cy} r={3.5} fill="#fff" stroke="#d97706" strokeWidth={2} />
    </g>
  );
}

function LegendaModo({
  modo,
  fasesRender,
}: {
  modo: ModoGraficoPlano;
  fasesRender: { id: string; rotulo: string; cor: string }[];
}) {
  if (modo === 'peso') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 rounded bg-emerald-600" />
          Caminho esperado do peso
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-400/60" />
          Faixa esperada de resposta
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
          Meta do plano
        </span>
      </div>
    );
  }

  if (modo === 'dose') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-pink-200 border border-pink-400" />
          Dose semanal prevista
        </span>
        {fasesRender.map((fase) => (
          <span key={fase.id} className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border border-slate-200/80"
              style={{ backgroundColor: fase.cor }}
            />
            {fase.rotulo}
          </span>
        ))}
        {fasesRender.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            Fases do tratamento
          </span>
        ) : null}
      </div>
    );
  }

  if (modo === 'acompanhamento') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
        {(Object.keys(ROTULO_MARCADOR) as MarcadorTimelineUi['tipo'][]).map((tipo) => (
          <span key={tipo} className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COR_MARCADOR[tipo] }} />
            {ROTULO_MARCADOR[tipo]}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-600 bg-white" />
        Marcos de evolução
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
        Meta do plano
      </span>
    </div>
  );
}

export default function PlanoTerapeuticoGraficoPrevisto({
  dados,
  chartId,
  rotuloLinhaAlvo = 'Peso alvo',
  marcosClinicos = [],
  fases = [],
}: Props) {
  const [modoGrafico, setModoGrafico] = useState<ModoGraficoPlano>('peso');

  if (dados.length === 0) return null;

  const vis = visibilidadePorModo(modoGrafico);

  const dadosPlot = dados.map((d) => ({
    ...d,
    pesoFaixaAmplitude:
      d.pesoPerdaMaxKg != null && d.pesoPerdaMinKg != null
        ? Math.max(0, Math.round((d.pesoPerdaMaxKg - d.pesoPerdaMinKg) * 10) / 10)
        : 0,
  }));

  const marcosPorSemana = new Map(marcosClinicos.map((m) => [m.semana, m]));
  const dadosComMarcos = dadosPlot.map((d) => {
    const marco = marcosPorSemana.get(d.semana);
    if (!marco) return d;
    return {
      ...d,
      pesoMarco: marco.pesoKg,
      rotuloCurto: marco.rotuloCurto,
    };
  });

  const comDose = dadosPlot.filter((d) => d.semana > 0);
  const maxDose = comDose.reduce((m, p) => Math.max(m, p.doseSemanalMg), 0);
  const maxDoseAxis = maxDose > 0 ? Math.ceil(maxDose * 1.35 / 2.5) * 2.5 : 15;
  const doseTicks = [2.5, 5, 7.5, 10, 12.5, 15].filter((v) => v <= maxDoseAxis);

  const marcadoresUnicos = dadosPlot.flatMap((d) =>
    d.marcadores.map((m) => ({
      ...m,
      semanaLabel: d.semanaLabel,
      pesoY: d.pesoPrevisto,
    }))
  );

  const patternId = `dosePlano_${chartId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const dosePink = '#ec4899';
  const dosePinkSoft = 'rgba(236,72,153,0.16)';
  const pesoVerde = '#059669';
  const faixaVerde = 'rgba(5, 150, 105, 0.18)';

  const pesoStrokeWidth =
    vis.pesoDestaque === 'alto' ? 2.5 : vis.pesoDestaque === 'suave' ? 1.75 : 1;
  const pesoStrokeOpacity =
    vis.pesoDestaque === 'alto' ? 1 : vis.pesoDestaque === 'suave' ? 0.45 : 0.22;

  const labelSemana = (semana: number) => (semana === 0 ? 'Início' : `S${semana}`);
  const coresFase = coresFaseGrafico();

  const fasesRender = (fases.length > 0 ? fases : [])
    .filter((fase) => fase.semanaFim > fase.semanaInicio)
    .map((fase) => ({
      ...fase,
      cor: coresFase[fase.id],
    }));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-medium text-slate-500 mb-1.5 sm:mb-2 sm:text-xs">Visualizar:</p>
        <div
          className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scroll-smooth"
          role="tablist"
          aria-label="Modo de visualização do gráfico"
        >
          {MODOS_GRAFICO.map((modo) => {
            const ativo = modoGrafico === modo.id;
            return (
              <button
                key={modo.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setModoGrafico(modo.id)}
                className={`shrink-0 min-h-[34px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:min-h-[40px] sm:px-4 sm:py-2 sm:text-sm ${
                  ativo
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {modo.label}
              </button>
            );
          })}
        </div>
      </div>

      <LegendaModo modo={modoGrafico} fasesRender={fasesRender} />

      <div className="h-[22rem] sm:h-[26rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dadosComMarcos} margin={{ top: 20, right: 12, left: 4, bottom: 8 }}>
            <defs>
              <pattern id={patternId} patternUnits="userSpaceOnUse" width={10} height={10}>
                <rect width="10" height="10" fill={dosePinkSoft} />
                <path
                  d="M0 10 L10 0 M-2 2 L2 -2 M8 12 L12 8"
                  stroke={dosePink}
                  strokeWidth={1}
                  strokeOpacity={0.7}
                />
              </pattern>
              <linearGradient id={`${patternId}_area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pesoVerde} stopOpacity={0.2} />
                <stop offset="100%" stopColor={pesoVerde} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            {vis.fases &&
              fasesRender.map((fase) => (
                <ReferenceArea
                  key={fase.id}
                  x1={labelSemana(fase.semanaInicio)}
                  x2={labelSemana(fase.semanaFim)}
                  yAxisId="peso"
                  fill={fase.cor}
                  strokeOpacity={0}
                  ifOverflow="extendDomain"
                />
              ))}
            <XAxis
              dataKey="semanaLabel"
              tick={{ fontSize: 10, fill: '#64748b' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="peso"
              tick={{ fontSize: 11, fill: '#64748b' }}
              unit=" kg"
              width={44}
            />
            {vis.doseAxis ? (
              <YAxis
                yAxisId="dose"
                orientation="right"
                tick={{ fontSize: 11, fill: dosePink }}
                unit=" mg"
                domain={[0, maxDoseAxis]}
                ticks={doseTicks.length > 0 ? doseTicks : [2.5, 5, 7.5]}
                width={44}
              />
            ) : null}
            <Tooltip
              content={
                <ConteudoTooltipGrafico rotuloLinhaAlvo={rotuloLinhaAlvo} modo={modoGrafico} />
              }
            />
            {vis.faixa ? (
              <>
                <Area
                  yAxisId="peso"
                  type="monotone"
                  dataKey="pesoPerdaMinKg"
                  stackId="faixaPerda"
                  stroke="none"
                  fill="transparent"
                  connectNulls
                  isAnimationActive={false}
                  legendType="none"
                />
                <Area
                  yAxisId="peso"
                  type="monotone"
                  dataKey="pesoFaixaAmplitude"
                  stackId="faixaPerda"
                  stroke="none"
                  fill={faixaVerde}
                  connectNulls
                  isAnimationActive={false}
                  legendType="none"
                />
                <Line
                  yAxisId="peso"
                  type="monotone"
                  dataKey="pesoPerdaMaxKg"
                  stroke="#34d399"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  legendType="none"
                />
                <Line
                  yAxisId="peso"
                  type="monotone"
                  dataKey="pesoPerdaMinKg"
                  stroke="#047857"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  legendType="none"
                />
              </>
            ) : null}
            {vis.pesoLinha && vis.pesoDestaque === 'alto' ? (
              <Area
                yAxisId="peso"
                type="monotone"
                dataKey="pesoPrevisto"
                fill={`url(#${patternId}_area)`}
                stroke="none"
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            {vis.pesoLinha ? (
              <Line
                yAxisId="peso"
                type="monotone"
                dataKey="pesoPrevisto"
                stroke={pesoVerde}
                strokeWidth={pesoStrokeWidth}
                strokeOpacity={pesoStrokeOpacity}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            {vis.meta ? (
              <Line
                yAxisId="peso"
                type="monotone"
                dataKey="pesoAlvo"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            {vis.marcos ? (
              <Line
                yAxisId="peso"
                type="monotone"
                dataKey="pesoMarco"
                stroke="none"
                dot={({ cx, cy, payload }) => {
                  const p = payload as { rotuloCurto?: string };
                  if (!p.rotuloCurto || cx == null || cy == null) return null;
                  return <MarcoClinicoDot cx={cx} cy={cy} />;
                }}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
                legendType="none"
              />
            ) : null}
            {vis.dose ? (
              <Bar
                yAxisId="dose"
                dataKey="doseSemanalMg"
                barSize={Math.min(20, Math.max(6, 300 / Math.max(comDose.length, 1)))}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {dadosPlot.map((entry) => (
                  <Cell
                    key={`dose-${entry.semana}`}
                    fill={entry.semana === 0 ? 'transparent' : `url(#${patternId})`}
                    stroke={entry.semana === 0 ? 'transparent' : dosePink}
                    strokeWidth={entry.semana === 0 ? 0 : 1}
                  />
                ))}
              </Bar>
            ) : null}
            {vis.marcadores &&
              marcadoresUnicos.map((m, idx) => {
                if (m.pesoY == null) return null;
                return (
                  <ReferenceDot
                    key={`mk-${m.tipo}-${m.semana}-${idx}`}
                    x={m.semanaLabel}
                    y={m.pesoY}
                    yAxisId="peso"
                    r={5}
                    fill={COR_MARCADOR[m.tipo]}
                    stroke="#fff"
                    strokeWidth={1.5}
                    isFront
                  />
                );
              })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
        {TEXTO_RODAPE[modoGrafico]}
      </p>
    </div>
  );
}
