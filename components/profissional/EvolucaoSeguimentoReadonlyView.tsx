'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Syringe,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import {
  buildExpectedCurveDoseDrivenAnchored,
  buildSuggestedDoseSchedule,
  predictWaistCircumference,
} from '@/utils/expectedCurve';
import {
  dataPrevistaConclusaoComoEsquema,
  dataPrevistaSemanaComoEsquema,
  primeiraDoseDoPlano,
  semanaIndexConclusao,
  semanaInicioCicloDoPlano,
} from '@/utils/datasAplicacaoSemanaPlano';
import {
  buildHba1cChartData,
  temHbA1cNosExames,
} from '@/utils/buildHba1cChartData';
import { obterDoseMgSemanaPaciente } from '@/utils/esquemaDosesSemana';
import {
  listarSemanasTimelinePorProtocolo,
  protocoloDaSemanaGlobal,
  rotuloSemanaBadgeCalendario,
  semanaRelativaNoProtocolo,
} from '@/utils/tirzepatidaProtocoloDisplay';
import { ProtocoloAplicacoesGrupoCard } from '@/components/metaadmin/ProtocoloAplicacoesGrupoCard';
import { listDepoimentosSlidesFromPlano } from '@/utils/conclusaoTratamentoHistorico';
import {
  calcularVariacoesParaSeguimento,
  obterCheckInScoreDeRegistro,
  obterCheckInSemanalDetalheDeRegistro,
  type CheckInSemanalDetalhe,
} from '@/lib/aplicacao/resolveCheckInSemanalScore';
import {
  obterMarcoZeroDetalheDeRegistro,
  type MarcoZeroDetalhe,
} from '@/lib/aplicacao/resolveMarcoZeroDetalhe';
import { ProgressPill } from '@/components/ProgressPill';
import { AlertBadges } from '@/components/AlertBadges';
import { MetaadminInjetaveisAplicacoesView } from '@/components/metaadmin/MetaadminInjetaveisAplicacoesView';
import { CheckInSemanalDetalheModal } from '@/components/aplicacao/CheckInSemanalDetalheModal';
import { MarcoZeroDetalheModal } from '@/components/aplicacao/MarcoZeroDetalheModal';
import { ScoreProgressBar } from '@/components/ScoreProgressRing';
import {
  CalendarioDiaDetalheModal,
  type CalendarioDiaDetalhe,
  type StatusCalendarioEvolucao,
} from '@/components/profissional/CalendarioDiaDetalheModal';

type SubpastaId = 'tirzepatida' | 'retatrutida' | 'injetaveis';
type GraficoId = 'peso' | 'circunferencia' | 'hba1c' | 'imc' | 'depoimento';
type StatusCalendario = StatusCalendarioEvolucao;

export type EvolucaoConclusaoModalPayload = {
  weekIndex: number;
  weekStart: Date;
  weekEnd: Date;
  peso?: number;
  pacienteNome?: string;
};

type Props = {
  paciente: PacienteCompleto;
  /** Título do painel (padrão: Evolução / Seguimento Semanal). */
  title?: string;
  /** Abre o modal de detalhe da conclusão no host (opcional; se omitido, usa modal interno simples). */
  onOpenConclusao?: (payload: EvolucaoConclusaoModalPayload) => void;
  /** Abre o modal Gráfico e Registros (mesmo do calendário). */
  onOpenGrafico?: (paciente: PacienteCompleto) => void;
  /** Abre o modal de fotos compartilhadas do paciente. */
  onOpenFotos?: (paciente: PacienteCompleto) => void;
  /** Indica se o paciente tem foto compartilhada (estilo do ícone). */
  temFoto?: boolean;
  /** Parcelas para badges no calendário (opcional — tipicamente pagamentos do médico). */
  pagamentoPaciente?: PagamentoPaciente | null;
};

function ehSemanaConclusaoStr(s: string | undefined) {
  return (
    !!s &&
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes('semana de conclusao')
  );
}

function calcularGrauObesidade(imc: number | null | undefined): string | null {
  if (!imc || imc === 0) return null;
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade Grau I';
  if (imc < 40) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
}

function getCorGrauObesidade(grau: string | null): string {
  if (!grau) return 'text-gray-500';
  if (grau.includes('Grau III')) return 'text-red-700';
  if (grau.includes('Grau II')) return 'text-orange-600';
  if (grau.includes('Grau I')) return 'text-amber-600';
  if (grau === 'Sobrepeso') return 'text-yellow-600';
  if (grau === 'Peso normal') return 'text-green-600';
  return 'text-blue-600';
}

function imcParaIndiceGrau(imc: number | null): number | null {
  if (!imc) return null;
  if (imc < 18.5) return 0;
  if (imc < 25) return 1;
  if (imc < 30) return 2;
  if (imc < 35) return 3;
  if (imc < 40) return 4;
  return 5;
}

/**
 * Espelha a pasta Evolução/Seguimento do metaadmin (desktop), em modo somente leitura
 * para nutricionista e personal.
 */
export function EvolucaoSeguimentoReadonlyView({
  paciente,
  title = 'Evolução / Seguimento Semanal',
  onOpenConclusao,
  onOpenGrafico,
  onOpenFotos,
  temFoto = false,
  pagamentoPaciente,
}: Props) {
  const [subpasta, setSubpasta] = useState<SubpastaId>('tirzepatida');
  const [graficoAtivo, setGraficoAtivo] = useState<GraficoId>('peso');
  const [mesCalendario, setMesCalendario] = useState(() => new Date());
  const [depoimentoSlideIdx, setDepoimentoSlideIdx] = useState(0);
  const [classificacaoEstrelas, setClassificacaoEstrelas] = useState<number | null>(null);
  const [checkInDetalhe, setCheckInDetalhe] = useState<CheckInSemanalDetalhe | null>(null);
  const [marcoZeroDetalhe, setMarcoZeroDetalhe] = useState<MarcoZeroDetalhe | null>(null);
  const [conclusaoInterna, setConclusaoInterna] = useState<EvolucaoConclusaoModalPayload | null>(null);

  useEffect(() => {
    setSubpasta('tirzepatida');
    setGraficoAtivo('peso');
    setDepoimentoSlideIdx(0);
    setClassificacaoEstrelas(null);
    setMesCalendario(new Date());
  }, [paciente.id]);

  const abrirConclusao = (payload: EvolucaoConclusaoModalPayload) => {
    if (onOpenConclusao) onOpenConclusao(payload);
    else setConclusaoInterna(payload);
  };

  const nomePaciente =
    paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente';

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <div
        role="tablist"
        aria-label="Subpastas da evolução e seguimento"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-gray-100/90 border border-gray-200/80 shadow-inner"
      >
        {(
          [
            { id: 'tirzepatida' as const, label: 'Tirzepatida' },
            { id: 'retatrutida' as const, label: 'Retratutida' },
            { id: 'injetaveis' as const, label: 'Injetáveis' },
          ] as const
        ).map((sub) => {
          const ativa = subpasta === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setSubpasta(sub.id)}
              className={`relative min-h-[3.25rem] sm:min-h-[3.5rem] flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
                ativa
                  ? 'bg-gradient-to-br from-green-600 via-green-600 to-emerald-700 text-white shadow-lg shadow-green-600/35 ring-2 ring-green-400/60 scale-[1.02] z-[1]'
                  : 'text-gray-600 bg-transparent hover:bg-white/90 hover:text-gray-900 hover:shadow-sm'
              }`}
            >
              {ativa && (
                <span className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-white/50" aria-hidden />
              )}
              <span className={ativa ? 'drop-shadow-sm' : ''}>{sub.label}</span>
            </button>
          );
        })}
      </div>

      {subpasta === 'retatrutida' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-b from-gray-50 to-white px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-4">
            <Wrench className="h-7 w-7" aria-hidden />
          </div>
          <p className="text-lg font-semibold text-gray-900">Retratutida</p>
          <p className="mt-2 max-w-md text-sm text-gray-600">
            Esta seção está em construção. Em breve você poderá acompanhar as aplicações aqui.
          </p>
        </div>
      )}

      {subpasta === 'injetaveis' && (
        <MetaadminInjetaveisAplicacoesView
          paciente={paciente}
          onPacienteAtualizado={() => {
            /* Somente leitura — check é exclusivo do médico */
          }}
          variant="timeline"
          allowToggle={false}
        />
      )}

      {subpasta === 'tirzepatida' && (
        <TirzepatidaReadonly
          paciente={paciente}
          nomePaciente={nomePaciente}
          graficoAtivo={graficoAtivo}
          setGraficoAtivo={setGraficoAtivo}
          mesCalendario={mesCalendario}
          setMesCalendario={setMesCalendario}
          depoimentoSlideIdx={depoimentoSlideIdx}
          setDepoimentoSlideIdx={setDepoimentoSlideIdx}
          classificacaoEstrelas={classificacaoEstrelas}
          setClassificacaoEstrelas={setClassificacaoEstrelas}
          pagamentoPaciente={pagamentoPaciente}
          onOpenConclusao={abrirConclusao}
          onOpenCheckIn={setCheckInDetalhe}
          onOpenMarcoZero={setMarcoZeroDetalhe}
          onOpenGrafico={onOpenGrafico}
          onOpenFotos={onOpenFotos}
          temFoto={temFoto}
        />
      )}

      {checkInDetalhe && (
        <CheckInSemanalDetalheModal
          open
          onClose={() => setCheckInDetalhe(null)}
          pacienteNome={nomePaciente}
          detalhe={checkInDetalhe}
        />
      )}
      {marcoZeroDetalhe && (
        <MarcoZeroDetalheModal
          open
          onClose={() => setMarcoZeroDetalhe(null)}
          pacienteNome={nomePaciente}
          detalhe={marcoZeroDetalhe}
        />
      )}

      {conclusaoInterna && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConclusaoInterna(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Conclusão do tratamento</h4>
            <p className="text-sm text-gray-700 mb-3">
              <strong>{conclusaoInterna.pacienteNome || 'Paciente'}</strong> concluiu o tratamento na{' '}
              <strong>Semana {conclusaoInterna.weekIndex}</strong> (
              {conclusaoInterna.weekStart.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}{' '}
              a{' '}
              {conclusaoInterna.weekEnd.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
              ).
            </p>
            {conclusaoInterna.peso != null && (
              <p className="text-sm text-gray-700 mb-4">
                Peso final: <strong>{conclusaoInterna.peso} kg</strong>
              </p>
            )}
            <button
              type="button"
              onClick={() => setConclusaoInterna(null)}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type TirzepatidaProps = {
  paciente: PacienteCompleto;
  nomePaciente: string;
  graficoAtivo: GraficoId;
  setGraficoAtivo: (g: GraficoId) => void;
  mesCalendario: Date;
  setMesCalendario: (d: Date) => void;
  depoimentoSlideIdx: number;
  setDepoimentoSlideIdx: React.Dispatch<React.SetStateAction<number>>;
  classificacaoEstrelas: number | null;
  setClassificacaoEstrelas: (n: number | null) => void;
  pagamentoPaciente?: PagamentoPaciente | null;
  onOpenConclusao: (payload: EvolucaoConclusaoModalPayload) => void;
  onOpenCheckIn: (d: CheckInSemanalDetalhe) => void;
  onOpenMarcoZero: (d: MarcoZeroDetalhe) => void;
  onOpenGrafico?: (paciente: PacienteCompleto) => void;
  onOpenFotos?: (paciente: PacienteCompleto) => void;
  temFoto?: boolean;
};

function TirzepatidaReadonly({
  paciente,
  nomePaciente,
  graficoAtivo,
  setGraficoAtivo,
  mesCalendario,
  setMesCalendario,
  depoimentoSlideIdx,
  setDepoimentoSlideIdx,
  classificacaoEstrelas,
  setClassificacaoEstrelas,
  pagamentoPaciente,
  onOpenConclusao,
  onOpenCheckIn,
  onOpenMarcoZero,
  onOpenGrafico,
  onOpenFotos,
  temFoto = false,
}: TirzepatidaProps) {
  const evolucao = paciente.evolucaoSeguimento || [];
  const planoTerapeutico = paciente.planoTerapeutico;
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const seguimentoOrdem = [...evolucao].sort((a, b) => (a.weekIndex ?? 0) - (b.weekIndex ?? 0));
  const primeiroRegistro = seguimentoOrdem.find((e) => e.weekIndex === 1);
  const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
  const ultimoRegistroComPeso = [...seguimentoOrdem].reverse().find((r) => r.peso && r.peso > 0);
  const pesoAtual = ultimoRegistroComPeso?.peso ?? null;
  const variacaoTotal =
    pesoAtual != null && baselineWeight > 0 ? pesoAtual - baselineWeight : null;

  const suggestedSchedule = buildSuggestedDoseSchedule(1, [2.5, 5, 7.5, 10, 12.5, 15], 4);
  const totalSemanasGrafico = Number(planoTerapeutico?.numeroSemanasTratamento) || 18;
  const expectedCurve = buildExpectedCurveDoseDrivenAnchored({
    baselineWeightKg: baselineWeight,
    doseSchedule: suggestedSchedule,
    totalWeeks: totalSemanasGrafico,
    targetType: planoTerapeutico?.metas?.weightLossTargetType,
    targetValue: planoTerapeutico?.metas?.weightLossTargetValue || 0,
    useAnchorWeek: 18,
    useAnchorPct: 9.0,
  });

  const pesoChartDataRaw = expectedCurve.slice(0, totalSemanasGrafico).map((week) => {
    const registroSemana = evolucao.find((e) => e.weekIndex === week.weekIndex);
    return {
      semana: week.weekIndex,
      previsto: week.expectedWeightKg,
      real: registroSemana?.peso ?? null,
    };
  });
  const pesoChartData = pesoChartDataRaw.map((row, i) => {
    const real = row.real;
    const prevReal = i > 0 ? pesoChartDataRaw[i - 1].real : null;
    const variacao =
      real != null && prevReal != null ? Number((real - prevReal).toFixed(1)) : null;
    return { ...row, variacao };
  });

  const baseCircAbdominal =
    primeiroRegistro?.circunferenciaAbdominal || medidasIniciais?.circunferenciaAbdominal || 0;
  const circData = expectedCurve.map((week) => {
    const registroSemana = evolucao.find((e) => e.weekIndex === week.weekIndex);
    const previsto =
      week.expectedCumulativePct != null
        ? predictWaistCircumference({
            baselineWaistCm: baseCircAbdominal,
            cumulativeWeightLossPct: week.expectedCumulativePct,
          })
        : null;
    return {
      semana: week.weekIndex,
      circunferencia: registroSemana?.circunferenciaAbdominal || null,
      previsto,
    };
  });

  const exames = paciente.examesLaboratoriais || [];
  const metaHba1c = planoTerapeutico?.metas?.hba1cTargetType;
  const metaValue = metaHba1c ? parseFloat(metaHba1c.replace('≤', '')) : null;
  const faixaIdealMin = 4.0;
  const faixaIdealMax = metaValue ?? 5.6;
  const hba1cData = buildHba1cChartData({
    exames,
    evolucao,
    planoTerapeutico,
    expectedWeekIndexes: expectedCurve.map((w) => w.weekIndex),
    faixaIdealMin,
    faixaIdealMax,
  });
  const temHbA1cReal =
    temHbA1cNosExames(exames) || hba1cData.some((d) => d.hba1c != null);

  const alturaMetros = medidasIniciais?.altura ? medidasIniciais.altura / 100 : null;
  const imcData = expectedCurve
    .map((week) => {
      const registroSemana = evolucao.find((e) => e.weekIndex === week.weekIndex);
      const pesoReal = registroSemana?.peso || null;
      const imcReal =
        alturaMetros && pesoReal ? pesoReal / (alturaMetros * alturaMetros) : null;
      const imcPrevisto =
        alturaMetros && week.expectedWeightKg
          ? week.expectedWeightKg / (alturaMetros * alturaMetros)
          : null;
      return {
        semana: week.weekIndex,
        imc: imcReal,
        previsto: imcPrevisto,
        grau: calcularGrauObesidade(imcReal),
        grauPrevisto: calcularGrauObesidade(imcPrevisto),
        indiceGrau: imcParaIndiceGrau(imcReal),
        indiceGrauPrevisto: imcParaIndiceGrau(imcPrevisto),
      };
    })
    .filter((d) => d.imc != null || d.previsto != null);
  const grausLabels = [
    'Abaixo do peso',
    'Peso normal',
    'Sobrepeso',
    'Grau I',
    'Grau II',
    'Grau III',
  ];

  if (evolucao.length === 0) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl">
        <Syringe className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma aplicação registrada</h4>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Os registros de acompanhamento semanal (peso, dose aplicada, circunferência) aparecerão aqui
          quando forem cadastrados pelo médico responsável.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-medium text-emerald-800 mb-1">Aplicações</p>
          <p className="text-2xl font-bold text-emerald-900">{evolucao.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-800 mb-1">Peso inicial</p>
          <p className="text-2xl font-bold text-blue-900">
            {baselineWeight > 0 ? `${baselineWeight.toFixed(1)} kg` : '-'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
          <p className="text-xs font-medium text-purple-800 mb-1">Peso atual</p>
          <p className="text-2xl font-bold text-purple-900">
            {pesoAtual != null ? `${pesoAtual.toFixed(1)} kg` : '-'}
          </p>
        </div>
        <div
          className={`rounded-xl p-4 border ${
            variacaoTotal != null && variacaoTotal < 0
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
              : variacaoTotal != null && variacaoTotal > 0
                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                : 'bg-gray-50 border-gray-200'
          }`}
        >
          <p className="text-xs font-medium text-gray-800 mb-1">Variação total</p>
          <p
            className={`text-2xl font-bold ${
              variacaoTotal != null && variacaoTotal < 0
                ? 'text-green-900'
                : variacaoTotal != null && variacaoTotal > 0
                  ? 'text-red-900'
                  : 'text-gray-900'
            }`}
          >
            {variacaoTotal != null
              ? `${variacaoTotal > 0 ? '+' : ''}${variacaoTotal.toFixed(1)} kg`
              : '-'}
          </p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {(
            [
              { id: 'peso' as const, label: '📊 Peso' },
              { id: 'circunferencia' as const, label: '📏 Circunferência' },
              { id: 'hba1c' as const, label: '🩸 HbA1c' },
              { id: 'imc' as const, label: '📈 IMC' },
              { id: 'depoimento' as const, label: '💬 Depoimento' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setGraficoAtivo(tab.id);
                if (tab.id === 'depoimento') {
                  const depoimento = paciente.planoTerapeutico?.conclusaoTratamento?.depoimento;
                  const pid = paciente.id;
                  const mid = paciente.medicoResponsavelId;
                  if (depoimento && pid && mid) {
                    setClassificacaoEstrelas(null);
                    fetch(
                      `/api/conclusao/classificacao-paciente?pacienteId=${encodeURIComponent(pid)}&medicoId=${encodeURIComponent(mid)}`
                    )
                      .then((r) => r.json())
                      .then((j) => setClassificacaoEstrelas(j.estrelas ?? null))
                      .catch(() => setClassificacaoEstrelas(null));
                  } else {
                    setClassificacaoEstrelas(null);
                  }
                }
              }}
              className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium transition-colors ${
                graficoAtivo === tab.id
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {graficoAtivo === 'peso' &&
            (baselineWeight > 0 ? (
              <div>
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{nomePaciente}</h4>
                  <p className="text-sm text-gray-600">
                    Peso inicial (primeira medição): {baselineWeight.toFixed(1)} kg
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pesoChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="semana"
                        label={{
                          value: 'Semana',
                          position: 'bottom',
                          offset: -5,
                          style: { textAnchor: 'middle' },
                        }}
                      />
                      <YAxis
                        label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
                        domain={[Math.max(0, baselineWeight - 20), baselineWeight + 20]}
                      />
                      <Tooltip
                        formatter={(value: number | string) => `${parseFloat(String(value)).toFixed(1)} kg`}
                        labelFormatter={(label) => `Semana ${label}`}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} iconSize={12} />
                      <Line
                        type="monotone"
                        dataKey="previsto"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Peso previsto"
                        dot={{ fill: '#3b82f6', r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="real"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Peso real"
                        dot={{ fill: '#10b981', r: 4 }}
                      >
                        <LabelList
                          dataKey="variacao"
                          content={(props: {
                            x?: number | string;
                            y?: number | string;
                            index?: number;
                            payload?: { variacao?: number | null };
                          }) => {
                            const { x, y, index, payload } = props;
                            const variacao = payload?.variacao;
                            if (variacao == null || index === 0 || x == null || y == null) return null;
                            const fill = variacao <= -1 ? '#059669' : '#dc2626';
                            return (
                              <text
                                x={Number(x) - 24}
                                y={Number(y)}
                                textAnchor="middle"
                                fill={fill}
                                fontSize={11}
                                fontWeight={600}
                              >
                                {variacao > 0 ? '+' : ''}
                                {variacao} kg
                              </text>
                            );
                          }}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-8 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800 text-center">
                  Para visualizar o gráfico, é necessário o peso inicial nas medidas do paciente.
                </p>
              </div>
            ))}

          {graficoAtivo === 'circunferencia' &&
            (baseCircAbdominal > 0 ? (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Circunferência Abdominal (cm)
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={circData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semana" />
                      <YAxis
                        domain={[Math.max(0, baseCircAbdominal - 20), baseCircAbdominal + 20]}
                      />
                      <Tooltip
                        formatter={(value: number | string) => `${parseFloat(String(value)).toFixed(1)} cm`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="circunferencia"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        name="Circunferência Abdominal"
                        dot={{ fill: '#f59e0b', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="previsto"
                        stroke="#6366f1"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Circunferência Prevista"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-8 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800 text-center">
                  Circunferência abdominal inicial necessária para exibir o gráfico.
                </p>
              </div>
            ))}

          {graficoAtivo === 'hba1c' &&
            (temHbA1cReal || metaValue ? (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Hemoglobina Glicada (HbA1c) %
                  {metaValue && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Meta: {'<'} {metaValue}%)
                    </span>
                  )}
                </h4>
                {!temHbA1cReal && (
                  <p className="text-xs text-amber-700 mb-2">
                    Ainda não há resultado de Hemoglobina Glicada nos exames. A faixa ideal da meta é
                    exibida para referência.
                  </p>
                )}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hba1cData}>
                      <defs>
                        <pattern
                          id="hachuraFaixaIdealReadonly"
                          patternUnits="userSpaceOnUse"
                          width="8"
                          height="8"
                          patternTransform="rotate(45)"
                        >
                          <rect width="4" height="8" fill="#10b981" opacity="0.3" />
                        </pattern>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semana" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) =>
                          value != null
                            ? [
                                `${parseFloat(String(value)).toFixed(1)}%`,
                                String(name ?? ''),
                              ]
                            : ['N/A', String(name ?? '')]
                        }
                        labelFormatter={(l) => `Semana ${l}`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="faixaIdealMax"
                        stackId="1"
                        stroke="none"
                        fill="url(#hachuraFaixaIdealReadonly)"
                        fillOpacity={1}
                        hide
                      />
                      <Area
                        type="monotone"
                        dataKey="faixaIdealMin"
                        stackId="1"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        hide
                      />
                      <Line
                        type="monotone"
                        dataKey="faixaIdealMax"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                        name={`Faixa Ideal (${faixaIdealMin}% - ${faixaIdealMax}%)`}
                      />
                      <Line
                        type="monotone"
                        dataKey="faixaIdealMin"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                        legendType="none"
                      />
                      <Line
                        type="monotone"
                        dataKey="hba1c"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        name="HbA1c (exames)"
                        connectNulls
                        dot={{ fill: '#8b5cf6', r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-8 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800 text-center">
                  Cadastre exames laboratoriais com Hemoglobina Glicada (HbA1c) na pasta Exames para
                  exibir este gráfico.
                </p>
              </div>
            ))}

          {graficoAtivo === 'imc' &&
            (alturaMetros && imcData.length > 0 ? (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Índice de Massa Corporal (IMC) - kg/m²
                </h4>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Evolução do Grau de Obesidade:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {imcData
                      .filter((d) => d.imc !== null)
                      .slice(0, 12)
                      .map((item) => (
                        <div key={item.semana} className="text-xs">
                          <span className="font-medium text-gray-600">Sem. {item.semana}:</span>
                          <span className={`ml-1 ${getCorGrauObesidade(item.grau)}`}>
                            {item.grau ? item.grau.replace('Obesidade ', '') : 'N/A'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={imcData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semana" />
                      <YAxis
                        domain={[0, 5]}
                        tickFormatter={(v) => grausLabels[Math.round(v)] ?? ''}
                        ticks={[0, 1, 2, 3, 4, 5]}
                        width={120}
                      />
                      <Tooltip
                        formatter={(_v: unknown, name: string, props: { payload?: { imc?: number; previsto?: number; grau?: string; grauPrevisto?: string } }) => {
                          const imcValue =
                            name === 'indiceGrau' ? props.payload?.imc : props.payload?.previsto;
                          const grau =
                            name === 'indiceGrau'
                              ? props.payload?.grau
                              : props.payload?.grauPrevisto;
                          return [
                            imcValue != null
                              ? `${Number(imcValue).toFixed(1)} kg/m² - ${grau || ''}`
                              : 'N/A',
                            name === 'indiceGrau' ? 'IMC Real' : 'IMC Previsto',
                          ];
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="indiceGrauPrevisto"
                        stroke="#3b82f6"
                        strokeDasharray="5 5"
                        name="IMC Previsto"
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="indiceGrau"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="IMC Real"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-8 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800 text-center">
                  Altura e registros com peso são necessários para o gráfico de IMC.
                </p>
              </div>
            ))}

          {graficoAtivo === 'depoimento' && (
            <DepoimentoReadonlyPanel
              paciente={paciente}
              slideIdx={depoimentoSlideIdx}
              setSlideIdx={setDepoimentoSlideIdx}
              classificacaoEstrelas={classificacaoEstrelas}
            />
          )}
        </div>
      </div>

      <TimelineReadonly
        paciente={paciente}
        nomePaciente={nomePaciente}
        evolucao={evolucao}
        seguimentoOrdem={seguimentoOrdem}
        expectedCurve={expectedCurve}
        baselineWeight={baselineWeight}
        mesCalendario={mesCalendario}
        setMesCalendario={setMesCalendario}
        pagamentoPaciente={pagamentoPaciente}
        onOpenConclusao={onOpenConclusao}
        onOpenCheckIn={onOpenCheckIn}
        onOpenMarcoZero={onOpenMarcoZero}
        onOpenGrafico={onOpenGrafico}
        onOpenFotos={onOpenFotos}
        temFoto={temFoto}
      />

    </div>
  );
}

function DepoimentoReadonlyPanel({
  paciente,
  slideIdx,
  setSlideIdx,
  classificacaoEstrelas,
}: {
  paciente: PacienteCompleto;
  slideIdx: number;
  setSlideIdx: React.Dispatch<React.SetStateAction<number>>;
  classificacaoEstrelas: number | null;
}) {
  const plano = paciente.planoTerapeutico as unknown as Record<string, unknown> | undefined;
  const slides = plano ? listDepoimentosSlidesFromPlano(plano) : [];
  const n = slides.length;
  const idx = Math.min(slideIdx, Math.max(0, n - 1));
  const slide = slides[idx];
  const estrelas =
    slide?.origem === 'historico' ? slide.estrelas : classificacaoEstrelas;
  const statusTratamento = paciente.statusTratamento;
  const ehConcluido = statusTratamento === 'concluido';

  if (n > 0 && slide) {
    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Depoimentos {n > 1 ? `(${n})` : ''}
        </h4>
        {n > 1 && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i - 1 + n) % n)}
              className="rounded-full p-2 bg-gray-200 text-gray-800 hover:bg-gray-300"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-gray-700 tabular-nums">
              {idx + 1} / {n}
            </span>
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i + 1) % n)}
              className="rounded-full p-2 bg-gray-200 text-gray-800 hover:bg-gray-300"
              aria-label="Próximo depoimento"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              slide.origem === 'atual'
                ? 'bg-green-100 text-green-800'
                : 'bg-slate-200 text-slate-800'
            }`}
          >
            {slide.origem === 'atual' ? 'Conclusão atual' : 'Tratamento anterior'}
          </span>
          {slide.labelData && slide.labelData !== '—' && (
            <span className="text-xs text-gray-500">{slide.labelData}</span>
          )}
          {slide.pesoFinalKg != null && (
            <span className="text-xs text-gray-500">Peso final: {slide.pesoFinalKg} kg</span>
          )}
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Depoimento do paciente</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{slide.texto}</p>
        </div>
        {estrelas != null && estrelas >= 1 && estrelas <= 5 ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-xs font-medium text-amber-800 mb-1">Nota do tratamento</p>
            <p className="text-lg font-semibold text-amber-900">{estrelas} de 5 estrelas</p>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={s <= estrelas ? 'text-amber-500' : 'text-gray-300'}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        ) : slide.origem === 'historico' ? (
          <p className="text-xs text-gray-500">Nota não registrada no arquivamento.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Depoimento</h4>
      <p className="text-sm text-gray-600">
        {ehConcluido
          ? 'Paciente concluído, mas ainda sem depoimento preenchido.'
          : 'O depoimento e a nota do tratamento são preenchidos pelo paciente na conclusão. Paciente ainda não concluído.'}
      </p>
    </div>
  );
}

function TimelineReadonly({
  paciente,
  nomePaciente,
  evolucao,
  seguimentoOrdem,
  expectedCurve,
  baselineWeight,
  mesCalendario,
  setMesCalendario,
  pagamentoPaciente,
  onOpenConclusao,
  onOpenCheckIn,
  onOpenMarcoZero,
  onOpenGrafico,
  onOpenFotos,
  temFoto = false,
}: {
  paciente: PacienteCompleto;
  nomePaciente: string;
  evolucao: SeguimentoSemanal[];
  seguimentoOrdem: SeguimentoSemanal[];
  expectedCurve: { weekIndex: number; expectedWeightKg: number }[];
  baselineWeight: number;
  mesCalendario: Date;
  setMesCalendario: (d: Date) => void;
  pagamentoPaciente?: PagamentoPaciente | null;
  onOpenConclusao: (payload: EvolucaoConclusaoModalPayload) => void;
  onOpenCheckIn: (d: CheckInSemanalDetalhe) => void;
  onOpenMarcoZero: (d: MarcoZeroDetalhe) => void;
  onOpenGrafico?: (paciente: PacienteCompleto) => void;
  onOpenFotos?: (paciente: PacienteCompleto) => void;
  temFoto?: boolean;
}) {
  const planoTerapeutico = paciente.planoTerapeutico;
  const temPagamentos = !!pagamentoPaciente?.parcelas?.length;
  const [diaDetalhe, setDiaDetalhe] = useState<CalendarioDiaDetalhe | null>(null);

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-base font-semibold text-slate-900 tracking-tight">Timeline Semanal</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Calendário e registros de aplicação — passe o mouse e clique em uma data com marcação para ver o significado
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-4 flex flex-col min-h-[320px] lg:min-h-0 shadow-sm">
          {!planoTerapeutico || !primeiraDoseDoPlano(planoTerapeutico) ? (
            <p className="text-sm text-gray-500">
              Data de início do plano terapêutico ainda não configurada pelo médico.
            </p>
          ) : (
            (() => {
              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);
              const numeroSemanas = Number(planoTerapeutico.numeroSemanasTratamento) || 18;
              const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
              const infoPorData = new Map<string, { weekIndex: number; status: StatusCalendario }>();
              const dataParaSemana = (w: number): Date =>
                dataPrevistaSemanaComoEsquema(planoTerapeutico, w, evolucao);
              const inicioCiclo = semanaInicioCicloDoPlano(planoTerapeutico);
              const fimCiclo = inicioCiclo + numeroSemanas - 1;

              for (let w = inicioCiclo; w <= fimCiclo; w++) {
                const dataParaCalendario = dataParaSemana(w);
                const registro = evolucao.find(
                  (e) => (e.weekIndex ?? (e as { numeroSemana?: number }).numeroSemana ?? 0) === w
                );
                let status: StatusCalendario;
                if (semanasCanceladas.includes(w)) {
                  status = 'cancelada';
                } else {
                  const ehSemanaConclusao =
                    registro && ehSemanaConclusaoStr(registro.comentarioMedico);
                  if (ehSemanaConclusao) {
                    status = 'concluido';
                  } else if (registro?.doseAplicada?.data) {
                    status = 'aplicado';
                  } else if (
                    registro &&
                    (registro.adherence === 'MISSED' || registro.adesao === 'esquecida')
                  ) {
                    status = 'perdida';
                  } else if (dataParaCalendario.getTime() < hoje.getTime()) {
                    status = 'nao_preencheu';
                  } else {
                    status = 'futuro';
                  }
                }
                const key = `${dataParaCalendario.getFullYear()}-${String(dataParaCalendario.getMonth() + 1).padStart(2, '0')}-${String(dataParaCalendario.getDate()).padStart(2, '0')}`;
                infoPorData.set(key, { weekIndex: w, status });
              }

              const semanaConclusaoCal = semanaIndexConclusao(planoTerapeutico);
              const dataConclusao = dataPrevistaConclusaoComoEsquema(planoTerapeutico, evolucao);
              const registroConclusao = evolucao.find(
                (e) =>
                  (e.weekIndex ?? (e as { numeroSemana?: number }).numeroSemana ?? 0) ===
                  semanaConclusaoCal
              );
              const registroConclusaoPorComentario = evolucao.find((e) =>
                ehSemanaConclusaoStr(e.comentarioMedico)
              );
              const conclusaoPreenchida =
                (registroConclusao && ehSemanaConclusaoStr(registroConclusao.comentarioMedico)) ||
                (registroConclusaoPorComentario != null &&
                  (() => {
                    const dr = registroConclusaoPorComentario.dataRegistro
                      ? new Date(registroConclusaoPorComentario.dataRegistro as string | Date)
                      : null;
                    if (!dr || isNaN(dr.getTime())) return false;
                    dr.setHours(0, 0, 0, 0);
                    return dr.getTime() === dataConclusao.getTime();
                  })());
              const statusConclusao: StatusCalendario = conclusaoPreenchida
                ? 'concluido'
                : dataConclusao.getTime() < hoje.getTime()
                  ? 'nao_preencheu'
                  : 'conclusao_prevista';
              const keyConclusao = `${dataConclusao.getFullYear()}-${String(dataConclusao.getMonth() + 1).padStart(2, '0')}-${String(dataConclusao.getDate()).padStart(2, '0')}`;
              infoPorData.set(keyConclusao, {
                weekIndex: semanaConclusaoCal,
                status: statusConclusao,
              });

              const ano = mesCalendario.getFullYear();
              const mes = mesCalendario.getMonth();
              const primeiroDia = new Date(ano, mes, 1);
              const ultimoDia = new Date(ano, mes + 1, 0);
              const diasNoMes = ultimoDia.getDate();
              const diaSemanaInicio = primeiroDia.getDay();
              const diaSemanaAjustado = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
              const diasCalendario: (number | null)[] = [];
              for (let i = 0; i < diaSemanaAjustado; i++) diasCalendario.push(null);
              for (let d = 1; d <= diasNoMes; d++) diasCalendario.push(d);
              const obterInfoDia = (dia: number) =>
                infoPorData.get(
                  `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                );

              const pagamentosPorData = new Map<
                string,
                Array<{ valor: number; status: string }>
              >();
              if (temPagamentos) {
                const toDatePag = (v: unknown): Date | null => {
                  if (!v) return null;
                  const d =
                    (v as { toDate?: () => Date })?.toDate
                      ? (v as { toDate: () => Date }).toDate()
                      : new Date(v as string | number);
                  return isNaN(d.getTime()) ? null : d;
                };
                const mesInicioCal = new Date(ano, mes, 1);
                const mesFimCal = new Date(ano, mes + 1, 0);
                mesFimCal.setHours(23, 59, 59);
                (pagamentoPaciente?.parcelas || []).forEach((parcela) => {
                  const add = (d: Date | null, val: number, st: string) => {
                    if (!d || d < mesInicioCal || d > mesFimCal) return;
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const list = pagamentosPorData.get(key) || [];
                    list.push({ valor: val, status: st });
                    pagamentosPorData.set(key, list);
                  };
                  const dataVen = toDatePag(parcela.dataVencimento);
                  const dataPag =
                    parcela.status === 'paga' ? toDatePag(parcela.dataPagamento) : null;
                  const dataVenda = toDatePag(parcela.dataVenda);
                  if (dataVenda) add(dataVenda, parcela.valor ?? 0, 'venda');
                  if (dataVen)
                    add(dataVen, parcela.valor ?? 0, parcela.status === 'paga' ? 'paga' : 'vencimento');
                  if (dataPag && dataPag.getTime() !== dataVen?.getTime())
                    add(dataPag, parcela.valor ?? 0, 'paga');
                });
              }

              const fmtValor = (v: number) =>
                v >= 1000
                  ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`
                  : `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

              return (
                <>
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h5 className="text-sm font-semibold capitalize text-slate-800">
                      {mesCalendario.toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h5>
                    <div className="flex items-center gap-0.5 rounded-xl bg-white/80 border border-slate-200/70 p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setMesCalendario(
                            new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() - 1)
                          )
                        }
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Mês anterior"
                      >
                        <ChevronLeft className="h-4 w-4 text-slate-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMesCalendario(new Date())}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMesCalendario(
                            new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1)
                          )
                        }
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Próximo mês"
                      >
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1.5 flex-shrink-0">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                      <div
                        key={d}
                        className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 py-1"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 content-start">
                    {diasCalendario.map((dia, idx) => {
                      if (dia === null) return <div key={idx} className="min-h-[2.75rem]" />;
                      const info = obterInfoDia(dia);
                      const keyDia = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                      const pagamentosDia = pagamentosPorData.get(keyDia) || [];
                      const isHoje =
                        dia === new Date().getDate() &&
                        mes === new Date().getMonth() &&
                        ano === new Date().getFullYear();
                      const statusTone =
                        info?.status === 'aplicado'
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                          : info?.status === 'concluido'
                            ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/25'
                            : info?.status === 'conclusao_prevista'
                              ? 'bg-violet-600 text-white'
                              : info?.status === 'perdida'
                                ? 'bg-rose-600 text-white'
                                : info?.status === 'nao_preencheu'
                                  ? 'bg-rose-500 text-white'
                                  : info?.status === 'cancelada'
                                    ? 'bg-slate-400 text-white'
                                    : info
                                      ? 'bg-sky-500 text-white'
                                      : '';
                      const temInfoClicavel = !!info || pagamentosDia.length > 0;
                      return (
                        <button
                          type="button"
                          key={idx}
                          disabled={!temInfoClicavel}
                          onClick={() => {
                            if (!temInfoClicavel) return;
                            setDiaDetalhe({
                              data: new Date(ano, mes, dia),
                              weekIndex: info?.weekIndex,
                              semanaExibicao:
                                info?.weekIndex != null
                                  ? semanaRelativaNoProtocolo(
                                      info.weekIndex,
                                      protocoloDaSemanaGlobal(paciente, info.weekIndex)
                                        .semanaInicioCiclo
                                    )
                                  : undefined,
                              protocoloIndice:
                                info?.weekIndex != null
                                  ? protocoloDaSemanaGlobal(paciente, info.weekIndex).indice
                                  : undefined,
                              status: info?.status,
                              pagamentos: pagamentosDia,
                            });
                          }}
                          className={`flex flex-col items-center justify-start gap-0.5 min-h-[2.75rem] rounded-xl px-0.5 py-1 transition-all duration-150 ${
                            temInfoClicavel
                              ? 'cursor-pointer hover:bg-slate-100 hover:ring-2 hover:ring-slate-300/80 hover:scale-[1.04] hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500'
                              : 'cursor-default'
                          } ${
                            isHoje
                              ? 'bg-teal-50 ring-1 ring-teal-200/80'
                              : info || pagamentosDia.length > 0
                                ? 'bg-white/70'
                                : ''
                          }`}
                          title={
                            temInfoClicavel
                              ? 'Clique para ver o significado desta data'
                              : undefined
                          }
                          aria-label={
                            temInfoClicavel
                              ? `Dia ${dia}: ver detalhes`
                              : `Dia ${dia}`
                          }
                        >
                          <span
                            className={`text-[11px] font-semibold leading-none ${
                              isHoje ? 'text-teal-700' : 'text-slate-700'
                            }`}
                          >
                            {dia}
                          </span>
                          {info ? (
                            <span
                              className={`px-1 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap ${statusTone}`}
                            >
                              {rotuloSemanaBadgeCalendario(
                                info.weekIndex,
                                protocoloDaSemanaGlobal(paciente, info.weekIndex)
                              )}
                            </span>
                          ) : null}
                          {pagamentosDia.map((p, i) => (
                            <span
                              key={i}
                              className={`px-1 py-0.5 rounded-md text-[8px] font-semibold whitespace-nowrap ${
                                p.status === 'paga'
                                  ? 'bg-emerald-500/90 text-white'
                                  : p.status === 'venda'
                                    ? 'bg-sky-500/90 text-white'
                                    : 'bg-amber-500/90 text-white'
                              }`}
                            >
                              {fmtValor(p.valor)}
                            </span>
                          ))}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-slate-200/80 flex-shrink-0">
                    {[
                      { c: 'bg-emerald-500', l: 'Aplicado' },
                      { c: 'bg-violet-500', l: 'Concluído' },
                      { c: 'bg-violet-600', l: 'Conclusão' },
                      { c: 'bg-rose-600', l: 'Perdida' },
                      { c: 'bg-rose-500', l: 'Não preenchido' },
                      { c: 'bg-slate-400', l: 'Cancelada' },
                      { c: 'bg-sky-500', l: 'Futuro' },
                      ...(temPagamentos
                        ? [
                            { c: 'bg-emerald-500', l: 'Pago' },
                            { c: 'bg-sky-500', l: 'Venda' },
                            { c: 'bg-amber-500', l: 'Vencimento' },
                          ]
                        : []),
                    ].map((item) => (
                      <span
                        key={item.l}
                        className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"
                      >
                        <span className={`w-2 h-2 rounded-full ${item.c}`} />
                        {item.l}
                      </span>
                    ))}
                  </div>
                </>
              );
            })()
          )}
        </div>

        <div className="min-h-[200px] lg:min-h-[320px] lg:max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 space-y-3">
          {listarSemanasTimelinePorProtocolo(paciente).map(({ proto, items }) => (
            <ProtocoloAplicacoesGrupoCard key={proto.indice} proto={proto} paciente={paciente}>
          {items.map((item) => {
            const semanaRelativa = semanaRelativaNoProtocolo(
              item.weekIndex,
              proto.semanaInicioCiclo
            );
            const ehPrevisto = !item.registro;
            const registro: SeguimentoSemanal = item.registro ?? {
              id: `previsto-${proto.indice}-${item.weekIndex}`,
              weekIndex: item.weekIndex,
              numeroSemana: item.weekIndex,
              dataRegistro: item.data,
            };
            const expectedWeek = expectedCurve.find((e) => e.weekIndex === registro.weekIndex);
            const varianceKg =
              registro.peso && baselineWeight > 0 ? registro.peso - baselineWeight : null;
            const semanaIdxDose =
              registro.weekIndex ?? (registro as { numeroSemana?: number }).numeroSemana ?? 0;
            const doseMgEsquema =
              semanaIdxDose > 0 &&
              !ehSemanaConclusaoStr(registro.comentarioMedico) &&
              registro.adherence !== 'MISSED' &&
              registro.adesao !== 'esquecida'
                ? obterDoseMgSemanaPaciente(paciente, semanaIdxDose) ||
                  (ehPrevisto ? item.dose : 0)
                : ehPrevisto
                  ? item.dose
                  : 0;

            const dataAplicacaoSemana = ehPrevisto
              ? new Date(item.data)
              : planoTerapeutico
              ? ehSemanaConclusaoStr(registro.comentarioMedico)
                ? dataPrevistaConclusaoComoEsquema(planoTerapeutico, evolucao)
                : dataPrevistaSemanaComoEsquema(
                    planoTerapeutico,
                    registro.weekIndex ??
                      (registro as { numeroSemana?: number }).numeroSemana ??
                      0,
                    evolucao
                  )
              : new Date();
            const weekStart = dataAplicacaoSemana;
            const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
            const ehSemanaConclusaoRegistro =
              !ehPrevisto && ehSemanaConclusaoStr(registro.comentarioMedico);
            const ehPulada =
              registro.adherence === 'MISSED' || registro.adesao === 'esquecida';
            const checkInScorePaciente =
              !ehPrevisto && !ehSemanaConclusaoRegistro
                ? obterCheckInScoreDeRegistro(paciente, registro)
                : null;
            const checkInDetalheRegistro =
              !ehPrevisto && !ehSemanaConclusaoRegistro
                ? obterCheckInSemanalDetalheDeRegistro(paciente, registro)
                : null;
            const marcoZeroDetalheRegistro =
              !ehPrevisto && !ehSemanaConclusaoRegistro
                ? obterMarcoZeroDetalheDeRegistro(paciente, registro)
                : null;
            const variacoesRegistro =
              !ehPrevisto && !ehSemanaConclusaoRegistro
                ? calcularVariacoesParaSeguimento(paciente, registro)
                : { variacaoPeso: null, variacaoCircunferencia: null };

            const cardTone = ehSemanaConclusaoRegistro
              ? {
                  shell:
                    'border-violet-200/80 bg-gradient-to-br from-violet-50 to-fuchsia-50/70',
                  accent: 'bg-violet-500',
                }
              : ehPulada
                ? {
                    shell: 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-red-50/60',
                    accent: 'bg-rose-500',
                  }
                : {
                    shell:
                      'border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 to-teal-50/50',
                    accent: 'bg-emerald-500',
                  };

            const payloadConclusao: EvolucaoConclusaoModalPayload = {
              weekIndex: registro.weekIndex ?? 0,
              weekStart,
              weekEnd,
              peso: registro.peso,
              pacienteNome: nomePaciente,
            };

            return (
              <div
                key={registro.id || `${registro.weekIndex}`}
                className={`relative overflow-hidden rounded-2xl border p-3 shadow-sm transition-shadow hover:shadow-md ${cardTone.shell}`}
              >
                <span
                  className={`absolute left-0 top-0 bottom-0 w-1 ${cardTone.accent}`}
                  aria-hidden
                />
                <div className="pl-1.5 flex gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">
                        Semana {semanaRelativa}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {weekStart.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}{' '}
                        –{' '}
                        {weekEnd.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                      {ehSemanaConclusaoRegistro && (
                        <button
                          type="button"
                          onClick={() => onOpenConclusao(payloadConclusao)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500 hover:bg-violet-600 text-white rounded-full text-[10px] font-semibold transition-colors"
                        >
                          <CheckCircle size={11} /> Concluído
                        </button>
                      )}
                      {doseMgEsquema > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-white/80 text-teal-800 text-[10px] font-semibold ring-1 ring-teal-200/60">
                          {doseMgEsquema} mg
                        </span>
                      ) : ehPulada ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 text-[10px] font-semibold">
                          Pulada
                        </span>
                      ) : null}
                      {expectedWeek && registro.peso ? (
                        <span className="inline-flex">
                          <ProgressPill
                            varianceKg={varianceKg}
                            expectedWeight={expectedWeek.expectedWeightKg}
                            actualWeight={registro.peso}
                          />
                        </span>
                      ) : null}
                      {registro.alerts && registro.alerts.length > 0 && (
                        <span className="inline-flex">
                          <AlertBadges alerts={registro.alerts} />
                        </span>
                      )}
                    </div>

                    {!ehSemanaConclusaoRegistro &&
                      (registro.peso != null ||
                        variacoesRegistro.variacaoPeso != null ||
                        variacoesRegistro.variacaoCircunferencia != null) && (
                        <p className="text-xs text-slate-700 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                          {registro.peso != null && (
                            <span>
                              <span className="text-slate-500">Peso</span>{' '}
                              <span className="font-semibold">{registro.peso} kg</span>
                            </span>
                          )}
                          {variacoesRegistro.variacaoPeso != null && (
                            <>
                              {registro.peso != null && <span className="text-slate-300">·</span>}
                              <span
                                className={`font-semibold ${
                                  variacoesRegistro.variacaoPeso <= -0.1
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                Δ {variacoesRegistro.variacaoPeso > 0 ? '+' : ''}
                                {variacoesRegistro.variacaoPeso.toFixed(1)} kg
                              </span>
                            </>
                          )}
                          {variacoesRegistro.variacaoCircunferencia != null && (
                            <>
                              {(registro.peso != null ||
                                variacoesRegistro.variacaoPeso != null) && (
                                <span className="text-slate-300">·</span>
                              )}
                              <span
                                className={`font-semibold ${
                                  variacoesRegistro.variacaoCircunferencia <= -0.1
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                Δ cintura{' '}
                                {variacoesRegistro.variacaoCircunferencia > 0 ? '+' : ''}
                                {variacoesRegistro.variacaoCircunferencia.toFixed(1)} cm
                              </span>
                            </>
                          )}
                        </p>
                      )}

                    {(registro.adherence ||
                      registro.adesao ||
                      registro.giSeverity ||
                      registro.localAplicacao ||
                      (registro.circunferenciaAbdominal != null &&
                        registro.circunferenciaAbdominal > 0)) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                        {(registro.adherence ||
                          registro.adesao ||
                          ehSemanaConclusaoRegistro) && (
                          <span>
                            <span className="text-slate-400">Adesão </span>
                            {ehSemanaConclusaoRegistro ? (
                              <button
                                type="button"
                                onClick={() => onOpenConclusao(payloadConclusao)}
                                className="text-violet-600 hover:underline font-medium"
                              >
                                Concluído
                              </button>
                            ) : (
                              <span
                                className={`font-medium ${
                                  registro.adherence === 'ON_TIME' ||
                                  registro.adesao === 'pontual'
                                    ? 'text-emerald-600'
                                    : registro.adherence === 'MISSED' ||
                                        registro.adesao === 'esquecida'
                                      ? 'text-rose-600'
                                      : 'text-amber-600'
                                }`}
                              >
                                {registro.adherence === 'ON_TIME'
                                  ? 'Pontual'
                                  : registro.adherence === 'LATE_<96H'
                                    ? 'Atrasada'
                                    : registro.adherence === 'MISSED'
                                      ? 'Perdida'
                                      : registro.adesao === 'pontual'
                                        ? 'Pontual'
                                        : registro.adesao === 'atrasada'
                                          ? 'Atrasada'
                                          : registro.adesao === 'esquecida'
                                            ? 'Perdida'
                                            : '—'}
                              </span>
                            )}
                          </span>
                        )}
                        {registro.giSeverity && (
                          <span>
                            <span className="text-slate-400">GI </span>
                            <span className="font-medium text-slate-700">
                              {registro.giSeverity === 'LEVE'
                                ? 'Leve'
                                : registro.giSeverity === 'MODERADO'
                                  ? 'Moderado'
                                  : 'Grave'}
                            </span>
                          </span>
                        )}
                        {registro.localAplicacao && (
                          <span>
                            <span className="text-slate-400">Local </span>
                            <span className="font-medium text-slate-700 capitalize">
                              {registro.localAplicacao === 'abdome'
                                ? 'Abdome'
                                : registro.localAplicacao === 'coxa'
                                  ? 'Coxa'
                                  : 'Braço'}
                            </span>
                          </span>
                        )}
                        {registro.circunferenciaAbdominal != null &&
                          registro.circunferenciaAbdominal > 0 && (
                            <span>
                              <span className="text-slate-400">Circ. </span>
                              <span className="font-medium text-slate-700">
                                {registro.circunferenciaAbdominal.toFixed(1)} cm
                              </span>
                            </span>
                          )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-stretch gap-1.5 w-[7.5rem]">
                    {(onOpenGrafico || onOpenFotos) && (
                      <div className="flex items-center justify-end gap-1">
                        {onOpenGrafico && (
                          <button
                            type="button"
                            onClick={() => onOpenGrafico(paciente)}
                            className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Gráfico e registros do paciente"
                            aria-label="Gráfico e registros do paciente"
                          >
                            <BarChart3 size={18} />
                          </button>
                        )}
                        {onOpenFotos && (
                          <button
                            type="button"
                            onClick={() => onOpenFotos(paciente)}
                            className={`p-2 rounded-xl transition-colors ${
                              temFoto
                                ? 'text-violet-600 hover:bg-violet-50'
                                : 'text-gray-400'
                            }`}
                            title="Registro fotográfico compartilhado"
                            aria-label="Registro fotográfico compartilhado"
                          >
                            <Camera size={18} />
                          </button>
                        )}
                      </div>
                    )}
                    {marcoZeroDetalheRegistro != null ? (
                      <button
                        type="button"
                        onClick={() => onOpenMarcoZero(marcoZeroDetalheRegistro)}
                        className="h-8 w-full rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400/70 bg-amber-50/90 ring-1 ring-amber-200/70 flex items-center justify-center gap-1"
                        title="Marco Zero do tratamento — clique para ver detalhes"
                        aria-label="Ver Marco Zero do tratamento"
                      >
                        <span className="text-sm leading-none" aria-hidden>
                          🎯
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-900">
                          Marco Zero
                        </span>
                      </button>
                    ) : (
                      checkInScorePaciente != null &&
                      checkInDetalheRegistro && (
                        <button
                          type="button"
                          onClick={() => onOpenCheckIn(checkInDetalheRegistro)}
                          className="h-8 w-full rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-400/70 bg-white/90 ring-1 ring-black/5"
                          title={`Check-in semanal: ${checkInScorePaciente} pontos — clique para ver detalhes`}
                          aria-label={`Ver check-in semanal: ${checkInScorePaciente} pontos`}
                        >
                          <ScoreProgressBar percent={checkInScorePaciente} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
            </ProtocoloAplicacoesGrupoCard>
          ))}
        </div>
      </div>

      <CalendarioDiaDetalheModal
        open={!!diaDetalhe}
        detalhe={diaDetalhe}
        onClose={() => setDiaDetalhe(null)}
      />
    </div>
  );
}
